# Tyk API Gateway Research Summary

## 1. Tyk Product Tiers: OSS vs Gateway vs Dashboard

### Tyk Gateway (Open Source)

The core API gateway is fully open source (MPL 2.0) and available at `github.com/TykTechnologies/tyk`. This is the actual reverse proxy / gateway runtime.

**What's included free:**
- Full API gateway with reverse proxy
- JWT validation (HMAC, RSA, ECDSA)
- OAuth2 / OIDC token validation
- Rate limiting (per-key, per-API, global)
- Request/response transformation
- API key authentication
- Plugin system (Go, Python, JavaScript, gRPC)
- OpenAPI import
- Health checks and uptime monitoring
- WebSocket proxying
- GraphQL proxying
- Circuit breaker and enforced timeouts
- IP whitelisting/blacklisting
- Request size limiting
- Caching
- Virtual endpoints

**Dependencies:**
- **Redis** (required) — stores API keys, rate limiting counters, analytics, session state
- **MongoDB or PostgreSQL** (optional) — only needed for Tyk Dashboard or analytics pump

### Tyk Dashboard (Commercial / Licensed)

A separate UI and management API for managing the gateway. This is **not open source** and requires a license.

**Adds:**
- Web-based UI for API management
- Developer portal
- Role-based access for admin users
- Visual API designer
- Advanced analytics and reporting
- Multi-gateway / multi-datacenter management

### Tyk Pump (Open Source)

Reads analytics data from Redis and pushes to backends (Elasticsearch, Prometheus, InfluxDB, CSV, etc.). Open source, optional.

### What We Need for a Demo/Reference Architecture

**Tyk Gateway OSS + Redis is sufficient.** We do not need the Dashboard for a demo. API definitions are managed as JSON files or via the Gateway REST API. For a production reference architecture, Tyk Pump + Prometheus/Grafana can be added for observability, all fully open source.

---

## 2. Self-Hosted Docker Compose Setup

### Minimal Dependencies

| Component | Required? | Purpose |
|-----------|-----------|---------|
| Redis | **Yes** | API keys, rate limits, sessions, analytics buffer |
| MongoDB | No (unless using Dashboard) | Dashboard storage, analytics |
| PostgreSQL | No (alternative to Mongo for Dashboard) | Dashboard storage |

### Docker Compose Configuration

```yaml
version: "3.9"

services:
  tyk-redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  tyk-gateway:
    image: tykio/tyk-gateway:v5.3
    ports:
      - "8080:8080"   # Gateway listener
    volumes:
      - ./tyk/tyk.conf:/opt/tyk-gateway/tyk.conf
      - ./tyk/apps:/opt/tyk-gateway/apps          # API definitions
      - ./tyk/middleware:/opt/tyk-gateway/middleware # Custom plugins
      - ./tyk/policies:/opt/tyk-gateway/policies    # Security policies
    depends_on:
      - tyk-redis
    environment:
      - TYK_GW_SECRET=your-gateway-secret
      - TYK_GW_STORAGE_HOST=tyk-redis
      - TYK_GW_STORAGE_PORT=6379

volumes:
  redis-data:
```

### Minimal `tyk.conf`

```json
{
  "listen_port": 8080,
  "secret": "your-gateway-secret",
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
  "hash_key_function": "murmur64",
  "enable_jsvm": true
}
```

When `use_db_app_configs` is `false`, the gateway reads API definitions from JSON files in the `apps/` directory. This is the file-based mode — no Dashboard needed.

---

## 3. Auth Offloading: JWT, OAuth2, OIDC

This is the most relevant section for the identity-stack architecture.

### JWT Validation

Tyk has **native JWT validation** built into the gateway. Per-API configuration:

```json
{
  "name": "SaaS Starter API",
  "api_id": "saas-starter",
  "use_keyless": false,
  "enable_jwt": true,
  "jwt_signing_method": "rsa",
  "jwt_source": "https://api.descope.com/P1234567/.well-known/jwks.json",
  "jwt_identity_base_field": "sub",
  "jwt_policy_field_name": "pol",
  "jwt_default_policies": ["default-policy-id"],
  "jwt_issued_at_validation_skew": 0,
  "jwt_expires_at_validation_skew": 0,
  "jwt_not_before_validation_skew": 0
}
```

**How it works:**
1. Client sends `Authorization: Bearer <token>` to Tyk
2. Tyk fetches the JWKS from `jwt_source` (cached internally)
3. Tyk validates signature, expiry, not-before
4. Tyk extracts identity from `jwt_identity_base_field` (e.g., `sub`)
5. If valid, Tyk forwards the request to the upstream with the original token + additional headers
6. If invalid, Tyk returns 401 immediately — request never reaches the backend

**JWKS auto-refresh:** Tyk caches the JWKS and periodically re-fetches. The `jwt_source` can be a URL (for auto-discovery of keys) or an inline public key.

### OIDC Integration (OpenID Connect)

Tyk supports OIDC as an auth mechanism. This is configured per-API:

```json
{
  "use_openid": true,
  "openid_options": {
    "providers": [
      {
        "issuer": "https://api.descope.com/P1234567",
        "client_ids": {
          "client-id-1": "policy-id-for-descope"
        }
      },
      {
        "issuer": "http://node-oidc-provider:3001",
        "client_ids": {
          "client-id-2": "policy-id-for-node-oidc"
        }
      }
    ],
    "segregate_by_client": true
  }
}
```

**Multi-provider support:** Yes, Tyk can validate tokens from **multiple OIDC providers simultaneously** on the same API. Each provider maps to a policy that controls rate limits and access rights. This directly supports validating both Descope JWTs and node-oidc-provider JWTs.

**Discovery:** When you specify an issuer URL, Tyk fetches `{issuer}/.well-known/openid-configuration` to discover the JWKS endpoint, then validates tokens using the discovered keys.

**Descope dual-issuer consideration:** Descope has two issuer formats:
- `https://api.descope.com/{project_id}` (OIDC standard)
- `https://api.descope.com/v1/apps/{project_id}` (session tokens)

Both can be registered as separate providers in Tyk's `openid_options.providers` array.

### OAuth2 (Gateway as Resource Server)

Tyk can also act as an **OAuth2 authorization server** itself, but for our use case, we'd use it purely as a **resource server** (token validator). The JWT/OIDC modes above handle this. Tyk does not need to issue tokens — it only validates them.

### What Gets Forwarded to the Backend

After successful auth, Tyk forwards:
- The original `Authorization` header (configurable — can strip it)
- `X-Tyk-Key-ID` — the internal key/session ID
- Custom headers injected via transformation (e.g., extracted claims)

**Claim extraction and header injection** — Tyk can extract JWT claims and inject them as headers:

```json
{
  "global_headers": {
    "X-User-ID": "$tyk_meta.sub",
    "X-Tenant-ID": "$tyk_meta.dct"
  }
}
```

This means the FastAPI backend could receive pre-validated claims as headers, reducing the need for the `TokenValidationMiddleware` in the backend entirely.

---

## 4. Features That Can Move from App to Gateway

Mapping the current identity-stack middleware stack to Tyk capabilities:

| Current Middleware | Can Move to Tyk? | How |
|---|---|---|
| **TokenValidationMiddleware** | **Yes** | Native JWT/OIDC validation. Backend receives pre-validated requests only. |
| **SlowAPIMiddleware** (rate limiting) | **Yes** | Per-key, per-API, global rate limits. Configurable per policy. More granular than SlowAPI. |
| **CORSMiddleware** | **Yes** | `CORS` section in API definition with allowed origins, methods, headers. |
| **SecurityHeadersMiddleware** | **Yes** | Response header injection via `global_response_headers`. |
| **CorrelationIdMiddleware** | **Partially** | Tyk generates `X-Request-ID` automatically. Can inject custom correlation IDs via plugins. |
| **ProxyHeadersMiddleware** | **Yes** | Tyk natively sets `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-IP`. |

### Rate Limiting in Tyk

Much more sophisticated than SlowAPI:

```json
{
  "global_rate_limit": {
    "rate": 1000,
    "per": 60
  },
  "rate": 100,
  "per": 60,
  "throttle_interval": 0,
  "throttle_retry_limit": 0
}
```

Supports:
- **Global rate limit** (across all keys for an API)
- **Per-key rate limits** (via policies)
- **Per-endpoint rate limits** (via path-based rules)
- **Spike arrest** (smoothing bursts)
- Redis-backed distributed counting (works across multiple gateway instances)

### CORS in Tyk

```json
{
  "CORS": {
    "enable": true,
    "allowed_origins": ["http://localhost:3000", "https://app.example.com"],
    "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowed_headers": ["Authorization", "Content-Type", "X-Correlation-ID"],
    "exposed_headers": ["X-Correlation-ID"],
    "allow_credentials": true,
    "max_age": 3600
  }
}
```

### Security Headers

```json
{
  "global_response_headers": {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  }
}
```

### Request/Response Transformation

Tyk supports URL rewriting, body transformation (Go templates), and header manipulation:

```json
{
  "extended_paths": {
    "transform_headers": [
      {
        "path": "/api/v1/tenants",
        "method": "GET",
        "add_headers": {"X-Backend-Version": "1.0"},
        "delete_headers": ["X-Internal-Debug"]
      }
    ],
    "url_rewrites": [
      {
        "path": "/api/v1/users/{id}",
        "method": "GET",
        "match_pattern": "/api/v1/users/(.*)",
        "rewrite_to": "/internal/users/$1"
      }
    ]
  }
}
```

### API Versioning

```json
{
  "definition": {
    "location": "header",
    "key": "X-API-Version"
  },
  "version_data": {
    "not_versioned": false,
    "default_version": "v1",
    "versions": {
      "v1": {
        "name": "v1",
        "use_extended_paths": true
      },
      "v2": {
        "name": "v2",
        "use_extended_paths": true
      }
    }
  }
}
```

Supports version in: header, URL path, or query parameter.

### API Key Management

Tyk has built-in API key lifecycle management via its Gateway API:

```bash
# Create a key
curl -X POST http://localhost:8080/tyk/keys \
  -H "X-Tyk-Authorization: your-gateway-secret" \
  -d '{
    "alias": "my-service-key",
    "apply_policies": ["default-policy"],
    "expires": 1735689600
  }'
```

Keys can have: expiry, rate limits, access rights per API, metadata, tags.

### Analytics

With Tyk Pump (open source), analytics flow to:
- Prometheus (for Grafana dashboards)
- Elasticsearch (for Kibana)
- CSV/StdOut (for simple logging)
- InfluxDB, Datadog, Splunk, etc.

Without Pump, basic request logging is available via Gateway log output.

### Plugin System

Tyk supports custom plugins in:
- **Go** (compiled, highest performance)
- **Python** (via embedded gRPC server)
- **JavaScript** (via embedded JSVM — Otto engine)
- **gRPC** (any language that supports gRPC)

Plugin hooks: pre-auth, post-auth, post-key-auth, pre-request (upstream), response.

For Descope-specific claim extraction (e.g., parsing the nested `tenants` map), a small Go or Python plugin could extract tenant roles/permissions and inject them as headers.

### OpenAPI Import

```bash
curl -X POST http://localhost:8080/tyk/apis/oas/import \
  -H "X-Tyk-Authorization: your-gateway-secret" \
  -H "Content-Type: application/json" \
  -d @openapi-spec.json
```

Tyk can import an OpenAPI 3.0 spec and auto-generate an API definition with paths, methods, and validation rules.

---

## 5. FastAPI Integration (Backend Behind Tyk)

### Reverse Proxy Configuration

The API definition points Tyk at the FastAPI upstream:

```json
{
  "name": "SaaS Starter Backend",
  "api_id": "saas-backend",
  "slug": "api",
  "listen_path": "/api/",
  "target_url": "http://fastapi-backend:8000/api/",
  "strip_listen_path": false,
  "enable_jwt": true,
  "jwt_source": "https://api.descope.com/P1234567/.well-known/jwks.json",
  "jwt_signing_method": "rsa",
  "jwt_identity_base_field": "sub",
  "proxy": {
    "preserve_host_header": true,
    "listen_path": "/api/",
    "target_url": "http://fastapi-backend:8000/api/",
    "strip_listen_path": false
  }
}
```

### Header Forwarding

Tyk automatically forwards:
- `X-Forwarded-For` — client IP
- `X-Forwarded-Proto` — original protocol
- `X-Real-IP` — client IP
- `Authorization` — original bearer token (unless stripped)

Additional custom headers can be injected via `global_headers`.

### What Changes in FastAPI

With Tyk handling auth offloading, the FastAPI middleware stack simplifies:

**Before (current):**
```
ProxyHeadersMiddleware → CorrelationIdMiddleware → SecurityHeadersMiddleware
→ SlowAPIMiddleware → TokenValidationMiddleware → CORSMiddleware
```

**After (with Tyk):**
```
CorrelationIdMiddleware (simplified) → Application routes
```

The backend still needs to:
1. Read the validated user identity from headers (e.g., `X-User-ID` injected by Tyk or decode the forwarded JWT — but skip signature validation since Tyk already did it)
2. Perform **authorization** checks (role/permission verification) — Tyk validates the token but doesn't enforce Descope's nested tenant/role model
3. Call Descope Management API for CRUD operations

**Important nuance:** Tyk handles **authentication** (is this token valid?) but **authorization** (does this user have the `admin` role in tenant `T123`?) still lives in the application because Descope's multi-tenant claims structure (`tenants.{tenant-id}.roles[]`) is domain-specific. A Tyk plugin could extract this, but it adds complexity.

---

## 6. React SPA Integration

### Traffic Flow

The React SPA calls Tyk as its API gateway. Tyk proxies to the backend.

```
React SPA (localhost:3000)
    │
    │  fetch("/api/tenants", { headers: { Authorization: "Bearer <token>" } })
    │
    ▼
Tyk Gateway (localhost:8080)
    │
    │  1. Validate JWT (signature, expiry)
    │  2. Apply rate limiting
    │  3. Set CORS headers
    │  4. Set security headers
    │  5. Forward to upstream
    │
    ▼
FastAPI Backend (localhost:8000)
    │
    │  Application logic only
    │
    ▼
  Response flows back through Tyk (response headers applied)
```

### Frontend Configuration Change

The React app changes its API base URL from the FastAPI backend to the Tyk gateway:

```typescript
// Before: direct to backend
const API_BASE = "http://localhost:8000";

// After: through Tyk gateway
const API_BASE = "http://localhost:8080";
```

The `react-oidc-context` / `oidc-client-ts` OAuth flow still goes **directly to Descope** for login (not through Tyk). Only API calls to the backend go through Tyk.

### Serving the SPA

Two options:
1. **Separate web server** (Nginx/Vite dev server) serves the React SPA on port 3000. API calls go to Tyk on port 8080.
2. **Tyk serves static files** — not recommended. Tyk is an API gateway, not a static file server.

Option 1 is standard and recommended.

---

## 7. Full Docker Compose Architecture

```yaml
version: "3.9"

services:
  # --- Infrastructure ---
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  # --- API Gateway ---
  tyk-gateway:
    image: tykio/tyk-gateway:v5.3
    ports:
      - "8080:8080"
    volumes:
      - ./tyk/tyk.conf:/opt/tyk-gateway/tyk.conf
      - ./tyk/apps:/opt/tyk-gateway/apps
      - ./tyk/middleware:/opt/tyk-gateway/middleware
      - ./tyk/policies:/opt/tyk-gateway/policies
    depends_on:
      - redis
    environment:
      - TYK_GW_SECRET=${TYK_GATEWAY_SECRET}
      - TYK_GW_STORAGE_HOST=redis
      - TYK_GW_STORAGE_PORT=6379

  # --- Backend ---
  fastapi-backend:
    build: ./backend
    ports:
      - "8000:8000"  # Direct access for development/debugging
    environment:
      - DESCOPE_PROJECT_ID=${DESCOPE_PROJECT_ID}
      - DESCOPE_MANAGEMENT_KEY=${DESCOPE_MANAGEMENT_KEY}
      - DATABASE_URL=sqlite:///./data.db
    # No longer needs to be publicly exposed — Tyk proxies to it

  # --- Frontend ---
  react-frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_DESCOPE_PROJECT_ID=${DESCOPE_PROJECT_ID}
      - VITE_API_BASE_URL=http://localhost:8080  # Points to Tyk
      - VITE_DESCOPE_BASE_URL=${VITE_DESCOPE_BASE_URL}

  # --- Optional: Analytics ---
  tyk-pump:
    image: tykio/tyk-pump:v1.9
    volumes:
      - ./tyk/pump.conf:/opt/tyk-pump/pump.conf
    depends_on:
      - redis
      - tyk-gateway

  prometheus:
    image: prom/prometheus:v2.51.0
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

volumes:
  redis-data:
```

---

## 8. Architecture Diagram

```
                            ┌─────────────────────────────────────────────────────────────┐
                            │                    OIDC Providers                            │
                            │                                                             │
                            │   ┌──────────────┐          ┌───────────────────────┐       │
                            │   │   Descope     │          │  node-oidc-provider   │       │
                            │   │  (Cloud)      │          │  (local, testing)     │       │
                            │   │              │          │                       │       │
                            │   │ /.well-known/ │          │ /.well-known/         │       │
                            │   │  openid-conf  │          │  openid-configuration │       │
                            │   │  /jwks.json   │          │  /jwks               │       │
                            │   └──────┬───────┘          └───────────┬───────────┘       │
                            │          │                              │                   │
                            └──────────┼──────────────────────────────┼───────────────────┘
                                       │                              │
                   ┌───────────────────┼──────────────────────────────┼────────┐
                   │                   │    JWKS Fetch (cached)       │        │
                   │                   ▼                              ▼        │
┌──────────┐       │  ┌──────────────────────────────────────────────────┐     │
│  React   │       │  │              Tyk API Gateway (:8080)             │     │
│  SPA     │       │  │                                                  │     │
│ (:3000)  │  API  │  │  ┌────────────┐ ┌─────────┐ ┌───────────────┐   │     │
│          │ calls │  │  │  JWT/OIDC   │ │  Rate   │ │    CORS +     │   │     │
│ oidc-    ├───────┼──▶  │ Validation  │ │ Limiting│ │  Security     │   │     │
│ client-  │       │  │  │ (per-API)   │ │ (Redis) │ │  Headers      │   │     │
│ ts       │       │  │  └─────┬──────┘ └────┬────┘ └──────┬────────┘   │     │
│          │       │  │        │              │             │            │     │
│ Login    │       │  │        ▼              ▼             ▼            │     │
│ flow ────┼───────┼──┼─── Reject 401 ── Reject 429 ── Apply headers   │     │
│ direct   │       │  │   if invalid     if exceeded    on response     │     │
│ to       │       │  │        │                                        │     │
│ Descope  │       │  │        ▼  (valid requests only)                 │     │
│          │       │  │  ┌──────────────────────────────────────────┐    │     │
└──────────┘       │  │  │  Forward to upstream with:               │    │     │
                   │  │  │  - Original Authorization header         │    │     │
                   │  │  │  - X-Forwarded-For, X-Real-IP            │    │     │
                   │  │  │  - X-User-ID (extracted from sub)        │    │     │
                   │  │  │  - Custom headers from claim extraction  │    │     │
                   │  │  └───────────────┬──────────────────────────┘    │     │
                   │  └──────────────────┼──────────────────────────────┘     │
                   │                     │                                    │
                   │                     ▼                                    │
                   │  ┌──────────────────────────────────────────────────┐    │
                   │  │           FastAPI Backend (:8000)                 │    │
                   │  │                                                  │    │
                   │  │  ┌──────────────────────────────────────────┐    │    │
                   │  │  │  Simplified Middleware:                   │    │    │
                   │  │  │  - CorrelationIdMiddleware (optional)     │    │    │
                   │  │  │  - NO TokenValidation (Tyk did it)       │    │    │
                   │  │  │  - NO rate limiting (Tyk did it)          │    │    │
                   │  │  │  - NO CORS (Tyk did it)                   │    │    │
                   │  │  │  - NO security headers (Tyk did it)       │    │    │
                   │  │  └──────────────────────────────────────────┘    │    │
                   │  │                                                  │    │
                   │  │  ┌──────────────────────────────────────────┐    │    │
                   │  │  │  Application Logic:                      │    │    │
                   │  │  │  - Authorization checks (tenant roles)   │    │    │
                   │  │  │  - require_role() / require_permission() │    │    │
                   │  │  │  - Descope Management API calls          │    │    │
                   │  │  │  - Business logic / CRUD                 │    │    │
                   │  │  └──────────────────────────────────────────┘    │    │
                   │  └──────────────────────────────────────────────────┘    │
                   │                                                         │
                   │  ┌──────────────────┐                                   │
                   │  │  Redis (:6379)    │◄── Rate limit counters,          │
                   │  │                  │    API keys, sessions             │
                   │  └──────────────────┘                                   │
                   │                                                         │
                   │  ┌──────────────────┐    ┌──────────────────┐           │
                   │  │  Tyk Pump        │───▶│  Prometheus      │           │
                   │  │  (optional)      │    │  + Grafana       │           │
                   │  └──────────────────┘    │  (optional)      │           │
                   │                          └──────────────────┘           │
                   │                                                         │
                   │                    Docker Compose Network                │
                   └─────────────────────────────────────────────────────────┘
```

---

## 9. Key Decisions and Recommendations

### What Tyk Handles Well (Offload These)

1. **JWT/OIDC validation** — Move token signature verification out of FastAPI. Tyk's native JWT support handles this without plugins. Supports multiple OIDC providers simultaneously.
2. **Rate limiting** — Replace SlowAPI entirely. Redis-backed distributed rate limiting is more robust.
3. **CORS** — Move to gateway level. Single configuration point instead of per-service.
4. **Security headers** — Response header injection at the gateway.
5. **Proxy headers** — `X-Forwarded-For` and friends set automatically.

### What Stays in FastAPI

1. **Authorization logic** — Descope's `tenants.{tenant-id}.roles[]` claim structure is domain-specific. The `require_role()` / `require_permission()` dependency factories should stay in FastAPI. Tyk validates the token is authentic; FastAPI checks if the user has the right permissions.
2. **Descope Management API calls** — Tenant/user/role CRUD via the Management API stays in the backend.
3. **Business logic** — Obviously.
4. **Correlation ID generation** — Could stay in FastAPI or move to a Tyk plugin. Minor decision.

### Authentication vs Authorization Boundary

```
Tyk Gateway                          FastAPI Backend
─────────────                        ───────────────
Authentication:                      Authorization:
  "Is this JWT valid?"                 "Does user X have role Y
  "Was it signed by Descope?"           in tenant Z?"
  "Has it expired?"                    "Can this user create
  "Is the issuer trusted?"              projects in this tenant?"

Rate Limiting:                       Business Logic:
  "Has this key exceeded              "Create tenant, update user,
   100 req/min?"                       list permissions..."
```

### Tyk Plugin for Descope Claims (Optional Enhancement)

A Go or Python plugin could parse Descope's nested tenant claims and inject headers:

```
X-User-ID: user-123
X-Current-Tenant: tenant-456
X-Tenant-Roles: admin,editor
X-Tenant-Permissions: projects.create,projects.read
```

This would let FastAPI read flat headers instead of decoding the JWT again, but adds plugin maintenance complexity. Recommended only if the pattern proves valuable.

### Risk Considerations

- **Single point of failure** — Tyk becomes a critical path component. Mitigated by its lightweight architecture (single binary + Redis).
- **Debugging complexity** — Requests now traverse an additional hop. Correlation IDs become more important.
- **Configuration drift** — API definitions as JSON files should be version-controlled (in the `tyk/` directory alongside the Docker Compose).
- **Local dev overhead** — Adds Redis + Tyk containers. Not heavy, but worth noting for `docker compose up` startup time.

### Getting Started Path

1. Add `tyk/` directory to identity-stack with `tyk.conf`, `apps/`, `policies/`
2. Add Tyk Gateway + Redis to Docker Compose
3. Create API definition for the backend with JWT validation pointing at Descope's JWKS
4. Update React frontend to call Tyk's port instead of FastAPI directly
5. Incrementally remove middleware from FastAPI (rate limiting first, then CORS, then security headers, then token validation)
6. Add node-oidc-provider as a second OIDC provider in Tyk's config for testing
