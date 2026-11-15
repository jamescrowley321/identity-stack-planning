---
workflowType: 'epic'
project_name: 'identity-stack'
epic_title: 'Zitadel as a self-hosted OIDC provider with organizations as tenants'
date: '2026-11-15'
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/governed-brain-implementation-plan.md (gate G5 candidate table)
  - docs/idp-rbac-comparison.md
  - _bmad-output/planning-artifacts/epics/epic-cloudflare-access-provider.md (format reference)
  - identity-stack source at afdb347 (origin/main, read 2026-11-15)
  - Zitadel documentation and source, read 2026-11-15 (listed under Evidence)
  - identity-stack docs/zitadel.md and backend/tests/fixtures/zitadel/ at 7fd851e (measured 2026-11-15, Zitadel v4.20.3)
---

# identity-stack - Epic Breakdown: Zitadel provider

**GitHub tracking:** [identity-stack#563](https://github.com/jamescrowley321/identity-stack/issues/563) (epic); stories [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564), [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565), [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566), [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567), [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568), [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) and [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570).

## Overview

One epic, seven stories. It adds Zitadel to identity-stack as a self-hosted provider next to
Descope and Ory, and answers the three questions
[`governed-brain-implementation-plan.md`](../../../docs/governed-brain-implementation-plan.md)
asks of it at gate G5: the flow matrix, its multi-tenancy model against the
canonical-store-is-authoritative rule, and operational cost.

No PRD or architecture document exists for this provider. The requirements below were extracted
from the G5 candidate table, the identity-stack tree at `afdb347`, Zitadel's documentation, and
measurements of a local v4.20.3 instance. The workflow's questions were answered from those
sources; the choices that remain the owner's are listed under "Owner decisions needed".

### Why

- Zitadel is the one G5 candidate nobody had assessed. Ory and Keycloak are already familiar, and
  a comparison of only familiar candidates tests familiarity.
- It is the only candidate whose tenant model (organizations inside one issuer) is first-class
  and free when self-hosted. Ory Organizations need a paid tier. Keycloak Organizations are
  planned separately: [identity-stack#552](https://github.com/jamescrowley321/identity-stack/issues/552) (the Keycloak provider epic), plan in [identity-stack-planning#155](https://github.com/jamescrowley321/identity-stack-planning/pull/155) (the pull request
  adding `epic-keycloak-provider.md`).
- A third issuer tests the claim in `identity-stack/backend/app/middleware/providers.py` that
  adding a provider is "configuration, not new validation code". At `afdb347` that is true of
  validation logic and false of wiring: see "What the code needs" below.

### Evidence

Three bases, each dated 2026-11-15:

- **Measured**: observed on a local Zitadel v4.20.3 by the fixture script of [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564), recorded in
  `docs/zitadel.md` and `backend/tests/fixtures/zitadel/` on the branch of [identity-stack#580](https://github.com/jamescrowley321/identity-stack/pull/580) (the pull
  request for [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564)), at `7fd851e`.
- **Read**: the linked source states it.
- **Inferred**: no source states it; the row says what the inference rests on.

| Claim | What was found | Source | Basis |
|---|---|---|---|
| Current version | `v4.20.3`, released 2026-11-13 | [releases](https://github.com/zitadel/zitadel/releases/latest) | Read |
| Licence | `AGPL-3.0-only` for the repository since v3.0 (announced 2025-03-13, Apache 2.0 before). `proto/` and docs stay Apache 2.0; `apps/login/` and the client packages are MIT. The Terraform provider is Apache 2.0 | [`LICENSING.md`](https://github.com/zitadel/zitadel/blob/main/LICENSING.md), [licence change post](https://zitadel.com/blog/apache-to-agpl), [provider `LICENSE`](https://github.com/zitadel/terraform-provider-zitadel/blob/main/LICENSE) | Read |
| What AGPL means for self-hosting here | "Using Zitadel's APIs without modifying the code doesn't trigger reciprocal requirements"; "Sharing unmodified Zitadel is generally permissible". `LICENSING.md` says compliance is the user's responsibility | Same | Read; that it covers this workspace's use is **inferred**, not legal advice. Owner decision 2 |
| Local compose shape | Four containers: a Traefik proxy (the only published port, `127.0.0.1:8480`), the API (`start-from-init`), Login V2, and a dedicated `postgres:17.10-alpine`. Healthy about 30 s after start | `docs/zitadel.md` | Measured |
| Database | PostgreSQL 14 to 18 | [database guide](https://zitadel.com/docs/self-hosting/manage/database) | Read |
| Masterkey | Exactly 32 characters, set before first start, cannot be changed afterwards | [compose guide](https://zitadel.com/docs/self-hosting/deploy/compose) | Read |
| Issuer | `http://zitadel.localhost:8480`: scheme, external domain, external port, no trailing slash. Every token's `iss` is the same string. Any other host, including `http://localhost:8480`, gets 404 | `discovery.json` | Measured |
| One issuer URL for browser and containers | `*.localhost` resolves to loopback on the host; inside the compose network the proxy carries the alias `zitadel.localhost` and listens on 8480. curl inside a container cannot use it (it resolves `*.localhost` itself); Python clients can | `docs/zitadel.md` | Measured |
| py-identity-model and the local issuer | 3.18.2 refuses the discovery fetch under its default policy ("HTTPS is required by discovery policy"): the issuer is plain HTTP and `zitadel.localhost` is not treated as loopback | `docs/zitadel.md` | Measured |
| Bootstrap | First start creates, from `ZITADEL_FIRSTINSTANCE_*` alone: organization `ZITADEL`, an `IAM_OWNER` machine user `terraform-admin` whose personal access token is written to a volume, the Login V2 service user, and a human admin with a verified email | `docs/zitadel.md` | Measured |
| The bootstrap machine user can drive Terraform | The provider accepts `access_token` (a PAT). The fixture script created a project, a role, applications and machine users with it over the API | [provider docs](https://github.com/zitadel/terraform-provider-zitadel/blob/main/docs/index.md), `docs/zitadel.md` | Read and measured for the API. That every Terraform resource in [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) works with it is **inferred** |
| Tenancy model | Instance → organization → project → application. "Generally a user belongs to and is managed by one organization." A project owner grants a project, with a subset of its roles, to another organization, which then assigns those roles to its own users | [B2B scenario](https://zitadel.com/docs/guides/solution-scenarios/b2b), [granted projects](https://zitadel.com/docs/concepts/structure/granted_projects) | Read |
| Organization claim | `urn:zitadel:iam:user:resourceowner:id`, `:name` and `:primary_domain`, in the access token, ID token and UserInfo, **only** when scope `urn:zitadel:iam:user:resourceowner` is requested. It names the user's home organization. No `urn:zitadel:iam:org:id` claim exists | `human-access-token-project.json`, [scopes](https://zitadel.com/docs/apis/openidoauth/scopes) | Measured |
| Roles claim shape | An object: role key → organization id → organization primary domain | `human-access-token-roles.json` | Measured |
| When roles are in a JWT access token | For a human, only when the application sets `accessTokenRoleAssertion`. Without it there is no roles claim even with a grant and the roles scope; UserInfo returns it | `human-access-token-roles.json`, `human-access-token-project.json`, `human-userinfo-project.json` | Measured |
| Roles, not permissions | Zitadel projects have roles only. No permission object appears in the project, role or grant resources | [provider resource list](https://github.com/zitadel/terraform-provider-zitadel/tree/main/docs/resources) | **Inferred** from absence |
| Access token format | Opaque by default, for an application and for a machine user. JWT has to be asked for: `OIDC_TOKEN_TYPE_JWT` on the application | `defaults.json` | Measured |
| `aud` of a human token | The client id of **every** application in the project, then the project id, with no audience scope requested. The project-audience scope adds nothing. The ID token's `aud` is identical | `human-access-token-openid.json`, `human-access-token-project.json`, `human-id-token-project.json` | Measured |
| `aud` of a machine-user token | Its own client id; with the project-audience scope, the project id only | `machine-access-token-openid.json`, `machine-access-token-project.json` | Measured |
| Which client a token was issued to | Access token: a `client_id` claim, no `azp`. ID token: `client_id` and `azp`, plus `at_hash`, `auth_time`, `sid`, `amr`. Both have header `typ: JWT`, the same `iss` and the same `aud` | `human-access-token-project.json`, `human-id-token-project.json` | Measured. That these claim sets are stable across versions is **inferred** |
| `email` and `email_verified` | Absent from the JWT access token and from the ID token, for a human with a verified email and scopes `openid profile email`. UserInfo returns both | `human-access-token-project.json`, `human-id-token-project.json`, `human-userinfo-project.json` | Measured |
| Token lifetimes | Access and ID token 12 h (`exp - iat` in the fixtures is 43 200 s); refresh token idle 30 d by default | fixtures, [`defaults.yaml`](https://github.com/zitadel/zitadel/blob/main/cmd/defaults.yaml) | Measured and read |
| Logout | `end_session_endpoint` at `/oidc/v1/end_session`; takes `id_token_hint`, `client_id`, `post_logout_redirect_uri`, `state`. `backchannel_logout_supported` is true | [endpoints](https://zitadel.com/docs/apis/openidoauth/endpoints), `discovery.json` | Read and measured |
| What logout revokes | Not stated: whether ending the session also invalidates the refresh token and issued JWT access tokens | — | Unsettled. [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) records it |
| SPA login | "User Agent" application type, authorization code with PKCE (`S256` only), auth method none; refresh-token grant is a per-app grant type; `dev_mode` permits `http` redirect URIs | [applications](https://zitadel.com/docs/guides/manage/console/applications), [`application_oidc`](https://github.com/zitadel/terraform-provider-zitadel/blob/main/docs/resources/application_oidc.md), `discovery.json` | Read and measured |
| Self-registration | A login policy per organization carries `allow_register`; the provider's example sets it `true` | [`login_policy`](https://github.com/zitadel/terraform-provider-zitadel/blob/main/docs/resources/login_policy.md) | Read. The instance default was not measured |
| Machine-to-machine | Service (machine) users; `client_credentials` and JWT profile grants; `private_key_jwt` client authentication; personal access tokens | endpoints page, fixtures | Read and measured |
| Token exchange (RFC 8693) | Documented: scope and audience reduction, token-type conversion, impersonation, delegation with an `act` claim. "Experimental", behind the instance feature `oidc_token_exchange`. Not among `grant_types_supported` on a default instance | [token exchange](https://zitadel.com/docs/guides/integrate/token-exchange), [`instance_features`](https://github.com/zitadel/terraform-provider-zitadel/blob/main/docs/resources/instance_features.md), `discovery.json` | Read and measured |
| DPoP (RFC 9449) | Not advertised: no `dpop_signing_alg_values_supported`. Open feature request [zitadel#5402](https://github.com/zitadel/zitadel/issues/5402) | `discovery.json` | Measured |
| Mutual TLS (RFC 8705) | Not advertised: no `mtls_endpoint_aliases`, no `tls_client_certificate_bound_access_tokens`. Open feature request [zitadel#8597](https://github.com/zitadel/zitadel/issues/8597) | `discovery.json` | Measured |
| Pushed authorization requests (RFC 9126) | Not advertised: no `pushed_authorization_request_endpoint`. Open feature request [zitadel#10239](https://github.com/zitadel/zitadel/issues/10239) | `discovery.json` | Measured |
| Rich authorization requests (RFC 9396) | Not advertised: no `authorization_details_types_supported` | `discovery.json` | Measured |
| Terraform provider | `zitadel/zitadel` `v3.8.7` (2026-09-25). Covers organizations, projects, project roles, project grants, user grants, OIDC and API applications, human and machine users, login policies, OIDC settings (token lifetimes), instance features, Actions v2 targets and executions. The instance itself is not a resource | [provider docs](https://github.com/zitadel/terraform-provider-zitadel/tree/main/docs) | Read |
| Outbound events | Actions v2: a target (webhook, call or async) plus an execution on a request, response, function or event. Calls carry a `ZITADEL-Signature` HMAC header. `PreUserinfo` and `PreAccessToken` functions can append claims | [Actions v2](https://zitadel.com/docs/concepts/features/actions_v2), [usage](https://zitadel.com/docs/guides/integrate/actions/usage) | Read. Which event names exist is not stated there; out of scope here |
| Management API | v2 resource services (user, organization, project, application, authorization, session, action) over REST, gRPC and Connect are "for all new integrations"; v1 is "fully supported ... but not being extended" | [API introduction](https://zitadel.com/docs/apis/introduction) | Read |
| Operating cost | About 512 MB RAM and under one core for Zitadel; compose is "ideal for getting started and homelab deployments", Helm for production; any proxy in front must speak HTTP/2 | [production guide](https://zitadel.com/docs/self-hosting/manage/production) | Read. Memory at idle and upgrade steps are measured by [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) |

### The G5 questions, answered from the evidence

| Question | Answer | Basis |
|---|---|---|
| Request-bound authorization detail | Not first-class. No RAR. A `PreAccessToken` action could append a claim, which is assembly, not support | Measured (discovery) |
| Delegated exchange | Present, experimental, off by default; emits `act` | Read |
| Sender-constrained tokens | Absent: neither DPoP nor mutual TLS is advertised | Measured (discovery) |
| Tenancy against the canonical-store rule | Compatible if organizations are a projection of canonical tenants and no request-time decision reads a Zitadel claim. One provisioning-time exception remains: owner decision 4 | Design choice |
| Operational cost | Four containers and one Postgres database locally, about 30 s to healthy. Memory and upgrade cost come from [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) | Measured in part |

Zitadel fails two of the three flow-matrix rows. That is a finding for G5, not a reason to skip
the epic: identity-stack needs only standard login, refresh and logout from it, and the tenancy
row needs the mapping below built and exercised.

### Constraints

- **Self-hosted.** Zitadel runs in docker compose from pinned upstream images. No cloud tenant.
- **Free.** No paid tier, no commercial licence. A design that needs either is a finding.
- **Unmodified images.** Nothing in identity-stack vendors, patches or rebuilds AGPL code.
- **Terraform is the source of truth.** Organizations, the project, roles, grants, policies,
  applications and test users are Terraform resources. The only state outside Terraform is what
  first start creates.
- **No console clicks.** A step that needs the Zitadel console is a defect in the story.
- **Existing providers unchanged.** Descope and Ory behaviour and their tests stay as they are.
- **Hardening beyond spec MUSTs is opt-in**, with three stated exceptions that bind a token to
  this API and are always on for this provider: the audience check (as for Ory), the `client_id`
  check, and the refusal of ID tokens. See "Token binding" below.

### Recommended tenancy and RBAC mapping

| identity-stack | Zitadel | How they are linked |
|---|---|---|
| Deployment | One instance, one issuer | — |
| The application | One project (`identity-stack`) in a platform organization, with a user-agent OIDC app for the SPA | Terraform |
| Tenant (`tenants` row) | One organization, linked by `tenants.external_org_id` | Seeded tenants: Terraform creates the organization and a scripted seed writes the canonical row from the Terraform output ([identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565)). Tenants created at runtime: the adapter creates the organization ([identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569)) |
| User | A human user in exactly one organization, linked by `idp_links (provider, sub)` | Zitadel → canonical at first login |
| Membership of further tenants | Canonical `user_tenant_roles` rows only | Canonical only |
| Roles and permissions | Canonical. Zitadel carries no permissions and its roles are not read | Canonical only |
| Active tenant | The caller's sole canonical membership, or a request selector checked against canonical memberships | Canonical |

**Authorization is canonical.** `zitadel` joins `CANONICAL_RBAC_PROVIDERS` and
`JIT_ENABLED_PROVIDERS`, as Ory does. The token says who the caller is; Postgres says what the
caller may do. The SPA application leaves `accessTokenRoleAssertion` off, so the access token
carries no roles claim at all.

**One Zitadel claim is read, once, and it does grant something.** At first login,
`urn:zitadel:iam:user:resourceowner:id` selects the canonical tenant the new user is provisioned
into, through `external_org_id`, with the default role `member`. No request-time decision reads
the claim, and nothing Zitadel says later changes a grant. But the first grant is decided by a
provider-proprietary claim, so the G5 condition "no decision term reads a provider-proprietary
claim" holds for requests and not for provisioning. The exception is bounded: one role, one
time, only for an organization a canonical tenant already names. Whether to accept it is owner
decision 4.

**Because that claim grants membership, who can be in a tenant organization matters.**
Self-registration is off for the instance default and for every tenant organization
(`allow_register = false`), so a tenant organization holds only users its administrators or
Terraform created. A missing organization claim, or an organization no tenant names, provisions
nothing.

**Terraform creates the four role definitions and a project grant per tenant organization, and
no role grants to users.** Nothing reads Zitadel roles. The definitions keep the claims-based
alternative one change away; the roles-claim shape is already recorded.

What this costs:

- **A mapping to keep.** Each tenant needs its organization id in `external_org_id`. A tenant
  with none is unreachable for first login from that organization.
- **Two membership notions.** Zitadel puts a user in one organization; canonical memberships can
  span several. The Zitadel console will not show the second.
- **Zitadel's own role checks stay off.** `project_role_check` refuses login to users without a
  Zitadel role grant, which would make Zitadel a second authority.
- **A UserInfo call at first login.** The access token has no email, and provisioning requires a
  verified one.
- **An adapter for tenants created at runtime.** A tenant created through the API has no
  organization until the adapter in [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) creates one.

The alternative is claims-based: read tenant and roles from
`urn:zitadel:iam:org:project:roles`. It was not recommended because it puts a proprietary claim
in every decision, Zitadel has no permissions to carry, and with a 12-hour default access token
a removed role keeps working until expiry unless [identity-stack#542](https://github.com/jamescrowley321/identity-stack/issues/542) (revocation before expiry for
claims-based providers) lands first.

### Token binding

Audience alone does not bind a Zitadel token to this API. Measured: a human token's `aud` lists
every application in the project plus the project id, an ID token has the same `aud`, `iss` and
`typ` as an access token, and the logout redirect puts the ID token in a URL (`id_token_hint`).
[identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) therefore checks all of the following, and refuses with 401 otherwise:

1. Signature against the instance JWKS, and `iss` equal to the configured issuer.
2. `aud` contains the configured project id.
3. `client_id` equals the configured SPA client id. Access tokens carry `client_id` and no `azp`.
4. The token is not an ID token: it carries none of `azp`, `at_hash`, `auth_time`, `sid` or
   `nonce`. Measured ID tokens carry the first four; measured access tokens carry none.

Checks 3 and 4 rest on claim sets observed on v4.20.3, not on a documented contract. The tests
are built from the recorded fixtures, so a re-record after a version change that moves a claim
fails them.

A machine-user token fails check 3 by design. Service principals on Zitadel are out of scope
([identity-stack#543](https://github.com/jamescrowley321/identity-stack/issues/543), provider-neutral service principals).

### What the code needs (read at `afdb347`)

| Finding | Where | Consequence |
|---|---|---|
| Ory's settings are named parameters (`ory_issuer_url`, `ory_audience`, `ory_require_audience`), defined in one file and passed through four more | `middleware/providers.py`, `middleware/factory.py`, `middleware/auth.py`, `middleware/claims.py`, `routers/auth.py` | Each new provider edits all five files. Provider-neutral groundwork |
| RP-initiated logout reads `ORY_CLIENT_ID` and `ORY_POST_LOGOUT_REDIRECT_URI` | `services/logout.py` | A second RP-initiated provider gets Ory's client id. Provider-neutral groundwork |
| `get_tenant_id` reads only the Descope `dct` claim; 36 references across routers and dependencies | `dependencies/tenant.py` | A principal from a provider without `dct` gets 403 "No tenant context" on those routes. Provider-neutral groundwork |
| Canonical grants need exactly one membership or a `dct` naming one; the SPA's tenant switcher is client-side only and sends nothing | `dependencies/rbac.py`, `frontend/src/contexts/IdentityContext.tsx` | A canonical-provider user in two tenants is refused on every role-gated route. Provider-neutral groundwork |
| Just-in-time provisioning takes `email` and `email_verified` from access-token claims and always uses the tenant named `default` | `routers/protected.py`, `services/identity_provisioning.py` | Zitadel needs the organization-mapped tenant and UserInfo for the email |
| `ProviderTokenConfig` has an audience check and a Descope-only token-kind check; nothing checks `client_id` | `middleware/providers.py` | The token-binding checks above are new |
| Discovery is fetched under py-identity-model's default policy | `middleware/auth.py`, `services/logout.py` | The local plain-HTTP issuer needs a per-provider HTTPS switch, on by default |
| `ProviderType` has no `zitadel`; it has `oidc` | `models/identity/provider.py` | Register the provider as type `oidc`; no migration |
| `tenants.external_org_id` exists, nullable, commented as Ory-only | `models/identity/tenant.py` | Reuse it |
| Every service is built with `DescopeSyncAdapter`; `OrySyncAdapter` exists with no HTTP client behind it | `dependencies/identity.py`, `services/adapters/ory.py` | Adapter selection does not exist yet |
| The SPA is already provider-neutral | `frontend/src/config/oidc.ts`, `hooks/useTenants.ts` | Login is env-only |

### Provider-neutral groundwork, shared with the Keycloak epic

[identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) is not Zitadel work. The Keycloak epic filed the overlapping [identity-stack#555](https://github.com/jamescrowley321/identity-stack/issues/555) (one seam for tenant,
role and permission claims), and [identity-stack#556](https://github.com/jamescrowley321/identity-stack/issues/556) (Keycloak provider token config) and [identity-stack#533](https://github.com/jamescrowley321/identity-stack/issues/533) (backend
provider config for Cloudflare Access) need the same builder. Two seams:

1. **Provider registration.** A provider is one `ProviderTokenConfig` in a list built in one
   place, carrying its own client id, post-logout URI and HTTPS switch.
2. **Tenant and grant resolution.** One function answers "which tenant, which roles, which
   permissions" for a request. Each provider supplies an extractor: Descope reads `dct` and
   `tenants`; Keycloak reads its organization claim and `resource_access[aud].roles`; Ory and
   Zitadel return nothing and fall through to the canonical store.

[identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) covers both seams and adds the request tenant selector; [identity-stack#555](https://github.com/jamescrowley321/identity-stack/issues/555) covers the second seam
only. One of the two is implemented. Owner decision 7 picks which.

### Owner decisions needed

Each has a default. A story may start on the default; the decision changes it only if the owner
says otherwise.

| # | Decision | Default | Affects |
|---|---|---|---|
| 1 | Go ahead, given Zitadel has no sender-constrained tokens and no RAR? | Yes, as a proving-ground provider and to exercise the tenancy mapping. Record the flow-matrix result against G5 | Everything |
| 2 | Is AGPL-3.0 acceptable for unmodified images in local development and CI? | Yes. Not legal advice | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) |
| 3 | Canonical authorization or claims-based? | Canonical | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) |
| 4 | Accept that the organization claim decides the first `member` grant at first login? | Accept, with self-registration off. The alternative is to provision the user with no membership and require a canonical invite, which leaves a first-login user with no tenant | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) |
| 5 | How does a canonical-provider request name its tenant: a request header checked against canonical memberships, or a token re-issued per tenant? | Header. It is provider-neutral and grants nothing by itself | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566), [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568) |
| 6 | Terraform state for `infra/zitadel/`: local and git-ignored, or HCP Terraform? | Local. The instance is disposable and HCP's remote runs cannot reach `zitadel.localhost` | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) |
| 7 | Which groundwork issue is implemented: [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) or [identity-stack#555](https://github.com/jamescrowley321/identity-stack/issues/555)? | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566), since it contains the other's scope; close [identity-stack#555](https://github.com/jamescrowley321/identity-stack/issues/555) and point the Keycloak stories at it | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) |
| 8 | When is the admin adapter built? | After [identity-stack#513](https://github.com/jamescrowley321/identity-stack/issues/513) (roles and permissions onto a functional core) merges, because both edit `dependencies/identity.py`. Do not wait for [identity-stack#518](https://github.com/jamescrowley321/identity-stack/issues/518) (sync driven by domain events); that refactor moves the adapter later either way | [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) |
| 9 | Access-token lifetime on the local instance | 15 minutes, set in Terraform. The 12-hour default leaves a logged-out token usable for up to 12 hours, because JWT access tokens are validated locally and revocation is [identity-stack#542](https://github.com/jamescrowley321/identity-stack/issues/542) | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565), [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) |

### Relationship to the backend refactor

[identity-stack#514](https://github.com/jamescrowley321/identity-stack/issues/514) (migration plan: DDD with a functional core) orders a refactor of the backend. Every
story here fits the tree at `afdb347` and none waits for it.

| Story | Touches | Collision |
|---|---|---|
| [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) | `dependencies/rbac.py`, `dependencies/tenant.py`, `middleware/`, `services/logout.py` | `rbac.py` builds the repositories [identity-stack#513](https://github.com/jamescrowley321/identity-stack/issues/513) reshapes: keep the change to tenant selection and rebase on whichever lands first. Also overlaps [identity-stack#406](https://github.com/jamescrowley321/identity-stack/issues/406) (startup-built typed config) and [identity-stack#541](https://github.com/jamescrowley321/identity-stack/issues/541) (permission gates). Later moved by [identity-stack#516](https://github.com/jamescrowley321/identity-stack/issues/516) (federation onto a functional core) |
| [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) | `middleware/providers.py`, `middleware/auth.py`, `routers/protected.py`, `services/identity_provisioning.py` | None with [identity-stack#513](https://github.com/jamescrowley321/identity-stack/issues/513) or [identity-stack#519](https://github.com/jamescrowley321/identity-stack/issues/519) (Descope pass-through routers). Later moved by [identity-stack#516](https://github.com/jamescrowley321/identity-stack/issues/516) |
| [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) | `dependencies/identity.py`, `services/adapters/` | **Collides with [identity-stack#513](https://github.com/jamescrowley321/identity-stack/issues/513)**: both edit the role and permission service wiring in `dependencies/identity.py`. No overlap with [identity-stack#519](https://github.com/jamescrowley321/identity-stack/issues/519) as long as the adapter is selected in `dependencies/` and no router changes |
| Others | compose, `infra/zitadel/`, frontend, tests | None |

### Out of scope

- A hosted or production Zitadel. Local compose and CI only.
- Mirroring roles, permissions or role assignments into Zitadel.
- Inbound events from Zitadel (Actions v2 webhooks). It waits for [identity-stack#518](https://github.com/jamescrowley321/identity-stack/issues/518).
- Revoking a JWT access token before it expires. That is [identity-stack#542](https://github.com/jamescrowley321/identity-stack/issues/542).
- Token exchange, service principals and delegated actors on Zitadel. Those are [identity-stack#543](https://github.com/jamescrowley321/identity-stack/issues/543) and
  [identity-stack#544](https://github.com/jamescrowley321/identity-stack/issues/544) (narrowed grants for delegated actors).
- Per-organization branding, external identity providers, SAML, SCIM.
- Gateway mode (Tyk) for Zitadel tokens.
- A `zitadel` value in the `provider_type` enum.

## Requirements Inventory

### Functional Requirements

1. One command starts a local Zitadel that reaches the same state every time: pinned version,
   bootstrap credential on a volume, issuer reachable at one URL from the browser and from the
   backend container, and recorded fixtures of what the instance issues.
2. Organizations, the project, roles, project grants, login policies, the SPA application, a
   machine user and test users are Terraform resources that apply cleanly to a fresh instance;
   a scripted seed links them to canonical tenants.
3. Adding a provider is one registration in one place; RP-initiated logout takes its client id
   and post-logout URI from that provider.
4. Every tenant-scoped route gets its tenant from one resolver that works for providers with and
   without tenant claims.
5. The backend accepts a Zitadel JWT access token issued to the SPA and refuses every other
   token the instance issues, including ID tokens and tokens for other applications.
6. A Zitadel principal resolves to a canonical identity; first login provisions it into the
   tenant mapped from its organization.
7. Roles and permissions for a Zitadel principal come from the canonical store.
8. The SPA logs in with authorization code and PKCE, refreshes silently and logs out through
   `end_session_endpoint`, from environment variables alone.
9. Switching tenant in the SPA changes the tenant the backend authorizes against.
10. A tenant or user created through the API appears in Zitadel as an organization or user.
11. An automated end-to-end run proves login, canonical identity, a role-gated call, a tenant
    switch and logout with no external credentials.
12. The G5 questions for Zitadel are answered from measurements and recorded.

### NonFunctional Requirements

1. Self-hosted and free: no cloud tenant, paid tier or commercial licence.
2. Terraform is the source of truth; no console steps.
3. Descope and Ory behaviour and tests are unchanged.
4. Fail closed: audience and client required, ID tokens refused, ambiguous tenant refused, no
   provisioning on an unverified email or an unmapped organization.
5. No request-time authorization decision reads a Zitadel-proprietary claim.
6. Nobody can place themselves in a tenant organization: self-registration is off.
7. Hardening beyond spec MUSTs is opt-in, apart from the token binding above.
8. Backend changes follow `identity-stack/docs/conventions.md`: `app.knobs`, `app.outbound`,
   `Result`, a row per variable in `environment-variables.md`, switches named for the secure
   state.
9. No story waits on the refactor ordered by [identity-stack#514](https://github.com/jamescrowley321/identity-stack/issues/514).
10. Zitadel images are used unmodified.

### Additional Requirements

- Zitadel answers 404 unless the request host matches its external domain, so the browser and
  the backend container use the one issuer URL `http://zitadel.localhost:8480`.
- py-identity-model refuses that plain-HTTP issuer by default, so the backend needs a
  per-provider HTTPS switch that the local stack turns off.
- The masterkey is 32 characters and fixed at first start; resetting the instance means deleting
  its volumes.
- No starter template. The pattern to copy is `infra/ory/` for Terraform and the `hydra-test`
  service in `docker-compose.test.yml` for a credential-free local issuer.
- Test resources come from docker compose, not from containers started in test code.

### UX Design Requirements

None. No UX document exists and no screen changes: the tenant switcher and login page are
reused as they are.

### Requirements coverage map

| Requirement | Story |
|---|---|
| 1 Local instance and fixtures | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) |
| 2 Terraform root and seed | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) |
| 3 Provider registration | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) |
| 4 Tenant resolver | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) |
| 5 Token acceptance and binding | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) |
| 6 Identity and provisioning | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) (code), [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) (seeded tenants) |
| 7 Canonical roles | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) |
| 8 SPA login, refresh, logout | [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568) |
| 9 Tenant switching | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) (backend), [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568) (SPA), [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) (a seeded user in two tenants) |
| 10 Admin adapter | [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) |
| 11 End-to-end proof | [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) |
| 12 G5 answers | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) (fixtures), [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) (write-up) |

## Epic List

### Epic: Zitadel as a self-hosted OIDC provider with organizations as tenants

A developer runs identity-stack against a local Zitadel: a user in an organization logs in, lands
in the matching tenant with canonical roles, switches tenant, and logs out, all from
Terraform-managed configuration. The run answers the G5 questions.

**Requirements covered:** all twelve.

One epic, not several: the outcome is one login path, the stories share the same few files, and
no result from an early story would redirect a later one except owner decision 3, which has a
default.

## Epic: Zitadel as a self-hosted OIDC provider with organizations as tenants

Tracked by [identity-stack#563](https://github.com/jamescrowley321/identity-stack/issues/563).

### Dependency order

```
identity-stack#564 ──┬──> identity-stack#565 ──┬──> identity-stack#568 ──┐
                     │                         ├──> identity-stack#569   ├──> identity-stack#570
                     │                         └─────────────────────────┤
                     └──> identity-stack#567 ────────────────────────────┘
identity-stack#566 ──> identity-stack#567, identity-stack#568, identity-stack#569
```

| Order | Story | Depends on | Owner decisions | Can run alongside |
|---|---|---|---|---|
| 1 | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) local Zitadel in compose, with fixtures | — | 2 | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) |
| 1 | [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) provider-neutral groundwork | — | 5, 7 | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) |
| 2 | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) Terraform root and canonical seed | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) | 6, 9 | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) |
| 2 | [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567) backend provider | [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) (fixtures), [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) | 3, 4 | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) |
| 3 | [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568) frontend | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565), [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) | 5 | [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) |
| 3 | [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) admin adapter | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565), [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566), and [identity-stack#513](https://github.com/jamescrowley321/identity-stack/issues/513) merged | 8 | [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568) |
| 4 | [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570) end-to-end proof | [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) (seed), [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567), [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568) | 9 | — |

[identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) comes first. [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569) is not on the path to the proof.

### Story [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564): Local Zitadel in docker compose with a reproducible bootstrap

As a developer,
I want one command to start a local Zitadel that comes up identical every time,
So that every later story has an issuer to work against without an account or a console.

**Acceptance Criteria:**

**Given** a fresh checkout with no Zitadel volume
**When** I run `make zitadel-up`
**Then** a `zitadel` compose profile starts Zitadel at a pinned 4.x version with Login V2, a proxy and its own Postgres, and reports healthy
**And** the default `docker compose up` stack is unchanged

**Given** the instance has started for the first time
**When** bootstrap completes
**Then** an `IAM_OWNER` machine user's personal access token is on a named volume, created by `ZITADEL_FIRSTINSTANCE_*` settings alone

**Given** the running instance
**When** the browser and a container on the compose network each fetch `/.well-known/openid-configuration`
**Then** both succeed at `http://zitadel.localhost:8480` and the document's `issuer` equals it

**Given** `make zitadel-reset`
**When** it finishes
**Then** the instance is back at first-start state with no manual step

**Given** a fresh instance and the bootstrap token
**When** the fixture script runs
**Then** it creates its own throwaway project, role, applications and machine users, obtains tokens for a machine user and for the first-instance human admin, and records the discovery document, JWKS, decoded token headers and claims, and UserInfo, storing no signed token
**And** the instance is reset afterwards, so nothing the script created reaches Terraform

**Given** the fixtures
**When** `docs/zitadel.md` is read
**Then** it states, with the fixture behind each: the issuer string, the default access-token type, `aud` for human and machine tokens, the roles-claim shape and when it appears, when the organization claim appears, whether `email` and `email_verified` appear, and whether discovery advertises DPoP, mutual TLS, PAR or RAR

**Given** the compose file
**When** it is read
**Then** every secret in it is a local-only throwaway documented as such, and the only published port binds to loopback

### Story [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565): Terraform root for the instance, and the canonical seed

As a developer,
I want everything inside the instance declared in `infra/zitadel/` and linked to canonical tenants by a script,
So that Terraform is the source of truth and a fresh stack is ready for a first login.

**Acceptance Criteria:**

**Given** a fresh instance from [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564) and its bootstrap token
**When** I run `terraform apply` in `infra/zitadel/`
**Then** it creates a platform organization, the `identity-stack` project, role definitions `owner`, `admin`, `member` and `viewer`, tenant organizations `acme` and `globex` with a project grant each, a third organization that no canonical tenant will name, a user-agent OIDC application (code, PKCE, auth method none, refresh-token grant, JWT access tokens, `access_token_role_assertion` off, dev redirect and post-logout URIs), a second OIDC application in the same project for negative tests, a machine user for tests, and one test human user with a verified email in each of the three organizations
**And** `project_role_check` is off and no user holds a Zitadel role grant

**Given** the applied root
**When** the login policies are read back
**Then** `allow_register` is false for the instance default and for all three organizations
**And** a registration attempt against a tenant organization is refused

**Given** the applied root
**When** the OIDC settings are read back
**Then** the access-token lifetime is the value from owner decision 9

**Given** an applied root
**When** I run `terraform plan`
**Then** the plan is empty

**Given** the outputs
**When** they are read
**Then** they give the issuer, SPA client id, project id, organization ids, test user ids and the `VITE_OIDC_*` and backend values, with no secret among the non-sensitive outputs

**Given** an applied root and a migrated application database
**When** the seed make target runs
**Then** canonical tenants `acme` and `globex` exist with `external_org_id` set from the Terraform organization ids, a `providers` row `zitadel` of type `oidc` exists, and one `acme` test user is pre-linked (`idp_links` on its Zitadel user id) with role `admin` in `acme` and `viewer` in `globex`
**And** running it twice changes nothing

**Given** `infra/PROVIDERS.md`
**When** it is read
**Then** it lists the root, its provider version pin, where state lives (owner decision 6) and every credential with its source

**Given** the root
**When** it is compared with `infra/ory/`
**Then** it follows the same layout: `versions.tf`, `variables.tf`, `outputs.tf`, an `environments/` tfvars file, a committed lock file and a README

### Story [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566): Provider-neutral groundwork: provider registration and tenant resolution

As a developer adding a provider,
I want one place to register it and one resolver for tenant and grants,
So that a new provider is a registration plus a claims extractor, not edits to five files.

Provider-neutral. Overlaps [identity-stack#555](https://github.com/jamescrowley321/identity-stack/issues/555); see "Provider-neutral groundwork" above. One of the two is
implemented.

**Acceptance Criteria:**

**Given** the middleware factory, both middlewares and the logout router
**When** they build the provider list
**Then** they call one builder with no per-provider parameters, and adding a provider changes that builder's inputs only

**Given** two RP-initiated providers configured
**When** each logs out
**Then** each logout URL carries that provider's own client id and post-logout redirect URI

**Given** a provider configured with its HTTPS switch off
**When** discovery is fetched for validation or logout
**Then** plain HTTP is allowed for that provider only, and every other provider still requires HTTPS

**Given** a request from any provider
**When** a route depends on the tenant, roles or permissions
**Then** one resolver supplies them, taking in order: the provider's claims extractor, a request tenant selector checked against the caller's canonical memberships, the caller's sole canonical membership
**And** anything else is refused with 403

**Given** a tenant selector naming a tenant the caller does not belong to
**When** the request is authorized
**Then** it is refused with 403 and no grant is read from that tenant

**Given** a Descope token
**When** any existing route is called
**Then** the decision and response are byte-for-byte what they were, and the existing Descope and Ory unit and integration suites pass unchanged

**Given** an Ory principal with one canonical membership
**When** it calls a route that depends on `get_tenant_id`
**Then** it gets that tenant instead of 403

**Given** `docs/environment-variables.md` and `docs/conventions.md`
**When** it is read
**Then** any new variable has a row and the tenant-resolution rule is written down

### Story [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567): Backend: Zitadel provider, token binding, organization-mapped provisioning and canonical roles

As a user in a Zitadel organization,
I want the API to accept my token and place me in my organization's tenant,
So that I can use the application with the roles the canonical store gives me.

**Acceptance Criteria:**

**Given** `ZITADEL_ISSUER_URL`, `ZITADEL_AUDIENCE` (the project id) and `ZITADEL_CLIENT_ID` (the SPA) are set
**When** the backend starts
**Then** a Zitadel provider is registered with that issuer, `require_audience` on, the client binding on and `logout_kind` `rp_initiated`
**And** startup fails if the issuer is set without an audience or without a client id

**Given** the local issuer is plain HTTP
**When** `ZITADEL_REQUIRE_HTTPS=false` is set
**Then** discovery succeeds for Zitadel, and with the switch at its default the backend refuses to start against an `http` issuer

**Given** a JWT access token issued to the SPA
**When** it reaches a protected route
**Then** it is accepted

**Given** each of: a token whose `client_id` is another application in the same project (its `aud` is identical), the SPA's own ID token, a machine-user token carrying the project audience, an opaque token, a token from another issuer
**When** it is presented as a bearer token
**Then** it is refused with 401

**Given** a first-login user whose `urn:zitadel:iam:user:resourceowner:id` matches a tenant's `external_org_id`
**When** `GET /api/identity` is called
**Then** `email` and `email_verified` are fetched from UserInfo through py-identity-model, UserInfo's `sub` equals the token's, a canonical user and `idp_links` row are created, and the user is a `member` of that tenant

**Given** a first-login user whose token has no organization claim, or whose organization maps to no tenant, or whose email is missing or unverified, or whose UserInfo `sub` differs
**When** `GET /api/identity` is called
**Then** nothing is created and the request is refused

**Given** a provisioned user
**When** a role-gated route is called
**Then** roles and permissions come from the canonical store, and nothing in the token changes them

**Given** a deactivated canonical user with a valid Zitadel token
**When** a role-gated route is called
**Then** it is refused with 403

**Given** the organization claim
**When** the code is searched
**Then** it is read in one function, used for provisioning only

**Given** the unit tests
**When** they run
**Then** they are built from the fixtures recorded by [identity-stack#564](https://github.com/jamescrowley321/identity-stack/issues/564), including the other-application token and the ID token as negative cases, and the Descope and Ory tests pass unchanged

### Story [identity-stack#568](https://github.com/jamescrowley321/identity-stack/issues/568): Frontend: log in, refresh, log out and switch tenant against Zitadel

As a user,
I want to sign in through Zitadel, stay signed in, switch tenant and sign out,
So that the SPA behaves as it does on the other providers.

**Acceptance Criteria:**

**Given** `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID` and `VITE_OIDC_SCOPE` from the Terraform outputs
**When** the SPA is built
**Then** login runs authorization code with PKCE against Zitadel with no Zitadel-specific code path
**And** the scope is `openid profile email offline_access urn:zitadel:iam:user:resourceowner`

**Given** a login without the `urn:zitadel:iam:user:resourceowner` scope
**When** a first-login user reaches the application
**Then** the backend refuses provisioning and the SPA shows its existing no-access state, not a blank page

**Given** a signed-in session
**When** the access token nears expiry
**Then** it is renewed with the refresh token and API calls continue

**Given** a signed-in user
**When** they log out
**Then** the browser goes to Zitadel's `end_session_endpoint` with `id_token_hint`, returns to the SPA's login page, the SPA holds no tokens, and the next sign-in asks for credentials again

**Given** a user with two canonical tenant memberships
**When** they pick the other tenant in the switcher
**Then** subsequent API calls carry the tenant selector from [identity-stack#566](https://github.com/jamescrowley321/identity-stack/issues/566) and role-gated pages reflect that tenant's roles

**Given** a Descope or Ory build
**When** the frontend tests run
**Then** they pass unchanged

**Given** the compose `zitadel` profile
**When** the stack is started with it
**Then** the frontend is built with the Zitadel values without hand-copying

### Story [identity-stack#569](https://github.com/jamescrowley321/identity-stack/issues/569): Admin adapter: organizations and users pushed to Zitadel

As a tenant administrator,
I want a tenant or user I create in the application to exist in Zitadel,
So that the new tenant's users can log in without anyone running Terraform.

In: organizations and users, outbound. Out: roles, permissions and role assignments (canonical
only, no-ops as in `OrySyncAdapter`); inbound events; reconciliation; the Zitadel console's
other functions.

**Acceptance Criteria:**

**Given** the backend configured for Zitadel with a machine-user credential
**When** a service is built
**Then** it gets a `ZitadelSyncAdapter` by configuration, and Descope deployments still get `DescopeSyncAdapter`

**Given** a tenant created through the API
**When** sync runs
**Then** an organization exists with `allow_register` false, the project is granted to it, and `external_org_id` holds its id

**Given** a user created in a tenant
**When** sync runs
**Then** a human user exists in that tenant's organization

**Given** a canonical user deactivated or deleted
**When** sync runs
**Then** the Zitadel user is deactivated or removed

**Given** a role, permission or role assignment change
**When** sync runs
**Then** the adapter returns `Ok` and calls nothing

**Given** Zitadel is unreachable
**When** sync runs
**Then** the adapter returns `Error(SyncError)` and raises nothing

**Given** the adapter's HTTP calls
**When** the code is read
**Then** they use the v2 resource APIs through `app.outbound`, with an explicit timeout, and the machine-user credential comes from `app.knobs`

### Story [identity-stack#570](https://github.com/jamescrowley321/identity-stack/issues/570): End-to-end proof against local Zitadel

As the owner,
I want one automated run that proves the whole path and records what it measured,
So that the G5 comparison has Zitadel's answers from evidence.

**Acceptance Criteria:**

**Given** the compose `zitadel` profile, an applied Terraform root and the seed from [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565)
**When** the end-to-end suite logs in the `globex` test user, who has no canonical identity yet
**Then** `GET /api/identity` returns a new canonical user who is a `member` of `globex` and of nothing else

**Given** the pre-linked `acme` test user from the seed
**When** the suite logs that user in
**Then** a route gated on `admin` succeeds in `acme`; after switching to `globex` the same route returns 403 and a route `viewer` may call succeeds

**Given** the test user in the organization no tenant names
**When** that user logs in
**Then** nothing is provisioned and the SPA shows its no-access state

**Given** a signed-in user
**When** they log out
**Then** the suite asserts three things and no more: the SPA holds no tokens; visiting a protected page leads to Zitadel's login form asking for credentials; and the suite records, without asserting a value, whether the old refresh token and the old access token are still accepted
**And** `docs/zitadel.md` states the result and that an unexpired JWT access token stays valid until [identity-stack#542](https://github.com/jamescrowley321/identity-stack/issues/542) exists

**Given** the negative cases of [identity-stack#565](https://github.com/jamescrowley321/identity-stack/issues/565) and [identity-stack#567](https://github.com/jamescrowley321/identity-stack/issues/567)
**When** the suite runs against the live instance
**Then** a registration attempt in a tenant organization is refused, and a live ID token and a live token from the second application are each refused with 401

**Given** a machine-user token
**When** the integration suite runs
**Then** it covers discovery, JWKS, signature and issuer against the live local instance, as `test_ory_end_to_end.py` does against Hydra, and confirms the token is refused by the client binding

**Given** CI
**When** the suite runs there
**Then** it needs no external credential, and a missing instance fails the suite instead of skipping it

**Given** the run
**When** it finishes
**Then** `docs/` in identity-stack records Zitadel-specific limits found, and a pull request to identity-stack-planning records the measured G5 answers: the flow matrix, the tenancy mapping as built, container count, memory at idle, cold-start time and the steps to upgrade a pinned version

**Given** the existing suites
**When** `make test-all` runs
**Then** Descope and Ory results are unchanged
