# Sprint Change Proposal — Onion Architecture Refactor (Epic 2)

**Date:** 2026-04-05
**Trigger:** Reviewer feedback on PR #201 (identity-stack Story 2.1)
**Mode:** Batch
**Scope Classification:** Moderate
**Status:** Approved

---

## 1. Issue Summary

**Trigger:** Two reviewer comments on PR #201 (Story 2.1: User Service + Descope Sync Adapter):

1. On `backend/app/dependencies/identity.py`: *"This is not correct. Why does the persistence layer depend on the adapter like this? We need to use onion arch and layer correctly."*
2. On `backend/app/services/identity_impl.py`: *"This is a bad name and design. Use repositories for DB access and domain services."*

**Problem:** `PostgresIdentityService` violates onion architecture by mixing three concerns in one class:

- **Persistence** — direct SQLAlchemy queries (`self._session.add()`, `self._session.execute()`, joins, filters)
- **Domain logic** — sync orchestration, error mapping, tenant membership verification
- **Cross-cutting** — OTel spans, logging

The DI factory (`get_identity_service`) wires `AsyncSession` + `DescopeSyncAdapter` into the same class, making the persistence layer depend on the adapter — an outer-layer concern leaking into an inner layer.

**Category:** Architectural design misalignment — the architecture doc described `PostgresIdentityService(session, adapter)` as the pattern, but the reviewer expects proper onion layering with separate repository and service layers.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|------|--------|--------|
| Epic 1: Database Foundation | Complete | None — schema unchanged |
| **Epic 2: Identity & Access Administration** | **In Progress** | **Direct — stories 2.1-2.3 need rework (PRs #201, #196, #200)** |
| Epic 3: Inbound Sync | Not started | None — will follow new patterns |
| Epic 4: Multi-IdP Linking | Not started | None — will follow new patterns |

### Story Impact

| Story | Issue | PR | Current Status | Required Change |
|-------|-------|----|----------------|-----------------|
| 2.1 | #144 | #201 | CI phase | **Rework:** Extract `UserRepository`, rename service to `UserService` |
| 2.2 | #145 | #196 | CI phase | **Rework:** Extract `RoleRepository`, `PermissionRepository`, `TenantRepository`, individual services |
| 2.3 | #146 | #200 | CI phase | **Rework:** Update DI factories to compose repository → service |
| 2.4 | #147 | — | Not started | **Adjust:** Test organization includes repository tests + service tests |
| 2.5 | #148 | — | Not started | **No change:** API contracts unchanged, E2E tests identical |

### Artifact Conflicts

| Artifact | Impact | Action |
|----------|--------|--------|
| `architecture-canonical-identity.md` | Significant | Update module structure, interface descriptions, service method pattern, DI wiring, test organization |
| `ralph-prompts/architecture-reference.md` | Significant | Update enforcement guidelines, key patterns, anti-patterns |
| `prd-canonical-identity.md` | None | Requirements unchanged — wording is generic enough |
| `sprint-plan.md` | None | Story names and issue numbers unchanged |
| `ralph-prompts/canonical-identity.md` | None | Task queue unchanged (same branches/stories) |
| UI/UX | None | No frontend changes, API contracts unchanged |

---

## 3. Recommended Approach

**Selected: Direct Adjustment**

Modify stories 2.1-2.3 within existing Epic 2 structure and update architecture artifacts.

**Rationale:**
- No rollback needed — PRs are unmerged feature branches
- MVP scope unchanged — same features, same API contracts, better layering
- The refactoring is additive (new repository layer) not subtractive
- Stories 2.4/2.5 haven't started, naturally incorporate new structure
- Epics 3/4 will follow the new pattern when they start

**Effort:** Medium — logic already written in `PostgresIdentityService`; needs extraction into repositories, not rewriting
**Risk:** Low — API contracts unchanged, all behavior preserved, only internal layering changes
**Timeline Impact:** Minimal — 1-2 extra iterations per story for the refactor

---

## 4. Detailed Change Proposals

### 4.1 Architecture Doc (`architecture-canonical-identity.md`)

#### Change A: Interface Architecture (lines ~78-113)

**OLD:**
```
**Two ABC interfaces, constructor injection, no generics:**

- **`IdentityService`** (ABC) — core contract for canonical identity operations. Routers depend on this. Postgres-backed implementation (`PostgresIdentityService`) is the only production impl.
- **`IdentityProviderAdapter`** (ABC) — sync adapter for IdP write-through. Descope adapter is the first impl. `NoOpSyncAdapter` for testing.
- **Constructor injection:** `PostgresIdentityService(session, adapter)` — FastAPI DI wires it up.
```

**NEW:**
```
**Three interface layers (onion architecture), constructor injection, no generics:**

- **Repository layer (inner)** — ABCs for data access. Handle all SQLAlchemy queries. No business logic, no adapter calls, no OTel spans. Take `AsyncSession`, return domain objects or `Result` types.
  - `UserRepository`, `RoleRepository`, `PermissionRepository`, `TenantRepository`, `UserTenantRoleRepository`
- **`IdentityService`** (ABC) — domain service contract. Routers depend on this. Orchestrates business logic by calling repositories for persistence and adapters for sync. No direct SQLAlchemy.
  - `UserService`, `RoleService`, `PermissionService`, `TenantService`
- **`IdentityProviderAdapter`** (ABC) — sync adapter for IdP write-through (outer layer). Descope adapter is the first impl. `NoOpSyncAdapter` for testing.
- **Constructor injection:** `UserService(repository, adapter)` — repository handles DB, adapter handles IdP sync. FastAPI DI wires all layers.
```

#### Change B: Module Structure (lines ~342-374)

**OLD:**
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
```

**NEW:**
```
backend/app/
├── repositories/
│   ├── __init__.py
│   ├── user.py                  # UserRepository — SQLAlchemy user queries
│   ├── role.py                  # RoleRepository — SQLAlchemy role + role_permission queries
│   ├── permission.py            # PermissionRepository — SQLAlchemy permission queries
│   ├── tenant.py                # TenantRepository — SQLAlchemy tenant queries
│   └── assignment.py            # UserTenantRoleRepository — tenant membership queries
├── services/
│   ├── identity.py              # ABC: IdentityService (domain interface)
│   ├── user.py                  # UserService — domain logic, calls UserRepository + adapter
│   ├── role.py                  # RoleService — domain logic, calls RoleRepository + adapter
│   ├── permission.py            # PermissionService — domain logic
│   ├── tenant.py                # TenantService — domain logic
│   ├── adapters/
│   │   ├── base.py              # ABC: IdentityProviderAdapter
│   │   ├── descope.py           # DescopeSyncAdapter
│   │   └── noop.py              # NoOpSyncAdapter (testing)
│   └── descope.py               # DescopeManagementClient (existing, proxied ops only)
```

#### Change C: Service Method Pattern (lines ~425-457)

**OLD:**
```python
async def create_role(self, tenant_id: UUID, cmd: CreateRole) -> Result[Role, IdentityError]:
    with tracer.start_as_current_span("identity.create_role") as span:
        span.set_attribute("tenant.id", str(tenant_id))
        # 1. Validate
        # 2. Postgres write
        role = Role(...)
        self._session.add(role)
        await self._session.flush()
        # 3. Sync to provider
        sync_result = await self._adapter.sync_role(role)
        ...
        await self._session.commit()
        return Ok(role)
```

**NEW:**
```python
# Repository method (inner layer — data access only)
async def create(self, role: Role) -> Role:
    self._session.add(role)
    await self._session.flush()
    return role

async def commit(self) -> None:
    await self._session.commit()

# Domain service method (middle layer — orchestration)
async def create_role(self, tenant_id: UUID, cmd: CreateRole) -> Result[Role, IdentityError]:
    with tracer.start_as_current_span("identity.create_role") as span:
        span.set_attribute("tenant.id", str(tenant_id))
        # 1. Validate
        # 2. Persist via repository
        role = Role(...)
        await self._repository.create(role)
        # 3. Sync to provider (don't roll back on failure)
        sync_result = await self._adapter.sync_role(role)
        match sync_result:
            case Error(e):
                logger.warning("sync_failed", role_id=str(role.id), error=str(e))
                span.set_status(StatusCode.ERROR, "sync_failed")
        await self._repository.commit()
        return Ok(role)
```

**Key invariants updated:**
- Repository handles DB access (add, flush, query, commit)
- Domain service orchestrates: validate → repository → adapter → return
- Repository has no OTel spans, no adapter calls, no business logic
- Domain service has no direct SQLAlchemy imports

#### Change D: DI Wiring Pattern

**OLD:**
```python
async def get_identity_service(
    session: AsyncSession = Depends(get_async_session),
) -> IdentityService:
    adapter = DescopeSyncAdapter(get_descope_client())
    return PostgresIdentityService(session=session, adapter=adapter)
```

**NEW:**
```python
async def get_user_service(
    session: AsyncSession = Depends(get_async_session),
) -> UserService:
    repository = UserRepository(session)
    adapter = DescopeSyncAdapter(get_descope_client())
    return UserService(repository=repository, adapter=adapter)

async def get_role_service(
    session: AsyncSession = Depends(get_async_session),
) -> RoleService:
    repository = RoleRepository(session)
    adapter = DescopeSyncAdapter(get_descope_client())
    return RoleService(repository=repository, adapter=adapter)
```

#### Change E: Test Organization (lines ~376-392)

**OLD:**
```
backend/tests/
├── unit/
│   ├── services/
│   │   ├── test_identity_impl.py    # PostgresIdentityService (with NoOpSyncAdapter)
│   │   └── test_descope_adapter.py  # DescopeSyncAdapter (mocked httpx)
```

**NEW:**
```
backend/tests/
├── unit/
│   ├── repositories/
│   │   ├── test_user_repository.py      # UserRepository (real Postgres via testcontainers)
│   │   ├── test_role_repository.py      # RoleRepository
│   │   ├── test_permission_repository.py
│   │   └── test_tenant_repository.py
│   ├── services/
│   │   ├── test_user_service.py         # UserService (mocked repository + NoOpSyncAdapter)
│   │   ├── test_role_service.py         # RoleService
│   │   └── test_descope_adapter.py      # DescopeSyncAdapter (mocked httpx)
```

---

### 4.2 Architecture Reference (`ralph-prompts/architecture-reference.md`)

#### Change A: Enforcement Guidelines

**Add after existing rule 8:**
```
9. Repositories contain NO business logic, NO OTel spans, NO adapter calls — data access only
10. Domain services contain NO direct SQLAlchemy imports — use repository methods only
```

**Update existing rules:**
- Rule 7: "Repository tests use real Postgres via testcontainers — never mock the database"
- Rule 8: "Domain service tests use mocked repositories + `NoOpSyncAdapter` — test orchestration logic, not SQL"

#### Change B: Anti-Patterns table

**Add rows:**

| Don't | Do Instead |
|-------|-----------|
| SQLAlchemy queries in domain service | Call repository methods |
| Business logic in repository | Keep in domain service |
| `self._session` in service class | `self._repository` |
| `PostgresIdentityService` name | `UserService`, `RoleService`, etc. |

#### Change C: Key Patterns

**OLD:**
```
**Service method:** OTel span → validate → Postgres write → sync to provider → log on sync fail → commit → return Ok(result)
```

**NEW:**
```
**Repository method:** Execute query → return domain object (no spans, no logic, no adapter)

**Domain service method:** OTel span → validate → repository.save() → adapter.sync() → log on sync fail → repository.commit() → return Ok(result)
```

---

### 4.3 Story Changes

#### Story 2.1: User Service + Descope Sync Adapter (PR #201)

**OLD scope:**
- Define `IdentityService` ABC and implement `PostgresIdentityService` with user CRUD
- `PostgresIdentityService(session, adapter)` handles Postgres queries and sync

**NEW scope:**
- Define `IdentityService` ABC (domain interface) and `UserRepository` (data access)
- Implement `UserService(repository, adapter)` for domain logic — no direct SQLAlchemy
- Implement `UserRepository(session)` for all user-related SQLAlchemy queries
- DI factory composes: `session → UserRepository → UserService(repo, adapter)`

#### Story 2.2: Role, Permission + Tenant Service (PR #196)

**OLD scope:**
- Extend `PostgresIdentityService` with role, permission, and tenant methods

**NEW scope:**
- Implement `RoleRepository`, `PermissionRepository`, `TenantRepository`, `UserTenantRoleRepository`
- Implement `RoleService`, `PermissionService`, `TenantService` as domain services
- Each service takes its repository + adapter via constructor injection

#### Story 2.3: Router Rewire (PR #200)

**OLD DI:**
- Single `get_identity_service()` factory returns `PostgresIdentityService`

**NEW DI:**
- Per-domain factories: `get_user_service()`, `get_role_service()`, `get_permission_service()`, `get_tenant_service()`
- Each factory composes: repository(session) + adapter → service(repo, adapter)

#### Stories 2.4, 2.5

- 2.4 (Tests): Naturally incorporates repository tests (real Postgres) + service tests (mocked repos)
- 2.5 (E2E): No change — API contracts identical

---

## 5. Implementation Handoff

**Scope Classification:** Moderate — requires backlog reorganization (PO/SM) + architecture update (Architect) + PR rework (Developer)

### Handoff Recipients

| Role | Agent | Responsibility |
|------|-------|---------------|
| Architect | Winston | Update `architecture-canonical-identity.md` and `architecture-reference.md` |
| Developer | Ralph loop | Rework PRs #201, #196, #200 per updated architecture |
| Scrum Master | Bob | Verify sprint plan reflects changes, no new issues needed |

### Execution Sequence

1. **Architect:** Update `architecture-canonical-identity.md` (Changes A-E)
2. **Architect:** Update `architecture-reference.md` (Changes A-C)
3. **Developer:** Rework Story 2.1 (PR #201) — extract `UserRepository`, create `UserService`
4. **Developer:** Rework Story 2.2 (PR #196) — extract remaining repositories, individual services
5. **Developer:** Rework Story 2.3 (PR #200) — update DI factories, per-domain service injection
6. **Developer:** Story 2.4 (tests) — repository tests + service tests with new organization
7. **Developer:** Story 2.5 (E2E) — unchanged

### Success Criteria

- [ ] No service class imports SQLAlchemy
- [ ] No repository class calls an adapter or contains business logic
- [ ] DI factory composes: `session → repository → service(repo, adapter)`
- [ ] All existing API contracts and E2E tests pass
- [ ] Architecture doc and ralph reference reflect onion layering
- [ ] PR #201 reviewer approves the refactored design
