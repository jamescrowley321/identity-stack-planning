---
workflowType: 'epic'
project_name: 'identity-stack-planning'
epic_title: 'Keycloak as a configured OIDC provider (Organizations as tenants)'
date: '2026-11-15'
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - identity-stack-planning#94 (owner comment fixing the tenancy model)
  - identity-stack-planning#147 (library umbrella and target design)
  - _bmad-output/planning-artifacts/epics/epic-cloudflare-access-provider.md (format)
  - epic-pim-keycloak-provider-integration.md at refs/pull/47/head (superseded draft)
  - identity-stack at origin/main afdb347 (code read on 2026-11-15)
  - Keycloak 26.8.2 documentation and terraform-provider-keycloak v5.10.0 docs (read on 2026-11-15)
---

# Epic: Keycloak as a configured OIDC provider (Organizations as tenants)

**GitHub tracking:** [identity-stack#552] (epic). Stories: [identity-stack#553],
[identity-stack#554], [identity-stack#555], [identity-stack#556], [identity-stack#557],
[identity-stack#559], [identity-stack#561], [identity-stack#562].

Promoted by [identity-stack-planning#94] (the planning issue for this provider). Supersedes the
draft in closed pull request [identity-stack-planning#47], which targeted the library's
integration-test matrix and predates the model below, and the closed
[identity-stack#79] (the pre-Organizations "implement Keycloak provider" issue).

## Why

identity-stack has two configured providers. Descope carries tenant and roles in its own claims
(`dct`, `tenants`). Ory carries neither, so the backend reads them from the canonical model.
Keycloak is the third case: a self-hosted provider that carries **one tenant and one user type's
permissions** in the token, in Keycloak's claim shapes. Adding it tests the claim in
`backend/app/middleware/providers.py` that a provider is configuration, and it gives the stack a
provider that runs in docker compose with no account and no credential.

The model is decided ([identity-stack-planning#94], owner comment):

| Concept | Keycloak 26 | In the token |
|---|---|---|
| Tenant | Organization; app requests scope `organization:<alias>` | `organization` names exactly one alias |
| User type | Confidential "type client" (for example `member`, `tenant-admin`) | `aud` is the one type client |
| Permission | Client role of the type client, named `<domain>:<action>` | `resource_access[aud].roles` |
| App | Public client, one per type, *Full scope allowed* off, scope-mapped to one type client | `azp` |
| Tenant switch | New authorize request, different `organization:<alias>`, same SSO session | a new token |

Realm roles are not used. There is no token exchange and no multi-tenant token.

## Evidence

### Keycloak, read on 2026-11-15

Sources: the Keycloak documentation at tag `26.8.2` (the version
[the server administration guide](https://www.keycloak.org/docs/latest/server_admin/index.html)
showed as latest that day), the server guides, and the Terraform provider docs at `v5.10.0`.
Nothing here has been run. Rows marked **unverified** are settled by the story named.

| Claim | What the docs say | Status |
|---|---|---|
| Organizations are per realm | "To use organizations, you have to enable the feature for the current realm." ([managing organizations](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/organizations/managing-organization.adoc)) | verified |
| `organization` scope | Built-in optional client scope, added to every client by default, with an *Organization Membership* mapper ([mapping organization claims](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/organizations/mapping-organization-claims.adoc)) | verified |
| `organization:<alias>` | Maps one organization. Request is rejected if the alias does not exist or the user is not a member. **Several can be requested at once** (`organization:org-a organization:org-b`), so a token can name more than one. `organization` alone prompts a multi-organization user to pick; `organization:*` maps all. Formats cannot be mixed (same page) | verified |
| Shape of the `organization` claim | The only example is a map keyed by alias, holding `id` and attributes, with a note that id and attributes are off by default. The default shape (a list of aliases, per [identity-stack-planning#94]) is not shown | **unverified**: [identity-stack#553] |
| Alias is a stable key | Unique in the realm, URL-friendly, "cannot be changed afterwards" (managing organizations) | verified |
| Client roles in the token | Client roles go to `resource_access`; the roles in a token are the user's roles intersected with the client's role scope mappings ([role mappings in the token](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/clients/oidc/con-token-role-mappings.adoc)). The nesting `resource_access.<client>.roles` is not spelled out in the section read | verified; nesting **unverified**: [identity-stack#553] |
| `aud` is the type client | *Audience Resolve*, in the default `roles` scope, adds each client the token holds a client role for. The frontend client is not added. A user with no role on the type client gets no such audience ([audience support](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/clients/oidc/con-audience.adoc)) | verified |
| `aud` is *only* the type client | Follows from *Full scope allowed* off plus scope mappings to one client. Not stated as such | **inferred**: [identity-stack#553] |
| `azp` on access tokens is the app client | Not in the sections read (the audience page mentions `azp` for refresh tokens only) | **unverified**: [identity-stack#553] |
| Endpoints | `/realms/{realm}/.well-known/openid-configuration`, `/realms/{realm}/protocol/openid-connect/logout` ([available endpoints](https://github.com/keycloak/keycloak/blob/26.8.2/docs/guides/securing-apps/partials/oidc/available-endpoints.adoc)). Issuer `<hostname>/realms/<realm>` is implied by the paths | verified; issuer string **inferred** |
| RP-initiated logout parameters | The endpoints page defers to a section not read. `id_token_hint`, `post_logout_redirect_uri` and `client_id` are from OpenID Connect RP-Initiated Logout 1.0 | **unverified**: [identity-stack#556] |
| `hostname` | "Can be a full URL, or just a hostname." When set, `hostname-strict` is ignored. Backchannel URLs equal frontchannel URLs unless `hostname-backchannel-dynamic` is on ([hostname guide](https://www.keycloak.org/server/hostname)) | verified |
| Full-URL `hostname` with `http://` | Not stated | **unverified**: [identity-stack#553] |
| Realm import | `--import-realm` reads `.json` files from `/opt/keycloak/data/import`; skipped if the realm exists; environment placeholders supported ([import and export guide](https://www.keycloak.org/server/importExport)) | verified |
| Container | `quay.io/keycloak/keycloak`, `start-dev`, `KC_BOOTSTRAP_ADMIN_USERNAME`/`_PASSWORD` ([containers guide](https://www.keycloak.org/server/containers)); health on management port 9000 when `health-enabled`; the image has no `curl` ([health guide](https://github.com/keycloak/keycloak/blob/26.8.2/docs/guides/observability/health.adoc)) | verified |
| Plain HTTP | Realm SSL mode *External requests* allows HTTP only from private addresses; *None* is for development ([SSL modes](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/realms/ssl.adoc)) | verified |
| Terraform | `keycloak_organization`, `keycloak_organization_memberships` (authoritative over members), `keycloak_realm.organizations_enabled` (default `false`), `keycloak_openid_client` with `access_type`, `full_scope_allowed`, `pkce_code_challenge_method`, and `keycloak_generic_role_mapper` ([provider docs at v5.10.0](https://github.com/keycloak/terraform-provider-keycloak/tree/v5.10.0/docs/resources)) | verified |
| Listing a user's organizations | `GET /admin/realms/{realm}/organizations/members/{member-id}/organizations` ([Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html)). The admin role it needs was not read | verified; role **unverified**: [identity-stack#559] |
| Tenant switch needs no new login | Not stated | **unverified**: [identity-stack#553] |
| A refreshed token keeps its organization | Not stated | **unverified**: [identity-stack#553] |
| Public client gets a refresh token in the standard flow | Not read | **unverified**: [identity-stack#561] |
| Roles per organization | Organization groups can carry client roles, mapped into the `organization` claim per organization ([managing groups](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/organizations/managing-groups.adoc)). This is not the decided model | verified; see constraints |

### identity-stack, read at `origin/main` `afdb347` on 2026-11-15

| Claim | Actual |
|---|---|
| The backend uses the library's FastAPI middleware | No. `middleware/auth.py` is its own middleware over core `py_identity_model.aio.validate_token`, with `verify_iss` and `verify_aud` off and issuer, audience and token kind checked in `middleware/providers.py`. `fastapi-identity-model` is not a dependency |
| Library pin | `py-identity-model>=3.8.5,<4`, locked at 3.18.2 |
| Plain HTTP at a non-loopback host needs new library work | No. `TokenValidationConfig.require_https` and `.algorithms`, and `DiscoveryDocumentRequest.policy`, exist in 3.8.5 and at tag `py-v3.18.2`. The loopback exception covers only `localhost`, `127.0.0.1` and `::1` |
| Audience | `ProviderTokenConfig.audience` is one string; `audience_ok` is membership, so a multi-valued `aud` containing it passes |
| Tenant | `dependencies/tenant.py` reads `dct` only. Both middlewares set `request.state.tenant_id = claims.get("dct")` |
| RBAC | `dependencies/rbac.py` reads `dct` + `tenants`, or the canonical model for `CANONICAL_RBAC_PROVIDERS`. No client-role path. 39 `require_role` gates, 0 `require_permission` |
| Provider list wiring | `build_provider_configs` is called from `middleware/auth.py`, `middleware/claims.py` and `routers/auth.py`, each passing the Ory arguments by name |
| Logout | `rp_initiated` reads `ORY_CLIENT_ID` and `ORY_POST_LOGOUT_REDIRECT_URI`, and fetches discovery with no policy |
| Provider registry | `ProviderType` is `descope`, `ory`, `entra`, `cognito`, `oidc`. No `keycloak` |
| Frontend | Login is env-driven (`VITE_OIDC_*`). Tenants, roles and permissions come from `GET /api/identity`, which reads the canonical model. `TenantSwitcher.tsx` changes a client-side selection with no new token. `frontend/Dockerfile` takes no `VITE_OIDC_*` build args |
| Outbound sync | `dependencies/identity.py` wires `DescopeSyncAdapter` into every service. `OrySyncAdapter` exists and is wired nowhere |
| Gateway mode | `tyk/apps/saas-backend.json` names Descope issuers only |
| Test providers | `docker-compose.test.yml` runs `hydra-test` for Ory; CI's unit, integration and E2E jobs start that stack |

## Constraints

- **The model is fixed.** Stories implement it; they do not reopen it.
- **No dependency on unreleased library work.** [identity-stack-planning#147] (umbrella for
  `fastapi-identity-model` gaps) tracks identity-model issues that are all open. None is needed:
  they change a package this backend does not use. Each story says so. The fail-closed branches
  in [identity-model#1050] (single-audience mode) and [identity-model#1051] (Keycloak claim
  helpers) are copied into [identity-stack#557] so a later swap is mechanical.
- **Fit the structure as it is.** The DDD migration ([identity-stack#514], the plan) moves
  federation in [identity-stack#516], later. No story waits for it. Collisions are named per
  story.
- **Fail closed, by the house rules.** conventions §17: every branch without an unambiguous
  answer refuses. conventions §3: a switch is named for its secure state.
- **Status codes follow [identity-stack-planning#147].** A token whose `aud` names no configured
  type client is 401 from the middleware. More than one `aud`, a bad `organization`, a bad `azp`
  or a missing permission is 403 from a dependency.
- **Permissions are per user and type, not per tenant.** Client roles are assigned to the user,
  so a user holds the same permissions in every organization. Keycloak's per-organization group
  roles land in a different claim and are outside the model.
- **Local only.** There is no hosted Keycloak. Compose is the environment.
- **Descope and Ory do not change.** Their tests pass unmodified in every story.

## Owner decisions needed

Each has a default the stories are written to. None blocks [identity-stack#553] or
[identity-stack#555].

1. **`require_role` for Keycloak principals.** The token has permissions and a type, no role.
   Default: refuse, so role-gated routes stay closed to Keycloak until [identity-stack#541]
   (route gates move to permissions) lands. Alternative: treat the type (`aud`) as the role.
2. **Where the SPA's organization list comes from.** A token names one organization. Default:
   the backend asks the Admin REST API, read-only, with a service-account client. Alternatives:
   request `organization` with no alias and let Keycloak prompt (re-prompt on a live session is
   unverified), or keep canonical memberships in step (needs sync, out of scope).
3. **Local hostname.** Default: a `*.localhost` name set as a compose network alias, which
   browsers resolve to loopback with no hosts-file edit. Whether every container resolver sends
   it to the alias is unverified. Fallback: the service name plus a hosts-file line.
4. **One realm definition or two.** Default: the import file serves compose and CI, Terraform
   builds the same realm, and parity is one test run against the Terraform-built realm
   ([identity-stack#562]). Alternative: a near-empty import and Terraform everywhere, which puts
   Terraform in every test run.
5. **A hosted Keycloak.** Default: none; the Terraform root has no remote state until there is.
6. **Converging on the library.** After `fastapi-identity-model` ships the
   [identity-stack-planning#147] work, either adopt it here or keep the app's own layer. No
   story is filed; it needs the v5 migration first.
7. **503 when discovery or JWKS is unreachable.** [identity-stack-planning#147] wants it. The
   middleware answers 401 for every provider today. Default: leave it; changing it is a
   cross-provider behaviour change with its own issue.
8. **Which seam issue survives.** [identity-stack#555] (this epic) or [identity-stack#566]
   (the Zitadel epic). Default: keep the one whose epic starts first and close the other.
9. **Permission names.** `<domain>:<action>` here; Descope's are dotted (`documents.read`) and
   [identity-stack#541] proposes its own vocabulary. Default: the realm uses colon names taken
   from that issue's list once it exists, otherwise the Descope names with a colon.

## Requirements Inventory

There is no PRD or architecture document for this provider. Requirements are extracted from
[identity-stack-planning#94], [identity-stack-planning#147] and the code. They are named in
words, not numbered, per `AGENTS.md`.

### Functional Requirements

- **Local provider.** Keycloak 26 starts from compose with a realm that implements the model.
- **Realm as code.** A Terraform root builds the same realm.
- **Token validation.** The backend accepts Keycloak tokens by issuer, set of audiences and
  signature, over plain HTTP locally when told to.
- **Tenant from the token.** The organization alias is the tenant; exactly one.
- **Permissions from the token.** `resource_access[aud].roles`, single `aud`, `azp` bound to it.
- **Canonical identity.** `GET /api/identity` answers for a Keycloak principal with the token's
  tenant and permissions, and lists the user's organizations.
- **Login, refresh, logout.** The SPA does all three by configuration.
- **Tenant switch.** Choosing an organization gets a new token for it.
- **Proof.** One automated run shows the whole path.

### NonFunctional Requirements

- Fail closed on every ambiguous branch.
- No behaviour change for Descope or Ory.
- No dependency on unreleased library work.
- No collision that blocks the DDD migration.
- No credential needed to run any test.
- New settings documented with their defaults (conventions §1 to §3).

### Additional Requirements

- Plain HTTP, fixed `KC_HOSTNAME`, non-loopback hostname, one issuer string for browser and
  backend ([identity-stack-planning#147]).
- A provider-neutral seam for authorization claims, shared with the Zitadel provider epic
  ([identity-stack#566] overlaps [identity-stack#555]).
- Admin-side scope stated: what is in and what is out.

### UX Design Requirements

None. No UX contract exists; the only UI change is the tenant switcher's behaviour.

### Requirement Coverage Map

| Requirement | Story |
|---|---|
| Local provider; HTTP and hostname | [identity-stack#553] |
| Realm as code | [identity-stack#554] |
| Provider-neutral seam | [identity-stack#555] |
| Token validation; logout (backend) | [identity-stack#556] |
| Tenant and permissions from the token | [identity-stack#557] |
| Canonical identity; admin-side scope | [identity-stack#559] |
| Login, refresh, logout, tenant switch (SPA) | [identity-stack#561] |
| Proof | [identity-stack#562] |

## Epic List

One epic. The stories share a small set of files (`providers.py`, `rbac.py`, `tenant.py`,
`logout.py`) and one risk boundary, so splitting would only add churn.

## Stories

In dependency order. Each is one GitHub issue; the issue holds scope and a "Done when" list,
and this section holds the story and its acceptance criteria.

### [identity-stack#553]: Local Keycloak in docker compose with an imported realm

As a developer, I want Keycloak to start from compose with the model already configured, so
that every later story has real tokens and no one needs an account.

Depends on: nothing. Library: none. **Implementable today.**

**Acceptance Criteria:**

- **Given** a clean checkout, **when** `docker compose --profile keycloak up --wait` runs,
  **then** Keycloak is healthy with the realm imported **and** no admin-console step is needed.
- **Given** the running container, **when** discovery is fetched from the host and from the
  backend container, **then** both return the same `issuer` **and** it equals `iss` in a token.
- **Given** the two-organization user and the app client, **when** a token is requested with
  `organization:acme`, **then** `aud` is the one type client, `azp` is the app client, the token
  names one organization **and** carries that type's client roles.
- **Given** a user outside `globex`, **when** `organization:globex` is requested, **then**
  Keycloak refuses.
- **Given** the fixture README, **when** it is read, **then** it records the claim shapes and
  answers the unverified rows above that name this story.

### [identity-stack#555]: One seam for tenant, role and permission claims (provider-neutral)

As a maintainer adding a provider, I want one place that turns verified claims into a tenant
and grants, so that a new claim shape is one function and not an edit to every dependency.

Depends on: nothing. Library: none. **Implementable today**, in parallel with
[identity-stack#553].

**Shared groundwork, filed twice.** The Zitadel provider epic (`epic-zitadel-provider.md`,
written in parallel) filed [identity-stack#566] (provider-neutral registration and tenant
resolution) the same day. It covers this seam and adds a shared provider builder, per-provider
logout settings and a request tenant selector. Only one should be built. If
[identity-stack#566] is kept, this issue closes, the Keycloak stories point at it, and
[identity-stack#556] drops its builder and logout-settings items. Keycloak needs the
claims-extractor part, not the request tenant selector.

Collisions: `dependencies/rbac.py` is also changed by [identity-stack#541] and sits next to
[identity-stack#513] (DDD migration of roles and permissions). Sequence them.

**Acceptance Criteria:**

- **Given** the existing unit and integration suites, **when** the seam lands, **then** they
  pass unmodified.
- **Given** any branch that refused before, **when** it is reached, **then** it refuses with
  the same status and detail.
- **Given** a fake source registered in a test, **when** `get_tenant_id` and
  `require_permission` run, **then** they return its tenant and honour its permission.

### [identity-stack#554]: `infra/keycloak/` Terraform root

As the owner, I want the realm described in Terraform like the other providers, so that the
realm is reviewable and reproducible beyond a JSON export.

Depends on: [identity-stack#553]. Library: none. Can run in parallel with
[identity-stack#556].

**Acceptance Criteria:**

- **Given** an empty realm in the compose container, **when** `terraform apply` runs, **then**
  the realm has the organizations, type clients, client roles, app clients and memberships of
  the import file.
- **Given** that realm, **when** a token is requested, **then** its `iss`, `aud`, `azp`,
  `organization` and `resource_access` match the shapes in the fixture from
  [identity-stack#553]. The full parity run is in [identity-stack#562].
- **Given** an applied root, **when** `terraform plan` runs again, **then** it is empty.
- **Given** `infra/PROVIDERS.md`, **when** it is read, **then** it lists the root and its
  credential source.

### [identity-stack#556]: Provider token config and RP-initiated logout

As an API caller holding a Keycloak token, I want the backend to authenticate it by
configuration, so that Keycloak is a provider and not a fork of the middleware.

Depends on: [identity-stack#553]. Library: none; `require_https` and `algorithms` are already on
core `TokenValidationConfig`, so [identity-model#1049] (the same options on the library's
FastAPI middleware) is not needed.

Collision: `services/logout.py` is rewritten by [identity-stack#516] later. Stay inside the
strategy table.

**Acceptance Criteria:**

- **Given** a valid token, **when** a protected route is called, **then** the request
  authenticates as provider `Keycloak`.
- **Given** a wrong issuer, an expired token, a non-RS256 signature, no `aud`, or an `aud`
  outside the configured set, **when** a protected route is called, **then** the answer is the
  uniform 401.
- **Given** the HTTPS switch at its default, **when** the plain-HTTP issuer is used, **then**
  validation refuses; **given** it off, **then** it validates.
- **Given** a Descope token, **when** it is offered on the Keycloak provider, **then** it is
  refused, **and** the reverse.
- **Given** a Keycloak principal, **when** `POST /api/auth/logout` is called, **then** the
  response has a `logout_url` on the realm's `end_session_endpoint` with `id_token_hint`, the
  app client id and a registered `post_logout_redirect_uri`.
- **Given** the issuer set and no audience, **when** the backend starts, **then** it refuses to
  start.

### [identity-stack#557]: Organizations as tenants, client roles as permissions

As a tenant member, I want the API to act in the organization and with the permissions my token
states, so that one login is one tenant and one user type and nothing else.

Depends on: [identity-stack#555], [identity-stack#556]. Library: none; mirrors the branches of
[identity-model#1050] and [identity-model#1051].

Collisions: [identity-stack#513] and [identity-stack#541], as for the seam.

**Acceptance Criteria:**

- **Given** a token with more than one `aud`, **when** a tenant-scoped route is called,
  **then** 403.
- **Given** an `organization` claim that is missing, empty, multi-valued or holds a non-string,
  in list or map shape, **when** a tenant-scoped route is called, **then** 403.
- **Given** an `azp` that is missing or not the app client configured for `aud`, **when** a
  tenant-scoped route is called, **then** 403.
- **Given** `resource_access[aud].roles` missing or the wrong type, **when** a permission is
  required, **then** 403.
- **Given** a valid token, **when** `get_tenant_id` runs, **then** it returns the organization
  alias **and** `require_permission` passes only for roles in `resource_access[aud].roles`.
- **Given** the two-organization user, **when** tokens for `acme` and `globex` are used,
  **then** each request is scoped to its own tenant.
- **Given** a Keycloak principal, **when** a `require_role` route is called, **then** 403
  (owner decision 1).

### [identity-stack#559]: Canonical identity for Keycloak principals

As a signed-in user, I want `GET /api/identity` to describe me under Keycloak, so that the SPA
shows my tenant, my permissions and the organizations I can switch to.

Depends on: [identity-stack#557]. Library: none.

Admin side. **In:** a read-only lookup of the user's organizations; Terraform owns the rest.
**Out:** a `KeycloakSyncAdapter`, inbound sync, reconciliation, and the Descope-backed admin
routers ([identity-stack#519], which moves those behind one adapter, is untouched).

Collision: `routers/protected.py` and identity resolution move in [identity-stack#516] later.

**Acceptance Criteria:**

- **Given** a first login, **when** `GET /api/identity` is called, **then** a canonical user
  and IdP link exist **and** the response carries the token's organization as current tenant
  and its client roles as permissions.
- **Given** the provisioning default tenant and role, **when** the response is built, **then**
  they are not reported as the caller's grants.
- **Given** the two-organization user, **when** the response is built, **then**
  `tenant_memberships` lists both.
- **Given** the Admin API is unreachable, **when** the endpoint is called, **then** 502.
- **Given** a Descope or Ory principal, **when** the endpoint is called, **then** the response
  is byte-identical to before.

### [identity-stack#561]: Frontend: log in, refresh, switch organization, log out

As a user, I want to sign in, stay signed in, change organization and sign out against
Keycloak, so that the app behaves as it does with the other providers.

Depends on: [identity-stack#556], [identity-stack#559]. Library: none. The config and hooks
from [identity-stack#377] (provider-agnostic frontend) are already on `main`.

**Acceptance Criteria:**

- **Given** only `VITE_OIDC_*` changes, **when** the SPA is built, **then** login with PKCE,
  refresh and logout work against Keycloak **and** there is no Keycloak-specific code path.
- **Given** the tenant scope template is set, **when** a tenant is chosen, **then**
  `signinRedirect` is called with the templated scope; **given** it unset, **then** the switch
  stays client-side as today.
- **Given** a completed switch, **when** identity reloads, **then** the UI shows the new tenant
  and its permissions.
- **Given** compose, **when** the frontend image is built, **then** the `VITE_OIDC_*` values
  reach it as build args.

### [identity-stack#562]: End-to-end proof against the compose Keycloak

As the owner, I want one automated run of the whole path, so that "Keycloak works" is a CI
result and each limit found is written down.

Depends on: [identity-stack#554], [identity-stack#561]. Library: none.

**Acceptance Criteria:**

- **Given** the E2E job, **when** it runs on a pull request, **then** it logs in, reads
  identity, calls a permission-gated route, is refused on one it lacks, switches organization
  with no login prompt, and logs out.
- **Given** Keycloak is absent in CI, **when** the suite runs, **then** it fails and does not
  skip.
- **Given** a realm built by Terraform, **when** the backend integration suite runs against it,
  **then** it passes.
- **Given** the run, **when** it finishes, **then** every unverified row above is settled or
  names a follow-up issue.

## Dependency order

```
#553 ─┬─> #554 ───────────────────────────┐
      └─> #556 ──┬─> #557 ─> #559 ─> #561 ─┴─> #562
#555 ────────────┘
```

[identity-stack#556] also feeds [identity-stack#561] directly (logout).

Numbers are identity-stack issues.

- **Start together:** [identity-stack#553] and [identity-stack#555]. Neither needs the other or
  any library release.
- **Then together:** [identity-stack#554] and [identity-stack#556].
- **Then in sequence:** [identity-stack#557], [identity-stack#559], [identity-stack#561],
  [identity-stack#562]. [identity-stack#554] may finish any time before the last.
- **Not in parallel with** [identity-stack#513] or [identity-stack#541]:
  [identity-stack#555] and [identity-stack#557].

## Acceptance

- From compose and env config alone, the SPA logs in against Keycloak, `GET /api/identity`
  returns the token's tenant and permissions, a permission-gated route answers, an organization
  switch issues a new token, and logout ends the Keycloak session.
- The evidence table has no unverified row without a recorded answer.
- Descope and Ory tests are unchanged and green.

## Out of scope

- Outbound sync to Keycloak, inbound sync and reconciliation.
- Admin routers (users, roles, access keys, FGA) operating on Keycloak.
- Gateway mode: no Tyk API definition for Keycloak.
- A per-route user-type gate. Permission names carry the type; add it when a route needs it.
- Per-organization permissions through organization groups.
- Service principals on Keycloak ([identity-stack#543], provider-neutral service principals)
  and early revocation ([identity-stack#542], revocation for claims-based providers).
- The library's Keycloak integration-test fixture, which was the subject of the superseded
  draft and belongs to identity-model.
- Migrating this backend to `fastapi-identity-model` (owner decision 6).

## Workflow decisions

Written with the `bmad-create-epics-and-stories` workflow, run without an interactive owner.
Where a step asks the owner, the answer came from the inputs:

| Step | Question | Answer, and from what |
|---|---|---|
| 1 | Required PRD and architecture documents | None exist for this provider. Inputs are the two planning issues, the Cloudflare Access epic and the code |
| 1 | Requirement numbering (`FR1`, `NFR1`) | Not used. `AGENTS.md` forbids invented code families; requirements are named in words |
| 1 | Output file | `epics/epic-keycloak-provider.md`, not `epics.md`, to match the repository's one-file-per-epic layout |
| 2 | How many epics | One: same core files, one risk boundary |
| 2 | Organise by user value | Kept one story per issue in the Cloudflare epic's shape. Two stories are enablers with no end-user outcome on their own (the local realm, the seam); both are the smallest thing later stories need |
| 3 | Story numbering (`Story 1.1`) | Not used; a story is its GitHub issue number |
| 3 | Story approval | Self-approved against the model in [identity-stack-planning#94] |
| 4 | Forward dependencies | None; the order above is topological |

[identity-stack#79]: https://github.com/jamescrowley321/identity-stack/issues/79
[identity-stack#377]: https://github.com/jamescrowley321/identity-stack/issues/377
[identity-stack#513]: https://github.com/jamescrowley321/identity-stack/issues/513
[identity-stack#514]: https://github.com/jamescrowley321/identity-stack/issues/514
[identity-stack#516]: https://github.com/jamescrowley321/identity-stack/issues/516
[identity-stack#519]: https://github.com/jamescrowley321/identity-stack/issues/519
[identity-stack#541]: https://github.com/jamescrowley321/identity-stack/issues/541
[identity-stack#542]: https://github.com/jamescrowley321/identity-stack/issues/542
[identity-stack#543]: https://github.com/jamescrowley321/identity-stack/issues/543
[identity-stack#552]: https://github.com/jamescrowley321/identity-stack/issues/552
[identity-stack#553]: https://github.com/jamescrowley321/identity-stack/issues/553
[identity-stack#554]: https://github.com/jamescrowley321/identity-stack/issues/554
[identity-stack#555]: https://github.com/jamescrowley321/identity-stack/issues/555
[identity-stack#556]: https://github.com/jamescrowley321/identity-stack/issues/556
[identity-stack#557]: https://github.com/jamescrowley321/identity-stack/issues/557
[identity-stack#559]: https://github.com/jamescrowley321/identity-stack/issues/559
[identity-stack#561]: https://github.com/jamescrowley321/identity-stack/issues/561
[identity-stack#562]: https://github.com/jamescrowley321/identity-stack/issues/562
[identity-stack#566]: https://github.com/jamescrowley321/identity-stack/issues/566
[identity-stack-planning#47]: https://github.com/jamescrowley321/identity-stack-planning/pull/47
[identity-stack-planning#94]: https://github.com/jamescrowley321/identity-stack-planning/issues/94
[identity-stack-planning#147]: https://github.com/jamescrowley321/identity-stack-planning/issues/147
[identity-model#1049]: https://github.com/jamescrowley321/identity-model/issues/1049
[identity-model#1050]: https://github.com/jamescrowley321/identity-model/issues/1050
[identity-model#1051]: https://github.com/jamescrowley321/identity-model/issues/1051
