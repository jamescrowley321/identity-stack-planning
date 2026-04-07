Self-referential implementation loop. Execute ONE phase of ONE story per iteration, then end. Fresh context each iteration — persist all state to files.

## Task Queue

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

## Routing

Read `~/repos/auth/identity-stack/.claude/task-state-gateway.md`.

- **Does not exist** → Pick up next `pending` story (top-to-bottom), create task-state, execute setup
- **phase is `complete`** → Update queue status to `done`, clean up worktree, delete task-state, pick next
- **Any other phase** → Read the phase file and execute it

Phase order: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`

## Phase Instructions

Read ONLY the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

**All work after `setup` happens in the worktree** — `cd <worktree>` first.

## New Story Setup

Read the GH issue, then create `~/repos/auth/identity-stack/.claude/task-state-gateway.md`:
```
story: <story number>
issue: <number>
branch: <branch from queue>
base_branch: <base_branch from queue>
worktree: /tmp/is-gateway-story-<story number>
phase: setup
arch_doc: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/architecture-api-gateway.md
```

If all stories are `done`: output `<promise>LOOP_COMPLETE</promise>`

## Rules

- ONE phase per iteration — never chain phases
- Never skip phases, never commit to main
- ALL branches are based on `main` — Tyk work is additive and isolated
- Always read `~/repos/auth/CLAUDE.md` for repo commands
- **Auth/authz boundary:** Tyk = authentication (JWT signature, expiry, issuer). FastAPI = authorization (tenant-scoped roles/permissions). Permanent.
- **Dual-issuer:** Always configure both Descope issuer formats in Tyk OpenID providers
- **File-based config:** All Tyk config in `tyk/` directory, version-controlled, no Dashboard
- **Middleware factory:** `app/middleware/factory.py` is sole location for mode-conditional logic
- **DEPLOYMENT_MODE** evaluated once at import time, never per-request
- **Default standalone:** `docker compose up` (no profile) = pre-gateway behavior, zero regression
- **Secret hygiene:** `TYK_GATEWAY_SECRET` from `.env` only, never in version-controlled files
- Review subagents MUST NOT read task-state or the plan
- Use `gh` for GitHub ops, `git` for push/pull/fetch
- If stuck 3+ iterations: set to `blocked`, clean up, pick next
