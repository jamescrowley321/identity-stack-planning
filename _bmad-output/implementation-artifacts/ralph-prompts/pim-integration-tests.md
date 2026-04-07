Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

## Task Queue

| Task | Branch | Description | Status |
|------|--------|-------------|--------|
| T120 | test/node-oidc-fixture | Build node-oidc-provider test fixture | pending |
| T121 | test/integration-core-flows | Integration tests: Auth Code + PKCE, Token Validation, Refresh | pending |
| T122 | test/integration-token-mgmt | Integration tests: Introspection (RFC 7662), Revocation (RFC 7009) | pending |
| T123 | test/integration-advanced-requests | Integration tests: DPoP (RFC 9449), PAR (RFC 9126), JAR (RFC 9101) | pending |
| T124 | test/integration-alt-grants | Integration tests: Device Auth (RFC 8628), Token Exchange (RFC 8693) | pending |
| T125 | test/integration-fapi2 | Integration tests: FAPI 2.0 Security Profile | pending |
| T126 | docs/identityserver-gaps | Document Duende IdentityServer gaps vs node-oidc-provider | pending |

## Routing

Repo: `~/repos/auth/py-identity-model`

Read `~/repos/auth/py-identity-model/.claude/task-state.md`.

- **Does not exist** → Pick first `pending` task, create state, execute setup
- **phase is `complete`** → Update status to `done` in this file, clean up worktree, delete state, pick next
- **Any other phase** → Read phase file and execute

Phase order: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`

## New Task Setup

Create `~/repos/auth/py-identity-model/.claude/task-state.md`:
```
task_id: T12X
branch: <branch from queue>
worktree: /tmp/pim-T12X
phase: setup
```

If all done: `<promise>LOOP_COMPLETE</promise>`

## Phase Instructions

Read the current phase file:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

All work after setup happens in the worktree — `cd <worktree>` first.

## Task-Specific Analysis Guidance

Include these notes when the analyze phase reads the issue:

- **T120 (fixture):** Read node-oidc-provider research at `~/repos/auth/identity-stack-planning/_bmad-output/brainstorming/research/node-oidc-provider-research.md`. Plan Docker fixture with introspection, revocation, deviceFlow, DPoP, PAR, JAR, custom Descope-style claims (`dct`/`tenants`), dual key types (RSA + EC), JWT access tokens.
- **T121-T125 (tests):** Read the fixture config + existing integration test patterns. Tests must exercise full protocol flows against the live provider (not mocked responses).
- **T126 (docs):** Feature comparison matrix (IdentityServer vs node-oidc-provider), licensing, infrastructure, recommendation to deprecate IdentityServer fixture.

## Rules

- ONE phase per iteration, then end
- Never commit to main — worktree branches only
- Integration tests must exercise real protocol flows, not mocks
- node-oidc-provider fixture uses HTTP only (acceptable for local testing)
- If stuck 3+ iterations: set to `blocked`, clean up, move on
