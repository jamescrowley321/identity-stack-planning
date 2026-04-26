# Repository Base Class Refactor

## Goal

Extract a generic `BaseRepository[T]` from the 7 concrete repository classes in `backend/app/repositories/`. Every repository duplicates `__init__`, `commit`, `rollback`, `create`, `update`, `get`, and `delete`. The base class consolidates these. Each concrete repo inherits and adds only domain-specific queries.

Additionally, `RepositoryConflictError` is defined in `user.py` and imported from there by every other repo — it must move to its own module.

## Scope

**In scope:**
- Extract `BaseRepository[T]` with shared CRUD + transaction methods
- Move `RepositoryConflictError` out of `user.py`
- Fix inconsistent rollback-on-conflict behavior (some repos rollback, some don't — pick one policy)
- Update all 7 repos to inherit from base
- Update all existing unit tests to work with refactored repos
- Add Playwright E2E tests: API suite AND UI suite (see below)

**Out of scope:**
- Changing service layer code (services should not need changes — repo interfaces stay the same)
- Changing router code
- Changing models

## Current State

Seven repositories, all in `backend/app/repositories/`:

| File | Class | Domain-Specific Methods |
|------|-------|------------------------|
| `user.py` | `UserRepository` | `get_by_email`, `search`, `list_all`, `exists_in_tenant` |
| `role.py` | `RoleRepository` | `get_by_name`, `list_by_tenant`, `add_permission`, `remove_permission`, `get_permissions`, `delete` |
| `permission.py` | `PermissionRepository` | `get_by_name`, `list_all`, `delete` |
| `tenant.py` | `TenantRepository` | `get_by_name`, `list_all`, `get_users_with_roles` |
| `provider.py` | `ProviderRepository` | `get_by_type`, `get_by_name`, `list_all` |
| `idp_link.py` | `IdPLinkRepository` | `get_by_provider_and_sub`, `get_by_provider_name_and_sub`, `get_by_user`, `delete` |
| `assignment.py` | `UserTenantRoleRepository` | `get` (composite key), `list_by_user_tenant`, `list_by_user`, `delete`, `delete_by_user_tenant` |

**Duplicated in every repo (move to base):**
- `__init__(self, session: AsyncSession)` + `self._session = session`
- `commit()` → `await self._session.commit()`
- `rollback()` → `await self._session.rollback()`
- `create(entity)` → `session.add()` → `flush()` → catch `IntegrityError` → raise `RepositoryConflictError`
- `update(entity)` → `flush()` → catch `IntegrityError` → raise `RepositoryConflictError`
- `get(id)` → `session.get(Model, id)`

**Inconsistency to fix:** `user.py` and `provider.py` call `await self._session.rollback()` before raising `RepositoryConflictError` in `create`/`update`. Other repos do not. `idp_link.py` has a comment saying "Does NOT rollback — the caller owns the transaction." Pick one policy:
- **Recommended: do NOT rollback in the repository.** The service layer owns the transaction boundary. The repo should raise and let the service decide. This matches the `idp_link.py` comment and the onion architecture contract. Remove the rollback calls from `user.py` and `provider.py`.

## Implementation

### Step 1: Create `base.py`

Create `backend/app/repositories/base.py`:

```python
from __future__ import annotations

import uuid
from typing import Generic, TypeVar

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class RepositoryConflictError(Exception):
    """Raised when a database constraint violation indicates a conflict."""


class BaseRepository(Generic[T]):
    """Base repository with shared CRUD and transaction operations.

    Subclasses set `_model` class attribute to their SQLAlchemy model.
    """

    _model: type[T]

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, entity: T) -> T:
        self._session.add(entity)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise RepositoryConflictError(str(exc)) from exc
        return entity

    async def get(self, entity_id: uuid.UUID) -> T | None:
        return await self._session.get(self._model, entity_id)

    async def update(self, entity: T) -> T:
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise RepositoryConflictError(str(exc)) from exc
        return entity

    async def delete(self, entity_id: uuid.UUID) -> bool:
        import sqlalchemy as sa
        stmt = sa.delete(self._model).where(self._model.id == entity_id)
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.rowcount > 0

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
```

### Step 2: Refactor each repository

Each concrete repo:
1. Inherits `BaseRepository[ModelType]`
2. Sets `_model = ModelType`
3. Removes duplicated methods (`__init__`, `commit`, `rollback`, `create`, `update`, `get`)
4. Keeps only domain-specific methods
5. Imports `RepositoryConflictError` from `base` (not from `user`)

**Special cases:**
- `UserTenantRoleRepository.get()` uses a composite key `(user_id, tenant_id, role_id)` — override `get()` in the subclass, don't use the base `get(uuid)`.
- `UserRepository.create()` and `ProviderRepository.create()` currently rollback on conflict — remove the rollback to match the new policy.
- `_escape_like` helper in `user.py` stays in `user.py` (it's user-specific).

### Step 3: Update `__init__.py`

Export `BaseRepository` and `RepositoryConflictError` from `__init__.py` so other modules can import from `app.repositories` directly.

### Step 4: Update imports across codebase

Find all `from app.repositories.user import RepositoryConflictError` and change to `from app.repositories.base import RepositoryConflictError` (or from `app.repositories` if re-exported).

### Step 5: Verify

```bash
cd ~/repos/auth/identity-stack && make lint && make test-unit
```

All existing tests must pass unchanged (except import paths for `RepositoryConflictError`).

## Testing Requirements

### Unit Tests (existing — update as needed)

The 7 existing test files in `backend/tests/unit/repositories/` must pass. Update imports for `RepositoryConflictError` if needed. Add:

- Test that `BaseRepository` generic CRUD works with a simple model
- Test that `RepositoryConflictError` is importable from `app.repositories.base`
- Test that subclass domain methods still work (existing tests cover this)

### Playwright E2E — API Suite

Add `backend/tests/e2e/test_identity_repository_api.py`. These tests hit the running backend API (not the browser) using Playwright's `APIRequestContext` fixtures (`admin_api_context`, `auth_api_context`, `api_context`).

**Purpose:** Validate that the repository refactor did not break any API behavior. The existing E2E tests (`test_identity_crud_e2e.py`, `test_rbac_api.py`) already cover RBAC and identity CRUD. This new file should cover **cross-entity consistency** that exercises multiple repos in a single flow:

1. **Full lifecycle chain** — Create a permission → create a role with that permission → create a user → assign the role to the user in a tenant → verify the user's roles → remove assignment → delete role → delete permission. This exercises `PermissionRepository`, `RoleRepository`, `UserRepository`, `TenantRepository`, and `UserTenantRoleRepository` in one flow.

2. **Conflict handling** — Create a resource, attempt to create a duplicate, verify 409. Then delete and re-create to verify the conflict is gone. This validates `RepositoryConflictError` propagates correctly through service → router → HTTP response.

3. **Concurrent entity operations** — Create multiple permissions and roles in sequence, verify all exist, delete all, verify cleanup. Validates flush/commit consistency across the base class.

Follow the existing patterns from `test_rbac_api.py`:
- Use `_unique_name()` for test resource names
- Use `_timed_request()` with `MAX_API_RESPONSE_MS` assertions
- Use `try/finally` with cleanup
- Skip if `DESCOPE_MANAGEMENT_KEY` not set

### Playwright E2E — UI Suite

Add `backend/tests/e2e/test_identity_repository_ui.py`. These tests use Playwright's browser automation (`auth_page` fixture) to verify the frontend renders correctly after the refactor.

**Purpose:** Validate that the UI still displays identity data correctly. The repository layer feeds the API, which feeds the React frontend.

1. **Authenticated navigation** — Log in (via token injection), navigate to each identity-related page (users, roles, permissions, tenants), verify the page loads without errors.

2. **Data display** — After creating a test role via API (`admin_api_context`), navigate to the roles page in the browser and verify the role appears in the list. Clean up after.

3. **Error states** — Navigate to a nonexistent resource URL (e.g., `/admin/users/{random-uuid}`), verify the UI shows an appropriate error state rather than crashing.

Follow the existing patterns from `test_authenticated_ui.py`:
- Use `auth_page` fixture for authenticated browser context
- Use `expect(page.get_by_role(...))` and `expect(page.locator(...))` assertions
- Use `page.goto()` for navigation
- Skip if `DESCOPE_MANAGEMENT_KEY` not set

### Running Tests

```bash
# Unit tests (fast, no external deps beyond testcontainers postgres)
cd ~/repos/auth/identity-stack && make test-unit

# E2E tests (requires running frontend + backend + Descope credentials)
cd ~/repos/auth/identity-stack && make test-e2e
```

## Acceptance Criteria

- [ ] `BaseRepository[T]` exists in `backend/app/repositories/base.py` with `create`, `get`, `update`, `delete`, `commit`, `rollback`
- [ ] `RepositoryConflictError` is defined in `base.py`, not `user.py`
- [ ] All 7 concrete repositories inherit from `BaseRepository` and set `_model`
- [ ] No repository duplicates `__init__`, `commit`, `rollback`, or the `IntegrityError` → `RepositoryConflictError` pattern
- [ ] Rollback-on-conflict inconsistency is resolved (repos do NOT rollback — service layer owns transaction)
- [ ] `make lint` passes
- [ ] All existing unit tests pass (`make test-unit`)
- [ ] All existing E2E tests pass (`make test-e2e`)
- [ ] New Playwright API E2E tests exist and pass
- [ ] New Playwright UI E2E tests exist and pass
- [ ] No changes to service layer, router layer, or models (interfaces unchanged)
