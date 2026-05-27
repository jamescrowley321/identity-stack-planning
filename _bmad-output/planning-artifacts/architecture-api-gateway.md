---
stepsCompleted: ['accelerated-from-brainstorming']
inputDocuments:
  - _bmad-output/planning-artifacts/prd-api-gateway.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-01.md
  - _bmad-output/brainstorming/research/tyk-gateway-research.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'architecture'
project_name: 'identity-stack-planning'
user_name: 'James'
date: '2026-03-29'
---

# Architecture Decision Document — API Gateway & Deployment Topology

## 1. System Context

### Scope

This architecture covers PRD 2: integrating Tyk OSS as an API gateway into identity-stack (identity-stack), offloading authentication from FastAPI middleware to the gateway, and establishing dual deployment topologies (standalone vs gateway) controlled by a single environment variable and Docker Compose profiles.

All changes are confined to the identity-stack repository. No modifications to py-identity-model, terraform-provider-descope, or identity-stack-planning application code.

### System Context Diagram

```
                   ┌───────────────────────────────────────────────┐
                   │              OIDC Provider (Descope)          │
                   │                                               │
                   │   /.well-known/openid-configuration           │
                   │   /.well-known/jwks.json                      │
                   │   /oauth2/authorize, /oauth2/token             │
                   └──────────┬────────────────────────────────────┘
                              │
         ┌────────────────────┼───────────────────────────────────┐
         │                    │ JWKS fetch (cached)               │
         │                    ▼                                    │
         │  ┌─────────────────────────────────────────────────┐   │
         │  │           Tyk API Gateway (:8080)                │   │
         │  │  [gateway profile only]                          │   │
         │  │                                                  │   │
┌──────┐ │  │  JWT validation │ Rate limiting │ Header forward │   │
│React │ │  │  (JWKS/RSA)     │ (Redis-backed)│ (Authorization)│   │
│ SPA  │ │  └────────┬────────────────────────────────────────┘   │
│(:3000)├─┤           │                                           │
│      │ │           ▼                                            │
│ OIDC │ │  ┌─────────────────────────────────────────────────┐   │
│ login│ │  │         FastAPI Backend (:8000)                   │   │
│ flow │ │  │                                                  │   │
│direct│ │  │  Middleware stack (mode-dependent)                │   │
│  to  │ │  │  Authorization: require_role() / require_perm()  │   │
│Descope│ │  │  Descope Management API calls                   │   │
│      │ │  │  Business logic / CRUD                           │   │
└──────┘ │  └─────────────────────────────────────────────────┘   │
         │                                                        │
         │  ┌──────────────┐                                      │
         │  │ Redis (:6379)│  Rate limit counters, API key store  │
         │  │ [gateway only]│                                     │
         │  └──────────────┘                                      │
         │                                                        │
         │              Docker Compose Network                    │
         └────────────────────────────────────────────────────────┘
```

**Key relationships:**
- The React SPA performs OIDC login directly with Descope (not through Tyk) via `react-oidc-context`
- API calls from the SPA go through Tyk (gateway mode) or directly to FastAPI (standalone mode)
- Tyk fetches and caches JWKS from Descope for JWT signature verification
- FastAPI always performs authorization (tenant-scoped role/permission checks) regardless of deployment mode

## 2. Key Architectural Decisions

### ADR-GW-1: Authentication/Authorization Boundary

**Decision:** Tyk handles authentication (JWT signature verification, expiry, issuer validation). FastAPI handles authorization (tenant-scoped role and permission checks).

**Rationale:** Descope JWTs contain a nested multi-tenant claims structure:

```json
{
  "sub": "user-id",
  "dct": "current-tenant-id",
  "tenants": {
    "tenant-1": { "roles": ["admin"], "permissions": ["projects.create"] },
    "tenant-2": { "roles": ["viewer"], "permissions": ["projects.read"] }
  }
}
```

The `require_role()` and `require_permission()` dependency factories extract roles from `tenants[dct].roles[]` — a domain-specific structure that an API gateway cannot enforce without a custom plugin. This is not a v1 limitation; it is a deliberate, permanent architectural boundary.

```
Tyk Gateway                          FastAPI Backend
─────────────                        ───────────────
Authentication:                      Authorization:
  "Is this JWT valid?"                 "Does user X have role Y
  "Was it signed by Descope?"           in tenant Z?"
  "Has it expired?"                    "Can this user create
  "Is the issuer trusted?"              projects in this tenant?"

Rate Limiting:                       Business Logic:
  "Has this client exceeded            "Create tenant, update user,
   60 req/min?"                         list permissions..."
```

### ADR-GW-2: Tyk OSS (No Dashboard)

**Decision:** Use Tyk Gateway OSS (MPL 2.0) with file-based API definitions. No Tyk Dashboard license.

**Rationale:**
- All required features (JWT validation, rate limiting, reverse proxy, CORS, security headers) are available in the OSS tier
- File-based API definitions (`tyk/apps/*.json`) are version-controlled and PR-reviewable
- Dashboard adds UI management, developer portal, and multi-datacenter features — none needed for a reference architecture
- Dependencies: only Redis (required for rate limiting counters and key storage)
- Eliminates MongoDB/PostgreSQL requirements that the Dashboard would introduce

### ADR-GW-3: File-Based API Definitions

**Decision:** API definitions are JSON files in `tyk/apps/`, checked into git. No Tyk Dashboard or imperative Gateway API calls for configuration.

**Rationale:** Configuration-as-code. The `tyk/` directory is the single source of truth for gateway routing:
- `tyk/tyk.conf` — gateway configuration (listen port, Redis connection, policy source)
- `tyk/apps/saas-backend.json` — API definition (proxy target, auth config, rate limits)
- `tyk/policies/policies.json` — security policies (rate limit quotas)

When `use_db_app_configs: false`, Tyk reads API definitions from the filesystem on startup. Changes require a container restart (acceptable for a reference architecture; Tyk Dashboard's hot-reload is not needed).

### ADR-GW-4: Environment Variable over OpenFeature SDK (v1)

**Decision:** v1 uses a plain `DEPLOYMENT_MODE` environment variable (`standalone` | `gateway`). OpenFeature SDK is deferred to v2.

**Rationale:**
- A plain env var gets 90% of the value with zero additional dependencies
- The toggle is binary (two deployment modes) and evaluated once at startup — no per-request overhead
- OpenFeature SDK adds value when there are: hot-toggle requirements, per-feature flags (e.g., `jwt_offloaded` independently of other offloads), or per-tenant flag evaluation
- v2 upgrade path: replace `os.getenv("DEPLOYMENT_MODE")` with `client.get_string_value("deployment_mode", "standalone")` — one-line change per evaluation site

### ADR-GW-5: Startup-Time Evaluation

**Decision:** `DEPLOYMENT_MODE` is evaluated once at application startup (import time of the middleware factory). The middleware stack is assembled once and does not change per request.

**Rationale:**
- The middleware stack is assembled during FastAPI app construction, before the first request arrives
- Changing the deployment mode requires restarting the container — this is the correct behavior for infrastructure-level configuration
- Per-request evaluation would add latency for a decision that never changes during a container's lifetime
- This pattern aligns with Docker Compose profile semantics: the profile determines which containers start, the env var determines which code paths execute

### ADR-GW-6: Default Profile is Standalone

**Decision:** Running `docker compose up` with no `--profile` flag starts the standalone deployment — frontend + backend only, identical to the pre-gateway codebase.

**Rationale:**
- New developers cloning the repo get a working application without learning about API gateways
- The gateway is an enhancement, not a requirement — it adds containers (Tyk + Redis) and complexity
- Explicit opt-in via `docker compose --profile gateway up` signals intent to use the gateway topology
- Zero breaking changes to the existing developer experience (NFR-9)

### ADR-GW-7: Authorization Header Forwarding

**Decision:** Tyk forwards the original `Authorization: Bearer <token>` header to the FastAPI backend. It does not strip it.

**Rationale:**
- FastAPI's `require_role()` and `require_permission()` dependency factories decode the JWT to extract tenant-scoped claims from the `tenants` map
- Tyk validates the token's signature and expiry but does not extract or inject tenant role headers (that requires a custom plugin, deferred to v3)
- The backend reads the forwarded token, extracts claims, and makes authorization decisions — the same code path works in both standalone (self-validated) and gateway (pre-validated) modes
- The only difference: in gateway mode, the backend skips signature verification because Tyk already performed it

## 3. Request Flow Architecture

### Standalone Mode (Default)

```
Client Request
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│                    FastAPI (:8000)                        │
│                                                          │
│  5. ProxyHeadersMiddleware  ─── X-Forwarded-For → IP     │
│  4. CorrelationIdMiddleware ─── X-Correlation-ID         │
│  3. SecurityHeadersMiddleware ─ CSP, HSTS, X-Frame       │
│  2. TokenValidationMiddleware ─ JWT sig check via        │
│                                 py-identity-model        │
│  1. CORSMiddleware ────────── allow_origins, credentials │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Route Handler                                      │  │
│  │  require_role("admin") → decode JWT → check         │  │
│  │    tenants[dct].roles                               │  │
│  │  Business logic + Descope Management API            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

All 5 middleware layers execute. This is identical to the current production behavior — zero regression.

### Gateway Mode

```
Client Request
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│                  Tyk Gateway (:8080)                      │
│                                                          │
│  1. JWT Validation ────────── JWKS fetch from Descope    │
│     • enable_jwt: true        (cached internally)        │
│     • jwt_signing_method: rsa                            │
│     • Dual issuer support                                │
│     → 401 if invalid/expired/missing token               │
│                                                          │
│  2. Rate Limiting ─────────── Redis-backed counters      │
│     • Global: 60 req/min                                 │
│     • Auth endpoints: 10 req/min                         │
│     → 429 if exceeded                                    │
│                                                          │
│  3. Header Forwarding ─────── Authorization (original)   │
│     • X-Forwarded-For, X-Forwarded-Proto, X-Real-IP      │
│                                                          │
│  → Only valid, rate-limited requests pass through        │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│                    FastAPI (:8000)                        │
│                                                          │
│  4. ProxyHeadersMiddleware  ─── trust Tyk's forwarded    │
│  3. CorrelationIdMiddleware ─── X-Correlation-ID         │
│  2. SecurityHeadersMiddleware ─ CSP, HSTS, X-Frame       │
│  1. CORSMiddleware ────────── allow_origins, credentials │
│                                                          │
│  [TokenValidationMiddleware — SKIPPED, Tyk validated]    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Route Handler                                      │  │
│  │  require_role("admin") → decode forwarded JWT →     │  │
│  │    check tenants[dct].roles                         │  │
│  │  Business logic + Descope Management API            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

In gateway mode, the backend still executes 4 of 5 middleware layers. Only `TokenValidationMiddleware` is removed from the stack. CORS and SecurityHeaders remain in FastAPI for v1 (deferred to Tyk in v2).

## 4. Middleware Migration Matrix

| Middleware | Standalone | Gateway (v1) | Gateway (v2) | Notes |
|---|---|---|---|---|
| **ProxyHeadersMiddleware** | FastAPI | FastAPI | FastAPI | Tyk natively sets `X-Forwarded-For` etc., but FastAPI still needs to read them. Stays in both modes. |
| **CorrelationIdMiddleware** | FastAPI | FastAPI | FastAPI | Application-level concern. Tyk has `X-Request-ID` but CorrelationId is app-specific. Stays permanently. |
| **SecurityHeadersMiddleware** | FastAPI | FastAPI | Tyk (`global_response_headers`) | v1: stays in FastAPI. v2: offload to Tyk API definition. |
| **TokenValidationMiddleware** | FastAPI (py-identity-model) | **Tyk** (native JWT/OIDC) | Tyk | v1 offload. Backend receives only pre-validated requests. Authorization (`require_role`/`require_permission`) still decodes the forwarded JWT for tenant claims. |
| **CORSMiddleware** | FastAPI | FastAPI | Tyk (`CORS` section) | v1: stays in FastAPI. v2: offload to Tyk API definition. |

### v1 Offload Summary

- **Moved to Tyk:** TokenValidationMiddleware (1 of 5)
- **Remain in FastAPI:** ProxyHeaders, CorrelationId, SecurityHeaders, CORS (4 of 5)
- **Permanently in FastAPI:** Authorization (`require_role()`, `require_permission()`) — this is application logic, not middleware

## 5. Middleware Factory Architecture

### Factory Pattern

The middleware factory (`app/middleware/factory.py`) is the sole location for deployment-mode-conditional logic. No scattered `if DEPLOYMENT_MODE == "gateway"` checks elsewhere.

```python
# app/middleware/factory.py

import logging
import os

logger = logging.getLogger(__name__)

DEPLOYMENT_MODE = os.getenv("DEPLOYMENT_MODE", "standalone")

# Validate at import time — fail fast on invalid values
if DEPLOYMENT_MODE not in ("standalone", "gateway"):
    raise ValueError(
        f"Invalid DEPLOYMENT_MODE={DEPLOYMENT_MODE!r}. "
        f"Must be 'standalone' or 'gateway'."
    )


def configure_middleware(app):
    """Assemble middleware stack based on DEPLOYMENT_MODE.

    Auth/authz boundary:
      Tyk (gateway) = authentication — JWT signature validation, expiry, issuer
      FastAPI = authorization — tenant-scoped role/permission checks via
        require_role() / require_permission() dependency factories

    v2 upgrade path: replace os.getenv("DEPLOYMENT_MODE") with
    OpenFeature client.get_string_value("deployment_mode", "standalone")
    for hot-toggle and per-feature flag support.
    """
    # Always register: CORS (innermost)
    app.add_middleware(CORSMiddleware, ...)

    if DEPLOYMENT_MODE == "standalone":
        # Token validation — skips public paths
        app.add_middleware(TokenValidationMiddleware, ...)
        logger.info("Middleware: TokenValidationMiddleware ENABLED (standalone)")
    else:
        logger.info("Middleware: TokenValidationMiddleware SKIPPED (gateway — Tyk validates)")

    # Always register: SecurityHeaders, CorrelationId, ProxyHeaders
    app.add_middleware(SecurityHeadersMiddleware, ...)
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(ProxyHeadersMiddleware, ...)

    logger.info(f"Middleware stack assembled for DEPLOYMENT_MODE={DEPLOYMENT_MODE}")
```

## 6. Tyk Configuration Architecture

### Directory Layout

```
identity-stack/
├── tyk/
│   ├── tyk.conf                    # Gateway configuration
│   ├── apps/
│   │   └── saas-backend.json       # API definition — proxy, auth, rate limits
│   ├── policies/
│   │   └── policies.json           # Security policies — rate limit quotas
│   └── middleware/                  # Plugin placeholder (empty for v1)
├── docker-compose.yml              # Updated with gateway/full profiles
└── backend/
    └── app/
        └── middleware/
            └── factory.py          # NEW — deployment-mode-aware middleware assembly
```

### tyk.conf

```json
{
  "listen_port": 8080,
  "secret": "${TYK_GATEWAY_SECRET}",
  "template_path": "/opt/tyk-gateway/templates",
  "tyk_js_path": "/opt/tyk-gateway/js/tyk.js",
  "middleware_path": "/opt/tyk-gateway/middleware",
  "use_db_app_configs": false,
  "app_path": "/opt/tyk-gateway/apps",
  "storage": {
    "type": "redis",
    "host": "tyk-redis",
    "port": 6379,
    "optimisation_max_idle": 2000,
    "optimisation_max_active": 4000
  },
  "enable_analytics": false,
  "policies": {
    "policy_source": "file",
    "policy_record_name": "/opt/tyk-gateway/policies/policies.json"
  },
  "hash_keys": true,
  "hash_key_function": "murmur64"
}
```

**Key settings:**
- `use_db_app_configs: false` — file-based mode, no Dashboard required
- `secret` — gateway admin API secret, sourced from `TYK_GATEWAY_SECRET` env var (NFR-4)
- Redis connection to `tyk-redis` service on the Docker network

### API Definition (tyk/apps/saas-backend.json)

```json
{
  "name": "Identity Stack Backend",
  "api_id": "saas-backend",
  "slug": "api",
  "listen_path": "/api/",
  "target_url": "http://backend:8000/api/",
  "strip_listen_path": false,
  "active": true,
  "use_openid": true,
  "openid_options": {
    "providers": [
      {
        "issuer": "https://api.descope.com/${DESCOPE_PROJECT_ID}",
        "client_ids": {
          "${DESCOPE_PROJECT_ID}": "default-policy"
        }
      },
      {
        "issuer": "https://api.descope.com/v1/apps/${DESCOPE_PROJECT_ID}",
        "client_ids": {
          "${DESCOPE_PROJECT_ID}": "default-policy"
        }
      }
    ],
    "segregate_by_client": false
  },
  "jwt_identity_base_field": "sub",
  "proxy": {
    "preserve_host_header": true,
    "listen_path": "/api/",
    "target_url": "http://backend:8000/api/",
    "strip_listen_path": false
  },
  "global_rate_limit": {
    "rate": 60,
    "per": 60
  },
  "version_data": {
    "not_versioned": true,
    "default_version": "",
    "versions": {
      "Default": {
        "name": "Default",
        "use_extended_paths": true,
        "extended_paths": {
          "rate_limit": [
            {
              "path": "/api/validate-id-token",
              "method": "POST",
              "rate": 10,
              "per": 60
            }
          ]
        }
      }
    }
  }
}
```

**Dual-issuer support (FR-5):** Descope issues tokens with two issuer formats:
- `https://api.descope.com/{project_id}` — OIDC-standard issuer
- `https://api.descope.com/v1/apps/{project_id}` — session token issuer

Both are registered as separate providers in `openid_options.providers`. Tyk fetches the discovery document from each issuer's `/.well-known/openid-configuration` endpoint to discover the JWKS URL, then validates tokens using the discovered keys.

**`use_openid: true` vs `enable_jwt: true`:** The `use_openid` mode is chosen over `enable_jwt` because it supports multiple issuers natively through the `providers` array. `enable_jwt` supports only a single `jwt_source` URL.

## 7. Docker Compose Topology

### Profile Definitions

```
┌─────────────────────────────────────────────────────────────────┐
│ Default (no --profile flag): standalone                         │
│                                                                 │
│  ┌──────────┐    ┌──────────┐                                  │
│  │ frontend │───▶│ backend  │    DEPLOYMENT_MODE=standalone     │
│  │  :3000   │    │  :8000   │    Full middleware stack           │
│  └──────────┘    └──────────┘    Container count: 2             │
│                                                                 │
│  VITE_API_BASE_URL=http://localhost:8000                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ --profile gateway                                               │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ frontend │───▶│   tyk    │───▶│ backend  │                  │
│  │  :3000   │    │  :8080   │    │  :8000   │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                       │                                         │
│                  ┌──────────┐    DEPLOYMENT_MODE=gateway         │
│                  │tyk-redis │    Reduced middleware stack        │
│                  │  :6379   │    Container count: 4              │
│                  └──────────┘                                   │
│                                                                 │
│  VITE_API_BASE_URL=http://localhost:8080                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ --profile full                                                  │
│                                                                 │
│  Same as gateway for this PRD.                                  │
│  Placeholder for future services: node-oidc-provider,           │
│  Tyk Pump, Prometheus (PRDs 3 & 4).                             │
│  Container count: 4 (grows in later PRDs)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Compose Structure

```yaml
# Usage:
#   docker compose up                      # standalone (2 containers)
#   docker compose --profile gateway up    # with Tyk (4 containers)
#   docker compose --profile full up       # everything (4+ containers)

services:
  frontend:
    build:
      context: ./frontend
      args:
        VITE_DESCOPE_PROJECT_ID: ${DESCOPE_PROJECT_ID}
        VITE_API_BASE_URL: http://localhost:8000
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - FRONTEND_URL=http://localhost:3000
      - DEPLOYMENT_MODE=standalone

  # --- Gateway Profile Services ---

  tyk-gateway:
    image: tykio/tyk-gateway:v5.3
    profiles: ["gateway", "full"]
    ports:
      - "8080:8080"
    volumes:
      - ./tyk/tyk.conf:/opt/tyk-gateway/tyk.conf
      - ./tyk/apps:/opt/tyk-gateway/apps
      - ./tyk/middleware:/opt/tyk-gateway/middleware
      - ./tyk/policies:/opt/tyk-gateway/policies
    depends_on:
      - tyk-redis
      - backend
    environment:
      - TYK_GW_SECRET=${TYK_GATEWAY_SECRET}
      - TYK_GW_STORAGE_HOST=tyk-redis
      - TYK_GW_STORAGE_PORT=6379

  tyk-redis:
    image: redis:7-alpine
    profiles: ["gateway", "full"]
    volumes:
      - tyk-redis-data:/data

volumes:
  tyk-redis-data:
```

**Profile overrides:** When running with `--profile gateway`, the `backend` service needs `DEPLOYMENT_MODE=gateway` and the `frontend` needs `VITE_API_BASE_URL=http://localhost:8080`. This is handled via Docker Compose `profiles` and environment variable overrides:

- Option A: Compose file override (`docker-compose.gateway.yml`) that sets `DEPLOYMENT_MODE=gateway` and `VITE_API_BASE_URL=http://localhost:8080`
- Option B: Environment variable in `.env` that defaults to `standalone`, overridden by profile-specific `.env.gateway`
- Option C: Profile-aware entrypoint scripts that detect which profile is active

**Selected approach:** Compose file override (`docker-compose.gateway.yml`) is the most explicit and Docker-idiomatic. Running the gateway profile becomes:

```bash
docker compose -f docker-compose.yml -f docker-compose.gateway.yml --profile gateway up
```

Or equivalently, a `Makefile` target:

```makefile
dev-gateway:
	docker compose -f docker-compose.yml -f docker-compose.gateway.yml --profile gateway up --build
```

### Frontend API URL Resolution

The frontend reads `VITE_API_BASE_URL` at build time (Vite injects it as a compile-time constant). The Docker Compose build args control which URL is baked into the frontend bundle:

- **Default profile:** `VITE_API_BASE_URL=http://localhost:8000` — frontend calls backend directly
- **Gateway profile:** `VITE_API_BASE_URL=http://localhost:8080` — frontend calls Tyk, which proxies to backend

This ensures zero manual configuration when switching profiles. The developer runs a different compose command and gets the correct API base URL automatically.

## 8. Security Architecture

### Gateway Secret

The `TYK_GATEWAY_SECRET` controls access to Tyk's admin API (used for key management, API reloads). It must not be hardcoded:

- Sourced from `.env` via `${TYK_GATEWAY_SECRET}` in `docker-compose.yml`
- `.env` is gitignored — no secrets in version control (NFR-4, NFR-8)
- `tyk.conf` uses the environment variable via `TYK_GW_SECRET` passed through Docker Compose

### Header Trust Model

```
┌─────────────────────────────────────────────────────────────┐
│ STANDALONE MODE                                              │
│                                                              │
│ Client → FastAPI                                             │
│                                                              │
│ FastAPI validates JWT signature via py-identity-model.       │
│ FastAPI does NOT trust any gateway-injected headers.         │
│ A request with a forged X-Tyk-Request-ID is ignored —       │
│ DEPLOYMENT_MODE=standalone means no gateway is expected.     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GATEWAY MODE                                                 │
│                                                              │
│ Client → Tyk → FastAPI                                       │
│                                                              │
│ Tyk validates JWT signature (401 if invalid).                │
│ Tyk forwards original Authorization header to FastAPI.       │
│ FastAPI decodes JWT for tenant claims (authorization)         │
│ but skips signature verification (Tyk already did it).       │
│                                                              │
│ FastAPI trusts Tyk's X-Forwarded-For because                │
│ DEPLOYMENT_MODE=gateway explicitly means Tyk is present.     │
│ Backend port 8000 is still exposed for direct access         │
│ in development — production would restrict to Docker network.│
└─────────────────────────────────────────────────────────────┘
```

**NFR-7 enforcement:** The `DEPLOYMENT_MODE` env var is the trust boundary. In `standalone` mode, no gateway headers are trusted. In `gateway` mode, the backend trusts that Tyk has pre-validated the token. A forged header in standalone mode cannot bypass authentication because `TokenValidationMiddleware` is active and validates the JWT directly.

### Tyk JWT Rejection Behavior

In gateway mode, Tyk handles authentication enforcement:
- **Missing token:** 401 Unauthorized — request never reaches backend
- **Expired token:** 401 Unauthorized — request never reaches backend
- **Invalid signature:** 401 Unauthorized — request never reaches backend
- **Unknown issuer:** 401 Unauthorized — only the two registered Descope issuers are accepted

The backend never receives unauthenticated requests on protected endpoints (NFR-5).

## 9. Technology Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|
| API Gateway | Tyk OSS | Kong OSS, Traefik, Envoy, APISIX | MPL 2.0. Native JWT/OIDC validation without plugins. Multi-provider support via `openid_options.providers`. File-based API definitions. Docker image available. Simpler rate limiting config than Kong. |
| Gateway data store | Redis 7 Alpine | Standalone (no store) | Required by Tyk for rate limiting counters and key storage. Alpine image minimizes footprint (~30MB). |
| API definition format | File-based JSON | Tyk Dashboard (UI), Gateway REST API (imperative) | Version-controlled, PR-reviewable, reproducible. No additional infrastructure. Matches configuration-as-code principle. |
| Dual-issuer support | `use_openid` with two providers | `enable_jwt` with single source | `enable_jwt` supports only one `jwt_source`. Descope requires two issuer formats. `use_openid` with provider array handles this natively. |
| Deployment toggle | `DEPLOYMENT_MODE` env var | OpenFeature SDK, header detection (`X-Tyk-Request-ID`), runtime flag service | Env var is simplest. Header detection is fragile (forgeable). OpenFeature deferred to v2 when hot-toggle and per-feature flags add value. |
| Docker profiles | `gateway` and `full` profiles | Separate compose files, Docker contexts | Profiles are Docker Compose native. Single file, explicit opt-in. `full` placeholder for future services. |
| v1 offload scope | JWT validation only | All 4 offloadable middlewares | Smallest blast radius. CORS and security headers offload deferred to v2 — less risk, easier rollback. |

## 10. Compatibility and Migration

### Zero-Regression Guarantee

The following must hold true after gateway integration:

1. `docker compose up` (no profile) behaves identically to the pre-gateway codebase — same containers, same middleware, same behavior (NFR-9)
2. All existing backend unit tests pass in both `standalone` and `gateway` mode without modification (NFR-10)
3. All existing frontend behavior is preserved — only the API base URL differs between profiles (NFR-11)
4. Removing `tyk/` directory and gateway services from `docker-compose.yml` restores the repo to its pre-gateway state (NFR-12)

### Middleware Stack Comparison

```
Pre-Gateway (current)           Standalone (post-integration)    Gateway (post-integration)
─────────────────────           ─────────────────────────────    ──────────────────────────
ProxyHeadersMiddleware    →     ProxyHeadersMiddleware      →    ProxyHeadersMiddleware
CorrelationIdMiddleware   →     CorrelationIdMiddleware     →    CorrelationIdMiddleware
SecurityHeadersMiddleware →     SecurityHeadersMiddleware   →    SecurityHeadersMiddleware
TokenValidationMiddleware →     TokenValidationMiddleware   →    [REMOVED — Tyk handles]
CORSMiddleware            →     CORSMiddleware              →    CORSMiddleware

IDENTICAL to pre-gateway ────── IDENTICAL to pre-gateway ─────  1 middleware layer removed
```

## 11. Testing Strategy

| Test Type | What it Validates | Runs In |
|---|---|---|
| **Unit: middleware factory** | Correct middleware inclusion/exclusion for each `DEPLOYMENT_MODE` value | CI, both modes |
| **Unit: DEPLOYMENT_MODE validation** | Startup error on invalid values (not `standalone` or `gateway`) | CI |
| **Integration: standalone profile** | `docker compose up` → `/api/health` returns 200 | CI or local |
| **Integration: gateway profile** | `docker compose --profile gateway up` → Tyk `:8080/api/health` returns 200, proxied correctly | CI or local |
| **Integration: JWT rejection** | Send expired JWT through Tyk → 401 response, request does not reach FastAPI | CI or local |
| **Integration: rate limiting** | Exceed 60 req/min through Tyk → 429 response from Tyk (not FastAPI) | Local |

## 12. Growth Path

### v2 Additions (Post-MVP)

- CORS offload to Tyk (`CORS` section in API definition)
- Security headers offload to Tyk (`global_response_headers`)
- Tyk Pump + Prometheus for gateway observability
- OpenFeature SDK replacing plain env var — per-feature flags
- Per-endpoint rate limit configuration via Tyk policies

### v3 Additions (Future)

- Custom Go plugin for Descope claim extraction (inject `X-User-ID`, `X-Tenant-ID`, `X-Tenant-Roles` as headers)
- Full middleware removal from FastAPI (gateway mode runs CorrelationId + authorization only)
- API versioning via Tyk version definitions
- Multi-IdP Gateway Demo (PRD 4 — separate PRD)
