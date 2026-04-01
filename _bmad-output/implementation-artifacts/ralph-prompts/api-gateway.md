You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE story, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Task Queue

Stories are executed sequentially following the dependency-driven implementation order. All branches are based on `main` — Tyk work is largely additive and isolated.

### Epic 3 (partial): Deployment Mode Toggle — Foundation

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 3.1 | #171 | gateway/story-3.1-deployment-mode-env-var | main | pending |

### Epic 1: Tyk Gateway Integration

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 1.1 | #161 | gateway/story-1.1-tyk-config-directory | main | pending |
| 1.2 | #162 | gateway/story-1.2-api-definition-backend-proxy | main | pending |
| 1.3 | #163 | gateway/story-1.3-docker-compose-tyk-redis | main | pending |

### Epic 2 (partial): Middleware Migration — Factory & Conditional Assembly

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 2.1 | #166 | gateway/story-2.1-middleware-factory | main | pending |
| 2.2 | #167 | gateway/story-2.2-conditional-middleware-assembly | main | pending |
| 2.3 | #168 | gateway/story-2.3-tyk-rate-limiting | main | pending |

### Epic 1 (continued): Verification

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 1.4 | #164 | gateway/story-1.4-verify-proxy-headers | main | pending |
| 1.5 | #165 | gateway/story-1.5-health-check-passthrough | main | pending |

### Epic 2 (continued): Verification

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 2.4 | #169 | gateway/story-2.4-authorization-independence | main | pending |
| 2.5 | #170 | gateway/story-2.5-standalone-regression | main | pending |

### Epic 4: Docker Compose Profiles

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 4.1 | #174 | gateway/story-4.1-compose-profile-structure | main | pending |
| 4.2 | #175 | gateway/story-4.2-gateway-profile-overrides | main | pending |
| 4.3 | #176 | gateway/story-4.3-frontend-api-url-resolution | main | pending |

### Epic 3 (continued): Wiring & Documentation

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 3.2 | #172 | gateway/story-3.2-deployment-mode-docker-compose | main | pending |
| 3.3 | #173 | gateway/story-3.3-deployment-mode-docs | main | pending |

### Epic 4 (continued): Integration Tests

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 4.4 | #177 | gateway/story-4.4-integration-tests-both-profiles | main | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
2. The target repo is `identity-stack` at `~/repos/auth/identity-stack`
3. Read `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/architecture-api-gateway.md` for architectural decisions, implementation patterns, and enforcement guidelines

## Step 2: Determine What To Do

Read `~/repos/auth/identity-stack/.claude/task-state-gateway.md`.

- **Does not exist** → Pick up next story (Step 3)
- **phase is `complete`** → Update queue status in THIS prompt file (replace `pending` with `done` for that row), clean up worktree, delete task-state-gateway.md, pick up next story (Step 3)
- **Any other phase** → Execute that one phase (Step 4)

## Step 3: Pick Up Next Story

Find the first `pending` row in the Task Queue above (in top-to-bottom order).

- If none eligible (all done) → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/identity-stack`
  2. Read the acceptance criteria from the GH issue body
  3. Create `~/repos/auth/identity-stack/.claude/task-state-gateway.md`:
     ```
     story: <story number>
     issue: <number>
     branch: <branch from queue>
     base_branch: <base_branch from queue>
     worktree: /tmp/is-gateway-story-<story number>
     phase: setup
     ```
  4. Execute the `setup` phase below, then end your response

## Step 4: Execute ONE Phase

Read phase from task-state-gateway.md. Execute ONLY that phase. When done, update the phase field to the next phase and end your response.

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
   git worktree add /tmp/is-gateway-story-<N.M> -b <branch> origin/main
   ```
   - All stories branch from `origin/main` — Tyk work is additive and isolated
4. Verify worktree: `cd /tmp/is-gateway-story-<N.M> && git log --oneline -3`
5. Record worktree path in task-state-gateway.md
6. **Set phase to `analyze`. End your response.**

---

### analyze

**Persona: Amelia (Developer Agent)** — Read `~/repos/auth/auth-planning/_bmad/bmm/agents/dev.md` and adopt her mindset: ultra-succinct, file-paths-and-AC-IDs, no fluff.

`cd <worktree>`

1. Read the GH issue: `gh issue view <number> --repo jamescrowley321/identity-stack`
2. Read the architecture doc: `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/architecture-api-gateway.md` (ADRs, middleware migration matrix, Tyk config architecture, Docker Compose topology, security architecture)
3. **Read EVERY file that will be modified or extended** — not just list them, actually `cat -n` each one:
   - `backend/app/middleware/` — existing middleware modules (TokenValidation, SlowAPI, SecurityHeaders, CorrelationId)
   - `backend/app/main.py` — current middleware registration, lifespan
   - `backend/app/dependencies/rbac.py` — require_role / require_permission patterns
   - `docker-compose.yml` — current service definitions
   - `Makefile` — existing targets
   - `.env.example` — current env var documentation
   - Any additional files the story touches
4. Write implementation plan to task-state-gateway.md under `## Plan`:
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
   Write to task-state-gateway.md under `## Anchor`.

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

1. Read `## Plan` AND `## Anchor: File Snapshots` from task-state-gateway.md
2. **Cross-reference anchor snapshots** — before modifying a file, verify it still matches the snapshot
3. Implement the plan:
   - Follow existing code patterns exactly
   - **Enforcement guidelines from architecture doc (ALL mandatory):**
     1. Tyk handles authentication (JWT signature, expiry, issuer). FastAPI handles authorization (tenant-scoped roles/permissions via `require_role()`/`require_permission()`). This is a permanent boundary, not a v1 limitation (ADR-GW-1).
     2. Use `use_openid: true` with two providers in the Tyk API definition for Descope dual-issuer support. Do NOT use `enable_jwt: true` (single source only) (ADR-GW-1, Section 6).
     3. File-based API definitions only — `use_db_app_configs: false`. No Tyk Dashboard, no imperative Gateway API calls (ADR-GW-2, ADR-GW-3).
     4. `DEPLOYMENT_MODE` env var evaluated once at startup (import time). Never per-request. Only valid values: `standalone` (default) and `gateway` (ADR-GW-4, ADR-GW-5).
     5. Default Docker Compose profile (no `--profile` flag) = standalone mode. Gateway requires explicit `--profile gateway`. Zero breaking changes (ADR-GW-6).
     6. Forward original `Authorization: Bearer <token>` header through Tyk to FastAPI. Never strip it. Backend decodes JWT for tenant claims (ADR-GW-7).
     7. Middleware factory (`app/middleware/factory.py`) is the SOLE location for deployment-mode-conditional logic. No scattered `if DEPLOYMENT_MODE == "gateway"` elsewhere (Section 5).
     8. In gateway mode: skip `TokenValidationMiddleware` and `SlowAPIMiddleware`. Keep CORS, SecurityHeaders, CorrelationId, ProxyHeaders (Section 4).
     9. Rate limiter state (`app.state.limiter`) and exception handler must remain registered even in gateway mode to prevent import errors from `@limiter` decorators (Section 5).
     10. `TYK_GATEWAY_SECRET` never hardcoded — sourced from `.env` via Docker Compose env var substitution (Section 8).
     11. Run `make lint` before every commit.
   - Admin endpoints use `require_role("owner", "admin")`
   - Write endpoints use `@limiter.limit(RATE_LIMIT_AUTH)` with `request: Request` as first param
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

**Persona: Quinn (QA Engineer)** — Read `~/repos/auth/auth-planning/_bmad/bmm/agents/qa.md`. Pragmatic, coverage-first, ship-and-iterate.

`cd <worktree>`

1. Read existing test patterns in `backend/tests/` to match style
2. Write unit tests for ALL new code:
   - **Middleware factory:** Verify correct middleware inclusion/exclusion for `standalone` vs `gateway` modes
   - **DEPLOYMENT_MODE validation:** Startup error on invalid values, default to `standalone` when unset
   - **Tyk config files:** Validate JSON syntax and required keys in `tyk/tyk.conf` and `tyk/apps/*.json`
   - **Auth enforcement:** Authorization factories work identically in both modes
   - **Standalone regression:** All existing middleware behavior preserved
   - **Docker Compose:** Profile structure validation (container counts, service names)
   - **Edge cases:** Invalid DEPLOYMENT_MODE values, missing env vars, forged gateway headers in standalone mode
3. Write integration tests where applicable:
   - Standalone profile health check
   - Gateway profile health check through Tyk
   - JWT rejection by Tyk (expired/invalid/missing token)
   - Rate limiting through Tyk (429 response)
4. Run tests: `make test-unit`
5. If failures: fix and re-run until green
6. Run lint: `make lint`
7. Commit tests:
   ```
   git add <test files>
   git commit -m "test: add tests for <description>

   Refs #<issue>"
   ```
8. **Set phase to `review`. End your response.**

---

### review

**Spawn independent review subagents.** Each reviewer runs in a fresh context with NO access to the implementation plan or task-state-gateway.md.

`cd <worktree>`

1. **Generate the diff and save to disk:**
   ```bash
   git diff origin/main...HEAD > .claude/review-diff.patch
   ```

2. **Read the review agent templates** from:
   `~/repos/auth/auth-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/`

3. **Spawn 4 independent review subagents** using the Claude Code `Agent` tool. Each agent receives ONLY what's listed — **never** task-state-gateway.md, never the plan, never implementation notes.

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
   - Include: "Architecture doc: `~/repos/auth/auth-planning/_bmad-output/planning-artifacts/architecture-api-gateway.md`"
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
   d. Regenerate diff: `git diff origin/main...HEAD > .claude/review-diff.patch`
   e. Re-spawn ONLY the reviewer(s) that had blocking findings (not all reviewers)
   f. Read new review files and recount
   g. **Repeat up to 3 iterations total**

4. **If 3 iterations exhausted with unresolved blocking findings:**
   - Write `## Review Gate: BLOCKED` to task-state-gateway.md with remaining findings
   - Set task to `blocked` — do NOT create PR
   - **End your response.**

5. **If blocking count is 0 (or reaches 0 within 3 iterations):**
   - Write `## Review Summary` to task-state-gateway.md:
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
2. Create PR based on `main`:
   ```
   gh pr create \
     --base main \
     --head <branch> \
     --title "feat: <Story title>" \
     --body "$(cat <<'PREOF'
   ## Summary
   <bullet points of what was implemented>

   ## Story
   Refs #<issue>
   Part of PRD 2: API Gateway & Deployment Topology

   ## Review Findings Addressed
   - Security: <count> BLOCK, <count> WARN — all BLOCK fixed
   - Blind Hunter: <count> MUST FIX, <count> SHOULD FIX
   - Edge Cases: <count> unhandled paths found, <count> fixed
   - Acceptance: <count> PASS, <count> FAIL fixed, <count> PARTIAL
   - Red Team: <count> findings / skipped

   ## Test plan
   - [x] Unit tests pass (`make test-unit`)
   - [x] Lint passes (`make lint`)
   - [x] Independent review agents passed (blind, edge, acceptance, security)
   - [ ] CI passes
   - [ ] Manual verification against Descope sandbox

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )" \
     --repo jamescrowley321/identity-stack
   ```
3. Record PR number and URL in task-state-gateway.md under `## PR`
4. **Set phase to `ci`. End your response.**

---

### ci

`cd <worktree>`

1. Wait for CI:
   - `gh pr checks <pr_number> --repo jamescrowley321/identity-stack --watch --fail-fast`
2. Evaluate:
   - **All pass** → **set phase to `complete`. End your response.**
   - **Fail** → read failure details, write to `## CI` in task-state-gateway.md, **set phase to `ci-fix`. End your response.**
3. **No CI** (no checks after 60s) → **set phase to `complete`. End your response.**

---

### ci-fix

**Persona: Amelia** — CI ops mode.

`cd <worktree>`

1. Read `## CI` from task-state-gateway.md
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
   git worktree remove /tmp/is-gateway-story-<N.M> --force
   ```
3. Delete `~/repos/auth/identity-stack/.claude/task-state-gateway.md`
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
- ALL branches are based on `main` — Tyk work is additive and isolated, no chained PRs
- Always read `~/repos/auth/CLAUDE.md` for repo commands
- Always read the architecture doc for enforcement guidelines and patterns
- Follow existing code patterns — do not invent new conventions
- **Anchor before implement:** Never implement without verifying the plan matches the real codebase
- **Review isolation:** Review subagents MUST NOT read task-state-gateway.md, the plan, or implementation notes. They receive only what's specified in the review phase.
- **Review gate:** PRs are blocked if any reviewer has unresolved blocking findings after 3 fix iterations
- **Auth/authz boundary:** Tyk = authentication (JWT signature, expiry, issuer). FastAPI = authorization (tenant-scoped role/permission checks). This is permanent, not a v1 limitation.
- **Dual-issuer:** Always configure both Descope issuer formats in Tyk OpenID providers
- **File-based config:** All Tyk configuration in `tyk/` directory, version-controlled, no Dashboard
- **Middleware factory:** `app/middleware/factory.py` is the sole location for mode-conditional logic
- **Startup evaluation:** `DEPLOYMENT_MODE` evaluated once at import time, never per-request
- **Default standalone:** `docker compose up` (no profile) = pre-gateway behavior, zero regression
- **Secret hygiene:** `TYK_GATEWAY_SECRET` from `.env` only, never in version-controlled files
- **Git operations:** Use `gh` CLI for GitHub operations. Use `git` for push/pull/fetch.
- **Scope discipline:** Only implement what the story specifies — no extras
- If stuck 3+ iterations on same phase: set task to `blocked`, clean up worktree, delete state, pick up next
