You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE story, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

Stories are executed sequentially. PRs are **chained** — each branches from the previous story's branch.

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 2.1 | #101 | epic2/story-2.1-permission-crud | main | pending |
| 2.2 | #102 | epic2/story-2.2-role-crud | epic2/story-2.1-permission-crud | pending |
| 2.3 | #103 | epic2/story-2.3-admin-ui | epic2/story-2.2-role-crud | pending |
| 2.4 | #104 | epic2/story-2.4-e2e-tests | epic2/story-2.3-admin-ui | pending |

## Step 1: Determine Context

1. Identify which repo: `git remote -v` — expect `descope-saas-starter`
2. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
3. Read `~/repos/auth/descope-saas-starter/CLAUDE.md` if it exists

## Step 2: Determine What To Do

Read `.claude/task-state.md` in the repo root.

- **Does not exist** → Pick up next story (Step 3)
- **phase is `complete`** → Update queue status in THIS file (replace `pending` with `done` for that row), delete `.claude/task-state.md`, pick up next story (Step 3)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Story

Find the first `pending` row in the Task Queue above whose dependencies are met (previous story is `done` or it's Story 2.1).

- If none eligible (all done) → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Read the GH issue for full context: `gh issue view <number> --repo jamescrowley321/descope-saas-starter`
  2. Read the epic stories for acceptance criteria: `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/epics.md` — find the `### Story 2.X` section
  3. Create `.claude/task-state.md`:
     ```
     story: 2.X
     issue: <number>
     branch: <branch from queue>
     base_branch: <base_branch from queue>
     phase: setup
     ```
  4. Execute the `setup` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from `.claude/task-state.md`. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

Phase order: setup → analyze → implement → test → pr → ci → complete

---

### setup

1. **Create branch from base:**
   ```
   git fetch origin
   git checkout -b <branch> origin/<base_branch>
   ```
   - For Story 2.1: base is `origin/main`
   - For Stories 2.2–2.4: base is the previous story's branch (it must be pushed already)
   - If the base branch doesn't exist on remote yet, the previous story isn't done — set task to `blocked` and end

2. Record starting state in `.claude/task-state.md`
3. **Set phase to `analyze`. End your response.**

---

### analyze

**Persona:** Read `~/repos/auth/auth-planning/_bmad/bmm/agents/dev.md` — adopt Amelia's mindset.

1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/descope-saas-starter`
2. Read acceptance criteria from `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/epics.md`
3. Read existing code that will be modified or extended:
   - `backend/app/services/descope.py` — DescopeManagementClient
   - `backend/app/routers/roles.py` — existing role endpoints
   - `backend/app/routers/permissions.py` — if it exists (created by Story 2.1)
   - `backend/app/dependencies/rbac.py` — require_role, require_permission
   - `frontend/src/pages/RoleManagement.tsx` — current UI (Story 2.3)
   - `backend/app/main.py` — router registration
4. Read existing patterns to follow:
   - `backend/app/routers/accesskeys.py` — CRUD router pattern, error handling, rate limiting
   - `backend/app/routers/users.py` — another CRUD pattern
5. Write implementation plan to `.claude/task-state.md` under `## Plan`:
   - List files to create/modify
   - List methods/endpoints to add
   - Note any edge cases from ACs
6. **Set phase to `implement`. End your response.**

---

### implement

**Persona:** Amelia (dev.md) — focused implementation mode.

1. Read `## Plan` from `.claude/task-state.md`
2. Implement the plan:
   - Follow existing code patterns exactly (see analysis phase)
   - All Descope API calls go through `DescopeManagementClient` (NFR-19)
   - Admin endpoints use `require_role("owner", "admin")`
   - Write endpoints use `@limiter.limit(RATE_LIMIT_AUTH)` with `request: Request` as first param
   - Error handling: `httpx.HTTPStatusError` → 502, `httpx.RequestError` → 502
   - Register new routers in `main.py` if creating new files
3. Run lint: `make lint` (from repo root)
4. Fix any lint issues
5. Commit with descriptive message referencing the issue:
   ```
   git add <specific files>
   git commit -m "feat: <description>

   Closes #<issue>"
   ```
6. **Set phase to `test`. End your response.**

---

### test

**Persona:** Read `~/repos/auth/auth-planning/_bmad/bmm/agents/qa.md` — adopt Quinn's mindset.

1. Write unit tests for new code:
   - Client methods: mock httpx responses, verify request bodies and paths
   - Router endpoints: use FastAPI TestClient, mock DescopeManagementClient
   - Test auth enforcement (403 for non-admin)
   - Test error handling (Descope API errors → appropriate HTTP errors)
   - Follow existing test patterns in `backend/tests/`
2. Run tests: `make test-unit` (from repo root)
3. If failures: fix and re-run until green
4. Run lint again: `make lint`
5. Commit tests:
   ```
   git add <test files>
   git commit -m "test: add tests for <description>"
   ```
6. **Set phase to `pr`. End your response.**

---

### pr

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
     --body "## Summary
   <bullet points of what was implemented>

   ## Story
   Closes #<issue>
   Part of Epic 2: Role & Permission Administration

   ## Chained PR
   <For 2.2+: Based on #<previous PR number>>

   ## Test plan
   - [ ] Unit tests pass
   - [ ] Lint passes
   - [ ] Manual verification against Descope sandbox (if available)

   🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
     --repo jamescrowley321/descope-saas-starter
   ```

3. Record PR number in `.claude/task-state.md` under `## PR`
4. **Set phase to `ci`. End your response.**

---

### ci

1. **Wait for CI:**
   - `gh pr checks <pr_number> --repo jamescrowley321/descope-saas-starter --watch --fail-fast`
   - If timeout, poll up to 3 times with 30s sleep

2. **Evaluate:**
   - **All pass** → **set phase to `complete`. End your response.**
   - **Fail** → read failure details:
     - `gh run list --branch <branch> --repo jamescrowley321/descope-saas-starter --limit 1`
     - `gh run view <run_id> --repo jamescrowley321/descope-saas-starter --log-failed`
   - Write details to `## CI` in state file
   - **Set phase to `ci-fix`. End your response.**

3. **No CI** (no checks configured after 60s) → **set phase to `complete`. End your response.**

---

### ci-fix

1. Read `## CI` from `.claude/task-state.md`
2. Diagnose and fix the failure
3. Run local lint/tests
4. Commit and push: `git push origin <branch>`
5. **Set phase to `ci`. End your response.**

---

### complete

1. Update task queue: replace `pending` with `done` for this story's row in this file
2. Delete `.claude/task-state.md`
3. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — do NOT chain phases
- NEVER output a promise unless a task just completed or no tasks remain
- NEVER skip phases
- NEVER commit to main — always work on feature branches
- All work happens in the repo working directory (worktree)
- PRs are chained: each story branches from the previous story's branch
- Always read ~/repos/auth/CLAUDE.md for repo commands
- Follow existing code patterns — do not invent new conventions
- **Git operations:** Use `gh` CLI for GitHub operations (PRs, issues, checks). Use `git` for push/pull/fetch.
- If stuck multiple iterations on same phase: set task to `blocked`, delete state file, pick up next
- **Scope discipline:** Only implement what the story specifies — no refactoring, no future-proofing, no extras
