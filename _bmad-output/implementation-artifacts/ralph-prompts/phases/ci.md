# Phase: ci

`cd <worktree>`

1. Wait for CI: `gh pr checks <pr_number> --repo jamescrowley321/identity-stack --watch --fail-fast`
2. All pass → **set phase to `complete`. End your response.**
3. Fail → read failure details, write to `## CI` in task-state.md, **set phase to `ci-fix`. End your response.**
4. No CI (no checks after 60s) → **set phase to `complete`. End your response.**

# Phase: ci-fix

`cd <worktree>`

1. Read `## CI` from task-state.md
2. Diagnose and fix the failure
3. `make lint && make test-unit`
4. Commit and push:
   ```
   git add <specific files>
   git commit -m "fix: CI failure — <description>"
   git push origin <branch>
   ```
5. **Set phase to `ci`. End your response.**

# Phase: complete

1. **Merge the PR using rebase merge** (preserves commits, keeps linear history, doesn't break chained PRs):
   ```
   gh pr merge <pr_number> --repo jamescrowley321/identity-stack --rebase --delete-branch
   ```
   If merge fails (conflicts, CI not passed), write the error to `## Merge` in task-state.md and retry next iteration.

2. Update task queue in the prompt file: replace `pending` with `done`
3. Clean up:
   ```
   cd ~/repos/auth/identity-stack
   git worktree remove /tmp/sss-canonical-story-<N.M> --force
   ```
4. Delete `~/repos/auth/identity-stack/.claude/task-state.md`
5. Output: <promise>TASK COMPLETE</promise>
