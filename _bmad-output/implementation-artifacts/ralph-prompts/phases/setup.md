# Phase: setup

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
