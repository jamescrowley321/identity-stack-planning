You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

Tasks are executed sequentially. T121-T125 all depend on T120 (the fixture must exist first). T121-T125 are independent of each other but run sequentially in this loop.

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T120 | test/node-oidc-fixture | Build node-oidc-provider test fixture | pending |
| T121 | test/integration-core-flows | Integration tests: Auth Code + PKCE, Token Validation, Refresh | pending |
| T122 | test/integration-token-mgmt | Integration tests: Introspection (RFC 7662), Revocation (RFC 7009) | pending |
| T123 | test/integration-advanced-requests | Integration tests: DPoP (RFC 9449), PAR (RFC 9126), JAR (RFC 9101) | pending |
| T124 | test/integration-alt-grants | Integration tests: Device Auth (RFC 8628), Token Exchange (RFC 8693) | pending |
| T125 | test/integration-fapi2 | Integration tests: FAPI 2.0 Security Profile | pending |
| T126 | docs/identityserver-gaps | Document Duende IdentityServer gaps vs node-oidc-provider | pending |

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
setup → analyze → implement → test → review → fix → pr → ci → ci-fix (loop) → complete
```

---

### setup

1. `cd ~/repos/auth/py-identity-model`
2. Fetch latest: `git fetch origin`
3. Create worktree: `git worktree add /tmp/pim-T12X -b <branch> origin/main`
4. Verify: `cd /tmp/pim-T12X && git log --oneline -3`
5. **Set phase to `analyze`. End your response.**

---

### analyze (T120 — Build node-oidc-provider Test Fixture)

`cd <worktree>`

**This task creates the node-oidc-provider Docker-based test fixture.**

1. Read existing integration test infrastructure:
   - `examples/docker-compose.test.yml` — current .NET IdentityServer setup
   - `examples/identity-server/` — current Dockerfile and config
   - `src/tests/integration/` — existing integration test patterns
   - `examples/descope/` — Descope example patterns
2. Read node-oidc-provider research: `~/repos/auth/auth-planning/_bmad-output/brainstorming/research/node-oidc-provider-research.md`
3. Plan the fixture:
   - `test-fixtures/node-oidc-provider/provider.js` — configuration:
     - Enable features: introspection, revocation, deviceFlow, pushedAuthorizationRequests, requestObjects (JAR), dPoP, clientCredentials
     - Static clients: one for client_credentials, one for auth_code+PKCE, one for device_flow
     - `extraTokenClaims` hook emitting Descope-style `dct`/`tenants` JWT claims
     - Both RSA and EC keys for key-type test coverage
     - JWT access tokens (not opaque) via `features.resourceIndicators` or `formats.AccessToken`
     - In-memory adapter (default)
     - `devInteractions` enabled (no custom login UI needed)
   - `test-fixtures/node-oidc-provider/Dockerfile` — node:20-alpine, install oidc-provider, expose port
   - `test-fixtures/node-oidc-provider/docker-compose.yml` — standalone compose for the fixture with healthcheck
   - Update `examples/docker-compose.test.yml` or create new compose file that includes the node-oidc-provider service
4. Write plan to task-state.md under `## Plan`
5. **Set phase to `implement`. End your response.**

---

### analyze (T121-T125 — Integration Tests)

`cd <worktree>`

1. Read the test fixture configuration: `test-fixtures/node-oidc-provider/provider.js`
2. Read existing integration tests in `src/tests/integration/` for patterns
3. Read the source code for the features being tested:
   - T121: `src/py_identity_model/auth_code.py`, `src/py_identity_model/token_validation.py`, `src/py_identity_model/refresh.py`
   - T122: `src/py_identity_model/introspection.py`, `src/py_identity_model/revocation.py`
   - T123: `src/py_identity_model/dpop.py`, `src/py_identity_model/par.py`, `src/py_identity_model/jar.py`
   - T124: `src/py_identity_model/device_auth.py`, `src/py_identity_model/token_exchange.py`
   - T125: `src/py_identity_model/fapi2.py`
4. Plan integration tests:
   - Each test starts the node-oidc-provider fixture (or assumes it's running via docker-compose)
   - Tests exercise the FULL protocol flow: discovery → token request → validation → (introspection/revocation if applicable)
   - Tests verify the actual HTTP exchanges, not mocked responses
   - Tests check error handling with malformed/expired/revoked tokens from the real server
5. Write plan to task-state.md under `## Plan`
6. **Set phase to `implement`. End your response.**

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

**For T120 (fixture):**
1. Build and start the fixture: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d --build`
2. Verify healthcheck passes: `curl http://localhost:3000/.well-known/openid-configuration`
3. Verify client_credentials grant works: `curl -X POST http://localhost:3000/token -d 'grant_type=client_credentials&client_id=test-client&client_secret=test-secret&scope=openid'`
4. Verify custom claims in token (decode JWT, check for `dct` and `tenants` fields)
5. Tear down: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml down`
6. Commit any test scripts or fixes

**For T121-T125 (integration tests):**
1. Start the fixture: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d`
2. Wait for healthcheck
3. Run integration tests: `uv run pytest src/tests/integration/test_<feature>.py -v`
4. If failures: debug and fix
5. Tear down fixture
6. Run full test suite: `make test-unit` (ensure no regressions)

**For T126 (docs):**
1. No tests needed — documentation task

7. **Set phase to `review`. End your response.**

---

### review

`cd <worktree>`

Combined review (lighter than the full 4-layer review for these test/infra tasks):

1. Generate diff: `git diff origin/main...HEAD`
2. Review for:
   - **Security:** No hardcoded secrets that would leak. Test client credentials are for local fixture only.
   - **Correctness:** Integration tests actually exercise the protocol (not just HTTP calls with pre-built tokens)
   - **Coverage:** Each RFC feature has at least one happy-path and one error-path integration test
   - **Fixture config:** node-oidc-provider features enabled match what tests need
   - **Docker:** Healthcheck works, cleanup is reliable, no port conflicts
3. Write findings to task-state.md under `## Review`
4. **Set phase to `fix`. End your response.**

---

### fix

`cd <worktree>`

1. Read `## Review` from task-state.md
2. Fix any issues found
3. Run lint + tests
4. Commit fixes
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
   - [x] Fixture builds and starts successfully
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
2. **All pass** → **set phase to `complete`**
3. **Fail** → read logs, write to `## CI` in task-state.md, **set phase to `ci-fix`**

---

### ci-fix

`cd <worktree>`

1. Diagnose and fix CI failure
2. `make lint && make test-unit`
3. Commit and push
4. **Set phase to `ci`**

---

### complete

1. Update task queue in THIS prompt file: replace `pending` with `done`
2. Clean up: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-T12X --force`
3. Delete task-state.md
4. Output: <promise>TASK COMPLETE</promise>

---

## Rules

- Execute ONE phase per iteration, then end
- NEVER commit to main — always work on feature branches in worktrees
- All work after setup happens in the worktree
- Follow existing code patterns in py-identity-model
- Integration tests must exercise real protocol flows, not mock responses
- The node-oidc-provider fixture uses HTTP only (no TLS) — acceptable for local testing
- If stuck 3+ iterations: set task to `blocked`, clean up, move on
