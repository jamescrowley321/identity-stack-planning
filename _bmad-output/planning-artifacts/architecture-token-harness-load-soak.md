# Load & Soak Test Design — `fastapi-identity-model` middleware

**Companion to** [`epics-token-harness.md`](./epics-token-harness.md) (Epic TH-1, esp. **TH-1.5 Load/soak suite**, building on TH-1.1 minter + TH-1.2 RS boot).
**Status:** Design (2026-08-10). Grounds the TH-1.5 acceptance criteria and resolves seven items the epic left open.
**Method:** derived from a full analysis of py-identity-model's 32 integration tests, the OIDF RP conformance suite, the middleware/core internals, and the token-minting fixtures. Corrected to `origin/main` (F-18 uniform-401 **fixed**; F-02 sender-constraint **still open/xfail**).

---

## 0. The four conclusions that shape the design

1. **One hot path.** Every authenticated request is a single `aio.validate_token(perform_disco=True, audience, claims_validator)` call. Warm-cache = two lock-free `OrderedDict` hits + **RSA/EC signature verify + claim checks + `to_principal`**, all **synchronous CPU on the event-loop thread, no executor offload**. Dominant cost = signature verify; secondary = `to_principal` per-claim allocation + `BaseHTTPMiddleware` overhead. **Zero network on the warm path.**
2. **Two load levers dominate: cache state and algorithm.** Cache = hit / miss / TTL-expiry / kid-rotation (per-process `OrderedDict`; 32-stripe single-flight; 5s kid-miss cooldown; 64-entry LRU; JWKS **ignores** `no-store`; discovery **honors** `no-store` ← landmine). Algorithm = **RS256** (all live tokens) vs ES256 (node-oidc option / DPoP / JARM). A load number is meaningless without stating both.
3. **Multi-worker = N independent caches, clients, locks → N-fold cold-fetch amplification.** The conftest already FileLock-serializes fetches because N xdist workers trip HTTP 429 — that *is* the N-uvicorn-worker cold-start against a shared upstream.
4. **Correctness surface = 29 integration rejections + the conformance id_token negative matrix.** Conformance proves token *acquisition* (id_token/logout/JARM), **not** resource-server *rejection* — the middleware's bearer hot path is proven only by integration + this harness. Middleware-security cases: **F-07** (ID-as-access → reject), **F-18** (uniform 401 body → fixed on main, assert green), **F-02** (cnf-bound-as-bearer → **accepted today**, xfail).

## 1. Principles

- **Test the async path as deployed:** real FastAPI app + `TokenValidationMiddleware` + `require_scope`, behind **uvicorn `--workers N`**, driven by an **external** load generator over HTTP (mirrors how `conformance/app_fastapi.py` drives the package; the RS boot itself is greenfield — `app_fastapi.py` is the RP *login* router, not `TokenValidationMiddleware + require_scope`).
- **Two token sources, two jobs:** **real fixtures** (node-oidc, Keycloak, +Ory/Descope in CI) prove token *fidelity*; a **controllable mock OP** proves *failure modes* real OPs won't produce and mints **forged negatives** from a harness-held signing key.
- **Pre-mint once, replay many** (TH-1.5): stateless validation; mint the pool up front (real IdPs rate-limit). Survive the **300s token TTL** over a long soak with a re-mint cadence, or classify post-expiry 401s as expected (not error budget).
- **Cache state is a labeled axis** on every result. **Correctness asserted under load, separately from throughput** (pytest owns correctness; Locust owns throughput/soak) — the load run also asserts no 500s, no cross-talk, stable status-per-class.

## 2. Harness architecture

| Component | What | Maps to |
|---|---|---|
| **RS-under-test** | Minimal FastAPI app: `TokenValidationMiddleware(audience=…, require_access_token_marker=…)` + `require_scope`-guarded routes; uvicorn `--workers N`. | TH-1.2 (#464) |
| **TokenSource** | `mint(provider, grant, tenant, scopes, malform)` unifying the conftest minters + the identity-stack Descope multi-tenant minter; pre-mints the replay pool. | TH-1.1 (#463) |
| **Mock OP** | Controllable OIDC stub (discovery + JWKS + optional introspection). Tunables: latency, 429/Retry-After, 5xx, rotate-key-on-command, `Cache-Control` (no-store on discovery vs JWKS), empty/oversized JWKS, N-issuer fan. Holds a **known signing key** → forged variants. | **New** (design adds) |
| **Load generator** | **Locust** (Python, distributed, reuses TokenSource + pool replay). k6 acceptable for a lighter CI binary; vegeta for constant-rate baselines. | TH-1.5 (#474) |
| **Cache instrumentation** | Cache-hit-rate + upstream-fetch counters on `_get_disco_response`/`_get_cached_jwks` (hit/miss/refresh); aggregate across workers. | **New** (TH-1.5 needs it) |

**Topology (DECIDED): N single-issuer RS instances** — one booted RS per issuer behind the load generator. Chosen over a multi-issuer middleware variant because it matches the per-process cache reality, makes per-issuer cache-hit-rate directly measurable, mirrors production (an RS trusts one/few issuers), and needs no library change. Cross-issuer cases (mix-up TH-2.2, multi-tenant TH-2.1) route each token to its issuer's RS.

**Issuer set:** local self-contained soak = **node-oidc + Keycloak** (Docker, no secrets; node-oidc carries Descope-shaped `dct`/`tenants` for offline multi-tenant). **Ory + Descope** = hosted, CC-only, secret-gated → **nightly/CI profile only** (Descope local keys are stale). Matches the TH-1.4 (#466) gating rule.

## 3. Token corpus (variety × forged)

**Real, per issuer:** node-oidc `RS256`+`ES256` (CC, auth-code, `dct`/`tenants`); Keycloak `RS256` (`realm_access`/`resource_access`); Ory `RS256` (CC); Descope `RS256` (`dct`/`tenants`, **two issuer formats**, daily JWKS rotation). Access vs id_token; opaque (node-oidc `test-opaque`) for the introspection cost curve.

**Forged/negative (mock OP, known key):** valid · expired · `nbf`-future · wrong-`iss` · wrong-`aud` · tampered-sig (byte-flip) · unknown-`kid` (unpublished key) · wrong-`alg` (HS256 vs RSA `kid`; `alg:none`) · ID-token-as-access (no `scope`/`scp`, or `nonce`/`at_hash` present) · cnf `x5t#S256`-bound-replayed-as-bearer · oversized/many-claim · aud-as-single-array vs multi-aud-with-untrusted-secondary. Real-issuer negatives that can't be forged reuse the **committed expired tokens** + **cross-provider kid-mismatch** the integration suite already ships.

## 4. Scenario suite

| # | Scenario | What it exposes / key assertions |
|---|---|---|
| **S1** | Warm-path RPS ceiling, 1 worker (valid RS256) | Signature verify runs sync on the loop thread → single-worker ceiling; find RPS where p99 knees, then prove near-linear scaling across `--workers N` |
| **S2** | Algorithm cost matrix (RS256 vs ES256, warm) | Per-alg verify cost; report the ratio |
| **S3** | Cold cache stampede (burst, 1 issuer, empty cache) | Assert 32-stripe single-flight → **exactly 1 discovery + 1 JWKS fetch**; N workers → **N-fold** amplification |
| **S4** | TTL-expiry refresh under load (short TTL across boundary) | Refresh collapses to single-flight; no periodic spike storm / error burst |
| **S5** | Provider-slowness head-of-line blocking (mock OP stalls/429 on cold miss) | Cohort queues behind the retrying single-flight holder (`1+2+4s`+`Retry-After`≤120s). **Highest availability risk, zero coverage today** — measure, bound, decide contract |
| **S6** | kid-rotation storm + random-kid DoS + forged-sig flood | (a) rotate key → recover within ~1 cooldown; (b) unknown-kid flood → upstream fetches **capped ≈1/cooldown/issuer**, cached kids keep validating, **clean 401 (no 500/stall)**; (c) forged-sig flood → same cooldown holds |
| **S7** | Connection-pool pressure + LRU thrash (>64 issuers / many concurrent cold fetches) | Graceful queueing on the hardcoded 100-conn pool; >64 issuers → thrash **bounded**, sidecar purged on eviction |
| **S8** | **Rejection correctness & uniformity under contention** | Mixed valid+invalid flood → correct status per class, **zero 500s**, **no cross-talk** (valid never 401s from a concurrent bad token), **F-18 uniform 401 body holds**, **F-07** ID-as-access rejected, **F-02** cnf-as-bearer *currently accepted* (assert & flag), **assert actual status on upstream-kill** (503 branch may be unreachable → 401) |
| **S9** | Discovery `no-store` pathology | Provider sending `no-store` on `.well-known` → **discovery re-fetched every request** (silent throughput collapse today); JWKS still cached |
| **S10** | Blocking `claims_validator` (sync CPU-heavy vs async) | Event-loop stall; justify "use async validators" guidance |
| **S11** | Memory/FD soak (hours) | RSS/FD flat single-issuer (2 entries); multi-issuer churn **bounded at 64**; no httpx keepalive / `request.state` leak |
| **S12** | Multi-tenant + mix-up under load | `dct`/`tenants` LRU-survival (TH-2.1, must also **fail on pre-#461 FIFO**); RFC 9207 cross-issuer `iss` → rejected (TH-2.2) |

**Tiering:** S1–S8 = throughput/correctness core (CI-short). S9/S10 = targeted diagnostics. S11/S12 = nightly soak.

## 5. Metrics & SLOs

**Metrics:** RPS · p50/p95/p99/p999 latency · error-rate by class (expected 401s excluded) · **JWKS + discovery cache-hit-rate** (new counter) · upstream fetches/issuer · RSS/FD over time · event-loop lag.

**Profiles:** CI-short (~2–5 min, node-oidc+Keycloak, gates the PR) + nightly-soak (hours, +Ory/Descope, feeds perf-baseline #271).

**SLO starting bars** (must be set — calibrate from a P3 baseline run):

| Metric | Proposed starting gate |
|---|---|
| Warm p99, single worker | ≤ N ms (calibrate; likely low-single-digit ms) |
| Throughput, single worker, single-issuer warm | ≥ M RPS/worker |
| Cross-worker scaling | ≥ 0.8× linear to physical cores |
| Error-rate (excl. expected 401s) | ≤ 0.1% |
| Steady-state cache-hit-rate | ≥ 99% |
| Cold-start p99 (first req/issuer/worker) | ≤ 2 s |
| RSS growth over soak | no unbounded trend |
| 500s under any scenario | zero |

## 6. Tooling

1. **Extend the pytest-benchmark micro-suite** (`src/tests/benchmarks/`) with an **e2e `validate_token` warm-path micro** — the biggest micro gap (the per-request function is unmeasured).
2. **Fix `docs/performance.md`** — stale (references removed `lru_cache(maxsize=128)`/`cache_info()`; real impl is the TTL `OrderedDict`+64-LRU+cooldown+per-loop-lock stack).
3. **pytest correctness matrix** (TH-1.3 / #465): real RS boot + TokenSource → assert 200 / 401-per-class; **required PR gate**.
4. **Locust macro** (TH-1.5 / #474): scenarios S1–S12 vs the booted RS + mock OP; CI-short + nightly-soak.
5. **Mock OP stub** (new).

## 7. Resolves the epic's seven open items

| Open item | Resolution |
|---|---|
| RS boot greenfield (not `app_fastapi.py`) | §2 new minimal `TokenValidationMiddleware+require_scope` app |
| Single-issuer middleware vs 4-issuer swarm | §2 **DECIDED: N single-issuer RS instances** |
| Malformed-token forging unspecified | §3 **mock OP with a harness-held signing key** |
| No numeric SLOs | §5 starting bars + baseline calibration |
| Token TTL (300s) vs long soak | §1 re-mint cadence / expected-401 policy |
| No cache-hit-rate surface | §2 core instrumentation counters |
| Local-soak issuer set unstated | §2 node-oidc + Keycloak offline; Ory/Descope CI-only |

## 8. Phased build plan

- **P0 — foundation fixups:** correct `docs/performance.md`; add cache-hit/upstream-fetch instrumentation; add the e2e `validate_token` warm micro.
- **P1 — RS boot + TokenSource (real tokens):** TH-1.2 + TH-1.1; correctness-matrix subset (real valid + committed-expired + cross-provider kid-mismatch).
- **P2 — mock OP + forged corpus:** controllable stub; full negative corpus; complete TH-1.3 correctness matrix (S8).
- **P3 — Locust CI-short:** S1–S9; run a **baseline** and set SLO gates; wire `make test-harness` (TH-1.4).
- **P4 — nightly soak:** S11/S12; multi-worker amplification (S3-N); perf baseline #271.

## 9. Middleware improvements the harness will surface (candidate issues)

Filed 2026-08-12 as **opt-in / default-off / backward-compatible**, **sequenced harness-first** (each lands with an end-to-end proof from TH-1.2/1.3/1.5, not blind). Not blockers for the TH build. All verified against `origin/main` (py-identity-model).

- **[#513]** Wire **`allowed_issuers`** into the middleware — the field shipped to `TokenValidationConfig` in **#512 / 3.9.0** but the middleware `__init__` never accepts or passes it, so an RS cannot pin its trusted issuer(s). *(Justified by S6/S7/S12.)*
- **[#514]** Expose **`leeway`** (hardcoded to `0` today → boundary-`exp` tokens intermittently 401 under soak with any clock drift). *(Justified by S4/S11.)*
- **[#515]** **503-vs-401 on upstream outage** — the `NetworkException`→503 branch *exists* (`middleware.py`); the open question is **reachability** (an outage may collapse to 401 earlier → clients won't back off). Measure in S5/S8, then fix if unreachable.
- **[#516]** Offload signature verify to a **thread pool** (event-loop crypto is the single-worker ceiling), **or** document worker-count guidance — decide from the S1/S2 numbers.
- **F-02:** enforce `cnf`/DPoP/mTLS binding on the middleware (still xfail) — tracked separately under **#478** (RS-side DPoP proof + `cnf.jkt`).

## 10. Capacity & Breakpoint Methodology (Epic TH-4)

Extends §4/§5 from **fixed-load correctness/soak** into **capacity**: ramp until an SLO gate trips, find the knee, prove cross-worker scaling, and gate regressions nightly. Cuts the §5 "calibrate from a baseline" + §8 P3/P4 work that was never staged as its own story.

**Infra (owner decision): bigger CI runner only, co-located.** The Locust generator, the in-process mock OP, and the RS-under-test share one *larger* GitHub-hosted runner — no deployed target, no distributed generator. Consequences, stated on every figure:
- Numbers are **directional** — where the *co-located config* knees + a nightly regression signal — **not** the RS's absolute isolated ceiling. A deployed-target lab (RS as a real service + distributed generator over a network) is the only path to the true ceiling and is **deferred**.
- To make **RS crypto the bottleneck**: a lean replay generator (no client-side crypto — it replays the pre-minted pool), minimal mock-OP traffic (single-flight caches keep upstream near-zero after warmup), and **RS `workers ≈ cores−2`** so the generator + mock OP get the rest.

**Load model — open, not closed.** The TH-1.5 `ReplayUser` is closed-loop (no `wait_time`): as the RS slows, offered load self-throttles and the knee is invisible. TH-4 adds (a) a stepped Locust `LoadTestShape` and (b) a constant-arrival (open-model) option (`constant_throughput`/`constant_pacing` or a target-RPS shape) so arrival rate holds while latency/queue blow up.

**Breakpoint detection.** Ramp arrival rate (or users) in stages until the **first `GATES` bar trips** — `max_p99_ms` exceeded, `max_error_rate` exceeded, or RPS plateaus while offered load rises. Record the **knee**: sustained RPS, concurrency, p99, and worker count at the trip. The cross-worker sweep repeats this for `workers ∈ {1..cores}` and reports the scaling factor (target ≥0.8× linear, §5).

**SLO gates go live (T314).** `GATES = {"warm": Gate(), "cold": Gate()}` are dormant (all-`None`). Calibrate `max_p99_ms`/`min_rps`/`max_error_rate`/`min_cache_hit_rate` from a baseline run on the target runner + headroom (§5 starting bars), write them into `src/tests/load/README.md`, and prove they FIRE on an injected regression.

**New profile & cadence.** A new `Profile.CAPACITY` holds the ramp/sweep scenarios (kept off the fast `CI_SHORT` PR gate). The **full sweep runs nightly** on the larger runner, uploads a capacity-report artifact (per-worker max-sustainable RPS + knee), and gates perf regressions vs the baseline. Feeds the §9 **#516** decision (thread-pool crypto offload vs worker-count guidance — the S1/S2 + sweep numbers decide it).

**RSS/FD (T313).** §5 lists RSS/FD but nothing samples them today; S11's only leak signal is a 5xx. Add `psutil` sampling of the RS subprocess into `LoadResult` + a bounded-trend leak gate. Handle the §1 300s-TTL constraint (re-mint cadence) so soaks longer than the pool lifetime don't 401 on expired tokens.
