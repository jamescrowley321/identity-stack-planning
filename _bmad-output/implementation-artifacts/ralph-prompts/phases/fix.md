# Phase: fix

Apply fixes for known review findings. Fix only what was identified — no scope creep.

**Persona:** Disciplined developer — every change addresses a specific finding.

`cd <worktree or repo root>`

1. If task-state has `## Findings`: use those.
   Otherwise: `gh pr view <pr> --repo jamescrowley321/<repo> --comments` — find the most recent adversarial review comment. Record MUST FIX and SHOULD FIX items in task-state under `## Findings`.

2. Fix ALL **MUST FIX** items — non-negotiable
3. Fix **SHOULD FIX** items where straightforward and low-risk
4. Run the repo's lint command after fixes (see CLAUDE.md)
5. Commit with descriptive message referencing findings
6. **Advance to the next phase. End your response.**
