# Phase: complete

Mark task done and clean up.

1. **Update task status:**
   - If the router prompt has an inline task queue: update status to `done` in PROMPT.md
   - If using external task-queue.md: update status there

2. **Auto-merge** (only if the router prompt specifies rebase-merge):
   ```
   gh pr merge <pr> --repo jamescrowley321/<repo> --rebase --delete-branch
   ```
   If merge fails: write error to task-state `## Merge`, retry next iteration.

3. **Clean up worktree** (if one exists):
   ```
   cd <repo_root>
   git worktree remove <worktree> --force
   ```

4. Delete task-state file

5. Output: <promise>TASK COMPLETE</promise>
