Self-referential implementation loop. Execute ONE phase of ONE story per iteration, then end. Fresh context each iteration — persist all state to files.

## Task Queue

Sequential, chained PRs (each branches from previous story's branch).

| Story | Issue | Branch | Base Branch | Status |
|-------|-------|--------|-------------|--------|
| 2.1 | #144 | canonical/story-2.1-user-service-sync | main | pending |
| 2.2 | #145 | canonical/story-2.2-role-permission-tenant-service | canonical/story-2.1-user-service-sync | pending |
| 2.3 | #146 | canonical/story-2.3-router-rewire | canonical/story-2.2-role-permission-tenant-service | pending |
| 2.4 | #147 | canonical/story-2.4-unit-integration-tests | canonical/story-2.3-router-rewire | pending |
| 2.5 | #148 | canonical/story-2.5-e2e-tests-regression | canonical/story-2.4-unit-integration-tests | pending |
| 3.1 | #149 | canonical/story-3.1-flow-connector-webhook | canonical/story-2.5-e2e-tests-regression | pending |
| 3.2 | #150 | canonical/story-3.2-reconciliation-job | canonical/story-3.1-flow-connector-webhook | pending |
| 3.3 | #151 | canonical/story-3.3-redis-pubsub | canonical/story-3.2-reconciliation-job | pending |
| 3.4 | #152 | canonical/story-3.4-inbound-sync-tests | canonical/story-3.3-redis-pubsub | pending |
| 4.1 | #153 | canonical/story-4.1-idp-link-provider-service | canonical/story-3.4-inbound-sync-tests | pending |
| 4.2 | #154 | canonical/story-4.2-link-provider-routers | canonical/story-4.1-idp-link-provider-service | pending |
| 4.3 | #155 | canonical/story-4.3-identity-resolution-redis-cache | canonical/story-4.2-link-provider-routers | pending |
| 4.4 | #156 | canonical/story-4.4-multi-idp-tests | canonical/story-4.3-identity-resolution-redis-cache | pending |

## Routing

Read `~/repos/auth/identity-stack/.claude/task-state.md`.

- **Does not exist** → pick first `pending` story, create task-state.md with `phase: setup`, execute setup
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
story: <N.M>
issue: <number>
branch: <branch from queue>
base_branch: <base_branch from queue>
worktree: /tmp/sss-canonical-story-<N.M>
phase: setup
arch_doc: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/architecture-canonical-identity.md
arch_ref: ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/architecture-reference.md
```

If all stories are `done`: output `<promise>LOOP_COMPLETE</promise>`

## Rules

- ONE phase per iteration — never chain phases
- Never skip phases, never commit to main
- PRs are chained: each story branches from the previous story's branch
- **Rebase merge only** — never squash merge (complete phase auto-merges)
- Follow existing code patterns
- Review subagents MUST NOT read task-state.md or the plan
- Use `gh` for GitHub ops, `git` for push/pull/fetch
- Only implement what the story specifies — no extras
- If stuck 3+ iterations on same phase: set to `blocked`, clean up, pick next
- `make lint` before every commit
- **IdentityService seam (D21):** All new API routes MUST inject `IdentityService`, not `DescopeManagementClient` directly
