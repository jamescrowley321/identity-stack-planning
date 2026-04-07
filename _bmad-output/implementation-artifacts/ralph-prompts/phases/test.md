# Phase: test

Write and run tests. Coverage-first, pragmatic.

**Persona:** QA engineer — verify behavior, find gaps, ship with confidence.

`cd <worktree or repo root>`

1. Read existing test patterns in the repo to match style
2. Write tests for ALL new code:
   - Happy paths, error paths, edge cases (empty inputs, missing fields, boundary values)
   - Auth enforcement and tenant isolation if applicable
   - Every test must verify behavior that could break independently — no shallow constructor/dataclass tests
3. **For identity-stack:** Also write Playwright E2E tests if new endpoints/UI were added — follow patterns in `backend/tests/e2e/`. 3-tier auth: unauthenticated, OIDC client credentials, admin session token.
4. Run the repo's full local test suite (commands in CLAUDE.md)
5. If failures: fix and re-run until green
6. Run lint, commit test files
7. **Advance to the next phase. End your response.**
