# Adversarial Code Review — descope-saas-starter (Re-run 2026-03-27)

Reviews run against correctly scoped diffs (base branch -> head branch), not full diff against main.

## Summary

| PR | Title | MUST FIX | SHOULD FIX | DEFER |
|----|-------|----------|------------|-------|
| #24 | Tenant Management | 5 | 7 | 5 |
| #25 | RBAC | 3 | 6 | 4 |
| #26 | Custom Attributes | 4 | 8 | 4 |
| #27 | Access Keys | 5 | 7 | 5 |
| #36 | Admin Portal | 4 | 7 | 5 |
| #37 | Security Headers | 2 | 7 | 3 |
| #56 | Rate Limiting | 3 | 7 | 3 |
| #57 | Structured Logging | 4 | 7 | 5 |
| #58 | Audit Logging | 3 | 7 | 4 |
| #59 | Health Checks | 3 | 7 | 4 |
| #60 | Retry Logic | 3 | 7 | 4 |
| #61 | FGA/ReBAC | 5 | 8 | 5 |
| **Total** | | **44** | **85** | **51** |

## Cross-Cutting Themes

Several issues appear across multiple PRs. Fixing these systemically would address many findings at once:

### 1. No tenant-scoping on user operations (CRITICAL)
- **PRs affected:** #36, #58, #61
- Admin endpoints accept arbitrary `user_id` without verifying the target belongs to the caller's tenant. Most critical in #36 where deactivate/activate/delete operates cross-tenant.

### 2. `httpx.AsyncClient` created per call — no connection pooling
- **PRs affected:** #24, #25, #26, #27, #36, #57, #59, #60, #61
- Every Descope API call creates and tears down a new HTTP client. The retry logic in #60 amplifies this (new client per retry attempt).

### 3. Unhandled `httpx.HTTPStatusError` leaks internal details
- **PRs affected:** #24, #25, #26, #27, #36, #60
- `raise_for_status()` exceptions propagate as unhandled 500s, exposing Descope API URLs and error messages.

### 4. No role hierarchy enforcement — admins can escalate to owner
- **PRs affected:** #25, #27, #36
- Admins can assign "owner" role to users/keys they control.

### 5. Bare `except Exception` swallows critical errors
- **PRs affected:** #24, #26, #56
- Auth failures, network errors, and programming bugs are caught and silently return success with empty data.

### 6. Missing input validation on Pydantic models
- **PRs affected:** #24, #26, #27, #36
- No `min_length`/`max_length` on names, no `EmailStr` for emails, no constraints on `expire_time`.

---

## PR #24 — Tenant Management (base: main)

### MUST FIX

**[M1] Tenant creation has no authorization check — any authenticated user can create tenants**
- File: `backend/app/routers/tenants.py:20-27`
- Issue: The `create_tenant` endpoint only requires `get_claims` (any authenticated user). No role or permission check. Any logged-in user can call the Descope Management API to create tenants.
- Fix: Add `require_role("owner", "admin")` dependency.

**[M2] `get_descope_client()` accepts empty management key silently**
- File: `backend/app/services/descope.py:70`
- Issue: `management_key = os.getenv("DESCOPE_MANAGEMENT_KEY", "")` defaults to empty string. Creates a client with invalid auth that fails at runtime with opaque errors.
- Fix: Use `os.environ["DESCOPE_MANAGEMENT_KEY"]` or validate non-empty. Fail fast.

**[M3] Bare `except Exception` in `get_current_tenant` swallows auth and network errors**
- File: `backend/app/routers/tenants.py:53`
- Issue: Catches everything — 401/403 from Descope, network errors, and not-found alike. Returns `tenant: None` for all. Masks credential misconfiguration.
- Fix: Catch `httpx.HTTPStatusError` separately. For 401/403, raise or log. Only return `None` for 404/not-found.

**[M4] `tenant_id` path parameter validated only against `dct` claim, not tenant membership**
- File: `backend/app/routers/tenants.py:64,78`
- Issue: Only compares path param against `dct` (current tenant). User who belongs to tenants A and B with `dct=A` cannot access B even though they're a member.
- Fix: Validate `tenant_id in tenant_claims` (membership check) or document `dct`-only as intentional.

**[M5] New `httpx.AsyncClient()` per management API call — no connection reuse, no timeout**
- File: `backend/app/services/descope.py:15-22`
- Issue: Every method creates a new TCP+TLS connection. No timeout parameter. `get_descope_client()` also recreated per request.
- Fix: Share `httpx.AsyncClient` instance via lifespan. Add explicit timeouts.

### SHOULD FIX

**[S1]** `CreateTenantRequest.name` accepts empty string — add `Field(min_length=1, max_length=256)`
**[S2]** `CreateResourceRequest.name` accepts empty string — same fix
**[S3]** SQLite `data.db` created relative to CWD — use absolute path or env var
**[S4]** Frontend `jwtDecode` no base64 padding normalization — add padding before `atob`
**[S5]** `TenantResource.created_at` stored as ISO string, not datetime column
**[S6]** No pagination on resource listing — add `limit`/`offset` params
**[S7]** `self_provisioning_domains` not validated for format

### DEFER

[D1] `get_descope_client()` factory creates new instance per call — consistent pattern
[D2] No CSRF protection — acceptable for Bearer-token-only API
[D3] Terraform tenant IDs non-deterministic — lifecycle concern
[D4] Frontend silently swallows resource creation errors — UX issue
[D5] `TenantResource.id` uses string UUID — acceptable for SQLite

---

## PR #25 — RBAC (base: feat/tenant-management)

### MUST FIX

**[M1] Admin can escalate privileges by assigning `admin` role to arbitrary users**
- File: `backend/app/routers/roles.py:37-43`
- Issue: Owner-escalation guard only checks for `"owner" in body.role_names`. Admin can assign `admin` to any user, including themselves. No role hierarchy enforcement.
- Fix: Implement role hierarchy check: admins can only assign/remove roles strictly below their level.

**[M2] Descope management API errors leak internal details to client**
- File: `backend/app/routers/roles.py:42-43,58-59`
- Issue: `raise_for_status()` exceptions propagate as unhandled 500s. Descope error body may contain internal tenant IDs.
- Fix: Wrap in try/except, return structured 400/502 with generic message.

**[M3] No validation that `user_id` exists or `role_names` are from known set**
- File: `backend/app/routers/roles.py:29-32,37-43`
- Issue: `user_id` unconstrained string passed to Descope. `role_names` accepts arbitrary values like `"superadmin"`.
- Fix: Add `Literal["owner", "admin", "member", "viewer"]` constraint on `role_names`.

### SHOULD FIX

**[S1]** `require_role` reads from JWT only — stale after role changes until token refresh
**[S2]** Frontend `RoleManagement` page accessible to all authenticated users, management form hidden client-side
**[S3]** `useRBAC` hook derives `roles`/`permissions` outside `useMemo` — unnecessary re-renders
**[S4]** `get_descope_client()` creates new client instance on every request
**[S5]** Frontend renders unsanitized error detail from server — info disclosure
**[S6]** No `require_permission("members.update_role")` check — permission definition is dead infrastructure

### DEFER

[D1] Frontend `AVAILABLE_ROLES` hardcoded, not synced with Terraform
[D2] `useCallback` for handlers may be recreated due to unstable `apiFetch` ref
[D3] No rate limiting on role assignment endpoints
[D4] Dashboard shows "Create one above" to viewers who can't create

---

## PR #26 — Custom Attributes (base: feat/rbac)

### MUST FIX

**[M1] Tenant settings PATCH has no attribute key allowlist — arbitrary attribute injection**
- File: `backend/app/routers/attributes.py:118-127`
- Issue: User profile enforces `ALLOWED_USER_ATTRIBUTES` but tenant endpoint sends whatever keys caller provides to Descope. Admin can overwrite security-sensitive tenant attributes.
- Fix: Add `ALLOWED_TENANT_ATTRIBUTES` set and validate keys.

**[M2] Silent exception swallowing hides auth/authz failures**
- File: `backend/app/routers/attributes.py:83-84,114-115`
- Issue: Bare `except Exception` returns 200 with empty data. Masks Descope auth errors, rate limits, network issues. Frontend `usePlanTier` could downgrade paying customers to free tier.
- Fix: Catch only `httpx.HTTPStatusError`. Propagate unexpected errors.

**[M3] `update_profile_attribute` does not catch Descope API errors**
- File: `backend/app/routers/attributes.py:87-100`
- Issue: Zero error handling around `update_user_custom_attribute()`. Unhandled 500 with stack trace.
- Fix: Wrap in try/except, return meaningful error responses.

**[M4] User profile uses `sub` claim as `loginId` — verify mapping**
- File: `backend/app/routers/attributes.py:69-84`
- Issue: `sub` claim used as `loginId` in Management API. If these don't map 1:1 in Descope, operations could target wrong user.
- Fix: Verify `sub == loginId` in Descope. Add documenting comment.

### SHOULD FIX

**[S1]** `get_profile` returns 200 with `user: None` when `sub` missing — should be 400/401
**[S2]** No input length/size validation on attribute values
**[S3]** `avatar_url` accepts arbitrary strings — no URL validation
**[S4]** New `httpx.AsyncClient()` per call — pre-existing but extended by 3 more methods
**[S5]** `update_tenant_custom_attributes` may overwrite all attrs, not merge
**[S6]** Frontend edit form gated by client-side `isAdmin` only
**[S7]** `usePlanTier` hook silently defaults to "free" on any error
**[S8]** `load_tenant` returns raw response vs `load_user` returns `.get("user", {})` — inconsistent

### DEFER

[D1] No timeouts or retry logic on Descope calls — pre-existing
[D2] `get_descope_client()` creates new instance per request — pre-existing
[D3] Terraform `max_members` is string, backend sends int
[D4] No rate limiting on profile/settings update endpoints

---

## PR #27 — Access Key Management (base: feat/custom-attributes)

### MUST FIX

**[M1] TOCTOU race in `_verify_key_tenant` — check and action use separate clients**
- File: `backend/app/routers/accesskeys.py:64-71,82-87,93-98,99-105`
- Issue: Two separate load+mutate calls with no atomicity. Low practical risk but architecturally unsound.
- Fix: Acknowledge limitation. Pass single client through.

**[M2] No input validation on `name` field**
- File: `backend/app/routers/accesskeys.py:58-61`
- Issue: No length constraint, no character restriction. Empty string, megabyte strings accepted.
- Fix: Add `Field(min_length=1, max_length=128)`.

**[M3] `expire_time` accepts negative values and past timestamps**
- File: `backend/app/routers/accesskeys.py:60`
- Issue: Any integer accepted, including negative. Forwarded directly to Descope.
- Fix: Add `Field(gt=0)`. Optionally validate future timestamp.

**[M4] `role_names` not validated against caller's roles — privilege escalation**
- File: `backend/app/routers/accesskeys.py:61,82-87`
- Issue: Admin can create key with `role_names=["owner"]`, escalating privileges via access key.
- Fix: Validate `role_names` subset of caller's own roles.

**[M5] Unhandled `httpx.HTTPStatusError` leaks Descope API details**
- File: All endpoints + `backend/app/services/descope.py:131-205`
- Issue: All service methods `raise_for_status()`. No error handling in router. Leaks URLs, error messages, key format.
- Fix: Wrap in try/except, translate to appropriate HTTPException.

### SHOULD FIX

**[S1]** `_verify_key_tenant` + endpoint create two separate Descope clients per call
**[S2]** Frontend silently swallows errors on deactivate/activate/delete
**[S3]** No confirmation dialog before permanent key deletion
**[S4]** `load_access_key` returns empty dict on missing `key` field — misleading 403
**[S5]** No pagination on key listing
**[S6]** Frontend `loadKeys` uses `.catch(() => {})` — silent failure
**[S7]** `copyToClipboard` does not handle clipboard API failure

### DEFER

[D1] Descope uses POST for read operations — API design, not our choice
[D2] Per-method `httpx.AsyncClient` — pre-existing pattern
[D3] No rate limiting on key creation — Descope rate limits apply
[D4] Terraform hardcoded role reference — self-documenting
[D5] No audit logging for key lifecycle events — cross-cutting concern

---

## PR #36 — Admin Portal & Member Management (base: feat/access-key-mgmt)

### MUST FIX

**[M1] No tenant-scoping on deactivate/activate/remove — cross-tenant IDOR**
- File: `backend/app/routers/users.py:40-72`
- Issue: `_tenant_id` dependency injected but **never used** (underscore prefix, discarded). Admin in tenant A can deactivate/delete any user in tenant B. No `_verify_user_tenant()` equivalent.
- Fix: Create `_verify_user_tenant(user_id, tenant_id)` analogous to `_verify_key_tenant`.

**[M2] `update_user_status` accepts arbitrary string — no validation**
- File: `backend/app/services/descope.py` (new method)
- Issue: `status` parameter typed as `str`, passed directly to Descope. No enforcement of "enabled"/"disabled".
- Fix: Add `Literal["enabled", "disabled"]` type.

**[M3] `invite_user` has no email validation**
- File: `backend/app/routers/users.py:12-13`
- Issue: `email: str` with no validation. No `EmailStr`, no regex. Arbitrary strings accepted as `loginId`.
- Fix: Use `pydantic.EmailStr`.

**[M4] No role hierarchy enforcement on invite — admin can assign "owner"**
- File: `backend/app/routers/users.py:27-36`
- Issue: `require_role("owner", "admin")` checks caller is admin, but doesn't restrict assignable roles. Admin can invite with `role_names: ["owner"]`.
- Fix: Restrict non-owners from assigning "owner" role.

### SHOULD FIX

**[S1]** No error handling on Descope API calls in router layer
**[S2]** `search_tenant_users` returns raw Descope response — potential data leak of sensitive fields
**[S3]** Frontend `/members` route has no role guard — non-admins can navigate to page
**[S4]** No confirmation dialog on remove member (irreversible)
**[S5]** Frontend silently swallows errors on toggle status and remove
**[S6]** CSP policy injectable via environment variable — no newline sanitization
**[S7]** `delete_user` is a **global** operation — deletes user from ALL tenants, not just caller's. Should use `/v1/mgmt/user/update/tenant/remove` instead.

### DEFER

[D1] Per-call `httpx.AsyncClient` — pre-existing
[D2] No pagination on `search_tenant_users`
[D3] `BaseHTTPMiddleware` performance — pre-existing
[D4] No rate limiting on invite
[D5] Tests don't cover Descope API error scenarios

---

## PR #37 — Security Headers (base: main)

### MUST FIX

**[M1] Case-sensitive environment check silently downgrades security**
- File: `backend/app/middleware/security.py:19`
- Issue: `environment == "production"` is case-sensitive. `ENVIRONMENT=Production` (capital P) falls through to development mode with permissive CSP and no HSTS.
- Fix: `self.is_production = environment.strip().lower() == "production"`

**[M2] `CSP_POLICY` env var allows complete security header bypass**
- File: `backend/app/middleware/security.py:17-20`
- Issue: Env var used verbatim with zero validation. `CSP_POLICY=""` or `CSP_POLICY=*` disables all protection.
- Fix: Validate non-empty, warn on overly permissive values.

### SHOULD FIX

**[S1]** Security headers not applied when `call_next` raises exception — error responses lack headers
**[S2]** `X-Frame-Options: DENY` hardcoded — no override. May conflict with admin portal iframe needs.
**[S3]** Missing `Permissions-Policy` header
**[S4]** Missing `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` headers
**[S5]** HSTS lacks `preload` directive
**[S6]** Tests do not cover production mode behavior — most security-critical path untested
**[S7]** Tests import full `app` singleton — coupled to global state

### DEFER

[D1] `X-XSS-Protection: 0` correct per modern recommendation
[D2] Dev CSP `http://localhost:*` — acceptable in dev
[D3] No `Cache-Control` security headers — broader concern

---

## PR #56 — Rate Limiting (base: feat/admin-portal)

### MUST FIX

**[M1] Rate limit key for unauthenticated requests uses `request.client.host` — wrong behind proxy**
- File: `backend/app/middleware/rate_limit.py:22`
- Issue: Behind load balancer, every request comes from proxy IP. All unauthenticated users share one bucket. Single attacker locks out all unauthenticated traffic.
- Fix: Use `ProxyHeadersMiddleware` to set `request.client` from trusted proxy headers.

**[M2] Middleware ordering — rate limits on protected endpoints fire AFTER auth, not before**
- File: `backend/app/main.py:46-47`
- Issue: `SlowAPIMiddleware` is a pass-through; actual checks happen at decorator level inside route handlers, which execute after `TokenValidationMiddleware`. Unauthenticated brute-force gets 401 before rate limit fires.
- Fix: Fix misleading comments. Verify `/validate-id-token` (excluded from auth) is effectively limited.

**[M3] Hardcoded `Retry-After: 60` doesn't reflect actual retry window**
- File: `backend/app/middleware/rate_limit.py:31`
- Issue: Always says 60 regardless of actual window or reset time.
- Fix: Compute from rate limit reset time.

### SHOULD FIX

**[S1]** `_inject_headers` is private API — fragile across slowapi updates
**[S2]** `get_rate_limit_key` bare `except Exception: pass` swallows all errors
**[S3]** Missing rate limiting on destructive admin endpoints (roles, users, tenants)
**[S4]** `validate_id_token` returns 200 with error body instead of proper HTTP error
**[S5]** Rate limit env var format not validated at startup
**[S6]** Test uses `get_remote_address` instead of actual `get_rate_limit_key`
**[S7]** No rate limiting on unauthenticated `/validate-id-token` replay attacks

### DEFER

[D1] In-memory rate limit storage doesn't scale horizontally — needs Redis
[D2] Env vars read at import time — consistent pattern
[D3] Test count mismatch in PR description — cosmetic

---

## PR #57 — Structured Logging (base: feat/rate-limiting)

### MUST FIX

**[M1] Health check error messages leak internal infrastructure details to unauthenticated callers**
- File: `backend/app/routers/health.py:57,67`
- Issue: Exception class names (e.g., `OperationalError`, `ConnectTimeout`) returned in response body. Reveals DB driver and HTTP library.
- Fix: Return generic "error"/"unavailable". Keep details in server-side logs only.

**[M2] Health check cache serves stale degraded results — prevents recovery detection**
- File: `backend/app/routers/health.py:62-86`
- Issue: Degraded response cached for 30s. If dependency recovers in 1s, pod stays out of rotation for 29s more.
- Fix: Only cache healthy results, or use shorter TTL (5s) for degraded.

**[M3] Race condition in health check cache under concurrent requests**
- File: `backend/app/routers/health.py:62-86`
- Issue: Module-level `_cache` dict with no lock. Concurrent requests all run checks, thundering herd.
- Fix: Use `asyncio.Lock` to serialize cache access.

**[M4] `DESCOPE_PROJECT_ID` and `DESCOPE_BASE_URL` read at import time**
- File: `backend/app/routers/health.py:20-21`
- Issue: If imported before env vars set, health check silently skips Descope and reports "ok".
- Fix: Read inside `_check_descope()` at call time.

### SHOULD FIX

**[S1]** `correlation_id_var.get("-")` redundant default — already set on ContextVar
**[S2]** `_check_descope` creates new `httpx.AsyncClient` per invocation
**[S3]** No `LOG_LEVEL` validation — invalid value crashes at startup
**[S4]** `root.handlers.clear()` nukes all handlers including pytest's
**[S5]** `BaseHTTPMiddleware` known issues with streaming responses
**[S6]** Health check dependency checks run sequentially, not concurrently
**[S7]** Frontend `useRef` flags prevent re-fetching after re-authentication

### DEFER

[D1] Broad `except Exception` in auth middleware — pre-existing
[D2] `_VALID_CID` regex allows dots — fine for tracing IDs
[D3] No test for invalid `X-Correlation-ID` replacement
[D4] Security headers `DOCS_CSP` uses `unsafe-inline` — needed for Swagger
[D5] `setup_logging()` called in lifespan, logger created at module level — works due to lazy handler resolution

---

## PR #58 — Audit Logging (base: feat/structured-logging)

### MUST FIX

**[M1] X-Forwarded-For blindly trusted — IP spoofing in audit logs**
- File: `backend/app/services/audit.py:71-74`
- Issue: Any client can forge `X-Forwarded-For` to fabricate IP in audit events. For SOC 2/ISO 27001 compliance, this is an integrity flaw.
- Fix: Only trust `X-Forwarded-For` from known proxy CIDRs, or use `request.client.host` with proper proxy config.

**[M2] Audit events only log success — failed operations invisible**
- File: All route files (audit_event after Descope call, no try/except)
- Issue: If Descope raises, audit event never emitted. Failed security-sensitive operations go unlogged.
- Fix: Wrap Descope calls in try/except, emit `result="failure"` events before re-raising.

**[M3] PII (email) logged in audit events**
- File: `backend/app/routers/users.py:39`
- Issue: `user_invited` event logs invitee email. Under GDPR/CCPA, email is PII in logs with different retention/access controls.
- Fix: Log hashed/masked email or resulting `user_id` only.

### SHOULD FIX

**[S1]** Audit logging can crash request if logger misconfigured — wrap in try/except
**[S2]** Logout audit event fires even when logout was a no-op
**[S3]** No validation or sanitization of `target` dict contents
**[S4]** `create_tenant` lacks authorization check — any authenticated user (pre-existing, now audit-visible)
**[S5]** `user_id` in user management routes not validated against tenant membership (pre-existing IDOR)
**[S6]** `AuditEventType.USER_LOGIN` defined but never used
**[S7]** `audit_event()`/`emit_audit_event()` synchronous in async handlers — blocks event loop

### DEFER

[D1] No HTTP method/path in audit events — correlation ID links to request log
[D2] No audit for read operations — scoped to write operations in Phase 1
[D3] Timestamps as ISO strings — acceptable for log-only Phase 1
[D4] Tests don't verify `actor_id` matches mocked claims in most route tests

---

## PR #59 — Health Checks (base: feat/structured-logging)

### MUST FIX

**[M1] SSRF via `DESCOPE_BASE_URL` — unauthenticated, unrate-limited health endpoint makes outbound requests**
- File: `backend/app/routers/health.py:18,46`
- Issue: `DESCOPE_BASE_URL` from env concatenated into outbound URL. Health endpoint unauthenticated. If attacker controls env, can probe internal services.
- Fix: Validate against allowlist of Descope domains or at least `https://*.descope.com`.

**[M2] Race condition on `_cache` — duplicate concurrent health checks**
- File: `backend/app/routers/health.py:24,56-60`
- Issue: Module-level `_cache` with no lock. Concurrent requests all run checks. Last writer wins.
- Fix: Use `asyncio.Lock` around cache-check-and-populate.

**[M3] Degraded health cached 30s — Kubernetes routes traffic to unhealthy pods**
- File: `backend/app/routers/health.py:70-73`
- Issue: 503 cached for full TTL. Recovery not detected for up to 30s.
- Fix: Only cache healthy results. Or use 5s TTL for degraded.

### SHOULD FIX

**[S1]** Exception type names in error responses leak stack info
**[S2]** Dependency checks run sequentially, not concurrently — use `asyncio.gather`
**[S3]** `DESCOPE_PROJECT_ID`/`DESCOPE_BASE_URL` read at import time
**[S4]** `_check_descope` returns "ok" when `DESCOPE_PROJECT_ID` is empty — should be "not_configured"
**[S5]** No test for cache TTL expiry
**[S6]** Database check connection may leak on exception during connect
**[S7]** New HTTP client per health check

### DEFER

[D1] Module-level `_cache` not process-safe — acceptable per-worker
[D2] Integration test passes without Descope configured due to skip logic
[D3] `test_health_no_auth_required` asserts `!= 401` instead of `== 200`
[D4] No OpenAPI response model on health endpoint

---

## PR #60 — Retry Logic (base: feat/structured-logging)

### MUST FIX

**[M1] New HTTP client created per retry attempt — connection storms**
- File: `backend/app/services/descope.py:69`
- Issue: `async with httpx.AsyncClient()` inside retry loop. Every retry = new TCP+TLS handshake. Under 429/503, creates connection storms.
- Fix: Move `AsyncClient` outside retry loop.

**[M2] Retrying non-idempotent mutations risks duplicate side effects**
- File: `backend/app/services/descope.py:67-98`
- Issue: Retry applies to `create_tenant`, `invite_user`, `delete_user`. 502/503 doesn't guarantee server didn't process request. Can create duplicates.
- Fix: Limit auto-retry to read-only/idempotent operations. Add `retryable` parameter.

**[M3] Environment variables crash on invalid values at import time**
- File: `backend/app/services/descope.py:38-40`
- Issue: `int(os.getenv("DESCOPE_MAX_RETRIES", "3"))` at import time. `abc` = crash. `-1` = zero attempts, `raise None` = TypeError.
- Fix: Add validation helper with clamping and fallback.

### SHOULD FIX

**[S1]** `raise last_exc` unreachable for status-code retries — dead code path
**[S2]** No timeout configured on `httpx.AsyncClient`
**[S3]** `Retry-After` header from 429 responses is ignored
**[S4]** `httpx.HTTPStatusError` not caught by except clause — confusing control flow
**[S5]** Sensitive data (paths) logged without correlation ID
**[S6]** `_backoff_delay` reads module-level globals — not testable in isolation
**[S7]** `500` not in `RETRYABLE_STATUS_CODES` — intentional but undocumented

### DEFER

[D1] Per-call `AsyncClient` pre-existing — M1 addresses amplification
[D2] `random` module for jitter — correct choice
[D3] No test for `MAX_RETRIES=0`
[D4] Test mock response used outside `async with` context — fine for non-streaming

---

## PR #61 — FGA/ReBAC (base: feat/retry-logic)

### MUST FIX

**[M1] FGA relation created but DB commit can fail — orphaned FGA relation**
- File: `backend/app/routers/documents.py:200-206`
- Issue: FGA owner relation created first, then DB commit. If commit fails, FGA relation persists with no document row. No compensating rollback.
- Fix: Add try/except: if commit fails, `delete_relation` to compensate.

**[M2] FGA permission check before tenant scoping — information leak**
- File: `backend/app/routers/documents.py:236-247`
- Issue: FGA check uses only `document_id` + `user_id`, not tenant. Cross-tenant user with FGA relation passes check. Timing leak reveals document existence.
- Fix: Incorporate `tenant_id` into FGA dependency. Verify document's tenant.

**[M3] `get_fga_client()` creates new client per call — multiple per request**
- File: `backend/app/services/fga.py:432-437`
- Issue: FGA client called multiple times per request (e.g., `require_fga` dep + inline call). Each creates new HTTP client.
- Fix: Cache as singleton or use FastAPI dependency injection.

**[M4] `delete_document` doesn't handle partial FGA relation cleanup failure**
- File: `backend/app/routers/documents.py:273-294`
- Issue: Iterates and deletes FGA relations one by one. If third deletion fails, some deleted, some not. Document then deleted from DB, leaving dangling relations.
- Fix: If any relation deletion fails, abort DB delete. Or collect failures and report.

**[M5] `share_document` allows sharing with any user ID — no tenant membership check**
- File: `backend/app/routers/documents.py:297-313`
- Issue: Owner can share with arbitrary `user_id` string, including users in other tenants or non-existent users.
- Fix: Validate `body.user_id` is a real user in the current tenant.

### SHOULD FIX

**[S1]** `revoke_share` blindly deletes both viewer/editor without checking existence
**[S2]** Inconsistent 400 vs 401 for missing `sub` claim across endpoints
**[S3]** No pagination on `list_documents` — unbounded FGA + DB results
**[S4]** `Document.created_at` stored as string, not datetime
**[S5]** `Document.title` no length validation
**[S6]** `list_documents` returns early on empty viewable_ids — timing leak
**[S7]** Frontend `handleDelete` doesn't check response status
**[S8]** FGA dependency hardcodes `document_id` path parameter name

### DEFER

[D1] `get_fga_client()` duplicates `get_descope_client()` pattern — pre-existing
[D2] Frontend uses inline styles — consistent codebase pattern
[D3] No audit logging for share/revoke operations
[D4] FGA schema makes owner/editor implicitly viewers — correct ReBAC behavior
[D5] Tests use shared in-memory SQLite with no cleanup
