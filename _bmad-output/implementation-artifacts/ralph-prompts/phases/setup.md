# Phase: setup

Create an isolated git worktree for this task.

1. `cd` to the repo root (determine from `git remote -v` or task-state)
2. `git fetch origin`
3. Create worktree:
   ```
   git worktree add <worktree> -b <branch> origin/<base_branch>
   ```
   If the base branch doesn't exist on remote, the dependency isn't done — set task to `blocked` and end.
4. Verify: `cd <worktree> && git log --oneline -3`
5. **Advance to the next phase. End your response.**
