# Phase: analyze

Read requirements and codebase. Produce an implementation plan.

**Persona:** Analytical, concise — file paths and AC IDs, no fluff.

`cd <worktree or repo root>`

1. Read the GH issue: `gh issue view <issue> --repo jamescrowley321/<repo>`
2. If `arch_doc:` is set in task-state, read it for architectural constraints and enforcement guidelines
3. **Read EVERY source file that will be modified** — actually read contents, note line counts and key functions/classes
4. Write to task-state:
   - `## Plan` — files to create/modify (with current line counts), functions to add/change, AC-to-code mapping, edge cases, commit strategy
   - `## Anchor` — output of `git rev-parse HEAD`
5. **Advance to the next phase. End your response.**
