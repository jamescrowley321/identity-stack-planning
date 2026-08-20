---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - docs/ory-sso-provider-context.md
  - docs/ory-iac-automation-plan.md
---

# Ory as a Configurable SSO Provider — Epic Breakdown

## Overview

This document decomposes the Ory-as-SSO-provider initiative into implementable epics and
stories. It follows the **lean path** prescribed by `docs/ory-sso-provider-context.md`:
epics-and-stories straight from the feeder doc, no separate PRD/architecture (the feeder doc
already carries the locked scope, current-state facts, and the resolved decisions). All code
changes land in the **identity-stack** repo (backend, frontend, and a new Ory Terraform track);
token validation reuses **py-identity-model**; nothing is added to or removed from
terraform-provider-descope.

**Framing (unchanged from the feeder doc):** make identity-stack's IdP *configurable* so an Ory
Network provider can be configured and run — **not** a Descope swap-out or migration. Descope
stays a configured provider; every change is backward-compatible provider-agnostic wiring.

**Ground truth that pins scope:**
- `backend/app/middleware/auth.py` and `middleware/claims.py` hardcode Descope's two issuer
  formats, discovery address, and audience → generalize to provider config.
- `backend/app/models/identity/provider.py` already defines `ProviderType.ory`; the `providers`
  registry (`services/provider.py`) and `IdentityProviderAdapter` ABC (`services/adapters/base.py`)
  already exist → this is an adapter + mapping + config exercise, not new architecture.
- `IdPLink` already enforces `unique(provider_id, external_sub)`; `Tenant` has **no** external-org
  column → one small Alembic migration is the only schema change.
- `frontend/src/hooks/useRBAC.ts`/`useTenants.ts` decode Descope's `tenants`/`dct` token claim, and
  `frontend/src/main.tsx` `oidcConfig` reads `VITE_DESCOPE_*` → make provider-neutral, sourced from a
  canonical `/me` endpoint.
- `backend/app/routers/auth.py` logout calls Descope Management `/v1/mgmt/user/logout` → add an Ory
  RP-initiated logout path, config-selected.

**Resolved decisions (from the feeder doc):** Ory Network (hosted, same project/tier PIM already
validates against); **JWT access tokens** validated via py-identity-model; greenfield on the Ory
side (no data migration); **standard OIDC — FAPI 2.0 is not a target**; default **tenancy is
canonical-side** (Ory Organizations adopted only if the tier includes it).

## Requirements Inventory

### Functional Requirements

FR-1: Backend token-validation issuer allow-list is **config-driven per provider**, not hardcoded to Descope's two issuer formats.
FR-2: Backend accepts and validates **Ory-issued JWT access tokens** (issuer = Ory, JWKS from Ory discovery) via py-identity-model.
FR-3: The Ory validation branch treats tokens as **standard OIDC** — it does not require or infer `dct`/`tenants`; their absence is not an error.
FR-4: The Descope validation path (dual-issuer + single-tenant `dct` inference) is **preserved unchanged** — nothing removed.
FR-5: The Tyk gateway (`middleware/claims.py`, `middleware/factory.py`) accepts Ory's issuer + JWKS alongside Descope.
FR-6: The canonical `providers` registry holds an **`ory` provider row** (`type='ory'`, `issuer_url`, `base_url`, `config_ref`); validation config is sourced from it.
FR-7: On **first Ory login**, the user is JIT-provisioned: create `users` + `idp_links(provider=ory, external_sub=sub)` and apply a default tenant/role policy.
FR-8: Per request, Ory `sub` resolves to a canonical `users.id` via `idp_links(provider=ory)` in `identity_resolution.py`.
FR-9: Tenant + roles are resolved from Postgres (`user_tenant_roles`), **not** from the Ory token.
FR-10: The `tenants` table gains a nullable `external_org_id` column mapping a canonical tenant to an Ory Organization (Alembic migration).
FR-11: An `OrySyncAdapter` implements `IdentityProviderAdapter`; `sync_user`/`delete_user` create/update/delete the Ory identity.
FR-12: `OrySyncAdapter.sync_role`/`sync_permission` (+ deletes) are **no-ops** (roles/permissions stay canonical-only), mirroring `NoOpSyncAdapter`.
FR-13: `OrySyncAdapter.sync_tenant`/`delete_tenant` create/delete an Ory **Organization** only when Organizations are enabled; otherwise no-op (canonical-side tenancy).
FR-14: Backend exposes a `/me`-style endpoint returning canonical identity (user, current tenant, tenants, roles, permissions) resolved server-side.
FR-15: Frontend `oidcConfig` (authority/issuer, `client_id`, scopes, redirect URIs) is **provider-driven configuration**, targetable at Ory.
FR-16: Frontend `useRBAC.ts`/`useTenants.ts` source roles/tenant from the canonical `/me` endpoint — provider-neutral, no Descope `tenants`/`dct` token parsing.
FR-17: Logout is **provider-aware**: `routers/auth.py` adds an Ory OIDC RP-initiated logout path, config-selected; Descope Management logout retained.
FR-18: A new Ory Terraform (`ory/ory`) track provisions `ory_project_config` with the **JWT access-token strategy**.
FR-19: The Ory IaC provisions an `ory_oauth2_client` **public/SPA client** (auth_code + PKCE, redirect URIs, scopes) for the frontend.
FR-20: The Ory IaC provisions the `ory_identity_schema` and, gated behind a flag, `ory_organization`/`ory_action`; custom domain deferred.
FR-21: An **end-to-end integration test** proves Ory login → JWT validation → canonical resolution → RBAC, reusing the proven py-identity-model / OIDC conformance path.

### NonFunctional Requirements

NFR-1: PKCE is enforced on the Ory authorization-code flow (public client, no secret).
NFR-2: Validation enforces correct `iss` (Ory issuer) and `aud` (audience-scoped) per baseline OIDC; **FAPI 2.0 is not a target**.
NFR-3: Ory secrets (project API token, OAuth2 client secrets, admin keys) live in the **Infisical** pipeline (`config_ref`) — never in Postgres or the repo.
NFR-4: Token validation **reuses py-identity-model** (>= 3.8.5, already a dependency) — no new validation code paths.
NFR-5: Adding/removing a provider requires only **config + a provider row** — no change to backend business logic or the login wiring.
NFR-6: Ory identity schemas and secrets are **create-only** in Terraform (no import) — the IaC documents this drift caveat.
NFR-7: Auth logs record provider name + user id, never token contents.
NFR-8: Existing Descope integration and its tests remain **green** (backward compatibility; no regression).

### Additional Requirements

- **Deployment:** Ory Network (hosted), the same project/tier py-identity-model validates against in CI (`TEST_DISCO_ADDRESS`). Self-hosted Hydra (`ory_create_client.sh`, `:4444/:4445`) is a **local dev fixture only** — out of scope.
- **Token strategy:** the Ory project must run the JWT access-token strategy (project-wide `strategies/access_token=jwt`, or per-client `access_token_strategy: "jwt"`); non-top-level custom claims must be allowlisted (`oauth2/allowed_top_level_claims`). The default canonical-side plan needs **no** custom claims.
- **Reuse:** py-identity-model already validates this exact Ory project's access tokens as JWTs (client-credentials, audience `https://py-identity-model`); interactive login (auth_code + PKCE) is the net-new surface.
- **Greenfield:** no Descope → Ory user/tenant/role migration.
- See `docs/ory-iac-automation-plan.md` for the concrete Terraform/automation plan backing Epic 1.

### FR Coverage Map

| FR | Epic | Notes |
|----|------|-------|
| FR-18, FR-19, FR-20 | Epic 1 | Ory Network provisioning (IaC) |
| FR-1, FR-4 | Epic 2 | Config-driven issuer allow-list; Descope path preserved |
| FR-2, FR-3 | Epic 2 | Ory JWT validation branch (standard OIDC) |
| FR-5 | Epic 2 | Ory issuer/JWKS in the Tyk gateway |
| FR-6 | Epic 2 | `ory` provider row in the registry |
| FR-7, FR-8 | Epic 3 | JIT provisioning + `sub`→canonical resolution |
| FR-9 | Epic 3, Epic 4 | Tenant/roles from Postgres; consumed by `/me` |
| FR-10 | Epic 3 | `tenants.external_org_id` migration |
| FR-11, FR-12, FR-13 | Epic 3 | OrySyncAdapter |
| FR-14 | Epic 4 | Canonical `/me` endpoint |
| FR-15, FR-16 | Epic 4 | Provider-neutral frontend |
| FR-17 | Epic 5 | Provider-aware logout |
| FR-21 | Epic 5 | End-to-end Ory validation |

## Epic List

### Epic 1: Ory Network Provisioning (IaC)
Stand up the Ory Network OAuth2/OIDC surface via a new `ory/ory` Terraform track — JWT
access-token strategy, a public SPA client (auth_code + PKCE), and the identity schema — with all
secrets in Infisical, so identity-stack has a real Ory issuer, `client_id`, and JWKS to target.
Descope IaC is untouched. Detailed plan: `docs/ory-iac-automation-plan.md`.
**FRs covered:** FR-18, FR-19, FR-20

### Epic 2: Config-Driven Backend Token Validation
Generalize the backend's Descope-hardcoded issuer allow-list, discovery address, and audience into
provider-config-driven validation, register the `ory` provider, and add an Ory branch that
validates Ory JWT access tokens as standard OIDC — while leaving the Descope path and its tests
unchanged.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6

### Epic 3: Canonical Identity Resolution, JIT Provisioning & Ory Adapter
Resolve Ory `sub` to a canonical user (JIT-provisioning greenfield users), resolve tenant+roles
from Postgres rather than the token, add the tenant↔Ory-org mapping column, and provide an
`OrySyncAdapter` for outbound canonical→Ory sync with roles/permissions staying canonical.
**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13

### Epic 4: Provider-Agnostic Frontend & Canonical Claims
Serve roles/tenant from the canonical model via a `/me`-style endpoint, make the frontend OIDC
config provider-driven (targetable at Ory), and rewire `useRBAC`/`useTenants` to consume canonical
claims instead of parsing Descope's token claim.
**FRs covered:** FR-9, FR-14, FR-15, FR-16

### Epic 5: Provider-Aware Logout & End-to-End Ory Validation
Make logout provider-aware (add Ory RP-initiated logout, keep Descope Management logout), then
prove the whole Ory path end to end with an integration test that reuses the OIDC conformance /
py-identity-model path.
**FRs covered:** FR-17, FR-21

---

## Epic 1: Ory Network Provisioning (IaC)

Stand up the Ory Network OAuth2/OIDC surface declaratively via a new `ory/ory` Terraform track,
so identity-stack has a real Ory issuer, public SPA `client_id`, and JWKS to point at. Secrets flow
through Infisical; the Descope Terraform track is untouched. See `docs/ory-iac-automation-plan.md`
for the full resource inventory, credential model, and CI automation.

### Story 1.1: Ory Terraform track scaffold + project config with JWT access tokens

As a platform engineer,
I want a new `ory/ory` Terraform module wired to the Ory Network project with the JWT access-token strategy enabled,
So that identity-stack can validate Ory access tokens locally as JWTs (the strategy PIM already relies on).

**FRs:** FR-18

**Acceptance Criteria:**

- [ ] A new Terraform track exists under identity-stack infra (e.g. `infra/ory/`), pinned to the `ory/ory` provider (v26.3.x) and targeting Ory Network (SaaS).
- [ ] `ory_project_config` (or an `ory patch` equivalent captured in code) sets the OAuth2 access-token strategy to `jwt` project-wide — matching the project py-identity-model already validates.
- [ ] `oauth2/allowed_top_level_claims` is set to the allowlist required by the chosen tenancy model (empty beyond standard OIDC for the default canonical-side plan).
- [ ] Ory Network API token / admin credentials are read from Infisical (via env/`config_ref`), never written to `.tf` or committed (NFR-3).
- [ ] `terraform plan` runs clean against the project; the module README documents that identity schemas and secrets are create-only / no-import (NFR-6).
- [ ] The terraform-provider-descope track is not modified (NFR-8).

### Story 1.2: Ory public SPA OAuth2 client (auth_code + PKCE)

As a platform engineer,
I want an `ory_oauth2_client` public client configured for authorization_code + PKCE with the SPA redirect URIs,
So that the identity-stack frontend can perform interactive Ory login.

**FRs:** FR-19

**Acceptance Criteria:**

- [ ] An `ory_oauth2_client` is created with `grant_types = ["authorization_code","refresh_token"]`, `response_types = ["code"]`, and `token_endpoint_auth_method = "none"` (public client).
- [ ] PKCE is required (no client secret) — the client cannot complete a code exchange without a valid PKCE verifier (NFR-1).
- [ ] `redirect_uris` include the frontend origin(s) — localhost dev plus the configured deploy origin — and `post_logout_redirect_uris` are set for RP-initiated logout (feeds Epic 5).
- [ ] `scope` includes `openid profile email offline_access`.
- [ ] The client issues JWT access tokens (inherits the project-wide strategy, or sets `access_token_strategy = "jwt"` on the client).
- [ ] `client_id` and the project issuer/discovery URL are exposed as Terraform outputs for app config; no client secret is emitted (public client).

### Story 1.3: Ory identity schema + flag-gated Organizations

As a platform engineer,
I want the Ory identity schema provisioned in Terraform, with Organizations/actions gated behind a flag,
So that identity traits are declarative and B2B orgs are adopted only if the tier includes them.

**FRs:** FR-20

**Acceptance Criteria:**

- [ ] `ory_identity_schema` defines traits `email` (required, unique), `given_name`, `family_name` — SCIM-aligned with canonical `users`.
- [ ] Organizations are gated by a Terraform variable `enable_organizations` (default `false`); when `false`, no `ory_organization` resources are created (canonical-side tenancy — the default); when `true`, an example `ory_organization` (and optional `ory_action`) is provisioned.
- [ ] `ory_custom_domain` (branded `iss`) is documented as deferred / out of MVP scope, not provisioned.
- [ ] The module README records the `[CONFIRM]` on the Organizations tier and describes both paths (canonical-side default vs Organizations).
- [ ] `terraform plan`/`apply` succeeds with `enable_organizations = false` and creates only schema + client + project config.

---

## Epic 2: Config-Driven Backend Token Validation

Generalize the Descope-hardcoded validation (issuer allow-list, discovery address, audience) into
provider-config-driven validation, register the `ory` provider in the canonical registry, and add
an Ory branch that validates Ory JWT access tokens as standard OIDC. The Descope path and every
existing Descope test remain unchanged.

### Story 2.1: Register the `ory` provider in the canonical registry

As a platform admin,
I want an `ory` provider row registered in the canonical `providers` registry with its issuer/base URL and Infisical `config_ref`,
So that backend token validation can source Ory's issuer and discovery from config rather than code.

**FRs:** FR-6

**Acceptance Criteria:**

- [ ] A seed/config path registers a `Provider` row with `type=ProviderType.ory`, `issuer_url` (the Ory project issuer), `base_url`, and `config_ref` (Infisical), via `ProviderService.register_provider`.
- [ ] `ProviderService.list_providers()` returns both the Descope and Ory rows, and `get_provider_capabilities` reflects JWT validation for Ory.
- [ ] Ory secrets are referenced only by `config_ref`; no secret value is stored in Postgres (NFR-3).
- [ ] Unit test: registering then listing the `ory` provider round-trips `issuer_url`/`base_url`/`config_ref`; the Descope row is unaffected.

### Story 2.2: Config-driven issuer allow-list in TokenValidationMiddleware

As a backend developer,
I want `TokenValidationMiddleware` to build its accepted issuers, discovery address, and audience from provider config instead of hardcoded Descope constants,
So that any configured OIDC provider can be validated without editing the middleware.

**FRs:** FR-1, FR-4

**Acceptance Criteria:**

- [ ] `TokenValidationMiddleware` is initialized from a collection of provider validation configs (label, accepted issuers, disco address, audience) rather than only `descope_project_id`.
- [ ] The Descope entry reproduces today's behavior exactly: both issuer formats (`.../{pid}` and `.../v1/apps/{pid}`), the Descope disco address, `aud`=project_id, and single-tenant `dct` inference from `tenants`.
- [ ] The middleware selects the matching provider config by the token's `iss` before validating; an `iss` matching no configured provider is rejected with 401.
- [ ] No Descope-specific literal is required for the middleware to function — Descope is one configured entry among others (NFR-5).
- [ ] All existing Descope unit/integration tests pass unchanged (NFR-8).

### Story 2.3: Ory JWT validation branch (standard OIDC)

As a backend developer,
I want the middleware to validate Ory JWT access tokens against the Ory issuer + JWKS via py-identity-model, treating them as standard OIDC,
So that Ory tokens authenticate without expecting Descope-shaped claims.

**FRs:** FR-2, FR-3

**Acceptance Criteria:**

- [ ] When `iss` matches the configured Ory issuer, the middleware validates the signature via Ory discovery/JWKS and enforces `iss` + audience per baseline OIDC (NFR-2), reusing `py_identity_model` `validate_token` — no new validation code (NFR-4).
- [ ] The Ory branch does not require or infer `dct`/`tenants`; their absence is not an error (FR-3).
- [ ] `request.state.principal` is set via `to_principal(claims, "Ory")`; `request.state.tenant_id` is left `None` here and populated by canonical resolution (Epic 3), not read from the token.
- [ ] DPoP posture is `[CONFIRM]` and defaults **off**; the code path does not require DPoP.
- [ ] Unit tests: a valid Ory JWT passes; wrong `iss` → 401; wrong/missing `aud` → 401; a valid Ory JWT with no `dct`/`tenants` still passes.

### Story 2.4: Ory issuer + JWKS in the Tyk gateway

As a platform engineer,
I want the Tyk gateway claim validation to accept Ory's issuer + JWKS alongside Descope,
So that gateway-fronted routes admit Ory tokens.

**FRs:** FR-5

**Acceptance Criteria:**

- [ ] `middleware/claims.py` `_accepted_issuers` is sourced from provider config (Descope + Ory), not a Descope-only literal.
- [ ] The gateway JWKS/issuer configuration (`middleware/factory.py` / Tyk `openid_options`) includes the Ory discovery endpoint.
- [ ] Descope gateway validation behavior is unchanged (NFR-8).
- [ ] Test: an Ory JWT passes gateway claim validation; an unknown-issuer token is rejected.

---

## Epic 3: Canonical Identity Resolution, JIT Provisioning & Ory Adapter

Map validated Ory `sub` to a canonical user (JIT-provisioning greenfield users), resolve tenant +
roles from Postgres, add the tenant↔Ory-org mapping column, and provide an `OrySyncAdapter` whose
role/permission methods are no-ops (RBAC stays canonical).

### Story 3.1: Resolve Ory `sub` → canonical user via idp_links

As a backend developer,
I want `IdentityResolutionService.resolve` to map an Ory `(provider=ory, sub)` to a canonical `users.id` through `idp_links`,
So that requests bearing Ory tokens identify a canonical user.

**FRs:** FR-8

**Acceptance Criteria:**

- [ ] `resolve(provider="ory", sub=...)` looks up `idp_links` by `(provider_name=ory, external_sub=sub)` using the existing `get_by_provider_name_and_sub` and returns the linked `users.id`.
- [ ] The resolution cache key includes the provider so Descope and Ory `sub` values never collide.
- [ ] The returned identity payload sources roles/tenant from canonical tables, not the token.
- [ ] Unit test: an existing Ory link resolves to the correct user; an unknown Ory `sub` returns a not-found result (consumed by JIT in Story 3.2).

### Story 3.2: JIT-provision Ory users on first login

As a new Ory user,
I want my canonical user and idp_link created automatically on first login with a default tenant/role,
So that greenfield Ory users can use the app without manual provisioning.

**FRs:** FR-7

**Acceptance Criteria:**

- [ ] On a resolve miss for `(ory, sub)`, a JIT path creates a `users` row (email/given_name/family_name from validated claims) plus an `idp_links` row `(provider=ory, external_sub=sub, external_email)`.
- [ ] A configurable default policy assigns a default tenant + role via `user_tenant_roles` (greenfield default).
- [ ] Provisioning is idempotent under the `unique(provider_id, external_sub)` constraint — concurrent first requests for the same `sub` do not double-create (one row wins, the other resolves to it).
- [ ] JIT is gated by config: default-on for the Ory provider, off for the Descope path.
- [ ] Logs record provider + new user id, never token contents (NFR-7).
- [ ] Integration test: the first Ory request provisions exactly one user + link + default role; the second request reuses them.

### Story 3.3: Tenant↔Ory-Organization mapping column

As a platform admin,
I want a nullable `tenants.external_org_id` column added via Alembic,
So that a canonical tenant can map to an Ory Organization when Organizations are in scope.

**FRs:** FR-10

**Acceptance Criteria:**

- [ ] An Alembic migration adds a nullable, indexed `external_org_id` (string) to `tenants`; the downgrade drops it.
- [ ] The column is unused by default (canonical-side tenancy) — no behavior change when Organizations are off.
- [ ] The `Tenant` model and its repository read/write the field.
- [ ] The migration is tested up and down on a fresh database; existing tenant rows are unaffected.

### Story 3.4: OrySyncAdapter — user sync + canonical-only roles/permissions

As a platform admin,
I want an `OrySyncAdapter` implementing `IdentityProviderAdapter` that syncs users to Ory and no-ops roles/permissions,
So that admin writes provision Ory identities while RBAC stays canonical.

**FRs:** FR-11, FR-12

**Acceptance Criteria:**

- [ ] `OrySyncAdapter(IdentityProviderAdapter)` implements every ABC method, returning `Result[None, SyncError]` and never raising for domain errors.
- [ ] `sync_user`/`delete_user` create/update/delete the Ory identity via the Ory Admin API (client configured from `config_ref`).
- [ ] `sync_role`/`sync_permission` and their deletes are no-ops returning `Ok(None)` (mirrors `NoOpSyncAdapter`) — roles/permissions stay canonical (FR-12).
- [ ] The adapter is registered so a `type=ory` provider resolves to `OrySyncAdapter`, while a `type=descope` provider still resolves to the Descope adapter (NFR-8).
- [ ] Unit tests: `sync_user` success; `sync_user` on an Ory API error returns `Error(SyncError)`; role/permission methods assert `Ok(None)` with no Ory API call.

### Story 3.5: OrySyncAdapter tenant sync gated on Organizations

As a platform admin,
I want `OrySyncAdapter.sync_tenant`/`delete_tenant` to create/delete an Ory Organization only when Organizations are enabled,
So that tenancy defaults cleanly to canonical-side.

**FRs:** FR-13

**Acceptance Criteria:**

- [ ] When `enable_organizations` is false (default), `sync_tenant`/`delete_tenant` are no-ops returning `Ok(None)`.
- [ ] When true, `sync_tenant` creates/updates an Ory Organization and persists its id to `tenants.external_org_id`; `delete_tenant` removes the org.
- [ ] `sync_role_assignment` optionally mirrors membership into the org when enabled; the canonical copy remains authoritative.
- [ ] Unit tests cover both the org-enabled and org-disabled paths.

---

## Epic 4: Provider-Agnostic Frontend & Canonical Claims

Serve RBAC data from the canonical model via a `/me` endpoint, make the frontend OIDC config
provider-driven, and rewire the RBAC/tenant hooks to consume canonical claims instead of decoding
the Descope token.

### Story 4.1: Canonical `/me` identity endpoint

As a frontend developer,
I want a backend `/me` endpoint returning the canonical user, current tenant, tenants, roles, and permissions resolved server-side,
So that the UI gets provider-neutral RBAC data regardless of IdP.

**FRs:** FR-14, FR-9

**Acceptance Criteria:**

- [ ] `GET /me` (authenticated) returns `{ user: {id,email,given_name,family_name}, current_tenant, tenants: [...], roles: [...], permissions: [...] }` resolved from canonical tables via `IdentityResolutionService`.
- [ ] Roles/tenant come from `user_tenant_roles` in Postgres, never from the token (FR-9).
- [ ] The endpoint returns identical shapes for Descope- and Ory-authenticated principals (provider-neutral).
- [ ] Unauthenticated requests get 401.
- [ ] Integration test: an Ory principal and a Descope principal both receive correct canonical `/me` payloads.

### Story 4.2: Provider-driven frontend OIDC config

As a frontend developer,
I want `oidcConfig` (authority, client_id, scope, redirect_uri) sourced from provider-neutral env vars,
So that the SPA can target Ory (or any OIDC provider) by configuration.

**FRs:** FR-15

**Acceptance Criteria:**

- [ ] `main.tsx` `oidcConfig` reads generic vars (e.g. `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPE`), retaining the existing `VITE_DESCOPE_*` vars as back-compat fallbacks (NFR-8).
- [ ] Setting the vars to the Ory issuer + SPA `client_id` (Epic 1 outputs) points login at Ory, and the auth_code + PKCE flow via `oidc-client-ts` completes end to end (NFR-1).
- [ ] `scope` includes `openid profile email offline_access`; `redirect_uri` matches the Ory client's registered redirect URIs.
- [ ] No provider name is hardcoded in the login wiring (NFR-5).

### Story 4.3: Provider-neutral useRBAC/useTenants from `/me`

As a frontend developer,
I want `useTenants`/`useRBAC` to read roles/tenant from `/me` instead of decoding the Descope `tenants`/`dct` token claim,
So that RBAC works for any provider.

**FRs:** FR-16

**Acceptance Criteria:**

- [ ] `useTenants` fetches `/me` and exposes `currentTenantId` + `tenants[]` from the canonical payload; the `jwtDecode` of `tenants`/`dct` is removed.
- [ ] `useRBAC` derives `roles`/`permissions`/`isOwner`/`isAdmin` from the `/me` data; the public API consumed by components is unchanged.
- [ ] A Descope-authenticated session renders the same tenant/role UI as before, now sourced canonically (NFR-8).
- [ ] Frontend unit tests are updated to mock `/me` for both Ory and Descope and assert roles/tenant rendering.

---

## Epic 5: Provider-Aware Logout & End-to-End Ory Validation

Make logout provider-aware, then prove the entire Ory path end to end with an integration test that
reuses the proven py-identity-model / OIDC conformance path.

### Story 5.1: Provider-aware logout with Ory RP-initiated path

As an Ory-authenticated user,
I want logout to perform Ory OIDC RP-initiated logout,
So that my session ends at the provider correctly.

**FRs:** FR-17

**Acceptance Criteria:**

- [ ] `routers/auth.py` selects the logout strategy by the principal's provider (from the provider registry/config).
- [ ] The Ory path performs OIDC RP-initiated logout — redirect to Ory's `end_session_endpoint` with `id_token_hint` and a registered `post_logout_redirect_uri` (matching Epic 1's client config).
- [ ] The Descope path (`/v1/mgmt/user/logout`) is retained unchanged for Descope principals (NFR-8).
- [ ] No provider is hardcoded on the shared logout entrypoint (NFR-5).
- [ ] Unit tests: an Ory principal produces an RP-initiated logout response; a Descope principal triggers the management logout call.

### Story 5.2: End-to-end Ory validation + conformance reuse

As a maintainer,
I want an integration test proving Ory login → JWT validation → canonical resolution → RBAC, reusing the py-identity-model path,
So that the Ory provider is verified like every other provider.

**FRs:** FR-21

**Acceptance Criteria:**

- [ ] An integration test drives an Ory JWT (from the same Ory project PIM validates against, or a local Hydra dev fixture) through the middleware and asserts: signature/`iss`/`aud` validation, JIT provisioning, a correct canonical `/me`, and access to an RBAC-gated route.
- [ ] The test reuses the existing py-identity-model / OIDC conformance integration path rather than new validation logic (NFR-4).
- [ ] The Descope end-to-end path still passes in the same suite (NFR-8).
- [ ] The test runs in CI wired like PIM's Ory integration (`TEST_DISCO_ADDRESS` and the M2M client creds), gated so missing Ory credentials skip rather than fail spuriously.

---

## Open Questions (carried from the feeder doc)

- **[CONFIRM] Organizations tier** — is the same-as-PIM Ory project on a paid tier with
  Organizations (SAML is Enterprise-only)? Default plan models tenancy **canonical-side** and treats
  Ory purely as the authN/`sub` source; Organizations stories (1.3 flag, 3.5) are gated off by
  default and only exercised if the tier includes it.
- **[CONFIRM] DPoP** — Ory Network DPoP support on the plan? Default **off**; baseline OIDC + PKCE
  only (FAPI 2.0 is not a target).
- **[DEFERRED] Custom domain** — a branded `iss` via `ory_custom_domain` is a nice-to-have, not
  MVP-required.
- **Kratos self-service flows** — start OIDC-only (Hydra) for the app boundary; adopting Kratos
  login/registration/recovery UX is a phase-2 decision, out of scope here.
</content>
</invoke>
