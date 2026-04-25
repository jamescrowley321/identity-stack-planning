# IdP RBAC Comparison

Why application-owned RBAC beats IdP-delegated RBAC, and why the canonical identity model owns authorization at the application layer.

## The Question

> "Why not just use the RBAC provided by the identity provider?"

The identity-stack platform is built for provider independence: swapping or adding an IdP should mean implementing one adapter, not rewriting authorization logic. This requires understanding how each provider models RBAC — and why none of them are portable.

## Summary

| Provider | Role Model | Permissions | Tenant-Scoped RBAC | Roles in JWT by Default | Key Limitation |
|----------|-----------|-------------|--------------------|-----------------------|----------------|
| **Descope** | First-class objects | First-class, assigned to roles | Yes (native `tenants` claim) | Yes | Proprietary claim structure |
| **Auth0** | Roles bundle API permissions | Per-API resource server | Partial (Organizations + Actions) | No (2 toggles + Actions) | Token bloat at scale |
| **Entra ID** | App Roles in manifest | Via app roles only | No (per-tenant assignments) | Yes (`roles` claim) | Groups overage at 200+ |
| **Keycloak** | Realm + client roles | Authorization Services | Realm-per-tenant or Organizations | Yes (proprietary claims) | Non-standard claim format |
| **Okta** | Groups only | None | No | No (Custom Auth Server required) | No native permissions model |
| **Cognito** | Groups (flat, no hierarchy) | None (IAM mapping only) | No | Yes (`cognito:groups`) | 25 groups/user limit; IAM-coupled |
| **Ory Hydra** | None (delegates to Keto) | Zanzibar relation tuples | Via Keto only | No (webhook injection) | Requires separate authorization service |
| **Duende** | None (delegates to ASP.NET Identity) | None | None | Whatever host injects | Framework, not a product |
| **node-oidc-provider** | None (pure protocol library) | None | None | Whatever app feeds | Library, not a product |

## Per-Provider Detail

### Descope

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
- **Pain point**: The `tenants` claim structure is entirely proprietary. No other IdP uses this format.

### Auth0

- **Authorization Core**: Roles are tenant-level objects that bundle permissions. Permissions are scoped to API resource servers.
- **JWT claims**: Permissions land in the access token as `"permissions": ["read:reports", "write:users"]` — but only after enabling two toggles (RBAC + "Add Permissions in Access Token") per API. Roles are **never** in tokens without custom Actions.
- **Organizations**: Add `org_id` to tokens. Org-scoped role assignments exist but require Actions to surface org roles into token claims.
- **Limits**: 1,000 roles/tenant, 50 roles/user, 1,000 permissions/API. Token bloat: 5 roles x 20 permissions = 100 strings per token.
- **Pain points**: Permissions not in tokens by default. No hierarchical roles. Org-scoped RBAC requires custom code. Static tokens — permission changes require token refresh.

### Microsoft Entra ID

- **App Roles**: Defined in the app registration manifest with a `value` string, assigned to users/groups via the service principal.
- **JWT claims**: `roles` (app role values), `groups` (group object GUIDs), `wids` (directory role template GUIDs).
- **Groups overage**: Beyond 200 groups, the `groups` claim is dropped entirely and replaced with `_claim_names`/`_claim_sources` pointing to a Graph API endpoint. This breaks pure token-based authorization.
  ```json
  {
    "_claim_names": { "groups": "src1" },
    "_claim_sources": { "src1": { "endpoint": "https://graph.microsoft.com/v1.0/users/{oid}/getMemberObjects" } }
  }
  ```
- **Multi-tenancy**: App roles are defined in the home tenant. Assignments are per-tenant service principal. No cross-tenant role portability.
- **Limits**: 1,000 app roles/registration, 1,500 assignments/principal. Groups are GUIDs (not names), differ per tenant.
- **Pain points**: Three parallel role systems (app roles, directory roles, security groups) with different handling. Overage requires synchronous Graph API calls mid-request.

### Keycloak

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
- **Authorization Services**: Four-layer system (resources, scopes, policies, permissions) for fine-grained authorization. Powerful but significant operational complexity.
- **Multi-tenancy**: Realm-per-tenant degrades past ~100 realms. Organizations feature (GA in Keycloak 26, 2024) adds B2B multi-tenancy within a single realm.
- **Pain points**: Every role for every client is embedded in every JWT — token bloat. `realm_access`/`resource_access` claim names are Keycloak-only. Authorization Services is often overkill for simple RBAC.

### Okta

- **Groups are the only RBAC primitive.** Okta has no native roles or permissions model. Authorization is explicitly the application's responsibility.
- **JWT claims**: `groups` claim must be added via a Custom Authorization Server (paid add-on). The org authorization server cannot add groups to access tokens. Claim populated via Okta Expression Language filter.
- **Multi-tenancy**: No built-in concept. Options: separate orgs (high cost) or group-naming conventions (`tenant-A:admin`).
- **Limits**: 100 groups per token (exceeding fails the request). No fine-grained permissions.
- **Pain point**: Okta deliberately does not provide application-level RBAC. Groups are membership lists, not permission sets.

### AWS Cognito

- **Groups** are flat organizational units with no hierarchy. Each group can optionally map to an IAM role for AWS resource access — not application-level permissions.
- **JWT claims**: `cognito:groups` (group names), `cognito:roles` (IAM role ARNs), `cognito:preferred_role`. Present in both ID and access tokens.
  ```json
  { "cognito:groups": ["admins", "editors"], "cognito:roles": ["arn:aws:iam::123:role/AdminRole"] }
  ```
- **IAM coupling**: The `groups → IAM role → STS AssumeRole` pipeline is designed for AWS resource access (S3, DynamoDB), not application RBAC. Permission logic lives in IAM policies, not the application data model.
- **Custom claims**: Require Pre Token Generation Lambda trigger (Essentials/Plus tier). Adds latency, requires external state store.
- **Multi-tenancy**: No native concept. Workarounds: separate user pools (4 custom domain limit), groups-per-tenant (burns group quota), `custom:tenant_id` (app must enforce).
- **Limits**: 25 groups per user, 5,000 groups per pool. No permissions model, no role hierarchy.
- **Pain point**: Cognito answers "which IAM role should this user assume?" not "can this user do this in this tenant?"

### Ory (Hydra + Keto/Permissions)

- **Hydra** is a pure OAuth2/OIDC server. It explicitly has no authorization logic — by design.
- **Keto (Ory Permissions)**: First open-source implementation of Google's Zanzibar paper. Data model is relation tuples (`namespace:object#relation@subject`), not traditional RBAC. Roles are expressible but must be modeled explicitly.
- **JWT claims**: Hydra tokens carry no role/permission claims by default. Custom claims require either a consent flow UI or OAuth2 webhooks with external infrastructure.
- **Separation of concerns**: Hydra (tokens) + Kratos (identity) + Keto (permissions) + Oathkeeper (proxy). Most architecturally correct separation, highest operational complexity.
- **Pain point**: Getting RBAC data into JWTs requires operating multiple services and custom plumbing.

### Duende IdentityServer

- **No built-in RBAC.** Duende is a framework, not a platform. It handles OIDC protocol mechanics and delegates user/role management entirely to ASP.NET Identity.
- Roles flow from `ClaimTypes.Role` in `ClaimsIdentity`, surfaced via `IProfileService`. Only claims matching `UserClaims` on `ApiResource`/`ApiScope` are included in tokens.
- Commercial license required since v6.

### node-oidc-provider

- **No built-in RBAC.** A certified OIDC library (MIT) with zero authorization opinion. Claims are populated entirely through the application-supplied `Account` adapter's `claims()` method.
- The library handles OIDC protocol only. RBAC, ABAC, ReBAC — all must be implemented by the consuming application.

## The Five Problems

### 1. No standard claim format

Descope uses `tenants.{id}.roles`. Keycloak uses `realm_access.roles` and `resource_access.{client}.roles`. Entra uses `roles`. Cognito uses `cognito:groups`. Auth0 uses `permissions`. Okta uses `groups`. Every middleware and token validator must know which IdP issued the token and where to find the roles. There is no OIDC standard for authorization claims.

### 2. Most providers don't actually do RBAC

Okta, Ory Hydra, Duende, and node-oidc-provider explicitly consider authorization out of scope. Cognito's "RBAC" maps groups to IAM roles for AWS resource access, not application permissions. That's 5 of 9 providers where you build your own RBAC regardless.

### 3. Multi-tenant RBAC is rare

Only Descope has native tenant-scoped roles in the token. Auth0 Organizations exist but require custom Actions to surface org-scoped roles. Entra app roles don't transfer across tenants. Cognito has no tenant concept. Keycloak just shipped Organizations in v26. For any SaaS product with "user is admin in Org A but viewer in Org B," most IdPs force you to build that yourself.

### 4. Token-based authorization breaks at scale

Entra drops the `groups` claim entirely beyond 200 groups and requires a Graph API call mid-request. Auth0 expands every permission from every role into a flat array. Cognito caps at 25 groups per user. Keycloak embeds every role for every client. Token bloat is a real operational problem that forces architecture compromises.

### 5. IdP lock-in

If your authorization logic is "parse `realm_access.roles` from the Keycloak token" or "read `cognito:groups` and map to IAM," you've coupled your entire authorization layer to one vendor's claim format. Switching IdPs means rewriting every authorization check, every middleware, every test.

## Why Application-Owned RBAC

The identity-stack canonical model addresses all five problems:

- **Normalized model** — Roles and permissions live in Postgres (`roles`, `permissions`, `role_permissions`, `user_tenant_roles`), not in IdP-specific claim structures.
- **Provider-agnostic** — Adding a new IdP means implementing one sync adapter, not rewriting authorization logic. The application enforces `require_role()` / `require_permission()` against its own store.
- **Tenant-scoped by design** — User-tenant-role assignments are first-class relations, not bolted on via groups or custom claims.
- **No token bloat** — The JWT proves identity (who you are). The application resolves permissions from its own store (what you can do).
- **Multi-IdP correlation** — A single user can be linked to multiple IdP identities via `idp_links`. Authorization is unified regardless of which provider issued the token.
- **Owned audit trail** — `assigned_by`, `assigned_at`, `updated_at` in the application database, not scattered across provider consoles.

### What stays in the IdP

IdPs handle authentication — they are purpose-built for login flows, MFA, passkeys, social login, session management. The application handles authorization. These are different concerns, and the provider landscape demonstrates that conflating them creates fragile, non-portable systems.

ReBAC/FGA (Zanzibar-style graph evaluation) stays in purpose-built engines like Descope FGA or Ory Keto. They are optimized for relationship graph evaluation at scale. The canonical model owns RBAC; FGA is proxied, never stored locally. See [system architecture](system-architecture.md) for the two-layer authorization model (ADR-2).

## References

### Provider Documentation
- [Descope RBAC](https://docs.descope.com/authorization) | [Management API](https://docs.descope.com/api/management)
- [Auth0 RBAC](https://auth0.com/docs/manage-users/access-control/rbac) | [Organizations](https://auth0.com/docs/manage-users/organizations)
- [Entra ID App Roles](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps) | [Groups Overage](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/get-signed-in-users-groups-in-access-token)
- [Keycloak Authorization Services](https://www.keycloak.org/docs/latest/authorization_services/index.html) | [Organizations](https://www.keycloak.org/2024/06/announcement-keycloak-organizations)
- [Okta Groups Claims](https://developer.okta.com/docs/guides/customize-tokens-groups-claim/main/) | [Authorization Servers](https://developer.okta.com/docs/concepts/auth-servers/)
- [Cognito Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html) | [IAM Role Mapping](https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html)
- [Ory Hydra](https://www.ory.com/docs/oauth2-oidc) | [Ory Permissions (Keto)](https://www.ory.com/docs/keto)
- [Duende IdentityServer RBAC](https://duendesoftware.com/learn/role-based-access-control-asp-net-core-identity)
- [node-oidc-provider](https://github.com/panva/node-oidc-provider)

### Internal Architecture
- [System Architecture](system-architecture.md) — ADR-2 (Two-Layer Authorization), ADR-3 (Provider Abstraction Tiers)
- [Canonical Identity PRD](../_bmad-output/planning-artifacts/prd-canonical-identity.md) — Why the platform owns identity data
- [Descope Data Model](descope-data-model.md) — Descope JWT claim structure and tenant model
