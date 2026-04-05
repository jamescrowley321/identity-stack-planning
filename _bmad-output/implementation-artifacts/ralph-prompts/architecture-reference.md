# Architecture Quick Reference — Canonical Identity

Extracted from the full architecture doc. Read the full doc only during `analyze` phase.

## Enforcement Guidelines (mandatory)

1. `AsyncSession` only — never sync `Session` or `create_engine()`
2. Domain service methods return `Result[T, IdentityError]` — never `raise` for domain errors
3. Routers use `result_to_response()` — never construct `ProblemDetailResponse` manually
4. Pass `tenant_id` explicitly to every tenant-scoped method
5. OTel spans with domain attributes on every domain service method (NOT in repositories)
6. Alembic for ALL schema changes — never `create_all()` or raw DDL
7. Repository tests use real Postgres via testcontainers — never mock the database
8. Domain service tests use mocked repositories + `NoOpSyncAdapter` — test orchestration logic, not SQL
9. Repositories contain NO business logic, NO OTel spans, NO adapter calls — data access only
10. Domain services contain NO direct SQLAlchemy imports — use repository methods only
11. Follow existing router patterns (rate limiting, role enforcement) unchanged
12. FGA/access key routes stay on `DescopeManagementClient` — not through domain services
13. Run `make lint` before every commit

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| `raise HTTPException(404)` | `return Error(NotFound(...))` → `result_to_response()` |
| Sync `Session` or `create_engine()` | `AsyncSession` via `async_sessionmaker` |
| `create_all()` in startup | Alembic migration |
| `get_descope_client()` in canonical routers | `Depends(get_user_service)` / `Depends(get_role_service)` / etc. |
| Implicit tenant from JWT in service layer | Explicit `tenant_id: UUID` parameter |
| Mock Postgres with SQLite | `testcontainers[postgres]` |
| SQLAlchemy queries in domain service | Call repository methods |
| Business logic in repository | Keep in domain service |
| `self._session` in service class | `self._repository` |
| `PostgresIdentityService` (god class) | `UserService`, `RoleService`, `PermissionService`, `TenantService` |

## Key Patterns

**Repository method:** Execute SQLAlchemy query → return domain object (no spans, no logic, no adapter calls)

**Domain service method:** OTel span → validate → repository.save() → adapter.sync() → log on sync fail → repository.commit() → return Ok(result)

**Router:** `Depends(get_user_service)` → call service → `result_to_response(result, status=201)`

**Sync adapter:** try httpx call → Ok(None) on success → Error(SyncError(...)) on failure

**Write-through invariant:** Postgres first (via repository), sync second (via adapter). Sync failure → log warning, never rollback.

**DI composition (at the edge):**
```python
async def get_user_service(session = Depends(get_async_session)) -> UserService:
    repository = UserRepository(session)
    adapter = DescopeSyncAdapter(get_descope_client())
    return UserService(repository=repository, adapter=adapter)
```

## Onion Layer Rules

| Layer | Contains | Depends On | Never Depends On |
|-------|----------|------------|-----------------|
| Repository (inner) | SQLAlchemy queries, data mapping | AsyncSession, SQLModel | Adapters, domain services, OTel |
| Domain Service (middle) | Business logic, orchestration, OTel spans | Repository interfaces, adapter interfaces | AsyncSession, SQLAlchemy, httpx |
| Adapter (outer) | IdP API calls, error mapping | httpx, DescopeManagementClient | Repository, domain service |
| Router (edge) | HTTP handling, DI composition | Domain service, result_to_response | Repository, adapter directly |

## Error Type Registry

| Error | URI | HTTP Status |
|-------|-----|-------------|
| NotFound | /errors/not-found | 404 |
| Conflict | /errors/conflict | 409 |
| ValidationError | /errors/validation | 422 |
| SyncFailed | /errors/sync-failed | 207 |
| ProviderError | /errors/provider-error | 502 |
| Forbidden | /errors/forbidden | 403 |
