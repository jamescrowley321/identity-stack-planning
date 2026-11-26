---
workflowType: 'epic'
project_name: 'identity-stack'
epic_title: 'Every API route the SPA calls serves every provider: canonical routes, provider capabilities, and a relationship store (OpenFGA where the provider has none)'
date: '2026-11-18'
inputDocuments:
  - identity-stack at the head of the Keycloak canonical stack (branch test/keycloak-e2e-every-fixture-user, 7047e4c), code read on 2026-11-18
  - identity-stack docs/conventions.md §18 (the Descope-backed route guard) and §28 (a provider is one registration)
  - _bmad-output/planning-artifacts/epics/epic-keycloak-canonical-authorization.md (the canonical model this extends to the API)
---

# Epic: Every API route the SPA calls serves every provider

**GitHub tracking:** [identity-stack#672](https://github.com/jamescrowley321/identity-stack/issues/672) (epic); each story below names its issue.

## Why

identity-stack has two layers that grew apart.

1. **The canonical layer works for every provider.** Postgres holds tenants, users,
   memberships, roles, permissions and role assignments. A sync adapter per provider
   (`app/services/adapters/`) pushes canonical changes out; for Keycloak, changes are also
   pulled back and reconciled. Ory, Zitadel and Keycloak principals are authorized from
   Postgres alone (`CANONICAL_RBAC_PROVIDERS`).
2. **The routes the SPA calls were written against Descope.** They call Descope's
   Management API or its FGA store, or read Descope's `dct`/`tenants` claims, directly.
   Conventions §18 fences them with `require_descope_principal`. That guard keeps a
   canonical tenant id or a non-Descope `sub` from reaching Descope, which is correct, but
   it maps nothing: every other provider's principal gets 403.

Observed on 2026-11-18, signed in as the Keycloak fixture user `bob` (admin in Acme) through
the SPA against the full Keycloak stack:

| SPA page or call | Route | Answer for a Keycloak admin |
|---|---|---|
| Dashboard | `GET /api/tenants` | 403 "This route reads Descope's tenants and roles claims, which only a Descope token carries" |
| Dashboard, Resources tab | `GET /api/tenants/{id}/resources` | 403, same body. The resources live in Postgres (`TenantResource`); only the membership check reads the Descope claim |
| Dashboard | `POST /api/validate-id-token` | 503 "Identity provider unavailable": the route validates against Descope's discovery document only |
| Members | `GET /api/members` | 403 "This route serves Descope principals only" |

The sidebar shows Members, Roles, Access Keys and FGA to that admin, and each page fails.

## Where each route maps

Measured against the route code on 2026-11-18.

| Routes | What they touch now | What they become |
|---|---|---|
| `GET /api/tenants`, `GET /api/tenants/current` | Descope `tenants` claim; names from the Descope Management API | The caller's canonical memberships, through the §18 resolver (what `GET /api/identity` already returns) |
| `GET`/`POST /api/tenants/{id}/resources` | Postgres; the membership check reads Descope's `tenants` claim | The same rows, with membership from the §18 resolver |
| `POST /api/validate-id-token` | Descope discovery only | The configured provider whose issuer is the ID token's `iss` (the token middleware's provider registry) |
| `GET /api/roles/me` | Descope `tenants` claim | The caller's canonical role in the request's tenant |
| `/api/roles`, `/api/permissions`, `/api/roles/assign`, `/api/roles/remove` | Canonical services (`RoleService`, `PermissionService`); fenced because their writes mirror to Descope | Unchanged services, fenced on the configured sync provider instead of on the caller's provider |
| `GET /api/members`, `POST /api/members/invite`, `.../deactivate`, `.../activate` | Descope Management API | Canonical users and memberships; the sync adapter pushes (Keycloak: organization member) |
| `GET`/`PATCH /api/profile`, `GET`/`PATCH /api/tenants/current/settings` | Descope user and tenant custom attributes | Canonical columns for what every provider holds; custom attributes as an optional adapter capability |
| `/api/keys` (access keys) | Descope access keys | An optional adapter capability: machine credentials (Descope access key, Keycloak service-account client, Zitadel machine user, Ory/Hydra OAuth2 client) |
| `/api/fga/*`, `/api/documents/*` | Descope's FGA store | A relationship-store interface: Descope FGA where the provider is Descope, OpenFGA where the provider has no Zanzibar-style store |

## The model

**Routes speak canonical.** No route under `app/routers/` calls a provider directly. A route
reads and writes canonical services; provider calls happen only in adapters. A Descope
principal keeps Descope's claim extractor for authorization (§18), but reads tenants, members
and roles through the same canonical routes.

**Capabilities are declared, not guessed.** Each sync adapter declares the optional
capabilities it implements (machine credentials, custom attributes). The relationship store
is chosen per deployment. `GET /api/capabilities` reports both, and the SPA shows a page only
when its capability is there. A route for a capability the deployment lacks answers 404
problem detail with a typed error, never a provider's 403.

**One relationship store per deployment.** `RelationshipStore` (check, write, delete, read
schema, write schema, list relations) has two implementations: `DescopeRelationshipStore`
(today's FGA calls, moved) and `OpenFgaRelationshipStore`. `RELATIONSHIP_STORE=descope|openfga`
selects it. The documents service and the FGA routes use only the interface. Subjects and
objects are canonical ids (user id, tenant id, document id), never a provider's `sub`.

**The SPA opens the tenant the sign-in named.** `GET /api/identity` gives each tenant
membership its provider organization (`external_org_id`), and the SPA's tenant selector
starts on the membership whose organization is the token's `organization` claim (Keycloak)
or `urn:zitadel:iam:user:resourceowner:id` (Zitadel), and on the first one otherwise. The
token still decides nothing: the selection is `X-Tenant-ID`, checked by §18.

## Stories

Stacked pull requests where a story needs an earlier one's code.

| Story | Depends on |
|---|---|
| Tenant routes from the canonical resolver | — |
| `validate-id-token` by issuer | — |
| SPA opens the tenant the sign-in named | — |
| Roles and permissions fenced on the sync provider | — |
| Members from the canonical model | Roles and permissions fenced on the sync provider |
| Adapter capabilities and `GET /api/capabilities`; SPA shows pages by capability | — |
| Profile and tenant settings | Adapter capabilities |
| Machine credentials as a capability | Adapter capabilities |
| Relationship store interface, Descope implementation moved behind it | Adapter capabilities |
| OpenFGA relationship store, compose service and Terraform | Relationship store interface |
| Docs, conventions §18 rewrite, and the per-provider e2e | all |

### Tenant routes from the canonical resolver ([identity-stack#673](https://github.com/jamescrowley321/identity-stack/issues/673))

- `GET /api/tenants`, `GET /api/tenants/current` and `GET`/`POST /api/tenants/{id}/resources`
  read the caller's tenants and membership through the §18 resolver; no `get_descope_claims`
  or `get_tenant_claims` dependency remains on them.

**Done when:** for a Descope, an Ory, a Zitadel and a Keycloak principal, the tenant list is
their canonical memberships and the resources of a tenant they belong to are served (another
tenant's: 403); unit tests per provider, and the shared e2e suite passes for `E2E_PROVIDER`
descope, keycloak and zitadel.

### `validate-id-token` by issuer ([identity-stack#674](https://github.com/jamescrowley321/identity-stack/issues/674))

- The route picks the configured provider whose issuer equals the unverified `iss` and
  validates with that provider's discovery address, audience (the provider's client id for
  an ID token) and algorithms. An `iss` no configured provider has is 401.

**Done when:** an ID token of each configured provider validates; another issuer's token,
an access token and a tampered token get 401; a provider whose discovery fails gets 503.

### SPA opens the tenant the sign-in named ([identity-stack#675](https://github.com/jamescrowley321/identity-stack/issues/675))

- `tenant_memberships[]` in `GET /api/identity` carries `external_org_id` (null when the
  tenant is linked to no organization or to another provider's).
- The selector's initial tenant follows the model above.

**Done when:** frontend unit tests cover each provider's claim and the fallback; the
Keycloak e2e signs `bob` in through each of his organizations and lands in that tenant.

### Roles and permissions fenced on the sync provider ([identity-stack#676](https://github.com/jamescrowley321/identity-stack/issues/676))

- `/api/roles*` and `/api/permissions*` serve any principal the §18 resolver authorizes;
  their writes go to the configured sync adapter. `GET /api/roles/me` reads the canonical
  role. `tests/unit/test_descope_backed_routes.py` loses these routes from its registers, and
  conventions §18 says why.

**Done when:** a Keycloak admin lists, creates, updates and deletes roles and permissions and
assigns roles, and each change reaches Keycloak (the live adapter suite); a Descope
deployment's behaviour is unchanged (its existing tests pass unedited).

### Members from the canonical model ([identity-stack#677](https://github.com/jamescrowley321/identity-stack/issues/677))

- `GET /api/members` lists the tenant's canonical members with their role there; invite
  creates (or finds) the canonical user and the membership, deactivate and activate set the
  membership's status. The sync adapter pushes each change.

**Done when:** for Descope and Keycloak, every member operation is reflected in the provider
(Descope via the existing adapter tests, Keycloak via the live adapter suite) and a
non-admin is refused as today.

### Adapter capabilities and `GET /api/capabilities`; SPA shows pages by capability ([identity-stack#678](https://github.com/jamescrowley321/identity-stack/issues/678))

- Each adapter declares a frozen set of a typed `Capability` enum. `GET /api/capabilities`
  returns the sync adapter's capabilities and the relationship store's kind.
- The SPA hides Access Keys, FGA, custom profile attributes and tenant settings when their
  capability is missing. A capability's routes answer 404 (typed error) without it.

**Done when:** frontend unit tests per capability set; the e2e for each provider sees exactly
the pages its capabilities give, and no page the SPA shows answers 403 for a principal
authorized in the tenant.

### Profile and tenant settings ([identity-stack#679](https://github.com/jamescrowley321/identity-stack/issues/679))

- The profile's name and email come from the canonical user, written through the sync
  adapter. Custom attributes are the `custom_attributes` capability (Descope: user and tenant
  custom attributes; Keycloak: user and organization attributes; Zitadel: metadata).

**Done when:** each provider's profile page reads and saves; custom attributes round-trip on
every provider that declares the capability.

### Machine credentials as a capability ([identity-stack#680](https://github.com/jamescrowley321/identity-stack/issues/680))

- `/api/keys` becomes the `machine_credentials` capability: create, list, get, deactivate,
  activate, delete. Descope: access keys (moved). Keycloak: a confidential client with a
  service account and no flows, owned by the tenant (organization attribute). Zitadel: a
  machine user in the tenant's organization. Ory: a Hydra OAuth2 client.

**Done when:** for each provider that declares it, a created credential gets a
client-credentials token the backend accepts in its tenant only, and a deactivated or deleted
one is refused.

### Relationship store interface, Descope implementation moved behind it ([identity-stack#681](https://github.com/jamescrowley321/identity-stack/issues/681))

- `RelationshipStore` as above; Descope's FGA calls move into `DescopeRelationshipStore`.
  The documents service and `/api/fga/*` use only the interface, with canonical ids.

**Done when:** the Descope FGA and documents tests pass unedited against the moved code; no
module outside the store imports the Descope FGA client.

### OpenFGA relationship store, compose service and Terraform ([identity-stack#682](https://github.com/jamescrowley321/identity-stack/issues/682))

- `OpenFgaRelationshipStore` over the OpenFGA HTTP API (store id and authorization model id
  from configuration), an `openfga` compose service with Postgres storage for the local and
  test stacks, and the authorization model in Terraform (the `openfga/openfga` provider) or as
  a checked-in model file applied by a make target.
- `RELATIONSHIP_STORE=openfga` is the default for a deployment whose sync provider has no
  Zanzibar-style store (Keycloak, Zitadel; Ory pending owner decision 1).

**Done when:** the relationship-store contract suite passes against both implementations;
the documents and FGA e2e pass for Keycloak and Zitadel with OpenFGA; the model applies with
an empty second plan.

### Docs, conventions §18 rewrite, and the per-provider e2e ([identity-stack#683](https://github.com/jamescrowley321/identity-stack/issues/683))

- An ADR for routes-speak-canonical and the relationship store; conventions §18 keeps the
  Descope claim extractor and the guard for any route that still reaches Descope directly,
  and says that a route the SPA calls serves every provider; `docs/architecture.md` and the
  provider docs describe capabilities.
- The shared UI e2e walks every page the SPA shows for each provider.

**Done when:** `make test-e2e` passes for Descope, Keycloak and Zitadel with every page
visited and no 403 for an authorized principal.

## Owner decisions

1. **Ory's relationship store.** Ory has Keto, a Zanzibar implementation, but the Ory project
   here does not run it (no Keto service in `docker-compose.yml` or `infra/ory/`, checked
   2026-11-18). Default: OpenFGA for Ory too. Alternative: a `KetoRelationshipStore`.
2. **Where OpenFGA's model lives.** Default: Terraform (`openfga/openfga` provider), like
   every other provider's configuration. Alternative: a checked-in model file and a make
   target, with no Terraform state for a local service.
3. **Existing Descope FGA tuples.** Default: none are migrated (the stack's FGA data is
   local test data). Alternative: a one-off copy script.

## Out of scope

- Changing how a Descope principal is authorized (its claim extractor stays, §18).
- Two-way sync for Zitadel and Ory (the Keycloak epic's follow-ups).
- Using a provider's own fine-grained authorization (Keycloak Authorization Services, Zitadel
  actions) as a relationship store.
