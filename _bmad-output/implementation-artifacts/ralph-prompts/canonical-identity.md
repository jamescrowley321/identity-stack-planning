You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE story, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

Stories are executed sequentially. PRs are **chained** — each branches from the previous story's branch.

### Epic 1: Canonical Identity Foundation

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 1.1 | #138 | canonical/story-1.1-docker-postgres-engine | main | pending |
| 1.2 | #139 | canonical/story-1.2-alembic-schema | canonical/story-1.1-docker-postgres-engine | pending |
| 1.3 | #140 | canonical/story-1.3-error-model-result-types | canonical/story-1.2-alembic-schema | pending |
| 1.4 | #141 | canonical/story-1.4-otel-aspire | canonical/story-1.3-error-model-result-types | pending |
| 1.5 | #142 | canonical/story-1.5-service-interfaces-test-infra | canonical/story-1.4-otel-aspire | pending |
| 1.6 | #143 | canonical/story-1.6-seed-migration | canonical/story-1.5-service-interfaces-test-infra | pending |

### Epic 2: Identity & Access Administration

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 2.1 | #144 | canonical/story-2.1-user-service-sync | canonical/story-1.6-seed-migration | pending |
| 2.2 | #145 | canonical/story-2.2-role-permission-tenant-service | canonical/story-2.1-user-service-sync | pending |
| 2.3 | #146 | canonical/story-2.3-router-rewire | canonical/story-2.2-role-permission-tenant-service | pending |
| 2.4 | #147 | canonical/story-2.4-unit-integration-tests | canonical/story-2.3-router-rewire | pending |
| 2.5 | #148 | canonical/story-2.5-e2e-tests-regression | canonical/story-2.4-unit-integration-tests | pending |

### Epic 3: Inbound Sync & Reconciliation

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 3.1 | #149 | canonical/story-3.1-flow-connector-webhook | canonical/story-2.5-e2e-tests-regression | pending |
| 3.2 | #150 | canonical/story-3.2-reconciliation-job | canonical/story-3.1-flow-connector-webhook | pending |
| 3.3 | #151 | canonical/story-3.3-redis-pubsub | canonical/story-3.2-reconciliation-job | pending |
| 3.4 | #152 | canonical/story-3.4-inbound-sync-tests | canonical/story-3.3-redis-pubsub | pending |

### Epic 4: Multi-IdP Identity Linking

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 4.1 | #153 | canonical/story-4.1-idp-link-provider-service | canonical/story-3.4-inbound-sync-tests | pending |
| 4.2 | #154 | canonical/story-4.2-link-provider-routers | canonical/story-4.1-idp-link-provider-service | pending |
| 4.3 | #155 | canonical/story-4.3-identity-resolution-redis-cache | canonical/story-4.2-link-provider-routers | pending |
| 4.4 | #156 | canonical/story-4.4-multi-idp-tests | canonical/story-4.3-identity-resolution-redis-cache | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
2. The target repo is `identity-stack` at `~/repos/auth/identity-stack`
3. Read `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/architecture-canonical-identity.md` for architectural decisions, implementation patterns, and enforcement guidelines

## Step 2: Determine What To Do

Read `~/repos/auth/identity-stack/.claude/task-state.md`.

- **Does not exist** → Pick up next story (Step 3)
- **phase is `complete`** → Update queue status in THIS prompt file (replace `pending` with `done` for that row), clean up worktree, delete task-state.md, pick up next story (Step 3)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Story

Find the first `pending` row in the Task Queue above whose dependencies are met (previous story is `done` or it's Story 1.1).

- If none eligible (all done) → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/identity-stack`
  2. Read the acceptance criteria from the GH issue body
  3. Create `~/repos/auth/identity-stack/.claude/task-state.md`:
     ```
     story: <story number>
     issue: <number>
     branch: <branch from queue>
     base_branch: <base_branch from queue>
     worktree: /tmp/sss-canonical-story-<story number>
     phase: setup
     ```
  4. Execute the `setup` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from task-state.md. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

**All work after `setup` happens in the worktree directory** — `cd` to the path in `worktree:` before doing anything.

Phase order:

```
setup → analyze → anchor → implement → test → review → review-fix → pr → ci → ci-fix (loop) → complete
```

---

### setup

**Create an isolated git worktree for this story.**

1. `cd ~/repos/auth/identity-stack`
2. Fetch latest:
   ```
   git fetch origin
   ```
3. Create worktree:
   ```
   git worktree add /tmp/sss-canonical-story-<N.M> -b <branch> origin/<base_branch>
   ```
   - Story 1.1: base is `origin/main`
   - All others: base is the previous story's branch (must be pushed already)
   - If the base branch doesn't exist on remote, the previous story isn't done — set task to `blocked` and end
4. Verify worktree: `cd /tmp/sss-canonical-story-<N.M> && git log --oneline -3`
5. Record worktree path in task-state.md
6. **Set phase to `analyze`. End your response.**

---

### analyze

**Persona: Amelia (Developer Agent)** — Read `~/repos/auth/identity-stack-planning/_bmad/bmm/agents/dev.md` and adopt her mindset: ultra-succinct, file-paths-and-AC-IDs, no fluff.

`cd <worktree>`

1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/identity-stack`
2. Read the architecture doc: `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/architecture-canonical-identity.md` (implementation patterns, enforcement guidelines, module structure)
3. **Read EVERY file that will be modified or extended** — not just list them, actually `cat -n` each one:
   - `backend/app/services/descope.py` — DescopeManagementClient (becomes sync adapter data source)
   - `backend/app/routers/roles.py`, `permissions.py`, `users.py` — existing CRUD patterns to follow
   - `backend/app/dependencies/rbac.py` — require_role pattern
   - `backend/app/main.py` — router registration, middleware, lifespan
   - `backend/app/models/` — existing SQLModel patterns
   - `docker-compose.yml` — existing service configuration
   - Any additional files the story touches
4. Write implementation plan to task-state.md under `## Plan`:
   - List files to create/modify **with current line counts**
   - List functions/classes/imports that exist in each file (from step 3)
   - List methods/endpoints to add
   - Note edge cases from ACs
   - Map each AC to the code change that satisfies it
5. **Set phase to `anchor`. End your response.**

---

### anchor

**Codebase anchoring — verify the plan matches reality before implementing.**

`cd <worktree>`

1. Record the current HEAD SHA:
   ```
   git rev-parse HEAD
   ```
   Write to task-state.md under `## Anchor`.

2. For every file listed in `## Plan`, read the actual file and record a snapshot:
   ```
   ## Anchor: File Snapshots

   ### <file_path> (N lines)
   First 5 lines:
   <lines 1-5>
   Last 5 lines:
   <lines N-4 to N>
   ```
   For new files (to be created), record: `NEW FILE — does not exist yet`

3. **Cross-reference the plan against reality.** For each file the plan modifies:
   - Does every function/class/import referenced in the plan actually exist in the file?
   - Are the line numbers roughly correct?
   - Does the file structure match what the plan assumes?

4. **If any mismatch is found** (plan references functions, classes, or imports that don't exist):
   - Log the mismatch under `## Anchor: Mismatches`
   - **Set phase back to `analyze`. End your response.** (forces re-analysis)

5. If all files match: **Set phase to `implement`. End your response.**

---

### implement

**Persona: Amelia (Developer Agent)** — focused implementation. Every line citable to an AC.

`cd <worktree>`

1. Read `## Plan` AND `## Anchor: File Snapshots` from task-state.md
2. **Cross-reference anchor snapshots** — before modifying a file, verify it still matches the snapshot (hasn't been changed by another process)
3. Implement the plan:
   - Follow existing code patterns exactly
   - **Enforcement guidelines from architecture doc (ALL mandatory):**
     1. Use `AsyncSession` — never `Session`. No sync database access anywhere.
     2. Return `Result[T, E]` from service methods — never `raise` for domain errors.
     3. Use `result_to_response()` in routers — never construct ProblemDetailResponse manually.
     4. Pass `tenant_id` explicitly to every tenant-scoped method.
     5. Add OTel spans with domain attributes on every IdentityService method.
     6. Use Alembic for ALL schema changes — never `create_all()` or raw DDL.
     7. Write tests against real Postgres via testcontainers — never mock the database.
     8. Use NoOpSyncAdapter in service tests — never mock adapter methods individually.
     9. Follow existing router patterns (rate limiting, role enforcement) unchanged.
     10. Keep FGA/access key routes on DescopeManagementClient — do not route through IdentityService.
     11. Run `make lint` before every commit.
   - Admin endpoints use `require_role("owner", "admin")`
   - Write endpoints use `@limiter.limit(RATE_LIMIT_AUTH)` with `request: Request` as first param
   - Error handling: `httpx.HTTPStatusError` → SyncError, `httpx.RequestError` → SyncError
   - Register new routers in `main.py` if creating new files
4. Run lint: `make lint` (from worktree root)
5. Fix any lint issues
6. Commit with descriptive message:
   ```
   git add <specific files — never git add .>
   git commit -m "feat: <description>

   Refs #<issue>"
   ```
   (Use `Refs` not `Closes` — the PR will close the issue)
7. **Set phase to `test`. End your response.**

---

### test

**Persona: Quinn (QA Engineer)** — Read `~/repos/auth/identity-stack-planning/_bmad/bmm/agents/qa.md`. Pragmatic, coverage-first, ship-and-iterate.

`cd <worktree>`

1. Read existing test patterns in `backend/tests/` to match style
2. Write unit tests for ALL new code:
   - **Service methods:** NoOpSyncAdapter for service tests, verify Result types
   - **Sync adapter:** Mock httpx responses, verify request bodies/paths
   - **Router endpoints:** FastAPI TestClient, mock IdentityService
   - **Auth enforcement:** 403 for non-admin on every protected endpoint
   - **Error handling:** Verify RFC 9457 Problem Detail responses
   - **Edge cases:** Empty inputs, missing fields, duplicate names, cross-tenant access
   - **Tenant isolation:** Queries with tenant A don't return tenant B data
3. Write Playwright E2E tests in `backend/tests/e2e/` for the story's feature. Follow patterns from PR #94:
   - **3-tier auth:** Unauthenticated (401), OIDC client credentials (`auth_api_context`), admin session token (`admin_api_context`)
   - **UI tests:** Use `auth_page` fixture with sessionStorage token injection
   - **API tests:** Cover new/modified endpoints at all 3 auth tiers
   - Reference: `backend/tests/e2e/conftest.py`, `backend/tests/e2e/helpers/auth.py`, `backend/tests/e2e/test_rbac_api.py`
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
9. **Set phase to `review`. End your response.**

---

### review

**Spawn independent review subagents.** Each reviewer runs in a fresh context with NO access to the implementation plan or task-state.md.

`cd <worktree>`

1. **Generate the diff and save to disk:**
   ```bash
   git diff origin/<base_branch>...HEAD > .claude/review-diff.patch
   ```

2. **Read the review agent templates** from:
   `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`

3. **Spawn 4 independent review subagents** using the Claude Code `Agent` tool. Each agent receives ONLY what's listed — **never** task-state.md, never the plan, never implementation notes.

   **Blind Hunter** — `Agent` call with prompt:
   - Include full contents of `review-agents/blind-hunter.md`
   - Include: "Read the diff from `<worktree>/.claude/review-diff.patch`"
   - Include: "Write findings to `<worktree>/.claude/review-blind.md`"
   - Receives: diff only. No spec, no project context, no codebase access.

   **Edge Case Hunter** — `Agent` call with prompt:
   - Include full contents of `review-agents/edge-case-hunter.md`
   - Include: "Read the diff from `<worktree>/.claude/review-diff.patch`"
   - Include: "The codebase is at `<worktree>/` — read any file you need for context"
   - Include: "Write findings to `<worktree>/.claude/review-edge.md`"
   - Receives: diff + full codebase read access.

   **Acceptance Auditor** — `Agent` call with prompt:
   - Include full contents of `review-agents/acceptance-auditor.md`
   - Include: "Read the diff from `<worktree>/.claude/review-diff.patch`"
   - Include: "The spec: `gh issue view <issue> --repo jamescrowley321/identity-stack`"
   - Include: "Architecture doc: `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/architecture-canonical-identity.md`"
   - Include: "The codebase is at `<worktree>/`"
   - Include: "Write findings to `<worktree>/.claude/review-acceptance.md`"
   - Receives: diff + spec + architecture doc + codebase.

   **Sentinel** — `Agent` call with prompt:
   - Include full contents of `review-agents/sentinel.md`
   - Include: "Read the diff from `<worktree>/.claude/review-diff.patch`"
   - Include: "The codebase is at `<worktree>/` — read any file you need"
   - Include: "Write findings to `<worktree>/.claude/review-security.md`"
   - Receives: diff + full codebase read access.

   Launch all 4 agents in parallel (multiple Agent calls in one response).

4. **Conditional: Red Team (Viper)** — after the 4 agents complete, check if any changed file matches:
   ```
   middleware/* | dependencies/rbac.py | dependencies/auth.py | routers/auth.py |
   **/token* | **/jwt* | **/oidc* | docker-compose* | tyk/*
   ```
   If yes: spawn a 5th `Agent` with `review-agents/viper.md`, the diff, and full codebase access.
   Write findings to `<worktree>/.claude/review-redteam.md`.
   If no: skip.

5. **Verify all review files were written** — read each `.claude/review-*.md` file to confirm they exist and are non-empty.

6. **Set phase to `review-fix`. End your response.**

---

### review-fix

**Persona: Amelia (Developer Agent)** — Fix mode with review gate.

`cd <worktree>`

1. **Read ALL review files:**
   - `.claude/review-blind.md`
   - `.claude/review-edge.md`
   - `.claude/review-acceptance.md`
   - `.claude/review-security.md`
   - `.claude/review-redteam.md` (if exists)

2. **Count blocking findings** across all reviewers:
   - Blind Hunter: `MUST FIX` items
   - Edge Case Hunter: `[CRASH]` or `[DATA]` items
   - Acceptance Auditor: `FAIL` items
   - Sentinel: `BLOCK` items
   - Viper: `CRITICAL` or `HIGH` items

3. **If blocking count > 0:**
   a. Address each blocking finding with a code change
   b. Run `make lint && make test-unit`
   c. Commit fixes:
      ```
      git add <specific files>
      git commit -m "fix: address review findings (iteration N)

      Refs #<issue>"
      ```
   d. Regenerate diff: `git diff origin/<base_branch>...HEAD > .claude/review-diff.patch`
   e. Re-spawn ONLY the reviewer(s) that had blocking findings (not all reviewers)
   f. Read new review files and recount
   g. **Repeat up to 3 iterations total**

4. **If 3 iterations exhausted with unresolved blocking findings:**
   - Write `## Review Gate: BLOCKED` to task-state.md with remaining findings
   - Set task to `blocked` — do NOT create PR
   - **End your response.**

5. **If blocking count is 0 (or reaches 0 within 3 iterations):**
   - Write `## Review Summary` to task-state.md:
     ```
     ### Review Gate: PASSED (iteration N)
     - Blind Hunter: N MUST FIX (all resolved), N SHOULD FIX, N NITPICK
     - Edge Case Hunter: N paths found, N critical (all resolved)
     - Acceptance: N PASS, N FAIL (all resolved), N PARTIAL
     - Security: N BLOCK (all resolved), N WARN, N INFO
     - Red Team: [N findings / skipped]
     ```
   - **Set phase to `pr`. End your response.**

---

### pr

`cd <worktree>`

1. Push the branch:
   ```
   git push -u origin <branch>
   ```
2. Create PR with chained base:
   - Story 1.1: base is `main`
   - All others: base is previous story's branch
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
   Part of PRD 5: Canonical Identity Domain Model

   ## Chained PR
   <For 1.2+: Based on #<previous PR number> — must be merged first>

   ## Review Findings Addressed
   - Security: <count> BLOCK, <count> WARN — all BLOCK fixed
   - Blind Hunter: <count> MUST FIX, <count> SHOULD FIX
   - Edge Cases: <count> unhandled paths found, <count> fixed
   - Acceptance: <count> PASS, <count> FAIL fixed, <count> PARTIAL
   - Red Team: <count> findings / skipped

   ## Test plan
   - [x] Unit tests pass (`make test-unit`)
   - [x] E2E tests pass (`make test-e2e`)
   - [x] Lint passes (`make lint`)
   - [x] Independent review agents passed (blind, edge, acceptance, security)
   - [ ] CI passes
   - [ ] Manual verification against Descope sandbox

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )" \
     --repo jamescrowley321/identity-stack
   ```
3. Record PR number and URL in task-state.md under `## PR`
4. **Set phase to `ci`. End your response.**

---

### ci

`cd <worktree>`

1. Wait for CI:
   - `gh pr checks <pr_number> --repo jamescrowley321/identity-stack --watch --fail-fast`
2. Evaluate:
   - **All pass** → **set phase to `complete`. End your response.**
   - **Fail** → read failure details, write to `## CI` in task-state.md, **set phase to `ci-fix`. End your response.**
3. **No CI** (no checks after 60s) → **set phase to `complete`. End your response.**

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
   cd ~/repos/auth/identity-stack
   git worktree remove /tmp/sss-canonical-story-<N.M> --force
   ```
3. Delete `~/repos/auth/identity-stack/.claude/task-state.md`
4. Output: <promise>TASK COMPLETE</promise>

---

## Persona Reference

| Phase | Persona | Source | Mindset |
|-------|---------|--------|---------|
| analyze | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | Ultra-succinct, file-paths-and-ACs, zero fluff |
| anchor | — | Mechanical verification | Compare plan to actual files, halt on mismatch |
| implement | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | Focused, every line citable to an AC |
| test | Quinn (QA) | `_bmad/bmm/agents/qa.md` | Pragmatic, coverage-first, ship-and-iterate |
| review | Subagents | `review-agents/*.md` | Each persona in fresh context, isolated from plan |
| review-fix | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | Systematic triage, fix by priority, gate enforcement |
| ci-fix | Amelia (Dev) | `_bmad/bmm/agents/dev.md` | CI ops, diagnose and fix |

## Rules

- Execute ONE phase per iteration, then end — do NOT chain phases
- NEVER output a promise unless a task just completed or no tasks remain
- NEVER skip phases — every story goes through anchor + all review layers
- NEVER commit to main — always work on feature branches in worktrees
- **All work after `setup` happens in the worktree** — always `cd <worktree>` first
- PRs are chained: each story branches from the previous story's branch
- Always read `~/repos/auth/CLAUDE.md` for repo commands
- Always read the architecture doc for enforcement guidelines and patterns
- Follow existing code patterns — do not invent new conventions
- **Anchor before implement:** Never implement without verifying the plan matches the real codebase
- **Review isolation:** Review subagents MUST NOT read task-state.md, the plan, or implementation notes. They receive only what's specified in the review phase.
- **Review gate:** PRs are blocked if any reviewer has unresolved blocking findings after 3 fix iterations
- **IdentityService pattern:** All new identity routes inject `IdentityService`, not `DescopeManagementClient` directly
- **FGA/access keys stay proxied:** These routes continue using `get_descope_client()` directly (ADR-2, D11)
- **Async only:** No sync engine, no sync Session, no sync fallback anywhere (D3)
- **Result types:** Service methods return `Result[T, IdentityError]`, never raise (D5)
- **Tenant isolation:** Every tenant-scoped query takes `tenant_id` explicitly (D8)
- **Write-through:** Postgres first, sync second. Sync failure → log, never rollback (D7)
- **Git operations:** Use `gh` CLI for GitHub operations. Use `git` for push/pull/fetch.
- **Scope discipline:** Only implement what the story specifies — no extras
- If stuck 3+ iterations on same phase: set task to `blocked`, clean up worktree, delete state, pick up next
