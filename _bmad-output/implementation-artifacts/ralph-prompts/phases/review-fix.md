# Phase: review-fix

Triage and fix review findings. Delta-only re-review. Max 3 iterations.

**Persona:** Disciplined developer — fix by priority, no scope creep.

`cd <worktree or repo root>`

1. Read ALL review files (`.claude/review-*.md`)

2. **Triage:**
   - **P0** (blocks merge): Security BLOCK, Acceptance FAIL, MUST FIX, [CRASH], [DATA], CRITICAL, HIGH
   - **P1** (should fix): WARN, SHOULD FIX, PARTIAL, [DEGRADED], [WRONG], MEDIUM
   - **P2** (skip unless trivial): NITPICK, LOW, INFO

3. If no P0 or P1 findings → write `## Review Summary` to task-state, **advance to next phase. End.**

4. Fix all P0 (non-negotiable), then P1 where straightforward.
   - Run lint + the **full** test suite (`make test-all` for identity-stack, `make test` for py-identity-model and terraform-provider-descope) after fixes. Unit tests must pass — see test.md step 7. Do not advance if any unit test fails, regardless of whether the failure pre-exists on the base branch.
   - Commit: `git commit -m "fix: address review findings"`

5. **Delta re-review** — re-run ONLY reviewers that had P0/P1 findings, scoped to fix commits:
   ```
   git diff <pre-review-sha>...HEAD > .claude/review-diff.patch
   ```
   Use SHA from `## Pre-Review SHA` in task-state.

   Include in the re-review prompt: "These previous findings were addressed: [list]. Verify fixes are correct and check for regressions in the fix diff only."

6. Repeat steps 4-5 up to **3 total iterations**.

7. If P0 findings remain after 3 iterations:
   - Write `## Review Gate: BLOCKED` to task-state with remaining findings
   - Set task to `blocked`, end.

8. Write `## Review Summary` to task-state with finding counts and resolution status.
9. **Advance to the next phase. End your response.**
