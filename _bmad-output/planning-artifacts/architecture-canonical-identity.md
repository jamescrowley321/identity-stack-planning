---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-canonical-identity.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-02.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'architecture'
project_name: 'identity-stack-planning'
user_name: 'James'
date: '2026-03-30'
---

# Architecture Decision Document — Canonical Identity Domain Model (PRD 5)

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

32 FRs across 7 capability areas:
- **User Management (FR1-4):** Canonical user CRUD, inbound IdP provisioning, search/filter, audit timestamps
- **Role & Permission Management (FR5-9):** Definition CRUD (global + tenant-scoped), many-to-many mapping, per-tenant assignment with audit trail
- **Tenant Management (FR10-12):** Tenant CRUD, domain management, user/role visibility within tenant
- **IdP Link Management (FR13-16):** Link canonical users to external provider identities, view/delete links, provider-specific metadata (JSONB)
- **Provider Configuration (FR17-19):** Register/activate/deactivate IdPs, expose capabilities for downstream decision-making
- **Identity Resolution (FR20-22):** Internal API resolves canonical user from IdP subject + provider, Redis-cached responses
- **Write-Through Sync & Reconciliation (FR23-29):** Postgres-first writes, sync adapter interface, Descope audit webhook handler, Flow HTTP Connector, periodic reconciliation, Redis pub/sub cache invalidation
- **Database & Migration (FR30-32):** Alembic migrations (upgrade + downgrade), seed migration from Descope, Postgres replaces SQLite

**MVP-Critical vs. Deferrable:**
- **MVP-critical:** FR1-12 (user/role/permission/tenant CRUD), FR23-25 (write-through sync + Descope adapter), FR30-32 (Postgres + Alembic)
- **Should-have:** FR13-16 (IdP links), FR17-19 (provider config)
- **Deferrable:** FR20-22 (identity resolution API — only needed for PRD 4 gateway), FR26-29 (inbound sync, reconciliation — only needed when handling out-of-band changes)

**Non-Functional Requirements:**

18 NFRs driving architectural decisions, plus 3 additions from architectural review:
- **Performance:** < 100ms p95 canonical CRUD, < 500ms write-through sync, < 50ms cached identity resolution
- **Security:** No IdP credentials in Postgres (Infisical refs), internal API not externally exposed, TLS in non-dev, HMAC webhook validation
- **Reliability:** Descope outage doesn't block reads/writes, idempotent reconciliation, failed syncs retried via reconciliation
- **Testing:** Real Postgres via testcontainers-python (no SQLite fallback), mocked sync adapters via NoOpSyncAdapter, reconciliation fixture data
- **Maintainability:** ABC-based interfaces (IdentityService, IdentityProviderAdapter), Alembic-only schema changes, SQLModel ORM, Result[T,E] types at inter-layer boundaries
- **Observability (NEW):** OpenTelemetry auto-instrumentation (FastAPI, httpx, SQLAlchemy) + custom spans on IdentityService methods. OTLP export to Aspire Dashboard. Trace ID correlation in logs and error responses.
- **Error Contract (NEW):** RFC 9457 (Problem Details for HTTP APIs) compliance. All error responses use `application/problem+json` with type URIs, trace IDs, and structured error detail.

**Scale & Complexity:**

- Primary domain: API backend — Postgres-backed identity domain service with provider sync
- Complexity level: Medium — simple schema (8 tables), nuanced sync semantics, but well-bounded scope
- Estimated architectural components: 8 canonical tables, 2 ABC interfaces (IdentityService, IdentityProviderAdapter), 1 Postgres service implementation, 2 sync adapters (Descope, NoOp), OTel + Aspire observability stack, RFC 9457 error model

### Domain Model (Canonical — Provider-Agnostic)

The canonical model is designed domain-first, not as a mirror of Descope's API surface. It models identity primitives that any downstream service needs regardless of which IdP is active.

**Core Aggregates (8 tables):**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Canonical user identity (SCIM-aligned) | id (UUID), email, user_name, given_name, family_name, status (active/inactive/provisioned), created_at, updated_at |
| `tenants` | Organization/workspace | id (UUID), name, domains[] (self-provisioning), status (active/suspended), created_at, updated_at |
| `roles` | Role definitions (global or tenant-scoped) | id (UUID), name, description, tenant_id (NULL = global) |
| `permissions` | Permission definitions | id (UUID), name (e.g. "documents.write"), description |
| `role_permissions` | Many-to-many role↔permission | role_id (FK), permission_id (FK) |
| `user_tenant_roles` | Per-tenant role assignment with audit | user_id (FK), tenant_id (FK), role_id (FK), assigned_by (FK), assigned_at |
| `idp_links` | Links canonical user to provider identity | user_id (FK), provider_id (FK), external_sub, external_email, linked_at, metadata (JSONB) |
| `providers` | Registered identity provider configs | id (UUID), name, type (descope/ory/entra/cognito/oidc), issuer_url, base_url, capabilities[], config_ref (Infisical path), active |

**Explicitly NOT in the canonical model:**
- Passwords, MFA state, sessions — stays with IdP
- FGA relation tuples — stays in provider engines (ADR-2)
- Access keys — provider-specific M2M auth, proxied like FGA
- JWT claims structure — runtime concern, not data model

### Interface Architecture

**Two ABC interfaces, constructor injection, no generics:**

- **`IdentityService`** (ABC) — core contract for canonical identity operations. Routers depend on this. Postgres-backed implementation (`PostgresIdentityService`) is the only production impl.
- **`IdentityProviderAdapter`** (ABC) — sync adapter for IdP write-through. Descope adapter is the first impl. `NoOpSyncAdapter` for testing.
- **Constructor injection:** `PostgresIdentityService(session, adapter)` — FastAPI DI wires it up.

**Canonical operations** (IdentityService — Postgres-backed, synced to provider):
- User CRUD + search, Role definition CRUD, Permission definition CRUD
- Role-permission mapping, Tenant CRUD + domains, User-tenant-role assignment
- IdP link management, Provider configuration

**Proxied operations** (stay on DescopeManagementClient, not routed through IdentityService):
- FGA schema, relations, checks
- Access key lifecycle
- Auth/logout

**Result types (ADR-6) from day one:**
- Service methods return `Result[T, IdentityError]` — not exceptions
- Error hierarchy: `NotFound`, `Conflict`, `ValidationError`, `SyncFailed`, `ProviderError`
- `SyncFailed` models the partial-success state: Postgres succeeded, IdP sync failed → HTTP 202 with warning
- Router helper maps `Result` → HTTP response with RFC 9457 Problem Detail format
- OTel trace ID included in Problem Detail as extension field for client-to-trace correlation

**Module structure:**
```
backend/app/services/
├── identity.py          # ABC: IdentityService
├── identity_impl.py     # PostgresIdentityService(IdentityService)
├── adapters/
│   ├── base.py          # ABC: IdentityProviderAdapter
│   ├── descope.py       # DescopeSyncAdapter(IdentityProviderAdapter)
│   └── noop.py          # NoOpSyncAdapter — testing, returns Ok(None)
```

### Technical Constraints & Dependencies

- **D21 seam does not exist in code.** Routers call `get_descope_client()` directly today. The IdentityService interface must be created, not just "filled." Epic 2 is three things: define interface, implement Postgres backing, rewire 11 routers.
- **SQLite → Postgres migration:** Current DB is SQLite with `create_all()`. Requires Postgres in Docker Compose, Alembic setup, and baseline migration for existing Document + TenantResource tables (`alembic stamp` or initial migration).
- **FGA stays proxied (ADR-2):** FGA routes continue calling DescopeManagementClient directly. Not routed through IdentityService.
- **Access keys stay proxied:** Provider-specific M2M auth. Tier 3 concern per three-tier model.
- **CorrelationIdMiddleware replaced by OTel:** `traceparent` header (W3C standard) replaces custom `X-Correlation-ID`. One less middleware.
- **py-identity-model unaffected:** Token validation middleware stays unchanged — validates JWTs regardless of backing store.
- **Redis not yet in stack:** Needed for cache + pub/sub. Add standalone in Docker Compose for now; merge with Tyk's Redis when gateway work begins.

### Cross-Cutting Concerns

- **Write-through sync failure handling:** Every canonical write attempts IdP sync. `SyncFailed` Result variant → HTTP 202. Reconciliation catches up. Pattern must be consistent across all service methods.
- **Tenant isolation:** Currently implicit via JWT `dct` + SQL filters. Must remain airtight in Postgres. Every query scopes by tenant.
- **Alembic migration discipline:** Replaces `create_all()`. Existing tables need baseline migration. Every schema change is a versioned migration with upgrade + downgrade.
- **Test infrastructure shift:** testcontainers-python for real Postgres. NoOpSyncAdapter isolates canonical logic from IdP calls. E2E tests must pass against new backing store.
- **Observability from day one:** OTel instrumentation + Aspire dashboard configured before service methods are built. Custom spans on IdentityService methods trace the full write-through path.
- **RFC 9457 error contract:** Standardized before router rewrites. All error responses use Problem Detail format with trace IDs.
- **Backward compatibility:** All existing API contracts, E2E tests, and frontend code work unchanged.

## Starter Template Evaluation

### Primary Technology Domain

API backend (brownfield refactor) — extending an existing FastAPI + SQLModel + React codebase.

### Starter Assessment: Not Applicable

This is a brownfield project with an established tech stack. No starter template is needed. The existing codebase provides:

**Established Stack (no changes):**
- Python 3.12+ / FastAPI >= 0.115.0 / SQLModel >= 0.0.22
- httpx >= 0.28 (async HTTP client)
- React + Vite + Tailwind CSS v4 + shadcn/ui (frontend)
- pytest + pytest-asyncio + Playwright (testing)
- Ruff (linting/formatting)
- Docker Compose (deployment)

**Additions for Canonical Identity Model:**

| Package | Version | Purpose |
|---------|---------|---------|
| `asyncpg` | latest | Async Postgres driver for SQLAlchemy |
| `alembic` | latest | Database migration management |
| `testcontainers[postgres]` | latest | Real Postgres in integration tests |
| `expression` | latest | Result[T, E] types (railway-oriented error handling) |
| `opentelemetry-sdk` | latest | OTel core SDK |
| `opentelemetry-exporter-otlp-proto-grpc` | latest | OTLP export to Aspire Dashboard |
| `opentelemetry-instrumentation-fastapi` | latest | Auto-trace all HTTP routes |
| `opentelemetry-instrumentation-httpx` | latest | Auto-trace Descope Management API calls |
| `opentelemetry-instrumentation-sqlalchemy` | latest | Auto-trace Postgres queries |
| `opentelemetry-instrumentation-logging` | latest | Inject trace/span IDs into log records |

**Docker Compose Additions:**

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `postgres:16-alpine` | Canonical identity store |
| `aspire-dashboard` | `mcr.microsoft.com/dotnet/aspire-dashboard:9.0` | Local OTel trace/log viewer |
| `redis` | `redis:7-alpine` | Identity cache + pub/sub |

**Note:** Version pinning will be determined at implementation time via `uv add` to get latest compatible versions.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Primary database | PostgreSQL 16 | Replaces SQLite. Canonical identity store. |
| D2 | ORM + migrations | SQLModel + Alembic (async-only) | Single async `env.py`. No sync engine anywhere in the project. |
| D3 | Async engine | `create_async_engine` + `AsyncSession` everywhere | asyncpg driver. No sync Session, no sync fallback. Alembic uses `run_async`. |
| D4 | Interface pattern | ABCs with constructor injection | `IdentityService` (ABC), `IdentityProviderAdapter` (ABC). No generics. |
| D5 | Error handling | `Result[T, E]` via `expression` + RFC 9457 Problem Details | From day one. `SyncFailed` → HTTP 202. `application/problem+json` with trace IDs. |
| D6 | Observability | OTel auto-instrumentation + Aspire Dashboard | FastAPI, httpx, SQLAlchemy instrumentors. Custom spans on IdentityService. |
| D7 | Sync pattern | Write-through (Postgres first, IdP second) | `SyncFailed` logged, not rolled back. Reconciliation catches up. |
| D8 | Tenant isolation | Repository-level scoping | Every query method takes `tenant_id`. Enforced in repository layer. Explicit, testable, no Postgres RLS magic. |

**Important Decisions (Shape Architecture):**

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D9 | Caching | Redis 7 for identity lookups + pub/sub | Standalone in Docker Compose. Merges with Tyk's Redis later. |
| D10 | Testing | testcontainers-python with real Postgres | No SQLite test fallback. NoOpSyncAdapter isolates canonical logic. |
| D11 | FGA/access keys | Proxied to provider | Not routed through IdentityService. Provider-specific. (ADR-2) |
| D12 | Correlation | OTel `traceparent` replaces `X-Correlation-ID` | CorrelationIdMiddleware removed. W3C standard. |
| D13 | Schema alignment | SCIM Core User field names | Zero-cost future SCIM server capability. |

**Deferred Decisions (Post-MVP):**

| # | Decision | Deferral Rationale |
|---|----------|--------------------|
| D14 | Identity resolution API (FR20-22) | Only needed for PRD 4 gateway |
| D15 | Inbound sync — webhooks, reconciliation (FR26-29) | Only needed for out-of-band change handling |
| D16 | Redis cache TTL tuning | Determine from real usage patterns |
| D17 | Frontend changes | API contracts unchanged; frontend is unaffected |
| D18 | SCIM server endpoint | Growth feature — schema aligned but endpoint deferred |

### Data Architecture

**Database:** PostgreSQL 16 (alpine) via Docker Compose

**Async Stack (no sync anywhere):**
- `sqlalchemy[asyncio]` + `asyncpg` — async engine and sessions
- `create_async_engine()` in app startup
- `AsyncSession` via `async_sessionmaker` — injected into services via FastAPI `Depends()`
- Alembic `env.py`: single file, async-only, uses `run_async(connectable.connect())` for online migrations

**Schema:** 8 canonical tables (see Domain Model section). SQLModel ORM with Alembic-managed migrations. Existing `Document` + `TenantResource` tables brought under Alembic control via baseline migration.

**Tenant Isolation:** Repository-level. Every repository method that touches tenant-scoped data takes `tenant_id: UUID` as an explicit parameter. No implicit filtering. No Postgres RLS. Testable via unit tests that verify queries include tenant scoping.

**Migration Strategy:**
1. Alembic init with async-only `env.py`
2. Baseline migration: `alembic stamp head` for existing tables (Document, TenantResource)
3. Initial migration: create 8 canonical identity tables
4. Seed migration: import Descope state → canonical tables (idempotent, dry-run capable)

### Authentication & Security

**No changes to auth flow.** py-identity-model JWT validation middleware stays as-is. Token validation is IdP-agnostic — validates JWTs regardless of which provider issued them.

**Security decisions preserved:**
- NFR5: No IdP credentials in Postgres — Infisical `config_ref` on `providers` table
- NFR6: Internal API (`/api/internal/*`) not externally exposed
- NFR8: Audit webhook HMAC validation when configured
- Existing middleware stack (security headers, rate limiting) unchanged

### API & Communication Patterns

**REST API contracts unchanged.** Same request/response shapes, same status codes, same Pydantic models. The Postgres backing is invisible to API consumers.

**Error handling evolution:**
- Current: `raise HTTPException(status, detail="string")`
- New: `Result[T, IdentityError]` → `ProblemDetailResponse` (RFC 9457)
- Content-Type: `application/problem+json`
- Extension fields: `traceId` (OTel), `instance` (request path)
- `SyncFailed` → HTTP 202 with Problem Detail warning (Postgres succeeded, sync pending)

**Rate limiting:** Unchanged. `@limiter.limit(RATE_LIMIT_AUTH)` on write endpoints.

### Infrastructure & Deployment

**Docker Compose additions:**

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: identity
    POSTGRES_USER: identity
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev}
  volumes:
    - pgdata:/var/lib/postgresql/data
  ports:
    - "5432:5432"

aspire-dashboard:
  image: mcr.microsoft.com/dotnet/aspire-dashboard:9.0
  ports:
    - "18888:18888"
    - "4317:18889"
  environment:
    DASHBOARD__OTLP__AUTHMODE: Unsecured

redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

**Backend environment additions:**
- `DATABASE_URL=postgresql+asyncpg://identity:dev@postgres:5432/identity`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://aspire-dashboard:18889`
- `OTEL_SERVICE_NAME=identity-stack`
- `REDIS_URL=redis://redis:6379/0`

### Decision Impact Analysis

**Implementation Sequence:**

1. **Postgres + Alembic + async engine** — foundation, blocks everything
2. **OTel + Aspire Dashboard** — observability before service layer
3. **RFC 9457 error model + Result types** — error contract before router rewrites
4. **IdentityService ABC + IdentityProviderAdapter ABC** — interfaces before implementations
5. **PostgresIdentityService + DescopeSyncAdapter** — implementations
6. **Router rewrites** — inject IdentityService, replace direct Descope calls
7. **Seed migration** — import Descope state into canonical tables
8. **Redis cache** — identity lookup caching + pub/sub

**Cross-Component Dependencies:**

- Alembic async `env.py` depends on `create_async_engine` config
- OTel SQLAlchemy instrumentor needs the engine reference at startup
- Result types + RFC 9457 must be in place before any router rewrites
- NoOpSyncAdapter needed before integration tests can run
- Seed migration depends on both Postgres schema and DescopeSyncAdapter (reads from Descope)

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database:**
- Tables: lowercase plural (`users`, `tenants`, `role_permissions`)
- Columns: snake_case (`user_name`, `tenant_id`, `created_at`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `role_id`, `provider_id`)
- Indexes: `ix_{table}_{column}` (`ix_users_email`, `ix_idp_links_external_sub`)
- Unique constraints: `uq_{table}_{columns}` (`uq_idp_links_user_provider`)
- Primary keys: `id` (UUID, server-generated via `uuid4`)

**API:**
- Endpoints: lowercase plural, `/api/{resource}` (`/api/users`, `/api/roles`, `/api/tenants`)
- Route params: `{resource_id}` (`/api/users/{user_id}`)
- Query params: snake_case (`?tenant_id=...&status=active`)
- JSON response fields: snake_case (matches Python model fields)
- Headers: standard HTTP (`traceparent`, `content-type: application/problem+json`)

**Python Code:**
- Modules: snake_case (`identity_impl.py`, `descope.py`)
- Classes: PascalCase (`PostgresIdentityService`, `DescopeSyncAdapter`)
- Functions/methods: snake_case (`create_user`, `sync_role`)
- Constants: UPPER_SNAKE (`RATE_LIMIT_AUTH`, `DEFAULT_CACHE_TTL`)
- Type aliases: PascalCase (`UserResult = Result[User, IdentityError]`)

### Structure Patterns

**Service Layer Organization:**
```
backend/app/
├── services/
│   ├── identity.py              # ABC: IdentityService
│   ├── identity_impl.py         # PostgresIdentityService
│   ├── adapters/
│   │   ├── base.py              # ABC: IdentityProviderAdapter
│   │   ├── descope.py           # DescopeSyncAdapter
│   │   └── noop.py              # NoOpSyncAdapter (testing)
│   └── descope.py               # DescopeManagementClient (existing, proxied ops only)
├── models/
│   ├── database.py              # AsyncEngine, async_sessionmaker
│   ├── identity/                # Canonical identity models
│   │   ├── user.py              # User, IdPLink
│   │   ├── tenant.py            # Tenant (canonical, distinct from existing TenantResource)
│   │   ├── role.py              # Role, Permission, RolePermission
│   │   ├── assignment.py        # UserTenantRole
│   │   └── provider.py          # Provider
│   ├── document.py              # Existing Document model
│   └── tenant.py                # Existing TenantResource model
├── errors/
│   ├── identity.py              # IdentityError hierarchy
│   └── problem_detail.py        # RFC 9457 ProblemDetailResponse
├── telemetry.py                 # OTel configuration
├── routers/                     # Existing routers (rewired to IdentityService)
├── dependencies/                # Existing + new DI factories
│   └── identity.py              # get_identity_service() dependency
└── migrations/                  # Alembic
    ├── env.py                   # Async-only
    ├── versions/                # Migration scripts
    └── alembic.ini
```

**Test Organization:**
```
backend/tests/
├── unit/
│   ├── services/
│   │   ├── test_identity_impl.py    # PostgresIdentityService (with NoOpSyncAdapter)
│   │   └── test_descope_adapter.py  # DescopeSyncAdapter (mocked httpx)
│   ├── models/
│   │   └── test_identity_models.py  # SQLModel validation
│   ├── errors/
│   │   └── test_problem_detail.py   # RFC 9457 response formatting
│   └── routers/                     # Existing + updated router tests
├── integration/
│   ├── conftest.py                  # testcontainers Postgres fixture
│   └── test_identity_service.py     # Full service → Postgres (NoOpSyncAdapter)
└── e2e/                             # Existing Playwright tests (unchanged)
```

### Format Patterns

**API Response Format:**
- Success: direct resource or list — `{"id": "...", "email": "..."}` or `[{...}, {...}]`
- Success with warning (sync failed): HTTP 202 + RFC 9457 body with `type: "/errors/sync-failed"`
- Error: RFC 9457 Problem Detail (`application/problem+json`)
- No wrapping envelope (`{data: ..., meta: ...}`). FastAPI convention — return the model directly.

**RFC 9457 Problem Detail Format:**
```json
{
  "type": "/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "No user with ID 550e8400-...",
  "instance": "/api/users/550e8400-...",
  "traceId": "abc123def456"
}
```

**Error Type URI Registry:**

| Error | URI | HTTP Status |
|-------|-----|-------------|
| `NotFound` | `/errors/not-found` | 404 |
| `Conflict` | `/errors/conflict` | 409 |
| `ValidationError` | `/errors/validation` | 422 |
| `SyncFailed` | `/errors/sync-failed` | 202 |
| `ProviderError` | `/errors/provider-error` | 502 |
| `Forbidden` | `/errors/forbidden` | 403 |

### Service Method Pattern

Every `IdentityService` method follows this structure:

```python
async def create_role(self, tenant_id: UUID, cmd: CreateRole) -> Result[Role, IdentityError]:
    with tracer.start_as_current_span("identity.create_role") as span:
        span.set_attribute("tenant.id", str(tenant_id))

        # 1. Validate
        # 2. Postgres write
        role = Role(...)
        self._session.add(role)
        await self._session.flush()

        # 3. Sync to provider (don't roll back on failure)
        sync_result = await self._adapter.sync_role(role)
        match sync_result:
            case Error(e):
                logger.warning("sync_failed", role_id=str(role.id), error=str(e))
                span.set_status(StatusCode.ERROR, "sync_failed")

        await self._session.commit()
        return Ok(role)
```

**Key invariants:**
- Postgres write FIRST, sync SECOND
- Sync failure → log + warn, never rollback
- Every method gets an OTel span with domain attributes
- `tenant_id` is explicit param, never extracted from ambient context
- Return `Result[T, IdentityError]`, never raise

### Router Pattern

Every router that uses IdentityService follows this structure:

```python
@router.post("/roles", status_code=201)
async def create_role(
    body: CreateRoleRequest,
    request: Request,
    tenant_id: UUID = Depends(get_tenant_id),
    _roles: list[str] = Depends(require_role("owner", "admin")),
    identity: IdentityService = Depends(get_identity_service),
):
    result = await identity.create_role(tenant_id, CreateRole(...))
    return result_to_response(result, status=201)
```

**Key invariants:**
- `IdentityService` injected via `Depends(get_identity_service)`
- `result_to_response()` maps `Ok` → JSON, `Error` → RFC 9457 Problem Detail
- Rate limiting, role enforcement, tenant extraction unchanged from existing patterns
- FGA/access key routes continue using `get_descope_client()` directly

### Sync Adapter Pattern

Every adapter method follows this structure:

```python
async def sync_role(self, role: Role) -> Result[None, SyncError]:
    with tracer.start_as_current_span("descope.sync_role"):
        try:
            await self._client.post(
                "/v1/mgmt/role/create",
                json={"name": role.name, "description": role.description, ...}
            )
            return Ok(None)
        except httpx.HTTPStatusError as e:
            return Error(SyncError(f"Descope API {e.response.status_code}: {e.response.text}"))
        except httpx.RequestError as e:
            return Error(SyncError(f"Descope unreachable: {e}"))
```

**Key invariants:**
- Return `Result[None, SyncError]`, never raise
- OTel span wraps the HTTP call
- Map both HTTP errors and network errors to `SyncError`

### Quality Control & Pre-Commit Gates

Replicated from py-identity-model — adapted for identity-stack backend.

**Pre-commit Hooks (`.pre-commit-config.yaml`):**

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.1
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: local
    hooks:
      - id: pyrefly-check
        name: pyrefly check
        entry: uv run pyrefly check
        language: system
        types_or: [python, pyi]
        pass_filenames: false
        require_serial: true
      - id: pytest-coverage
        name: pytest coverage check (80% minimum)
        entry: uv run pytest backend/tests -m unit -q --cov=backend/app --cov-report=term-missing:skip-covered --cov-fail-under=80
        language: system
        types: [python]
        pass_filenames: false
        require_serial: true
```

**Ruff Configuration (pyproject.toml):**

```toml
[tool.ruff]
line-length = 79
target-version = "py312"

[tool.ruff.lint]
select = [
    "B", "C", "E", "W", "F", "I", "UP", "S", "A", "COM", "DTZ",
    "ICN", "PIE", "PT", "Q", "RSE", "RET", "SIM", "TCH", "ARG",
    "PTH", "ERA", "PL", "PERF", "RUF",
]
ignore = ["E501", "COM812"]

[tool.ruff.lint.per-file-ignores]
"backend/tests/**/*.py" = ["S101"]

[tool.ruff.lint.mccabe]
max-complexity = 18

[tool.ruff.lint.isort]
known-first-party = ["app"]
force-sort-within-sections = true
lines-after-imports = 2
```

**pytest Configuration:**

```toml
[tool.pytest.ini_options]
testpaths = ["backend/tests"]
addopts = ["-ra", "--strict-markers", "--strict-config", "--showlocals", "-vv", "--tb=short"]
markers = [
    "unit: unit tests",
    "integration: integration tests (real Postgres)",
    "e2e: end-to-end Playwright tests",
]
asyncio_mode = "auto"
filterwarnings = ["error", "ignore::DeprecationWarning"]
```

**Coverage Configuration:**

```toml
[tool.coverage.run]
source = ["backend/app"]
branch = true
omit = ["*/tests/*", "*/__pycache__/*", "*/__init__.py"]

[tool.coverage.report]
precision = 2
show_missing = true
fail_under = 80.0
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "@abstractmethod",
]
```

**Makefile Targets:**

```makefile
lint:
	uv run pre-commit run -a

test-unit:
	uv run pytest backend/tests -m unit -v -n auto \
		--cov=backend/app --cov-report=term-missing --cov-fail-under=80

test-integration:
	uv run pytest backend/tests -m integration -v \
		--cov=backend/app --cov-report=term-missing --cov-fail-under=80

test-e2e:
	cd backend && python -m pytest tests/e2e -v

test-all: lint test-unit test-integration test-e2e
```

**Quality Gates (all must pass before merge):**

| Gate | Threshold | Enforcer |
|------|-----------|----------|
| Code coverage | 80% minimum | pytest `--cov-fail-under` + pre-commit hook |
| Type checking | Strict | pyrefly (pre-commit) |
| Linting | All selected ruff rules | pre-commit hook |
| Formatting | ruff format | pre-commit hook (auto-fix) |
| McCabe complexity | 18 max | ruff C901 |
| Security | Bandit rules | ruff S rules |
| E2E regression | All pass | `make test-e2e` |

### Enforcement Guidelines

**All AI Agents MUST:**

1. Use `AsyncSession` — never `Session`. No sync database access anywhere.
2. Return `Result[T, E]` from service methods — never `raise` for domain errors.
3. Use `result_to_response()` in routers — never construct `ProblemDetailResponse` manually.
4. Pass `tenant_id` explicitly to every tenant-scoped repository/service method.
5. Add OTel spans with domain attributes on every `IdentityService` method.
6. Use Alembic for ALL schema changes — never `create_all()` or raw DDL.
7. Write tests against real Postgres via testcontainers — never mock the database.
8. Use `NoOpSyncAdapter` in service tests — never mock `IdentityProviderAdapter` methods individually.
9. Follow existing router patterns (rate limiting, role enforcement) unchanged.
10. Keep FGA/access key routes on `DescopeManagementClient` — do not route through `IdentityService`.
11. Run `make lint` before every commit — pre-commit hooks enforce ruff, pyrefly, and 80% coverage.

### Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| `raise HTTPException(404, detail="not found")` | `return Error(NotFound("User", user_id))` → `result_to_response()` |
| `sync Session` or `create_engine()` | `AsyncSession` via `async_sessionmaker` + `create_async_engine()` |
| `create_all()` in app startup | Alembic migration (`alembic upgrade head`) |
| `get_descope_client()` in canonical routers | `Depends(get_identity_service)` |
| Implicit tenant from JWT in service layer | Explicit `tenant_id: UUID` parameter |
| `try/except` returning HTTP status in service | `Result[T, IdentityError]` — let router map to HTTP |
| Mock Postgres with SQLite in tests | `testcontainers[postgres]` for real Postgres |
| Commit without `make lint` | Pre-commit hooks enforce ruff + pyrefly + 80% coverage |

## Project Structure

The complete project structure is defined in the Structure Patterns section above. Key boundaries:

**Canonical identity domain** (`backend/app/services/identity*.py`, `backend/app/models/identity/`):
- Owns user, tenant, role, permission CRUD in Postgres
- Write-through sync to IdP via adapter
- All operations return `Result[T, IdentityError]`

**Proxied operations** (`backend/app/services/descope.py`):
- FGA schema, relations, checks
- Access key lifecycle
- Auth/logout
- Continue using existing `DescopeManagementClient` directly

**Observability** (`backend/app/telemetry.py`):
- OTel SDK configuration, instrumentors, OTLP export
- Initialized in app lifespan before any request handling

**Error contract** (`backend/app/errors/`):
- `IdentityError` hierarchy mapping to RFC 9457 Problem Details
- `result_to_response()` helper for routers
- `ProblemDetailResponse` with `application/problem+json` content type

**Migrations** (`backend/migrations/`):
- Async-only Alembic `env.py`
- Baseline migration for existing tables
- Canonical schema migration (8 tables)
- Seed migration (Descope → Postgres import)

### Component → FR Mapping

| Component | FRs Covered |
|-----------|-------------|
| Postgres + Alembic + async engine | FR30-32 |
| `IdentityService` ABC + `PostgresIdentityService` | FR1-12 |
| `IdentityProviderAdapter` ABC + `DescopeSyncAdapter` | FR23-25 |
| `NoOpSyncAdapter` | Testing infrastructure |
| `IdentityError` + `ProblemDetailResponse` | NFR error contract |
| OTel + Aspire Dashboard | NFR observability |
| Pre-commit + quality gates | NFR maintainability |
| `IdPLink` + `Provider` models | FR13-19 (should-have) |
| Redis cache | FR22, deferred |
| Inbound sync + reconciliation | FR26-29, deferred |

## Architecture Validation

### Requirements Coverage

**MVP-critical FRs (FR1-12, FR23-25, FR30-32): FULLY COVERED**
- Every FR maps to a concrete component and implementation pattern
- Service method pattern + router pattern + sync adapter pattern provide complete implementation guidance

**Should-have FRs (FR13-19): COVERED by schema**
- `idp_links` and `providers` tables are in the schema
- Service methods for these can follow the same patterns

**Deferred FRs (FR20-22, FR26-29): EXPLICITLY DEFERRED**
- Identity resolution API and inbound sync deferred with clear rationale

### NFR Coverage

| NFR | Covered By |
|-----|-----------|
| < 100ms p95 CRUD | Postgres + asyncpg + connection pooling |
| < 500ms write-through | Async httpx to Descope |
| 80% test coverage | Pre-commit gate + testcontainers |
| No IdP creds in Postgres | `config_ref` field on `providers` table |
| Alembic-only migrations | Enforcement guideline #6 |
| Result types | Enforcement guideline #2 |
| OTel instrumentation | Enforcement guideline #5 |

### Architectural Coherence

- **Data flows cleanly:** Router → `IdentityService` (Result) → Postgres + sync adapter → `DescopeSyncAdapter` (Result)
- **Error paths are explicit:** `Result[T, IdentityError]` at every boundary, RFC 9457 at the HTTP surface
- **Tenant isolation is testable:** Explicit `tenant_id` params, no ambient context
- **Observability is structural:** OTel spans on service methods, auto-instrumentation on HTTP and SQL
- **Quality gates match py-identity-model:** Same ruff rules, same coverage threshold, same pre-commit hooks

### Known Risks

| Risk | Mitigation |
|------|-----------|
| Alembic baseline migration for existing tables | Test with `alembic stamp` in integration tests before production |
| `expression` library maturity | Well-maintained (dbrattli), used in production F# ecosystems. Fallback: plain dataclass Result if issues arise |
| OTel SDK overhead | Auto-instrumentation adds ~1-2ms per request. Acceptable for identity operations. Sampling configurable. |
| Async Alembic complexity | Single `env.py` with `run_async`. Well-documented pattern in SQLAlchemy docs. |
