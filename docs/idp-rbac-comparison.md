# IdP Authorization Comparison: RBAC, ReBAC, and the Space Between

How identity providers handle authorization, why none of them are portable, and where the identity-stack reference architecture lands.

## The Question

> "Why not just use the RBAC (or ReBAC) provided by the identity provider?"

The identity-stack platform is built for provider independence: swapping or adding an IdP should mean implementing one adapter, not rewriting authorization logic. This document maps how 9 providers model authorization — both role-based (RBAC) and relationship-based (ReBAC) — to explain why the reference architecture owns RBAC at the application layer and proxies ReBAC to purpose-built engines.

This is a reference architecture. The two-layer approach works well for multi-tenant SaaS with provider independence as a goal. Other projects with different constraints (single provider, no multi-tenancy, AWS-native) might reasonably make different choices.

## The Authorization Spectrum

Authorization models fall on a spectrum:

| Approach | Data Model | Answers | Best For | Tradeoff |
|----------|-----------|---------|----------|----------|
| **Pure RBAC** | Roles → permissions, user-role assignments | "Can this user do this action in this tenant?" | Coarse-grained access (admin/editor/viewer), tenant isolation | Cannot express "user X owns document Y" without per-resource roles |
| **RBAC + ReBAC** | RBAC in app DB, ReBAC in graph engine | Both questions above | Multi-tenant SaaS with document/resource-level sharing | Two systems to operate, two mental models |
| **Pure ReBAC** | Relation tuples (`object#relation@subject`) | "What is this user's relationship to this resource?" | Fine-grained, resource-level access (Google Docs sharing model) | Overkill for "is this user an admin?", higher operational complexity |

The identity-stack reference architecture uses the middle approach: **RBAC owned in Postgres, ReBAC proxied to Zanzibar-style engines** (Descope FGA, Ory Keto, OpenFGA). This is a pragmatic choice, not the only valid one.

## Summary

### RBAC Capabilities

| Provider | Role Model | Permissions | Tenant-Scoped RBAC | Roles in JWT by Default | Key Limitation |
|----------|-----------|-------------|--------------------|-----------------------|----------------|
| **Descope** | First-class objects | First-class, assigned to roles | Yes (native `tenants` claim) | Yes | Proprietary claim structure |
| **Auth0** | Roles bundle API permissions | Per-API resource server | Partial (Organizations + Actions) | No (2 toggles + Actions) | Token bloat at scale |
| **Entra ID** | App Roles in manifest | Via app roles only | No (per-tenant assignments) | Yes (`roles` claim) | Groups overage at 200+ |
| **Keycloak** | Realm + client roles | Authorization Services | Realm-per-tenant or Organizations | Yes (proprietary claims) | Non-standard claim format |
| **Okta** | Groups only | None | No | No (Custom Auth Server required) | No native permissions model |
| **Cognito** | Groups (flat, no hierarchy) | None (IAM mapping only) | No | Yes (`cognito:groups`) | 25 groups/user limit; IAM-coupled |
| **Ory** | None (delegates to Keto) | Zanzibar relation tuples | Via Keto only | No (webhook injection) | Requires separate authorization service |
| **Duende** | None (delegates to ASP.NET Identity) | None | None | Whatever host injects | Framework, not a product |
| **node-oidc-provider** | None (pure protocol library) | None | None | Whatever app feeds | Library, not a product |

### ReBAC / Fine-Grained Authorization Capabilities

| Provider | ReBAC Engine | Model | Managed / Self-Hosted | Integrated with IdP? |
|----------|-------------|-------|----------------------|---------------------|
| **Descope** | Descope FGA | Zanzibar-style relation tuples | Managed | Yes — same project, Management API |
| **Auth0 / Okta** | Okta FGA (OpenFGA) | Zanzibar (Google Zanzibar paper) | Managed SaaS (separate product) | Separate product, separate SDK |
| **Ory** | Ory Permissions (Keto) | Zanzibar (first open-source impl) | Both (Ory Network or self-hosted) | Integrated in Ory stack |
| **Keycloak** | Authorization Services | Resources → scopes → policies → permissions | Self-hosted | Built-in, but heavy |
| **Entra ID** | None native | N/A | N/A | No (3rd party: Authzed, Permit.io) |
| **Cognito** | None | N/A | N/A | No |
| **Duende** | None | N/A | N/A | No |
| **node-oidc-provider** | None | N/A | N/A | No |

## Per-Provider Detail

### Descope

**RBAC:**
- **Roles/permissions** are first-class project-level objects. Role definitions (name, description, permission list) are global; role *assignments* are tenant-scoped.
- **JWT claims**: `dct` = current tenant, `tenants` = map of all memberships with per-tenant `roles[]` and `permissions[]`. Requires `descope.claims` scope.
  ```json
  {
    "dct": "T1234567",
    "tenants": {
      "T1234567": { "roles": ["admin"], "permissions": ["projects.create"] },
      "T9876543": { "roles": ["viewer"], "permissions": ["projects.read"] }
    }
  }
  ```
- **Multi-tenancy** is native. The nested `tenants.{id}.roles` structure is first-class in every token.
- **Limits**: Role name max 100 chars. No role hierarchy (flat). Three reserved system permissions.
- **Management API**: Full programmatic CRUD for roles, permissions, and user-role assignments.

**ReBAC:**
- Descope FGA is a Zanzibar-style engine integrated into the same project. Schema defines types, relations, and permissions. Check/expand/list APIs via Management SDK.
- FGA data is separate from RBAC — roles live in the project, relation tuples live in the FGA engine.
- Same Management API, same SDK, no additional infrastructure.

**Pain point**: The `tenants` claim structure and FGA API are entirely proprietary. No other IdP uses this format.

### Auth0

**RBAC:**
- **Authorization Core**: Roles are tenant-level objects that bundle permissions. Permissions are scoped to API resource servers.
- **JWT claims**: Permissions land in the access token as `"permissions": ["read:reports", "write:users"]` — but only after enabling two toggles (RBAC + "Add Permissions in Access Token") per API. Roles are **never** in tokens without custom Actions.
- **Organizations**: Add `org_id` to tokens. Org-scoped role assignments exist but require Actions to surface org roles into token claims.
- **Limits**: 1,000 roles/tenant, 50 roles/user, 1,000 permissions/API. Token bloat: 5 roles x 20 permissions = 100 strings per token.

**ReBAC:**
- Okta FGA (formerly Auth0 FGA, based on OpenFGA) is a separate managed product with its own SDK, CLI, and pricing.
- Zanzibar model: authorization model DSL defines types and relations, relation tuples stored in the FGA service, check/expand/list APIs.
- Not integrated into Auth0 token flows — requires separate API calls from your application.

**Pain points**: Permissions not in tokens by default. No hierarchical roles. Org-scoped RBAC requires custom code. FGA is a separate purchase and integration.

### Microsoft Entra ID

**RBAC:**
- **App Roles**: Defined in the app registration manifest with a `value` string, assigned to users/groups via the service principal.
- **JWT claims**: `roles` (app role values), `groups` (group object GUIDs), `wids` (built-in directory role template GUIDs — not custom app roles).
- **Groups overage**: Beyond 200 groups, the `groups` claim is dropped entirely and replaced with `_claim_names`/`_claim_sources` pointing to a Graph API endpoint. This breaks pure token-based authorization.
  ```json
  {
    "_claim_names": { "groups": "src1" },
    "_claim_sources": { "src1": { "endpoint": "https://graph.microsoft.com/v1.0/users/{oid}/getMemberObjects" } }
  }
  ```
- **Multi-tenancy**: App roles are defined in the home tenant. Assignments are per-tenant service principal. No cross-tenant role portability.
- **Limits**: 1,200 total manifest entries (shared across appRoles, keyCredentials, redirectUris, etc.), 1,500 role assignments per principal. Groups are GUIDs (not names), differ per tenant.

**ReBAC:** No native fine-grained authorization. Third-party options (Authzed/SpiceDB, Permit.io) integrate via Graph API or custom middleware.

**Pain points**: Three parallel role systems (app roles, directory roles, security groups) with different handling. Overage requires synchronous Graph API calls mid-request.

### Keycloak

**RBAC:**
- **Realm roles** are global across clients. **Client roles** are scoped to a single application. **Composite roles** bundle other roles.
- **JWT claims**: Non-standard, proprietary structure:
  ```json
  {
    "realm_access": { "roles": ["admin", "uma_authorization"] },
    "resource_access": {
      "my-app": { "roles": ["manage-reports"] },
      "account": { "roles": ["manage-account"] }
    }
  }
  ```
- **Multi-tenancy**: Realm-per-tenant has improved significantly — Keycloak 26.4+ supports 1,000+ realms with proper cache configuration (previously degraded around ~100). Organizations feature (GA in Keycloak 26, Oct 2024) adds B2B multi-tenancy within a single realm.

**ReBAC:**
- Authorization Services is Keycloak's built-in fine-grained model: four-layer system (resources, scopes, policies, permissions). Powerful but significant operational complexity.
- Not Zanzibar-style — uses its own policy evaluation engine. Policies can reference roles, groups, time, JavaScript, or aggregated conditions.
- Fine-Grained Admin Permissions v2 shipped in Keycloak 26.2 (Apr 2025), replacing the legacy admin permission model.

**Pain points**: Every role for every client is embedded in every JWT — token bloat. `realm_access`/`resource_access` claim names are Keycloak-only. Authorization Services is often overkill for simple RBAC.

### Okta

**RBAC:**
- **Groups are the only RBAC primitive.** Okta has no native roles or permissions model. Authorization is explicitly the application's responsibility.
- **JWT claims**: `groups` claim must be added via a Custom Authorization Server (paid add-on). The org authorization server cannot add groups to access tokens. Claim populated via Okta Expression Language filter.
- **Multi-tenancy**: No built-in concept. Options: separate orgs (high cost) or group-naming conventions (`tenant-A:admin`).
- **Limits**: 100 groups per token (exceeding fails the request). No fine-grained permissions.

**ReBAC:**
- Okta FGA (built on OpenFGA) is available as a separate managed product with its own SDK, CLI, and docs (docs.fga.dev).
- Same Zanzibar model as Auth0 FGA (same underlying engine). Separate purchase, separate integration.

**Pain point**: Okta deliberately does not provide application-level RBAC. Groups are membership lists, not permission sets. FGA exists but as a completely separate product.

### AWS Cognito

**RBAC:**
- **Groups** are flat organizational units with no hierarchy. Each group can optionally map to an IAM role for AWS resource access — not application-level permissions.
- **JWT claims**: `cognito:groups` (group names) in both ID and access tokens. `cognito:roles` (IAM role ARNs) and `cognito:preferred_role` in the **ID token only**.
  ```json
  { "cognito:groups": ["admins", "editors"], "cognito:roles": ["arn:aws:iam::123:role/AdminRole"] }
  ```
- **IAM coupling**: The `groups → IAM role → STS AssumeRole` pipeline is designed for AWS resource access (S3, DynamoDB), not application RBAC. Permission logic lives in IAM policies, not the application data model.
- **Custom claims**: Require Pre Token Generation Lambda trigger (Essentials/Plus tier, as of Nov 2024). Adds latency, requires external state store.
- **Multi-tenancy**: No native concept. Workarounds: separate user pools (4 custom domain limit), groups-per-tenant (burns group quota), `custom:tenant_id` (app must enforce).
- **Limits**: 25 groups per user, 10,000 groups per pool. No permissions model, no role hierarchy.

**ReBAC:** None. No fine-grained authorization capability. Third-party options or custom implementations required.

**Pain point**: Cognito answers "which IAM role should this user assume?" not "can this user do this in this tenant?"

### Ory (Hydra + Keto/Permissions)

**RBAC:**
- **Hydra** is a pure OAuth2/OIDC server. It explicitly has no authorization logic — by design.
- JWT claims carry no role/permission claims by default. Custom claims require either a consent flow UI or OAuth2 webhooks with external infrastructure.

**ReBAC:**
- **Keto (Ory Permissions)** is the first open-source implementation of Google's Zanzibar paper. Data model is relation tuples (`namespace:object#relation@subject`).
- Roles are expressible as relation tuples but must be modeled explicitly — Keto doesn't have a "role" primitive, it has relationships.
- Available self-hosted or as Ory Network (managed). Integrated with Ory's stack: Hydra (tokens) + Kratos (identity) + Keto (permissions) + Oathkeeper (proxy).
- Most architecturally correct separation of concerns, highest operational complexity.

**Pain point**: Getting RBAC data into JWTs requires operating multiple services and custom plumbing. The Ory stack is powerful but has a steep learning curve.

### Duende IdentityServer

- **No built-in RBAC or ReBAC.** Duende is a framework, not a platform. It handles OIDC protocol mechanics and delegates user/role management entirely to ASP.NET Identity.
- Roles flow from `ClaimTypes.Role` in `ClaimsIdentity`, surfaced via `IProfileService`. Only claims matching `UserClaims` on `ApiResource`/`ApiScope` are included in tokens.
- Commercial license required since v6.

### node-oidc-provider

- **No built-in RBAC or ReBAC.** A certified OIDC library (MIT) with zero authorization opinion. Claims are populated entirely through the application-supplied `Account` adapter's `claims()` method.
- The library handles OIDC protocol only. RBAC, ABAC, ReBAC — all must be implemented by the consuming application.

## The Problems with IdP-Delegated Authorization

### 1. No standard claim format

Descope uses `tenants.{id}.roles`. Keycloak uses `realm_access.roles` and `resource_access.{client}.roles`. Entra uses `roles`. Cognito uses `cognito:groups`. Auth0 uses `permissions`. Okta uses `groups`. Every middleware and token validator must know which IdP issued the token and where to find the roles. There is no OIDC standard for authorization claims.

### 2. Most providers don't actually do RBAC

Okta, Ory Hydra, Duende, and node-oidc-provider explicitly consider authorization out of scope. Cognito's "RBAC" maps groups to IAM roles for AWS resource access, not application permissions. That's 5 of 9 providers where you build your own RBAC regardless.

### 3. Multi-tenant RBAC is rare

Only Descope has native tenant-scoped roles in the token. Auth0 Organizations exist but require custom Actions to surface org-scoped roles. Entra app roles don't transfer across tenants. Cognito has no tenant concept. Keycloak shipped Organizations in v26. For any SaaS product with "user is admin in Org A but viewer in Org B," most IdPs force you to build that yourself.

### 4. Token-based authorization breaks at scale

Entra drops the `groups` claim entirely beyond 200 groups and requires a Graph API call mid-request. Auth0 expands every permission from every role into a flat array. Cognito caps at 25 groups per user. Keycloak embeds every role for every client. Token bloat is a real operational problem that forces architecture compromises.

### 5. ReBAC is fragmented

Descope FGA, Okta FGA, and Ory Keto all implement Zanzibar-style relation tuples, but with different APIs, SDKs, and schema languages. Keycloak Authorization Services uses a completely different model (resources/scopes/policies). Entra and Cognito have no ReBAC at all. There is no portable fine-grained authorization standard.

### 6. IdP lock-in

If your authorization logic is "parse `realm_access.roles` from the Keycloak token" or "read `cognito:groups` and map to IAM," you've coupled your entire authorization layer to one vendor's claim format. Switching IdPs means rewriting every authorization check, every middleware, every test. The same applies to ReBAC — if you call Descope FGA's check API directly from your routes, switching to Ory Keto means rewriting every authorization call.

## The Two-Layer Approach

The identity-stack reference architecture splits authorization into two layers, each at its natural home:

| Layer | Question | Data Store | Enforcement | Why Here |
|-------|----------|-----------|-------------|----------|
| **RBAC** | Who are you, what role in this tenant? | Canonical Postgres | `require_role()` / `require_permission()` | Roles are identity primitives — they change slowly, map cleanly to relational tables, and must survive provider swaps |
| **ReBAC/FGA** | What is your relationship to this resource? | Zanzibar engine (Descope FGA, Ory Keto, OpenFGA) | `require_fga("document", "can_view")` | Relationship graphs are what Zanzibar engines are built for — graph evaluation at scale, not something to reimplement in SQL |

### Why RBAC in the application

- **Normalized model** — Roles and permissions live in Postgres (`roles`, `permissions`, `role_permissions`, `user_tenant_roles`), not in IdP-specific claim structures.
- **Provider-agnostic** — Adding a new IdP means implementing one sync adapter, not rewriting authorization logic. The application enforces `require_role()` / `require_permission()` against its own store.
- **Tenant-scoped by design** — User-tenant-role assignments are first-class relations, not bolted on via groups or custom claims.
- **No token bloat** — The JWT proves identity (who you are). The application resolves permissions from its own store (what you can do).
- **Multi-IdP correlation** — A single user can be linked to multiple IdP identities via `idp_links`. Authorization is unified regardless of which provider issued the token.
- **Owned audit trail** — `assigned_by`, `assigned_at`, `updated_at` in the application database, not scattered across provider consoles.

### Why ReBAC in a dedicated engine

- **Graph evaluation at scale** — "Can user X view document Y through any chain of relationships?" is a graph traversal problem. Zanzibar engines are purpose-built for this; SQL is not.
- **Proxied, not owned** — The canonical model doesn't store relation tuples locally. It calls the FGA engine's check API through an abstraction layer. Swapping Descope FGA for Ory Keto or OpenFGA means changing the adapter, not the data model.
- **Different lifecycle** — RBAC assignments change when an admin updates a role. FGA tuples change when a user shares a document. Different write patterns, different consistency requirements.

### What stays in the IdP

IdPs handle authentication — they are purpose-built for login flows, MFA, passkeys, social login, session management. The application handles authorization. The provider landscape demonstrates that these are genuinely different concerns. See [system architecture](system-architecture.md) for the full two-layer model (ADR-2).

### When you might choose differently

This two-layer approach adds complexity. Situations where a simpler model might be better:

- **Single provider, no plans to switch** — If you'll always use Descope (or Auth0, or Keycloak), using their built-in RBAC directly is simpler and eliminates the sync layer.
- **No multi-tenancy** — If your app has one tenant, IdP-provided roles may be sufficient without the user-tenant-role join table.
- **AWS-native stack** — If everything is on AWS and you want Cognito groups → IAM roles for resource access, that pipeline works as designed.
- **No resource-level sharing** — If you only need "admin/editor/viewer" and never "user X shared document Y with user Z," you don't need the ReBAC layer at all.

## References

### Provider Documentation
- [Descope RBAC](https://docs.descope.com/authorization) | [Management API](https://docs.descope.com/api/management) | [FGA](https://docs.descope.com/authorization/fga)
- [Auth0 RBAC](https://auth0.com/docs/manage-users/access-control/rbac) | [Organizations](https://auth0.com/docs/manage-users/organizations) | [Okta FGA](https://docs.fga.dev/)
- [Entra ID App Roles](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps) | [Groups Overage](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/get-signed-in-users-groups-in-access-token)
- [Keycloak Authorization Services](https://www.keycloak.org/docs/latest/authorization_services/index.html) | [Organizations](https://www.keycloak.org/2024/06/announcement-keycloak-organizations)
- [Okta Groups Claims](https://developer.okta.com/docs/guides/customize-tokens-groups-claim/main/) | [Authorization Servers](https://developer.okta.com/docs/concepts/auth-servers/)
- [Cognito Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html) | [IAM Role Mapping](https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html)
- [Ory Hydra](https://www.ory.com/docs/oauth2-oidc) | [Ory Permissions (Keto)](https://www.ory.com/docs/keto)
- [Duende IdentityServer RBAC](https://duendesoftware.com/learn/role-based-access-control-asp-net-core-identity)
- [node-oidc-provider](https://github.com/panva/node-oidc-provider)

### ReBAC / Zanzibar Ecosystem
- [Google Zanzibar Paper (2019)](https://research.google/pubs/pub48190/) — The foundational paper
- [OpenFGA](https://openfga.dev/) — Open-source Zanzibar implementation (CNCF sandbox)
- [Authzed/SpiceDB](https://authzed.com/) — Open-source Zanzibar implementation
- [Ory Keto](https://www.ory.sh/docs/keto) — First open-source Zanzibar implementation

### Internal Architecture
- [System Architecture](system-architecture.md) — ADR-2 (Two-Layer Authorization), ADR-3 (Provider Abstraction Tiers)
- [Canonical Identity PRD](../_bmad-output/planning-artifacts/prd-canonical-identity.md) — Why the platform owns identity data
- [Descope Data Model](descope-data-model.md) — Descope JWT claim structure and tenant model
