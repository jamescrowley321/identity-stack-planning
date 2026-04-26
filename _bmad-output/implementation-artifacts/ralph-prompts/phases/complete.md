# Phase: complete

Mark task done and clean up. **Do NOT merge the PR.**

1. **Update task status:**
   - If the router prompt has an inline task queue: update status to `done` in PROMPT.md
   - If using external task-queue.md: update status there

2. **Clean up worktree** (if one exists):
   ```
   cd <repo_root>
   git worktree remove <worktree> --force
   ```

3. Delete task-state file

4. Output: <promise>TASK COMPLETE</promise>

**The owner reviews and merges every PR manually.** Ralph loops must never call `gh pr merge`, `--auto`, or any merge queue command.
