You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

Tasks are executed sequentially. T122-T125 all depend on T120 (the fixture, already merged). T122-T125 are independent of each other but run sequentially in this loop.

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T120 | test/node-oidc-fixture | Build node-oidc-provider test fixture | done (PR #274 merged) |
| T121 | test/integration-core-flows-v2 | Integration tests: Auth Code + PKCE, Token Validation, Refresh | done (PR #281) |
| T122 | test/integration-token-mgmt | Integration tests: Introspection (RFC 7662), Revocation (RFC 7009) | in_progress (review done, PR phase) |
| T123 | test/integration-advanced-requests | Integration tests: DPoP (RFC 9449), PAR (RFC 9126), JAR (RFC 9101) | pending |
| T124 | test/integration-alt-grants | Integration tests: Device Auth (RFC 8628), Token Exchange (RFC 8693) | pending |
| T125 | test/integration-fapi2 | Integration tests: FAPI 2.0 Security Profile | pending |
| T126 | docs/identityserver-gaps | Document Duende IdentityServer gaps vs node-oidc-provider | pending |
| T128 | test/existing-integration-node-oidc | Wire ALL existing integration tests to also run against node-oidc-provider fixture. Create .env.node-oidc, add --provider conftest param, update docker-compose.test.yml, add Makefile target, verify discovery/JWKS/token_client/token_validation/userinfo all pass | pending |
| T127 | refactor/codebase-cleanup | Codebase cleanup: TYPE_CHECKING guards, lazy imports, duplicate helpers, string-matching error dispatch | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
2. The target repo is `py-identity-model` at `~/repos/auth/py-identity-model`
3. Read `~/repos/auth/py-identity-model/CLAUDE.md` for py-identity-model-specific commands and patterns

## Step 2: Determine What To Do

Read `~/repos/auth/py-identity-model/.claude/task-state.md`.

- **Does not exist** → Pick up next task (Step 3)
- **phase is `complete`** → Update queue status in THIS prompt file (replace `pending` with `done` for that row), clean up worktree, delete task-state.md, pick up next task (Step 3)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue above.

- If none eligible (all done) → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Create `~/repos/auth/py-identity-model/.claude/task-state.md`:
     ```
     task_id: T12X
     branch: <branch from queue>
     worktree: /tmp/pim-T12X
     phase: setup
     ```
  2. Execute the `setup` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from task-state.md. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

**All work after `setup` happens in the worktree directory** — `cd` to the path in `worktree:` before doing anything.

Phase order:

```
setup → analyze → implement → test → review-blind → review-edge → review-acceptance → review-security → review-fix → pr → ci → ci-fix (loop) → await-review → complete
```

---

### setup

1. `cd ~/repos/auth/py-identity-model`
2. Fetch latest: `git fetch origin`
3. Create worktree: `git worktree add /tmp/pim-T12X -b <branch> origin/main`
4. Verify: `cd /tmp/pim-T12X && git log --oneline -3`
5. **Set phase to `analyze`. End your response.**

---

### analyze (T123-T125 — Integration Tests)

`cd <worktree>`

1. Read the test fixture configuration: `test-fixtures/node-oidc-provider/provider.js`
2. Read existing integration tests in `src/tests/integration/` for patterns — especially:
   - `src/tests/integration/conftest_node_oidc.py` — shared fixtures, token helpers, endpoint discovery
   - `src/tests/integration/test_node_oidc_core_flows.py` — T121 patterns (auth code PKCE, token validation, refresh)
   - `src/tests/integration/test_node_oidc_token_mgmt.py` — T122 patterns (introspection, revocation)
3. Read the source code for the features being tested (note: code is split across `sync/`, `aio/`, and `core/`):
   - T123: `src/py_identity_model/core/dpop.py`, `src/py_identity_model/core/par_logic.py`, `src/py_identity_model/core/jar.py`, `src/py_identity_model/sync/par.py`, `src/py_identity_model/aio/par.py`
   - T124: `src/py_identity_model/core/device_auth_logic.py`, `src/py_identity_model/core/token_exchange_logic.py`, `src/py_identity_model/sync/device_auth.py`, `src/py_identity_model/sync/token_exchange.py`, `src/py_identity_model/aio/device_auth.py`, `src/py_identity_model/aio/token_exchange.py`
   - T125: `src/py_identity_model/core/fapi.py`
4. Read the request/response models: `src/py_identity_model/core/models.py` — find the relevant dataclasses (e.g., `DPoPProofRequest`, `PushedAuthorizationRequest`, `JarRequest`, `DeviceAuthorizationRequest`, `TokenExchangeRequest`, `FapiProfile`)
5. Plan integration tests:
   - Each test assumes the node-oidc-provider fixture is running via `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d`
   - Tests exercise the FULL protocol flow: discovery → token request → validation → (feature-specific assertions)
   - Tests verify the actual HTTP exchanges, not mocked responses
   - Tests check error handling with malformed/expired/revoked tokens from the real server
   - Follow the `@pytest.mark.node_oidc` marker pattern from existing tests
   - Include both sync and async test variants
6. Write plan to task-state.md under `## Plan`
7. **Set phase to `implement`. End your response.**

---

### analyze (T126 — IdentityServer Gap Documentation)

`cd <worktree>`

1. Read the existing .NET IdentityServer setup:
   - `examples/identity-server/` — Dockerfile, configuration, supported features
   - `examples/docker-compose.test.yml` — how it's used
2. Read the node-oidc-provider fixture: `test-fixtures/node-oidc-provider/provider.js`
3. Plan the gap document:
   - Feature comparison matrix: IdentityServer vs node-oidc-provider for each RFC
   - Which integration tests can run against IdentityServer vs which require node-oidc-provider
   - Licensing considerations (Duende license vs MIT)
   - Startup time / image size comparison
   - Recommendation: deprecate IdentityServer fixture or keep as secondary target
4. Write plan to task-state.md under `## Plan`
5. **Set phase to `implement`. End your response.**

---

### analyze (T128 — Wire Existing Integration Tests to node-oidc-provider)

`cd <worktree>`

1. Read existing integration test infrastructure:
   - `src/tests/integration/conftest.py` — current conftest with provider-specific logic
   - `src/tests/integration/conftest_node_oidc.py` — node-oidc-specific fixtures
   - All existing `src/tests/integration/test_*.py` files
   - `examples/docker-compose.test.yml` — IdentityServer compose
   - `test-fixtures/node-oidc-provider/docker-compose.yml` — node-oidc compose
   - `Makefile` — existing test targets (`test-integration-node-oidc` already exists)
2. Plan the wiring:
   - Create `.env.node-oidc` config file with fixture endpoints
   - Add conftest parameterization: `--provider=ory|node-oidc|local` pytest option
   - Ensure existing discovery, JWKS, token_client, token_validation, and userinfo tests can run against node-oidc-provider
   - Provider-specific fixture selection based on `--provider` flag
3. Write plan to task-state.md under `## Plan`
4. **Set phase to `implement`. End your response.**

---

### analyze (T127 — Codebase Cleanup)

`cd <worktree>`

1. Read the files that need cleanup:
   - `src/py_identity_model/core/models.py` — Any/base64 lazy imports (lines ~257, ~327)
   - `src/py_identity_model/core/token_validation_logic.py` — inspect/redact_token lazy imports (lines ~162, ~191), inconsistent `from ..core.` imports
   - `src/py_identity_model/core/discovery_policy.py` — TYPE_CHECKING guard for DiscoveryPolicy
   - `src/py_identity_model/core/validators.py` — validate_url_scheme cascade
   - `src/py_identity_model/sync/http_client.py` and `src/py_identity_model/aio/http_client.py` — duplicate _log_retry/_get_retry_params
   - `src/py_identity_model/core/error_handlers.py` — string-matching in handle_discovery_error
2. Plan each cleanup item with before/after code sketches
3. Write plan to task-state.md under `## Plan`
4. **Set phase to `implement`. End your response.**

---

### implement

`cd <worktree>`

1. Read `## Plan` from task-state.md
2. Implement the plan
3. Run lint: `make lint` (from worktree root)
4. Fix any lint issues
5. Commit:
   ```
   git add <specific files — never git add .>
   git commit -m "<type>: <description>"
   ```
6. **Set phase to `test`. End your response.**

---

### test

`cd <worktree>`

**For T123-T125 (integration tests):**
1. Start the fixture: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d --build --wait`
2. Run integration tests: `uv run pytest src/tests/integration/test_<feature>.py -v -m node_oidc`
3. If failures: debug and fix
4. Tear down fixture: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml down`
5. Run full test suite: `make test-unit` (ensure no regressions)

**For T126 (docs):**
1. No tests needed — documentation task

**For T128 (wire existing tests):**
1. Start the fixture: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d --build --wait`
2. Run existing integration tests with node-oidc provider: `make test-integration-node-oidc`
3. Verify ALL existing tests pass (discovery, JWKS, token_client, token_validation, userinfo)
4. Tear down fixture

**For T127 (cleanup):**
1. Run `make lint && make test-unit` to verify no regressions
2. Verify imports resolve correctly: `uv run python -c "from py_identity_model import *"`

7. **Set phase to `review-blind`. End your response.**

---

### review-blind

**Persona: Blind Hunter (Adversarial Reviewer)** — Read `~/repos/auth/auth-planning/_bmad/core/skills/bmad-review-adversarial-general/workflow.md`. Cynical, jaded reviewer with zero patience.

`cd <worktree>`

1. Generate the diff: `git diff origin/main...HEAD`
2. **Review with extreme skepticism.** Find at least ten issues. Look for:
   - Hardcoded secrets that would leak (test credentials vs real credentials)
   - Integration tests that don't actually exercise the protocol (mocking where they shouldn't)
   - Docker misconfigurations (missing healthchecks, port conflicts, no cleanup)
   - Missing error handling, swallowed exceptions
   - Dead code, unused imports, copy-paste errors
   - Fixture config gaps (features not enabled that tests need)
3. Write findings to task-state.md under `## Review: Blind Hunter`:
   ```
   ### MUST FIX
   - [location] finding description

   ### SHOULD FIX
   - [location] finding description

   ### NITPICK
   - [location] finding description
   ```
4. **Set phase to `review-edge`. End your response.**

---

### review-edge

**Persona: Edge Case Hunter** — Read `~/repos/auth/auth-planning/_bmad/core/skills/bmad-review-edge-case-hunter/workflow.md`. Pure path tracer.

`cd <worktree>`

1. Generate the diff: `git diff origin/main...HEAD`
2. Walk ALL branching paths in changed code. Collect ONLY unhandled paths.
3. Write findings to task-state.md under `## Review: Edge Case Hunter` as JSON:
   ```json
   [
     {
       "location": "file:line",
       "trigger_condition": "description (max 15 words)",
       "guard_snippet": "minimal code sketch to close gap",
       "potential_consequence": "what goes wrong (max 15 words)"
     }
   ]
   ```
4. **Set phase to `review-acceptance`. End your response.**

---

### review-acceptance

**Persona: Acceptance Auditor** — Meticulous spec-compliance reviewer.

`cd <worktree>`

1. Read the task requirements from the task queue description and task-state.md plan
2. Generate the diff: `git diff origin/main...HEAD`
3. **For each requirement**, check:
   - Is it implemented and tested?
   - For T123-T125 (tests): Does each RFC feature have happy-path AND error-path coverage?
   - For T126 (docs): Is the comparison matrix complete and actionable?
   - For T128 (wiring): Do ALL existing tests pass against node-oidc-provider?
   - For T127 (cleanup): Is each listed cleanup item addressed?
4. Write findings to task-state.md under `## Review: Acceptance Auditor`:
   ```
   ### PASS
   - [requirement] — implemented at [file:line], tested at [test:line]

   ### FAIL
   - [requirement] — what's missing or wrong

   ### PARTIAL
   - [requirement] — what's implemented vs. what's missing
   ```
5. **Set phase to `review-security`. End your response.**

---

### review-security

**Persona: Sentinel (Security Auditor)** — Pragmatic auth-domain security engineer. Reference: `~/repos/auth/auth-planning/docs/ralph-planning/ralph-bmad-integration-plan.md` § 2.1

`cd <worktree>`

1. Generate the diff: `git diff origin/main...HEAD`
2. **Security review focused on test infrastructure:**
   - **Credential exposure:** Are test client IDs/secrets clearly scoped to local fixture? Could they be confused with real credentials?
   - **Docker security:** Does the fixture run as non-root? Are ports only bound to localhost?
   - **Token handling in tests:** Do tests validate tokens properly or accept anything? (Tests should still verify signatures)
   - **CI safety:** Does the test infrastructure introduce supply chain risk (unpinned dependencies, external image pulls)?
3. Write findings to task-state.md under `## Review: Security (Sentinel)`:
   ```
   ### BLOCK
   - [CONFIRMED/LIKELY] [location] — finding + scenario

   ### WARN
   - [location] — finding + mitigation

   ### INFO
   - [location] — observation
   ```
4. If no issues: write `PASS`.
5. **Set phase to `review-fix`. End your response.**

---

### review-fix

**Persona: Amelia (Dev)** — Fix mode.

`cd <worktree>`

1. Read ALL review sections from task-state.md
2. **Priority:** Security BLOCK → Acceptance FAIL → Blind Hunter MUST FIX → Edge Case (security/crash) → WARN/SHOULD FIX → PARTIAL
3. Fix each item, run lint + tests, commit
4. If no findings to fix: skip to next phase.
5. **Set phase to `pr`. End your response.**

---

### pr

`cd <worktree>`

1. Push: `git push -u origin <branch>`
2. Create PR:
   ```
   gh pr create \
     --base main \
     --head <branch> \
     --title "<type>: <description>" \
     --body "$(cat <<'PREOF'
   ## Summary
   <bullet points>

   ## Test plan
   - [x] Integration tests pass against live node-oidc-provider
   - [x] Unit tests still pass (no regressions)
   - [x] Lint passes
   - [ ] CI passes

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )"
   ```
3. Record PR in task-state.md
4. **Set phase to `ci`. End your response.**

---

### ci

`cd <worktree>`

1. `gh pr checks <pr_number> --watch --fail-fast`
2. **All pass** → **set phase to `await-review`**
3. **Fail** → read logs, write to `## CI` in task-state.md, **set phase to `ci-fix`**

---

### ci-fix

`cd <worktree>`

1. Diagnose and fix CI failure
2. `make lint && make test-unit`
3. Commit and push
4. **Set phase to `ci`**

---

### await-review

**STOP. Do NOT merge.** The PR requires human review before merge.

1. Request review: `gh pr edit <pr_number> --add-reviewer jamescrowley321`
2. Write to task-state.md: `## Awaiting Review: PR #<number> ready for @jamescrowley321`
3. Output: <promise>AWAITING_REVIEW: PR #<number></promise>
4. **Set phase to `complete`. End your response.**

The PR will be merged by the reviewer. The loop continues to the next task without waiting for the merge — subsequent tasks will branch from `origin/main` which may or may not include this PR yet. If a subsequent task depends on this PR's code being on main, it will fail at setup and should be marked `blocked`.

---

### complete

1. Update task queue in THIS prompt file: replace `pending` with `done`
2. Clean up: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-T12X --force`
3. Delete task-state.md
4. Output: <promise>TASK COMPLETE</promise>

---

## Rules

- Execute ONE phase per iteration, then end — do NOT chain phases
- NEVER skip phases — every task goes through all review layers
- NEVER commit to main — always work on feature branches in worktrees
- All work after setup happens in the worktree
- Follow existing code patterns in py-identity-model
- Integration tests must exercise real protocol flows, not mock responses
- The node-oidc-provider fixture uses HTTP only (no TLS) — acceptable for local testing
- **Review integrity:** Each review persona operates independently. Do NOT pre-emptively fix things to avoid review findings — let the reviewers find issues, then fix in review-fix.
- If stuck 3+ iterations: set task to `blocked`, clean up, move on
