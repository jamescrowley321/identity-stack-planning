# py-identity-model — Next-Round RP Conformance (Logout + Dynamic Registration)

## Context

`py-identity-model` (`~/repos/auth/py-identity-model/`) is **OpenID Certified** (v3.1.0,
2 Jul 2026) for **Basic RP + Config RP + Form Post Basic RP**. This loop pursues the next
certification round — three profiles — plus the enabling provider/infra work.

**Target profiles (tracker #242):**

| Profile | Issue | Core primitive to build | OIDF plan |
|---|---|---|---|
| **Back-Channel Logout RP** | #442 | `validate_logout_token()` | `oidcc-client-backchannel-logout-certification-test-plan` |
| **RP-Initiated Logout RP** | #214 | `build_end_session_url()` + `state` round-trip | RP-initiated logout plan (OIDF "Logout Support" group) |
| **Dynamic RP** | #216 | RFC 7591/7592 registration client | `oidcc-client-dynamic-certification-test-plan` |

**Dropped (do NOT implement):** Hybrid, Implicit, Front-Channel Logout, Session Management.

**Spec source of truth:** the test cases and fixtures are already written in the planning
repo — `epic-0e-spec-logout.md` (LOGOUT-001/002/003 for RP-initiated; LOGOUT-004/005/006/007/
009/010 for back-channel; LOGOUT-008 = front-channel = **dropped**) and
`epic-0e-spec-dynamic-registration.md`. Implement to those.

**Current library state (verified):**
- `oidc_constants.py` already has `EndSessionRequest`, `BackChannelLogoutRequest`,
  `END_SESSION_ENDPOINT` — constants only, **no logic**.
- Discovery model (`core/models.py`) already has `registration_endpoint`, but is **missing**
  `end_session_endpoint`, `backchannel_logout_supported`, `backchannel_logout_session_supported`.
- No `validate_logout_token`, no end-session URL builder, no registration client exist yet.
- Conformance harness (`conformance/app.py`, `conformance/app_fastapi.py`) + configs for
  basic/config/form-post already exist and pass. No logout/dynamic configs yet.

## Ground rules (read before every iteration)

- **Work in this worktree only** — never switch the main checkout's branch. Branch from `main`.
- **One PR per unit of work** (per stale branch reconciled, per KC story, per profile). Open
  the PR; **do not merge** — the owner reviews and merges. No auto-merge, ever.
- **Every iteration gate:** `make lint` → `make test-unit` (80% cov) →
  `make test-integration-node-oidc` (+ `make test-integration-keycloak` once KC.1 lands) →
  relevant `make conformance-test` run. Never `--no-verify`.
- **Conventional commits (Angular).** Scope middleware-package changes `(fastapi)` — that scope
  is load-bearing for release routing; an unscoped change touching only `packages/` still bumps
  the core.
- **Deterministic conformance fixture = node-oidc-provider.** Keycloak is the **live**
  cross-check, added the same way the other providers are (see the Keycloak epic).
- After a profile's PR is up, request a **fresh-context adversarial re-review** before merge
  (in-loop reviews are shallow).
- Update `~/repos/auth/py-identity-model/.claude/task-state.md` after each completed unit.

## Phase 0 — Reconcile the in-flight branches (do this first)

Four branches are **stale-with-a-delta** (mostly already on `main`, but ahead by a few
commits). For each: diff against current `main`, keep only the genuinely-unmerged slice, open
one clean PR, then delete/close the stale branch. Do **not** blindly rebase the whole branch.

| Branch | ahead/behind main | Likely-unmerged slice to salvage |
|---|---|---|
| `feat/conformance-cert-package` | ~12 / ~44 | hosted-CI workflow, `docs/certification.md`, `run_tests.py` export/log tooling, token-exchange error-body fix |
| `feat/fastapi-conformance-regression` | ~5 / ~7 | `packages/fastapi-identity-model/…/rp.py` delta, `conformance.yml` fastapi job (`app_fastapi.py` + configs already on main) |
| `feat/fastapi-identity-model-package` | ~5 / ~22 | reconcile vs the already-released package — likely mostly superseded; salvage only real deltas |
| `docs/openid-certification` | ~1 / ~14 | cert mark PNG + README badge — check against #440 first (docs already updated there) |

Exit criteria: each branch is either merged-via-clean-PR or closed with a one-line rationale;
no orphaned unmerged value remains.

## Phase 1 — Keycloak provider (Track A) — epic `epic-pim-keycloak-provider-integration.md`

Add Keycloak **the same way the other providers are wired**, with a realm that maximizes
capability surface. Stories, in order:

- **KC.1** — `test-fixtures/keycloak/` (compose + capability-maximal `realm-export.json` +
  README), mirroring the node-oidc-provider fixture lifecycle.
- **KC.2** — `.env.keycloak.example` + `make test-integration-keycloak` (mirror
  `test-integration-node-oidc`) + confirm `provider_matrix.py` pickup.
- **KC.3** — full capability-gated integration suite runs green against Keycloak (no advertised
  capability left skipped); fix library gaps in `core/` with unit tests.
- **KC.4** — extend `provider_matrix.py` with `registration_endpoint`, `end_session_endpoint`,
  `backchannel_logout_supported/_session_supported` columns; refresh the published matrix.

(KC.5 — live logout/registration tests — is deferred until the matching profile lands in
Phases 2–4. KC.6 — CI + docs — closes the epic at the end.)

## Phases 2–4 — The three profiles (Back-Channel → RP-Init → Dynamic)

Same three-layer shape each time: **core primitive + unit tests** → **discovery fields +
harness wiring + conformance config** → **hosted-suite run + captured logs**. One PR per
profile (split if a PR gets large). Sync + async parity is mandatory for every primitive.

### Phase 2 — Back-Channel Logout RP (#442) — best fit, do first
- **Core:** new `core/logout_logic.py` `validate_logout_token(token, issuer, audience, …)`:
  verify signature via JWKS; require `iss`, `aud`, `iat`, `jti`, `events`; require `sub`
  and/or `sid`; `events` MUST contain `http://schemas.openid.net/event/backchannel-logout`
  = `{}`; **reject `nonce`**; honor `typ: logout+jwt`; validate `exp` if present. Distinct
  exception per reject rule.
- **Wrappers:** `sync/logout.py`, `aio/logout.py`.
- **Discovery model:** add `backchannel_logout_supported`, `backchannel_logout_session_supported`.
- **Unit tests:** LOGOUT-004/005/006/007/009/010 (one per reject rule + the accept case),
  using the `epic-0e` fixtures.
- **Harness:** add a `backchannel_logout_uri` POST receiver to `conformance/app.py`
  (+ `app_fastapi.py`) that calls `validate_logout_token`; add
  `conformance/configs/backchannel-logout-rp.json` (+ fastapi variant).
- **Run:** `make conformance-test` for the back-channel plan; capture logs.

### Phase 3 — RP-Initiated Logout RP (#214)
- **Core:** `build_end_session_url(end_session_endpoint, id_token_hint,
  post_logout_redirect_uri, state, client_id, …)`; `state` round-trip validation (reuse
  `core/state_validation.py`).
- **Discovery model:** add `end_session_endpoint`.
- **Unit tests:** LOGOUT-001/002/003.
- **Harness:** logout redirect + post-logout callback in `conformance/app.py`;
  `conformance/configs/rpinitiated-logout-rp.json` (+ fastapi variant).
- **Run:** RP-initiated logout plan; capture logs.

### Phase 4 — Dynamic RP (#216)
- **Core:** new `core/registration_logic.py` with request/response/document models and
  `register_client` (POST), `read_client` (GET), `update_client` (PUT), `delete_client`
  (DELETE) per RFC 7591/7592, plus OIDC registration-1.0 metadata; `sync/registration.py`,
  `aio/registration.py`. `registration_endpoint` is already in discovery.
- **Unit tests:** minimal + full metadata registration, CRUD, error responses (both APIs).
- **Harness:** dynamic-registration config `conformance/configs/dynamic-rp.json` — the suite
  registers the client at start.
- **Run:** `oidcc-client-dynamic-certification-test-plan`; capture logs.
- **Then KC.5** — add the live Keycloak logout + registration integration tests now that all
  three primitives exist.

## Phase 5 — Combined submission (owner-driven)
- Capture every hosted plan's logs/zips into `conformance/results/hosted/`.
- Update `docs/oidc-certification-analysis.md` (planning repo) + tracker **#242** with results.
- Stage a **single combined** OIDF submission package (all three profiles at once — same
  pattern as the first round). **The owner** performs the interactive OIDF submission and the
  hosted-token rotation — the loop stops at "submission package staged".

## Key files

| Purpose | Path |
|---|---|
| Discovery model (add logout fields) | `src/py_identity_model/core/models.py` |
| Logout constants (present) | `src/py_identity_model/oidc_constants.py` |
| New: logout logic | `src/py_identity_model/core/logout_logic.py` + `sync/logout.py` + `aio/logout.py` |
| New: registration logic | `src/py_identity_model/core/registration_logic.py` + `sync/registration.py` + `aio/registration.py` |
| Conformance harness | `conformance/app.py`, `conformance/app_fastapi.py` |
| Conformance configs | `conformance/configs/` |
| Conformance runner | `conformance/run_tests.py` |
| Provider matrix | `src/tests/integration/provider_matrix.py` |
| Integration fixtures/conftest | `src/tests/integration/conftest.py`, `test-fixtures/` |
| Keycloak fixture (new) | `test-fixtures/keycloak/` |
| Keycloak epic | planning: `_bmad-output/planning-artifacts/epics/epic-pim-keycloak-provider-integration.md` |
| Logout spec + fixtures | planning: `_bmad-output/planning-artifacts/epics/epic-0e-spec-logout.md` |
| Dynamic-reg spec | planning: `_bmad-output/planning-artifacts/epics/epic-0e-spec-dynamic-registration.md` |
| Task state | `~/repos/auth/py-identity-model/.claude/task-state.md` |

## References
- Tracker #242 · Back-Channel #442 · RP-Initiated #214 · Dynamic #216 · multi-provider matrix #414
- OIDF logout testing group: <https://openid.net/certification/connect_rp_logout_testing/>
- OIDF RP submission: <https://openid.net/certification/connect_rp_submission/>
