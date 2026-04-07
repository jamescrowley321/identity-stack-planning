You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

T140-T142 have no dependencies and run sequentially. T143 depends on all three. T144-T145 depend on T143. T146 depends on T144+T145. T147 depends on T146.

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T140 | fix/kid-absent-fallback | Fix `kid` absent fallback — use single JWKS key when JWT has no `kid` | pending |
| T141 | fix/userinfo-sub-mismatch | Add UserInfo `sub` mismatch validation — reject when `sub` differs from ID token | pending |
| T142 | feat/jwks-cache-ttl | JWKS cache TTL with forced refresh on signature failure (issue #219) | pending |
| T143 | feat/conformance-harness | Build OIDC conformance test harness — thin FastAPI RP + conformance suite | pending |
| T144 | test/conformance-basic-rp | Pass Basic RP conformance tests | pending |
| T145 | test/conformance-config-rp | Pass Config RP conformance tests | pending |
| T146 | fix/conformance-failures | Fix any conformance test failures from T144/T145 | pending |
| T147 | test/conformance-implicit-hybrid | Expand to Implicit + Hybrid RP profiles | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
2. The target repo is `py-identity-model` at `~/repos/auth/py-identity-model`
3. Read `~/repos/auth/py-identity-model/CLAUDE.md` for project-specific commands and patterns

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
     task_id: T14X
     branch: <branch from queue>
     worktree: /tmp/pim-T14X
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
3. Create worktree: `git worktree add /tmp/pim-T14X -b <branch> origin/main`
4. Verify: `cd /tmp/pim-T14X && git log --oneline -3`
5. **Set phase to `analyze`. End your response.**

---

### analyze (T140 — kid absent fallback)

`cd <worktree>`

1. Read `src/py_identity_model/core/parsers.py` — focus on `find_key_by_kid()`
2. Read `src/py_identity_model/core/jwt_helpers.py` — how kid is extracted and used
3. Read OIDC Core spec behavior: when JWT `kid` is absent and JWKS has a single key, the RP MUST use that key. When JWKS has multiple keys and no `kid`, it's an error.
4. Read existing unit tests for key lookup: `src/tests/unit/test_parsers.py` or similar
5. Plan:
   - Modify `find_key_by_kid()` to handle `kid is None`:
     - If JWKS has exactly 1 key → use it (log a warning)
     - If JWKS has multiple keys → raise `TokenValidationException` with clear message
   - Add unit tests for both cases
   - Add integration test verifying the fallback works
6. Write plan to task-state.md under `## Plan`
7. **Set phase to `implement`. End your response.**

---

### analyze (T141 — UserInfo sub mismatch)

`cd <worktree>`

1. Read `src/py_identity_model/core/userinfo_logic.py`
2. Read `src/py_identity_model/core/models.py` — UserInfoRequest/UserInfoResponse
3. Read `src/py_identity_model/sync/userinfo.py` and `src/py_identity_model/aio/userinfo.py`
4. Read existing UserInfo tests
5. The OIDC Core spec (Section 5.3.4) requires: "The sub Claim in the UserInfo Response MUST be verified to exactly match the sub Claim in the ID Token"
6. Plan:
   - Add optional `expected_sub` parameter to UserInfo request or response processing
   - After fetching UserInfo, compare `sub` claim against expected value
   - If mismatch, return error response (not exception — follow existing pattern)
   - Add unit tests for match, mismatch, and missing sub cases
   - Add integration test against node-oidc-provider
7. Write plan to task-state.md under `## Plan`
8. **Set phase to `implement`. End your response.**

---

### analyze (T142 — JWKS cache TTL)

`cd <worktree>`

1. Read current caching implementation:
   - `src/py_identity_model/sync/discovery.py` — `lru_cache` usage
   - `src/py_identity_model/sync/jwks.py` — how JWKS is cached
   - `src/py_identity_model/aio/discovery.py` — `alru_cache` usage
   - `src/py_identity_model/aio/jwks.py`
   - `src/py_identity_model/sync/token_validation.py` — how validation uses cached keys
2. Read issue #219 for requirements
3. Read `docs/oidc-certification-analysis.md` section 3.2 — key rotation conformance tests
4. Plan:
   - Add configurable TTL to JWKS cache (default: 24 hours)
   - On signature verification failure with cached keys, force JWKS re-fetch (one retry)
   - Implement for both sync and async paths
   - Add unit tests: TTL expiry triggers re-fetch, forced refresh on sig failure
   - Add integration test: rotate keys in fixture, verify library re-fetches
5. Write plan to task-state.md under `## Plan`
6. **Set phase to `implement`. End your response.**

---

### analyze (T143 — Conformance test harness)

`cd <worktree>`

1. Read `~/repos/auth/identity-stack-planning/docs/oidc-certification-analysis.md` — full gap analysis with architecture proposal
2. Read reference implementations:
   - Research `erlef/oidcc_conformance` structure (Elixir RP harness)
   - Research OpenID conformance suite API endpoints and test plan formats
3. Read existing FastAPI examples in `examples/fastapi/` for patterns
4. Plan the harness:
   - `conformance/app.py` — thin FastAPI RP:
     - `GET /` → redirect to authorize endpoint (discovered via py-identity-model)
     - `GET /callback` → exchange code for tokens using py-identity-model
     - `GET /userinfo` → fetch userinfo using py-identity-model
     - Store tokens in session for validation
     - All OIDC operations use py-identity-model (the whole point)
   - `conformance/docker-compose.yml`:
     - Conformance suite (from `gitlab.com/openid/conformance-suite`)
     - Our RP app
     - Shared network
   - `conformance/run_tests.py` — automation:
     - Create test plan via conformance suite REST API
     - Create + start test modules
     - Poll for completion
     - Collect results
     - Exit 0/1 based on pass/fail
   - `conformance/configs/basic-rp.json` — Basic RP test plan config
   - `conformance/configs/config-rp.json` — Config RP test plan config
   - `conformance/README.md` — setup and run instructions
5. Write plan to task-state.md under `## Plan`
6. **Set phase to `implement`. End your response.**

---

### analyze (T144 — Basic RP conformance)

`cd <worktree>`

1. Read conformance harness: `conformance/app.py`, `conformance/run_tests.py`
2. Read `~/repos/auth/identity-stack-planning/docs/oidc-certification-analysis.md` section 3.1 — Basic RP test matrix
3. Start the conformance suite locally: `docker compose -f conformance/docker-compose.yml up -d`
4. Run the Basic RP test plan: `python conformance/run_tests.py basic-rp`
5. Collect results — record which tests pass/fail
6. Write results to task-state.md under `## Plan` with failure analysis
7. **Set phase to `implement`. End your response.**

---

### analyze (T145 — Config RP conformance)

`cd <worktree>`

1. Same as T144 but for Config RP profile
2. Run: `python conformance/run_tests.py config-rp`
3. Key tests: discovery retrieval, JWKS retrieval, issuer mismatch detection, key rotation
4. Record results with failure analysis
5. **Set phase to `implement`. End your response.**

---

### analyze (T146 — Fix conformance failures)

`cd <worktree>`

1. Read failure results from T144 and T145 (check git log for committed results)
2. For each failure:
   - Read the conformance suite test log (via API or saved output)
   - Identify root cause in py-identity-model or the harness
   - Plan fix
3. Write fix plan to task-state.md
4. **Set phase to `implement`. End your response.**

---

### analyze (T147 — Implicit + Hybrid RP profiles)

`cd <worktree>`

1. Read `~/repos/auth/identity-stack-planning/docs/oidc-certification-analysis.md` sections 3.3 and 3.4
2. Key additional requirements:
   - `at_hash` validation (already in PyJWT via `verify_at_hash`)
   - `c_hash` validation (may need implementation)
   - Nonce enforcement in implicit/hybrid flows
3. Add test plan configs for Implicit RP and Hybrid RP
4. Run tests, collect results
5. Write plan for any fixes needed
6. **Set phase to `implement`. End your response.**

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
   git commit -m "<type>(<scope>): <description>"
   ```
6. **Set phase to `test`. End your response.**

---

### test

`cd <worktree>`

**For T140-T142 (code fixes):**
1. Run unit tests: `make test-unit`
2. Start node-oidc-provider: `docker compose -f test-fixtures/node-oidc-provider/docker-compose.yml up -d`
3. Run integration tests: `make test-integration-node-oidc`
4. Tear down fixture
5. Fix any failures, commit

**For T143 (conformance harness):**
1. Build and start: `docker compose -f conformance/docker-compose.yml up -d --build`
2. Verify the RP app is reachable
3. Verify the conformance suite UI is reachable
4. Run a smoke test: `python conformance/run_tests.py --smoke`
5. Tear down

**For T144-T147 (conformance tests):**
1. Start the conformance suite: `docker compose -f conformance/docker-compose.yml up -d`
2. Run the relevant test plan
3. Verify pass/fail results
4. Tear down
5. Run `make test-unit` to check for regressions

6. **Set phase to `review`. End your response.**

---

### review

`cd <worktree>`

1. Generate diff: `git diff origin/main...HEAD`
2. Review for:
   - **Security:** No secrets leaked. Test credentials are local-only.
   - **Correctness:** Code changes match OIDC Core spec requirements
   - **Coverage:** Each fix has unit + integration tests
   - **Conformance:** Harness correctly delegates all OIDC operations to py-identity-model
   - **Spec compliance:** kid fallback, sub check, cache TTL all follow spec language
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
     --title "<type>(<scope>): <description>" \
     --body "$(cat <<'PREOF'
   ## Summary
   <bullet points>

   ## Test plan
   - [x] Unit tests pass
   - [x] Integration tests pass against node-oidc-provider
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
2. Clean up: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-T14X --force`
3. Delete task-state.md
4. Output: <promise>TASK COMPLETE</promise>

---

## Rules

- Execute ONE phase per iteration, then end
- NEVER commit to main — always work on feature branches in worktrees
- All work after setup happens in the worktree
- Follow existing code patterns in py-identity-model
- Use conventional commits (Angular convention) — this repo uses semantic-release
- Always run `make lint` before committing
- Always run full test suite (`make test-unit` + `make test-integration-node-oidc`) before pushing
- If stuck 3+ iterations on same phase: set task to `blocked`, clean up, move on
- The conformance suite uses HTTPS locally — the RP app must handle TLS appropriately
