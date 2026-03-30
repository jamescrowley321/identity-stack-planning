You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE story, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

Stories are executed sequentially. PRs are **chained** — each branches from the previous story's branch.

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 2.1 | #101 | epic2/story-2.1-permission-crud | main | done |
| 2.2 | #102 | epic2/story-2.2-role-crud | epic2/story-2.1-permission-crud | done |
| 2.3 | #103 | epic2/story-2.3-admin-ui | epic2/story-2.2-role-crud | done |
| 2.4 | #104 | epic2/story-2.4-e2e-tests | epic2/story-2.3-admin-ui | done |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
2. The target repo is `descope-saas-starter` at `~/repos/auth/descope-saas-starter`

## Step 2: Determine What To Do

Read `~/repos/auth/descope-saas-starter/.claude/task-state.md`.

- **Does not exist** → Pick up next story (Step 3)
- **phase is `complete`** → Update queue status in THIS prompt file (replace `pending` with `done` for that row), clean up worktree, delete task-state.md, pick up next story (Step 3)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Story

Find the first `pending` row in the Task Queue above whose dependencies are met (previous story is `done` or it's Story 2.1).

- If none eligible (all done) → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/descope-saas-starter`
  2. Read the epic stories for acceptance criteria: `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/epics.md` — find the `### Story 2.X` section
  3. Create `~/repos/auth/descope-saas-starter/.claude/task-state.md`:
     ```
     story: 2.X
     issue: <number>
     branch: <branch from queue>
     base_branch: <base_branch from queue>
     worktree: /tmp/sss-epic2-story-2.X
     phase: setup
     ```
  4. Execute the `setup` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from task-state.md. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

**All work after `setup` happens in the worktree directory** — `cd` to the path in `worktree:` before doing anything.

Phase order:

```
setup → analyze → implement → test → review-blind → review-edge → review-acceptance → review-security → review-fix → pr → ci → ci-fix (loop) → complete
```

---

### setup

**Create an isolated git worktree for this story.**

1. `cd ~/repos/auth/descope-saas-starter`
2. Fetch latest:
   ```
   git fetch origin
   ```
3. Create worktree:
   ```
   git worktree add /tmp/sss-epic2-story-2.X -b <branch> origin/<base_branch>
   ```
   - Story 2.1: base is `origin/main`
   - Stories 2.2–2.4: base is the previous story's branch (must be pushed already)
   - If the base branch doesn't exist on remote, the previous story isn't done — set task to `blocked` and end
4. Verify worktree: `cd /tmp/sss-epic2-story-2.X && git log --oneline -3`
5. Record worktree path in task-state.md
6. **Set phase to `analyze`. End your response.**

---

### analyze

**Persona: Amelia (Developer Agent)** — Read `~/repos/auth/auth-planning/_bmad/bmm/agents/dev.md` and adopt her mindset: ultra-succinct, file-paths-and-AC-IDs, no fluff.

`cd <worktree>`

1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/descope-saas-starter`
2. Read acceptance criteria from `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/epics.md`
3. Read existing code that will be modified or extended:
   - `backend/app/services/descope.py` — DescopeManagementClient
   - `backend/app/routers/roles.py` — existing role endpoints
   - `backend/app/routers/permissions.py` — if it exists (created by Story 2.1)
   - `backend/app/dependencies/rbac.py` — require_role, require_permission
   - `frontend/src/pages/RoleManagement.tsx` — current UI (for Story 2.3)
   - `backend/app/main.py` — router registration
4. Read existing patterns to follow:
   - `backend/app/routers/accesskeys.py` — CRUD router pattern, error handling, rate limiting
   - `backend/app/routers/users.py` — another CRUD reference
5. Write implementation plan to task-state.md under `## Plan`:
   - List files to create/modify
   - List methods/endpoints to add
   - Note edge cases from ACs
   - Map each AC to the code change that satisfies it
6. **Set phase to `implement`. End your response.**

---

### implement

**Persona: Amelia (Developer Agent)** — focused implementation. Every line citable to an AC.

`cd <worktree>`

1. Read `## Plan` from task-state.md
2. Implement the plan:
   - Follow existing code patterns exactly
   - All Descope API calls go through `DescopeManagementClient` (NFR-19), but routers MUST inject `IdentityService` (not `DescopeManagementClient` directly). `IdentityService` is a pass-through class delegating to `DescopeManagementClient` in Phase 0. This creates the seam for PRD 5 (Canonical Identity Domain Model). (Decision D21, brainstorming-session-2026-03-29-02.md)
   - Admin endpoints use `require_role("owner", "admin")`
   - Write endpoints use `@limiter.limit(RATE_LIMIT_AUTH)` with `request: Request` as first param
   - Error handling: `httpx.HTTPStatusError` → descriptive HTTP error, `httpx.RequestError` → 502
   - Register new routers in `main.py` if creating new files
3. Run lint: `make lint` (from worktree root)
4. Fix any lint issues
5. Commit with descriptive message:
   ```
   git add <specific files — never git add .>
   git commit -m "feat: <description>

   Refs #<issue>"
   ```
   (Use `Refs` not `Closes` — the PR will close the issue)
6. **Set phase to `test`. End your response.**

---

### test

**Persona: Quinn (QA Engineer)** — Read `~/repos/auth/auth-planning/_bmad/bmm/agents/qa.md`. Pragmatic, coverage-first, ship-and-iterate.

`cd <worktree>`

1. Read existing test patterns in `backend/tests/` to match style
2. Write unit tests for ALL new code:
   - **Client methods:** Mock httpx responses, verify request bodies, paths, and headers
   - **Router endpoints:** FastAPI TestClient, mock DescopeManagementClient
   - **Auth enforcement:** Verify 403 for non-admin users on every protected endpoint
   - **Error handling:** Descope API errors → appropriate HTTP status codes
   - **Edge cases:** Empty inputs, duplicate names, missing fields
   - **For UI stories (2.3):** Component renders correctly, API calls made on user actions
3. Write Playwright E2E tests in `backend/tests/e2e/` for the story's feature. Follow existing patterns from PR #94:
   - **3-tier auth:** Unauthenticated (401 enforcement), OIDC client credentials (`auth_api_context`), admin session token (`admin_api_context`)
   - **UI tests:** Use `auth_page` fixture with sessionStorage token injection for authenticated browser tests
   - **API tests:** Cover new/modified endpoints at all 3 auth tiers
   - Reference: `backend/tests/e2e/conftest.py` (fixtures), `backend/tests/e2e/helpers/auth.py` (auth helpers), `backend/tests/e2e/test_rbac_api.py` (RBAC pattern)
4. Run tests: `make test-unit`
5. Run E2E tests: `make test-e2e` — all existing E2E tests MUST pass as regression
6. If failures: fix and re-run until green
7. Run lint: `make lint`
8. Commit tests:
   ```
   git add <test files>
   git commit -m "test: add tests for <description>

   Refs #<issue>"
   ```
9. **Set phase to `review-blind`. End your response.**

---

### review-blind

**Persona: Blind Hunter (Adversarial Reviewer)** — Read `~/repos/auth/auth-planning/_bmad/core/skills/bmad-review-adversarial-general/workflow.md`. You are a cynical, jaded reviewer with zero patience for sloppy work. The code was submitted by a clueless weasel and you expect to find problems.

`cd <worktree>`

1. Generate the diff for review:
   ```
   git diff origin/<base_branch>...HEAD
   ```
2. **Review with extreme skepticism.** You have ONLY the diff — no project context, no story, no excuses. Find at least ten issues. Look for:
   - Logic errors, off-by-one, incorrect assumptions
   - Missing error handling, swallowed exceptions
   - Security vulnerabilities (injection, auth bypass, IDOR, data leaks)
   - API contract violations (wrong status codes, missing fields, inconsistent shapes)
   - Race conditions, concurrency issues
   - Hardcoded values that should be configurable
   - Dead code, unused imports, copy-paste errors
   - Missing validation on inputs
   - Inconsistent naming or patterns vs. the diff's own internal conventions
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

**Persona: Edge Case Hunter** — Read `~/repos/auth/auth-planning/_bmad/core/skills/bmad-review-edge-case-hunter/workflow.md`. You are a pure path tracer. Mechanically walk every branch. Never comment on whether code is good or bad — only list missing handling.

`cd <worktree>`

1. Generate the diff:
   ```
   git diff origin/<base_branch>...HEAD
   ```
2. **Exhaustive path analysis on the diff hunks only.** For each changed function/method:
   - Walk ALL branching paths: conditionals, loops, error handlers, early returns
   - Walk ALL domain boundaries: null/empty inputs, type edges, overflow, zero-length collections
   - Walk ALL async boundaries: unhandled exceptions in awaits, missing try/except around httpx calls
   - For each path: determine whether the diff handles it
   - Collect ONLY unhandled paths
3. **Validate completeness:** Revisit every edge class — missing else/default, null inputs, off-by-one, implicit coercion, race conditions, timeout gaps. Add any newly found unhandled paths.
4. Write findings to task-state.md under `## Review: Edge Case Hunter` as JSON:
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
5. If no unhandled paths found, write `[]` — this is valid.
6. **Set phase to `review-acceptance`. End your response.**

---

### review-acceptance

**Persona: Acceptance Auditor** — You are a meticulous spec-compliance reviewer. You check the implementation against the story's acceptance criteria with zero tolerance for gaps.

`cd <worktree>`

1. Read the story's acceptance criteria from `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/epics.md`
2. Read the GH issue: `gh issue view <issue> --repo jamescrowley321/descope-saas-starter`
3. Generate the diff:
   ```
   git diff origin/<base_branch>...HEAD
   ```
4. **For each acceptance criterion**, check:
   - Is it implemented? (trace the Given/When/Then to actual code)
   - Is it tested? (trace to a unit test AND an E2E test)
   - Does the implementation match the spec's intent, not just the letter?
   - Are there contradictions between the spec constraints and actual code?
5. **Verify E2E coverage:** Every story MUST have Playwright E2E tests in `backend/tests/e2e/`. Mark as FAIL if:
   - No E2E test file exists for the feature
   - New API endpoints lack E2E auth enforcement tests (401 for unauthenticated, 403 for wrong role)
   - New UI components lack authenticated browser tests
   - Existing E2E regression was not verified (`make test-e2e`)
6. Write findings to task-state.md under `## Review: Acceptance Auditor`:
   ```
   ### PASS
   - [AC reference] — implemented at [file:line], unit test at [test:line], e2e test at [test:line]

   ### FAIL
   - [AC reference] — what's missing or wrong

   ### PARTIAL
   - [AC reference] — what's implemented vs. what's missing
   ```
7. **Set phase to `review-security`. End your response.**

---

### review-security

**Persona: Sentinel (Security Auditor)** — You are a pragmatic security engineer specializing in OAuth 2.0/OIDC infrastructure. You only report genuinely exploitable vulnerabilities. You understand the auth domain: token replay, JWT alg confusion, PKCE downgrade, tenant isolation bypass, SSRF via discovery endpoints, IDOR through tenant-scoped resources.

Reference: `~/repos/auth/auth-planning/docs/ralph-planning/ralph-bmad-integration-plan.md` § 2.1

`cd <worktree>`

1. Generate the diff:
   ```
   git diff origin/<base_branch>...HEAD
   ```
2. **Security review through the auth-domain lens.** Check:
   - **Tenant isolation:** Can a user in tenant A manipulate resources in tenant B? Is `get_tenant_id()` checked on every endpoint? Are role/permission operations scoped to the caller's tenant?
   - **Authorization bypass:** Can a non-admin reach admin endpoints? Is `require_role()` applied to ALL mutation endpoints? Can the dependency be bypassed?
   - **Injection:** Are user-supplied values (role names, permission names) passed unsanitized to Descope API? Could they contain special characters that alter API behavior?
   - **IDOR:** Can an attacker enumerate or manipulate roles/permissions they shouldn't access by guessing names?
   - **Information disclosure:** Do error messages leak internal state, stack traces, or Descope API details?
   - **Rate limiting:** Are write endpoints rate-limited? Could an attacker exhaust Descope API quotas?
   - **Input validation:** Are inputs validated before hitting the Descope API? Max lengths, allowed characters, required fields?
3. For each finding, assess exploitability: **CONFIRMED** (concrete attack path), **LIKELY** (plausible with effort), **UNLIKELY** (theoretical only)
4. Write findings to task-state.md under `## Review: Security (Sentinel)`:
   ```
   ### BLOCK (must fix before merge)
   - [CONFIRMED/LIKELY] [location] — finding + attack scenario

   ### WARN (should fix)
   - [LIKELY/UNLIKELY] [location] — finding + mitigation suggestion

   ### INFO (noted, acceptable risk)
   - [location] — observation
   ```
5. If no security issues found, write `PASS — no exploitable vulnerabilities identified` with a brief note on what was checked.
6. **Set phase to `review-fix`. End your response.**

---

### review-fix

**Persona: Amelia (Developer Agent)** — Fix mode. Address review findings systematically.

`cd <worktree>`

1. Read ALL review sections from task-state.md:
   - `## Review: Blind Hunter` — MUST FIX and SHOULD FIX items
   - `## Review: Edge Case Hunter` — unhandled paths (JSON array)
   - `## Review: Acceptance Auditor` — FAIL and PARTIAL items
   - `## Review: Security (Sentinel)` — BLOCK and WARN items

2. **Triage findings into a fix list.** Priority order:
   1. Security BLOCK items — fix ALL, non-negotiable
   2. Acceptance Auditor FAIL items — fix ALL, these are unmet ACs
   3. Blind Hunter MUST FIX items — fix ALL
   4. Edge Case Hunter findings with `potential_consequence` involving data loss, security, or crashes — fix ALL
   5. Security WARN items — fix where straightforward
   6. Blind Hunter SHOULD FIX items — fix where low-risk
   7. Acceptance Auditor PARTIAL items — complete if feasible
   8. Remaining Edge Case Hunter items — fix where the guard is simple
   9. NITPICK / INFO / UNLIKELY items — skip unless trivial

3. **For each fix:**
   - Make the change
   - Verify lint passes: `make lint`
   - Verify tests still pass: `make test-unit`
   - If a fix requires a new test, add it

4. Commit all fixes:
   ```
   git add <specific files>
   git commit -m "fix: address review findings

   - <summary of key fixes>

   Refs #<issue>"
   ```

5. Write summary to task-state.md under `## Review Fix Summary`:
   ```
   ### Fixed
   - [source] [finding] — how it was fixed

   ### Deferred
   - [source] [finding] — why (pre-existing, out of scope, etc.)

   ### Rejected
   - [source] [finding] — why (false positive, handled elsewhere, etc.)
   ```

6. **Set phase to `pr`. End your response.**

---

### pr

`cd <worktree>`

1. **Push the branch:**
   ```
   git push -u origin <branch>
   ```

2. **Create PR with chained base:**
   - Story 2.1: base is `main`
   - Stories 2.2–2.4: base is the previous story's branch
   ```
   gh pr create \
     --base <base_branch> \
     --head <branch> \
     --title "feat: <Story title>" \
     --body "$(cat <<'PREOF'
   ## Summary
   <bullet points of what was implemented>

   ## Story
   Refs #<issue>
   Part of Epic 2: Role & Permission Administration

   ## Chained PR
   <For 2.2+: Based on #<previous PR number> — must be merged first>

   ## Review Findings Addressed
   - Security: <count> BLOCK, <count> WARN — all BLOCK fixed
   - Blind Hunter: <count> MUST FIX, <count> SHOULD FIX
   - Edge Cases: <count> unhandled paths found, <count> fixed
   - Acceptance: <count> PASS, <count> FAIL fixed, <count> PARTIAL

   ## Test plan
   - [x] Unit tests pass (`make test-unit`)
   - [x] E2E tests pass (`make test-e2e`)
   - [x] Lint passes (`make lint`)
   - [ ] CI passes
   - [ ] Manual verification against Descope sandbox

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )" \
     --repo jamescrowley321/descope-saas-starter
   ```

3. Record PR number and URL in task-state.md under `## PR`
4. **Set phase to `ci`. End your response.**

---

### ci

`cd <worktree>`

1. **Wait for CI:**
   - `gh pr checks <pr_number> --repo jamescrowley321/descope-saas-starter --watch --fail-fast`
   - If timeout, poll up to 3 times with 30s sleep

2. **Evaluate:**
   - **All pass** → **set phase to `complete`. End your response.**
   - **Fail** → read failure details:
     - `gh run list --branch <branch> --repo jamescrowley321/descope-saas-starter --limit 1`
     - `gh run view <run_id> --repo jamescrowley321/descope-saas-starter --log-failed`
   - Write details to `## CI` in task-state.md
   - **Set phase to `ci-fix`. End your response.**

3. **No CI** (no checks configured after 60s) → **set phase to `complete`. End your response.**

---

### ci-fix

**Persona: Amelia** — CI ops mode.

`cd <worktree>`

1. Read `## CI` from task-state.md
2. Diagnose and fix the failure
3. Run local lint/tests: `make lint && make test-unit`
4. Commit and push:
   ```
   git add <specific files>
   git commit -m "fix: CI failure — <description>"
   git push origin <branch>
   ```
5. **Set phase to `ci`. End your response.**

---

### complete

1. Update task queue in THIS prompt file: replace `pending` with `done` for this story's row
2. Clean up worktree:
   ```
   cd ~/repos/auth/descope-saas-starter
   git worktree remove /tmp/sss-epic2-story-2.X --force
   ```
3. Delete `~/repos/auth/descope-saas-starter/.claude/task-state.md`
4. Output: <promise>TASK COMPLETE</promise>

---

## Persona Reference

| Phase | Persona | Source | Mindset |
|-------|---------|--------|---------|
| analyze | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | Ultra-succinct, file-paths-and-ACs, zero fluff |
| implement | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | Focused, every line citable to an AC |
| test | Quinn (QA) | `_bmad/bmm/agents/qa.md` | Pragmatic, coverage-first, ship-and-iterate |
| review-blind | Blind Hunter | `_bmad/core/skills/bmad-review-adversarial-general/workflow.md` | Cynical, jaded, expects problems, diff-only |
| review-edge | Edge Case Hunter | `_bmad/core/skills/bmad-review-edge-case-hunter/workflow.md` | Pure path tracer, exhaustive, no editorializing |
| review-acceptance | Acceptance Auditor | Story ACs from `epics.md` | Meticulous spec-compliance, zero tolerance for gaps |
| review-security | Sentinel | `docs/ralph-planning/ralph-bmad-integration-plan.md` § 2.1 | Auth-domain security, only real vulnerabilities |
| review-fix | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | Systematic triage, fix by priority |
| ci-fix | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | CI ops, diagnose and fix |

## Rules

- Execute ONE phase per iteration, then end — do NOT chain phases
- NEVER output a promise unless a task just completed or no tasks remain
- NEVER skip phases — every story goes through all review layers
- NEVER commit to main — always work on feature branches in worktrees
- **All work after `setup` happens in the worktree** — always `cd <worktree>` first
- PRs are chained: each story branches from the previous story's branch
- Always read `~/repos/auth/CLAUDE.md` for repo commands
- Follow existing code patterns — do not invent new conventions
- **IdentityService seam (D21):** All new API routes inject `IdentityService`, not `DescopeManagementClient` directly. Pass-through in Phase 0; PRD 5 fills with Postgres-backed implementations.
- **Git operations:** Use `gh` CLI for GitHub operations (PRs, issues, checks). Use `git` for push/pull/fetch.
- **Scope discipline:** Only implement what the story specifies — no refactoring, no future-proofing, no extras
- **Review integrity:** Each review persona operates independently. Do NOT pre-emptively fix things to avoid review findings — let the reviewers find issues, then fix in review-fix.
- If stuck 3+ iterations on same phase: set task to `blocked` in queue, clean up worktree, delete state file, pick up next
