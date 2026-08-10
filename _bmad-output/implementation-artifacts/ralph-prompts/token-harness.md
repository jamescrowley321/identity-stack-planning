Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

**Epic:** py-identity-model #462 — *E2E Token-Blaster Harness & PIM Feature-Proof (TH-1..TH-3)*.
**Design (source of truth for topology/scenarios/SLOs):** `identity-stack-planning` → `_bmad-output/planning-artifacts/architecture-token-harness-load-soak.md` and the epic `epics-token-harness.md`.

## Running

Run the loop from a **dedicated py-identity-model worktree**, never from the main `~/repos/auth/py-identity-model` checkout — this keeps `PROMPT.md`/`.claude/task-state.md` out of the primary checkout and keeps `main` pristine.

```bash
# One-time: create the orchestrator worktree off main
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-harness-ralph -b ralph/token-harness origin/main

# Run the loop from inside that worktree
cd /tmp/pim-harness-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/token-harness.md PROMPT.md
ralph run --idle-timeout 0        # 0 = don't SIGTERM long-quiet phases (uvicorn boots / Locust runs / Docker fixtures go quiet)
```

`ORCH_WORKTREE` below refers to `/tmp/pim-harness-ralph`. **The prompt must live inside the orchestrator worktree as `PROMPT.md` for the whole run** — ralph re-reads `PROMPT.md` from CWD every iteration, so copy it in before `ralph run` and keep it there. The planning-repo copy at `ralph-prompts/token-harness.md` is the source of truth; edit it there and re-`cp` if you change the workstream mid-run. Per-task implementation happens in its own short-lived worktree (`/tmp/pim-T3XX`) created by the `setup` phase — the orchestrator worktree only hosts the loop, never task branches. When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-harness-ralph`.

**ONE PIM loop at a time.** Do NOT run this concurrently with `pim-fapi2-hardening.md` or `pim-shipped-audit.md` on `py-identity-model` — they share the repo and would collide. Remove any stale orchestrator worktrees first (`git worktree list`).

## Task Queue

Ordered per the epic's Execution Priority + dependency graph. One story = one PR off `main`, owner-merged. `T299` is a P0 prerequisite the load/soak design added (TH-1.5 needs a cache-hit-rate surface the middleware does not expose today).

| Task | Issue · Story | Description | Status |
|------|---------------|-------------|--------|
| T299 | (design §8 P0) | Foundation fixups: correct the stale `docs/performance.md`; add cache-hit/upstream-fetch counters to `aio/token_validation.py`; add an end-to-end `validate_token` warm-path micro to `src/tests/benchmarks/` | pending |
| T300 | #463 · TH-1.1 | Unified multi-provider `TokenSource` minter (+ forged-token corpus / controllable mock OP) | pending |
| T301 | #464 · TH-1.2 | Resource-server test fixture — `TokenValidationMiddleware + require_scope` booted under uvicorn (N single-issuer instances) | pending |
| T302 | #465 · TH-1.3 | Token correctness assertion matrix (pytest): 200 valid / 401-per-class, nothing silently accepted | pending |
| T311 | #474 · TH-1.5 | Load/soak suite (Locust): scenarios S1–S12 vs the booted RS + mock OP | pending |
| T304 | #467 · TH-2.1 | Multi-tenant JWKS-cache LRU **prove-or-revert #461** (must fail on the pre-#461 FIFO path) | pending |
| T303 | #466 · TH-1.4 | `make test-harness` + CI gating (node-oidc+keycloak always; Ory/Descope secret-gated; nightly hook #271) | pending |
| T305 | #468 · TH-2.2 | RFC 9207 issuer mix-up rejection proof through the harness | pending |
| T306 | #469 · TH-2.3 | private_key_jwt end-to-end proof through the RS | pending |
| T307 | #470 · TH-2.4 | Recent-batch integration-coverage sweep (#401 single-flight/cooldown, refresh-on-sig-failure, DPoP/PAR/JAR, #459) | pending |
| T308 | #471 · TH-3.1 | Feature → OIDF conformance-profile coverage matrix (docs) | pending |
| T309 | #472 · TH-3.2 | FastAPI RP conformance regression gate (make it required) | pending |
| T310 | #473 · TH-3.3 | Logout profile conformance (RP-initiated + back-channel) against the Keycloak fixture | pending |

**Already on `main` — do NOT rebuild, PROVE THROUGH THE HARNESS:** the integration suite already has `test_private_key_jwt.py` (T306's feature), `test_authorize_callback.py` mix-up cases (T305), and `test_token_validation_cache.py` (T304-adjacent). TH-2.x does not re-implement these features — it proves them **end-to-end through the booted RS** (T301), which does not exist yet. The `fastapi-identity-model` middleware, `provider_matrix.py`, the node-oidc/Keycloak Docker fixtures, and the RS-side security fixes (F-01 3.8.6, SSRF 3.8.7, F-18 fastapi 0.2.1, SC2 issuer-pinning 3.9.0) are all already shipped.

### Sequencing

Pick in listed order. Key constraints from the epic:
- **T299 first** — small, self-contained library change; a good warm-up and it unblocks T311's cache-hit metric.
- **T300 + T301 are the foundation** — everything else depends on them.
- **T304 (TH-2.1) runs immediately after T302** — it decides #461's fate (prove the LRU survival or ship a **revert of #461** + re-file T236). Deterministic pytest, not the load suite.
- **T303 (CI gate) depends on both T302 and T311** — do it after the Locust suite exists.
- **T309 is Large** (conformance regression gate) — the capstone of TH-3.

## Design decisions already made (do NOT re-litigate — read the design doc)

- **RS topology: N single-issuer RS instances** (one booted RS per issuer). The middleware binds ONE `discovery_url` + `audience`; cross-issuer cases route each token to its issuer's RS.
- **The RS boot is greenfield** — `conformance/app_fastapi.py` is the RP *login* router (`build_oidc_router`), NOT the load target. Boot `TokenValidationMiddleware + require_scope`; only the uvicorn/ASGI scaffolding is reusable.
- **Forging strategy: a controllable mock OP holding a known signing key** (real OPs won't emit invalid tokens, and node-oidc's keys are ephemeral/not exported). The mock OP also drives T311's failure injection (latency, 429/Retry-After, 5xx, key-rotation-on-command, `no-store`, empty/oversized JWKS).
- **Pre-mint once, replay many** (stateless validation; real IdPs rate-limit). Handle the 300s token TTL over a long soak with a re-mint cadence, or classify post-expiry 401s as expected (not error budget).
- **Local self-contained soak = node-oidc + Keycloak** (Docker, no secrets; node-oidc carries Descope-shaped `dct`/`tenants`). Ory + Descope are hosted/secret-gated → CI/nightly only.

## Routing

Repo: `~/repos/auth/py-identity-model` (the loop's CWD is `ORCH_WORKTREE` = `/tmp/pim-harness-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/pim-harness-ralph/.claude/task-state.md`).

- **Does not exist** → Pick first `pending` task, create state, execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up the task worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order (pipeline): `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`.
- **T299** is a library fix — `docs` phase is the `docs/performance.md` correction + changelog; `test` = unit + the new micro-bench.
- **T302, T304–T307** ARE the integration proofs — their `test` phase runs the real-IdP harness (`make test-integration-node-oidc` / `-keycloak`), not just unit.
- **T311** — `test` phase is a real Locust run against the booted RS + mock OP (a green unit run is NOT proof); `docs` = `src/tests/load/README.md` + the SLO baseline.
- **T308–T310** are conformance tasks — `test`/`docs` produce the coverage matrix + real OIDF suite evidence (a hosted/gated run), never a self-asserted green.

## New Task Setup

Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/pim-harness-ralph/.claude/task-state.md`):
```
task_id: T3XX
branch: <type>/<short-desc>   # e.g. feat/token-harness-minter, test/harness-correctness-matrix
worktree: /tmp/pim-T3XX
phase: setup
```

The `setup` phase creates the task worktree with `git worktree add /tmp/pim-T3XX -b <branch> origin/main` (run from `ORCH_WORKTREE`).

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the task worktree — `cd /tmp/pim-T3XX` first.

## Task-Specific Analysis Guidance

Include these notes when the `analyze` phase reads the issue. Read the design doc `architecture-token-harness-load-soak.md` for T300/T301/T302/T311.

- **T299 (foundation fixups):** `docs/performance.md` is materially STALE — it documents `functools.lru_cache`/`async_lru.alru_cache(maxsize=128)` + `cache_info()`/`cache_clear()` APIs that no longer exist. The real impl is a TTL `OrderedDict` stack (`core/jwks_cache.py` policy + `aio/token_validation.py` `_disco_cache`/`_jwks_cache`) with 64-entry LRU, 32-stripe single-flight, per-URI kid-miss cooldown (5s), and per-loop `WeakKeyDictionary` locks. Correct the doc to match. Add lightweight **cache-hit + upstream-fetch counters** to `_get_disco_response`/`_get_cached_jwks` (hit/miss/refresh) — a small metrics hook (a counters object or optional Prometheus), per-process (aggregate across workers in T311). Add an **end-to-end `validate_token` warm-path micro** to `src/tests/benchmarks/` (only raw `pyjwt.decode` is benched today; the function that runs on every request is unmeasured). Unit tests for the counters; no example needed.

- **T300 (TH-1.1 minter, #463):** Unify the session-scoped conftest minters (`client_credentials_token`, `jwt_access_token`, `opaque_access_token`, `auth_code_result`, the Keycloak HTML-form + node-oidc devInteractions auth-code helpers) and the identity-stack Descope multi-tenant minter into `TokenSource.mint(provider, grant, tenant, scopes, malform)`, capability/credential-gated like `provider_matrix.py`. Build the **pre-minted replay pool**. Build the **controllable mock OP** (discovery + JWKS + optional introspection) holding a known signing key — it supplies the forged corpus (tampered-sig, unknown-kid, wrong-alg, `alg:none`, wrong-iss/aud, ID-as-access, cnf-bound-as-bearer, oversized/many-claim) AND T311's failure injection. Real-issuer negatives that can't be forged reuse the committed expired tokens + cross-provider kid-mismatch. See design §2–§3. DoD: a real-IdP integration test proving the minter.

- **T301 (TH-1.2 RS boot, #464):** GREENFIELD minimal FastAPI app: `TokenValidationMiddleware(audience=…, require_access_token_marker=…)` + `/protected` routes guarded by `require_scope`, booted under uvicorn `--workers N`, reachable over httpx. Parametrize by issuer (N single-issuer instances). Do NOT reuse `conformance/app_fastapi.py` (RP login router). See design §2. DoD: a real-HTTP integration test.

- **T302 (TH-1.3 correctness matrix, #465):** One token per class from each provider through the booted RS: assert **200** for valid, **401 with the expected error** per invalid class, nothing silently accepted. Classes = valid, expired, nbf-future, wrong-iss, wrong-aud, tampered-sig, unknown-kid, wrong-alg/`alg:none`, **ID-token-as-access (F-07 → reject)**, **cnf-bound-as-bearer (F-02 → ACCEPTED today, xfail; assert current contract, do NOT assume rejection)**, DPoP-bound. **F-18 uniform-401 body is FIXED on `main`** — assert the 401 body is uniform across validation stages. Deterministic (load is T311). See design §4 (S8) + the 29-case integration rejection catalog.

- **T311 (TH-1.5 Locust, #474):** Implement scenarios **S1–S12** from design §4 against the booted RS (T301) + pre-minted pool (T300) + mock OP (T300, for failure injection). Report RPS, p50/p95/p99/p999, error-rate-by-class (exclude expected 401s), **cache-hit-rate (T299 counters)**, upstream fetches/issuer, RSS/FD. CI-short + nightly-soak profiles. Run a **baseline first, then set the SLO gates** (design §5 — the epic names none). Handle the 300s TTL vs soak (re-mint cadence). The highest-value uncovered scenario is **S5 (provider-slowness head-of-line blocking)** — the single-flight holder retries with backoff while holding the fetch lock.

- **T304 (TH-2.1 LRU prove/revert, #467):** Drive distinct issuers + Descope tenants to force eviction pressure; assert the hot entry **survives (LRU)** AND the same test **FAILS on the pre-#461 FIFO path** (discriminating — else it proves nothing). If LRU survival can't be shown, ship a **revert of #461** + re-file T236. Deterministic pytest. See design S12 + the epic's #461 disposition.

- **T303 (TH-1.4 CI gate, #466):** `make test-harness` runs the pytest correctness matrix (T302) AND the Locust CI profile (T311). node-oidc + Keycloak always; Ory/Descope only when secrets present; leave a documented (not-scheduled) nightly hook (#271). See design §2 issuer set + §5 profiles.

- **T305 (TH-2.2 mix-up, #468):** RFC 9207 — a real callback with `iss` from a second provider → rejected through the harness; happy path accepted; missing `iss` when advertised → rejected. Extends `test_authorize_callback.py`.

- **T306 (TH-2.3 private_key_jwt, #469):** node-oidc `test-private-key-jwt` (ES256 assertion, no secret) end-to-end through the RS for token + PAR + introspection; assertion precedence honored; no Basic header. Extends `test_private_key_jwt.py`.

- **T307 (TH-2.4 backfill sweep, #470):** Audit #401 (single-flight + cooldown), refresh-on-signature-failure, DPoP/PAR/JAR, and #459 for missing real-IdP coverage; add one integration test per uncovered behavior + a PR→proving-test coverage report under `docs/`.

- **T308 (TH-3.1 coverage matrix, #471):** Map each affected feature to its OIDF profile (Basic/Config/Form-Post RP certified; DPoP/PAR/logout); mark conformance-relevant vs not; list gaps. Docs only.

- **T309 (TH-3.2 conformance gate, #472):** #437 already built the FastAPI RP conformance run (`make conformance-test-fastapi`, `rp-fastapi` service) — make it a **required regression gate** on validation/middleware PRs. Large. Conformance evidence must come from a gating CI job or a hosted run, never a self-asserted green.

- **T310 (TH-3.3 logout conformance, #473):** Run RP-initiated + back-channel logout conformance against the **Keycloak** fixture (the capability-maximal logout issuer); any logout feature (e.g. #442) must carry the conformance run in its ACs.

## Rules

- ONE phase per iteration, then end.
- Run the loop from `ORCH_WORKTREE` (`/tmp/pim-harness-ralph`), never from the main checkout. Never commit to `main` — task work happens in `/tmp/pim-T3XX` worktree branches.
- Run `make lint` as a single command before every commit; do NOT use `--no-verify`.
- **This is a TEST-HARNESS workstream** — the deliverable IS the proof. T302 and T304–T307 must exercise a **real** IdP/HTTP server (not mocks); T311 must attach a **real Locust run** (a green unit run is NOT proof); T308–T310 must attach **real OIDF suite evidence**. Run the relevant integration/harness target locally before the `pr` phase. Usage examples only where a task adds public API surface (most are test infra — none required).
- All unit AND integration tests must pass. Never rationalize a red test as pre-existing, environmental, or out-of-scope.
- **Reconcile the queue against reality before picking a task:** cross-check each `pending` row against merged PRs (`gh pr list --state merged`) and shipped `origin/main`. TH-2.x features already have partial *unit/integration* coverage — the task is the *end-to-end harness proof*, not re-implementation.
- Conventional-commit PRs against `main`, one story per PR, each linking its issue and the epic #462. **Never auto-merge** — the owner reviews and merges every PR manually (no `gh pr merge`, `--auto`, or merge-queue commands).
- The mutation `security-gate` runs on any PR touching a gated `core/` module (T299, T304 may): kill or exact-name-waive its in-scope mutants (see `tools/mutation_security.py`); function-scoped, so cover the functions you change.
- If stuck 3+ iterations on one task: set it to `blocked`, clean up the worktree, move on.
- If all tasks done: `<promise>LOOP_COMPLETE</promise>`
