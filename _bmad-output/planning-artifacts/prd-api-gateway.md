---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-through-12-accelerated']
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-01.md
  - _bmad-output/brainstorming/research/tyk-gateway-research.md
  - _bmad-output/planning-artifacts/prd.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 1
  projectDocs: 1
classification:
  projectType: 'api-gateway-deployment-topology'
  domain: 'identity-access-management'
  complexity: 'medium'
  projectContext: 'brownfield'
  prdStrategy: 'single-focused'
  repoTagging: '[IS] identity-stack'
  qualityTiers:
    identityStack: 'demo-poc-quality'
  targetAudiences:
    identityStack: 'consulting clients + portfolio'
---

# Product Requirements Document - API Gateway & Deployment Topology

**Author:** James
**Date:** 2026-03-29
**PRD Scope:** Initiative I3 (Tyk API Gateway) + I6 (OpenFeature Integration)
**Sprint Target:** Sprint 2 (follows Infrastructure Secrets Pipeline)

## Executive Summary

This PRD defines the requirements for integrating a Tyk OSS API gateway into identity-stack (formerly identity-stack), offloading cross-cutting middleware concerns from the FastAPI backend to the gateway layer, and establishing a dual deployment topology (standalone vs. gateway) toggled by environment configuration. The work produces a reference architecture demonstrating the progressive adoption pattern: "build with application middleware first, then offload to a gateway without rewriting your app."

The FastAPI backend currently implements five middleware layers: ProxyHeadersMiddleware, CorrelationIdMiddleware, SecurityHeadersMiddleware, TokenValidationMiddleware (JWT validation via py-identity-model), and CORSMiddleware. Four of these can be offloaded to Tyk. Authorization logic (`require_role()` / `require_permission()` dependency factories) remains in FastAPI because Descope's multi-tenant claims structure (`tenants.{tenant-id}.roles[]`) is domain-specific and not suited for gateway-level enforcement.

The key architectural boundary: **Tyk answers "is this token valid?" while FastAPI answers "does this user have role Y in tenant Z?"** This separation is enforced by design — the gateway handles authentication, the application handles authorization.

Docker Compose profiles control which containers start (`standalone` = no gateway, `gateway` = Tyk + Redis added, `full` = all services). A `DEPLOYMENT_MODE` environment variable controls which code paths execute at startup — the middleware factory conditionally assembles the middleware stack based on whether the application is running behind the gateway. v1 uses a plain environment variable; the OpenFeature SDK is deferred to v2 when hot-toggle and per-tenant flag evaluation add value.

### What Makes This Valuable

**It is the progressive adoption story.** Most gateway tutorials show greenfield setups. This PRD delivers a brownfield migration: an existing application with production middleware progressively offloading concerns to a gateway, with both deployment modes coexisting in a single codebase. The standalone mode preserves the zero-infrastructure developer experience (3 containers). The gateway mode demonstrates enterprise patterns (5 containers). Docker Compose profiles and a startup-time environment variable are the only moving parts — no runtime flag evaluation overhead, no additional infrastructure.

## Project Classification

- **Project Type:** API gateway integration with deployment topology abstraction
- **Domain:** Identity & Access Management — authentication offloading
- **Complexity:** Medium — Docker Compose orchestration, middleware refactoring, config-driven code paths
- **Project Context:** Brownfield — existing FastAPI middleware stack (6 layers), existing Docker Compose (2 services)
- **PRD Strategy:** Single focused PRD covering 4 epics
- **Repo Tagging:** `[IS]` identity-stack (all changes in one repo)
- **Quality Tier:** Demo/POC with reference architecture value
- **Target Audience:** Consulting clients, portfolio reviewers, developers evaluating gateway adoption patterns

## Success Criteria

### User Success

- **[IS]** A developer runs `docker compose up` (no `--profile` flag) and gets a fully working application — identical to today's experience
- **[IS]** A developer runs `docker compose --profile gateway up` and gets the same application with JWT validation handled by Tyk, with no application code changes required
- **[IS]** A solutions architect reviewing the repo can trace the authentication/authorization boundary between Tyk and FastAPI in under 10 minutes

### Business Success

- **Portfolio demonstration:** The gateway integration demonstrates progressive middleware adoption — a pattern rarely shown in reference architectures
- **Consulting readiness:** The dual deployment topology (standalone for simple deployments, gateway for production) maps directly to client conversations about API gateway adoption
- **Reference architecture completeness:** identity-stack gains an infrastructure layer that complements its existing auth + RBAC + multi-tenancy capabilities

### Technical Success

- **[IS]** Standalone mode: all 5 existing middleware layers execute, zero behavioral regression from pre-gateway state
- **[IS]** Gateway mode: JWT validation offloaded to Tyk. Requests reaching FastAPI have already passed signature verification.
- **[IS]** API definitions stored as version-controlled JSON files in `tyk/apps/` — no Tyk Dashboard required
- **[IS]** Frontend API base URL is profile-driven via Docker Compose environment variable — no manual configuration when switching profiles
- **[IS]** `DEPLOYMENT_MODE` environment variable drives middleware assembly at startup with exactly two valid values: `standalone` and `gateway`

## Product Scope

### MVP (This PRD)

- **[IS]** Tyk OSS + Redis integrated via Docker Compose with `gateway` profile
- **[IS]** JWT validation offloaded to Tyk (Descope JWKS, dual-issuer support)
- **[IS]** `DEPLOYMENT_MODE=standalone|gateway` environment variable controlling middleware factory
- **[IS]** Docker Compose profiles: default (standalone), `gateway`, `full`
- **[IS]** Frontend API base URL driven by compose profile environment variable

### Growth Features (Post-MVP, v2)

- **[IS]** CORS offload to Tyk (`CORS` section in API definition)
- **[IS]** Security headers offload to Tyk (`global_response_headers`)
- **[IS]** Tyk Pump + Prometheus for gateway observability
- **[IS]** Multi-provider OIDC validation (Descope + node-oidc-provider simultaneously)
- **[IS]** OpenFeature SDK replacing plain env var — enables hot-toggle and per-feature flags (e.g., `jwt_offloaded` independently of other offloads)

### Vision (Future, v3)

- **[IS]** Custom Go plugin for Descope claim extraction (inject `X-User-ID`, `X-Tenant-ID`, `X-Tenant-Roles` as headers)
- **[IS]** Full middleware removal from FastAPI (gateway mode runs CorrelationId + authorization only)
- **[IS]** API versioning via Tyk version definitions
- **[IS]** Multi-IdP Gateway Demo (separate PRD 4 — Tyk validates tokens from Descope, Ory, Entra, Cognito simultaneously with claim normalization plugin)

## Functional Requirements

### Epic 1 — Tyk Gateway Integration

- FR-1: Add `tyk/` directory to identity-stack containing `tyk.conf`, `apps/` (API definitions), `policies/` (security policies), and `middleware/` (plugin placeholder)
- FR-2: Configure `tyk.conf` with `use_db_app_configs: false` (file-based mode), Redis connection to `tyk-redis` service, and file-based policy source
- FR-3: Create API definition JSON (`tyk/apps/saas-backend.json`) that proxies `/api/*` to `http://backend:8000/api/` with `strip_listen_path: false` and `preserve_host_header: true`
- FR-4: Configure JWT validation in the API definition with `enable_jwt: true`, `jwt_signing_method: rsa`, and `jwt_source` pointing to Descope's JWKS endpoint (`https://api.descope.com/{project_id}/.well-known/jwks.json`)
- FR-5: Support Descope's dual-issuer format — both `https://api.descope.com/{project_id}` (OIDC) and `https://api.descope.com/v1/apps/{project_id}` (session tokens) must be accepted. If Tyk's `enable_jwt` mode does not support dual-issuer, use `use_openid` with two entries in `openid_options.providers`
- FR-6: Add `tyk-gateway` and `tyk-redis` services to `docker-compose.yml` under the `gateway` profile. Tyk listens on port 8080, Redis on 6379. Both are excluded from default (no profile) startup.
- FR-7: Configure Tyk gateway secret via `TYK_GATEWAY_SECRET` environment variable (sourced from `.env`)
- FR-8: The `tyk-gateway` service must depend on `tyk-redis` and `backend` services
- FR-9: Forward the original `Authorization` header from Tyk to the backend (do not strip it) so that FastAPI authorization logic can decode tenant claims
- FR-10: Tyk must set `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Real-IP` headers on proxied requests (native Tyk behavior, verify in integration test)

### Epic 2 — Middleware Migration

- FR-11: Create a middleware factory function (`app/middleware/factory.py`) that reads `DEPLOYMENT_MODE` at import time and assembles the middleware stack accordingly
- FR-12: In `gateway` mode, the middleware factory must skip `TokenValidationMiddleware`. The remaining middleware (CORSMiddleware, SecurityHeadersMiddleware, CorrelationIdMiddleware, ProxyHeadersMiddleware) continues to execute in FastAPI.
- FR-13: In `standalone` mode, the middleware factory must assemble the identical middleware stack to the current implementation — no behavioral change from the pre-gateway codebase
- FR-14: Refactor `app/main.py` to call the middleware factory instead of inline `app.add_middleware()` calls. The middleware registration order must be preserved exactly (outermost: ProxyHeaders, CorrelationId, SecurityHeaders, TokenValidation, CORS — innermost)
- FR-17: Authorization dependency factories (`require_role()`, `require_permission()`) must continue to function identically in both modes — they decode tenant claims from the forwarded `Authorization` header regardless of who validated the token's signature

### Epic 3 — OpenFeature / Deployment Mode Toggle

- FR-18: Add `DEPLOYMENT_MODE` environment variable with exactly two valid values: `standalone` (default) and `gateway`. Invalid values must cause a startup error with a clear message.
- FR-19: `DEPLOYMENT_MODE` is evaluated once at application startup (import time of the middleware factory module). It is not re-evaluated per request.
- FR-20: The middleware factory must log which mode is active and which middleware layers are included/excluded at startup (INFO level)
- FR-21: Add `DEPLOYMENT_MODE=standalone` to the backend service environment in the default Docker Compose configuration and `DEPLOYMENT_MODE=gateway` in the `gateway` profile override
- FR-22: v1 does not use the OpenFeature SDK. The toggle is a plain environment variable. Document the v2 upgrade path (OpenFeature SDK + file-based provider) in a code comment in the middleware factory.

### Epic 4 — Docker Compose Profiles

- FR-23: Define three Docker Compose profiles: default (no profile flag), `gateway`, and `full`
- FR-24: Default profile (no `--profile` flag) starts `frontend` and `backend` services only — identical to the current Docker Compose behavior. Container count: 2 (unchanged).
- FR-25: `gateway` profile starts `frontend`, `backend`, `tyk-gateway`, and `tyk-redis`. Container count: 4.
- FR-26: `full` profile starts all `gateway` profile services plus any future services (placeholder for node-oidc-provider, Tyk Pump, Prometheus in later PRDs). For this PRD, `full` is identical to `gateway`.
- FR-27: Frontend `VITE_API_BASE_URL` must be set via Docker Compose environment variable: `http://localhost:8000` in default profile, `http://localhost:8080` in `gateway`/`full` profiles. The frontend must read this at build time and use it as the base URL for all API calls.
- FR-28: Backend `DEPLOYMENT_MODE` must be set via Docker Compose environment variable: `standalone` in default profile, `gateway` in `gateway`/`full` profiles. This must not require the developer to manually edit `.env`.
- FR-29: Document profile usage in a comment block at the top of `docker-compose.yml`: `docker compose up` (standalone), `docker compose --profile gateway up` (with Tyk), `docker compose --profile full up` (everything)

## Non-Functional Requirements

### Performance

- NFR-1: **[IS]** Gateway mode must not add more than 10ms p95 latency to API requests compared to standalone mode (single-hop reverse proxy overhead)
- NFR-2: **[IS]** Tyk JWT validation must cache JWKS internally — no per-request fetch to Descope's JWKS endpoint

### Security

- NFR-4: **[IS]** `TYK_GATEWAY_SECRET` must not be hardcoded in `tyk.conf` or `docker-compose.yml` — sourced from `.env` via environment variable substitution
- NFR-5: **[IS]** In gateway mode, Tyk must reject requests with invalid/expired/missing JWTs with HTTP 401 before they reach the backend. The backend must never receive unauthenticated requests on protected endpoints.
- NFR-6: **[IS]** In standalone mode, `TokenValidationMiddleware` must continue rejecting invalid tokens identically to the pre-gateway implementation
- NFR-7: **[IS]** The backend must not trust Tyk headers blindly in standalone mode — `DEPLOYMENT_MODE` governs whether Tyk is in the request path. A request with a forged `X-Tyk-Request-ID` header in standalone mode must not bypass authentication.
- NFR-8: **[IS]** No secrets in version-controlled files — `tyk.conf`, API definitions, and policies must use environment variable substitution or placeholder values with documentation

### Compatibility

- NFR-9: **[IS]** Existing Docker Compose deployment (`docker compose up` with no profile) must behave identically to the pre-gateway codebase — zero breaking changes
- NFR-10: **[IS]** All existing backend unit tests must pass in both `standalone` and `gateway` mode without modification
- NFR-11: **[IS]** All existing frontend behavior must be preserved — only the API base URL changes between profiles
- NFR-12: **[IS]** The `tyk/` directory must be self-contained — removing it and the gateway-related services from `docker-compose.yml` must restore the repo to its pre-gateway state

### Testing

- NFR-13: **[IS]** Unit tests for the middleware factory covering both modes — verify correct middleware inclusion/exclusion for each `DEPLOYMENT_MODE` value
- NFR-14: **[IS]** Unit test for `DEPLOYMENT_MODE` validation — verify startup error on invalid values
- NFR-15: **[IS]** Integration test: standalone profile — `docker compose up`, hit `/api/health`, verify response
- NFR-16: **[IS]** Integration test: gateway profile — `docker compose --profile gateway up`, hit Tyk on `:8080/api/health`, verify proxied response
- NFR-17: **[IS]** Integration test: send request with expired JWT through Tyk — verify 401 response and confirm request does not reach FastAPI backend

### Architecture

- NFR-18: **[IS]** API definitions in `tyk/apps/` are the single source of truth for gateway routing — no Tyk Dashboard, no imperative API calls for configuration
- NFR-19: **[IS]** The middleware factory must be the sole location for deployment-mode-conditional logic in the middleware stack — no scattered `if DEPLOYMENT_MODE == "gateway"` checks in individual middleware modules
- NFR-20: **[IS]** The auth/authz boundary (Tyk = authentication, FastAPI = authorization) must be documented in the codebase via docstrings in the middleware factory and the API definition JSON

## Key Decisions (from Brainstorming Session 2026-03-29)

| # | Decision | Source | Rationale |
|---|---|---|---|
| D1 | Tyk OSS + Redis is sufficient — no Dashboard license needed | Research | MPL 2.0, file-based API definitions, all needed features in OSS tier |
| D2 | Auth/authz boundary: Tyk = authentication, FastAPI = authorization | Research + Party Mode | Descope's nested `tenants.{tenant-id}.roles[]` claims are domain-specific; gateway cannot enforce tenant-scoped RBAC |
| D3 | 4 of 5 FastAPI middlewares can offload to Tyk | Research | JWT validation, CORS, security headers, proxy headers. Only CorrelationId has partial overlap. |
| D4 | v1 offloads JWT validation only | Party Mode | Smallest blast radius. CORS + security headers deferred to v2 to limit scope. |
| D5 | v1 OpenFeature is plain env var (`DEPLOYMENT_MODE`) | Party Mode | SDK adds value for hot-toggle in v2. Plain env var gets 90% of value with zero dependencies. |
| D6 | Default Docker Compose profile = standalone | Party Mode | No `--profile` flag = working app. New developers should never see a broken first experience. |
| D7 | Frontend API URL is profile-driven via compose env var | Party Mode | Prevents developer confusion when switching profiles. No manual `.env` editing. |
| D8 | API definitions as version-controlled JSON files in `tyk/` | Research + Party Mode | Configuration-as-code. Reproducible. Reviewable in PRs. |
| D9 | Authorization stays in FastAPI permanently | Research | Not a v1 limitation — this is a deliberate architectural boundary. |
| D10 | Finish Descope feature waves before starting gateway work | Party Mode | Avoid merge conflicts in shared middleware stack. |
