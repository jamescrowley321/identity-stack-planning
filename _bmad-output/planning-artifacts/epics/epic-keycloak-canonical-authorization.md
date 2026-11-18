---
workflowType: 'epic'
project_name: 'identity-stack'
epic_title: 'Keycloak authorized from the canonical model and kept in two-way sync with it'
date: '2026-11-18'
supersedes: 'epic-keycloak-provider.md (authorization model only)'
inputDocuments:
  - _bmad-output/planning-artifacts/epics/epic-keycloak-provider.md (the model this replaces)
  - _bmad-output/planning-artifacts/epics/epic-zitadel-provider.md (the authorization model this follows)
  - identity-stack at origin/main 5775d55 (code read on 2026-11-18)
  - identity-stack backend/app/services/{reconciliation,inbound_sync}.py and services/adapters/ (the Descope sync contract)
  - identity-stack keycloak/fixtures/access-token.json (Keycloak 26.8.2, recorded)
---

# Epic: Keycloak authorized from the canonical model and kept in two-way sync with it

**GitHub tracking:** [identity-stack#552](https://github.com/jamescrowley321/identity-stack/issues/552) (epic). Stories:
[identity-stack#655](https://github.com/jamescrowley321/identity-stack/issues/655) (S1),
[identity-stack#656](https://github.com/jamescrowley321/identity-stack/issues/656) (S2),
[identity-stack#657](https://github.com/jamescrowley321/identity-stack/issues/657) (S3),
[identity-stack#660](https://github.com/jamescrowley321/identity-stack/issues/660) (S4), [identity-stack#661](https://github.com/jamescrowley321/identity-stack/issues/661) (S5),
[identity-stack#658](https://github.com/jamescrowley321/identity-stack/issues/658) (S6),
[identity-stack#659](https://github.com/jamescrowley321/identity-stack/issues/659) (S7).

## Why

The Keycloak epic ([identity-stack#552](https://github.com/jamescrowley321/identity-stack/issues/552))
authorized Keycloak principals from the token: permissions were client roles of per-type
"type clients", and the tenant was the token's one organization. Keycloak was meant to work like
the canonical model the rest of the stack uses: the token says who the caller is, Postgres says
what the caller may do, and Postgres and the provider hold the same identities.

Two things are wrong on `main`:

1. **Authorization reads the token.** Client roles are realm-wide, so a token cannot carry
   permissions that hold in one organization only. The workarounds are Keycloak-only code:
   portable and organization-bound types (`app/middleware/keycloak.py`), a directory lookup on
   every organization-bound request (`app/services/keycloak_directory.py`) with `type:<type client>`
   grant markers, sole-membership confirmation in the tenant resolver, and a tenant admin of two
   organizations who is a tenant admin in neither.
2. **Postgres and Keycloak are not in sync.** Only Descope has the full contract: every canonical
   change pushed out (`DescopeSyncAdapter`), provider-side changes pulled in
   (`InboundSyncService`: sign-up connector and webhook), and a drift pass (`ReconciliationService`).
   The Keycloak adapter pushes organizations, users and organization membership, and nothing comes
   back: a user disabled, edited, removed from an organization or deleted in the Keycloak console
   is never seen by the backend, and nothing detects the difference.

## The model

**Authorization is canonical.** `keycloak` joins `CANONICAL_RBAC_PROVIDERS` and
`JIT_ENABLED_PROVIDERS` in the deployments that enable it, as Ory and Zitadel do. No request-time
decision reads a Keycloak claim beyond identity. The provider has no claims extractor.

**Sync is two-way, like Descope.** A canonical change is pushed to Keycloak; a change made in
Keycloak is pulled into Postgres; a reconciliation pass finds and repairs what either direction
missed. Every entity Keycloak can represent is mapped:

| Canonical | Keycloak | Out (push) | In (pull) |
|---|---|---|---|
| Tenant | Organization; alias = canonical tenant id (immutable in Keycloak); name, domains; tenant status ↔ `enabled` | create, update, delete | update, disable, delete |
| User | User; linked by `idp_links (keycloak, sub)`, username = canonical user id for users the backend creates; email, given and family name, `emailVerified`; user status ↔ `enabled` | create, update, status, delete | update, disable, delete, and first sign-in (provisioning) |
| Membership (user in tenant) | Organization member | add, remove | add, remove |
| Permission | Client role `<domain>:<action>` on the API client | create, update, delete | create, update, delete |
| Role | Composite client role on the API client whose composites are its permissions | create, update, delete, permission set | create, update, delete, composite set |
| Role assignment (user, tenant, role) | Membership of the group `tenants/<alias>/<role>`, a group that carries **no role mapping** | add, remove | add, remove |

Role assignments are groups without role mappings on purpose. A group that mapped the composite
role would put realm-wide roles back on the token, which is the bug in item 1. The group is the
record of the assignment, not a grant, and the backend never reads it from a token. If the running
Keycloak supports groups owned by an organization, S1 measures it and S3 uses them instead of the
realm `tenants/` tree.

**Pull mechanism (default).** The backend polls the realm's admin events
(`GET /admin/realms/{realm}/admin-events`, with representations) and user events
(`GET /admin/realms/{realm}/events`) from a stored cursor, through the admin service account.
That needs no Keycloak extension and works on the stock image. Events whose `authDetails.clientId`
is the adapter's own client are the backend's own pushes and are skipped, so a push does not
come back as a pull. Reconciliation covers anything the event store expired or the poller missed.
The alternative, an event-listener extension that posts signed webhooks like Descope's, is owner
decision 1.

**Conflicts.** The same rules as Descope: an event is applied in the order Keycloak recorded it;
the reconciliation pass makes Postgres match Keycloak for what Keycloak holds, and re-pushes a
canonical change whose last push failed (`sync_events`, `provider_sync = failed`). A canonical
change the push has not yet delivered is not overwritten by reconciliation.

**First sign-in.** The token's `organization` claim (one alias) provisions a new user into that
tenant with the default role `member`; the profile comes from the access token, which carries
`email` and `email_verified`. A missing claim, two aliases, an alias no tenant names, or an
unverified email provisions nothing. Self-registration stays off and `verifyEmail` stays on.

**Token binding** (401 otherwise):

1. Signature against the realm JWKS, `iss` equal to the configured issuer, RS256 only.
2. `aud` contains the API audience.
3. `azp` equals the SPA client id.
4. `typ` is `Bearer`. Keycloak marks ID tokens `ID` and refresh tokens `Refresh`. Zitadel's
   heuristic (no `sid`, no `auth_time`) does not work: Keycloak access tokens carry both.

**Switching tenant** is the `X-Tenant-ID` selector, as for Ory and Zitadel. No new authorize
request, no `organization:<alias>` scope; the SPA requests the plain `organization` scope.

## What is removed

- Backend: `app/middleware/keycloak.py`; `app/services/keycloak_directory.py` and the
  `identity-stack-directory` client; `KeycloakTenantClaims`, `KeycloakTenantMemberships`,
  `CountedMemberships`, the current `KeycloakTokenBinding`; every resolver and
  `ProviderTokenConfig` field only Keycloak uses (`sole_membership_lookup`,
  `sole_membership_required`, `token_authorized_only`, `confirmed_tenant`, the `token_tenant`
  response field, `tenant_memberships` if nothing else reads it); the Keycloak branches in
  `routers/protected.py`, `routers/access_checks.py`, `dependencies/rbac.py`,
  `dependencies/tenant.py`.
- Variables `KEYCLOAK_AUDIENCES`, `KEYCLOAK_APP_CLIENTS`, `KEYCLOAK_PORTABLE_TYPES`,
  `KEYCLOAK_ORGANIZATION_BOUND_TYPES`, `KEYCLOAK_PORTABLE_PERMISSIONS`,
  `KEYCLOAK_DIRECTORY_CLIENT_ID`, `KEYCLOAK_DIRECTORY_CLIENT_SECRET`.
- Realm and Terraform: the `member`, `tenant-admin`, `member-app` and `tenant-admin-app` clients,
  their client roles, the `type:<type client>` organization attributes, the directory client.
- Frontend: the `organization:<alias>` re-authorize switch and the token-tenant reload.
- Docs: ADR-0010 (Keycloak token model) superseded by a new ADR; conventions §18 loses its
  Keycloak paragraphs.

## What stays

Compose Keycloak and its realm import (reshaped), the `infra/keycloak` Terraform root and its shared
fixture outputs, the HTTPS switch limited to loopback and `.localhost` issuers, RP-initiated logout,
the admin adapter (extended), the frontend login, refresh and logout, and the shared e2e suite.

## Stories

Stacked pull requests, merged bottom-up and together: the realm change breaks the current backend.

| Story | Depends on |
|---|---|
| S1 realm and Terraform | — |
| S2 canonical authorization | S1 |
| S3 push | S1, S2 |
| S4 pull | S3 |
| S5 reconciliation | S3, S4 |
| S6 frontend | S2 |
| S7 end to end and docs | all |

### S1 ([identity-stack#655](https://github.com/jamescrowley321/identity-stack/issues/655)): Realm and Terraform root for the canonical model

- A public SPA client (PKCE S256, full scope off, `organization` as an optional client scope) and
  an API client whose audience a mapper puts on the SPA's access token. The API client holds the
  permission client roles and role composites; no user or group is mapped to them.
- The `tenants/` group tree (or organization groups, if measured available).
- Admin events and user events enabled with representations and an expiry longer than the
  reconciliation interval.
- The admin client's service account holds exactly what S3 to S5 need (`manage-users`,
  `manage-organizations`, `manage-clients` scoped as narrowly as Keycloak allows, `view-events`);
  each is probed and recorded, as the current fixtures README does.
- Remove the type clients, app clients, their client roles, grant markers and the directory client.
- Re-record `keycloak/fixtures/`: the SPA's access token and ID token, and a token of another
  client without the API audience.

**Done when:** `terraform plan` is empty after apply against the compose Keycloak; the fixtures
show `typ` `Bearer` and `ID`, `azp` the SPA, the API audience in `aud`, `email_verified`, and an
empty `resource_access` for a user with role assignments; the realm checks pass; whether
organization groups exist on the pinned version is recorded.

### S2 ([identity-stack#656](https://github.com/jamescrowley321/identity-stack/issues/656)): Backend: canonical Keycloak authorization

- `keycloak_config(issuer_url, audience, client_id, *, require_https, post_logout_redirect_uri)`,
  shaped like `zitadel_config`; startup refuses no audience, no client id, or HTTPS off for a
  non-local issuer.
- Binding checks 1 to 4; first-sign-in provisioning from `organization`, in one function.
- Remove everything under "What is removed" (backend and variables). New ADR superseding ADR-0010;
  conventions §18 and the environment-variable docs in the same pull request.

**Done when:** the SPA's access token is accepted; its ID token, a refresh token, another
client's token, a token without the API audience and another issuer's token get 401; first sign-in
provisions as specified and refuses the four bad cases; roles and permissions come from Postgres
and forged `resource_access`, `dct`, `tenants` or top-level `roles` change nothing; a user in two
tenants is a tenant admin in each where Postgres says so; a deactivated canonical user gets 403;
no Keycloak branch remains in `dependencies/` or `routers/`; Descope, Ory and Zitadel tests pass
unedited.

### S3 ([identity-stack#657](https://github.com/jamescrowley321/identity-stack/issues/657)): Push every mapped entity to Keycloak

- `KeycloakSyncAdapter` implements every `IdentityProviderAdapter` method for the mapping table:
  tenants, users, memberships (add and remove), permissions, roles and their permission sets, role
  assignments.
- Each push is idempotent, so a retry or a reconciliation re-push is safe. Failures are recorded
  as today (`provider_sync = failed`) for S5 to retry.
- Fix in place what the open adapter issues report:
  [#619](https://github.com/jamescrowley321/identity-stack/issues/619) (generic 404 read as not a
  member), [#632](https://github.com/jamescrowley321/identity-stack/issues/632) and
  [#633](https://github.com/jamescrowley321/identity-stack/issues/633) (organization lock), or remove
  the lock if idempotent pushes no longer need it.

**Done when:** the live adapter suite against the compose Keycloak shows each canonical operation
in the mapping table reflected in Keycloak, and repeating it changes nothing; no Keycloak token
issued afterwards carries a role from a pushed assignment.

### S4 ([identity-stack#660](https://github.com/jamescrowley321/identity-stack/issues/660)): Pull Keycloak changes into Postgres

- A poller reads admin events and user events from a stored cursor and applies the "In" column of
  the mapping table through `InboundSyncService`, recording `sync_events` as the Descope webhook does.
- Events authored by the adapter's client are skipped; an event for an entity the backend does not
  map is logged and skipped.
- Interval, page size and the cursor's storage follow conventions §1 to §6.

**Done when:** integration tests against the compose Keycloak show each console-side change in the
"In" column reaching Postgres within one poll; a deactivated or removed-from-tenant user is refused
on the next request after that poll; the backend's own pushes produce no inbound change; a poller
restart resumes from the cursor without reapplying events.

### S5 ([identity-stack#661](https://github.com/jamescrowley321/identity-stack/issues/661)): Reconciliation for Keycloak

- Make `ReconciliationService` provider-neutral: one pass per configured provider, each with a
  reader for that provider's state. Descope's behaviour moves, unchanged.
- A Keycloak reader for every mapped entity. Postgres is made to match Keycloak for what Keycloak
  holds, a failed push is re-pushed, and an undelivered canonical change is not overwritten.
- `POST /api/internal/reconciliation/run` runs every configured provider; `sync_status` reports
  each.

**Done when:** with the poller stopped, changes made on both sides converge after one pass; a push
failed on purpose is delivered by the next pass and the user's membership removal from
[#612](https://github.com/jamescrowley321/identity-stack/issues/612) is one of the cases; the
Descope reconciliation tests pass unedited.

### S6 ([identity-stack#658](https://github.com/jamescrowley321/identity-stack/issues/658)): Frontend: switch tenant with the request selector

- Log in with the plain `organization` scope; switch tenant through `TenantSelector`
  (`X-Tenant-ID`); remove the re-authorize switch and the token-tenant reload.

**Done when:** frontend unit tests cover log in, refresh, switch and log out against Keycloak with
no new authorize request on switch. Closes identity-stack#602.

### S7 ([identity-stack#659](https://github.com/jamescrowley321/identity-stack/issues/659)): End to end and docs

- The shared UI and API e2e suite runs against the reshaped Keycloak, including a two-tenant user
  switching tenant, a tenant admin of two tenants, and a user disabled in the Keycloak console being
  refused after the next poll.
- `docs/keycloak.md`, `docs/security.md`, `infra/PROVIDERS.md` and the provider comparison
  ([identity-stack#650](https://github.com/jamescrowley321/identity-stack/pull/650)) describe the
  model and the sync.

**Done when:** `make test-e2e` passes with `E2E_PROVIDER=keycloak` locally and in CI, with no
skipped Keycloak case. Closes identity-stack#638.

## Owner decisions

1. **Pull mechanism.** Default: poll admin and user events (no Keycloak extension). Alternative: an
   event-listener extension posting signed webhooks to `/api/internal/webhooks/keycloak`, lower
   latency, one more artifact to build and pin.
2. **Organization groups.** Default: use them if S1 measures them on the pinned Keycloak, else the
   realm `tenants/` group tree.

## Existing issues

| Issue | Disposition |
|---|---|
| [#552](https://github.com/jamescrowley321/identity-stack/issues/552) epic | Stays open; this epic finishes it |
| [#619](https://github.com/jamescrowley321/identity-stack/issues/619), [#632](https://github.com/jamescrowley321/identity-stack/issues/632), [#633](https://github.com/jamescrowley321/identity-stack/issues/633) | Fixed or made moot in S3 |
| [#612](https://github.com/jamescrowley321/identity-stack/issues/612) | Closed by S5 |
| [#602](https://github.com/jamescrowley321/identity-stack/issues/602) | Closed by S6 |
| [#638](https://github.com/jamescrowley321/identity-stack/issues/638) | Closed by S7 |
| [#596](https://github.com/jamescrowley321/identity-stack/issues/596) | Stays: Ory and Zitadel principals are affected too |
| [#636](https://github.com/jamescrowley321/identity-stack/issues/636), [#642](https://github.com/jamescrowley321/identity-stack/issues/642), [#591](https://github.com/jamescrowley321/identity-stack/issues/591) | Stay: not about authorization or sync |

## Out of scope

- Reading Keycloak roles or groups from a token for any decision.
- The same two-way sync for Zitadel and Ory. They have the same gap (push only, no pull, no
  reconciliation); S5's provider-neutral pass is where they plug in, as follow-ups.
- The library's Keycloak claim helpers (identity-model#1051, under
  [identity-stack-planning#147](https://github.com/jamescrowley321/identity-stack-planning/issues/147)):
  identity-stack no longer consumes them; whether the library keeps them is decided there.
