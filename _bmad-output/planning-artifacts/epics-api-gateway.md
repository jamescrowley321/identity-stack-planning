---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-api-gateway.md
  - _bmad-output/planning-artifacts/architecture-api-gateway.md
---

# API Gateway & Deployment Topology — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for PRD 2: API Gateway & Deployment Topology. All work is confined to the identity-stack (identity-stack) repository. Each story is scoped to a single PR.

## Requirements Inventory

### Functional Requirements

- FR-1 through FR-10: Tyk Gateway Integration (Epic 1)
- FR-11 through FR-17: Middleware Migration (Epic 2)
- FR-18 through FR-22: Deployment Mode Toggle (Epic 3)
- FR-23 through FR-29: Docker Compose Profiles (Epic 4)

### Non-Functional Requirements

- NFR-1: Gateway mode < 10ms p95 added latency
- NFR-2: Tyk JWKS cached internally
- NFR-3: Redis < 50MB for dev workloads
- NFR-4: TYK_GATEWAY_SECRET not hardcoded
- NFR-5: Tyk rejects invalid JWTs with 401 before backend
- NFR-6: Standalone mode JWT validation identical to pre-gateway
- NFR-7: Standalone mode does not trust gateway headers
- NFR-8: No secrets in version-controlled files
- NFR-9: Default Docker Compose behavior unchanged
- NFR-10: All existing unit tests pass in both modes
- NFR-11: All existing frontend behavior preserved
- NFR-12: Removing `tyk/` directory restores pre-gateway state
- NFR-13: Unit tests for middleware factory covering both modes
- NFR-14: Unit test for DEPLOYMENT_MODE validation
- NFR-15: Integration test: standalone profile health check
- NFR-16: Integration test: gateway profile health check via Tyk
- NFR-17: Integration test: expired JWT rejected by Tyk
- NFR-18: API definitions in `tyk/apps/` are single source of truth
- NFR-19: Middleware factory is sole location for mode-conditional logic
- NFR-20: Auth/authz boundary documented in code

### FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR-1 | Epic 1 | 1.1 | Add `tyk/` directory structure |
| FR-2 | Epic 1 | 1.1 | Configure `tyk.conf` with file-based mode |
| FR-3 | Epic 1 | 1.2 | API definition JSON for backend proxy |
| FR-4 | Epic 1 | 1.2 | JWT validation config in API definition |
| FR-5 | Epic 1 | 1.2 | Dual-issuer support for Descope |
| FR-6 | Epic 1 | 1.3 | Docker Compose services for Tyk + Redis |
| FR-7 | Epic 1 | 1.1 | TYK_GATEWAY_SECRET via env var |
| FR-8 | Epic 1 | 1.3 | Service dependency chain |
| FR-9 | Epic 1 | 1.2 | Forward Authorization header |
| FR-10 | Epic 1 | 1.4 | Verify proxy header forwarding |
| FR-11 | Epic 2 | 2.1 | Middleware factory function |
| FR-12 | Epic 2 | 2.2 | Gateway mode skips TokenValidation + SlowAPI |
| FR-13 | Epic 2 | 2.2 | Standalone mode identical to current |
| FR-14 | Epic 2 | 2.1 | Refactor main.py to use factory |
| FR-15 | Epic 2 | 2.3 | Rate limiting config in Tyk |
| FR-16 | Epic 2 | 2.2 | Rate limiter state registered in gateway mode |
| FR-17 | Epic 2 | 2.4 | Authorization factories work in both modes |
| FR-18 | Epic 3 | 3.1 | DEPLOYMENT_MODE env var with validation |
| FR-19 | Epic 3 | 3.1 | Startup-time evaluation |
| FR-20 | Epic 3 | 3.1 | Startup logging of mode and middleware |
| FR-21 | Epic 3 | 3.2 | DEPLOYMENT_MODE in Docker Compose |
| FR-22 | Epic 3 | 3.1 | Document v2 OpenFeature upgrade path |
| FR-23 | Epic 4 | 4.1 | Three Docker Compose profiles defined |
| FR-24 | Epic 4 | 4.1 | Default profile = frontend + backend only |
| FR-25 | Epic 4 | 4.2 | Gateway profile = 4 containers |
| FR-26 | Epic 4 | 4.2 | Full profile = gateway + placeholders |
| FR-27 | Epic 4 | 4.3 | Frontend VITE_API_BASE_URL per profile |
| FR-28 | Epic 4 | 4.3 | Backend DEPLOYMENT_MODE per profile |
| FR-29 | Epic 4 | 4.1 | Profile usage documentation in compose file |

## Epic List

### Epic 1: Tyk Gateway Integration
A developer can add the Tyk OSS API gateway to identity-stack with JWT validation for Descope tokens and reverse proxy to the FastAPI backend, using version-controlled configuration files.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10

### Epic 2: Middleware Migration
The FastAPI backend conditionally assembles its middleware stack based on deployment mode, offloading JWT validation and rate limiting to Tyk in gateway mode while preserving identical behavior in standalone mode.
**FRs covered:** FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17

### Epic 3: Deployment Mode Toggle
A single `DEPLOYMENT_MODE` environment variable controls whether the application runs in standalone or gateway mode, evaluated once at startup with clear logging and validation.
**FRs covered:** FR-18, FR-19, FR-20, FR-21, FR-22

### Epic 4: Docker Compose Profiles
Docker Compose profiles control which containers start, with the default (no flag) providing the standalone experience and explicit `--profile gateway` adding Tyk infrastructure, all with automatic API URL resolution.
**FRs covered:** FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29

---

## Epic 1: Tyk Gateway Integration

A developer can add the Tyk OSS API gateway to identity-stack with JWT validation for Descope tokens and reverse proxy to the FastAPI backend, using version-controlled configuration files.

### Story 1.1: Create Tyk Configuration Directory

As a developer setting up the gateway,
I want a `tyk/` directory with the gateway configuration file and placeholder directories,
So that all Tyk configuration is version-controlled and self-contained.

**Acceptance Criteria:**

- [ ] `tyk/` directory exists at the repo root containing `tyk.conf`, `apps/` (empty), `policies/` (empty), and `middleware/` (empty placeholder)
- [ ] `tyk.conf` configures `use_db_app_configs: false` (file-based mode), Redis connection to `tyk-redis` service on port 6379, and file-based policy source pointing to `/opt/tyk-gateway/policies/policies.json` (FR-1, FR-2)
- [ ] `tyk.conf` does NOT hardcode the gateway secret — it uses the `TYK_GW_SECRET` environment variable passed through Docker Compose (FR-7, NFR-4)
- [ ] `tyk/policies/policies.json` contains a default policy skeleton (empty policy array or minimal default)
- [ ] A `.gitkeep` file in `tyk/middleware/` preserves the empty directory for future plugin use
- [ ] Removing the `tyk/` directory has no impact on backend or frontend code (NFR-12)

### Story 1.2: Create API Definition for Backend Proxy

As a developer configuring the gateway,
I want an API definition JSON file that proxies `/api/*` to the FastAPI backend with Descope JWT validation,
So that Tyk authenticates requests before they reach the backend.

**Acceptance Criteria:**

- [ ] `tyk/apps/saas-backend.json` defines an API that listens on `/api/` and proxies to `http://backend:8000/api/` with `strip_listen_path: false` and `preserve_host_header: true` (FR-3)
- [ ] JWT validation is configured using `use_openid: true` with `openid_options.providers` containing two entries for Descope's dual-issuer format: `https://api.descope.com/{project_id}` (OIDC) and `https://api.descope.com/v1/apps/{project_id}` (session tokens) (FR-4, FR-5)
- [ ] `jwt_identity_base_field` is set to `sub` for identity extraction
- [ ] The API definition does NOT strip the `Authorization` header — it is forwarded to the backend so FastAPI authorization logic can decode tenant claims (FR-9)
- [ ] The API definition includes a docstring comment or `x-description` field documenting the auth/authz boundary: "Tyk validates token authenticity; FastAPI checks tenant-scoped roles/permissions" (NFR-20)
- [ ] `DESCOPE_PROJECT_ID` in the API definition is parameterized (placeholder value with documentation for substitution via env var or startup script)

### Story 1.3: Add Tyk and Redis Docker Compose Services

As a developer running the gateway stack,
I want `tyk-gateway` and `tyk-redis` services in `docker-compose.yml` under the `gateway` profile,
So that running `docker compose --profile gateway up` starts the full gateway topology.

**Acceptance Criteria:**

- [ ] `tyk-gateway` service uses `tykio/tyk-gateway:v5.3` image, exposes port 8080, and mounts `tyk/tyk.conf`, `tyk/apps/`, `tyk/middleware/`, and `tyk/policies/` as volumes (FR-6)
- [ ] `tyk-redis` service uses `redis:7-alpine` image with a named volume for data persistence (FR-6)
- [ ] `tyk-gateway` depends on `tyk-redis` and `backend` services (FR-8)
- [ ] Both services are under `profiles: ["gateway", "full"]` — they do NOT start with the default (no profile) `docker compose up` (FR-6, NFR-9)
- [ ] `TYK_GATEWAY_SECRET` is sourced from `.env` via `${TYK_GATEWAY_SECRET}` environment variable substitution — not hardcoded (NFR-4, NFR-8)
- [ ] `.env.example` is updated with a `TYK_GATEWAY_SECRET=` placeholder entry
- [ ] Running `docker compose up` (no profile) starts only `frontend` and `backend` — identical to pre-gateway behavior (NFR-9)

### Story 1.4: Verify Gateway Proxy and Header Forwarding

As a developer validating the gateway setup,
I want to verify that Tyk correctly proxies requests and forwards headers to the backend,
So that I can confirm the gateway is functioning before proceeding with middleware migration.

**Acceptance Criteria:**

- [ ] Tyk proxies `GET /api/health` on port 8080 to the backend's `/api/health` endpoint and returns the correct response
- [ ] Tyk sets `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Real-IP` headers on proxied requests (FR-10)
- [ ] The original `Authorization: Bearer <token>` header is present in the request received by the backend (FR-9)
- [ ] A request with an invalid/expired JWT is rejected by Tyk with HTTP 401 before reaching the backend (NFR-5)
- [ ] A request with no `Authorization` header to a protected endpoint is rejected by Tyk with HTTP 401 (NFR-5)
- [ ] An integration test script or Makefile target documents the verification steps for future regression testing (NFR-16, NFR-17)

### Story 1.5: Configure Health Check Endpoint Passthrough

As a developer operating the gateway,
I want the `/api/health` endpoint to be accessible without authentication through Tyk,
So that health checks and readiness probes work without a JWT.

**Acceptance Criteria:**

- [ ] The Tyk API definition includes a whitelist or `ignored_paths` entry for `/api/health` that bypasses JWT validation
- [ ] `GET http://localhost:8080/api/health` returns 200 without an `Authorization` header when the gateway profile is running
- [ ] All other `/api/*` endpoints still require a valid JWT
- [ ] The standalone mode health check behavior is unchanged (`GET http://localhost:8000/api/health` returns 200)

---

## Epic 2: Middleware Migration

The FastAPI backend conditionally assembles its middleware stack based on deployment mode, offloading JWT validation and rate limiting to Tyk in gateway mode while preserving identical behavior in standalone mode.

### Story 2.1: Create Middleware Factory Module

As a developer maintaining the middleware stack,
I want a middleware factory function that assembles the middleware stack based on `DEPLOYMENT_MODE`,
So that deployment-mode-conditional logic is centralized in one location.

**Acceptance Criteria:**

- [ ] `app/middleware/factory.py` exists with a `configure_middleware(app)` function that reads `DEPLOYMENT_MODE` and assembles the middleware stack accordingly (FR-11)
- [ ] `app/main.py` is refactored to call `configure_middleware(app)` instead of inline `app.add_middleware()` calls (FR-14)
- [ ] The middleware registration order is preserved exactly: outermost (ProxyHeaders) → CorrelationId → SecurityHeaders → SlowAPI → TokenValidation → CORS (innermost) — matching the current implementation (FR-14)
- [ ] The factory is the sole location for deployment-mode-conditional logic — no scattered `if DEPLOYMENT_MODE == "gateway"` checks in individual middleware modules (NFR-19)
- [ ] The factory module includes a docstring documenting the auth/authz boundary and the v2 OpenFeature upgrade path (FR-22, NFR-20)
- [ ] All existing backend unit tests pass without modification after the refactor (NFR-10)

### Story 2.2: Implement Conditional Middleware Assembly

As a developer deploying in gateway mode,
I want the middleware factory to skip `TokenValidationMiddleware` and `SlowAPIMiddleware` when `DEPLOYMENT_MODE=gateway`,
So that Tyk handles authentication and rate limiting without duplicate enforcement.

**Acceptance Criteria:**

- [ ] In `gateway` mode, the middleware factory does NOT add `TokenValidationMiddleware` or `SlowAPIMiddleware` to the stack (FR-12)
- [ ] In `gateway` mode, the remaining middleware (CORSMiddleware, SecurityHeadersMiddleware, CorrelationIdMiddleware, ProxyHeadersMiddleware) continues to execute in FastAPI (FR-12)
- [ ] In `standalone` mode, the middleware factory assembles the identical stack to the current implementation — all 6 middleware layers active (FR-13)
- [ ] In `gateway` mode, the rate limiter state (`app.state.limiter`) and exception handler (`RateLimitExceeded`) are still registered to prevent import errors from `@limiter` decorators on route handlers (FR-16)
- [ ] Unit tests verify correct middleware inclusion/exclusion for each mode (NFR-13)
- [ ] Unit test confirms that standalone mode produces the exact same middleware stack as the pre-factory implementation

### Story 2.3: Configure Rate Limiting in Tyk

As a developer offloading rate limiting,
I want rate limiting configured in the Tyk API definition matching the current FastAPI limits,
So that the same rate limits are enforced at the gateway layer.

**Acceptance Criteria:**

- [ ] The Tyk API definition (`tyk/apps/saas-backend.json`) includes a global rate limit of 60 requests/minute (matching current SlowAPI default) (FR-15)
- [ ] Auth endpoints (`/api/validate-id-token`) have a specific rate limit of 10 requests/minute in the API definition's `extended_paths.rate_limit` (FR-15)
- [ ] Rate limit responses from Tyk return HTTP 429 (consistent with SlowAPI behavior)
- [ ] Rate limiting uses Redis-backed distributed counters (automatic with Tyk + Redis)
- [ ] Redis memory usage for rate limiting stays under 50MB for typical dev workloads (NFR-3)

### Story 2.4: Verify Authorization Independence from Deployment Mode

As a developer ensuring authorization correctness,
I want to verify that `require_role()` and `require_permission()` work identically in both modes,
So that tenant-scoped authorization is never affected by the deployment topology.

**Acceptance Criteria:**

- [ ] `require_role()` and `require_permission()` dependency factories decode tenant claims from the forwarded `Authorization` header in both standalone and gateway modes (FR-17)
- [ ] In gateway mode, the authorization factories decode the JWT for claims extraction without re-validating the signature (Tyk already validated it)
- [ ] In standalone mode, `TokenValidationMiddleware` validates the signature first, then authorization factories decode claims (existing behavior)
- [ ] Unit tests for `require_role()` and `require_permission()` pass without modification in both modes (NFR-10)
- [ ] An integration test confirms that an authenticated request with insufficient tenant roles returns 403 Forbidden when routed through Tyk (authorization enforcement works end-to-end)

### Story 2.5: Verify Standalone Mode Regression-Free

As a developer maintaining backwards compatibility,
I want to confirm that standalone mode is bit-for-bit identical to the pre-gateway behavior,
So that existing deployments without a gateway are not affected.

**Acceptance Criteria:**

- [ ] All existing backend unit tests pass with `DEPLOYMENT_MODE=standalone` (NFR-10)
- [ ] All existing backend unit tests pass with `DEPLOYMENT_MODE` unset (defaults to `standalone`) (NFR-10)
- [ ] The middleware stack order in standalone mode matches the pre-refactor `main.py` exactly
- [ ] `TokenValidationMiddleware` rejects invalid tokens identically to the pre-gateway implementation (NFR-6)
- [ ] A request with a forged `X-Tyk-Request-ID` header in standalone mode does not bypass authentication (NFR-7)
- [ ] Integration test: `docker compose up` → `GET /api/health` returns 200 (NFR-15)

---

## Epic 3: Deployment Mode Toggle

A single `DEPLOYMENT_MODE` environment variable controls whether the application runs in standalone or gateway mode, evaluated once at startup with clear logging and validation.

### Story 3.1: Implement DEPLOYMENT_MODE Environment Variable

As a developer configuring the deployment mode,
I want a `DEPLOYMENT_MODE` environment variable with validation and logging,
So that the application fails fast on invalid configuration and clearly reports its active mode.

**Acceptance Criteria:**

- [ ] `DEPLOYMENT_MODE` accepts exactly two valid values: `standalone` (default) and `gateway` (FR-18)
- [ ] If `DEPLOYMENT_MODE` is unset, it defaults to `standalone` (FR-18)
- [ ] If `DEPLOYMENT_MODE` is set to an invalid value (e.g., `production`, `both`, empty string), the application raises a `ValueError` at startup with a clear error message listing valid values (FR-18)
- [ ] `DEPLOYMENT_MODE` is evaluated once at application startup (import time of the middleware factory module) — it is NOT re-evaluated per request (FR-19)
- [ ] At startup (INFO level), the middleware factory logs: which mode is active, and which middleware layers are included vs. excluded (FR-20)
- [ ] The middleware factory module includes a code comment documenting the v2 upgrade path: "Replace os.getenv('DEPLOYMENT_MODE') with OpenFeature client.get_string_value('deployment_mode', 'standalone') for hot-toggle and per-feature flag support" (FR-22)
- [ ] Unit test verifies startup error on invalid `DEPLOYMENT_MODE` values (NFR-14)
- [ ] Unit test verifies default to `standalone` when `DEPLOYMENT_MODE` is unset

### Story 3.2: Wire DEPLOYMENT_MODE into Docker Compose

As a developer switching between deployment modes,
I want `DEPLOYMENT_MODE` set automatically based on the Docker Compose profile,
So that I never need to manually edit `.env` when switching profiles.

**Acceptance Criteria:**

- [ ] The `backend` service in `docker-compose.yml` sets `DEPLOYMENT_MODE=standalone` in its default environment (FR-21)
- [ ] The gateway profile override (`docker-compose.gateway.yml` or equivalent mechanism) sets `DEPLOYMENT_MODE=gateway` for the backend service (FR-21, FR-28)
- [ ] A developer running `docker compose up` gets `DEPLOYMENT_MODE=standalone` without any `.env` configuration (FR-28)
- [ ] A developer running the gateway profile gets `DEPLOYMENT_MODE=gateway` without manually editing `.env` (FR-28)
- [ ] `.env.example` documents both values with a comment explaining each

### Story 3.3: Document Deployment Modes

As a solutions architect reviewing the codebase,
I want clear documentation of the deployment mode architecture,
So that I can understand the auth/authz boundary in under 10 minutes.

**Acceptance Criteria:**

- [ ] The middleware factory module (`app/middleware/factory.py`) has a comprehensive docstring explaining: the two modes, which middleware runs in each mode, the auth/authz boundary, and the v2 upgrade path
- [ ] The Tyk API definition (`tyk/apps/saas-backend.json`) includes documentation of the authentication boundary
- [ ] `docker-compose.yml` includes a comment block at the top with profile usage examples (FR-29)
- [ ] The `tyk/` directory includes a `README.md` explaining the file layout and how API definitions are structured
- [ ] A developer can trace the authentication/authorization boundary between Tyk and FastAPI by reading the middleware factory docstring and the API definition — achievable in under 10 minutes

---

## Epic 4: Docker Compose Profiles

Docker Compose profiles control which containers start, with the default (no flag) providing the standalone experience and explicit `--profile gateway` adding Tyk infrastructure, all with automatic API URL resolution.

### Story 4.1: Define Docker Compose Profile Structure

As a developer managing deployment topologies,
I want three Docker Compose profiles defined with clear documentation,
So that I can choose between standalone, gateway, and full topologies.

**Acceptance Criteria:**

- [ ] Three profiles are defined: default (no `--profile` flag), `gateway`, and `full` (FR-23)
- [ ] Default profile starts `frontend` and `backend` services only — identical to current behavior (FR-24, NFR-9)
- [ ] `gateway` profile starts `frontend`, `backend`, `tyk-gateway`, and `tyk-redis` — container count: 4 (FR-25)
- [ ] `full` profile starts all `gateway` profile services (for this PRD, `full` is identical to `gateway` — placeholder for future services) (FR-26)
- [ ] Comment block at the top of `docker-compose.yml` documents usage: `docker compose up` (standalone), `docker compose --profile gateway up` (with Tyk), `docker compose --profile full up` (everything) (FR-29)
- [ ] Running `docker compose up` with no profile flag starts exactly 2 containers (frontend + backend) — verified by test

### Story 4.2: Configure Gateway Profile Overrides

As a developer running the gateway profile,
I want the backend and frontend configuration to automatically adjust when using the gateway profile,
So that no manual environment variable editing is needed.

**Acceptance Criteria:**

- [ ] A `docker-compose.gateway.yml` override file (or equivalent Compose mechanism) sets `DEPLOYMENT_MODE=gateway` for the backend service when the gateway profile is active (FR-28)
- [ ] The override sets `VITE_API_BASE_URL=http://localhost:8080` for the frontend build when the gateway profile is active (FR-27)
- [ ] In the default profile, `VITE_API_BASE_URL=http://localhost:8000` (frontend calls backend directly) (FR-27)
- [ ] In the gateway profile, `VITE_API_BASE_URL=http://localhost:8080` (frontend calls Tyk) (FR-27)
- [ ] A `Makefile` target (e.g., `make dev-gateway`) wraps the multi-file compose command for convenience
- [ ] No manual `.env` editing is required when switching between profiles

### Story 4.3: Frontend API URL Resolution

As a frontend developer,
I want the API base URL to be driven by the Docker Compose profile,
So that API calls route to the correct endpoint (backend direct or Tyk) without manual configuration.

**Acceptance Criteria:**

- [ ] The frontend reads `VITE_API_BASE_URL` at build time and uses it as the base URL for all API calls (FR-27)
- [ ] In standalone profile, API calls go to `http://localhost:8000` (direct to backend)
- [ ] In gateway profile, API calls go to `http://localhost:8080` (through Tyk)
- [ ] The OIDC login flow (via `react-oidc-context`) continues to go directly to Descope — NOT through Tyk
- [ ] All existing frontend behavior is preserved — only the API base URL changes between profiles (NFR-11)
- [ ] No hardcoded API URLs exist in the frontend codebase — all API calls use the configured base URL

### Story 4.4: Integration Tests for Both Profiles

As a developer maintaining deployment confidence,
I want integration tests that verify both standalone and gateway profiles work correctly,
So that profile changes are caught before merging.

**Acceptance Criteria:**

- [ ] Integration test: standalone profile — `docker compose up`, `GET http://localhost:8000/api/health` returns 200 (NFR-15)
- [ ] Integration test: gateway profile — `docker compose --profile gateway up`, `GET http://localhost:8080/api/health` returns 200 (proxied through Tyk) (NFR-16)
- [ ] Integration test: expired JWT through Tyk — send request with expired token to `http://localhost:8080/api/tenants`, verify 401 response from Tyk and confirm request did not reach FastAPI backend (NFR-17)
- [ ] Integration test: standalone profile starts exactly 2 containers
- [ ] Integration test: gateway profile starts exactly 4 containers
- [ ] Tests are documented in the `Makefile` (e.g., `make test-integration-standalone`, `make test-integration-gateway`)

---

## Dependency Graph

```
Epic 1: Tyk Gateway Integration
  │
  ├── Story 1.1: Create Tyk Configuration Directory
  │     └── Story 1.2: Create API Definition (depends on 1.1 — needs tyk/apps/)
  │           └── Story 1.4: Verify Proxy and Headers (depends on 1.2 + 1.3)
  │                 └── Story 1.5: Health Check Passthrough (depends on 1.4)
  │
  └── Story 1.3: Docker Compose Services (depends on 1.1 — needs tyk/ mounts)
        └── Story 1.4: Verify Proxy and Headers (depends on 1.3)

Epic 2: Middleware Migration (depends on Epic 3 Story 3.1 — needs DEPLOYMENT_MODE)
  │
  ├── Story 2.1: Create Middleware Factory (depends on 3.1)
  │     └── Story 2.2: Conditional Assembly (depends on 2.1)
  │           ├── Story 2.4: Authorization Independence (depends on 2.2)
  │           └── Story 2.5: Standalone Regression (depends on 2.2)
  │
  └── Story 2.3: Rate Limiting in Tyk (depends on Epic 1 — needs API definition)

Epic 3: Deployment Mode Toggle
  │
  ├── Story 3.1: DEPLOYMENT_MODE env var (no dependencies — can start first)
  │     └── Story 3.2: Wire into Docker Compose (depends on 3.1 + Epic 4)
  │
  └── Story 3.3: Documentation (depends on 3.1 + Epic 1 complete)

Epic 4: Docker Compose Profiles (depends on Epic 1 Story 1.3)
  │
  ├── Story 4.1: Profile Structure (depends on 1.3 — needs gateway services)
  │     └── Story 4.2: Gateway Profile Overrides (depends on 4.1)
  │           └── Story 4.3: Frontend URL Resolution (depends on 4.2)
  │
  └── Story 4.4: Integration Tests (depends on all other stories complete)
```

## Recommended Implementation Order

1. **Story 3.1** — DEPLOYMENT_MODE env var (no dependencies, enables all Epic 2 work)
2. **Story 1.1** — Tyk configuration directory (no dependencies, enables all Epic 1 work)
3. **Story 1.2** — API definition for backend proxy
4. **Story 1.3** — Docker Compose services for Tyk + Redis
5. **Story 2.1** — Middleware factory module (refactor main.py)
6. **Story 2.2** — Conditional middleware assembly
7. **Story 2.3** — Rate limiting in Tyk API definition
8. **Story 1.4** — Verify gateway proxy and header forwarding
9. **Story 1.5** — Health check endpoint passthrough
10. **Story 2.4** — Authorization independence verification
11. **Story 2.5** — Standalone regression verification
12. **Story 4.1** — Docker Compose profile structure
13. **Story 4.2** — Gateway profile overrides
14. **Story 4.3** — Frontend API URL resolution
15. **Story 3.2** — Wire DEPLOYMENT_MODE into Docker Compose
16. **Story 3.3** — Documentation
17. **Story 4.4** — Integration tests for both profiles
