---
inputDocuments:
  - _bmad-output/planning-artifacts/prd-multi-provider-test.md
  - _bmad-output/implementation-artifacts/ralph-prompts/pim-integration-tests.md
  - _bmad-output/implementation-artifacts/ralph-prompts/pim-fastapi-conformance-regression.md
workflowType: 'epics'
project_name: 'py-identity-model'
date: '2026-07-31'
---

# Token Validation Harness & PIM Feature-Proof — Epic Breakdown

## Overview

**Source:** Extends **PRD 3 — Multi-Provider Test Infrastructure (I4)**. Triggered by the observation that recent py-identity-model runtime features (esp. #461 jwks-cache FIFO→LRU / T236) were merged on green **unit** CI with **no integration proof**, breaking the repo's own rule (*every feature MUST ship integration tests + examples; unit tests are not sufficient*).

**Target repo:** `py-identity-model` (harness, backfill, and conformance gates live here). Reuses the multi-tenant Descope token minter from `identity-stack/backend/tests/e2e/helpers/auth.py`.

**Execution method:** Ralph loop — prompt `ralph-prompts/token-harness.md` (authored separately). One story per PR off `main`, standard `setup→…→complete` pipeline. Owner merges.

**Goal:** A production-style FastAPI server mounting the `fastapi-identity-model` middleware, exercised by two complementary suites over the wired IdP matrix (node-oidc-provider, Keycloak, Ory Network, Descope multi-tenant):
- a **pytest correctness matrix** (+ deterministic behavior proofs) that mints real tokens and asserts accept/reject per class, and
- a **Locust load/soak suite** that swarms the server with a pre-minted token pool to prove behavior under concurrency.

Every recent unproven feature is then proven through it, and every conformance-relevant change is gated on the OIDF suite.

**Tooling split (deliberate):** correctness and the behavior proofs (LRU survival, issuer mix-up, private_key_jwt) are **pytest** — they need exact assertions and *controlled* access patterns. Volume/throughput/soak is **Locust** — Python-native so it reuses the same `TokenSource` minters, with a pre-minted token pool (mint once, replay many; real IdPs rate-limit per-request minting and JWT validation is stateless, so replay is valid).

**Load/soak design:** the concrete design for TH-1.2 (RS boot) + TH-1.5 (Locust) — scenario suite, forged-token corpus, mock-OP failure injection, cache-hit instrumentation, SLOs, and the resolved single-issuer-RS topology — lives in [`architecture-token-harness-load-soak.md`](./architecture-token-harness-load-soak.md).

**Definition of Done (applies to every story below, per `ralph-prompts/phases/test.md` + `phases/pr.md`):**
- Integration tests under `src/tests/integration/` that hit a **real** IdP/HTTP server (not mocks); unit tests are necessary but not sufficient.
- A usage example under `examples/` when the change adds public API surface.
- **Conformance:** if the change touches an OIDF-certified profile (Basic / Config / Form Post Basic RP) or a profile with a conformance suite (DPoP, PAR, RP-initiated / back-channel logout), the applicable conformance plan must still pass — asserted in the story's ACs.

**#461 disposition:** #461 remains on `main` **pending TH-2.1**. TH-2.1 is executed first; if it cannot demonstrate the LRU-survival behavior #461 claims, TH-2.1 ships a **revert of #461** instead of a proof.

## Epic List

### Epic TH-1: Token Validation Harness Foundation
The FastAPI resource server plus the two test suites — a pytest correctness matrix and a Locust load/soak suite — over the wired IdP matrix. **Repo:** py-identity-model.

### Epic TH-2: Feature-Proof Backfill
Prove each recently-merged runtime feature end-to-end through the harness, closing the trust gap — starting with #461's multi-tenant LRU. **Repo:** py-identity-model.

### Epic TH-3: Conformance Coverage & Gates
Ensure conformance tests pass wherever a change is conformance-relevant, and wire the FastAPI RP conformance run as a regression gate. **Repo:** py-identity-model.

### Epic TH-4: Capacity & Breakpoint
Turn the landed TH-1.5 Locust harness from a fixed-load correctness/soak rig into a capacity rig: ramp load until an SLO gate trips, find the knee, prove cross-worker scaling, and gate perf regressions nightly. **Repo:** py-identity-model.

---

## Epic TH-1: Token Validation Harness Foundation

### Story TH-1.1: Unified multi-provider token minter

As a test author,
I want one `TokenSource` interface that mints real tokens from any wired IdP,
So that both the correctness matrix and the load suite obtain tokens the same way regardless of provider.

**Acceptance Criteria:**

**Given** the existing minters are scattered across `src/tests/integration/conftest.py` (client_credentials, auth-code+PKCE, private_key_jwt, opaque) and `identity-stack/backend/tests/e2e/helpers/auth.py` (Descope multi-tenant session JWTs)
**When** the unified minter is built
**Then** a `TokenSource` exposes `mint(provider, grant, *, tenant=None, scopes=None, malform=None)` returning a real token, and each wired provider (node-oidc, keycloak, ory, descope) is registered
**And** capability/credential absence yields a structured skip (reusing `provider_capabilities` from `conftest.py`), never a hard failure

**Given** the Descope path
**When** a multi-tenant session token is requested
**Then** the minter reuses the identity-stack access-key→`/v1/auth/accesskey/exchange` flow to produce a JWT carrying distinct `dct`/`tenants` claims

**Files:** `src/tests/integration/harness/minters.py` (new), `src/tests/integration/conftest.py`
**Size:** Medium
**Task ID:** T300

### Story TH-1.2: Resource-server test fixture (middleware under real HTTP)

As a test author,
I want a fixture that boots the `fastapi-identity-model` middleware as a real HTTP server,
So that tokens are validated by the actual production code path, not an in-process stub.

**Acceptance Criteria:**

**Given** `packages/fastapi-identity-model` exposes `TokenValidationMiddleware`, `build_oidc_router`, and `require_scope`, and `conformance/app_fastapi.py` already mounts them
**When** the fixture starts
**Then** a uvicorn server runs a protected app (endpoints: public `/health`, `require_scope`-guarded `/protected`, claim-inspecting `/whoami`) configured against a chosen provider's issuer, reachable over `httpx`
**And** the server is torn down cleanly per test session and its `OIDCSettings` come from the provider env-file

**Files:** `src/tests/integration/harness/server.py` (new), `packages/fastapi-identity-model/`, `conformance/app_fastapi.py`
**API:** `GET /health`, `GET /protected` (require_scope), `GET /whoami`
**Size:** Medium
**Task ID:** T301

### Story TH-1.3: Token correctness assertion matrix (pytest)

As a maintainer,
I want to send valid and deliberately-invalid tokens from each provider and assert exact outcomes,
So that runtime validation correctness is proven deterministically.

**Acceptance Criteria:**

**Given** the minter (TH-1.1) and server fixture (TH-1.2)
**When** the matrix runs for a provider
**Then** it sends one token per class — valid, expired, wrong-issuer, wrong-audience, tampered-signature, unknown-`kid`, wrong-alg, and (where supported) DPoP-bound
**And** valid tokens receive `200`, every invalid class receives `401` with the expected error, and no class is silently accepted

**Given** the matrix is deterministic
**When** it runs
**Then** it uses a fixed, controlled set of tokens (not a random swarm) so failures are reproducible; the load/soak swarm is the separate TH-1.5 suite

**Files:** `src/tests/integration/test_harness_matrix.py` (new), `src/tests/integration/harness/`
**Size:** Medium
**Task ID:** T302
**Depends on:** TH-1.1, TH-1.2

### Story TH-1.4: Harness CI target + gating

As a maintainer,
I want the harness runnable via make and wired into CI,
So that both suites run on the right providers per environment and lay the groundwork for nightly validation.

**Acceptance Criteria:**

**Given** the correctness matrix (TH-1.3) and the Locust load suite (TH-1.5)
**When** `make test-harness` is invoked
**Then** it boots the required local fixtures (node-oidc, keycloak), runs the pytest matrix + the Locust CI load profile, and accepts `--env-file` to target Ory/Descope when creds are present

**Given** CI
**When** the workflow runs
**Then** node-oidc + keycloak harness jobs run on every PR, Ory/Descope harness runs only when secrets are present, and a documented (not-yet-scheduled) hook for the nightly provider-validation job (#271) is left in place

**Files:** `Makefile`, `.github/workflows/ci.yml`
**Size:** Medium
**Task ID:** T303
**Depends on:** TH-1.3, TH-1.5

### Story TH-1.5: Load/soak suite (Locust)

As a maintainer,
I want to swarm the resource server with many concurrent tokens under sustained load,
So that throughput, cache behavior, and stability are proven — not just single-request correctness.

**Acceptance Criteria:**

**Given** a pre-minted token pool spanning issuers/tenants (mint once via TH-1.1, replay many — real IdPs rate-limit per-request minting; JWT validation is stateless so replay is valid)
**When** the Locust suite swarms `/protected` at configurable users / spawn-rate
**Then** it reports RPS, latency percentiles, error rate, and JWKS/discovery cache hit-rate, and fails if the error rate exceeds a threshold or throughput regresses

**Given** a short CI profile and a longer nightly soak profile
**When** each runs headless
**Then** the CI profile completes in bounded time and the soak profile surfaces leaks/regressions over sustained load (feeds the nightly hook, #271)

**Design:** scenario suite S1–S12, forged-token corpus, controllable mock OP, cache-hit instrumentation, SLO gates, and the single-issuer-RS topology are specified in [`architecture-token-harness-load-soak.md`](./architecture-token-harness-load-soak.md).

**Files:** `src/tests/load/locustfile.py` (new), `src/tests/load/README.md`, `pyproject.toml` (locust dev-dep)
**Size:** Medium
**Task ID:** T311
**Depends on:** TH-1.1, TH-1.2

---

## Epic TH-2: Feature-Proof Backfill

### Story TH-2.1: Multi-tenant JWKS-cache LRU proof (#461 / T236)

As the maintainer,
I want the multi-tenant LRU eviction behavior #461 claims to be proven end-to-end,
So that a merged security change is trusted — or reverted if it cannot be shown.

**Acceptance Criteria:**

**Given** a small `max_cache_entries` and a legitimately-hot issuer/tenant whose JWKS is read frequently
**When** a **deterministic** test (controlled access pattern, not the random load suite) drives reads from many distinct attacker-influenced issuers (distinct `disco_doc_address`→`jwks_uri`, and distinct Descope `dct` tenants) to force eviction pressure
**Then** the hot entry is **not** evicted (LRU-by-access holds) and its tokens keep validating without a re-fetch storm
**And** the same test on the pre-#461 (FIFO) code path fails — proving the test actually discriminates the behavior

**Given** the LRU behavior cannot be demonstrated within this story
**When** the story closes
**Then** it instead ships a **revert of #461** with a note, and re-files T236 for a proper redo

**Files:** `src/tests/integration/test_token_validation_cache.py`, `src/tests/integration/harness/`
**Size:** Medium
**Task ID:** T304
**Depends on:** TH-1.3

### Story TH-2.2: RFC 9207 issuer mix-up rejection proof (#457 / T58)

As a maintainer,
I want issuer-response validation proven against a real mix-up condition,
So that the RFC 9207 defense is known to reject cross-issuer responses.

**Acceptance Criteria:**

**Given** two wired providers with distinct issuers
**When** a callback is processed whose `iss` belongs to provider B while provider A was expected
**Then** validation raises the mismatch error, and the happy-path (matching `iss`) is accepted
**And** absence of `iss` when the AS advertises `authorization_response_iss_parameter_supported` is rejected

**Files:** `src/tests/integration/test_authorize_callback.py`
**Size:** Small
**Task ID:** T305
**Depends on:** TH-1.1

### Story TH-2.3: private_key_jwt end-to-end proof (#433 / T57)

As a maintainer,
I want private_key_jwt client auth proven through the resource server across endpoints,
So that the FAPI-2 client-auth path is validated, not just unit-asserted.

**Acceptance Criteria:**

**Given** the node-oidc `test-private-key-jwt` client
**When** token, PAR, and introspection requests authenticate via `private_key_jwt`
**Then** each carries a decodable `client_assertion` with correct claims, no HTTP Basic header is sent, and the requests succeed against the live provider
**And** precedence is honored (private_key_jwt over client_secret over public) and an unsupported alg raises

**Files:** `src/tests/integration/test_private_key_jwt.py`
**Size:** Medium
**Task ID:** T306
**Depends on:** TH-1.2

### Story TH-2.4: Recent-batch integration-coverage sweep

As the maintainer,
I want the rest of the recent PIM batch audited for missing integration coverage,
So that the whole distrusted batch is brought up to the integration-test bar.

**Acceptance Criteria:**

**Given** the recently-merged runtime changes (jwks-cache single-flight + cooldown #401, refresh-on-signature-failure, DPoP/PAR/JAR, conformance logout error-message fix #459)
**When** each is audited against `src/tests/integration/`
**Then** every behavior with no real-IdP/real-HTTP test gets one added (or a documented `[skip-integration-tests: <reason>]` justification for pure type/no-runtime changes)
**And** a short coverage report lists each recent PR → its proving test

**Files:** `src/tests/integration/`, `docs/` (coverage report)
**Size:** Medium
**Task ID:** T307
**Depends on:** TH-1.3

---

## Epic TH-3: Conformance Coverage & Gates

### Story TH-3.1: Feature → conformance-profile coverage matrix

As a maintainer,
I want a matrix mapping each affected feature to its applicable OIDF conformance profile,
So that "passes conformance where applicable" is a concrete, checkable list.

**Acceptance Criteria:**

**Given** the certified profiles (Basic / Config / Form Post Basic RP) and profiles with suites (DPoP, PAR, RP-initiated / back-channel logout)
**When** the matrix is authored
**Then** each recent/affected feature is marked conformance-relevant or not, with the specific plan/profile named, and gaps (features with a profile but no run) are listed
**And** it is linked from `docs/oidc-certification-analysis.md`

**Files:** `docs/oidc-certification-analysis.md`, `docs/conformance-coverage-matrix.md` (new)
**Size:** Small
**Task ID:** T308

### Story TH-3.2: FastAPI RP conformance regression gate

As a maintainer,
I want the `fastapi-identity-model` RP run through the certified profiles automatically,
So that a validation/middleware change cannot regress certification unnoticed.

**Acceptance Criteria:**

**Given** `conformance/app_fastapi.py` and the existing `make conformance-test-fastapi` + `pim-fastapi-conformance-regression.md`
**When** a PR changes token-validation or middleware code
**Then** the certified profiles run against the FastAPI RP and the PR fails if any profile regresses
**And** the run is reproducible locally via a single make target

**Files:** `conformance/`, `.github/workflows/`, `Makefile`
**Size:** Large
**Task ID:** T309
**Depends on:** TH-3.1

### Story TH-3.3: Logout profile conformance (RP-initiated + back-channel)

As a maintainer,
I want the logout profiles exercised against the Keycloak fixture,
So that logout features (RP-initiated / back-channel, e.g. #442) carry conformance evidence.

**Acceptance Criteria:**

**Given** the Keycloak fixture advertises `end_session_endpoint` and `backchannel_logout_supported`
**When** the logout conformance plans run against the RP
**Then** RP-initiated and back-channel logout flows pass, and any feature added under these profiles includes the conformance run in its ACs

**Files:** `conformance/`, `src/tests/integration/test_rp_initiated_logout.py`, `test_backchannel_logout_live.py`
**Size:** Medium
**Task ID:** T310
**Depends on:** TH-3.1

---

## Epic TH-4: Capacity & Breakpoint

Extends the landed TH-1.5 Locust harness (PR #524) — a fixed-load correctness/soak rig — into a **capacity & breakpoint rig**. Cuts the baseline + SLO-calibration + breakpoint work the design left open (§5 SLO bars marked "calibrate from a baseline run"; §8 P3/P4). **Infra (owner decision): bigger CI runner only, co-located** — the generator, in-process mock OP, and RS share one larger runner, so numbers are **directional** (the co-located knee + a nightly regression signal), **not** the RS's absolute isolated ceiling; a deployed-target lab is deferred. **Design:** `architecture-token-harness-load-soak.md` §4/§5/§10. **Repo:** py-identity-model.

> **⚠ CORRECT-COURSE 2026-08-19 — `sprint-change-proposal-2026-08-19.md`.** Post-crash
> re-diagnosis found the perf gates **vacuous** (`GATES` all-`None`, never populated) and the
> capacity assertions **structurally flaky** on the co-located runner. The epic is re-framed from
> "one absolute-SLO gate, calibration pending" into a **two-tier model**: **Track A** = machine-
> independent *invariant* gates on shared CI (T314a, active) · **Track B** = absolute RPS/p99/knee
> *reported* as artifacts, never a shared-CI pass/fail (de-flaked TH-4.4) · **Track C** = absolute
> SLO gates on an *isolated* runner only (T314b → TH-4.5, owner-gated). Execution: stacked PRs
> LP-1…LP-4 into `py-identity-model`. **S10** (blocking-validator scaffold, `scenarios.py:355-367`)
> is formally **de-scoped** from the S1–S12 coverage matrix — relabelled tracked backlog (needs a
> blocking custom-validator RS app, a separate feature) — so coverage claims stay honest.

### Story TH-4.1: Ramp, open-model, and worker-scaling knobs

As a maintainer,
I want the load runner to ramp load (not just hold a fixed level) and drive the RS across worker counts,
So that a scenario can search for the saturation knee instead of measuring one arbitrary fixed point.

**Acceptance Criteria:**

**Given** `_run_locust` pins `-r == -u` (instant constant-load) and `_scenario_stack` boots the RS at `workers=1`
**When** a scenario declares a ramp shape and/or a target worker count
**Then** Locust runs a stepped `LoadTestShape` (ramp N→M across stages) with an optional constant-arrival (open-model) mode, the RS boots at the requested `workers=N`, and per-worker `/metrics` counters are aggregated
**And** a real short ramp run captures per-stage RPS/latency (a green unit run is not proof)

**Files:** `src/tests/load/runner.py`, `src/tests/load/locustfile.py`, `src/tests/load/scenarios.py`, `src/tests/harness/rs_server.py`
**Size:** Medium
**Task ID:** T312

### Story TH-4.2: RSS/FD instrumentation + long-soak token refresh

As a maintainer,
I want the soak to actually measure memory/FD trend and survive past the 300s token TTL,
So that S11 detects leaks mechanically (not only via a 5xx) and long runs don't 401 on expired tokens.

**Acceptance Criteria:**

**Given** nothing samples RSS/FD today (S11 is titled for it but measures nothing) and `LoadPool.refresh()` is never called mid-run
**When** a soak scenario runs
**Then** the RS subprocess RSS/FD are sampled into `LoadResult`, S11 asserts a bounded trend (a synthetic leak trips the gate), and a re-mint cadence keeps the replay pool valid past 300s (or post-expiry 401s are classified as expected, not error budget)

**Files:** `src/tests/load/runner.py`, `src/tests/load/scenarios.py`, `src/tests/load/pool.py`, `src/tests/load/test_load_nightly.py`
**Size:** Medium
**Task ID:** T313
**Depends on:** TH-4.1

### Story TH-4.3: Baseline + SLO-gate calibration

> **⚠ CORRECT-COURSE 2026-08-19 (`sprint-change-proposal-2026-08-19.md`).** As originally
> written this story is **unachievable on shared CI**: it calibrates absolute
> `max_p99_ms`/`min_rps` "from a baseline run **on the target runner**," but the target
> runner is a **co-located** box where absolute p99/RPS are contention noise — any threshold
> is either useless (loose) or flaky (tight). That is why `GATES` is still empty. **Split into
> T314a + T314b.**

#### Story TH-4.3a: Machine-independent invariant gates (shared CI) — **active**

As a maintainer,
I want the load gates to fail on regressions that are *machine-independent*,
So that shared CI can catch a real perf/cache regression without ever flaking on runner noise.

**Acceptance Criteria:**

**Given** `GATES = {"warm": Gate(), "cold": Gate()}` are all-`None` and only 5xx + status-correctness fire
**When** the invariant gates are activated
**Then** a **wide-band S2 alg-cost ratio** gate (ES256/RS256, calibrated wide — catches an order-of-magnitude regression, not runner noise) and a per-warm-scenario **cache-hit-by-count** invariant are added to `evaluate_gates`
**And** an **injected-regression test** proves each new gate FIRES (a self-asserted green is not proof)
**And** no *absolute* p99/RPS threshold is set on shared CI

**Files:** `src/tests/load/runner.py`, `src/tests/load/test_load_ci_short.py`, `src/tests/load/README.md`
**Size:** Small-Medium
**Task ID:** T314a
**Depends on:** TH-4.1

#### Story TH-4.3b: Absolute SLO calibration — **deferred into TH-4.5**

Absolute `max_p99_ms`/`min_rps`/`max_error_rate` calibration from a baseline + headroom is only
honest on an **isolated runner**. Folded into **TH-4.5 (T316)** and gated on the owner
provisioning that runner. Not on shared CI.

**Task ID:** T314b
**Depends on:** TH-4.5 infra (isolated runner)

### Story TH-4.4: Capacity/breakpoint scenarios + `CAPACITY` profile

> **⚠ CORRECT-COURSE 2026-08-19.** As landed, `test_load_capacity.py` asserts the ramp *must*
> find a breakpoint inside the 500→8000 ladder and `max_sustainable_rps > 0` — a **structural
> false-fail** on a noisy co-located runner where step-1 can plateau below `sustain_ratio`. The
> knee is **reported** (Track B), not asserted-present. De-flake: assert the *mechanism* (goodput
> plateau **when** a knee is found, zero 5xx under saturation, monotonic offered rate, curve
> renders); a ladder exhausted clean is a reported outcome, not a failure. Absolute knee numbers
> are directional-only until TH-4.5's isolated runner.

As a maintainer,
I want ramp-to-breakpoint scenarios that report max sustainable load and the cross-worker scaling factor without flaking on shared CI,
So that we get a directional knee + regression signal, not a false-failing nightly.

**Acceptance Criteria:**

**Given** the ramp/worker knobs (TH-4.1) and the **invariant** gates (TH-4.3a)
**When** the new `Profile.CAPACITY` runs
**Then** warm ramp, cold ramp, and a cross-worker sweep run; the knee (RPS, users, p99, worker count) is **recorded and reported** in the capacity artifact when found; the suite fails only on 5xx under load, non-monotonic offered rate, or an un-rendered report — **never** on "no breakpoint within the ladder"
**And** cross-worker scaling is **reported** (≥0.8× linear is a Track-B observation, not a shared-CI gate)

**Files:** `src/tests/load/scenarios.py`, `src/tests/load/runner.py`, `src/tests/load/test_load_capacity.py`, `src/tests/load/README.md`
**Size:** Large
**Task ID:** T315
**Depends on:** TH-4.1, TH-4.3a

### Story TH-4.5: Larger-runner nightly full sweep + report artifact + regression gate

As a maintainer,
I want the full breakpoint sweep to run nightly on a larger runner and gate perf regressions,
So that capacity numbers are the best co-located approximation and regressions are caught between releases.

**Acceptance Criteria:**

**Given** a larger GitHub-hosted runner label (owner-provisioned; `ubuntu-latest` fallback documented)
**When** the nightly runs
**Then** the full `CAPACITY` sweep + `NIGHTLY` soak run on the larger runner with cores allocated (RS `workers≈cores−2`, lean generator + mock OP), the capacity report is uploaded as an artifact, and a perf-regression gate fails on p99/RPS/error deltas vs the T314b baseline

> **CORRECT-COURSE 2026-08-19.** This story now **absorbs T314b** (absolute-SLO calibration): the
> isolated larger runner is the *only* honest home for absolute `max_p99_ms`/`min_rps` gates.
> Owner-gated on provisioning the larger-runner label. Shared-CI keeps only the Track-A invariant
> gates (T314a); this story is where absolute numbers become a real gate.

**Files:** `.github/workflows/nightly.yml`, `Makefile`, `src/tests/load/test_load_nightly.py`, `src/tests/load/runner.py`, `src/tests/load/README.md`
**Size:** Medium
**Task ID:** T316 (absorbs T314b)
**Depends on:** TH-4.2, TH-4.4, owner-provisioned isolated runner

---

## Implementation Order / Dependency Graph

```
TH-1.1 ─┬─> TH-1.3 (correctness matrix) ─┐
        ├─> TH-1.5 (Locust load/soak) ───┼─> TH-1.4 (CI gate over both suites)
TH-1.2 ─┘                                │
TH-1.3 ─┬─> TH-2.1  (FIRST — the #461 prove/revert gate; deterministic, not the load suite)
        └─> TH-2.4
TH-1.1 ───> TH-2.2
TH-1.2 ───> TH-2.3
TH-3.1 ─┬─> TH-3.2
        └─> TH-3.3
TH-1.5 ───> TH-4.1 ─┬─> TH-4.2 ──────────────┐
                    └─> TH-4.3 ─> TH-4.4 ─────┴─> TH-4.5
```

### Execution Priority
1. **TH-1.1 + TH-1.2** (foundation) → **TH-1.3** (correctness matrix) + **TH-1.5** (Locust load/soak).
2. **TH-2.1** immediately after TH-1.3 — it decides #461's fate (prove or revert; deterministic pytest, not the load suite).
3. **TH-1.4** (CI gate over both suites), then **TH-2.2 / TH-2.3 / TH-2.4** (remaining backfill).
4. **TH-3.1** → **TH-3.2 / TH-3.3** (conformance gates).
5. **TH-4.1** (ramp/worker knobs) → **TH-4.2 + TH-4.3** (RSS-FD/refresh + baseline-gates) → **TH-4.4** (breakpoint sweep) → **TH-4.5** (nightly on a larger runner). Extends TH-1.5; co-located, bigger-runner-only.

## Story Count Summary

| Epic | Stories | Sizes |
|------|---------|-------|
| TH-1 Harness Foundation | 5 | M, M, M, M, M |
| TH-2 Feature-Proof Backfill | 4 | M, S, M, M |
| TH-3 Conformance Coverage & Gates | 3 | S, L, M |
| TH-4 Capacity & Breakpoint | 5 | M, M, M, L, M |
| **Total** | **17** | 2×S · 13×M · 2×L |
