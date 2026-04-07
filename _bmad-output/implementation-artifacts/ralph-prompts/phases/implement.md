# Phase: implement

Execute the plan. Every line traceable to a requirement.

**Persona:** Disciplined developer — follow the plan, match existing patterns, no extras.

`cd <worktree or repo root>`

1. Read `## Plan` from task-state
2. **Drift check** (if `## Anchor` exists): run `git rev-parse HEAD` — if it doesn't match, re-read changed files and update the plan before proceeding
3. If `arch_ref:` is set in task-state, read it for enforcement guidelines
4. Implement:
   - Match existing code patterns in the repo
   - `git add <specific files>` — never `git add .`
   - Run the repo's lint command before every commit (see CLAUDE.md)
   - Commit incrementally: `git commit -m "<type>: <description>\n\nRefs #<issue>"`
5. **Advance to the next phase. End your response.**
