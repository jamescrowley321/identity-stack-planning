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
draft in pull request [identity-stack-planning#47], which targeted the library's
integration-test matrix and predates the model below, and the earlier
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
Rows marked **measured** were observed on `quay.io/keycloak/keycloak:26.8.2` on 2026-11-15 and
are recorded in `keycloak/fixtures/README.md` in identity-stack, written by
[identity-stack#553] (local Keycloak in docker compose). Rows marked **unverified** are settled
by the story named.

| Claim | What the docs say | Status |
|---|---|---|
| Organizations are per realm | "To use organizations, you have to enable the feature for the current realm." ([managing organizations](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/organizations/managing-organization.adoc)) | verified |
| `organization` scope | Built-in optional client scope, added to every client by default, with an *Organization Membership* mapper ([mapping organization claims](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/organizations/mapping-organization-claims.adoc)) | verified |
| `organization:<alias>` | Maps one organization. A non-existent alias is rejected with `invalid_scope`. A non-member request is **not** rejected: Keycloak 26.8.2 issues a token with no `organization` claim and drops the scope (measured in [identity-stack#579](https://github.com/jamescrowley321/identity-stack/pull/579), the local Keycloak compose PR), so the backend must refuse a missing or different claim. **Several can be requested at once** (`organization:org-a organization:org-b`), so a token can name more than one. `organization` alone prompts a multi-organization user to pick; `organization:*` maps all. Formats cannot be mixed (same page) | verified; non-member behaviour measured |
| Shape of the `organization` claim | An array of alias strings, `["acme"]`, on access and ID tokens. The docs show only a map keyed by alias, which appears when the mapper adds id or attributes. Absent when no organization scope is requested | measured ([identity-stack#553] fixture README) |
| Alias is a stable key | Unique in the realm, URL-friendly, "cannot be changed afterwards" (managing organizations) | verified |
| Client roles in the token | Client roles go to `resource_access`; the roles in a token are the user's roles intersected with the client's role scope mappings ([role mappings in the token](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/clients/oidc/con-token-role-mappings.adoc)). The nesting is `resource_access.<client>.roles`, an array of strings, holding only the scope-mapped type client | verified; nesting measured ([identity-stack#553] fixture README) |
| `aud` is the type client | *Audience Resolve*, in the default `roles` scope, adds each client the token holds a client role for. The frontend client is not added. A user with no role on the type client gets no such audience ([audience support](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/clients/oidc/con-audience.adoc)) | verified |
| `aud` is *only* the type client | A JSON string, not an array, naming the one type client; no `account`. A user with no role on the type client gets a token with **no `aud` and no `resource_access`**, still carrying `azp` and `organization` | measured ([identity-stack#553] fixture README) |
| `azp` on access tokens is the app client | Present, equal to the app client | measured ([identity-stack#553] fixture README) |
| Endpoints | `/realms/{realm}/.well-known/openid-configuration`, `/realms/{realm}/protocol/openid-connect/logout` ([available endpoints](https://github.com/keycloak/keycloak/blob/26.8.2/docs/guides/securing-apps/partials/oidc/available-endpoints.adoc)). Issuer is `<KC_HOSTNAME>/realms/<realm>`, no trailing slash, equal to discovery's `issuer` from the host and from the backend container | verified; issuer string measured ([identity-stack#553] fixture README) |
| RP-initiated logout parameters | `id_token_hint`, `client_id` and `post_logout_redirect_uri` on the realm's `end_session_endpoint` are accepted: Keycloak answers 302 to the registered redirect URI | measured (integration test in [identity-stack#582], the provider token config pull request) |
| `hostname` | "Can be a full URL, or just a hostname." When set, `hostname-strict` is ignored. Backchannel URLs equal frontchannel URLs unless `hostname-backchannel-dynamic` is on ([hostname guide](https://www.keycloak.org/server/hostname)) | verified |
| Full-URL `hostname` with `http://` | Works. Every discovery endpoint uses that origin, and a `keycloak.localhost` compose network alias answers from the host and from Debian and Alpine containers | measured ([identity-stack#553] fixture README) |
| Realm import | `--import-realm` reads `.json` files from `/opt/keycloak/data/import`; skipped if the realm exists; environment placeholders supported ([import and export guide](https://www.keycloak.org/server/importExport)) | verified |
| Container | `quay.io/keycloak/keycloak`, `start-dev`, `KC_BOOTSTRAP_ADMIN_USERNAME`/`_PASSWORD` ([containers guide](https://www.keycloak.org/server/containers)); health on management port 9000 when `health-enabled`; the image has no `curl` ([health guide](https://github.com/keycloak/keycloak/blob/26.8.2/docs/guides/observability/health.adoc)) | verified |
| Plain HTTP | Realm SSL mode *External requests* allows HTTP only from private addresses; *None* is for development ([SSL modes](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/realms/ssl.adoc)) | verified |
| Terraform | `keycloak_organization`, `keycloak_organization_memberships` (authoritative over members), `keycloak_realm.organizations_enabled` (default `false`), `keycloak_openid_client` with `access_type`, `full_scope_allowed`, `pkce_code_challenge_method`, and `keycloak_generic_role_mapper` ([provider docs at v5.10.0](https://github.com/keycloak/terraform-provider-keycloak/tree/v5.10.0/docs/resources)) | verified |
| Listing a user's organizations | `GET /admin/realms/{realm}/organizations/members/{member-id}/organizations` ([Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html)). The admin role it needs was not read | verified; role **unverified**: [identity-stack#559] |
| Tenant switch needs no new login | For a member of both organizations, a second authorize request with the other `organization:<alias>` returns a code with no login form, also with `prompt=none`, and the same `sid`. For a non-member on a live session, the password page is shown and the token then has no `organization` claim; with `prompt=none` the answer is `login_required` | measured ([identity-stack#553] fixture README) |
| A refreshed token keeps its organization | Yes. A refresh that asks for another `organization:<alias>` succeeds but returns a token with no `organization` claim, so refresh cannot switch | measured ([identity-stack#553] fixture README) |
| Public client gets a refresh token in the standard flow | Yes (`expires_in` 300, `refresh_expires_in` 1800 with realm defaults) | measured ([identity-stack#553] fixture README) |
| Roles per organization | Organization groups can carry client roles, mapped into the `organization` claim per organization ([managing groups](https://github.com/keycloak/keycloak/blob/26.8.2/docs/documentation/server_admin/topics/organizations/managing-groups.adoc)). This is not the decided model | verified; see constraints |
| `organization` scope with no alias | A user in several organizations is stopped on Keycloak's organization picker page | measured ([identity-stack#553] fixture README); single-organization case per the docs row above |
| A token after the user is removed from its organization | Not measured: whether a refresh still returns the `organization` claim, and for how long | **unverified**: [identity-stack#559] |
| Session cookies over plain HTTP | Set `Secure; SameSite=None` although the origin is HTTP. Chromium keeps them for `keycloak.localhost`; `curl` with a cookie jar does not send them back | measured ([identity-stack#553] fixture README) |

### identity-stack, read at `origin/main` `afdb347` on 2026-11-15

| Claim | Actual |
|---|---|
| The backend uses the library's FastAPI middleware | No. `middleware/auth.py` is its own middleware over core `py_identity_model.aio.validate_token`, with `verify_iss` and `verify_aud` off and issuer, audience and token kind checked in `middleware/providers.py`. `fastapi-identity-model` is not a dependency |
| Library pin | `py-identity-model>=3.8.5,<4`, locked at 3.18.2 |
| Plain HTTP at a non-loopback host needs new library work | No. `TokenValidationConfig.require_https` and `DiscoveryDocumentRequest.policy` exist in 3.8.5 and at tag `py-v3.18.2`. The loopback exception covers only `localhost`, `127.0.0.1` and `::1` |
| Pinning RS256 needs new library work | No, but not through the config field: in discovery mode 3.18.2 replaces `TokenValidationConfig.algorithms` with the JWKS key's algorithm, so the allow-list is enforced on the JWT header in the middleware (found and tested in [identity-stack#582]) |
| Audience | `ProviderTokenConfig.audience` is one string; `audience_ok` is membership, so a multi-valued `aud` containing it passes |
| Tenant | `dependencies/tenant.py` reads `dct` only. Both middlewares set `request.state.tenant_id = claims.get("dct")` |
| What a tenant id is | A provider-native string, not one thing. `TenantResource.tenant_id` and `Document.tenant_id` are plain strings. `routers/roles.py` and `routers/idp_links.py` parse it as a canonical tenant UUID. `users.py`, `accesskeys.py`, `attributes.py`, `fga.py` and `documents.py` send it to the Descope management or FGA API as a Descope tenant id. Canonical `Tenant.id` is a UUID with a unique `name` |
| RBAC | `dependencies/rbac.py` reads the canonical model for `CANONICAL_RBAC_PROVIDERS` and `dct` + `tenants` for **every other provider**, so a new provider lands on the Descope claim path by default. No client-role path. 39 `require_role` gates, 0 `require_permission` |
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
  `fastapi-identity-model` gaps) tracks identity-model issues for a package this backend does
  not use. None is needed. Each story says so. The fail-closed branches
  in [identity-model#1050] (single-audience mode) and [identity-model#1051] (Keycloak claim
  helpers) are copied into [identity-stack#557] so a later swap is mechanical.
- **Fit the structure as it is.** The DDD migration ([identity-stack#514], the plan) moves
  federation in [identity-stack#516], later. No story waits for it. Collisions are named per
  story.
- **Fail closed, by the house rules.** conventions §17: every branch without an unambiguous
  answer refuses. conventions §3: a switch is named for its secure state.
- **The token binding holds on every request, not only tenant-scoped ones.** The middleware's
  audience check is a membership test, so a token with `member` among several audiences, or one
  minted for another client in the realm, would otherwise authenticate on every route that
  skips the tenant dependency, including `GET /api/identity`. For a Keycloak principal, exactly
  one `aud` and an `azp` mapped to it are checked at authentication, in both middlewares, before
  any claim becomes an identity, a tenant or a permission ([identity-stack#557]).
- **Status codes at the token.** A missing or unknown `aud`, more than one `aud`, or an `azp` that is not the
  app client for that `aud` is 401 at authentication (RFC 6750 `invalid_token`). A bad
  `organization` or a missing permission is 403 from a dependency. This moves two checks earlier
  than [identity-stack-planning#147] places them (owner decision 11).
- **A Keycloak principal never reaches the Descope claim path.** The source of tenant and
  grants is chosen by the provider that authenticated the request, never by which claims are
  present, and a provider with no declared source is refused. `dct` and `tenants` on a Keycloak
  token are ignored ([identity-stack#555], [identity-stack#557]).
- **A Keycloak tenant id is the organization alias, an opaque string.** It is not mapped to a
  canonical tenant UUID in this epic. A route that parses the tenant as a UUID, or sends it to
  the Descope management or FGA API, would act on the wrong thing, so a Keycloak principal is
  refused there. Every tenant-scoped route is either on a register of provider-neutral routes
  or carries a guard that refuses non-Descope principals, and a test walks the routes
  ([identity-stack#557]).
- **Not enabled until bound.** [identity-stack#556] authenticates Keycloak tokens by issuer and
  audience membership. Until [identity-stack#557] lands, a token minted for another client with
  `member` among its audiences authenticates, and a Keycloak token carrying `dct`/`tenants` is
  decided on the Descope claim path. The provider is active only when `KEYCLOAK_ISSUER_URL` is
  set. It must not be set in any deployment before [identity-stack#557] has merged; the two
  stories stack and merge together (owner decision 3).
- **Plain HTTP is local only.** The HTTPS switch from [identity-stack#556] can be turned off
  for any issuer. [identity-stack#557] ties it down: startup refuses HTTPS enforcement off
  unless the issuer host is loopback or ends in `.localhost`. Realm SSL mode *None* is for the
  compose realm only.
- **Client roles are realm-wide; the tenant is per token.** Client roles are assigned to the
  user, not to the user in an organization. A user who holds `tenant-admin` roles and belongs to
  `acme` and `globex` can request `organization:globex` and receive a `tenant-admin` token for
  `globex`, whoever granted the role and for whichever organization. The fixture realm has
  exactly this user. The model as decided therefore lets a privileged type carry across every
  organization the user is in. The same holds for any write permission of any type. The stories
  close this by default (owner decision 10): a permission crosses organizations only if it is on
  an explicit read-only list.
- **Leaving an organization is not yet known to end access.** For portable permissions nothing
  consults the directory, so a user removed from an organization may keep a working token until
  it expires (300 seconds by realm default), and longer if a refresh still returns the claim,
  which is unmeasured. [identity-stack#559] measures it (owner decision 13).
- **One answer per failure.** Authentication first (401). Then what the token alone decides
  (403). Then the directory lookup: a lookup that fails is 502 and is a denial, as conventions
  §17 has it for the FGA store; a lookup that answers "no" is 403; no lookup wired is 403.
- **Local only.** There is no hosted Keycloak. Compose is the environment.
- **Descope and Ory do not change.** Their tests pass unmodified in every story.

## Owner decisions needed

Each has a default the stories are written to. None blocks [identity-stack#553]. Decision 8
decides whether [identity-stack#555] is built at all.

1. **`require_role` for Keycloak principals.** The token has permissions and a type, no role.
   Default: refuse, so role-gated routes stay closed to Keycloak until [identity-stack#541]
   (route gates move to permissions) lands. Alternative: treat the type (`aud`) as the role.
2. **Where the SPA's organization list comes from.** A token names one organization. Default:
   the backend asks the Admin REST API, read-only, with a service-account client. Alternatives:
   request `organization` with no alias and let Keycloak show its organization picker, or keep
   canonical memberships in step (needs sync, out of scope).
3. **Enabling the provider before the binding exists.** Default, on: [identity-stack#557]
   stacks directly on [identity-stack#556] and the two merge together; no deployment sets
   `KEYCLOAK_ISSUER_URL` before then; and from [identity-stack#557] on, startup refuses the
   issuer unless the `azp` mapping, the type declarations and the provider's authorization
   source are all configured. Alternative: move the binding into [identity-stack#556].
4. **One realm definition or two.** Default: the import file serves compose and CI, Terraform
   builds the same realm, and parity is one test run against the Terraform-built realm
   ([identity-stack#562]). Alternative: a near-empty import and Terraform everywhere, which puts
   Terraform in every test run.
5. **A hosted Keycloak.** Default: none; the Terraform root has no remote state until there is.
6. **Converging on the library.** Default: keep the app's own layer, and file no story.
   Alternative: adopt `fastapi-identity-model` once it carries the
   [identity-stack-planning#147] work, which first needs this backend on `py-identity-model` 5.
7. **503 when discovery or JWKS is unreachable.** [identity-stack-planning#147] wants it. The
   middleware answers 401 for every provider today. Default: leave it; changing it is a
   cross-provider behaviour change with its own issue.
8. **Which seam issue survives.** [identity-stack#555] (this epic) or [identity-stack#566]
   (the Zitadel epic). Default: build the one whose epic starts first and drop the other.
   [identity-stack#555] is conditional on this: if [identity-stack#566] is chosen, every
   dependency on [identity-stack#555] below reads as a dependency on [identity-stack#566], and
   the criteria [identity-stack#555] adds for Keycloak (source chosen by provider, undeclared
   source refused) move to [identity-stack#557].
9. **Permission names.** `<domain>:<action>` here; Descope's are dotted (`documents.read`) and
   [identity-stack#541] proposes its own vocabulary. Default: the realm uses colon names taken
   from that issue's list once it exists, otherwise the Descope names with a colon.
10. **Privilege across organizations.** See the constraint on realm-wide client roles.
    Default, fail closed:
    - Each configured type is declared organization-bound or portable. Startup refuses an
      undeclared type. In the fixture realm `member` is portable and `tenant-admin` is
      organization-bound.
    - A token of an organization-bound type is accepted only when the user belongs to exactly
      one organization and it is the token's. A tenant admin who is in two organizations is a
      tenant admin in neither until this is decided.
    - A portable type grants only the permissions on an explicit portable list, and startup
      refuses a portable type with no list or a listed permission whose action is not `read` or
      `list`. Any other client role on a portable token is not granted. In the fixture realm
      the list is `documents:read`; `documents:write` on a `member` token grants nothing.

    Alternatives: grant per organization through Keycloak organization groups and read the
    roles from the `organization` claim (changes "RBAC from `resource_access`"); hold the
    per-organization grant in the canonical model; allow listed self-scoped write permissions
    on portable types; or accept realm-wide privilege and document it.
11. **401 at authentication for the token binding.** Default: more than one `aud` or a wrong
    `azp` is refused in the middleware with 401, so it holds on every route.
    [identity-stack-planning#147] lists the same checks as 403 from route dependencies, and
    notes that a middleware-level single-audience check answers 401.
12. **The token's organization is missing from the Admin API list.** Default: refuse with 403.
    The membership changed after the token was issued, and the token is not believed over the
    directory.
13. **Access after leaving an organization.** Default: accept the window for portable,
    read-only permissions until [identity-stack#559] has measured it, then choose: nothing
    more if the claim disappears at the next refresh; otherwise a membership check on a short
    cache for every Keycloak token, or [identity-stack#542] (revocation for claims-based
    providers).

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
- **Permissions from the token.** `resource_access[aud].roles`.
- **Token binding.** Single `aud` and `azp` bound to it, on every authenticated request.
- **Provider isolation.** A Keycloak principal is never decided from `dct` or `tenants`.
- **No privilege carried between organizations** by default.
- **Provider not usable half-built.** Startup refuses an incomplete Keycloak configuration,
  and plain HTTP away from a local issuer.
- **Tenant-scoped routes are provider-safe.** A Keycloak tenant never reaches a route that
  treats the tenant id as a Descope id or a canonical UUID.
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
| Tenant and permissions from the token; token binding; no carried privilege | [identity-stack#557] |
| Provider isolation | [identity-stack#555], [identity-stack#557] |
| Provider not usable half-built; tenant-scoped routes are provider-safe | [identity-stack#557] |
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
  the fixture README records what Keycloak does. Measured: it does not refuse. A fresh login
  yields a token with no `organization` claim and the scope dropped; on a live session with
  `prompt=none` the answer is `login_required`; an alias that does not exist is
  `invalid_scope`. Membership is therefore enforced by the backend, which refuses a missing
  claim in [identity-stack#557]; the identity provider is not the control.
- **Given** the imported realm, **when** its users are listed, **then** it has a member of one
  organization (`alice`), a user in both organizations who holds `member` and `tenant-admin`
  roles (`bob`), and a user with no client role (`carol`). Later stories add the principals
  they need to the same file and say so: [identity-stack#557] adds a tenant admin in exactly
  one organization and a `member` user without `documents:read`; [identity-stack#559] adds the
  service-account client.
- **Given** the fixture README, **when** it is read, **then** it records the claim shapes and
  answers the evidence rows above that name this story.

### [identity-stack#555]: One seam for tenant, role and permission claims (provider-neutral)

As a maintainer adding a provider, I want one place that turns verified claims into a tenant
and grants, so that a new claim shape is one function and not an edit to every dependency.

Depends on: nothing. Library: none. Needs no other story. **Conditional on owner decision 8.**

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
- **Given** a principal from one provider whose claims carry another source's shapes (for
  example `dct` and `tenants` on a non-Descope principal), **when** any dependency runs,
  **then** the source is the provider's declared one and the foreign claims are not read.
- **Given** a provider with no declared source, **when** a dependency runs, **then** 403. The
  Descope claim path is no longer the fallback for an unlisted provider.
- **Given** a request, **when** the middleware sets `request.state.tenant_id`, **then** the
  value comes from the seam and not from `dct` directly.

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
- **Given** the realm, **when** its protocol mappers are listed, **then** none writes a user
  attribute to `aud`, `azp`, `organization`, `resource_access`, `dct` or `tenants`.
- **Given** a later story adds a principal or client to the import file, **when** this root
  exists, **then** that story adds the same thing here. [identity-stack#562] checks the two
  against each other.

### [identity-stack#556]: Provider token config and RP-initiated logout

As an API caller holding a Keycloak token, I want the backend to authenticate it by
configuration, so that Keycloak is a provider and not a fork of the middleware.

Depends on: [identity-stack#553]. Library: none; `require_https` is already on core
`TokenValidationConfig` and RS256 is enforced on the JWT header, so [identity-model#1049] (the
same options on the library's FastAPI middleware) is not needed.

This story alone leaves the provider unsafe to enable: see "Not enabled until bound" above.
Its HTTPS switch is not tied to a local issuer; [identity-stack#557] adds that.

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

Depends on: [identity-stack#555] (or [identity-stack#566], owner decision 8),
[identity-stack#556]. Library: none; mirrors the branches of [identity-model#1050] and
[identity-model#1051].

Stacks directly on [identity-stack#556] and merges with it (owner decision 3). The
authentication and startup criteria below extend what that story built; they are here so its
text is unchanged.

Collisions: [identity-stack#513] and [identity-stack#541], as for the seam.

Principals this story adds to the realm import: a tenant admin in exactly one organization,
and a `member` user without `documents:read`.

**Acceptance Criteria:**

At startup:

- **Given** `KEYCLOAK_ISSUER_URL` is set, **when** the `azp`-to-`aud` mapping, the declaration
  of any configured type, or the portable permission list of a portable type is missing,
  **then** the backend refuses to start.
- **Given** a portable permission whose action is not `read` or `list`, **when** the backend
  starts, **then** it refuses to start.
- **Given** HTTPS enforcement is off, **when** the issuer host is not loopback and does not end
  in `.localhost`, **then** the backend refuses to start; **given** `keycloak.localhost`,
  **then** it starts.

At authentication, in `TokenValidationMiddleware` and `GatewayClaimsMiddleware`, for every
route:

- **Given** a Keycloak token whose `aud` is a list of more than one value, even when every
  value is a configured type client, **when** any protected route is called, including
  `GET /api/identity`, `GET /api/me` and a permission-gated route that is not tenant-scoped,
  **then** the uniform 401.
- **Given** an `azp` that is missing, not a string, or not the app client configured for the
  token's `aud`, **when** any protected route is called, **then** the uniform 401.

In the dependencies, from the token alone:

- **Given** an `organization` claim that is a list, **when** it has exactly one entry and that
  entry is a non-empty string, **then** that entry is the tenant; any other list is 403. This
  is the measured shape.
- **Given** an `organization` claim that is a map, **when** it has exactly one key and the key
  is a non-empty string, **then** the key is the tenant and the value is not read; any other
  map is 403.
- **Given** an `organization` claim that is missing or of any other type, **when** a route
  reads the tenant or a permission, **then** 403. Keycloak issues a token with no claim to a
  non-member, so this refusal is the membership control.
- **Given** `resource_access[aud].roles` missing or the wrong type, **when** a permission is
  required, **then** 403.
- **Given** a valid token of a portable type, **when** `require_permission` runs, **then** it
  passes only for a role that is in `resource_access[aud].roles` **and** on the portable list.
  A `member` token carrying `documents:write` is refused on a route needing it, shown on a
  route in the test's own app.
- **Given** the two-organization user's `member` tokens for `acme` and `globex`, **when** each
  is used, **then** `get_tenant_id` returns that token's alias.
- **Given** a Keycloak principal whose claims also carry `dct` and `tenants` naming another
  tenant with an `owner` role, **when** `get_tenant_id`, `get_tenant_claims`, `require_role`
  and `require_permission` run, **then** none reads them, the tenant is the organization alias
  **and** `request.state.tenant_id` is not the forged `dct`.
- **Given** a Keycloak principal, **when** a `require_role` route is called, **then** 403
  (owner decision 1).

Organization-bound types (owner decision 10):

- **Given** no lookup is wired, which is the state this story ships, **when** any
  organization-bound token is used, **then** 403.
- **Given** a test double of the lookup that returns `acme` and `globex`, **when** the
  two-organization tenant admin's token for `globex`, or for `acme`, is used on a route needing
  a `tenant-admin` permission, **then** 403.
- **Given** a test double that returns only the token's organization, **when** the
  single-organization tenant admin's token is used, **then** the route answers. The same case
  against the real lookup is in [identity-stack#559].
- **Given** a test double that raises, **when** an organization-bound token is used, **then**
  502 and no grant.

Routes:

- **Given** the app's tenant-scoped routes, **when** a test walks them, **then** each is on a
  register of provider-neutral routes or refuses a Keycloak principal with 403. A route that
  sends the tenant to Descope, or parses it as a UUID, is not on the register.
- **Given** the app, **when** its routes are listed, **then** two depend on
  `require_permission` and make no provider call: one needs `documents:read`, one
  `settings:manage`. If [identity-stack#541] has already gated real routes by permission, use
  those and add none.
- **Given** the `documents:read` route, **when** a `member` holder calls it, **then** it
  answers; **when** the `member` user without `documents:read` calls it, **then** 403.

### [identity-stack#559]: Canonical identity for Keycloak principals

As a signed-in user, I want `GET /api/identity` to describe me under Keycloak, so that the SPA
shows my tenant, my permissions and the organizations I can switch to.

Depends on: [identity-stack#557]. Library: none.

Admin side. **In:** a read-only lookup of the user's organizations, by a service-account
client holding only the read role that lookup needs. Its secret is a fixture value in the
compose realm, is read through `app.knobs`, and is listed in `infra/PROVIDERS.md`. Terraform
owns the rest.
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
- **Given** any request, **when** the organization lookup is made, **then** the member id is
  the verified token's `sub` and nothing from the path, query, headers or body.
- **Given** the token's organization is not in the list the Admin API returns, **when** the
  endpoint is called, **then** 403 (owner decision 12).
- **Given** the Admin API is unreachable, or answers 401 or 403 to the service account,
  **when** the endpoint or an organization-bound permission check runs, **then** 502, no
  grant, **and** the log names the status and not the secret.
- **Given** a token that fails a token-only check and an Admin API that is down, **when** the
  endpoint is called, **then** the token's answer wins: 401 or 403, and no lookup is made.
- **Given** an organization-bound token of a user in two organizations, **when** the endpoint
  is called, **then** 403, as on every other route.
- **Given** a `sub` that is not a well-formed identifier, **when** the lookup would run,
  **then** it is refused before any call; a well-formed one is URL-encoded into the path.
- **Given** no read-only admin role covers the membership endpoint, **when** that is found,
  **then** the story stops for an owner decision and grants nothing broader.
- **Given** the single-organization tenant admin and the real lookup, **when** a route needing
  a `tenant-admin` permission is called, **then** it answers; the two-organization tenant admin
  is still refused.
- **Given** a user removed from an organization while holding a token for it, **when** the
  token is used and then refreshed, **then** the fixture README records whether the
  `organization` claim survives the refresh and for how long (owner decision 13). This is a
  measurement, not a pass condition.
- **Given** the service-account client, **when** it calls a write endpoint (add a member,
  create an organization, map a role), **then** Keycloak refuses.
- **Given** the lookup, **when** [identity-stack#557]'s organization-bound check runs,
  **then** it uses this lookup: exactly one organization, equal to the token's.
- **Given** the service-account client, **when** it is added, **then** it is in the realm
  import, and in `infra/keycloak/` if that root exists, with only the read role the lookup
  needs.
- **Given** a provider whose tenant comes from the token, **when** the response is built,
  **then** it says so in one provider-neutral field, which the SPA uses to decide whether a
  switch needs a new token.
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
- **Given** a first login, **when** the SPA asks for scopes, **then** it asks for
  `organization` with no alias, because it cannot know the user's organizations yet. Keycloak
  maps the only organization or shows its picker, and the token names one.
- **Given** the tenant scope template is set, **when** a tenant is chosen, **then**
  `signinRedirect` is called with the templated scope.
- **Given** identity says the tenant comes from the token and the template is unset, **when**
  the switcher renders, **then** it shows the current tenant and offers no switch. The UI never
  shows one tenant while the API acts in another.
- **Given** identity says the tenant does not come from the token, **when** a tenant is chosen,
  **then** the switch stays client-side as today.
- **Given** a switch returns a token whose organization is missing or is not the one asked
  for, **when** the callback completes, **then** the SPA reports the failure and does not show
  the requested tenant. Keycloak answers a non-member request this way instead of refusing.
- **Given** a silent renew, **when** it completes, **then** the organization is unchanged;
  refresh is never used to switch.
- **Given** a completed switch, **when** identity reloads, **then** the UI shows the new tenant
  and its permissions.
- **Given** compose, **when** the frontend image is built, **then** the `VITE_OIDC_*` values
  reach it as build args.

### [identity-stack#562]: End-to-end proof against the compose Keycloak

As the owner, I want one automated run of the whole path, so that "Keycloak works" is a CI
result and each limit found is written down.

Depends on: [identity-stack#554], [identity-stack#561]. Library: none. The suite drives
Chromium: Keycloak sets `Secure` session cookies on its plain-HTTP origin, which Chromium keeps
for `keycloak.localhost`.

**Acceptance Criteria:**

- **Given** the E2E job, **when** it runs on a pull request, **then** it logs in, reads
  identity, calls the `documents:read` route from [identity-stack#557], is refused on the
  `settings:manage` one a `member` token lacks, switches organization, and logs out. The switch shows no
  login form, as measured for a member of both organizations.
- **Given** the user who holds `tenant-admin` roles and is in both organizations, **when** they
  sign in through the `tenant-admin` app for either organization, **then** every
  `tenant-admin` permission is refused, and so is `GET /api/identity`; **given** the tenant
  admin in one organization, **then** it is allowed there.
- **Given** a user outside `globex`, **when** they ask to switch to it, **then** no request is
  served in `globex`.
- **Given** a `member` user who holds `documents:write`, **when** they read
  `GET /api/identity` in either organization, **then** `documents:write` is not among the
  permissions: a write permission does not travel on a portable type.
- **Given** the import file as it stands after the earlier stories, **when** the Terraform
  root is compared with it, **then** every principal and client is in both.
- **Given** the user with no client role, **when** they sign in, **then** every protected
  route answers 401, because the token has no `aud`.
- **Given** Keycloak is absent in CI, **when** the suite runs, **then** it fails and does not
  skip.
- **Given** a realm built by Terraform, **when** the backend integration suite runs against it,
  **then** it passes.
- **Given** the run, **when** it finishes, **then** every evidence row still marked unverified
  is settled or names a follow-up issue.

## Dependency order

```
identity-stack#553 ─┬─> identity-stack#554 ──────────────────────────────────────────────┐
                    └─> identity-stack#556 ─┬─> identity-stack#557 ─> identity-stack#559 ─┤
identity-stack#555 ─────────────────────────┘                                             │
                         identity-stack#559 ─> identity-stack#561 ─> identity-stack#562 <─┘
```

[identity-stack#556] also feeds [identity-stack#561] directly (logout).

- **Start together:** [identity-stack#553] and, subject to owner decision 8,
  [identity-stack#555]. Neither needs the other or any library release.
- **Then together:** [identity-stack#554] and [identity-stack#556].
- **Then in sequence:** [identity-stack#557], stacked on [identity-stack#556] and merged with
  it, then [identity-stack#559], [identity-stack#561], [identity-stack#562].
  [identity-stack#554] may finish any time before the last.
- **Not in parallel with** [identity-stack#513] or [identity-stack#541]:
  [identity-stack#555] and [identity-stack#557].

## Acceptance

- From compose and env config alone, the SPA logs in against Keycloak, `GET /api/identity`
  returns the token's tenant and permissions, a permission-gated route answers, an organization
  switch issues a new token, and logout ends the Keycloak session.
- A tenant admin of one organization gains nothing in another, a write permission does not
  cross organizations, and a Keycloak token carrying forged `dct` or `tenants` gains nothing.
- The backend does not start with a half-configured Keycloak provider, or with plain HTTP
  against an issuer that is not local.
- The evidence table has no unverified row without a recorded answer.
- Descope and Ory tests are unchanged and green.

## Out of scope

- Outbound sync to Keycloak, inbound sync and reconciliation.
- Admin routers (users, roles, access keys, FGA) operating on Keycloak.
- Gateway mode: no Tyk API definition for Keycloak.
- A per-route user-type gate. Permission names carry the type; add it when a route needs it.
- Per-organization permissions through organization groups (an alternative under owner
  decision 10).
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
[identity-stack#582]: https://github.com/jamescrowley321/identity-stack/pull/582
[identity-stack-planning#47]: https://github.com/jamescrowley321/identity-stack-planning/pull/47
[identity-stack-planning#94]: https://github.com/jamescrowley321/identity-stack-planning/issues/94
[identity-stack-planning#147]: https://github.com/jamescrowley321/identity-stack-planning/issues/147
[identity-model#1049]: https://github.com/jamescrowley321/identity-model/issues/1049
[identity-model#1050]: https://github.com/jamescrowley321/identity-model/issues/1050
[identity-model#1051]: https://github.com/jamescrowley321/identity-model/issues/1051
