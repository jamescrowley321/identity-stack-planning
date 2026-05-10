# py-identity-model — Finish OIDC RP Conformance Baseline

## Context

The py-identity-model repo (`~/repos/auth/py-identity-model/`) has an OIDC RP conformance test harness in `conformance/` that runs the OpenID Foundation's Basic RP test suite against the library via a thin FastAPI RP app. The harness uses the hosted certification suite at `certification.openid.net`.

Infrastructure PRs are merged:
- **#359** (`infra/hosted-runner`) — closed (superseded by work merged directly to main)
- **#361** (`infra/makefile-refactor`) — merged 2026-04-12

The conformance harness is operational. Previous state had 6 of 14 Basic RP tests returning `[????]` (unknown/incomplete status):

```
[????] oidcc-client-test                          — basic auth code flow
[PASS] oidcc-client-test-invalid-iss
[PASS] oidcc-client-test-missing-sub
[PASS] oidcc-client-test-invalid-aud
[PASS] oidcc-client-test-missing-iat
[????] oidcc-client-test-kid-absent-single-jwks   — kid fallback
[PASS] oidcc-client-test-kid-absent-multiple-jwks
[????] oidcc-client-test-idtoken-sig-rs256        — signature validation
[SKIP] oidcc-client-test-idtoken-sig-none
[PASS] oidcc-client-test-invalid-sig-rs256
[????] oidcc-client-test-userinfo-invalid-sub     — UserInfo sub check
[PASS] oidcc-client-test-nonce-invalid
[????] oidcc-client-test-scope-userinfo-claims    — UserInfo claim handling
[????] oidcc-client-test-client-secret-basic       — auth method
```

The `[????]` status means the test completed but the suite couldn't determine a definitive pass — typically because the RP didn't behave as the spec requires (e.g., accepted something it should have rejected, or didn't use the expected auth method).

## Task Queue (T140-T146)

The sprint plan identifies three library-level fixes that directly map to the failing tests, plus the conformance integration tasks:

| ID | Description | Maps to test | Size |
|----|-------------|-------------|------|
| **T140** | `kid` absent fallback — when JWT has no `kid` and JWKS has a single key, use that key instead of throwing | `oidcc-client-test-kid-absent-single-jwks` | small |
| **T141** | UserInfo `sub` mismatch validation — reject UserInfo response when `sub` != ID token `sub` | `oidcc-client-test-userinfo-invalid-sub` | small |
| **T142** | JWKS cache TTL with forced refresh on signature failure | `oidcc-client-test-idtoken-sig-rs256` (partial) | medium |
| **T143** | Build conformance test harness | Already done — `conformance/` exists | — |
| **T144** | Pass Basic RP conformance tests | The goal of this prompt | medium |
| **T145** | Pass Config RP conformance tests | After T144 | medium |
| **T146** | Fix any remaining conformance failures | Iterative | medium |

## Your Tasks

### Phase 1: Infrastructure (COMPLETE)

PRs #359 and #361 are resolved. The hosted conformance runner is operational on main.

### Phase 2: Fix the library to pass the 6 failing tests (COMPLETE — all now passing)

Work on feature branches from `main`. Each fix should include unit tests.

**T140 — `kid` absent single-key fallback** (maps to `oidcc-client-test-kid-absent-single-jwks`)
- Location: `src/py_identity_model/core/jwks_logic.py` and/or `core/token_validation_logic.py`
- When: JWT header has no `kid` claim AND the JWKS contains exactly one key
- Fix: Use that single key for validation instead of raising `KeyNotFoundError`
- Test: Unit test with a JWT missing `kid` + a single-key JWKS → validation succeeds

**T141 — UserInfo `sub` mismatch** (maps to `oidcc-client-test-userinfo-invalid-sub`)
- Location: `src/py_identity_model/core/userinfo_logic.py` or the RP harness `conformance/app.py`
- When: The UserInfo endpoint returns a `sub` that differs from the ID token's `sub`
- Fix: After fetching UserInfo, compare `userinfo["sub"]` against the ID token's `sub` claim and reject if they differ
- This may be a harness-level check (the library returns the raw UserInfo, the RP should validate it)

**T142 — JWKS cache forced refresh** (maps to `oidcc-client-test-idtoken-sig-rs256` partially)
- Location: `src/py_identity_model/sync/jwks.py` and `aio/jwks.py`
- Issue: JWKS is cached via `lru_cache`/`alru_cache` with no TTL. When the conformance suite rotates keys mid-test, the RP uses the stale cached key and fails to validate the signature.
- Fix: Add a retry mechanism — on signature validation failure, clear the JWKS cache and re-fetch before giving up. Issue #219 tracks this.

**Remaining `[????]` tests** (`oidcc-client-test`, `oidcc-client-test-scope-userinfo-claims`, `oidcc-client-test-client-secret-basic`):
- These may resolve once T140-T142 are fixed (cascading effects)
- If not, investigate the conformance suite logs at the URLs shown in the test output (`https://localhost.emobix.co.uk:8443/log-detail.html?log=<id>`)
- `oidcc-client-test-client-secret-basic` may need the RP harness to explicitly use `client_secret_basic` auth method (check `conformance/configs/basic-rp.json`)
- `oidcc-client-test-scope-userinfo-claims` may need the RP to actually request and display userinfo claims (check the harness callback handler)

### Phase 3: Validate

After each fix:
1. Run `make lint` (pre-commit hooks)
2. Run `make test-unit` (unit tests, 80% coverage)
3. Run `make test-integration-node-oidc` (integration tests against local fixture)
4. Run `make conformance-up && cd conformance && python run_tests.py --plan basic-rp` locally to verify the fix against the conformance suite
5. Push and verify the conformance CI workflow passes

### Phase 4: Clean up

1. ~~Close PR #359 and/or #361~~ — Done (#359 closed, #361 merged)
2. Update the task-state file (`~/repos/auth/py-identity-model/.claude/task-state.md`) — mark completed tasks and advance to the next
3. Clear stale branches: `chore/conformance-token-makefile`, `chore/test-infrastructure-cleanup`, `ci/conformance-suite-in-ci`, `fix/conformance-token-api-path`, `infra/cert-init-ssl-sharing` — check if any have unmerged work before deleting

## Key Files

| Purpose | Path |
|---------|------|
| JWKS key matching logic | `src/py_identity_model/core/jwks_logic.py` |
| Token validation orchestration | `src/py_identity_model/core/token_validation_logic.py` |
| UserInfo logic | `src/py_identity_model/core/userinfo_logic.py` |
| Sync JWKS (cache) | `src/py_identity_model/sync/jwks.py` |
| Async JWKS (cache) | `src/py_identity_model/aio/jwks.py` |
| RP conformance harness | `conformance/app.py` |
| Test runner | `conformance/run_tests.py` |
| Basic RP config | `conformance/configs/basic-rp.json` |
| Latest results | `conformance/results/basic-rp-latest.json` |
| Full certification gap analysis | `docs/oidc-certification-analysis.md` |
| Task queue | `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/task-queue.md` |

## Constraints

- Always work on feature branches, never commit to `main`
- Conventional commits (Angular convention) — semantic-release is active
- 80% minimum test coverage enforced by pre-commit hooks
- Integration tests are mandatory for library changes (not just unit tests)
- The conformance suite requires Docker and uses `localhost.emobix.co.uk:8443` (resolves to 127.0.0.1)
