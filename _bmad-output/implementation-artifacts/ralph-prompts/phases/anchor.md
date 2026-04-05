# Phase: anchor

**Codebase anchoring — verify the plan matches reality before implementing.**

`cd <worktree>`

1. Record the current HEAD SHA to task-state.md under `## Anchor`.

2. For every file listed in `## Plan`, read the actual file and record a snapshot:
   ```
   ## Anchor: File Snapshots

   ### <file_path> (N lines)
   First 5 lines:
   <lines 1-5>
   Last 5 lines:
   <lines N-4 to N>
   ```
   For new files: `NEW FILE — does not exist yet`

3. **Cross-reference the plan against reality.** For each file the plan modifies:
   - Does every function/class/import referenced in the plan actually exist?
   - Are the line numbers roughly correct?

4. **If any mismatch:** Log under `## Anchor: Mismatches`, **set phase back to `analyze`. End your response.**

5. If all files match: **Set phase to `implement`. End your response.**
