Self-referential implementation loop. Execute ONE phase of ONE story per iteration, then end. Fresh context each iteration — persist all state to files.

## Task Queue

Sequential, chained PRs (each branches from the previous story's branch).

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 3.1 | #112 | epic3/story-3.1-fga-service | main | pending |
| 3.2 | #113 | epic3/story-3.2-fga-admin-router | epic3/story-3.1-fga-service | pending |
| 3.3 | #114 | epic3/story-3.3-fga-dependency-documents | epic3/story-3.2-fga-admin-router | pending |
| 3.4 | #115 | epic3/story-3.4-fga-unit-tests | epic3/story-3.3-fga-dependency-documents | pending |
| 3.5 | #116 | epic3/story-3.5-fga-demo-seed | epic3/story-3.4-fga-unit-tests | pending |
| 3.6 | #117 | epic3/story-3.6-fga-admin-ui | epic3/story-3.5-fga-demo-seed | pending |
| 3.7 | #118 | epic3/story-3.7-fga-e2e-tests | epic3/story-3.6-fga-admin-ui | pending |

## Routing

Read `~/repos/auth/identity-stack/.claude/task-state.md`.

- **Does not exist** → pick first eligible `pending` story (previous done, or 3.1), create task-state.md with `phase: setup`, execute setup
- **phase is `complete`** → update this file (`pending` → `done`), clean up worktree, delete task-state.md, pick next story
- **Any other phase** → read the phase file and execute it

Phase order: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

## Phase Instructions

Read ONLY the current phase file — do not read other phase files:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

**All work after `setup` happens in the worktree** — `cd` to the path in `worktree:` first.

## New Story Setup

When picking up a new story, create `~/repos/auth/identity-stack/.claude/task-state.md`:
```
story: 3.X
issue: <number>
branch: <branch from queue>
base_branch: <base_branch from queue>
worktree: /tmp/sss-epic3-story-3.X
phase: setup
```

If all stories are `done`: output `<promise>LOOP_COMPLETE</promise>`

## Rules

- ONE phase per iteration — never chain phases
- Never skip phases, never commit to main
- PRs are chained: each story branches from the previous story's branch
- **Rebase merge only** — never squash merge. Owner merges manually; ralph never calls `gh pr merge`
- Follow existing code patterns in `backend/app/routers/` and `backend/app/services/`
- Review subagents MUST NOT read task-state.md or the plan
- Use `gh` for GitHub ops, `git` for push/pull/fetch
- Only implement what the story specifies — no extras
- If stuck 3+ iterations on same phase: set to `blocked`, clean up, pick next
- `make lint` before every commit

## FGA Domain Rules

- **Descope seam (NFR-19):** All Descope FGA API calls go through `DescopeManagementClient` (`backend/app/services/descope.py`) — never call `httpx` against Descope directly from a router or service
- **Fail-closed:** FGA check failures MUST deny access (502 on API error, never fail-open). The Sentinel reviewer treats fail-open as a blocking security finding
- **Tenant isolation:** Every document/resource operation must verify `tenant_id` — cross-tenant access is a CONFIRMED security finding
- **Transactional ordering (Story 3.3 documents):** Create FGA relation BEFORE DB commit; on FGA failure, roll back DB; on DB failure, delete the FGA relation (compensation)
- **Admin endpoints:** Use `require_role("owner", "admin")` from `backend/app/dependencies/rbac.py`
