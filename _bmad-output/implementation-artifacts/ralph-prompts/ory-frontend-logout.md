Self-referential implementation loop. Execute ONE phase of ONE story per iteration, then end. Fresh context each iteration — persist all state to files.

## Scope

Finish the **Ory as a Configurable SSO Provider** initiative — the remaining **frontend (Epic 4)** and **logout + end-to-end (Epic 5)** stories. Epics 1–3 are **merged to `main`** (identity-stack PRs #370/#371/#372):

- **Epic 1 (live):** Ory Network IaC — project `identity-stack-dev`, issuer `https://inspiring-nash-yli2uiwmcw.projects.oryapis.com`, public SPA `client_id 58142046-5beb-420e-a4cd-310f7263357f` (PKCE S256).
- **Epic 2:** provider-driven backend token validation — `app/middleware/providers.py` selects a provider by issuer and verifies against that provider's JWKS; Ory added as a standard-OIDC provider; Descope path preserved.
- **Epic 3:** canonical write-path — JIT provisioning + `OrySyncAdapter` + `tenants.external_org_id` migration, and the canonical endpoint shipped as **`GET /api/identity`**.

Framing (unchanged): make identity-stack's IdP **configurable** — NOT a Descope swap-out. Descope stays a configured provider; every change is **backward-compatible, provider-agnostic** wiring (NFR-8).

Epic/story detail: `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics-ory-sso-provider.md`
Context/decisions: `~/repos/auth/identity-stack-planning/docs/ory-sso-provider-context.md`

## Task Queue

Independent PRs — each story branches from `main`. The **owner reviews and merges** every PR (never auto-merge).

| Story | FRs | Branch | Status |
|-------|-----|--------|--------|
| ORY-4.1 | FR-14, FR-9 | — | **done** — shipped in Epic 3 (#372) as `GET /api/identity`. Do NOT rebuild. |
| ORY-4.2 | FR-15 | `feat/ory-frontend-oidc-config` | pending |
| ORY-4.3 | FR-16 | `feat/ory-frontend-canonical-rbac` | pending |
| ORY-5.1 | FR-17 | `feat/ory-provider-aware-logout` | pending |
| ORY-5.2 | FR-21 | `feat/ory-e2e-validation` | pending |

### Reconciliation — verify before launch

**As of 2026-08-22.** Confirm each story is still open against `main` before starting; `providers.py`, `seed_ory.py`, migration `004`, and the `GET /api/identity` endpoint are **already present** (Epics 1–3 merged).

- **ORY-4.1 is DONE.** The epics doc names it `/me`; it shipped as **`GET /api/identity`**. ORY-4.3 must **consume `GET /api/identity`** — do not create a new `/me` endpoint.
- Out of scope for this loop (owner-only ops items, tracked as identity-stack issues): **#375** rotate `ORY_WORKSPACE_API_KEY`, **#376** migrate Terraform state → HCP. Do not attempt these in a story.

### Dependencies (enforce ordering)

- **ORY-4.2 → ORY-4.3** (the hooks consume the provider-configured login).
- **ORY-5.1** (backend logout) is independent — may run any time.
- **ORY-5.2 LAST** — the end-to-end capstone needs 4.2 + 4.3 + 5.1 (full Ory login → validation → canonical resolution → RBAC).

### Execution order

1. **ORY-4.2** — provider-driven `oidcConfig` (`VITE_OIDC_*`, `VITE_DESCOPE_*` fallback)
2. **ORY-4.3** — `useRBAC`/`useTenants` sourced from `GET /api/identity`
3. **ORY-5.1** — provider-aware logout (Ory RP-initiated + Descope management retained)
4. **ORY-5.2** — end-to-end Ory validation (capstone)

## Routing

Read `~/repos/auth/identity-stack/.claude/task-state.md`.

- **Does not exist** → pick next `pending` story (respecting dependencies), create task-state.md with `phase: setup`, execute setup.
- **phase is `complete`** → update this file (`pending` → `done`), clean up the worktree, delete task-state.md, pick next story.
- **Any other phase** → read the phase file and execute it.

Phase order: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

## Phase Instructions

Read ONLY the current phase file — do not read other phase files:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

**All work after `setup` happens in the worktree** — `cd` to the path in `worktree:` first.

## New Story Setup

When picking up a new story, create `~/repos/auth/identity-stack/.claude/task-state.md`:

```
story: <ORY-N.M>
branch: <branch from queue>
base_branch: main
worktree: /tmp/is-ory-<story>
phase: setup
epic_ref: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics-ory-sso-provider.md
context_ref: ~/repos/auth/identity-stack-planning/docs/ory-sso-provider-context.md
```

If all stories are `done`: output `<promise>LOOP_COMPLETE</promise>`

## Ory reference (live — Epic 1 / #370)

- **Authority / issuer:** `https://inspiring-nash-yli2uiwmcw.projects.oryapis.com`
- **SPA `client_id`:** `58142046-5beb-420e-a4cd-310f7263357f` — public client, PKCE S256, `token_endpoint_auth_method=none`
- **Scopes:** `openid profile email offline_access`
- **Backend already on `main`:** provider selection `app/middleware/providers.py`; `ORY_ISSUER_URL` / `ORY_AUDIENCE` wired via `app/middleware/factory.py`; provider row via `scripts/seed_ory.py`; canonical read via **`GET /api/identity`**.
- **Frontend to change:** `frontend/src/main.tsx` `oidcConfig` reads `VITE_DESCOPE_*`; `frontend/src/hooks/useRBAC.ts` / `useTenants.ts` decode the Descope `tenants`/`dct` token claim → make provider-neutral, sourced from `GET /api/identity`.

## Local test infra

- DB stack: `make test-up` (Postgres `:15432` `identity_test/identity_test`, Redis `:16379`); `make test-down` after.
- Worktrees have no `.venv` — run backend tests with the primary checkout's `.venv` python + `PYTHONPATH=<worktree>/backend` + `DATABASE_URL=postgresql+asyncpg://identity_test:identity_test@localhost:15432/identity_test`.
- Frontend: `make test-frontend` (vitest), `make test-e2e` (Playwright).

## Rules (workspace standards)

- **ONE story per iteration.** Never start a second story.
- Each story **branches from `main`** (independent, not chained); work in the worktree; **never push to `main`**; open a PR.
- **No auto-merge** — the owner reviews and merges every PR. Loops run `--no-auto-merge`.
- **This is auth-critical code.** The review phase runs the full **RED/BLUE gate** (all reviewers) — see `RED-BLUE-GATE.md`. Fail-closed on validation / audience / logout; **never regress the Descope path**.
- **Backward compatibility (NFR-8):** Descope stays a configured provider. New config is additive (`VITE_OIDC_*` with `VITE_DESCOPE_*` fallback); every existing Descope unit/integration/E2E test stays green.
- **Tests are mandatory, not optional:**
  - **Frontend stories (4.2, 4.3):** vitest unit tests **and** Playwright E2E covering the happy path **and** auth enforcement (identity-stack rule — every feature ships E2E). 4.3 mocks `GET /api/identity` for both an Ory and a Descope principal and asserts identical role/tenant rendering.
  - **Backend story (5.1):** unit tests — an Ory principal produces an RP-initiated logout (redirect to `end_session_endpoint` with `id_token_hint` + registered `post_logout_redirect_uri`); a Descope principal still triggers the management logout call.
  - **E2E story (5.2):** an integration test drives an Ory JWT through the middleware and asserts signature/`iss`/`aud` validation → JIT provisioning → correct `GET /api/identity` payload → access to an RBAC-gated route, **reusing the py-identity-model / OIDC conformance path** (no new validation logic). Gate on Ory creds (`TEST_DISCO_ADDRESS` + M2M client) so missing credentials **skip, not fail**. The Descope end-to-end path must still pass in the same suite.
- **Conventional commits** — `feat:` for new wiring, `test:` for the E2E story.
- Run `make lint` + the relevant tests before opening a PR. **Integration/E2E must pass locally**, not just in CI.
