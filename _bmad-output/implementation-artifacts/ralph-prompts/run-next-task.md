Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

## Routing

1. Identify repo from `git remote -v` (terraform-provider-descope, identity-stack, or py-identity-model)
2. Read `~/repos/auth/CLAUDE.md` for repo commands and git conventions
3. Read `.claude/task-state.md` in the repo root

- **Does not exist** → Pick up next task (below)
- **phase is `complete`** → Close the issue (or let the merged PR close it), delete task-state.md, pick next
- **Any other phase** → Read the phase file and execute it

Phase order: `analyze → implement → test → review → review-fix → pr → ci → complete`

(No setup/worktree — runs in repo root with a feature branch.)

## Pick Up Next Task

The queue is **GitHub issues** — there is no markdown tracker (the former `task-queue.md` was
retired 2026-09-05 for chronic drift; see `implementation-artifacts/status.md`).

```bash
gh issue list --repo jamescrowley321/<repo> --state open --limit 100
```

Take the first open issue in the epic you are driving, in the order the epic body lists its
stories. If the epic body gives no order, take the lowest open issue number.

- If none eligible → output: <promise>ALL TASKS COMPLETE</promise>
- Otherwise:
  1. Comment on the issue that the loop has picked it up (`gh issue comment`)
  2. Determine base branch: the branch of the most recent story in the same epic that is not
     yet merged, else `main`
  3. Create feature branch: `git checkout -b <branch> origin/<base_branch>`
  4. Create `.claude/task-state.md`:
     ```
     task_id: <ID>
     issue: <number>
     repo: <name>
     branch: <branch>
     base_branch: <base_branch>
     description: <desc>
     phase: analyze
     ```
  5. Execute the analyze phase

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

## Rules

- ONE phase per iteration, then end
- Never output a promise unless a task completed or no tasks remain
- Never skip phases, never commit to main, never modify other repos
- **IdentityService seam (D21):** For identity-stack — all new API routes MUST inject `IdentityService`, not `DescopeManagementClient` directly
- Use `gh` for GitHub ops, `git` for push/pull/fetch
- If stuck 3+ iterations: set task to `blocked`, delete state, pick next
