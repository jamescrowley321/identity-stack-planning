Self-referential fix loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

## Routing

1. Identify repo from `git remote -v`
2. Read `~/repos/auth/CLAUDE.md` for repo commands
3. Read `.claude/task-state.md`

- **Does not exist** → Pick up next fix task (below)
- **phase is `complete`** → Mark done in queue, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order: `fix → test → review → review-fix → ci → complete`

## Pick Up Next Fix Task

Read queue: `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/task-queue.md`

Find your repo's **"Review Fix Tasks"** section(s). ONLY look at sections whose heading contains "Review Fix Tasks" — do NOT pick from other sections. Take first `pending` row.

- If none eligible → output: <promise>ALL FIX TASKS COMPLETE</promise>
- CRITICAL: Never pick tasks outside "Review Fix Tasks" sections.
- Otherwise:
  1. Set status to `in_progress` in queue
  2. Fetch and checkout: `git fetch origin && git checkout <branch> && git pull origin <branch>`
  3. Read findings from PR comments or issue
  4. Create `.claude/task-state.md`:
     ```
     task_id: <ID>
     issue: <number or empty>
     repo: <name>
     branch: <branch>
     pr: <PR number>
     description: <desc>
     phase: fix
     ```
  5. Record findings in `## Findings`, execute the fix phase

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

## Rules

- ONE phase per iteration, then end
- Never output a promise unless a task completed or no tasks remain
- Never skip phases — every fix goes through review
- Never commit to main
- Only fix what the review identified — no scope creep
- Use `gh` for GitHub ops, `git` for push/pull/fetch
- If stuck 3+ iterations: set to `blocked`, delete state, pick next
