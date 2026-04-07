---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments: []
session_topic: 'Canonical identity domain model in PostgreSQL — evolving identity-stack from Descope proxy to identity platform with pluggable provider sync'
session_goals: 'Design canonical user/role/permission/relationship schema, define sync architecture (event-driven/polling/write-through), assess impact on existing Descope feature waves and PRD/sprint structure, enable multi-IdP identity correlation, integrate with Tyk claim normalization'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Morphological Analysis', 'Party Mode (Multi-Agent Discussion)']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** James
**Date:** 2026-03-29

## Session Overview

**Topic:** Canonical identity domain model — evolving identity-stack from a thin Descope proxy into an identity platform that owns user/role/permission/relationship data in PostgreSQL, with IdPs as sync targets rather than sources of truth.

**Goals:**
1. Design the canonical user/role/permission/relationship schema in PostgreSQL
2. Define sync architecture between canonical store and IdP providers
3. Assess impact on existing Descope feature waves (Session 1) and PRD/sprint structure (Session 2)
4. Enable multi-IdP identity correlation for the PRD 4 Multi-IdP Gateway Demo
5. Integrate canonical data with Tyk claim normalization plugin

### Prior Session Context

This session builds on two prior brainstorming sessions:

- **Session 1 (2026-03-28):** Established the Descope feature completion plan across 4 parallel tracks, 6 feature waves, 3-tier abstraction model, and the principle "build Descope-specific first, abstract iteratively."
- **Session 2 (2026-03-29):** Defined 7 initiatives (I1-I8) across 4 PRDs — repo rename, HCP TF + Infisical, Tyk gateway + OpenFeature, node-oidc-provider integration, Multi-IdP Gateway Demo. Sprint-per-theme sequencing for solo developer.

### The Key Shift

Instead of the backend being a thin proxy to the Descope Management API, the backend owns a canonical identity domain model in Postgres. The IdP (Descope, Ory, node-oidc-provider, etc.) becomes a sync target rather than the source of truth. This enables:

1. Canonical user profiles with linked IdP identities
2. Owned role/permission/relationship definitions synced to runtime providers
3. Cross-IdP identity mapping for the Multi-IdP Gateway Demo
4. Decoupling from any single provider's data model
5. Tyk claim normalization plugin can look up canonical user data

### Session Setup

**Participant:** James — identity/auth SME, deep OIDC/OAuth2 knowledge, new to Descope specifically. Solo developer across all repos.

**Constraint:** This is a significant architectural evolution. Must fit within the existing PRD/sprint structure or clearly define how it reshapes that structure.

---

## Descope Capabilities Research

Research conducted on Descope's event/webhook/customization capabilities to ground the brainstorm:

### Sign-Up Options
- Full Management API support for user creation (`POST /v1/mgmt/user/create`) — don't need hosted flows
- Existing `invite_user()` in SaaS starter already uses this pattern
- Can own the sign-up form and register in Descope programmatically

### Webhooks/Events (Audit Webhook)
- Audit Webhook connector pushes events: `UserCreated`, `UserModified`, `UserDeleted`, `LoginSucceed`, `RoleCreated`, `RoleModified`, `PermissionCreated`, `TenantCreated`, etc.
- **Throttled, not real-time** — internal throttling mechanism
- Search Users API with `fromModifiedTime`/`toModifiedTime` for polling catch-up

### Flow Customization (Lambda-Trigger Equivalent)
- Generic HTTP Connector in Flows — call external APIs during sign-up/login
- Branch on HTTP response, inject custom claims from response data
- Scriptlets for inline logic — this is the Auth0 Actions / Cognito Lambda triggers analog

### SCIM 2.0 Support
- Supported with Okta, Azure/Entra, Ping Identity
- Groups → Roles automatic mapping
- Tenant-scoped with `Tenant Admin` access key
- Multi-tenant: each tenant can have multiple SSO configs with isolated identity management

### User Object Fields
`userId`, `loginIds[]`, `email`, `phone`, `displayName`, `givenName`, `familyName`, `status`, `roleNames[]`, `userTenants[{tenantId, roleNames[]}]`, `customAttributes{}`, `externalIds[]`, `createdTime`

---

## Technique Execution: Phase 1 — Question Storming

### 50 Questions Across 8 Clusters

#### Cluster 1: Data Ownership & Source of Truth

- **Q1:** If Postgres owns the canonical user record, what happens when a user self-registers through Descope's hosted login? Descope creates the user first — how does it flow back to our DB?
- **Q2:** Is the canonical store the source of truth for *all* identity data, or only for the data *our app cares about*? (Descope stores password hashes, MFA state, session tokens — do we own those too?)
- **Q3:** If a Descope admin creates a role directly in the Descope console (bypassing our API), is that a conflict, a sync event, or an error condition?
- **Q4:** Who owns the user lifecycle — can a user exist in our DB but not in any IdP? (e.g., pre-provisioned user awaiting first login)
- **Q5:** Does "source of truth" mean our DB is authoritative and IdP state is derived, or does it mean our DB is the *coordination point* that IdPs sync through?
- **Q6:** Is there a distinction between "identity data" (who you are) and "authorization data" (what you can do)? Could identity stay with the IdP while authorization lives in Postgres?

#### Cluster 2: Domain Model Boundaries

- **Q7:** What's the minimal canonical user? `{id, email, display_name, status, created_at, idp_links[]}`? Or do we need `given_name`, `family_name`, `phone` — the SCIM Core User schema fields?
- **Q8:** Should the canonical schema literally align with SCIM Core User (`urn:ietf:params:scim:schemas:core:2.0:User`)? That gives us a standard wire format for free and maps cleanly to Entra/Okta/any SCIM provider.
- **Q9:** Roles and permissions — do we store definitions only (the catalog: "admin", "viewer", "projects.create") or also assignments (user X has role Y in tenant Z)? Both?
- **Q10:** For ReBAC/FGA relationships — do those live in Postgres too, or do they stay in the provider's FGA engine (Descope FGA, Ory Keto) because relationship evaluation at scale is what those engines are optimized for?
- **Q11:** Tenant as a first-class entity — is it just `{id, name, domains[]}`? Or does it carry its own config (which IdP federation, which roles are available, SCIM config)?
- **Q12:** Where do groups fit? SCIM has groups, Descope maps groups → roles. Do we model groups as a canonical entity, or is "group" just a sync-time mapping concept?
- **Q13:** Access keys (machine identities) — canonical entity or provider-specific? If Descope manages access key lifecycle and signing, can we meaningfully own that?

#### Cluster 3: Sync Architecture & SCIM

- **Q14:** If we support SCIM, does our backend become a SCIM server (receiving provisioning from Okta/Entra) as well as a SCIM client (pushing to Descope)? Or does SCIM go directly from enterprise IdP → Descope, and we sync from Descope via webhooks?
- **Q15:** Three sync paths emerge: (a) enterprise IdP → SCIM → our DB → sync to Descope, (b) enterprise IdP → SCIM → Descope → webhook → our DB, (c) our API → write to DB → sync to Descope. Which paths coexist?
- **Q16:** The Audit Webhook is throttled. For the `UserCreated` event during self-service sign-up via Descope flows — is throttled-eventual-consistency acceptable, or do we need the Generic HTTP Connector in the flow to call our API synchronously during sign-up?
- **Q17:** Write-through vs event-driven: when our API creates a role, do we (a) write to Postgres, then synchronously call Descope, (b) write to Postgres and emit an event that an async worker syncs, or (c) write to both simultaneously?
- **Q18:** Conflict resolution — if the canonical DB says user has role "admin" but Descope says "viewer" (e.g., someone edited in Descope console), who wins? Canonical DB always wins? Last-write-wins? Alert-and-manual-resolve?
- **Q19:** Given SCIM support — could our backend act as a SCIM proxy, accepting SCIM from upstream (Okta/Entra), persisting canonically, and forwarding to whichever downstream IdP is active? That would make IdP switching a configuration change rather than a migration.

#### Cluster 4: Consistency & Sync Events

**Key insight established:** JWTs are already eventually consistent (10-30 min TTL). Sync delay doesn't make RBAC worse than it already is. FGA checks are real-time but FGA is proxied, not owned.

**Sync architecture decisions:**
- **FGA**: Proxy only. Don't model relations in Postgres. Delegate to provider engine.
- **Sync mechanism**: Write-through for admin ops (simplest). No outbox pattern for now.
- **Events**: Redis pub/sub (already present for Tyk) for cache invalidation / notifications.
- **Safety net**: Periodic reconciliation poll catches drift from out-of-band changes.

- **Q20:** Is the canonical DB the write master (all changes go through our API first) or the coordination ledger (changes can come from multiple sources and we reconcile)?
- **Q21:** Do you want to enforce "all admin operations go through our API" as a policy (block Descope console edits for managed fields), or do you need to gracefully handle out-of-band changes?
- **Q22:** For solo-dev scale, is Redis pub/sub + periodic reconciliation sufficient, or do you want to design for a proper event bus from the start?
- **Q23:** The SCIM proxy idea (Q19) — is that in scope for this brainstorm, or is that a future evolution?

#### Cluster 5: Canonical Schema Shape (Post-Simplification)

- **Q24:** If FGA is proxied and auth state (passwords, MFA, sessions) stays with the IdP, the canonical schema is really just: Users, Roles, Permissions, Tenants, IdP Links, and role/permission assignments. Is that the complete list?
- **Q25:** Is `IdPLink` the right abstraction for "this canonical user is Descope user X and also Ory user Y"? Something like `{user_id, provider, external_sub, external_email, linked_at, metadata}`?
- **Q26:** Do role and permission definitions live canonically (we own the catalog), or do we also need to sync definitions from IdPs? (e.g., Descope has roles we didn't create — do we import them?)
- **Q27:** Is there a `ProviderConfig` entity? Something like `{provider_id, type: descope|ory|node-oidc, base_url, credentials_ref, capabilities: [rbac, fga, scim], active: bool}` — the registry of connected IdPs?
- **Q28:** SCIM Core User has: `userName`, `name{given,family,middle}`, `emails[]`, `phoneNumbers[]`, `active`, `groups[]`, `roles[]`, `externalId`. Is aligning the canonical user to this schema worth it, even if we don't implement SCIM server immediately?
- **Q29:** Do we need an audit/event log table in Postgres (who changed what, when) or is that overkill given Descope's audit trail and the eventual observability stack?

#### Cluster 6: The DAG — What Depends on What After Rename

- **Q30:** Where does this land in the sprint sequence? Descope features → rename → then what? Does canonical DB come before infra, during gateway, or as part of multi-provider?
- **Q31:** If the canonical DB comes before the gateway work, does it replace the Descope feature waves? Instead of "RBAC CRUD that proxies to Descope," you build "RBAC CRUD that writes to Postgres and syncs to Descope."
- **Q32:** Session 1 said "build Descope-specific first, abstract iteratively." Does the canonical DB invalidate that principle, or is it the mechanism for the abstraction? (Descope becomes the first sync adapter.)
- **Q33:** Does this become a new PRD (PRD 5: Canonical Identity Domain Model), or does it reshape PRD 3/4 from Session 2?
- **Q34:** The Tyk claim normalization plugin (PRD 4) — with a canonical DB, does the plugin query Postgres for canonical user data instead of just mapping raw JWT claims?
- **Q35:** Postgres migration (SQLite → Postgres) — prerequisite for canonical schema, or *is* the canonical schema work?
- **Q36:** Does Postgres need to land before Tyk (PRD 2)? Tyk works with JWT claims. But if PRD 4 plugin queries canonical data, Postgres must exist before PRD 4.
- **Q37:** Can HCP TF + Infisical (PRD 1) run in parallel with canonical DB work? Seems fully independent.
- **Q38:** Can Tyk + OpenFeature (PRD 2) run in parallel with canonical DB? Tyk is middleware — cares about JWTs and headers, not where user data lives.
- **Q39:** node-oidc-provider as test fixture (PRD 3) — depends on canonical DB? Or independent?
- **Q40:** Multi-IdP Gateway Demo (PRD 4) — this is where canonical DB is load-bearing. Plugin needs IdPLink to correlate users across providers. PRD 4 depends on canonical DB.
- **Q41:** Does Alembic need to be set up as a prerequisite before any schema work? `create_all()` won't work with a real evolving schema.
- **Q42:** Existing Document + TenantResource tables — fold into canonical schema or keep as app-domain tables alongside identity-domain tables?

#### Cluster 7: Tyk Plugin + Canonical DB Interaction

- **Q43:** Two plugin architectures: (a) stateless — map JWT claims to canonical headers, (b) stateful — look up canonical user in Postgres using JWT `sub`, enrich headers. Which is v1?
- **Q44:** If stateful, the Go plugin needs a Postgres connection — connection pooling, latency, failure modes. Redis cache in front?
- **Q45:** Or plugin stays stateless (v1 = claim mapping) and backend does canonical lookup? Plugin maps what it can from claims, backend enriches from Postgres.
- **Q46:** For Multi-IdP demo, minimum viable identity correlation: same email across IdPs = same person. No canonical DB lookup needed in plugin — just normalize email. Enough for demo?

#### Cluster 8: Descope Feature Waves With Canonical Future in Mind

- **Q47:** Knowing canonical DB is coming — should RBAC CRUD APIs (Wave 1) be designed with the canonical schema in mind? Same REST contract, but structured so internals can swap from Descope proxy to Postgres-backed.
- **Q48:** Is that as simple as: define Pydantic request/response models (API contract), build Descope-proxy implementation, later swap service layer to Postgres-backed? Router layer doesn't change.
- **Q49:** Does `DescopeManagementClient` already serve as the seam? If all Descope calls go through it, the canonical DB refactor is: insert service layer between router and client, service writes to Postgres, client becomes sync adapter.
- **Q50:** Is there any Descope feature wave where "build as proxy now" creates tech debt the canonical DB has to undo? Or is every wave clean to refactor?

### Key Decisions Made During Question Storming

1. **FGA stays proxied** — don't model relations in Postgres, delegate to provider's FGA engine
2. **Write-through for sync** — no outbox pattern, keep it simple for solo-dev scale
3. **Redis pub/sub for events** — reuse Tyk's Redis for cache invalidation / notifications
4. **Periodic reconciliation** as safety net for out-of-band changes
5. **Descope features complete first, then rename, then determine the DAG** — canonical DB doesn't jump the queue
6. **Canonical model scoped to enterprise identity primitives** — users, roles, permissions, tenants, IdP links. Auth state (passwords, MFA, sessions) stays with the IdP.

---

## Technique Execution: Phase 2 — Morphological Analysis

### Dimension 1: Canonical Entity × Data Ownership

| Entity | Postgres (Canonical) | IdP (Delegated) | Proxied (Pass-through) |
|---|---|---|---|
| **User profile** | `id`, `email`, `display_name`, `given_name`, `family_name`, `phone`, `status`, `created_at` | Password hash, MFA state, sessions, login history | — |
| **IdP Link** | `user_id`, `provider`, `external_sub`, `external_email`, `linked_at`, `metadata` | — | — |
| **Role definitions** | `id`, `name`, `description`, `created_at` | Synced copy for JWT claim embedding | — |
| **Permission definitions** | `id`, `name`, `description`, `created_at` | Synced copy for JWT claim embedding | — |
| **Role-permission mapping** | `role_id`, `permission_id` | Synced copy | — |
| **User-role assignment** | `user_id`, `role_id`, `tenant_id` | Synced copy (appears in JWT) | — |
| **Tenant** | `id`, `name`, `domains[]`, `provider_config` | Tenant exists in IdP for JWT `dct` / scoping | — |
| **FGA schema** | — | — | Proxy to provider FGA engine |
| **FGA relations** | — | — | Proxy to provider FGA engine |
| **FGA checks** | — | — | Proxy to provider FGA engine |
| **Access keys** | — | Lifecycle + signing stays with IdP | Proxy CRUD, don't own |
| **Groups** | Optional — mapping table if SCIM is active | IdP-side concept | SCIM group → role mapping at sync time |
| **Provider config** | `provider_id`, `type`, `base_url`, `capabilities[]`, `active` | — | — |

**Key finding:** The canonical schema is 7 tables: `users`, `idp_links`, `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `tenants` — plus `provider_configs` as infrastructure. FGA, access keys, and auth state are fully delegated.

### Dimension 2: Sync Path × Entry Point

| Entry Point | Write Path | Sync Mechanism | Consistency |
|---|---|---|---|
| **Our API** (admin creates role) | Postgres → write-through to Descope | Synchronous | Strong |
| **Our API** (admin assigns role to user) | Postgres → write-through to Descope | Synchronous | Strong (next JWT refresh) |
| **Descope Flow** (self-service sign-up) | Descope creates user → HTTP Connector calls our API → Postgres | Synchronous (in-flow) | Strong |
| **Descope Console** (out-of-band edit) | Descope state changes → audit webhook → Postgres reconcile | Eventual (throttled) | Weak — reconciliation catches it |
| **SCIM** (enterprise IdP provisions user) | Okta/Entra → Descope SCIM → audit webhook → Postgres | Eventual | Weak — but SCIM is already eventual |
| **SCIM proxy** (future: enterprise IdP → our API) | Okta/Entra → our SCIM endpoint → Postgres → sync to Descope | Synchronous | Strong |
| **Periodic reconciliation** (safety net) | Poll Descope Search API → diff with Postgres → update | Scheduled | Catch-all for drift |
| **Redis pub/sub** (cache invalidation) | Any write → publish event → subscribers invalidate caches | Fire-and-forget | Not for persistence — notification only |

**Key finding:** Two primary write paths (our API = write-through, Descope-originated = webhook catch-up) cover 90% of cases. SCIM proxy is a clean future evolution. Redis pub/sub is orthogonal — notification only, not persistence.

### Dimension 3: Initiative × Canonical DB Dependency

| Initiative | Canonical DB Dependency | Can Parallel? | Notes |
|---|---|---|---|
| **Descope feature waves** (Session 1, Track B) | **None** — build as Descope proxy, refactor later | Already sequenced first | Service layer seam makes refactor clean |
| **I7 Rename** | **None** | Already sequenced after features | Metadata change only |
| **PRD 1: HCP TF + Infisical** | **None** | **Yes** — fully independent | Infra pipeline, no domain model interaction |
| **PRD 2: Tyk + OpenFeature** | **None** | **Yes** — fully independent | Gateway works with JWT claims, doesn't need canonical data |
| **PRD 3: node-oidc-provider** | **Soft** — test fixture independent, provider integration soft-depends | **Mostly yes** | Test fixture independent, provider integration soft-depends |
| **PRD 4: Multi-IdP Demo** | **Hard** — plugin needs IdPLink for cross-IdP correlation | **No** — depends on canonical DB | Email heuristic is dev scaffold only, not v1 |
| **Canonical DB (PRD 5)** | — | Parallel with PRD 1, PRD 2, PRD 3 test fixture | Core dependency for PRD 4 |
| **Alembic setup** | Prerequisite for canonical DB | Sequential — must come first | Blocks all schema work |
| **SQLite → Postgres migration** | Prerequisite/simultaneous with canonical schema | Sequential | Part of PRD 5 Epic 1 |

**Key finding:** PRDs 1, 2, and 3 (test fixture) are fully independent of canonical DB. PRD 4 is the only hard dependency. More parallelism than expected.

### Dimension 4: Canonical Schema × SCIM Alignment

| SCIM Core User Field | Canonical Schema | Value of Alignment |
|---|---|---|
| `userName` | `user_name` | Direct map — SCIM-compatible primary identifier |
| `name.givenName` | `given_name` | Direct map — needed for enterprise display |
| `name.familyName` | `family_name` | Direct map |
| `name.middleName` | Skip — rarely used | Low value |
| `emails[].value` | `email` (single for now, `emails[]` later) | Start simple, can expand |
| `phoneNumbers[].value` | `phone` (single for now) | Start simple |
| `active` | `status` enum (active, disabled, invited) | Richer than SCIM boolean — maps with `active = status == 'active'` |
| `groups[].value` | No groups table in v1 — map at sync time | Groups are a sync concept, not canonical entity |
| `roles[].value` | `user_tenant_roles` table | Direct map via join |
| `externalId` | `idp_links.external_sub` | Direct map per provider |

**Key finding:** Aligning field names with SCIM conventions costs nothing and buys future SCIM server compatibility. Don't implement SCIM endpoints now, but name the columns so they map cleanly when you do.

### Dimension 5: Phasing — The DAG

```
Descope Feature Waves (Track B, Waves 1-6)
  │
  ▼
I7 Rename (Sprint 0)
  │
  ├──────────────────────┬──────────────────────┬─────────────────────┐
  ▼                      ▼                      ▼                     ▼
PRD 1                  PRD 2                  PRD 3                PRD 5
HCP TF +               Tyk +                  node-oidc            Canonical DB
Infisical              OpenFeature             test fixture          │
(independent)          (independent)          (independent)         ├── Alembic setup
                                                                    ├── Postgres migration
                                                                    ├── Schema: users,
                                                                    │   idp_links, roles,
                                                                    │   permissions, tenants
                                                                    ├── Service layer refactor
                                                                    │   (swap Descope proxy
                                                                    │    → Postgres + sync)
                                                                    └── Write-through sync
                                                                        adapter for Descope
  │                      │                      │                     │
  └──────────────────────┴──────────────────────┴─────────────────────┘
                                    │
                                    ▼
                              PRD 4: Multi-IdP
                              Gateway Demo
                              (depends on: Tyk from PRD 2,
                               node-oidc from PRD 3,
                               IdPLink from PRD 5)
```

### Cross-Dimensional Synthesis

**Finding 1: The canonical schema is small.** 8 tables. SCIM-aligned field names. No FGA, no auth state, no access keys. Focused domain model, not a second IdP.

**Finding 2: Write-through + webhook catch-up + Redis pub/sub + reconciliation is the right sync stack.** Simple, no new infrastructure beyond Tyk's Redis, sufficient for solo-dev scale.

**Finding 3: The DAG has real parallelism.** PRDs 1, 2, 3, and 5 are all independent after rename. Only PRD 4 (capstone) requires convergence. Solo developer means you context-switch, but architectural dependencies don't force sequential execution.

**Finding 4: Descope feature waves are not wasted work.** Build as proxies with IdentityService seam. PRD 5 refactors internals. Same API contracts, same tests.

**Finding 5: SCIM alignment is free insurance.** Name columns to match SCIM conventions. Don't build SCIM endpoints. Schema is ready when enterprise federation demands it.

**Finding 6: PRD 4 v1 needs canonical DB for real identity correlation.** Email heuristic is a dev scaffold, not the demo.

---

## Technique Execution: Phase 3 — Party Mode (Multi-Agent Architectural Validation)

**Participants:** Winston (Architect), John (PM), Bob (SM), Amelia (Dev)

### Round 1: The DAG and Solo-Developer Parallelism

**Bob (SM):** The 4-track parallel model shows *architectural* independence, not *execution* independence. James can't physically work on all four simultaneously. What the DAG tells us is: you have **scheduling freedom, not scheduling parallelism**. You can pick any order. The constraint is only that PRD 4 comes last.

**Winston (Architect):** The DAG proves these tracks don't create merge conflicts or design coupling. The real question is: in what *order* do they create the most value, given that order doesn't matter architecturally?

**John (PM):** Canonical DB first, because it reshapes what PRD 4 looks like. If you build Tyk first (PRD 2) then add canonical DB, you build the claim normalization plugin twice. If canonical DB exists first, PRD 2 and PRD 4 can be designed knowing the data is there.

**Bob (SM):** Counterpoint — Canonical DB is highest-risk, most uncertain. PRD 1/2 are straightforward ops with known outcomes. Doing them first builds momentum.

**Decision (D19):** Value-first ordering. Canonical DB before Tyk/infra.

### Round 2: PRD Placement — PRD 5 Confirmed

**John (PM):** Canonical DB doesn't reshape existing PRDs — it **enables** PRD 4 and **refactors internals** of the Descope feature waves. Those are two different things.

**Winston (Architect):** It's PRD 5. The scope is distinct: Postgres migration, Alembic, schema, service layer extraction, write-through sync, inbound sync, identity linking. 4 epics.

**Amelia (Dev):** If we build Waves 1-6 as Descope proxies and *then* PRD 5 refactors internals — that's building everything twice. Unless we add the `IdentityService` seam from Wave 1.

**Winston (Architect):** The seam in practice:

```python
# Today: Router → DescopeManagementClient directly
@router.post("/api/roles")
async def create_role(body: CreateRoleRequest, descope = Depends(get_descope)):
    await descope.create_role(body.name, body.description, body.permission_names)

# With seam: Router → IdentityService → DescopeManagementClient
@router.post("/api/roles")
async def create_role(body: CreateRoleRequest, service = Depends(get_identity_service)):
    await service.create_role(body.name, body.description, body.permission_names)

class IdentityService:
    def __init__(self, descope: DescopeManagementClient):
        self.descope = descope
    async def create_role(self, name, description, permission_names):
        await self.descope.create_role(name, description, permission_names)
```

Cost: one extra class with pass-through methods. When PRD 5 arrives, add Postgres writes inside the service methods, demote Descope calls to sync.

**Amelia (Dev):** ~20 lines per wave. Cheapest architectural insurance ever.

**Decision (D20, D21):** PRD 5: Canonical Identity Domain Model. Descope waves add IdentityService seam from Wave 1.

### Round 3: PRD 4 Plugin Architecture

**Winston (Architect):** With canonical DB, the Tyk plugin doesn't query Postgres directly. It calls the backend's internal API:

```
Tyk Plugin (Go, stateless)
  ├── Extract JWT sub + issuer
  ├── Determine provider from issuer URL
  ├── GET /api/internal/identity?sub={sub}&provider={provider}
  │     └── Backend: IdPLink → canonical user → roles/tenants
  │     └── Response cached in Redis (TTL = JWT TTL)
  ├── Set canonical headers: X-User-ID, X-User-Email, X-IdP, X-Roles, X-Tenant
  └── Forward to backend
```

Plugin stays structurally simple (HTTP call + header mapping). Data is rich (canonical identity, not just claim extraction).

**Amelia (Dev):** First request: plugin → backend → Postgres → Redis cache. Subsequent requests: plugin → Redis → headers. Cache TTL matches JWT TTL.

**Decision (D23, D24):** Plugin calls internal identity API (HTTP), Redis-cached. PRD 4 v1 requires canonical DB for real correlation.

### Round 4: The Schema

**Winston (Architect):** Proposed 8-table schema:

```
tenants          — id, name, domains[], status, timestamps
provider_configs — id, name, type (enum), base_url, issuer_url, capabilities[],
                   config_ref (Infisical path), active, timestamps
users            — id, email, user_name, given_name, family_name, phone, status (enum),
                   timestamps
idp_links        — user_id FK, provider_id FK, external_sub, external_email, metadata (JSONB),
                   linked_at, last_sync. PK (user_id, provider_id)
roles            — id, name, description, tenant_id FK (NULL = global), timestamps
permissions      — id, name, description, tenant_id FK (NULL = global), timestamps
role_permissions — role_id FK, permission_id FK. PK (role_id, permission_id)
user_tenant_roles — user_id FK, tenant_id FK, role_id FK, assigned_at, assigned_by.
                    PK (user_id, tenant_id, role_id)
```

**Amelia (Dev):** Implementation notes:
- `tenant_id NULL = global` handles Descope's project-level vs tenant-scoped roles
- `user_tenant_roles` 3-way join matches Descope's per-tenant role assignment model
- `provider_configs.config_ref` ties into PRD 1 (Infisical) — credentials never in Postgres
- `idp_links.metadata` JSONB — escape hatch for provider-specific data

**Decision (D22):** 8 tables, SCIM-aligned field names, JSONB metadata escape hatch.

### Round 5: PRD 5 Epic Structure

**John (PM):**

```
PRD 5: Canonical Identity Domain Model

Epic 1: Database Foundation
  - Postgres in Docker Compose (replace SQLite)
  - Alembic setup + initial migration
  - Schema: all 8 tables
  - Seed migration from existing Descope data

Epic 2: Service Layer Extraction
  - IdentityService Postgres-backed implementations
  - Write-through sync: service writes Postgres, then calls DescopeManagementClient
  - Existing API contracts unchanged

Epic 3: Inbound Sync
  - Descope Flow HTTP Connector: call our API on self-service sign-up
  - Audit webhook handler: catch out-of-band Descope changes
  - Periodic reconciliation job (hourly/daily diff + update)
  - Redis pub/sub for cache invalidation events

Epic 4: Multi-IdP Identity Linking
  - IdPLink CRUD operations
  - Internal API: GET /api/internal/identity?sub={sub}&provider={provider}
  - Redis cache for identity lookups (keyed on provider:sub)
  - Link management UI (view/unlink IdP identities)
```

**Bob (SM):** Epic 1 → 2 sequential. Epics 3 and 4 can overlap after Epic 2. Clean.

### Round 6: Revised Complete Plan

```
PHASE 0: Descope Feature Completion (current work)
  Track A: py-identity-model review fixes + OIDC conformance harness
  Track B: identity-stack Waves 1-6
    └── NEW: All waves route through IdentityService class (seam for PRD 5)
  Track C: terraform-provider-descope maintenance
  Track D: Planning hygiene

PHASE 1: Rename (Sprint 0)
  identity-stack → identity-stack

PHASE 2: Canonical DB + Infra (Sprint 1-2)
  PRD 5: Canonical Identity Domain Model (4 epics)
  PRD 1: HCP TF + Infisical (interleaved as palate-cleanser tasks)

PHASE 3: Gateway (Sprint 3)
  PRD 2: Tyk + OpenFeature

PHASE 4: Multi-Provider (Sprint 4)
  PRD 3: node-oidc-provider test fixture + second provider

PHASE 5: Capstone (Sprint 5)
  PRD 4: Multi-IdP Gateway Demo
    - Plugin calls internal identity API
    - IdPLink-based correlation across providers
    - Full demo: multiple IdPs → Tyk → canonical headers → IdP-agnostic backend

BACKLOG:
  I5: Embedded NestJS OIDC server
  SCIM proxy/server capability
  FGA provider abstraction (if needed)
```

**Bob (SM):** Phase-based, not sprint-based. Phases = "done when done."

**Winston (Architect):** By Phase 5, identity-stack has: Postgres with canonical data (PRD 5), secrets managed (PRD 1), Tyk gateway (PRD 2), node-oidc as second issuer (PRD 3). PRD 4 is just the demo layer. Clean capstone.

**Amelia (Dev):** Each phase independently testable. No phase depends on untested work from another.

---

## Idea Organization and Prioritization

### Decisions Register (All Three Sessions)

#### Session 1 (2026-03-28)
| # | Decision | Source |
|---|---|---|
| D1 | Build Descope-specific first, abstract iteratively | Question Storming |
| D2 | OIDC conformance harness is urgent — AI code needs spec validation | Question Storming |
| D3 | All tracks run in parallel | Decision Tree |
| D4 | ReBAC is highest-value abstraction target | Morphological Analysis |
| D5 | Multi-tenancy may never abstract | Morphological Analysis |
| D6 | Viability is discovered, not assumed | Decision Tree |

#### Session 2 (2026-03-29, Session 1)
| # | Decision | Source |
|---|---|---|
| D7 | Repo rename to identity-stack (Sprint 0) | Question Storming |
| D8 | node-oidc-provider v1: in-memory only | Question Storming |
| D9 | Docker Compose profiles: standalone, gateway, full | Question Storming |
| D10 | Finish Descope features before starting toolchain expansion | Party Mode |
| D11 | Sequence sprints by theme (solo developer) | Party Mode |
| D12 | Everything stays in identity-stack repo | Party Mode |
| D13 | PRD 4 (Multi-IdP Demo) is separate from PRD 2 | Party Mode |

#### Session 3 (2026-03-29, Session 2 — this session)
| # | Decision | Source |
|---|---|---|
| D14 | Canonical DB scoped to enterprise identity primitives — users, roles, permissions, tenants, IdP links. Auth state stays with IdP. | Question Storming |
| D15 | FGA proxied, not owned. Don't model relations in Postgres. | Question Storming |
| D16 | Write-through sync for admin ops. No outbox pattern. | Question Storming |
| D17 | Redis pub/sub (Tyk's Redis) for cache invalidation. Periodic reconciliation as safety net. | Question Storming |
| D18 | Descope features complete first, then rename, then Canonical DB | Question Storming |
| D19 | Value-first ordering: Canonical DB before Tyk/infra, not after | Party Mode |
| D20 | Canonical DB is PRD 5 (new PRD, 4 epics), not a reshape of existing PRDs | Party Mode |
| D21 | Descope feature waves add IdentityService seam from Wave 1 (pass-through class, trivial cost) | Party Mode |
| D22 | Schema: 8 tables, SCIM-aligned field names, JSONB metadata escape hatch | Party Mode |
| D23 | PRD 4 plugin calls internal identity API (HTTP), not direct Postgres. Redis-cached. | Party Mode |
| D24 | PRD 4 v1 requires canonical DB for real identity correlation (email heuristic is dev scaffold only) | Party Mode |
| D25 | Phase-based execution, not sprint-based. Phases = "done when done." | Party Mode |
| D26 | PRD 1 (infra) interleaved with PRD 5 as palate-cleanser, not its own phase | Party Mode |

---

## Session Summary

### Techniques Used

1. **Question Storming** — 50 questions across 8 clusters, 6 key decisions, grounded by Descope capabilities research
2. **Morphological Analysis** — 5-dimension matrix (entity ownership, sync paths, initiative dependencies, SCIM alignment, phasing DAG) producing 6 cross-dimensional findings
3. **Party Mode (Multi-Agent Discussion)** — Architectural validation with 4 BMAD agents (Winston, John, Bob, Amelia), 6 rounds covering DAG ordering, PRD placement, plugin architecture, schema design, epic structure, and revised plan

### Key Achievements

- **Canonical schema designed**: 8 tables, SCIM-aligned, FGA/auth-state excluded
- **Sync architecture settled**: write-through + webhook catch-up + Redis pub/sub + reconciliation
- **PRD 5 defined**: Canonical Identity Domain Model with 4 epics
- **IdentityService seam**: low-cost architectural insurance added to Descope feature waves
- **Tyk plugin architecture**: stateless plugin calls internal identity API, Redis-cached
- **5-phase execution plan**: replaces Session 2's sprint-per-theme model with value-first ordering
- **13 new decisions** (D14-D26) extending the register from Sessions 1 and 2

### Facilitator Notes

James's instinct to keep things simple (no outbox, reuse Tyk's Redis, FGA stays proxied) consistently led to better architecture than the more complex options. The "enterprise identity primitives only" scoping constraint kept the canonical schema at 8 tables instead of the 20+ it could have become. The IdentityService seam is the session's highest-leverage decision — trivial cost during Descope waves, massive payoff during PRD 5.
