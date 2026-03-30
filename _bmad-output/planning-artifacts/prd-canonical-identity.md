---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-through-12-accelerated']
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-02.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-01.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28-01.md
  - _bmad-output/planning-artifacts/prd-multi-idp-demo.md
  - _bmad-output/planning-artifacts/prd-api-gateway.md
  - _bmad-output/planning-artifacts/prd-infrastructure-secrets.md
  - _bmad-output/planning-artifacts/prd-multi-provider-test.md
  - docs/index.md
workflowType: 'prd'
classification:
  projectType: 'api_backend'
  domain: 'identity-access-management'
  complexity: 'medium'
  projectContext: 'brownfield-refactor'
  prdStrategy: 'standalone-initiative-prd'
  repoTagging: '[IS] identity-stack'
  qualityTiers:
    identityStack: 'production-grade'
  targetAudiences:
    primary: 'portfolio reviewers + consulting clients'
    secondary: 'developers evaluating identity platform architecture'
dependencies:
  upstream: []
  downstream:
    - 'PRD 4: Multi-IdP Gateway Demo (depends on Epic 4: IdP Linking)'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 3
  projectDocs: 1
  existingPRDs: 4
---

# Product Requirements Document - Canonical Identity Domain Model (PRD 5)

**Author:** James
**Date:** 2026-03-29

## Executive Summary

This PRD defines the requirements for a canonical identity domain model in PostgreSQL, inserted beneath the existing identity-stack (formerly descope-saas-starter) API layer. Today, every identity operation — user management, role assignment, permission CRUD, tenant lifecycle — is a direct proxy call to the Descope Management API. The backend owns no identity data; Descope is simultaneously the runtime auth provider and the sole data store. This creates a hard coupling: switching IdPs, supporting multiple providers, or surviving a Descope API outage requires rewriting every route.

PRD 5 inverts this relationship. The backend owns a canonical store of enterprise identity primitives — users, roles, permissions, tenants, and IdP identity links — in PostgreSQL. IdPs (Descope, Ory, node-oidc-provider, Entra, Cognito) become sync targets: pluggable adapters that receive writes from the canonical store via write-through sync. The existing API contracts are unchanged. The `IdentityService` seam (established during Descope feature waves per Decision D21) is filled with Postgres-backed implementations. `DescopeManagementClient` is demoted from "source of truth" to "first sync adapter."

The schema is 8 tables aligned with SCIM Core User conventions: `users`, `idp_links`, `roles`, `permissions`, `role_permissions`, `user_tenant_roles`, `tenants`, and `provider_configs`. FGA/ReBAC stays proxied to provider engines (Descope FGA, Ory Keto) — relationship evaluation at scale is what those engines are built for. Auth state (passwords, MFA, sessions) stays with the IdP. The canonical model owns only what downstream domain APIs need: who the user is, what they can do, and which IdPs they're linked to.

Sync architecture: write-through for API-originated operations (Postgres first, then IdP sync), Descope Flow HTTP Connector for self-service sign-up, audit webhook handler for out-of-band changes, periodic reconciliation as a safety net, Redis pub/sub (reusing Tyk's Redis) for cache invalidation. No outbox pattern, no event bus — sufficient for solo-developer scale, evolvable when needed.

Epic 4 (Multi-IdP Identity Linking) provides the internal identity API that PRD 4's Tyk claim normalization plugin queries to correlate users across providers. This is the bridge from "single-IdP app" to "multi-IdP platform."

### What Makes This Special

**It insulates all downstream domain APIs from IdP churn.** Most identity integrations treat the IdP as source of truth — every route, every service, every data model is coupled to that provider's API shape. This inverts the relationship: the application owns its identity model in Postgres. The IdP is a runtime service that can be swapped at the gateway level without touching domain logic. When Descope changes pricing, when an enterprise customer mandates Okta, when you add Ory as a second provider — the domain API doesn't know and doesn't care. The sync adapter handles it.

This is not an identity provider. It's an identity *insulation layer*. The 8-table schema is deliberately minimal — enterprise identity primitives only. Everything else (auth flows, FGA evaluation, session management) stays delegated to purpose-built engines. The canonical DB does one thing: guarantee that `GET /api/users/{id}` returns the same shape regardless of which IdP issued the token.

## Project Classification

- **Project Type:** API backend — Postgres-backed identity domain service with REST API and provider sync adapters
- **Domain:** Identity & Access Management
- **Complexity:** Medium — schema is simple (8 tables), sync semantics are nuanced (4 coexisting write paths)
- **Project Context:** Brownfield-refactor — changing data ownership model within existing identity-stack backend. API contracts unchanged, service layer gets Postgres backing, DescopeManagementClient becomes sync adapter.
- **PRD Strategy:** Standalone initiative PRD (PRD 5 of 5 in toolchain expansion plan)
- **Repo Tagging:** `[IS]` identity-stack — all changes in one repo
- **Quality Tier:** Production-grade — foundational data layer that PRD 4 and future SCIM support depend on
- **Target Audience:** Portfolio reviewers and consulting clients (primary), developers evaluating identity platform architecture (secondary)
- **Dependencies:** No upstream dependencies (starts after rename). PRD 4 (Multi-IdP Gateway Demo) depends downstream on Epic 4.

## Success Criteria

### User Success

- **Admin users** can manage users, roles, permissions, and tenants through the existing API endpoints with no behavior change — the Postgres backing is invisible to them
- **Developers** consuming the API get consistent response shapes regardless of which IdP is active behind the sync layer
- **The identity-stack operator** (James, or a future team) can add a new IdP sync adapter by implementing a provider interface — no router, middleware, or schema changes required

### Business Success

- **Portfolio credibility:** The canonical identity model demonstrates enterprise-grade architectural thinking — data ownership, provider independence, SCIM-aligned schema design
- **Consulting value:** A client can see the architecture and understand how to apply the same pattern to decouple their identity layer from their IdP vendor
- **PRD 4 enablement:** The Multi-IdP Gateway Demo (capstone) can query the internal identity API to correlate users across providers — proving the architecture isn't theoretical

### Technical Success

- All existing API integration tests pass against Postgres without modification (same contracts, new backing store)
- Write-through sync to Descope succeeds on all CRUD operations with < 500ms added latency per operation
- Descope sync failure does not block or roll back the canonical Postgres write
- Periodic reconciliation job detects and resolves drift between canonical store and Descope within one reconciliation cycle
- Seed migration imports all existing Descope users, roles, permissions, and tenants into canonical tables with zero data loss
- Alembic migrations support both upgrade and downgrade for every schema change

### Measurable Outcomes

- 8 canonical tables created with Alembic migrations, FK constraints enforced
- `IdentityService` implementations for all existing CRUD operations (users, roles, permissions, tenants, access keys)
- Internal identity API (`GET /api/internal/identity`) returns canonical user data with < 50ms p95 from Redis cache
- Provider swap test: Descope sync adapter can be disabled, and all read operations continue to work from Postgres alone

## Product Scope

### MVP — Minimum Viable Product

**Epic 1: Database Foundation**
- Postgres service in Docker Compose (replaces SQLite default)
- Alembic setup with initial migration (including existing Document + TenantResource tables)
- All 8 canonical schema tables created
- Seed migration: pull current Descope state → populate canonical tables
- `testcontainers-python` for integration tests against real Postgres

**Epic 2: Service Layer Extraction**
- `IdentityService` Postgres-backed implementations for user, role, permission, tenant CRUD
- Write-through sync: Postgres first, then DescopeManagementClient (log failures, don't roll back)
- All existing API contracts unchanged — routers inject `IdentityService`, not `DescopeManagementClient`

**Epic 3: Inbound Sync**
- Descope Flow HTTP Connector: call our API on self-service sign-up to create canonical record
- Audit webhook handler: catch out-of-band Descope changes (role/permission/user modifications)
- Periodic reconciliation job (configurable interval, default hourly)
- Redis pub/sub events on canonical writes for cache invalidation

**Epic 4: Multi-IdP Identity Linking**
- `idp_links` and `provider_configs` table CRUD operations
- Internal API: `GET /api/internal/identity?sub={sub}&provider={provider}`
- Redis cache for identity lookups (keyed on `provider:sub`, TTL matches JWT TTL)
- Link management API (view/create/delete IdP links for a canonical user)

### Growth Features (Post-MVP)

- SCIM 2.0 server endpoint: receive provisioning from Okta/Entra, persist canonically, forward to active IdP
- Second sync adapter (Ory) validating the provider interface
- Bulk import/export for canonical identity data
- Admin UI for identity linking (view linked IdPs per user, manual link/unlink)
- Sync health dashboard (last sync time, failure count, drift detected)

### Vision (Future)

- Full SCIM proxy: enterprise IdP → our SCIM server → canonical DB → any downstream IdP
- Provider capability discovery: `provider.supports("fga")`, `provider.supports("scim")`
- Automatic identity correlation: detect same-email across IdPs and suggest links
- Event-driven sync via outbox pattern if write volume outgrows write-through
- Identity federation graph: visualize how users, providers, and tenants relate across the platform

## User Journeys

### Journey 1: Admin Manages Roles (Happy Path)

**Sarah, a SaaS platform admin**, needs to add a new "billing-admin" role with specific permissions. She opens the admin panel, creates the role, maps permissions, and assigns it to two team members. The API writes to Postgres, syncs to Descope, and the next time those users refresh their session, their JWTs include the new role. Sarah doesn't know or care that Descope exists — she interacts with the canonical API.

**Capabilities revealed:** Role CRUD, permission CRUD, role-permission mapping, user-role assignment, write-through sync, JWT claim propagation.

### Journey 2: Self-Service Sign-Up (Descope Flow → Canonical DB)

**Marcus signs up** via Descope's hosted login. The Descope Flow's HTTP Connector calls `POST /api/internal/users/sync` with Marcus's profile data. The canonical DB creates a user record and an `idp_link` entry (`provider: descope, sub: descope-abc-123`). Marcus is now a canonical user linked to his Descope identity. If Marcus later authenticates via a second IdP, a second `idp_link` is created for the same canonical user.

**Capabilities revealed:** Inbound sync from Descope flows, IdP link creation, user provisioning from external event, multi-link identity model.

### Journey 3: Platform Operator Adds a Second IdP

**James (the operator)** wants to add Ory as a second provider for a demo. He creates a `provider_config` entry (type: ory, base_url, issuer_url, capabilities). He registers the Ory issuer in Tyk's multi-provider OIDC config. A user logging in via Ory gets their token validated by Tyk, the claim normalization plugin calls `GET /api/internal/identity?sub=ory-xyz&provider=ory`. If no canonical user exists, a provisional record is created. If one exists (matched by email), the IdP link is added.

**Capabilities revealed:** Provider config management, internal identity API, identity correlation, provisional user creation, multi-IdP support.

### Journey 4: Reconciliation Catches Drift

**An intern edits a role** directly in the Descope console, bypassing the canonical API. The audit webhook fires (throttled). Hours later, the periodic reconciliation job runs, diffs Descope's current state against Postgres, detects the role name change, and updates the canonical record. An event is published to Redis pub/sub. The admin dashboard (if built) shows "1 drift event reconciled."

**Capabilities revealed:** Audit webhook handler, periodic reconciliation, drift detection, Redis pub/sub events, out-of-band change handling.

### Journey 5: Developer Integrates with the Identity API

**A developer building a new microservice** needs user data. They call `GET /api/users/{id}` and get a consistent user object with roles, permissions, tenant memberships, and linked IdPs. They don't import any IdP SDK. They don't configure Descope credentials. The identity API is their contract — the IdP behind it is invisible.

**Capabilities revealed:** Stable API contract, IdP-agnostic response shape, developer experience, downstream service insulation.

### Journey Requirements Summary

| Capability Area | Journeys |
|---|---|
| User CRUD + profile management | J1, J2, J3, J5 |
| Role/permission definition CRUD | J1 |
| Role assignment (per-tenant) | J1 |
| Write-through sync to IdP | J1, J3 |
| Inbound sync (Flow HTTP Connector) | J2 |
| IdP link management | J2, J3 |
| Provider config management | J3 |
| Internal identity API | J3, J5 |
| Audit webhook handler | J4 |
| Periodic reconciliation | J4 |
| Redis pub/sub events | J1, J4 |
| Drift detection + resolution | J4 |

## Domain-Specific Requirements

### Identity & Access Management Constraints

- **SCIM alignment:** Canonical user fields aligned with SCIM Core User schema (`userName`, `givenName`, `familyName`, `emails`, `active`, `externalId`) to enable future SCIM server capability without schema migration
- **Multi-tenancy:** Role assignments are per-tenant (`user_tenant_roles` triple: user + tenant + role). Global roles use `tenant_id = NULL`. This matches Descope's model and maps to enterprise B2B patterns.
- **IdP link uniqueness:** One canonical user can have at most one link per provider (`PK: user_id, provider_id`). A single IdP identity cannot be linked to multiple canonical users.
- **Credential isolation:** The canonical DB never stores passwords, MFA state, session tokens, or signing keys. These stay with the IdP. The `provider_configs.config_ref` field points to Infisical for IdP credentials — never stored in Postgres.

### Sync Integrity

- **Write ordering:** Postgres writes first, IdP sync second. Canonical DB is always at least as current as the IdP.
- **Failure isolation:** IdP sync failure does not roll back the Postgres transaction. Failed syncs are logged for reconciliation.
- **Reconciliation idempotency:** The reconciliation job must be safe to run multiple times — no duplicate records, no lost updates.
- **Eventual consistency window:** Acceptable for RBAC (JWTs already have 10-30 min TTL). FGA is proxied and unaffected.

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| Descope API outage blocks all writes | Postgres-first write ordering. API continues to function for reads. Sync catches up when Descope recovers. |
| Schema drift between canonical DB and IdP | Periodic reconciliation job detects and resolves. Redis pub/sub notifies on drift events. |
| Data loss during seed migration | Seed migration is idempotent and auditable. Dry-run mode before live import. |
| IdP link collision (same email, different people) | Link creation requires explicit action, not automatic email matching (except in operator-controlled contexts). |

## Functional Requirements

### User Management

- FR1: Admins can create, read, update, and deactivate canonical user records
- FR2: The system can create a canonical user from an inbound IdP event (Descope Flow HTTP Connector)
- FR3: Admins can search and filter users by email, name, status, tenant, or linked provider
- FR4: The system maintains `created_at`, `updated_at` timestamps on all user mutations

### Role & Permission Management

- FR5: Admins can create, read, update, and delete role definitions (global or tenant-scoped)
- FR6: Admins can create, read, update, and delete permission definitions (global or tenant-scoped)
- FR7: Admins can map permissions to roles (many-to-many)
- FR8: Admins can assign and remove roles from users within a specific tenant context
- FR9: The system records who assigned each role and when (`assigned_by`, `assigned_at`)

### Tenant Management

- FR10: Admins can create, read, update, and delete tenant records
- FR11: Admins can manage tenant domains (self-provisioning domain list)
- FR12: Admins can view all users and their roles within a specific tenant

### IdP Link Management

- FR13: The system can create an IdP link associating a canonical user with an external provider identity (`provider_id`, `external_sub`, `external_email`)
- FR14: Admins can view all IdP links for a given user
- FR15: Admins can delete an IdP link (unlink a provider identity from a canonical user)
- FR16: The system stores provider-specific metadata on each link (JSONB)

### Provider Configuration

- FR17: Operators can register a new identity provider (type, base_url, issuer_url, capabilities, credential reference)
- FR18: Operators can activate or deactivate a provider configuration
- FR19: The system exposes provider capabilities (`rbac`, `fga`, `scim`) for downstream decision-making

### Identity Resolution (Internal API)

- FR20: The internal API can resolve a canonical user from an IdP-specific subject and provider identifier
- FR21: The internal API returns canonical user data including roles, permissions, tenant memberships, and linked IdPs
- FR22: The system caches identity resolution results in Redis with configurable TTL

### Write-Through Sync

- FR23: All canonical CRUD operations synchronously sync to the active IdP via the appropriate sync adapter
- FR24: Sync adapter failures are logged with sufficient detail for reconciliation (operation, payload, error, timestamp)
- FR25: The Descope sync adapter maps canonical operations to Descope Management API calls

### Inbound Sync & Reconciliation

- FR26: The system receives and processes Descope audit webhook events (user created, modified, deleted; role/permission changes)
- FR27: The Descope Flow HTTP Connector can call the system to create/update a canonical user during sign-up
- FR28: A periodic reconciliation job diffs canonical state against Descope state and resolves drift
- FR29: The system publishes cache invalidation events to Redis pub/sub on canonical data changes

### Database & Migration

- FR30: All schema changes are managed via Alembic migrations with upgrade and downgrade support
- FR31: A seed migration can import existing Descope users, roles, permissions, and tenants into canonical tables
- FR32: The system uses Postgres as the primary database (replacing SQLite)

## Non-Functional Requirements

### Performance

- NFR1: API response times for canonical CRUD operations < 100ms p95 (excluding sync latency)
- NFR2: Write-through sync adds < 500ms per operation (Descope Management API round-trip)
- NFR3: Internal identity API returns cached results in < 50ms p95
- NFR4: Reconciliation job completes a full diff of up to 10,000 users in < 60 seconds

### Security

- NFR5: IdP credentials are never stored in Postgres — referenced via Infisical path in `provider_configs.config_ref`
- NFR6: Internal identity API (`/api/internal/*`) is not exposed to external clients — accessible only from Tyk plugin or internal services
- NFR7: All Postgres connections use TLS in non-development environments
- NFR8: Audit webhook endpoints validate HMAC signatures when configured

### Reliability

- NFR9: Descope API outage does not prevent canonical DB reads or writes — only sync is affected
- NFR10: Reconciliation job is idempotent — safe to run concurrently or repeatedly without side effects
- NFR11: Failed sync operations are retried during the next reconciliation cycle

### Testing

- NFR12: Integration tests run against real Postgres via `testcontainers-python` — no SQLite test fallback
- NFR13: Write-through sync tests use mocked IdP adapters to verify canonical DB writes independently of IdP availability
- NFR14: Reconciliation tests use fixture data to verify drift detection and resolution

### Maintainability

- NFR15: Each sync adapter implements a common `IdentityProviderAdapter` interface — adding a new provider means adding one module
- NFR16: Alembic migrations are the sole mechanism for schema changes — no `create_all()` in production code paths
- NFR17: SQLModel ORM for all identity tables (consistency with existing Document/TenantResource models)
- NFR18: Service layer methods return `Result[T, E]` types (via `expression` library) — `Ok(value)` for success, `Error(err)` for failure. No exception-driven control flow between layers. Routers map `Result` to HTTP responses; service layer maps `Result` from sync adapters. This makes error paths explicit, composable, and testable.

## Epic Summary

| Epic | Scope | Dependencies |
|---|---|---|
| **Epic 1: Database Foundation** | Postgres in Docker Compose, Alembic setup, 8-table schema, seed migration from Descope, testcontainers-python | None |
| **Epic 2: Service Layer Extraction** | IdentityService Postgres-backed implementations, write-through sync via DescopeManagementClient, existing API contracts unchanged | Epic 1 |
| **Epic 3: Inbound Sync** | Descope Flow HTTP Connector, audit webhook handler, periodic reconciliation job, Redis pub/sub | Epic 2 |
| **Epic 4: Multi-IdP Identity Linking** | IdPLink + ProviderConfig CRUD, internal identity API, Redis cache, link management API | Epic 2 (Epic 3 optional) |

### Epic Dependency Graph

```
Epic 1 (Database Foundation)
  │
  ▼
Epic 2 (Service Layer Extraction)
  │
  ├──────────────┐
  ▼              ▼
Epic 3         Epic 4
(Inbound Sync) (IdP Linking)
               │
               ▼
         PRD 4 (Multi-IdP
         Gateway Demo)
```

## Architectural Decision Records

### ADR-1: Postgres-First Write Ordering

**Decision:** All canonical writes commit to Postgres first. IdP sync happens after the Postgres transaction commits.

**Rationale:** The canonical DB is the source of truth. If Postgres succeeds and the IdP sync fails, the canonical state is correct and the IdP catches up via reconciliation. The reverse (IdP succeeds, Postgres fails) would leave the canonical store stale with no automated recovery.

**Consequences:** Brief inconsistency window between canonical DB and IdP on sync failure. Mitigated by reconciliation job.

### ADR-2: FGA Proxied, Not Owned

**Decision:** FGA/ReBAC relationships stay in provider engines (Descope FGA, Ory Keto). The canonical DB does not store relation tuples or evaluate authorization checks.

**Rationale:** FGA engines are purpose-built for graph evaluation at scale (Zanzibar architecture). Reimplementing this in Postgres would be inferior and unnecessary. The canonical DB owns identity and RBAC; FGA is an orthogonal concern with its own optimized runtime.

**Consequences:** FGA operations remain provider-specific. If the FGA provider changes, the FGA integration layer needs updating (but this is isolated from the canonical identity model).

### ADR-3: SCIM-Aligned Field Names

**Decision:** Canonical user fields use SCIM Core User naming conventions (`user_name`, `given_name`, `family_name`, `active` derived from `status`).

**Rationale:** Zero-cost alignment. When SCIM server capability is added later (Growth scope), the schema maps cleanly without migration. SCIM is the standard wire format for enterprise user provisioning (Okta, Entra, Ping).

**Consequences:** Field names may feel slightly non-Pythonic (`user_name` vs `username`). SQLModel column aliases can bridge the gap if needed.

### ADR-4: SQLModel for Identity Tables

**Decision:** Use SQLModel (not raw SQLAlchemy) for all 8 identity tables.

**Rationale:** Consistency with existing `Document` and `TenantResource` models. SQLModel provides Pydantic validation on the model layer, reducing boilerplate for request/response serialization. The identity tables are straightforward CRUD — SQLModel's relationship handling is sufficient.

**Consequences:** If complex query patterns emerge (recursive CTEs, window functions), raw SQLAlchemy can be used for specific queries while keeping SQLModel for the ORM layer.

### ADR-5: Redis for Cache + Pub/Sub (No Dedicated Message Broker)

**Decision:** Reuse Tyk's Redis instance for identity cache and pub/sub events. No dedicated message broker (RabbitMQ, Kafka, SQS).

**Rationale:** Redis is already in the Docker Compose stack for Tyk. Pub/sub is fire-and-forget (acceptable — reconciliation is the durability guarantee). Solo-developer scale doesn't justify a separate broker.

**Consequences:** Pub/sub messages are lost if no subscriber is listening. This is acceptable because the periodic reconciliation job is the durability safety net, and Redis pub/sub is used only for cache invalidation (performance optimization, not correctness).

### ADR-6: Result Types via Expression Library for Inter-Layer Error Handling

**Decision:** Use the `expression` library (`dbrattli/Expression`) for `Result[T, E]` return types between service, sync adapter, and router layers. Service methods return `Ok(value)` or `Error(err)` instead of raising exceptions.

**Rationale:** Railway-oriented programming makes error paths explicit and composable. The service layer has multiple failure modes (Postgres write failure, sync adapter failure, validation error, not found) — encoding these as typed `Result` values instead of exceptions makes error handling:
- **Explicit:** Callers must handle both `Ok` and `Error` — no silent exception propagation
- **Composable:** `Result` chains via `bind`/`map` or generator-based `@effect.result` decorator — sync adapter errors compose naturally with service logic
- **Testable:** Asserting `isinstance(result, Ok)` is cleaner than `pytest.raises`
- **Async-compatible:** `AsyncResult[T, E]` and `@effect.async_result` integrate with FastAPI's async handlers

Pattern: Routers map `Result` to HTTP responses (`Ok → 200/201`, `Error(NotFound) → 404`, `Error(SyncFailed) → 202 with warning`). Service layer maps `Result` from sync adapters into domain-level results. Sync adapters return `Result` from IdP API calls.

**Consequences:** New dependency (`expression` in `pyproject.toml`). Team members need familiarity with `Result`/`Ok`/`Error` pattern. This is a deliberate style choice — not every function needs `Result`, only inter-layer boundaries. Internal helper functions can use plain returns or exceptions where appropriate.

