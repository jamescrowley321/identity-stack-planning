---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - _bmad-output/planning-artifacts/prd-canonical-identity.md
  - _bmad-output/planning-artifacts/architecture-canonical-identity.md
---

# Canonical Identity Domain Model - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Canonical Identity Domain Model (PRD 5), decomposing the requirements from the PRD and Architecture into implementable stories. This is an API backend refactor — no UX design document applies (frontend unchanged per D17).

## Requirements Inventory

### Functional Requirements

FR1: Admins can create, read, update, and deactivate canonical user records
FR2: The system can create a canonical user from an inbound IdP event (Descope Flow HTTP Connector)
FR3: Admins can search and filter users by email, name, status, tenant, or linked provider
FR4: The system maintains `created_at`, `updated_at` timestamps on all user mutations
FR5: Admins can create, read, update, and delete role definitions (global or tenant-scoped)
FR6: Admins can create, read, update, and delete permission definitions (global or tenant-scoped)
FR7: Admins can map permissions to roles (many-to-many)
FR8: Admins can assign and remove roles from users within a specific tenant context
FR9: The system records who assigned each role and when (`assigned_by`, `assigned_at`)
FR10: Admins can create, read, update, and delete tenant records
FR11: Admins can manage tenant domains (self-provisioning domain list)
FR12: Admins can view all users and their roles within a specific tenant
FR13: The system can create an IdP link associating a canonical user with an external provider identity (`provider_id`, `external_sub`, `external_email`)
FR14: Admins can view all IdP links for a given user
FR15: Admins can delete an IdP link (unlink a provider identity from a canonical user)
FR16: The system stores provider-specific metadata on each link (JSONB)
FR17: Operators can register a new identity provider (type, base_url, issuer_url, capabilities, credential reference)
FR18: Operators can activate or deactivate a provider configuration
FR19: The system exposes provider capabilities (`rbac`, `fga`, `scim`) for downstream decision-making
FR20: The internal API can resolve a canonical user from an IdP-specific subject and provider identifier
FR21: The internal API returns canonical user data including roles, permissions, tenant memberships, and linked IdPs
FR22: The system caches identity resolution results in Redis with configurable TTL
FR23: All canonical CRUD operations synchronously sync to the active IdP via the appropriate sync adapter
FR24: Sync adapter failures are logged with sufficient detail for reconciliation (operation, payload, error, timestamp)
FR25: The Descope sync adapter maps canonical operations to Descope Management API calls
FR26: The system receives and processes Descope audit webhook events (user created, modified, deleted; role/permission changes)
FR27: The Descope Flow HTTP Connector can call the system to create/update a canonical user during sign-up
FR28: A periodic reconciliation job diffs canonical state against Descope state and resolves drift
FR29: The system publishes cache invalidation events to Redis pub/sub on canonical data changes
FR30: All schema changes are managed via Alembic migrations with upgrade and downgrade support
FR31: A seed migration can import existing Descope users, roles, permissions, and tenants into canonical tables
FR32: The system uses Postgres as the primary database (replacing SQLite)

### NonFunctional Requirements

NFR1: API response times for canonical CRUD operations < 100ms p95 (excluding sync latency)
NFR2: Write-through sync adds < 500ms per operation (Descope Management API round-trip)
NFR3: Internal identity API returns cached results in < 50ms p95
NFR4: Reconciliation job completes a full diff of up to 10,000 users in < 60 seconds
NFR5: IdP credentials are never stored in Postgres — referenced via Infisical path in `provider_configs.config_ref`
NFR6: Internal identity API (`/api/internal/*`) is not exposed to external clients — accessible only from Tyk plugin or internal services
NFR7: All Postgres connections use TLS in non-development environments
NFR8: Audit webhook endpoints validate HMAC signatures when configured
NFR9: Descope API outage does not prevent canonical DB reads or writes — only sync is affected
NFR10: Reconciliation job is idempotent — safe to run concurrently or repeatedly without side effects
NFR11: Failed sync operations are retried during the next reconciliation cycle
NFR12: Integration tests run against real Postgres via `testcontainers-python` — no SQLite test fallback
NFR13: Write-through sync tests use mocked IdP adapters to verify canonical DB writes independently of IdP availability
NFR14: Reconciliation tests use fixture data to verify drift detection and resolution
NFR15: Each sync adapter implements a common `IdentityProviderAdapter` interface — adding a new provider means adding one module
NFR16: Alembic migrations are the sole mechanism for schema changes — no `create_all()` in production code paths
NFR17: SQLModel ORM for all identity tables (consistency with existing Document/TenantResource models)
NFR18: Service layer methods return `Result[T, E]` types (via `expression` library) — no exception-driven control flow between layers

### Additional Requirements

- D1: PostgreSQL 16 replaces SQLite as primary database
- D2: SQLModel + Alembic with async-only env.py — no sync engine anywhere
- D3: `create_async_engine` + `AsyncSession` everywhere — asyncpg driver, no sync fallback
- D4: ABCs with constructor injection — `IdentityService` (ABC), `IdentityProviderAdapter` (ABC), no generics
- D5: `Result[T, E]` via `expression` library + RFC 9457 Problem Details — from day one
- D6: OTel auto-instrumentation (FastAPI, httpx, SQLAlchemy) + Aspire Dashboard — before service layer
- D7: Write-through sync (Postgres first, IdP second) — `SyncFailed` logged, not rolled back
- D8: Repository-level tenant isolation — every query method takes `tenant_id`, no Postgres RLS
- D9: Redis 7 for identity lookups + pub/sub — standalone in Docker Compose
- D10: testcontainers-python with real Postgres — no SQLite test fallback, NoOpSyncAdapter
- D11: FGA/access keys proxied to provider — not routed through IdentityService (ADR-2)
- D12: OTel `traceparent` replaces `X-Correlation-ID` — CorrelationIdMiddleware removed
- D13: SCIM Core User field names for canonical user table
- Docker Compose additions: postgres:16-alpine, aspire-dashboard:9.0, redis:7-alpine
- Pre-commit gates: ruff lint+format, pyrefly typecheck, 80% coverage minimum
- 11 enforcement guidelines for AI agents
- IdentityError hierarchy: NotFound, Conflict, ValidationError, SyncFailed, ProviderError, Forbidden
- RFC 9457 Problem Detail format with traceId extension field

### UX Design Requirements

N/A — API backend refactor. Frontend unchanged (D17).

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 2 | User CRUD |
| FR2 | Epic 3 | Inbound user provisioning from IdP event |
| FR3 | Epic 2 | User search/filter |
| FR4 | Epic 2 | Audit timestamps |
| FR5 | Epic 2 | Role definition CRUD |
| FR6 | Epic 2 | Permission definition CRUD |
| FR7 | Epic 2 | Role-permission mapping |
| FR8 | Epic 2 | Per-tenant role assignment |
| FR9 | Epic 2 | Role assignment audit trail |
| FR10 | Epic 2 | Tenant CRUD |
| FR11 | Epic 2 | Tenant domain management |
| FR12 | Epic 2 | Tenant user/role visibility |
| FR13 | Epic 4 | IdP link creation |
| FR14 | Epic 4 | View IdP links |
| FR15 | Epic 4 | Delete IdP link |
| FR16 | Epic 4 | Provider-specific metadata |
| FR17 | Epic 4 | Register identity provider |
| FR18 | Epic 4 | Activate/deactivate provider |
| FR19 | Epic 4 | Provider capability exposure |
| FR20 | Epic 4 | Identity resolution from IdP subject |
| FR21 | Epic 4 | Canonical user with full context |
| FR22 | Epic 4 | Redis-cached identity resolution |
| FR23 | Epic 2 | Write-through sync to IdP |
| FR24 | Epic 2 | Sync failure logging |
| FR25 | Epic 2 | Descope sync adapter |
| FR26 | Epic 3 | Audit webhook handler |
| FR27 | Epic 3 | Flow HTTP Connector |
| FR28 | Epic 3 | Periodic reconciliation |
| FR29 | Epic 3 | Redis pub/sub events |
| FR30 | Epic 1 | Alembic migrations |
| FR31 | Epic 1 | Seed migration from Descope |
| FR32 | Epic 1 | Postgres as primary database |

## Epic List

### Epic 1: Canonical Identity Foundation
Operators get a production-grade Postgres-backed identity store with proper migrations, observability, standardized error handling, and service interfaces — establishing the canonical infrastructure that all subsequent features build on. Existing API continues working unchanged.
**FRs covered:** FR30, FR31, FR32
**Dependencies:** None

### Epic 2: Identity & Access Administration
Admins manage users, roles, permissions, and tenants through unchanged API contracts — now backed by the canonical Postgres store with automatic write-through sync to Descope. The system remains functional during IdP outages. FGA and access key routes continue working via DescopeManagementClient.
**FRs covered:** FR1, FR3-12, FR23-25
**Dependencies:** Epic 1

### Epic 3: Inbound Sync & Reconciliation
Self-service sign-ups via Descope automatically create canonical records. Out-of-band changes in Descope are detected and reconciled. Caches stay fresh via Redis pub/sub events.
**FRs covered:** FR2, FR26-29
**Dependencies:** Epic 2

### Epic 4: Multi-IdP Identity Linking
Operators can register multiple identity providers. Users can have linked identities across providers. Internal services resolve canonical users from any provider's token — enabling PRD 4 (Multi-IdP Gateway Demo).
**FRs covered:** FR13-22
**Dependencies:** Epic 2 (Epic 3 optional)

---

## Epic 1: Canonical Identity Foundation

Establish the Postgres-backed canonical identity store with async engine, Alembic migrations, OTel observability, RFC 9457 error handling, service interfaces, and test infrastructure. The existing API continues working unchanged throughout.

### Story 1.1: Docker Compose Services + Postgres Async Engine

As a system operator,
I want Postgres, Aspire Dashboard, and Redis services in Docker Compose with an async database engine,
So that the canonical identity store has production-grade infrastructure from day one.

**Acceptance Criteria:**

**Given** the existing docker-compose.yml
**When** I run `docker compose up`
**Then** postgres:16-alpine starts on port 5432 with database `identity`, user `identity`, password from `POSTGRES_PASSWORD` env var (default: `dev`), and a named volume `pgdata`
**And** aspire-dashboard:9.0 starts with OTLP on port 4317→18889 and UI on port 18888, with `DASHBOARD__OTLP__AUTHMODE=Unsecured`
**And** redis:7-alpine starts on port 6379

**Given** the backend application
**When** the app starts
**Then** `create_async_engine` is called with `DATABASE_URL` (default: `postgresql+asyncpg://identity:dev@postgres:5432/identity`)
**And** `async_sessionmaker` is configured with `expire_on_commit=False`
**And** the engine is available for dependency injection
**And** no sync engine or sync Session exists anywhere in the codebase

**Given** pyproject.toml
**When** dependencies are installed
**Then** `asyncpg`, `alembic`, `expression`, `sqlalchemy[asyncio]` are in the dependency list
**And** `testcontainers[postgres]` is in the dev/test dependency group

**Given** .env.example
**When** a developer reads it
**Then** `DATABASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `REDIS_URL` are documented with default values

### Story 1.2: Alembic Setup + Canonical Schema Migration

As a system operator,
I want Alembic-managed database migrations with all 8 canonical identity tables,
So that the schema is versioned, reproducible, and supports both upgrade and downgrade.

**Acceptance Criteria:**

**Given** the backend directory
**When** Alembic is initialized
**Then** `backend/migrations/env.py` uses async-only configuration (`run_async` with `connectable.connect()`)
**And** `backend/migrations/alembic.ini` points to the correct DATABASE_URL
**And** no sync engine is used in env.py

**Given** existing Document and TenantResource tables
**When** the baseline migration runs
**Then** existing tables are brought under Alembic control via `alembic stamp head` or an initial migration that creates them
**And** existing data is preserved

**Given** the canonical schema migration
**When** `alembic upgrade head` runs
**Then** 8 tables are created: `users`, `tenants`, `roles`, `permissions`, `role_permissions`, `user_tenant_roles`, `idp_links`, `providers`
**And** all FK constraints are enforced
**And** indexes exist on: `ix_users_email`, `ix_idp_links_external_sub`, `ix_user_tenant_roles_user_tenant`
**And** unique constraints exist on: `uq_idp_links_user_provider`, `uq_users_email`, `uq_roles_name_tenant`
**And** all primary keys are UUID type generated via `uuid4`

**Given** SQLModel models in `backend/app/models/identity/`
**When** I inspect the models
**Then** `user.py` has User (SCIM-aligned: `email`, `user_name`, `given_name`, `family_name`, `status`, `created_at`, `updated_at`) and IdPLink
**And** `tenant.py` has Tenant (canonical, distinct from existing TenantResource) with `name`, `domains`, `status`, `created_at`, `updated_at`
**And** `role.py` has Role (`name`, `description`, `tenant_id` nullable for global), Permission, RolePermission
**And** `assignment.py` has UserTenantRole (`user_id`, `tenant_id`, `role_id`, `assigned_by`, `assigned_at`)
**And** `provider.py` has Provider (`name`, `type`, `issuer_url`, `base_url`, `capabilities`, `config_ref`, `active`)

**Given** the migration
**When** `alembic downgrade -1` runs
**Then** all 8 canonical tables are dropped cleanly

### Story 1.3: Error Model, Result Types + RFC 9457

As a developer,
I want a standardized error handling system with Result types and RFC 9457 Problem Details,
So that all error paths are explicit, composable, and produce consistent HTTP responses with trace correlation.

**Acceptance Criteria:**

**Given** `backend/app/errors/identity.py`
**When** I inspect the error hierarchy
**Then** `IdentityError` is the base class
**And** subclasses exist: `NotFound`, `Conflict`, `ValidationError`, `SyncFailed`, `ProviderError`, `Forbidden`
**And** each error carries a message and optional context data
**And** `SyncFailed` includes the operation, payload summary, and underlying error

**Given** `backend/app/errors/problem_detail.py`
**When** I inspect the response model
**Then** `ProblemDetailResponse` follows RFC 9457 with fields: `type` (URI), `title`, `status`, `detail`, `instance` (request path), `traceId` (OTel trace ID)
**And** content type is `application/problem+json`

**Given** the error type URI registry
**When** mapping errors to responses
**Then** `NotFound` → `/errors/not-found` (404), `Conflict` → `/errors/conflict` (409), `ValidationError` → `/errors/validation` (422), `SyncFailed` → `/errors/sync-failed` (202), `ProviderError` → `/errors/provider-error` (502), `Forbidden` → `/errors/forbidden` (403)

**Given** `result_to_response()` helper
**When** called with `Ok(value)` and `status=201`
**Then** it returns a JSON response with status 201 and the serialized value
**When** called with `Error(NotFound(...))`
**Then** it returns a ProblemDetailResponse with status 404 and RFC 9457 body
**When** called with `Error(SyncFailed(...))`
**Then** it returns a ProblemDetailResponse with status 202 (Postgres succeeded, sync pending)

**Given** the `expression` library
**When** added to pyproject.toml
**Then** `Result`, `Ok`, `Error` are importable from `expression`
**And** service method signatures use `Result[T, IdentityError]`

### Story 1.4: OTel Instrumentation + Aspire Dashboard

As a system operator,
I want OpenTelemetry observability with trace visualization in Aspire Dashboard,
So that I can trace requests through the full write-through path and correlate errors to specific operations.

**Acceptance Criteria:**

**Given** `backend/app/telemetry.py`
**When** the module is initialized during app startup (before request handling)
**Then** OTel SDK is configured with `OTEL_SERVICE_NAME` (default: `identity-stack`)
**And** OTLP exporter sends to `OTEL_EXPORTER_OTLP_ENDPOINT` (default: `http://aspire-dashboard:18889`)
**And** FastAPI auto-instrumentor is registered (traces all HTTP routes)
**And** httpx auto-instrumentor is registered (traces Descope Management API calls)
**And** SQLAlchemy auto-instrumentor is registered with the async engine (traces Postgres queries)

**Given** the existing CorrelationIdMiddleware
**When** OTel is active
**Then** CorrelationIdMiddleware is removed from the middleware stack
**And** W3C `traceparent` header is used for distributed tracing (standard, replaces custom `X-Correlation-ID`)
**And** existing tests that reference `X-Correlation-ID` are updated or removed

**Given** RFC 9457 ProblemDetailResponse
**When** an error response is generated
**Then** the `traceId` field contains the current OTel trace ID
**And** the trace ID correlates to the full request trace in Aspire Dashboard

**Given** OTel is disabled (no OTLP endpoint configured)
**When** the app starts
**Then** telemetry initialization is skipped gracefully (no crash)
**And** the app functions normally without OTel

### Story 1.5: Service Interfaces + Test Infrastructure

As a developer,
I want IdentityService and IdentityProviderAdapter ABCs with test fixtures,
So that service implementations and sync adapters can be developed and tested independently.

**Acceptance Criteria:**

**Given** `backend/app/services/identity.py`
**When** I inspect the ABC
**Then** `IdentityService` defines abstract async methods for: `create_user`, `get_user`, `update_user`, `deactivate_user`, `search_users`, `create_role`, `get_role`, `update_role`, `delete_role`, `create_permission`, `get_permission`, `update_permission`, `delete_permission`, `map_permission_to_role`, `unmap_permission_from_role`, `create_tenant`, `get_tenant`, `update_tenant`, `delete_tenant`, `assign_role_to_user`, `remove_role_from_user`, `get_tenant_users_with_roles`
**And** all methods return `Result[T, IdentityError]`
**And** all tenant-scoped methods take `tenant_id: UUID` as explicit parameter

**Given** `backend/app/services/adapters/base.py`
**When** I inspect the ABC
**Then** `IdentityProviderAdapter` defines abstract async methods for: `sync_user`, `sync_role`, `sync_permission`, `sync_tenant`, `sync_role_assignment`, `delete_user`, `delete_role`, `delete_permission`, `delete_tenant`
**And** all methods return `Result[None, SyncError]`

**Given** `backend/app/services/adapters/noop.py`
**When** NoOpSyncAdapter is used
**Then** all methods return `Ok(None)` immediately
**And** no external calls are made

**Given** `backend/app/dependencies/identity.py`
**When** `get_identity_service()` is called via FastAPI Depends
**Then** it returns a configured IdentityService implementation with the appropriate adapter
**And** the AsyncSession is injected from the request scope

**Given** `backend/tests/integration/conftest.py`
**When** integration tests run
**Then** a real Postgres instance is started via `testcontainers-python`
**And** Alembic migrations run against the test database
**And** each test gets a clean database state
**And** NoOpSyncAdapter is used (isolates canonical logic from IdP)

### Story 1.6: Seed Migration

As a system operator,
I want to import existing Descope users, roles, permissions, and tenants into canonical tables,
So that the canonical store starts with all current identity data and no manual re-entry is required.

**Acceptance Criteria:**

**Given** a running Descope project with existing users, roles, permissions, and tenants
**When** the seed migration script runs
**Then** all Descope users are imported into the `users` table with SCIM-aligned fields
**And** all roles are imported into the `roles` table
**And** all permissions are imported into the `permissions` table with role-permission mappings
**And** all tenants are imported into the `tenants` table
**And** user-tenant-role assignments are imported into `user_tenant_roles`
**And** IdP links are created in `idp_links` for each user (provider: descope, external_sub: descope user ID)

**Given** the seed migration has already been run
**When** it runs again
**Then** existing records are skipped (idempotent — no duplicates, no errors)
**And** new records in Descope since last run are added

**Given** the seed migration is run with `--dry-run` flag
**When** it completes
**Then** it reports what would be imported (counts per table) without writing to the database

**Given** the seed migration encounters an API error from Descope
**When** it fails mid-import
**Then** already-imported records are committed (partial progress is preserved)
**And** the error is logged with enough detail to resume

---

## Epic 2: Identity & Access Administration

Implement PostgresIdentityService with write-through sync to Descope, rewire all identity routers to inject IdentityService instead of DescopeManagementClient, and verify all existing API contracts are preserved.

### Story 2.1: User Service + Descope Sync Adapter

As an admin,
I want user CRUD operations backed by canonical Postgres with automatic sync to Descope,
So that the canonical store owns user data while keeping Descope in sync.

**Acceptance Criteria:**

**Given** `backend/app/services/identity_impl.py`
**When** `PostgresIdentityService.create_user()` is called
**Then** a User record is created in Postgres with `created_at` and `updated_at` timestamps
**And** `DescopeSyncAdapter.sync_user()` is called after the Postgres write
**And** if sync succeeds, `Ok(user)` is returned
**And** if sync fails, the Postgres write is NOT rolled back, a warning is logged with operation/payload/error/timestamp, and `Ok(user)` is still returned (SyncFailed is logged, not surfaced as error for creates)

**Given** `PostgresIdentityService.search_users()`
**When** called with filter parameters (email, name, status, tenant_id)
**Then** results are filtered from Postgres using the provided criteria
**And** the query scopes by `tenant_id` when provided

**Given** `PostgresIdentityService.deactivate_user()`
**When** called with a user_id
**Then** the user's status is set to `inactive` (soft delete, not hard delete)
**And** `updated_at` is updated
**And** sync to Descope is attempted

**Given** `backend/app/services/adapters/descope.py`
**When** `DescopeSyncAdapter` is instantiated
**Then** it uses the existing `DescopeManagementClient` for API calls
**And** each method wraps httpx calls in try/except returning `Result[None, SyncError]`
**And** each method has an OTel span (`descope.sync_user`, etc.)

**Given** every service method
**When** it executes
**Then** it has an OTel span with `tenant.id` attribute
**And** it takes `tenant_id: UUID` as explicit parameter (not extracted from ambient context)
**And** it returns `Result[T, IdentityError]`

### Story 2.2: Role, Permission + Tenant Service

As an admin,
I want role, permission, and tenant CRUD with role-permission mapping and user-role assignment backed by canonical Postgres,
So that all authorization configuration is owned by the canonical store.

**Acceptance Criteria:**

**Given** `PostgresIdentityService` role methods
**When** `create_role()` is called with a name, description, and optional tenant_id
**Then** a Role is created in Postgres (tenant_id=NULL for global roles)
**And** sync to Descope is attempted via `DescopeSyncAdapter.sync_role()`
**And** `Result[Role, IdentityError]` is returned

**Given** `PostgresIdentityService` permission methods
**When** `create_permission()` is called
**Then** a Permission is created in Postgres
**And** sync to Descope is attempted
**When** `map_permission_to_role()` is called
**Then** a RolePermission mapping is created in Postgres
**And** the mapping is synced to Descope

**Given** `PostgresIdentityService` tenant methods
**When** `create_tenant()` is called with name and domains
**Then** a Tenant is created in Postgres with domain list
**And** sync to Descope is attempted
**When** `get_tenant_users_with_roles()` is called
**Then** all users in the tenant are returned with their role assignments

**Given** `PostgresIdentityService.assign_role_to_user()`
**When** called with user_id, tenant_id, role_id, and assigned_by
**Then** a UserTenantRole record is created with `assigned_by` and `assigned_at` timestamp
**And** sync to Descope is attempted
**When** the same assignment already exists
**Then** `Error(Conflict(...))` is returned

**Given** duplicate name constraints
**When** creating a role or permission with an existing name (within the same tenant scope)
**Then** `Error(Conflict(...))` is returned

### Story 2.3: Router Rewire — Identity Routers

As a developer,
I want all identity routers rewired to inject IdentityService instead of DescopeManagementClient,
So that the API layer uses the canonical service and existing contracts are preserved.

**Acceptance Criteria:**

**Given** the users router (`backend/app/routers/users.py`)
**When** rewired
**Then** it injects `IdentityService` via `Depends(get_identity_service)` instead of `get_descope_client()`
**And** all endpoint handlers call `IdentityService` methods
**And** responses use `result_to_response()` for HTTP mapping
**And** rate limiting decorators are unchanged
**And** `require_role("owner", "admin")` enforcement is unchanged

**Given** the roles router (`backend/app/routers/roles.py`)
**When** rewired
**Then** same pattern as users router — IdentityService injection, result_to_response

**Given** the permissions router (`backend/app/routers/permissions.py`)
**When** rewired
**Then** same pattern as users router — IdentityService injection, result_to_response

**Given** the tenants router (if exists, or tenant-related endpoints)
**When** rewired
**Then** same pattern — IdentityService injection, result_to_response

**Given** FGA routers and access key routers
**When** inspected after rewire
**Then** they are UNCHANGED — still using `get_descope_client()` directly (ADR-2, D11)

**Given** any existing API consumer (frontend, tests, external callers)
**When** calling the rewired endpoints
**Then** request/response shapes are IDENTICAL to before the rewire
**And** status codes are identical (except SyncFailed which adds 202 as a new possibility)

**Given** a write operation where Descope sync fails
**When** the router handles `SyncFailed` from IdentityService
**Then** HTTP 202 is returned with RFC 9457 Problem Detail body containing `type: /errors/sync-failed` and `traceId`

### Story 2.4: Unit + Integration Tests

As a developer,
I want comprehensive tests for the canonical identity service layer,
So that PostgresIdentityService, DescopeSyncAdapter, and router rewires are verified independently.

**Acceptance Criteria:**

**Given** `backend/tests/unit/services/test_identity_impl.py`
**When** unit tests run
**Then** PostgresIdentityService is tested with NoOpSyncAdapter against real Postgres (testcontainers)
**And** all CRUD operations are verified: create, read, update, deactivate/delete, search
**And** tenant isolation is verified: queries with tenant_id A do not return tenant_id B data
**And** duplicate/conflict cases return `Error(Conflict(...))`
**And** not-found cases return `Error(NotFound(...))`
**And** assigned_by and assigned_at are recorded on role assignments

**Given** `backend/tests/unit/services/test_descope_adapter.py`
**When** unit tests run
**Then** DescopeSyncAdapter is tested with mocked httpx responses
**And** successful sync returns `Ok(None)`
**And** HTTP errors return `Error(SyncError(...))`
**And** network errors return `Error(SyncError(...))`
**And** request bodies and paths are verified against expected Descope Management API contracts

**Given** `backend/tests/unit/routers/` (updated router tests)
**When** unit tests run
**Then** rewired routers are tested with mocked IdentityService
**And** `Ok(value)` → correct HTTP status + JSON body
**And** `Error(NotFound)` → 404 + RFC 9457 body
**And** `Error(SyncFailed)` → 202 + RFC 9457 body
**And** auth enforcement verified: 403 for non-admin on protected endpoints

**Given** `backend/tests/integration/test_identity_service.py`
**When** integration tests run
**Then** full service → Postgres flow is verified with NoOpSyncAdapter
**And** Alembic migrations run against the test database
**And** CRUD lifecycle tested: create → read → update → read → deactivate → read

### Story 2.5: E2E Tests + Regression

As a QA engineer,
I want Playwright E2E tests verifying the identity API works end-to-end after the service layer change,
So that we confirm the Postgres backing is invisible to API consumers.

**Acceptance Criteria:**

**Given** the Playwright E2E test suite
**When** `make test-e2e` runs
**Then** ALL existing E2E tests pass without modification (regression)
**And** the API contracts are verified unchanged from the consumer perspective

**Given** new E2E tests for identity CRUD
**When** they run against the full stack (FastAPI + Postgres + Descope)
**Then** user CRUD operations succeed via the API
**And** role CRUD operations succeed via the API
**And** permission CRUD operations succeed via the API
**And** tenant operations succeed via the API
**And** 3-tier auth is enforced: unauthenticated (401), wrong role (403), admin (success)

**Given** the frontend application
**When** it interacts with the backend API after the service layer change
**Then** all UI functionality works identically (API contracts unchanged)

---

## Epic 3: Inbound Sync & Reconciliation

Handle identity data flowing into the canonical store from external sources: Descope Flow sign-ups, audit webhooks for out-of-band changes, periodic reconciliation to catch drift, and Redis pub/sub for cache invalidation.

### Story 3.1: Flow HTTP Connector + Webhook Handler

As a system operator,
I want inbound sync endpoints for Descope Flow sign-ups and audit webhooks,
So that self-service registrations and out-of-band Descope changes are captured in the canonical store.

**Acceptance Criteria:**

**Given** `POST /api/internal/users/sync` endpoint
**When** called by Descope Flow HTTP Connector during sign-up with user profile data
**Then** a canonical User record is created in Postgres
**And** an IdP link is created (`provider: descope`, `external_sub: <descope_user_id>`)
**And** if the user already exists (by email), the existing record is updated instead
**And** `Ok(user)` is returned with HTTP 201 (new) or 200 (updated)

**Given** `POST /api/internal/webhooks/descope` endpoint
**When** a Descope audit event is received (user.created, user.updated, user.deleted, role.created, permission.modified, etc.)
**Then** the canonical store is updated to reflect the change
**And** if HMAC signature validation is configured (`DESCOPE_WEBHOOK_SECRET`), invalid signatures are rejected with 401
**And** events are processed idempotently (replayed events do not create duplicates)

**Given** the internal API endpoints
**When** accessed from an external client
**Then** they are NOT accessible — protected by internal-only middleware or network policy (NFR6)

### Story 3.2: Periodic Reconciliation Job

As a system operator,
I want a periodic reconciliation job that detects and resolves drift between canonical Postgres and Descope,
So that out-of-band changes and failed syncs are caught and corrected automatically.

**Acceptance Criteria:**

**Given** the reconciliation job
**When** it runs (configurable interval, default: hourly)
**Then** it fetches all users, roles, permissions, and tenants from Descope via Management API
**And** it diffs against canonical Postgres state
**And** drift is resolved by updating canonical records (Descope is treated as the more recent source for out-of-band changes)
**And** resolution actions are logged (what changed, old value, new value)

**Given** the reconciliation job
**When** it runs while another instance is already running
**Then** it is safe to run concurrently (idempotent, no duplicates, no lost updates — NFR10)

**Given** a Descope API outage during reconciliation
**When** the job fails to fetch Descope state
**Then** it logs the error and exits without modifying canonical state
**And** it retries on the next scheduled run

**Given** the reconciliation job
**When** it completes a full diff of up to 10,000 users
**Then** it completes in < 60 seconds (NFR4)

**Given** previously failed sync operations
**When** the reconciliation job runs
**Then** it detects and resolves any inconsistencies caused by the failed syncs (NFR11)

### Story 3.3: Redis Pub/Sub + Cache Invalidation

As a developer,
I want Redis pub/sub events on canonical data changes,
So that caches are invalidated immediately when identity data changes.

**Acceptance Criteria:**

**Given** a canonical write operation (create, update, delete on user/role/permission/tenant)
**When** the Postgres write commits
**Then** a cache invalidation event is published to Redis pub/sub channel `identity:changes`
**And** the event includes: entity type, entity ID, operation (create/update/delete), tenant_id, timestamp

**Given** the Redis connection
**When** Redis is unavailable
**Then** cache invalidation events are silently dropped (fire-and-forget — reconciliation is the durability guarantee)
**And** canonical writes are NOT affected

**Given** a subscriber listening on `identity:changes`
**When** an event is received
**Then** the relevant cache entries can be invalidated (key pattern documented for future consumers)

### Story 3.4: Inbound Sync Tests

As a QA engineer,
I want comprehensive tests for all inbound sync features,
So that Flow HTTP Connector, webhooks, reconciliation, and pub/sub are verified.

**Acceptance Criteria:**

**Given** unit tests for Flow HTTP Connector
**When** they run
**Then** user creation and update flows are verified
**And** duplicate handling (existing user by email) is verified
**And** IdP link creation is verified

**Given** unit tests for webhook handler
**When** they run
**Then** HMAC signature validation is verified (valid → processed, invalid → 401)
**And** each event type is processed correctly
**And** idempotent replay is verified

**Given** integration tests for reconciliation
**When** they run against real Postgres (testcontainers)
**Then** drift detection is verified with fixture data (NFR14)
**And** resolution actions are verified
**And** idempotency is verified (run twice, same result)

**Given** Playwright E2E tests
**When** `make test-e2e` runs
**Then** all existing E2E tests pass (regression)
**And** inbound sync endpoints are tested at the API level

---

## Epic 4: Multi-IdP Identity Linking

Enable multi-provider identity management: register providers, link user identities across IdPs, and resolve canonical users from any provider's token via an internal API with Redis caching.

### Story 4.1: IdP Link + Provider Config Service

As a system operator,
I want to manage IdP links and provider configurations in the canonical store,
So that users can have linked identities across multiple providers and new IdPs can be registered.

**Acceptance Criteria:**

**Given** `PostgresIdentityService` IdP link methods
**When** `create_idp_link()` is called with user_id, provider_id, external_sub, external_email, and optional metadata (JSONB)
**Then** an IdPLink record is created with `linked_at` timestamp
**And** the unique constraint `uq_idp_links_user_provider` prevents duplicate links (one user per provider)
**And** a single IdP identity (external_sub + provider_id) cannot be linked to multiple canonical users

**When** `get_user_idp_links()` is called with user_id
**Then** all IdP links for that user are returned with provider details

**When** `delete_idp_link()` is called
**Then** the link is removed from Postgres
**And** `Ok(None)` is returned

**Given** `PostgresIdentityService` provider methods
**When** `register_provider()` is called with name, type (descope/ory/entra/cognito/oidc), issuer_url, base_url, capabilities list, and config_ref (Infisical path)
**Then** a Provider record is created with `active=True`
**And** credentials are NOT stored in Postgres — only the `config_ref` path (NFR5)

**When** `deactivate_provider()` is called
**Then** the provider's `active` flag is set to False

**When** `get_provider_capabilities()` is called
**Then** the provider's capability list (`rbac`, `fga`, `scim`) is returned for downstream decision-making

### Story 4.2: Link Management + Provider Config Routers

As an admin/operator,
I want REST endpoints for managing IdP links and provider configurations,
So that identity linking and provider management are accessible via the API.

**Acceptance Criteria:**

**Given** IdP link management endpoints
**When** `GET /api/users/{user_id}/idp-links` is called by an admin
**Then** all IdP links for the user are returned
**When** `POST /api/users/{user_id}/idp-links` is called with provider_id, external_sub, external_email
**Then** a new IdP link is created and returned with 201
**When** `DELETE /api/users/{user_id}/idp-links/{link_id}` is called
**Then** the link is removed and 204 is returned

**Given** provider configuration endpoints
**When** `GET /api/providers` is called by an operator
**Then** all registered providers are returned (excluding `config_ref` values — never expose credential paths)
**When** `POST /api/providers` is called with provider details
**Then** a new provider is registered and returned with 201
**When** `PATCH /api/providers/{provider_id}` is called with `active: false`
**Then** the provider is deactivated
**When** `GET /api/providers/{provider_id}/capabilities` is called
**Then** the provider's capability list is returned

**Given** auth enforcement
**When** a non-admin calls IdP link endpoints
**Then** 403 is returned
**When** a non-operator calls provider config endpoints
**Then** 403 is returned

**Given** all responses
**When** errors occur
**Then** RFC 9457 Problem Detail responses are returned via `result_to_response()`

### Story 4.3: Internal Identity Resolution API + Redis Cache

As an internal service (Tyk plugin or microservice),
I want to resolve a canonical user from any IdP's subject and provider identifier,
So that token validation can map any provider's JWT to a canonical identity.

**Acceptance Criteria:**

**Given** `GET /api/internal/identity?sub={sub}&provider={provider}`
**When** called with a valid sub and provider
**Then** the canonical user is returned with: user profile, roles, permissions, tenant memberships, and all linked IdPs
**And** the response format is consistent regardless of which IdP issued the token

**When** no canonical user exists for the given sub + provider
**Then** 404 is returned with RFC 9457 Problem Detail

**Given** Redis cache
**When** an identity resolution request is made
**Then** Redis is checked first (key pattern: `identity:{provider}:{sub}`)
**And** if cached, the cached result is returned (< 50ms p95 — NFR3)
**And** if not cached, Postgres is queried and the result is cached with configurable TTL (default matches JWT TTL)

**Given** a canonical write that affects a cached user
**When** the write commits
**Then** the relevant cache entry is invalidated via Redis pub/sub

**Given** the internal API endpoint
**When** accessed from an external client
**Then** it is NOT accessible — internal-only (NFR6)

### Story 4.4: Multi-IdP Tests

As a QA engineer,
I want comprehensive tests for multi-IdP identity linking features,
So that IdP link management, provider configuration, identity resolution, and caching are verified.

**Acceptance Criteria:**

**Given** unit tests for IdP link service
**When** they run
**Then** link CRUD is verified
**And** uniqueness constraints are verified (duplicate → Conflict)
**And** provider-specific metadata (JSONB) is verified

**Given** unit tests for provider config service
**When** they run
**Then** provider CRUD is verified
**And** capability exposure is verified
**And** `config_ref` is stored but never returned in API responses

**Given** unit tests for identity resolution
**When** they run
**Then** resolution by sub + provider returns full canonical user data
**And** cache hit returns immediately
**And** cache miss queries Postgres and populates cache
**And** cache invalidation on write is verified

**Given** integration tests
**When** they run against real Postgres + Redis (testcontainers)
**Then** full lifecycle: register provider → create user → create IdP link → resolve identity → verify cache → update user → verify cache invalidated

**Given** Playwright E2E tests
**When** `make test-e2e` runs
**Then** all existing E2E tests pass (regression)
**And** IdP link management endpoints are tested at the API level
**And** provider config endpoints are tested at the API level
