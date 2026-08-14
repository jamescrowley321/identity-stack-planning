---
workflowType: 'research'
doc_type: 'planning-input'
project_name: 'identity-stack'
user_name: 'James'
date: '2026-08-13'
status: 'draft'
purpose: >-
  Pre-BMAD context + technical research for adopting Ory Network as the SSO
  provider for identity-stack. Intended as an inputDocument for
  /bmad-create-product-brief and the downstream PRD / architecture workflows.
---

# Ory as SSO Provider — Planning Context & Technical Research

**Author:** James
**Date:** 2026-08-13
**Status:** Draft (pre-BMAD input)

## Purpose

This is a **feeder document** for the BMAD planning flow, not a finished artifact. It
captures the locked scope, the current-state facts from our own repos, an Ory
technical primer, and the key decisions the product brief / PRD / architecture
workflows will need to resolve. Reference it as an `inputDocument` when running
`/bmad-create-product-brief`.

## Locked Scope

- **Goal: make `identity-stack`'s IdP configurable so an Ory provider can be dropped in and the
  app is up and running.** A few spots hardcode Descope (issuer allow-list, frontend claim
  parsing, logout); generalize those to provider config, then configure Ory Network and run.
  This is **provider-agnostic wiring — not a swap-out or migration.**
- **Descope is not being removed.** It stays a configured provider; the work is making the
  wiring provider-driven so Ory (or any OIDC provider) can be configured alongside it.
- **Greenfield on the Ory side** — Ory starts empty; **no user/tenant/role data migration.**
- **Standard OIDC — FAPI 2.0 is NOT a target.** Baseline OIDC hardening (PKCE, correct
  `iss`/`aud`) applies; FAPI profiles are out of scope.
- **Ory Network** (hosted) — same project/tier as PIM. Self-hosted Ory is out of scope
  (local Hydra is only PIM's dev fixture).

## Scope at a Glance (TL;DR)

`identity-stack` is already mostly provider-agnostic — this is a small, config-driven change.

**Already generic (no work):**
- Frontend login = standard OIDC (`react-oidc-context` / `oidc-client-ts`) — auth_code + PKCE,
  just config-pointed at Descope today.
- Token validation = `py-identity-model` — the exact path PIM already runs against this Ory project.
- Canonical model already has a provider registry, an `IdentityProviderAdapter` interface, and
  `ProviderType.ory` in the enum.

**The whole job — generalize three Descope-hardcoded spots to config:**
1. `backend/app/middleware/auth.py` — issuer allow-list hardcodes Descope's two issuer formats →
   make config-driven, add Ory's issuer/discovery.
2. `frontend/src/hooks/useRBAC.ts` + `useTenants.ts` — read Descope's `tenants` claim → source
   roles/tenant from the canonical model (provider-neutral).
3. `backend/app/routers/auth.py` — logout calls Descope's Management API → add an Ory RP-initiated
   logout path, selected by config.

**Then configure Ory & run:** an `ory_oauth2_client` (SPA, auth_code + PKCE) + provider config via
the `ory/ory` Terraform provider; point config at Ory; up and running. **Descope stays a configured
provider — nothing is removed.**

## Why This Is Tractable (current-state facts)

The identity-stack platform was already architected for a swappable IdP. Ory is the
first real exercise of seams that already exist:

| Seam (already built) | Where | What Ory needs |
|---|---|---|
| Provider-agnostic token stack (discovery, JWKS, JWT validation) | `py-identity-model` | Configuration, not a rewrite — point discovery/JWKS at Ory |
| `IdentityProviderAdapter` ABC + provider-config CRUD + IdP-link tables (JSONB) | `identity-stack` canonical model (PRD 5, **Done**) | A new **Ory adapter** alongside the existing Descope adapter |
| Issuer allow-list for inbound JWTs | `identity-stack/backend/app/middleware/auth.py` (`_accepted_issuers`, currently Descope's two issuer formats) | Generalize to accept Ory's issuer + per-issuer JWKS/claim mapping |
| Gateway JWT validation (signature/issuer/aud) | `identity-stack/backend/app/middleware/{factory,claims}.py` (Tyk) | Add Ory JWKS + issuer to gateway config |
| IaC for the IdP | `terraform-provider-descope` (Descope-only) | New IaC track — Ory ships its own `ory/ory` Terraform provider |

**Implication:** the heavy lift is not application rewiring — it's (a) the Ory-side
configuration/IaC, (b) an Ory claim→canonical mapping, and (c) the token-model decision
below.

## Ory Technical Primer

Ory Network bundles Ory's open-source projects as a managed platform. For "SSO provider"
the relevant pieces are:

- **Ory Hydra** — OAuth2 + OpenID Connect **certified** provider. Issues OIDC ID tokens
  (JWT) and OAuth2 access tokens. **Access tokens are opaque by default** (validated via
  RFC 7662 introspection); can be configured to issue **JWT access tokens** instead.
  Supports PKCE, client credentials, refresh (`offline_access`, rotation on by default), and
  revocation. **JWT access tokens** are enabled project-wide
  (`ory patch oauth2-config .../strategies/access_token="jwt"`) or per client
  (`access_token_strategy: "jwt"`); custom claims are added at consent and non-top-level claims
  must be allowlisted (`oauth2/allowed_top_level_claims`). (FAPI-capable, but FAPI is out of scope.)
- **Ory Kratos** — identity store + self-service flows (login, registration, recovery,
  verification, MFA, profile). Owns the user database and session model (Ory sessions via
  cookie or `X-Session-Token`), distinct from Hydra's OAuth2 tokens. Also brokers **social
  sign-in** and **enterprise SSO** connections (upstream Google/Entra/Okta/SAML/OIDC).
- **Ory Keto** — Zanzibar-style relationship/permission engine (optional here; relevant
  only if we push authorization decisions into Ory rather than the canonical model).
- **Ory Oathkeeper** — zero-trust access proxy / decision API (optional; overlaps with our
  existing Tyk gateway — likely *not* adopted).
- **Organizations** — Ory Network's B2B construct: each org holds one or more OIDC/SAML SSO
  connections plus its own members; the closest analog to Descope's tenant model. **Paid
  feature** — B2B orgs start on a paid tier (small org cap; Enterprise = unlimited; **SAML
  connections are Enterprise-only**). Exact tier/caps are version-sensitive — **[CONFIRM in your
  Ory console]**. See the tenancy mapping for the canonical-side fallback if unavailable.
- **Issuer / custom domain** — default OAuth2 issuer is `https://<project-slug>.projects.oryapis.com`;
  a **custom domain** (paid tier) yields a branded `iss` + discovery URL, Terraform-managed via
  `ory_custom_domain`. Nice-to-have, not MVP-required.
- **Terraform** — official `ory/ory` provider (Ory Network SaaS only; v26.3.1, 2026-08-13)
  covers what we need: `ory_project_config`, `ory_oauth2_client`, `ory_organization`,
  `ory_identity_schema`, `ory_social_provider`/`ory_saml_provider`, `ory_custom_domain`,
  `ory_action`, plus data sources. Caveat: identity schemas, API-key values, and secrets
  **cannot be imported** (create-only / drift-managed).

## Descope → Ory Shape Differences (feeds the canonical mapping)

| Concern | Descope (today) | Ory Network (target) |
|---|---|---|
| Token delivery | Issues session **JWTs** directly | OIDC via Hydra: **ID token = JWT**, **access token = opaque unless JWT enabled** |
| Issuer | Two formats (`api.descope.com/{pid}`, `.../v1/apps/{pid}`) | Project slug URL or custom domain (single, OIDC-compliant `iss`) |
| Tenancy claim | Native `dct` (current tenant) + `tenants` map w/ roles/permissions | No native equivalent — model via **Organizations** and/or custom claims (Jsonnet) → canonical `IdentityProviderAdapter` |
| Roles/permissions in token | In `tenants` map | Custom claims mapping, or resolved server-side against the canonical model / Keto |
| Login/self-service UI | Descope hosted flows | Kratos self-service flows (hosted or embedded) |

## The Five Decisions (for the brief / architecture to resolve)

1. **Deployment** — Ory Network (hosted) vs self-hosted OSS.
   **RESOLVED (2026-08-14):** **Ory Network** — the same project/tier `py-identity-model`
   already uses as its default CI integration provider (wired via the `TEST_DISCO_ADDRESS`
   secret). Self-hosted Hydra stays a local dev fixture only (PIM's `ory_create_client.sh`,
   Hydra `:4444`/`:4445`).
2. **Token model** — opaque access tokens + introspection **vs** JWT access tokens +
   local validation.
   **RESOLVED (2026-08-14):** **JWT access tokens.** PIM already validates this Ory project's
   access tokens *as JWTs* (client-credentials, audience-scoped), so `identity-stack` reuses
   the exact `py-identity-model` validation path pointed at Ory. Trade-off noted: local
   validation weakens instant revocation.
3. **Login/session source** — consume Ory purely as an **OIDC provider (Hydra)**, or also
   adopt **Kratos self-service flows** for login/registration/recovery.
   *Lean:* start OIDC-only (Hydra) for the app boundary; treat Kratos flows as a phase-2
   UX decision.
4. **Tenancy mapping** — how Ory **Organizations** map onto canonical tenants + roles.
   **Pre-answered below** (see "Tenancy & Domain Mapping"): Ory owns authN/`sub`; the
   canonical Postgres model stays authoritative for tenants/roles; tokens stay standard
   OIDC. Remaining sub-item: add a `tenants`→Ory-org id mapping column.
5. **IaC** — stand up an **`ory/ory` Terraform** track (SaaS-only, v26.3.1) parallel to
   `terraform-provider-descope`: `ory_project_config` (incl. JWT access-token strategy),
   `ory_oauth2_client` (the SPA public client), `ory_identity_schema`, optional
   `ory_organization`/`ory_action`, and `ory_custom_domain`. Secrets → Infisical (`config_ref`).
   Note: identity schemas + secrets are create-only (no import).

### Confirmed from PIM configuration (2026-08-14)

"Same plan as PIM" pins several items from ground truth:

- **Provider:** an **Ory Network** project (Hydra OAuth2) — the default CI integration
  provider for `py-identity-model` (discovery via the `TEST_DISCO_ADDRESS` secret).
- **Token model:** **JWT access tokens**, audience-scoped — PIM validates them today, so the Ory
  project already runs the `access_token=jwt` strategy. Ensure the new SPA client also issues
  JWTs (project-wide strategy, or `access_token_strategy: "jwt"` on the client).
- **Reuse:** `identity-stack` already depends on `py-identity-model` (>= 2.1.0) for token
  validation, so Ory validation is *config + reuse of a path already proven against this
  exact Ory project* — not new validation code.
- **Net-new for SSO (beyond PIM):** PIM exercises only **client-credentials (M2M)** — it never
  drove interactive login. But the `identity-stack` **frontend already does authorization_code +
  PKCE via standard OIDC** (`react-oidc-context` + `oidc-client-ts` in `frontend/src/main.tsx`),
  currently pointed at Descope. The login *mechanism* already exists; the net-new work is:
  1. Register an Ory **public/SPA OAuth2 client** (auth_code + PKCE, redirect URIs) — IaC.
  2. Make the frontend `oidcConfig` **provider-driven config** (authority/issuer, `client_id`,
     scopes) so it targets whichever provider is configured — set it to Ory.
  3. Make claim/role/tenant resolution **provider-agnostic**: `frontend/src/hooks/useRBAC.ts`
     and `useTenants.ts` read Descope's `tenants` claim today; source roles/tenant from the
     canonical model (a `/me`-style endpoint) so it works for any OIDC provider.
  4. Make **logout** provider-aware: `backend/app/routers/auth.py` hardcodes Descope Management
     `/v1/mgmt/user/logout`; add an Ory path (OIDC RP-initiated logout) selected by config.

## Tenancy & Domain Mapping: Ory → Canonical Model (pre-answered)

Grounded in the **real** canonical schema (`identity-stack/backend/app/models/identity/`).
The `ProviderType` enum already includes `ory`, and the `IdentityProviderAdapter` ABC already
defines the sync surface — so this is an adapter + mapping exercise, not new architecture.

### Direction of truth (greenfield)

- **Ory owns authentication** — credentials, login/MFA/recovery, and the `sub` identity.
- **The canonical Postgres model owns authorization** — `roles`, `permissions`, and
  per-tenant assignments (`user_tenant_roles`) remain the RBAC source of truth.
- This is *cleaner than the Descope setup*, where tenants/roles lived in the IdP. With Ory
  greenfield, Ory tokens stay standard OIDC (`sub`/`email`/standard claims); the app resolves
  tenant + roles from Postgres. **No `dct`/`tenants`-style custom claims required.**

### Entity mapping

| Ory concept | Canonical table / field | Notes |
|---|---|---|
| Ory identity (Kratos) / OIDC `sub` | `idp_links.external_sub` (`provider_id` → the `ory` provider) → `users.id` | Unique `(provider_id, external_sub)` already enforced |
| Ory identity email / traits | `users.email`, `given_name`, `family_name`; `idp_links.external_email` | `users` is SCIM-aligned |
| Ory **Organization** (B2B) | `tenants` (`name`, `domains[]`, `status`) | **Gap:** `tenants` has no `external_id`/metadata column for the Ory org id — needs a migration or a tenant-level link |
| Ory project / OAuth2 issuer | `providers` row: `type='ory'`, `issuer_url`, `base_url`, `config_ref` (Infisical) | `config_ref` keeps secrets out of Postgres |
| Roles / permissions | `roles`, `permissions`, `user_tenant_roles` — **stay canonical** | Not pushed to Ory; resolved server-side post-auth |

### Token → canonical resolution (per request)

1. Validate the Ory JWT (issuer = Ory, JWKS from Ory discovery) — add an Ory branch to
   `_accepted_issuers` in `middleware/auth.py`; the Ory branch does **not** expect
   `dct`/`tenants`.
2. `sub` → `idp_links (provider=ory, external_sub=sub)` → `users.id` (via
   `services/identity_resolution.py`). **JIT-provision on first login** (greenfield: every
   user): create `users` + `idp_links`, apply a default tenant/role policy.
3. Resolve **tenant + roles** from `user_tenant_roles` in Postgres — *not* from the token.

### OrySyncAdapter (implements `IdentityProviderAdapter`)

Outbound canonical→Ory sync for admin writes. Greenfield means no Descope import; the adapter
provisions Ory state as the canonical model changes:

| ABC method | Ory behavior |
|---|---|
| `sync_user` / `delete_user` | Create/update/delete the Ory identity |
| `sync_tenant` / `delete_tenant` | Create/delete an Ory **Organization** (if Organizations in scope) |
| `sync_role_assignment` / `delete_role_assignment` | Optional — mirror membership into the Ory org; **authoritative copy stays canonical** |
| `sync_role` / `sync_permission` (+ deletes) | **No-op** (`Ok(None)`) — roles/permissions are canonical-only, like `NoOpSyncAdapter` |

### Schema/decision fallout for the architecture step

- **Tenant↔Org storage:** add `tenants.external_org_id` (or a tenant-level idp-link table) so
  canonical tenants map to Ory Organizations. Small Alembic migration.
- **Roles in tokens:** default is *resolve server-side* (recommended). Add Ory Jsonnet claim
  mapping only if a downstream (e.g. the Tyk gateway) must authorize from the token alone,
  without a canonical lookup.
- **Organizations dependency:** if Ory Organizations isn't on the plan, model tenancy entirely
  canonical-side and treat Ory purely as the authN/`sub` source — **[CONFIRM plan]**.

## Security & Conformance Notes (ties to ongoing security work)

- Ory Hydra is **OpenID Certified** (standard OIDC). **FAPI 2.0 is not a target** for this
  initiative — baseline OIDC hardening only. (The existing FAPI2-hardening / conformance
  harness work in `py-identity-model` is unaffected by this initiative.)
- Enforce **PKCE** on the auth-code flow; decide DPoP posture (py-identity-model supports
  DPoP) — **[CONFIRM Ory Network DPoP support on plan]**.
- Secrets (Ory API keys / OAuth2 client secrets) belong in the **Infisical** secrets
  pipeline (per PRD 1 / architecture-infrastructure-secrets), never in Postgres or repo.
- Reuse the OIDC **conformance harness** to validate Ory the same way other providers are
  validated.

## Open Questions to Confirm With James

- **[CONFIRM]** Is the "same-as-PIM" Ory project on a **paid tier with Organizations**?
  Organizations is a paid feature (SAML = Enterprise-only); PIM needs only client-credentials, so
  its project may be free/dev tier *without* Organizations. **Default plan: model tenancy
  canonical-side** (Ory = authN/`sub` only); adopt Ory Organizations only if the tier already
  includes it. The tenancy mapping section covers both paths.
- **RESOLVED (2026-08-14)** Deployment = **Ory Network** (same project/tier as PIM CI);
  self-hosted Hydra is a local dev fixture only.
- **RESOLVED (2026-08-14)** Token model = **JWT access tokens**, validated via
  `py-identity-model` (the path PIM already runs against this Ory project).
- **RESOLVED (2026-08-13)** Greenfield on the Ory side — no user/tenant/role data migration.
  Descope stays a configured provider; this is provider-agnostic wiring, not a swap-out.
- **RESOLVED (2026-08-13)** Standard OIDC — FAPI 2.0 is not a target.

## Suggested Initiative Framing & BMAD Entry

- **Sizing: small.** Generalize three hardcoded spots + configure Ory. Likely a lightweight
  epic / handful of stories — **a full PRD is optional, not required.** Touches `identity-stack`
  (provider config in middleware, frontend, and logout, plus an Ory adapter) and a small **Ory
  IaC** addition; reuses `py-identity-model` for validation. The canonical model is the
  integration point.
- **Recommended flow** (run inside this worktree, where `/bmad-*` skills load):
  - Lean path: `/bmad-create-epics-and-stories` straight from this doc (reference it as an
    `inputDocument`) → ralph prompts.
  - Only if you want more ceremony: `/bmad-create-product-brief` → `/bmad-create-prd` →
    `/bmad-create-architecture` first.

## References (read before/while planning)

- `_bmad-output/planning-artifacts/architecture-canonical-identity.md` — the adapter/provider seams
- `_bmad-output/planning-artifacts/prd-multi-idp-demo.md` — prior multi-provider framing (names Ory Hydra)
- `identity-stack/backend/app/middleware/auth.py`, `claims.py`, `factory.py` — issuer allow-list + gateway validation
- `identity-stack/backend/app/services/provider.py` — provider registry (`issuer_url`, `list_all`)
- `identity-stack/backend/app/services/adapters/{base,descope,noop}.py` — `IdentityProviderAdapter` ABC + impls to mirror for an Ory adapter
- `identity-stack/backend/app/models/identity/` — canonical schema (`ProviderType.ory`, `IdPLink`, `Tenant`, `UserTenantRole`)
- `identity-stack/backend/app/services/identity_resolution.py` — sub→canonical-user resolution + JIT provisioning
- `identity-stack/frontend/src/main.tsx` — OIDC login wiring (`react-oidc-context`/`oidc-client-ts`) to repoint at Ory
- `identity-stack/frontend/src/hooks/useRBAC.ts`, `useTenants.ts` — Descope `tenants`/token claim parsing to make provider-agnostic
- `identity-stack/backend/app/routers/auth.py` — Descope Management logout to make provider-aware (add Ory path)
- `terraform-provider-descope/` — pattern to mirror for an Ory IaC track
- `py-identity-model/src/tests/integration/` — the Ory validation path already proven in CI (reuse)
- `docs/idp-rbac-comparison.md`, `docs/descope-data-model.md` — existing IdP/claim reference
