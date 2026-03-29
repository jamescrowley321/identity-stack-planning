---
stepsCompleted: ['accelerated-from-brainstorming']
inputDocuments:
  - _bmad-output/planning-artifacts/prd-multi-idp-demo.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-01.md
  - _bmad-output/brainstorming/research/tyk-gateway-research.md
  - _bmad-output/brainstorming/research/node-oidc-provider-research.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'architecture'
project_name: 'auth-planning'
user_name: 'James'
date: '2026-03-29'
---

# Architecture Decision Document - Multi-IdP Gateway Demo (PRD 4)

## 1. System Context

### Initiative Summary

The Multi-IdP Gateway Demo is the capstone initiative for the identity-stack platform. It proves that a single backend can serve authenticated requests from any OIDC-compliant identity provider without IdP-specific code. A Tyk Go plugin normalizes heterogeneous JWT claim formats into canonical HTTP headers. A React demo page renders a grid of provider cards, each performing an OIDC popup login and making a round-trip API call through the gateway. The backend reads only canonical headers and returns a normalized identity response.

### Prerequisites

This initiative depends on:
- **PRD 2** (API Gateway & Deployment Topology) -- Tyk Gateway + Redis + Docker Compose profiles
- **PRD 3** (Multi-Provider Test Infrastructure) -- node-oidc-provider as a second OIDC provider

### Quality Tiers

| Component | Quality Tier | Rationale |
|-----------|-------------|-----------|
| Claim normalization plugin | Production-grade | Reusable architectural pattern, extractable for real gateway deployments |
| Demo UI | Demo/POC | Visual proof-of-concept for portfolio and consulting demos |
| Local IdP configs | Demo/POC | Zero-config containers for demo purposes |
| `/api/whoami` endpoint | Demo/POC | Single read-only endpoint demonstrating IdP agnosticism |

## 2. System Architecture

### Full System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (:3000)                            │
│                        /demo/multi-idp route                             │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   Descope    │ │ node-oidc-  │ │  Ory Hydra  │ │   Generic   │  ...  │
│  │    Card      │ │  provider   │ │    Card     │ │   Card      │       │
│  │             │ │    Card     │ │             │ │             │       │
│  │  [Sign In]  │ │  [Sign In]  │ │  [Sign In]  │ │  [Sign In]  │       │
│  │  popup →    │ │  popup →    │ │  popup →    │ │  popup →    │       │
│  │  Descope    │ │  localhost: │ │  localhost: │ │  (config'd) │       │
│  │  hosted     │ │  3001       │ │  4444       │ │             │       │
│  │             │ │             │ │             │ │             │       │
│  │  Raw Claims │ │  Raw Claims │ │  Raw Claims │ │  Raw Claims │       │
│  │  Normalized │ │  Normalized │ │  Normalized │ │  Normalized │       │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘       │
│         │               │               │               │               │
│         │  Authorization: Bearer <token> per provider                    │
└─────────┼───────────────┼───────────────┼───────────────┼───────────────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Tyk API Gateway (:8080)                             │
│                                                                          │
│  Step 1: Multi-Provider OIDC Validation                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  openid_options.providers[] — validates JWTs from all registered   │  │
│  │  issuers. Fetches JWKS from each provider's discovery endpoint.   │  │
│  │  Rejects invalid/expired tokens with 401 before reaching plugin.  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                         (valid JWT)                                      │
│                              │                                           │
│  Step 2: Claim Normalization Plugin (PostAuth Hook)                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  JWT claims (decoded by Tyk) ──► Provider Detection (iss claim)    │  │
│  │                                        │                           │  │
│  │               ┌────────────────────────┼──────────────────┐        │  │
│  │               ▼                        ▼                  ▼        │  │
│  │        DescopeMapper           OryMapper          GenericMapper     │  │
│  │        (iss matches            (iss matches       (fallback for     │  │
│  │         api.descope.com)        hydra:4444)        unknown iss)     │  │
│  │               │                        │                  │        │  │
│  │               └────────────────────────┼──────────────────┘        │  │
│  │                                        ▼                           │  │
│  │                              CanonicalIdentity                     │  │
│  │                              {UserID, Email, Roles,                │  │
│  │                               Tenant, Provider}                    │  │
│  │                                        │                           │  │
│  │                              Inject Canonical Headers              │  │
│  │                              X-User-ID, X-User-Email,              │  │
│  │                              X-Roles, X-Tenant, X-IdP              │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│  Step 3: Strip Inbound Canonical Headers (NFR-4)                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Remove any X-User-ID, X-Roles, etc. from original request        │  │
│  │  before plugin runs. Prevents client header spoofing.              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                    Forward to upstream                                    │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (:8000)                               │
│                                                                          │
│  GET /api/whoami                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Read ONLY canonical headers:                                      │  │
│  │    X-User-ID   → user_id                                          │  │
│  │    X-User-Email → email                                            │  │
│  │    X-Roles     → roles (JSON array)                                │  │
│  │    X-Tenant    → tenant                                            │  │
│  │    X-IdP       → provider                                          │  │
│  │                                                                    │  │
│  │  Return 401 if X-User-ID missing                                   │  │
│  │  Return JSON: { user_id, email, roles, tenant, provider }          │  │
│  │                                                                    │  │
│  │  ZERO IdP-specific imports, logic, or conditional branches         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Docker Compose Topology (full profile)

```
┌──────────────────────────────────────────────────────────────────┐
│                     Docker Compose Network                        │
│                     Profile: full                                 │
│                                                                  │
│  ┌────────────────┐    ┌────────────────┐                        │
│  │  react-frontend│    │  fastapi-       │                        │
│  │  :3000         │    │  backend :8000  │                        │
│  └───────┬────────┘    └───────▲────────┘                        │
│          │                     │                                  │
│          │  API calls          │  Proxied requests                │
│          ▼                     │  (canonical headers)             │
│  ┌─────────────────────────────┴─────────────────┐               │
│  │          tyk-gateway :8080                     │               │
│  │          volumes: tyk/plugins/claim-normalizer │               │
│  │          depends_on: redis, node-oidc,         │               │
│  │                      ory-hydra (healthy)       │               │
│  └──────────┬────────────────────────────────────┘               │
│             │                                                     │
│  ┌──────────▼──────┐                                             │
│  │  redis :6379    │   Rate limits, API keys, sessions           │
│  └─────────────────┘                                             │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │ node-oidc-      │  │ ory-hydra        │                       │
│  │ provider :3001  │  │ :4444 (public)   │                       │
│  │ (in-memory,     │  │ :4445 (admin)    │                       │
│  │  devInteractions│  │ (in-memory,      │                       │
│  │  static clients)│  │  pre-configured) │                       │
│  │ healthcheck:    │  │ healthcheck:     │                       │
│  │  /.well-known/  │  │  /health/alive   │                       │
│  │  openid-config  │  │                  │                       │
│  └─────────────────┘  ├──────────────────┤                       │
│                       │ hydra-consent    │                       │
│                       │ :3002            │                       │
│                       │ (minimal login/  │                       │
│                       │  consent stub)   │                       │
│                       └──────────────────┘                       │
│                                                                  │
│  Descope (external, cloud) — no container needed                 │
│  https://api.descope.com/{project_id}                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Container summary (full profile):**

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| react-frontend | Custom (Vite/React) | 3000 | Demo UI with provider card grid |
| tyk-gateway | tykio/tyk-gateway:v5.3 | 8080 | API gateway, JWT validation, claim normalization plugin |
| redis | redis:7-alpine | 6379 | Tyk session/rate-limit store |
| fastapi-backend | Custom (FastAPI) | 8000 | `/api/whoami` endpoint |
| node-oidc-provider | Custom (Node.js Alpine) | 3001 | Local OIDC provider with Descope-compatible claims |
| ory-hydra | oryd/hydra:v2 | 4444, 4445 | Local OAuth2/OIDC provider |
| hydra-consent | Custom (Node.js minimal) | 3002 | Login/consent stub for Ory Hydra |

## 3. Key Architectural Decisions

### ADR-1: Go Plugin over Python/JavaScript for Claim Normalization

**Decision:** Implement the claim normalization plugin in Go using Tyk's native Go plugin API.

**Rationale:**
- **Performance:** Go plugins execute in-process with the gateway (no IPC, no gRPC hop). Target: < 2ms added latency (NFR-1). Python and JavaScript plugins use embedded interpreters or gRPC, adding 5-15ms overhead per request.
- **Type safety:** Go's static typing catches claim extraction errors at compile time. Map access patterns (`claims["tenants"].(map[string]interface{})`) fail explicitly rather than silently returning nil.
- **Production reusability:** The plugin is production-grade quality (quality tier). Go is the natural choice for a reusable gateway plugin that could be extracted for real deployments.
- **Tyk ecosystem alignment:** Tyk itself is written in Go. Go plugins have the most mature API surface, best documentation, and first-class support.

**Trade-off:** Go plugins must be compiled against the exact Tyk version using `tykio/tyk-plugin-compiler`. This creates a version-pinning constraint but prevents runtime ABI mismatches.

### ADR-2: PostAuth Hook Position

**Decision:** Register the claim normalization plugin as a `PostAuth` hook (also called `post_key_auth`).

**Rationale:**
- **PostAuth executes after Tyk validates the JWT** -- the plugin never processes unauthenticated requests. This means:
  - The JWT signature is already verified
  - Token expiry is already checked
  - The issuer is already validated against `openid_options.providers`
  - The decoded claims are available in the request context
- **Pre-request (upstream) hook is too late** -- by that point we need headers already set
- **Pre-auth hook is too early** -- claims are not yet available

**Execution order in Tyk:** Authentication (JWT/OIDC validation) --> **PostAuth hook (our plugin)** --> Rate limiting --> Request transformation --> Upstream forwarding

### ADR-3: Issuer-Based Provider Detection with Generic Fallback

**Decision:** Detect the IdP by matching the JWT `iss` (issuer) claim against a configurable registry. Unknown issuers fall back to `GenericMapper`.

**Rationale:**
- Issuer is a mandatory OIDC claim -- always present in valid JWTs
- Issuer URLs are unique per provider -- no ambiguity
- Generic fallback ensures the plugin never hard-fails on an unconfigured provider. It extracts `sub` and `email` (standard OIDC claims) and sets provider to `generic`
- Adding a new provider means: (1) add a mapper Go file, (2) register issuer pattern in the registry. No existing code changes.

**Registry design:** The issuer-to-mapper registry uses prefix matching to handle URL variations (e.g., `https://api.descope.com/` matches both Descope issuer formats). The registry is initialized at plugin load time from a configuration struct.

### ADR-4: CanonicalIdentity as the Normalization Contract

**Decision:** All mappers produce a `CanonicalIdentity` struct. The plugin serializes this struct into HTTP headers.

**Rationale:**
- A single output type enforces consistency across all mappers
- The struct is the contract between the gateway and the backend -- the backend never parses JWT claims
- Optional fields (Tenant, Roles) are represented as empty string / empty slice, not omitted headers -- the backend always sees all five headers

### ADR-5: node-oidc-provider Uses GenericMapper via extraTokenClaims

**Decision:** node-oidc-provider emits Descope-compatible claims via `extraTokenClaims`, but the plugin routes it through `GenericMapper` (not `DescopeMapper`).

**Rationale:**
- node-oidc-provider's issuer (`http://node-oidc-provider:3001`) does not match Descope's issuer pattern
- The `GenericMapper` handles standard OIDC claims (`sub`, `email`) plus top-level `roles` if present
- This validates the fallback path -- proving that unconfigured providers still produce usable canonical output
- If node-oidc-provider emits `roles` as a top-level claim (via `extraTokenClaims`), `GenericMapper` picks it up

### ADR-6: Per-Provider OIDC Sessions in the Demo UI

**Decision:** The demo page manages its own per-provider OIDC sessions independently, outside the main application's authentication context.

**Rationale:**
- The demo page is a self-contained demonstration, not part of the main application flow
- Each provider card creates its own `oidc-client-ts` `UserManager` instance with provider-specific configuration (authority, client_id, redirect_uri, scope)
- `signinPopup()` is used instead of `signinRedirect()` to keep all providers active on a single page without navigating away
- This avoids interference with the main app's `react-oidc-context` provider

## 4. Claim Normalization Plugin Architecture

### Directory Structure

```
tyk/plugins/claim-normalizer/
├── main.go              # Plugin entry point, PostAuth hook registration
├── normalizer.go        # Core normalization logic, issuer registry
├── canonical.go         # CanonicalIdentity struct, header injection
├── mappers/
│   ├── mapper.go        # ClaimMapper interface definition
│   ├── descope.go       # Descope claim mapper
│   ├── ory.go           # Ory Hydra claim mapper
│   ├── entra.go         # Entra ID claim mapper (v2)
│   ├── cognito.go       # Cognito claim mapper (v2)
│   └── generic.go       # Generic OIDC fallback mapper
├── mappers_test.go      # Unit tests for all mappers
├── normalizer_test.go   # Integration tests for normalization pipeline
├── go.mod
├── go.sum
└── Makefile             # build-plugin target
```

### ClaimMapper Interface

```go
// ClaimMapper normalizes IdP-specific JWT claims into a CanonicalIdentity.
type ClaimMapper interface {
    // CanMap returns true if this mapper handles the given issuer URL.
    CanMap(issuer string) bool

    // MapClaims extracts canonical identity fields from raw JWT claims.
    // Returns an error if required claims (sub) are missing or malformed.
    MapClaims(claims map[string]interface{}) (*CanonicalIdentity, error)
}
```

### CanonicalIdentity Struct

```go
// CanonicalIdentity is the normalized output of claim mapping.
// All fields are populated (empty string/slice for absent values).
type CanonicalIdentity struct {
    UserID   string   // sub claim (required)
    Email    string   // email claim (optional, empty if absent)
    Roles    []string // provider-specific role extraction (optional, empty if absent)
    Tenant   string   // provider-specific tenant extraction (optional, empty if absent)
    Provider string   // mapper identifier: "descope", "ory", "entra", "cognito", "generic"
}
```

### Header Injection

| Header | Source | Format | Example |
|--------|--------|--------|---------|
| `X-User-ID` | `CanonicalIdentity.UserID` | Plain string | `U2kj8f9...` |
| `X-User-Email` | `CanonicalIdentity.Email` | Plain string | `user@example.com` |
| `X-Roles` | `CanonicalIdentity.Roles` | JSON array string | `["admin","viewer"]` |
| `X-Tenant` | `CanonicalIdentity.Tenant` | Plain string | `T1234567` |
| `X-IdP` | `CanonicalIdentity.Provider` | Plain string | `descope` |

**Security:** Inbound requests have `X-User-ID`, `X-User-Email`, `X-Roles`, `X-Tenant`, and `X-IdP` headers stripped before the plugin executes (NFR-4). The backend trusts these headers only because Tyk sets them after validation.

### Error Handling

If claim normalization fails (missing `sub`, mapper error, type assertion failure):
- Plugin returns HTTP 500 with structured JSON error body: `{"error": "claim_normalization_failed", "detail": "missing required claim: sub"}`
- Error logs include the mapper name and claim key names (not values) per NFR-5
- The request is NOT forwarded to the upstream

## 5. Claim Mapping Matrix

### v1 Providers

| Claim | Descope | Ory Hydra | node-oidc-provider (Generic) |
|-------|---------|-----------|------------------------------|
| **UserID** | `sub` | `sub` | `sub` |
| **Email** | `email` | `email` | `email` |
| **Roles** | `tenants[dct].roles` | `ext.roles` | top-level `roles` (if present) |
| **Tenant** | `dct` | `ext.tenant` (or empty) | top-level `dct` (if present, via `extraTokenClaims`) |
| **Provider** | `"descope"` (hardcoded) | `"ory"` (hardcoded) | `"generic"` (hardcoded) |
| **Issuer pattern** | `https://api.descope.com/*` | `http://ory-hydra:4444/*` | (any unmatched issuer) |

### v2 Providers (Growth Features)

| Claim | Entra ID | Cognito |
|-------|----------|---------|
| **UserID** | `sub` (or `oid` for app-specific) | `sub` |
| **Email** | `preferred_username` (or `email` if in scope) | `email` |
| **Roles** | `roles[]` (app roles from manifest) | `cognito:groups` |
| **Tenant** | `tid` (Azure AD tenant ID) | (empty -- Cognito has no native tenant concept) |
| **Provider** | `"entra"` (hardcoded) | `"cognito"` (hardcoded) |
| **Issuer pattern** | `https://login.microsoftonline.com/*/v2.0` | `https://cognito-idp.*.amazonaws.com/*` |

### Mapper Implementation Details

**DescopeMapper** -- Descope's multi-tenant JWT claim structure is the most complex:
```
JWT claims: {
  "sub": "U2kj8f9...",
  "email": "user@example.com",
  "dct": "T1234567",                    // current tenant context
  "tenants": {
    "T1234567": {
      "roles": ["admin", "editor"],
      "permissions": ["projects.create", "projects.read"]
    },
    "T9876543": {
      "roles": ["viewer"],
      "permissions": ["projects.read"]
    }
  }
}
```
Extraction: `UserID = sub`, `Email = email`, `Tenant = dct`, `Roles = tenants[dct].roles`. If `dct` is missing, `Tenant` is empty and `Roles` is empty (no tenant context to resolve).

**OryMapper** -- Ory Hydra uses the `ext` (extensions) namespace for custom claims:
```
JWT claims: {
  "sub": "user-uuid-1234",
  "email": "user@example.com",
  "ext": {
    "roles": ["admin"],
    "tenant": "org-123"
  }
}
```
Extraction: `UserID = sub`, `Email = email`, `Roles = ext.roles`, `Tenant = ext.tenant`. If `ext` is missing, roles and tenant are empty.

**GenericMapper** -- Fallback for any OIDC provider, including node-oidc-provider:
```
JWT claims: {
  "sub": "user-001",
  "email": "user@example.com",
  "roles": ["admin", "viewer"]     // optional top-level claim
}
```
Extraction: `UserID = sub`, `Email = email`. If top-level `roles` claim exists (array of strings), extract it. If top-level `dct` claim exists, extract as tenant. Otherwise, roles and tenant are empty.

## 6. Plugin Build Pipeline

### Build Process

The plugin must be compiled using the `tykio/tyk-plugin-compiler` Docker image matching the exact Tyk Gateway version in `docker-compose.yml`. Version mismatches produce build-time errors (NFR-8).

```
Makefile target: build-plugin

Steps:
  1. Run tykio/tyk-plugin-compiler:v5.3 container
  2. Mount tyk/plugins/claim-normalizer/ as source
  3. Compile Go plugin to .so file
  4. Output: tyk/plugins/claim-normalizer.so
  5. Tyk gateway loads .so at startup from mounted volume

Command:
  docker run --rm \
    -v $(pwd)/tyk/plugins/claim-normalizer:/plugin-source \
    -v $(pwd)/tyk/plugins:/output \
    tykio/tyk-plugin-compiler:v5.3 \
    claim-normalizer.so
```

### CI Integration

The `build-plugin` target runs in CI. A compilation failure (Go errors, version mismatch, missing dependencies) fails the CI pipeline (NFR-14).

### Tyk API Definition Configuration

```json
{
  "name": "Multi-IdP Demo API",
  "api_id": "multi-idp-demo",
  "use_openid": true,
  "openid_options": {
    "providers": [
      {
        "issuer": "https://api.descope.com/{project_id}",
        "client_ids": { "{descope_client_id}": "default-policy" }
      },
      {
        "issuer": "http://node-oidc-provider:3001",
        "client_ids": { "demo-client": "default-policy" }
      },
      {
        "issuer": "http://ory-hydra:4444/",
        "client_ids": { "demo-client": "default-policy" }
      }
    ]
  },
  "custom_middleware": {
    "post": [
      {
        "name": "ClaimNormalizerPlugin",
        "path": "/opt/tyk-gateway/plugins/claim-normalizer.so"
      }
    ]
  },
  "proxy": {
    "listen_path": "/api/",
    "target_url": "http://fastapi-backend:8000/api/",
    "strip_listen_path": false
  }
}
```

## 7. Frontend Architecture

### Demo Page Structure

The demo page lives at `/demo/multi-idp` and is a self-contained React component tree that operates independently of the main application's authentication context (FR-18).

```
src/pages/demo/
├── MultiIdpDemo.tsx        # Page component, provider card grid layout
├── ProviderCard.tsx         # Reusable provider card component
├── ProviderCard.css         # Card styling (responsive grid)
├── providers.config.ts      # Provider configurations (from env vars)
└── types.ts                 # CanonicalIdentity, ProviderConfig types
```

### ProviderCard Component

Each `ProviderCard` encapsulates a complete per-provider OIDC flow:

1. **Idle state:** Provider logo/icon, provider name, "Sign In" button
2. **After popup auth:** Status indicator (authenticated), raw claims section (collapsible), "Call /api/whoami" happens automatically
3. **After API call:** Normalized response displayed prominently, raw claims displayed as secondary

### OIDC Flow per Provider

```
User clicks "Sign In" on a provider card
    │
    ▼
ProviderCard creates a UserManager instance (oidc-client-ts)
  - authority: provider's OIDC issuer URL
  - client_id: from provider config
  - redirect_uri: popup callback URL
  - scope: "openid email profile" (+ provider-specific scopes)
    │
    ▼
userManager.signinPopup()
  - Opens popup window to provider's /authorize endpoint
  - User authenticates in popup
  - Popup redirects back with authorization code
  - oidc-client-ts exchanges code for tokens
    │
    ▼
Popup closes, ProviderCard receives User object with access_token
    │
    ├── Display raw token claims (decoded JWT payload)
    │
    ▼
fetch("http://localhost:8080/api/whoami", {
  headers: { "Authorization": "Bearer " + user.access_token }
})
    │
    ▼
Display normalized response:
  { user_id, email, roles, tenant, provider }
```

### Provider Configuration

Provider configurations are loaded from environment variables or a configuration file (FR-17):

```typescript
interface ProviderConfig {
  id: string;              // unique identifier
  name: string;            // display name
  icon: string;            // logo/icon path or emoji
  authority: string;       // OIDC issuer URL
  clientId: string;        // OAuth2 client_id
  scope: string;           // requested scopes
  extraQueryParams?: Record<string, string>;  // provider-specific params
}
```

Environment variables:
- `VITE_DESCOPE_PROJECT_ID` -- Descope project ID (authority derived)
- `VITE_NODE_OIDC_AUTHORITY` -- node-oidc-provider URL (default: `http://localhost:3001`)
- `VITE_ORY_HYDRA_AUTHORITY` -- Ory Hydra URL (default: `http://localhost:4444`)
- `VITE_GATEWAY_URL` -- Tyk gateway URL (default: `http://localhost:8080`)

### Responsive Grid Layout

The provider cards render in a responsive CSS grid:
- Desktop (>1024px): 4 columns
- Tablet (768-1024px): 2 columns
- Mobile (<768px): 1 column

## 8. Local IdP Provisioning

### node-oidc-provider Service

```yaml
# docker-compose.yml (full profile excerpt)
node-oidc-provider:
  build: ./idp/node-oidc-provider
  ports:
    - "3001:3001"
  environment:
    - ISSUER=http://node-oidc-provider:3001
    - PORT=3001
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/.well-known/openid-configuration"]
    interval: 5s
    timeout: 3s
    retries: 10
    start_period: 5s
  profiles:
    - full
```

Configuration:
- In-memory adapter (no external storage)
- Static client: `client_id=demo-client`, `client_secret=demo-secret`, `redirect_uris=["http://localhost:3000/demo/multi-idp/callback"]`
- `devInteractions` enabled for zero-config login (built-in dev login form)
- `extraTokenClaims` hook emits: `roles: ["demo-user"]`, `dct: "demo-tenant"`, `email: "demo@node-oidc.local"`
- JWT access tokens enabled (not opaque)

### Ory Hydra Service

```yaml
# docker-compose.yml (full profile excerpt)
ory-hydra:
  image: oryd/hydra:v2
  ports:
    - "4444:4444"  # public
    - "4445:4445"  # admin
  environment:
    - DSN=memory
    - URLS_SELF_ISSUER=http://ory-hydra:4444/
    - URLS_CONSENT=http://hydra-consent:3002/consent
    - URLS_LOGIN=http://hydra-consent:3002/login
    - URLS_LOGOUT=http://hydra-consent:3002/logout
    - SECRETS_SYSTEM=a-very-secret-system-secret
    - OIDC_SUBJECT_IDENTIFIERS_SUPPORTED_TYPES=public
    - LOG_LEVEL=warn
  healthcheck:
    test: ["CMD", "wget", "-q", "--spider", "http://localhost:4444/health/alive"]
    interval: 5s
    timeout: 3s
    retries: 10
    start_period: 10s
  profiles:
    - full

hydra-consent:
  build: ./idp/hydra-consent
  ports:
    - "3002:3002"
  environment:
    - HYDRA_ADMIN_URL=http://ory-hydra:4445
    - PORT=3002
  depends_on:
    ory-hydra:
      condition: service_healthy
  profiles:
    - full
```

The `hydra-consent` service is a minimal Node.js Express app that:
- Auto-accepts login with hardcoded test users (e.g., `demo@ory.local` / `password`)
- Auto-accepts consent (grants all requested scopes)
- Sets `ext.roles` and `ext.tenant` in the consent session's `access_token` claims

### Healthcheck Dependencies

```yaml
tyk-gateway:
  depends_on:
    redis:
      condition: service_healthy
    node-oidc-provider:
      condition: service_healthy
    ory-hydra:
      condition: service_healthy
```

Tyk does not start until all IdP discovery endpoints return 200 (FR-24). This prevents JWKS fetch failures during gateway initialization.

### Cloud IdP Setup (v2 -- Documentation Only)

Entra ID and Cognito require the user's own Azure AD tenant / AWS Cognito pool. Configuration instructions (not automation) will be provided as markdown guides:
- `docs/setup-entra-id.md` -- App registration, redirect URIs, role claim configuration
- `docs/setup-cognito.md` -- User pool, app client, group-to-role mapping

## 9. Technology Decisions Summary

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Plugin language | Go | Python, JavaScript, gRPC | In-process execution, < 2ms latency, type safety, Tyk ecosystem alignment |
| Plugin hook | PostAuth | Pre-auth, Pre-request, Response | Claims available post-JWT-validation, headers needed before upstream |
| Provider detection | Issuer claim matching | Audience claim, custom header, hardcoded | Issuer is mandatory OIDC claim, unique per provider, supports prefix matching |
| Fallback strategy | GenericMapper | Hard fail, config-required | Graceful degradation -- unknown providers still get sub/email extraction |
| Frontend popup flow | `signinPopup()` | `signinRedirect()` | Multiple providers on one page without navigation; each card independent |
| OIDC library (frontend) | `oidc-client-ts` | `react-oidc-context` (shared), custom | Per-provider UserManager instances; react-oidc-context is designed for single-provider |
| Local Ory Hydra consent | Minimal Node.js stub | Full consent app, Ory Kratos integration | Demo-quality: auto-accept login/consent with hardcoded users |
| node-oidc-provider adapter | In-memory | Redis, PostgreSQL | Zero-config demo; no persistence needed for ephemeral demo sessions |
| Plugin build | tykio/tyk-plugin-compiler Docker | Local Go build, custom Dockerfile | Version-pinned compilation prevents ABI mismatch at runtime |

## 10. Cross-Repo Interface Contracts

### Plugin --> Backend Contract

The claim normalization plugin and the FastAPI backend share a contract through HTTP headers. This is the only interface between the gateway and the backend for this demo:

| Header | Type | Required | Produced by | Consumed by |
|--------|------|----------|-------------|-------------|
| `X-User-ID` | string | Yes (401 if absent) | Plugin | `/api/whoami` |
| `X-User-Email` | string | No (empty string if absent) | Plugin | `/api/whoami` |
| `X-Roles` | JSON array string | No (empty array `[]` if absent) | Plugin | `/api/whoami` |
| `X-Tenant` | string | No (empty string if absent) | Plugin | `/api/whoami` |
| `X-IdP` | string | Yes (always set by plugin) | Plugin | `/api/whoami` |

### Frontend --> Gateway Contract

The frontend sends requests to the Tyk gateway with a provider-specific Bearer token. The gateway returns either:
- The upstream response (on success)
- HTTP 401 (invalid/expired token)
- HTTP 500 (claim normalization failure)

### No Direct Backend Dependencies

The `/api/whoami` endpoint has zero dependencies on:
- py-identity-model (no token validation -- Tyk handles it)
- Descope Management API (no IdP-specific operations)
- Any IdP-specific library or SDK

This is the architectural proof point: the backend is fully IdP-agnostic.
