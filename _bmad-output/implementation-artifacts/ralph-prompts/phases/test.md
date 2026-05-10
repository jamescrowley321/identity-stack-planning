# Phase: test

Write and run tests. Coverage-first, pragmatic.

**Persona:** QA engineer — verify behavior, find gaps, ship with confidence.

`cd <worktree or repo root>`

1. Read existing test patterns in the repo to match style
2. Write tests for ALL new code:
   - Happy paths, error paths, edge cases (empty inputs, missing fields, boundary values)
   - Auth enforcement and tenant isolation if applicable
   - Every test must verify behavior that could break independently — no shallow constructor/dataclass tests
3. **Integration tests are REQUIRED** for any story modifying a service, repository, middleware, dependency, endpoint, or protocol handler. Tests must exercise real flows — real HTTP, real DB or testcontainer, real protocol roundtrip — **not mocks**. Locations by repo:
   - `py-identity-model` → `src/tests/integration/`
   - `identity-stack` → `backend/tests/integration/`
   - `terraform-provider-descope` → `internal/**/*_test.go` against the live Descope API (acceptance + integration tests)
4. **For identity-stack additionally:** Playwright E2E tests are REQUIRED if the story modifies any service, repository, middleware, dependency, or endpoint — even without changing router signatures. Follow patterns in `backend/tests/e2e/`. 3-tier auth: unauthenticated, OIDC client credentials, admin session token.
5. Integration AND E2E tests may ONLY be skipped if the story adds pure type definitions (ABCs, models, dataclasses) with zero runtime behavior. Skipping requires `[skip-integration-tests: <reason>]` in a commit body — the Acceptance Auditor will scrutinize this.
6. Run the repo's full local test suite (commands in CLAUDE.md). For identity-stack this is `make test-all` (lint + unit + frontend + integration). For py-identity-model this is `make test`. For terraform-provider-descope this is `make test`. **Unit tests are non-negotiable** — they must pass.
7. If failures: fix and re-run until green. **Unit test failures are never deferrable.** Do not rationalize failing unit tests as "pre-existing", "environmental flakiness", "testcontainers issue", or "out of loop scope" — every unit test failure is a hard blocker. If the failure exists on the base branch, you must still either fix it before advancing or write `BLOCKED.md` and stop. This rule supersedes the "do not modify production code" carve-out in PROMPT.md when production code is the root cause of a failing unit test.
8. Run lint, commit test files
9. **Advance to the next phase. End your response.**
