Self-referential fix-and-review loop for py-identity-model chained PRs. ONE phase of ONE task per iteration, then end.

## Context

py-identity-model has chained feature PRs with adversarial review findings that need fixing, followed by a full re-review of the PR diff.

Repo: `~/repos/auth/py-identity-model`

## Routing

Read `~/repos/auth/py-identity-model/.claude/task-state.md`.

- **Does not exist** → Pick up next task (below)
- **phase is `complete`** → Mark done in task-queue.md, clean up worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order: `setup → fix → test → review → review-fix → ci → complete`

## Pick Up Next Task

Read `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/task-queue.md`.

Find py-identity-model **"Review Fix Tasks"** section. Take first `pending` row.

- If none: `<promise>LOOP_COMPLETE</promise>`
- Otherwise:
  1. Set status to `in_progress`
  2. Read the PR: `gh pr view <pr> --repo jamescrowley321/py-identity-model --comments`
  3. Create `~/repos/auth/py-identity-model/.claude/task-state.md`:
     ```
     task_id: <ID>
     issue: <number or empty>
     repo: py-identity-model
     branch: <branch>
     base_branch: <base branch from PR>
     pr: <PR number>
     worktree: /tmp/pim-<task_id>
     description: <desc>
     phase: setup
     ```
  4. Execute setup

## Setup Override

After creating the worktree, rebase onto base if prior PRs were fixed:
```
cd <worktree>
git rebase origin/<base_branch>
```
Resolve conflicts — base branch's version takes precedence for systemic fixes.

## Review Override

Reviews in this loop use the **full PR diff** (`origin/<base_branch>...HEAD`), not just fix commits. This is intentional — you're reviewing the entire PR. Delta re-review in review-fix still applies (only re-review fix commits).

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the worktree — `cd <worktree>` first.

## Rules

- ONE phase per iteration, then end
- Never skip phases — every task goes through review
- Never commit to main
- Push with `--force-with-lease` (rebases may have occurred)
- Follow conventional commits (Angular convention)
- Only fix what was identified + what review finds — no feature work
- If stuck 3+ iterations: set to `blocked`, clean up, pick next
