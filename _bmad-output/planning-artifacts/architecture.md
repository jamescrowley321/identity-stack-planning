---
stepsCompleted: ['accelerated-from-brainstorming']
inputDocuments:
  - docs/descope-data-model.md
  - docs/oidc-certification-analysis.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28-01.md
  - _bmad-output/planning-artifacts/prd.md
workflowType: 'architecture'
project_name: 'auth-planning'
user_name: 'James'
date: '2026-03-28'
---

# Architecture Decision Document

## 1. System Context

### Repository Architecture

Three repositories form a vertically integrated identity platform:

| Repo | Layer | Language | Role |
|------|-------|----------|------|
| py-identity-model | Protocol | Python | OIDC/OAuth2 library — JWT decoding, token validation, discovery. Dual sync/async. Production use. |
| terraform-provider-descope | Infrastructure | Go | Terraform provider for Descope. Fork of descope/terraform-provider-descope. |
| identity-stack | Application | Python (FastAPI) + TypeScript (React/Vite) + HCL (Terraform) | B2B SaaS reference app — multi-tenant auth with RBAC, planned ReBAC/FGA/SSO. |

### Dependency Graph

```
identity-stack/backend
  └── py-identity-model (>= 2.1.0) — token validation
  └── Descope Management API — user/tenant/role/FGA operations

identity-stack/frontend
  └── react-oidc-context — vendor-agnostic OIDC (already abstracted)

identity-stack/infra
  └── terraform-provider-descope — project/tenant/role/permission/FGA resources

py-identity-model
  └── No internal dependencies on other repos
  └── Speaks OIDC, not Descope (already provider-agnostic)

terraform-provider-descope
  └── Descope Management API (Go SDK)
  └── No internal dependencies on other repos
```

### Coupling Analysis

- **Frontend:** Vendor-agnostic via `react-oidc-context` — no Descope-specific frontend code
- **Token validation:** Vendor-agnostic via `py-identity-model` — speaks OIDC standard
- **Management operations:** Descope-specific, concentrated in `DescopeManagementClient` — this is the abstraction target
- **Infrastructure:** Descope-specific via Terraform provider — stays provider-specific (Tier 3)

## 2. Key Architectural Decisions

### ADR-1: Platform (TF) vs Runtime (API) Boundary

**Decision:** Platform teams use Terraform for infrastructure-level integration (OIDC/OAuth2 system connections, default seeding). Runtime APIs handle user-facing operations (people, roles, relationships, access).

**Rationale:** This is the natural boundary in enterprise identity — config-as-code for system setup, APIs for operational management.

| Capability | Platform Team (TF) | Runtime (Admin API/UI) |
|---|---|---|
| Permission definitions | Seed defaults | CRUD + list all |
| Role definitions | Seed defaults | CRUD + manage permission mappings |
| Role assignment | — | Assign/remove/list per user per tenant |
| FGA schema | Seed initial schema | Update schema, version it |
| FGA relation tuples | — | Create/delete/list relations |
| FGA authz checks | — | Check endpoint (middleware + API) |
| SSO config | Platform-wide defaults | Per-tenant OIDC/SAML config |
| Tenant CRUD | Seed initial tenants | Full CRUD + settings + hierarchy |
| Access keys | Seed service accounts | Full lifecycle per tenant |
| Password settings | Platform-wide policy | Per-tenant overrides |
| Lists (IP allow/deny) | Platform-wide lists | Per-tenant lists |
| User management | — | Full CRUD + invite + activate/deactivate |
| Applications (inbound/outbound/3P) | Register integrations | — (infra-only) |
| Management keys | Provision for services | — (infra-only) |

### ADR-2: Provider Abstraction Strategy — Iterative Discovery

**Decision:** Build everything for Descope first, then extract the abstraction from working code. Do not design the `IdentityProvider` interface up front.

**Rationale:** The brainstorming session identified this as the critical architecture fork (Q47 vs Q48). Building Descope-specific first:
- Produces a working reference architecture regardless of abstraction outcome
- Reveals the actual seams through implementation, not speculation
- Avoids premature abstraction based on assumed provider equivalence

**Sequence:**
1. Complete all Descope features (Waves 1-6)
2. Document reference architecture patterns
3. Domain modeling — map each concept to Ory/IdentityServer
4. Extract `IdentityProvider` interface from `DescopeManagementClient` seams
5. Ory as second provider — Keto (ReBAC), Kratos (users), Hydra (OIDC)
6. If Tier 2/3 breaks, decide: translation layer, capability flags, or stays provider-specific

### ADR-3: Three-Tier Abstraction Model

**Decision:** Classify capabilities into three tiers based on cross-provider mapping feasibility.

| Tier | Abstraction | Candidates |
|------|-------------|------------|
| **Tier 1** — Strong candidates (similar shape) | Abstract with common interface | User CRUD, ReBAC/authz checks (`check(subject, relation, object)`), SSO/Federation, M2M/Access Keys, Session management |
| **Tier 2** — Requires translation | Interface + provider-specific adapters | RBAC roles/permissions (first-class objects vs relation tuples vs claims), Password policy |
| **Tier 3** — Provider-specific, don't abstract | Provider-specific implementations | Multi-tenancy (Descope tenants ≠ Ory orgs ≠ IdentityServer realms), Flows/auth orchestration, Connectors, JWT claim structure |

**Key insight:** ReBAC is the highest-value abstraction target. Multi-tenancy is the hardest and may never abstract.

### ADR-4: Feature Wave Independence

**Decision:** Each SaaS starter feature wave must be independently implementable with no cross-wave dependencies within the repo.

**Rationale:** Work is parallelized via Ralph loops in git worktrees. Cross-wave dependencies would create merge conflicts and serialization bottlenecks.

**Waves and their independence constraints:**

| Wave | Features | Dependencies |
|------|----------|-------------|
| Wave 1: RBAC CRUD | Role/permission definition management | Existing auth middleware (already deployed) |
| Wave 2: ReBAC/FGA | Schema, relations, checks, middleware | Descope FGA Management API only |
| Wave 3: SSO | Per-tenant SSO config (OIDC/SAML) | Existing tenant model |
| Wave 4: Tenant Enhancement | Update, delete, self-provisioning | Existing tenant CRUD |
| Wave 5: Access Keys + Lists | Key update, IPs, lists | Existing access key CRUD |
| Wave 6: Password Settings | Policy management, per-tenant overrides | Existing tenant model |

### ADR-5: Conformance Test Harness as Quality Gate

**Decision:** The OIDC conformance test harness is a first-class architectural component, not a test utility.

**Rationale:** 16 open py-identity-model PRs were AI-generated via Ralph loops. They pass unit tests and CI, but the OpenID conformance suite deliberately sends malformed responses to verify correct *rejection* behavior. Unit tests alone don't prove spec compliance.

**Architecture:**
```
py-identity-model/conformance/
├── docker-compose.yml          # Extends conformance suite + adds RP app
├── app.py                      # Thin FastAPI RP using py-identity-model
├── run_tests.py                # Test automation via suite REST API
├── configs/
│   ├── basic-rp.json           # Test plan: Basic RP profile
│   └── config-rp.json          # Test plan: Config RP profile
└── README.md
```

The harness runs against already-merged features first (baseline), then validates each review-fixed PR as it merges.

### ADR-6: Quality Tiers Per Repository

**Decision:** Apply different quality bars based on each repo's purpose.

| Repo | Quality Tier | Testing Strategy |
|------|-------------|-----------------|
| py-identity-model | Production-grade | 80%+ coverage, conformance harness, conventional commits, semantic-release, backwards compatibility |
| identity-stack | Demo/POC (ReBAC exception) | E2E happy path per wave, tighter coverage for ReBAC/FGA only |
| terraform-provider-descope | Functional | Existing acceptance tests, registry publish validation |

**ReBAC exception:** Authorization bugs in a portfolio piece are worse than missing features — they damage credibility. Wave 2 gets production-quality testing despite being in a demo-tier repo.

## 3. API Design Patterns

### SaaS Starter API Convention

All new endpoints follow the existing FastAPI patterns in identity-stack/backend:

- **Authentication:** All endpoints require valid session token via existing middleware
- **Authorization:** Admin endpoints check `require_role("admin")` or `require_permission("manage:roles")`
- **Tenant scoping:** Operations scoped to current tenant from `dct` JWT claim
- **Error handling:** Standard HTTP status codes, structured error responses
- **Descope Management API:** All CRUD operations delegate to `DescopeManagementClient`

### Endpoint Pattern

```
GET    /api/{resource}           — List all (tenant-scoped)
POST   /api/{resource}           — Create
GET    /api/{resource}/{id}      — Get by ID
PUT    /api/{resource}/{id}      — Update
DELETE /api/{resource}/{id}      — Delete
```

FGA deviates — uses action-oriented endpoints:
```
GET    /api/fga/schema           — Get current schema
PUT    /api/fga/schema           — Update schema
POST   /api/fga/relations        — Create relation tuple
DELETE /api/fga/relations        — Delete relation tuple
GET    /api/fga/relations        — List relations (filtered)
POST   /api/fga/check            — Check authorization
```

## 4. Data Model Reference

The Descope data model is fully documented in `docs/descope-data-model.md`. Key structures for new features:

- **RBAC:** Roles (name, permissions[], description) and Permissions (name, description) — project-level and tenant-level
- **FGA/ReBAC:** Schema (object types, relations), Relation tuples (subject, relation, object), Check API (subject, relation, object → boolean)
- **SSO:** Per-tenant config (OIDC or SAML), domain routing, attribute mapping
- **JWT Claims:** `dct` (current tenant), `tenants` map with nested roles/permissions, `roles`/`permissions` at project level

## 5. Cross-Repo Interface Contracts

### py-identity-model → identity-stack

- `validate_token()` — sync/async, returns `ClaimsPrincipal` with `sub`, `iss`, `aud`, tenant claims
- `get_discovery_document()` — OIDC discovery with caching
- `to_principal()` — JWT claims to typed principal object
- **Contract:** py-identity-model API must remain backwards-compatible. New features are additive.

### terraform-provider-descope → identity-stack

- TF provisions: project settings, tenants, roles, permissions, FGA schema, SSO defaults, access keys
- SaaS starter reads TF-provisioned state at runtime via Descope Management API
- **Contract:** TF resource schemas define the seed data shape. Runtime APIs manage the operational lifecycle.

### Future: IdentityProvider Interface

```python
class IdentityProvider(Protocol):
    # Tier 1 — abstract
    async def list_users(self, tenant_id: str) -> list[User]: ...
    async def check_relation(self, subject: str, relation: str, object: str) -> bool: ...
    async def configure_sso(self, tenant_id: str, config: SSOConfig) -> None: ...
    async def exchange_credentials(self, key_id: str, secret: str) -> Token: ...

    # Tier 2 — with translation
    async def list_roles(self, tenant_id: str) -> list[Role]: ...
    async def assign_role(self, user_id: str, role: str, tenant_id: str) -> None: ...

    # Capability discovery
    def supports(self, capability: str) -> bool: ...
```

This interface is extracted *after* Descope implementation is complete, not designed up front (ADR-2).
