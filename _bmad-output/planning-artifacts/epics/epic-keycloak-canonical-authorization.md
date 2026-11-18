---
workflowType: 'epic'
project_name: 'identity-stack'
epic_title: 'Keycloak authorized from the canonical model, like Ory and Zitadel'
date: '2026-11-18'
supersedes: 'epic-keycloak-provider.md (authorization model only)'
inputDocuments:
  - _bmad-output/planning-artifacts/epics/epic-keycloak-provider.md (the model this replaces)
  - _bmad-output/planning-artifacts/epics/epic-zitadel-provider.md (the model this follows)
  - identity-stack at origin/main 5775d55 (code read on 2026-11-18)
  - identity-stack keycloak/fixtures/access-token.json (Keycloak 26.8.2, recorded)
---

# Epic: Keycloak authorized from the canonical model, like Ory and Zitadel

**GitHub tracking:** [identity-stack#552](https://github.com/jamescrowley321/identity-stack/issues/552) (epic). Stories: [identity-stack#655](https://github.com/jamescrowley321/identity-stack/issues/655) (S1), [identity-stack#656](https://github.com/jamescrowley321/identity-stack/issues/656) (S2), [identity-stack#657](https://github.com/jamescrowley321/identity-stack/issues/657) (S3), [identity-stack#658](https://github.com/jamescrowley321/identity-stack/issues/658) (S4), [identity-stack#659](https://github.com/jamescrowley321/identity-stack/issues/659) (S5).

## Why

The Keycloak epic ([identity-stack#552](https://github.com/jamescrowley321/identity-stack/issues/552))
authorized Keycloak principals from the token: permissions were client roles of per-type
"type clients", and the tenant was the token's one organization. Ory and Zitadel are authorized
from the canonical model: the token says who the caller is, Postgres says what the caller may do.
Keycloak was meant to work the same way.

The token model does not fit Keycloak. Client roles are realm-wide, so a token cannot carry
permissions that hold in one organization only. Everything built to work around that is
Keycloak-only code that Ory and Zitadel do not need:

- **Portable and organization-bound types** (`backend/app/middleware/keycloak.py`), with a
  read-only allowlist of portable permissions.
- **A directory lookup on every organization-bound request** (`app/services/keycloak_directory.py`),
  with `type:<type client>` grant-marker attributes on each organization, and 502 when the Admin
  API is down.
- **Sole-membership confirmation** in the tenant resolver (`sole_membership_lookup`,
  `sole_membership_required`, `confirmed_tenant`, `token_authorized_only`, `token_tenant`).
- **A tenant admin who belongs to two organizations is a tenant admin in neither.**
- **Switching tenant is a new authorize request** (`organization:<alias>`), and the frontend reloads
  identity when a renewal could change the token's tenant
  ([identity-stack#602](https://github.com/jamescrowley321/identity-stack/issues/602)).
- **A membership push that must hold an advisory lock per organization**, and the bugs that followed
  ([identity-stack#612](https://github.com/jamescrowley321/identity-stack/issues/612),
  [#619](https://github.com/jamescrowley321/identity-stack/issues/619),
  [#632](https://github.com/jamescrowley321/identity-stack/issues/632),
  [#633](https://github.com/jamescrowley321/identity-stack/issues/633)).

Zitadel solved the same problem
([epic-zitadel-provider.md](epic-zitadel-provider.md), "Recommended tenancy and RBAC mapping")
and its code is already on `main` (`zitadel_config`, `first_login_organization`,
`CANONICAL_RBAC_PROVIDERS`). Keycloak follows it.

## The model

| identity-stack | Keycloak | How they are linked |
|---|---|---|
| Deployment | One realm, one issuer `<origin>/realms/<realm>` | — |
| The application | One public SPA client (authorization code + PKCE) and one API audience client, put on the access token by an audience mapper | Terraform |
| Tenant (`tenants` row) | One organization, linked by `tenants.external_org_id` = the organization **alias** (immutable in Keycloak, and what the `organization` claim carries) | Seeded tenants: Terraform. Runtime tenants: the admin adapter |
| User | A Keycloak user linked by `idp_links (keycloak, sub)` | Keycloak → canonical at first login |
| Membership of further tenants | Canonical `user_tenant_roles` rows only | Canonical only |
| Roles and permissions | Canonical. No client role or realm role is read | Canonical only |
| Active tenant | The caller's sole canonical membership, or `X-Tenant-ID` checked against canonical memberships | Canonical |

**Authorization is canonical.** `keycloak` joins `CANONICAL_RBAC_PROVIDERS` and
`JIT_ENABLED_PROVIDERS` in the deployments that enable it, as Zitadel does. The provider has no
claims extractor.

**One Keycloak claim is read, once.** At first login the token's `organization` claim (one alias)
selects the canonical tenant the new user is provisioned into, with the default role `member`.
No request-time decision reads it. A missing claim, more than one alias, or an alias no tenant
names provisions nothing. Self-registration stays off and `verifyEmail` stays on, so organization
membership and `email_verified` are only what an administrator or Terraform made them.

**The profile comes from the access token.** Keycloak's access token carries `email` and
`email_verified` (recorded fixture), so first login needs no UserInfo call. An unverified or
missing email provisions nothing.

**Token binding** (refused with 401 otherwise):

1. Signature against the realm JWKS, `iss` equal to the configured issuer, RS256 only.
2. `aud` contains the configured API audience.
3. `azp` equals the configured SPA client id.
4. `typ` is `Bearer`. Keycloak marks ID tokens `ID` and refresh tokens `Refresh`. The Zitadel
   heuristic (no `sid`, no `auth_time`) does not work here: Keycloak access tokens carry both.

Check 4 rests on Keycloak's own claim, recorded on 26.8.2; the tests are built from re-recorded
fixtures (access token and ID token), so a version that moves it fails them.

**Switching tenant** is the request selector, as for Ory and Zitadel. No new authorize request,
no `organization:<alias>` scope. The SPA requests the plain `organization` scope; Keycloak asks a
user in several organizations to pick one at login, and that pick matters only at first login.

**What this costs** (the same as Zitadel):

- A mapping to keep: each tenant needs its alias in `external_org_id`.
- Two membership notions: Keycloak's organizations and canonical memberships can differ after
  first login. The Keycloak console is not the source of truth for who may do what.
- Revocation is immediate: deactivating a canonical user or removing a membership refuses the
  next request, whatever the token says.

## What is removed

Backend:

- `app/middleware/keycloak.py` (token model, portable and organization-bound types).
- `app/services/keycloak_directory.py` and the `identity-stack-directory` client.
- `KeycloakTenantClaims`, `KeycloakTenantMemberships`, `KeycloakTokenBinding` (replaced),
  `CountedMemberships`, and from `ProviderTokenConfig` and the resolver every field only Keycloak
  uses: `sole_membership_lookup`, `sole_membership_required`, `token_authorized_only`,
  `confirmed_tenant`, the `token_tenant` response field, and `tenant_memberships` if nothing else
  reads it.
- Keycloak branches in `routers/protected.py`, `routers/access_checks.py`, `dependencies/rbac.py`,
  `dependencies/tenant.py`.
- Variables `KEYCLOAK_AUDIENCES`, `KEYCLOAK_APP_CLIENTS`, `KEYCLOAK_PORTABLE_TYPES`,
  `KEYCLOAK_ORGANIZATION_BOUND_TYPES`, `KEYCLOAK_PORTABLE_PERMISSIONS`,
  `KEYCLOAK_DIRECTORY_CLIENT_ID`, `KEYCLOAK_DIRECTORY_CLIENT_SECRET`,
  `KEYCLOAK_ORGANIZATION_LOCK_TIMEOUT_SECONDS`.
- The organization advisory lock and the membership push in the admin adapter.

Realm and Terraform: the `member`, `tenant-admin`, `member-app` and `tenant-admin-app` clients,
their client roles, the `type:<type client>` organization attributes, and the directory client.

Frontend: the `organization:<alias>` re-authorize switch and the token-tenant reload.

Docs: ADR-0010 (Keycloak token model) is superseded by a new ADR; conventions §18 loses its
Keycloak paragraphs; `docs/keycloak.md`, `docs/security.md`, `docs/environment-variables.md`,
`infra/PROVIDERS.md` follow.

## What stays

Compose Keycloak and its realm import (reshaped), the `infra/keycloak` Terraform root and its shared
fixture outputs, the HTTPS switch limited to loopback and `.localhost` issuers, RP-initiated logout,
the admin adapter's organization and user pushes, the frontend login, refresh and logout, and the
shared e2e suite.

## Stories

Stacked pull requests, merged bottom-up and together: the realm change breaks the current backend,
so no story merges to `main` alone.

### S1 ([identity-stack#655](https://github.com/jamescrowley321/identity-stack/issues/655)): Realm and Terraform root: one SPA client, one API audience, no type clients

- Realm import and `infra/keycloak`: a public SPA client (PKCE S256, full scope off, `organization`
  as an optional client scope) and an audience mapper putting the API audience on its access token.
  Remove the type clients, app clients, client roles, grant-marker attributes and the directory
  client. Keep the admin client.
- Terraform outputs give the issuer, SPA client id, API audience and organization aliases in the
  shape the Zitadel root gives them.
- Re-record `keycloak/fixtures/`: an access token and an ID token from the SPA, and an access token
  of another client in the realm carrying no API audience.

**Done when:** `terraform plan` against the compose Keycloak is empty after apply; the fixtures
show `typ` `Bearer` and `ID`, `azp` the SPA, the API audience in `aud`, and `email_verified`;
`check_realm.py` and `check-against-compose.sh` pass with the new shape.

### S2 ([identity-stack#656](https://github.com/jamescrowley321/identity-stack/issues/656)): Backend: canonical Keycloak provider

- `keycloak_config(issuer_url, audience, client_id, *, require_https, post_logout_redirect_uri)`,
  shaped like `zitadel_config`; startup refuses no audience, no client id, or HTTPS off for a
  non-local issuer.
- Binding checks 1 to 4 above.
- `first_login_organization` reads `organization`; one function, provisioning only.
- Remove everything under "What is removed" (backend). New ADR superseding ADR-0010; conventions
  §18 and the environment-variable docs in the same pull request.

**Done when:**

- Accepted: the SPA's access token.
- 401: the SPA's ID token, a refresh token, a token of another client, a token without the API
  audience, a token from another issuer.
- First login with one mapped alias provisions a `member` of that tenant; no claim, two aliases, an
  unmapped alias, or an unverified email provisions nothing.
- Roles and permissions come from the canonical store; forged `resource_access`, `dct`, `tenants`
  or top-level `roles` claims change nothing.
- A user in two tenants is a tenant admin in each where the canonical store says so, selected by
  `X-Tenant-ID`.
- A deactivated canonical user is refused with 403.
- No Keycloak-specific branch remains in `dependencies/` or `routers/`.
- Descope, Ory and Zitadel tests pass unedited.

### S3 ([identity-stack#657](https://github.com/jamescrowley321/identity-stack/issues/657)): Admin adapter: organizations and users only

- The adapter pushes tenants to organizations and users to users, as the Zitadel adapter does. A
  user created in a tenant is added to that tenant's organization once, when it is created. Later
  canonical membership changes are not pushed.
- Remove the organization lock, the `left_tenant_id` path and `USER_NOT_IN_KEYCLOAK`.

**Done when:** the live adapter suite passes against the compose Keycloak; removing a canonical
membership refuses the next request with no Keycloak call; the lock and its variable are gone.
Closes identity-stack#612, #619, #632 and #633.

### S4 ([identity-stack#658](https://github.com/jamescrowley321/identity-stack/issues/658)): Frontend: switch tenant with the request selector

- Log in with the plain `organization` scope; switch tenant through `TenantSelector`
  (`X-Tenant-ID`) as for Ory and Zitadel; remove the re-authorize switch and the token-tenant reload.

**Done when:** frontend unit tests cover log in, refresh, switch and log out against Keycloak with
no new authorize request on switch. Closes identity-stack#602.

### S5 ([identity-stack#659](https://github.com/jamescrowley321/identity-stack/issues/659)): End to end and docs

- The shared UI and API e2e suite runs against the reshaped Keycloak, including a two-tenant user
  switching tenant and a tenant admin of two tenants.
- `docs/keycloak.md`, `docs/security.md`, `infra/PROVIDERS.md` and the provider comparison
  ([identity-stack#650](https://github.com/jamescrowley321/identity-stack/pull/650)) describe the
  canonical model.

**Done when:** `make test-e2e` passes with `E2E_PROVIDER=keycloak` locally and in CI, with no
skipped Keycloak case. Closes identity-stack#638.

## Existing issues

| Issue | Disposition |
|---|---|
| [#552](https://github.com/jamescrowley321/identity-stack/issues/552) epic | Stays open; this epic finishes it |
| [#612](https://github.com/jamescrowley321/identity-stack/issues/612), [#619](https://github.com/jamescrowley321/identity-stack/issues/619), [#632](https://github.com/jamescrowley321/identity-stack/issues/632), [#633](https://github.com/jamescrowley321/identity-stack/issues/633) | Closed by S3: the code they fix is removed |
| [#602](https://github.com/jamescrowley321/identity-stack/issues/602) | Closed by S4 |
| [#638](https://github.com/jamescrowley321/identity-stack/issues/638) | Closed by S5 |
| [#596](https://github.com/jamescrowley321/identity-stack/issues/596) | Stays: Ory and Zitadel principals are affected too |
| [#636](https://github.com/jamescrowley321/identity-stack/issues/636), [#642](https://github.com/jamescrowley321/identity-stack/issues/642), [#591](https://github.com/jamescrowley321/identity-stack/issues/591) | Stay: not about the authorization model |

## Out of scope

- Reading Keycloak client roles or realm roles for any decision.
- Pushing canonical memberships or roles into Keycloak.
- The library's Keycloak claim helpers (identity-model#1051, under
  [identity-stack-planning#147](https://github.com/jamescrowley321/identity-stack-planning/issues/147)):
  identity-stack no longer consumes them; whether the library keeps them is decided there.
