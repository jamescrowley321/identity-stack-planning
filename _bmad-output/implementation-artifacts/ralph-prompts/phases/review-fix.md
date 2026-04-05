# Phase: review-fix

**Persona: Amelia (Developer Agent)** — fix mode with review gate.

`cd <worktree>`

1. Read ALL review files (`.claude/review-*.md`)

2. Count ALL findings:
   - Blind Hunter: MUST FIX + SHOULD FIX + NITPICK
   - Edge Case Hunter: [CRASH] + [DATA] + [DEGRADED]
   - Acceptance Auditor: FAIL + PARTIAL
   - Sentinel: BLOCK + WARN (INFO = acceptable risk, skip)
   - Viper: CRITICAL + HIGH + MEDIUM + LOW

3. If open finding count > 0:
   a. Fix in priority order: P0 (MUST FIX, CRASH, DATA, FAIL, BLOCK, CRITICAL, HIGH) → P1 (SHOULD FIX, DEGRADED, PARTIAL, WARN, MEDIUM) → P2 (NITPICK, LOW)
   b. `make lint && make test-unit`
   c. Commit: `git commit -m "fix: address review findings (iteration N)"`
   d. Regenerate diff: `git diff origin/<base_branch>...HEAD > .claude/review-diff.patch`
   e. Re-spawn ONLY reviewers that had findings
   f. Repeat up to 5 iterations

4. If 5 iterations exhausted: write `## Review Gate: BLOCKED` to task-state.md, set task to `blocked`, end.

5. If all resolved: write `## Review Summary` to task-state.md, **set phase to `pr`. End your response.**
