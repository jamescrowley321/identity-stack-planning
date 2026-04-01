---
stepsCompleted: ['accelerated-from-prd']
inputDocuments:
  - _bmad-output/planning-artifacts/prd-multi-provider-test.md
  - _bmad-output/brainstorming/research/node-oidc-provider-research.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'architecture'
project_name: 'identity-stack-planning'
user_name: 'James'
date: '2026-03-29'
---

# Architecture Decision Document — Multi-Provider Test Infrastructure (I4)

## 1. System Context

### Scope

This document covers the architecture for Initiative I4: introducing `node-oidc-provider` as a lightweight OIDC provider serving two purposes:

1. **[PIM]** Docker-based integration test fixture for py-identity-model, replacing/supplementing the heavyweight .NET IdentityServer
2. **[IS]** Second OIDC provider in identity-stack's Docker Compose `full` profile, demonstrating multi-provider capability alongside Descope
3. **[IS]** Tyk API gateway configured to validate JWTs from both providers simultaneously

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    py-identity-model (test context)                     │
│                                                                         │
│  ┌──────────────┐    ┌──────────────────────┐    ┌───────────────────┐  │
│  │ test-runner   │───▶│ node-oidc-provider   │    │ .NET Identity-   │  │
│  │ (pytest)      │    │ (node:20-alpine)     │    │ Server (existing)│  │
│  │               │    │                      │    │                  │  │
│  │ DISCOVERY_URL │    │ /.well-known/openid  │    │ /.well-known/... │  │
│  │ → oidc-provid │    │ /token               │    │ /connect/token   │  │
│  │   er:3000     │    │ /jwks                │    │                  │  │
│  └──────────────┘    └──────────────────────┘    └───────────────────┘  │
│                                                                         │
│  docker-compose.test.yml                                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                  identity-stack (full profile)                           │
│                                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐              │
│  │ Frontend │──▶│ Tyk Gateway  │──▶│ FastAPI Backend     │              │
│  │ (React)  │   │              │   │                     │              │
│  │          │   │ JWT validate │   │ Zero code changes   │              │
│  └──────────┘   │ from BOTH:   │   │ — Tyk handles       │              │
│       │         │              │   │   multi-provider     │              │
│       │         │ • Descope    │   └────────────────────┘              │
│       │         │ • node-oidc  │                                        │
│       │         └──────────────┘                                        │
│       │                ▲                                                │
│       │                │ JWT                                            │
│       ▼                │                                                │
│  ┌──────────────┐  ┌──────────────────────┐                            │
│  │ Descope      │  │ node-oidc-provider   │                            │
│  │ (hosted)     │  │ (localhost:3100)      │                            │
│  │              │  │ devInteractions UI    │                            │
│  └──────────────┘  └──────────────────────┘                            │
│                                                                         │
│  docker-compose.yml (--profile full)                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dual-Purpose Architecture

The same Docker image serves both contexts. The container is configured at runtime via environment variables:

| Context | Issuer | Port (host) | Grant Types | Client Config |
|---------|--------|-------------|-------------|---------------|
| py-identity-model test fixture | `http://oidc-provider:3000` | 3000 | `client_credentials` | Static: `test-client` / `test-secret` |
| identity-stack second provider | `http://node-oidc-provider:3000` | 3100 | `client_credentials`, `authorization_code` | Static: test client + auth code client with redirect_uri |

The image is built once from `py-identity-model/test-fixtures/node-oidc-provider/`. Identity-stack references it via a `build` context pointing to the py-identity-model repo or a published image.

## 2. Key Architectural Decisions

### ADR-I4-1: node-oidc-provider as Primary Test Fixture

**Decision:** Use `node-oidc-provider` (panva/node-oidc-provider v9.x, MIT license) as the primary integration test fixture, supplementing (not forcibly replacing) the existing .NET IdentityServer.

**Rationale:**

| Attribute | .NET IdentityServer (current) | node-oidc-provider (new) |
|-----------|-------------------------------|--------------------------|
| Cold start to health check | ~60 seconds | ~2-3 seconds |
| Docker image size | ~400MB+ (multi-stage .NET build) | ~150MB (node:20-alpine) |
| Certificate management | Required (PFX, CA cert generation, shared volumes) | None (HTTP only for tests) |
| License | Duende (commercial considerations) | MIT |
| Custom claims | Requires C# code changes | `extraTokenClaims` JS hook |
| Dependencies | .NET SDK, ASP.NET runtime, cert-generator sidecar | Single npm package (`oidc-provider`) |
| OIDC conformance | Not independently certified | Certified: Basic through FAPI 2.0 |
| Maintenance burden | C# project, multi-file config, separate Dockerfile | Single `provider.js` file (~100-150 lines) |

**Coexistence strategy:** Both providers remain available in `docker-compose.test.yml`. Tests are tagged with `@pytest.mark.node_oidc` and `@pytest.mark.identity_server` so they can run independently. CI runs node-oidc-provider tests by default (fast); IdentityServer tests remain available for extended validation.

### ADR-I4-2: In-Memory Adapter, No Persistence

**Decision:** Use node-oidc-provider's built-in `MemoryAdapter` (LRU cache, 1000 entries) with no external storage.

**Rationale:**
- Test fixtures are ephemeral — containers are created and destroyed per test run
- No state needs to survive container restarts
- Eliminates Redis/PostgreSQL dependency for test infrastructure
- The LRU cache (1000 entries) far exceeds test suite needs (typically <50 tokens per run)
- Persistent adapters are deferred to I5 (embedded NestJS OIDC server — backlog)

**Trade-off:** Cannot test token persistence or cross-restart session continuity. This is acceptable because py-identity-model validates tokens, not session state.

### ADR-I4-3: devInteractions for Login UI

**Decision:** Use node-oidc-provider's built-in `devInteractions` feature (auto-approve consent screen) instead of building custom login UI.

**Rationale:**
- v1 scope is explicitly minimal — custom UI is deferred to I5
- `devInteractions` provides a functional login/consent flow for testing authorization_code grant in identity-stack
- The `devInteractions` screen auto-fills a test user account and auto-approves consent
- Docker Compose profile naming (`full` not `production`) signals dev-only intent
- Building a custom login UI would add 2-4 weeks of scope per the research assessment

**Security note:** `devInteractions` must NEVER be enabled in any production deployment. The profile name and inline code comments enforce this constraint.

### ADR-I4-4: Static Client Configuration

**Decision:** Configure all OAuth2 clients statically in `provider.js` rather than using Dynamic Client Registration.

**Rationale:**
- Test scenarios have a known, fixed set of clients
- Static configuration is deterministic — same config produces same behavior every run
- Dynamic Client Registration adds protocol complexity without test value for v1
- Clients are environment-variable configurable for different deployment contexts (test fixture vs identity-stack)

**Clients configured:**

```js
clients: [
  {
    // Machine-to-machine: py-identity-model integration tests
    client_id: 'test-client',
    client_secret: 'test-secret',
    grant_types: ['client_credentials'],
    response_types: [],
    scope: 'openid',
  },
  {
    // Interactive: identity-stack authorization code flow
    client_id: 'identity-stack-client',
    client_secret: 'identity-stack-secret',
    grant_types: ['authorization_code'],
    response_types: ['code'],
    redirect_uris: ['http://localhost:3000/callback'],
    scope: 'openid profile email',
  },
]
```

### ADR-I4-5: HTTP Only, No TLS

**Decision:** Run node-oidc-provider on HTTP (no TLS) in all test/demo contexts.

**Rationale:**
- Eliminates certificate management entirely (the current IdentityServer setup requires a cert-generator sidecar, PFX files, shared volumes, and CA bundle environment variables)
- Docker networks provide isolation — services communicate within a private bridge network
- py-identity-model's token validation does not require HTTPS for the issuer URL (issuer is a string comparison, not a TLS connection)
- This is a test fixture, not a production service — NFR-5 explicitly permits HTTP

**Trade-off:** Cannot test TLS-specific behaviors (certificate pinning, mTLS). mTLS testing is deferred to I5/Epic 10 (FR-PIM-15).

### ADR-I4-6: Tyk Multi-Provider at Gateway Layer

**Decision:** Multi-provider JWT validation happens at Tyk (API gateway), not in the FastAPI backend. The backend requires zero code changes.

**Rationale:**
- Tyk's `openid_options.providers` array natively supports multiple OIDC issuers
- Each provider entry specifies its own issuer URL — Tyk fetches JWKS from each and validates incoming JWTs against all configured providers
- The FastAPI backend already receives validated requests from Tyk — it does not care which provider issued the token
- This matches the identity-stack's existing architecture where Tyk handles JWT validation as middleware
- NFR-11 explicitly requires zero backend code changes

**Configuration pattern:**
```json
{
  "openid_options": {
    "providers": [
      {
        "issuer": "https://api.descope.com/{project_id}",
        "client_ids": {
          "{descope_client_id}": "admin"
        }
      },
      {
        "issuer": "http://node-oidc-provider:3000",
        "client_ids": {
          "identity-stack-client": "admin"
        }
      }
    ]
  }
}
```

## 3. node-oidc-provider Configuration Architecture

### provider.js Structure

The entire OIDC provider is configured in a single `provider.js` file (~100-150 lines). This is the core artifact of the initiative.

```
test-fixtures/node-oidc-provider/
├── provider.js       # Provider configuration + startup (~100-150 lines)
├── package.json      # Single dependency: oidc-provider (pinned version)
├── Dockerfile        # node:20-alpine, ~10 lines
└── .dockerignore     # node_modules, .git
```

### provider.js Configuration Sections

```js
// 1. JWKS — signing keys (RSA default, EC for growth)
const jwks = {
  keys: [
    // RSA key for primary signing (generated or static for deterministic tests)
    { kty: 'RSA', ... },
    // EC key (P-256) for multi-key-type coverage (Growth: FR-13/FR-14)
    // { kty: 'EC', crv: 'P-256', ... },
  ],
};

// 2. Clients — static registration
const clients = [
  {
    client_id: 'test-client',
    client_secret: 'test-secret',
    grant_types: ['client_credentials'],
    response_types: [],
    scope: 'openid',
  },
  // Authorization code client added for identity-stack context
];

// 3. Claims — scope-to-claim mapping
const claims = {
  openid: ['sub'],
  profile: ['name', 'given_name', 'family_name'],
  email: ['email', 'email_verified'],
  // Custom scope for Descope-style claims (Growth)
  tenants: ['dct', 'tenants'],
};

// 4. Features — minimal set enabled
const features = {
  clientCredentials: { enabled: true },
  devInteractions: { enabled: true },
  // introspection: { enabled: true },     // Growth
  // revocation: { enabled: true },         // Growth
};

// 5. extraTokenClaims — Descope-style JWT structure (Growth: FR-13)
async function extraTokenClaims(ctx, token) {
  // Inject dct/tenants into JWT access tokens
  // Triggered by X-Tenant-Context header on token request
  const tenantContext = ctx.request?.headers?.['x-tenant-context'];
  if (!tenantContext) return {};
  return {
    dct: tenantContext,
    tenants: {
      [tenantContext]: {
        roles: ['admin'],
        permissions: ['projects.create', 'projects.read'],
      },
    },
  };
}

// 6. Token format — JWT access tokens (not opaque)
const formats = {
  accessToken: 'jwt',
};

// 7. Provider instantiation
const issuer = process.env.ISSUER || 'http://localhost:3000';
const provider = new Provider(issuer, {
  jwks,
  clients,
  claims,
  features,
  extraTokenClaims,
  formats,
  // Token TTL
  ttl: {
    AccessToken: 3600,
    ClientCredentials: 3600,
  },
});

// 8. Start server
const port = process.env.PORT || 3000;
provider.listen(port, () => {
  console.log(`oidc-provider listening on port ${port}, issuer: ${issuer}`);
});
```

### Key Configuration Details

**JWT Access Tokens:** node-oidc-provider defaults to opaque access tokens. Setting `formats.accessToken = 'jwt'` is required because py-identity-model validates JWT structure (header, payload, signature). Opaque tokens would require introspection, which is not in MVP scope.

**JWKS Key Generation:** For deterministic test behavior, JWKS keys can be:
- **Option A:** Generated at startup (default node-oidc-provider behavior) — simpler but keys change per container restart
- **Option B:** Static keys embedded in `provider.js` — deterministic, enables test assertions on specific key IDs

**Recommendation:** Use Option A (auto-generated) for MVP. Tests should not assert on specific key IDs — they should validate the JWKS fetch + signature verification flow. Static keys can be added later if specific key rotation tests require them.

**Version Pinning:** `package.json` must pin `oidc-provider` to an exact version (e.g., `"oidc-provider": "9.7.1"`) per NFR-9, because node-oidc-provider ships breaking changes to experimental features in MINOR versions.

## 4. Docker Integration

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY provider.js .
EXPOSE 3000
HEALTHCHECK --interval=2s --timeout=5s --retries=10 --start-period=5s \
  CMD wget -q --spider http://localhost:3000/.well-known/openid-configuration || exit 1
CMD ["node", "provider.js"]
```

**Design notes:**
- `node:20-alpine` keeps image under 200MB (NFR-4) — Alpine base is ~50MB, node runtime ~80MB, `oidc-provider` + `jose` ~10MB
- `npm ci --production` installs only production dependencies (no devDependencies)
- `COPY provider.js .` is a single file — no build step, no TypeScript compilation
- Health check uses `wget` (available in Alpine) rather than `curl` (not in Alpine by default)
- Health check validates the discovery endpoint returns HTTP 200

### docker-compose.test.yml Integration (py-identity-model)

Added service alongside existing IdentityServer:

```yaml
services:
  # Existing services (cert-generator, identityserver, fastapi-app, test-runner)
  # remain unchanged per NFR-8

  oidc-provider:
    build:
      context: ./test-fixtures/node-oidc-provider
    container_name: examples-oidc-provider
    ports:
      - "3000:3000"
    environment:
      - ISSUER=http://oidc-provider:3000
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider",
             "http://localhost:3000/.well-known/openid-configuration"]
      interval: 2s
      timeout: 5s
      retries: 10
      start_period: 5s
    networks:
      - examples-test-network

  test-runner:
    # Updated to include node-oidc-provider discovery URL
    environment:
      - DISCOVERY_URL=http://oidc-provider:3000/.well-known/openid-configuration
      # Existing IdentityServer URL remains available for tagged tests
      - IDENTITY_SERVER_DISCOVERY_URL=https://identityserver:443/.well-known/openid-configuration
    depends_on:
      oidc-provider:
        condition: service_healthy
      # Existing IdentityServer dependency remains for tagged tests
```

**Key design choice:** The test-runner's `DISCOVERY_URL` points to node-oidc-provider by default. Tests marked `@pytest.mark.identity_server` use `IDENTITY_SERVER_DISCOVERY_URL` instead. This makes node-oidc-provider the primary test target (fast CI) while preserving IdentityServer as a secondary target.

### docker-compose.yml Integration (identity-stack, full profile)

```yaml
services:
  # Existing services (frontend, backend, tyk, etc.)

  node-oidc-provider:
    build:
      context: ../py-identity-model/test-fixtures/node-oidc-provider
      # Alternatively, reference a published image
    ports:
      - "3100:3000"    # Host port 3100 avoids conflicts (FR-17)
    environment:
      - ISSUER=http://node-oidc-provider:3000
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider",
             "http://localhost:3000/.well-known/openid-configuration"]
      interval: 2s
      timeout: 5s
      retries: 10
      start_period: 5s
    profiles:
      - full           # Only starts with --profile full (NFR-10)
    networks:
      - identity-stack-network
```

**Profile isolation (NFR-10):** The `node-oidc-provider` service is gated behind the `full` profile. Running `docker compose up` (no profile) or `docker compose --profile standalone up` does not start this service. Only `docker compose --profile full up` includes it.

## 5. Custom Claims Architecture

### Descope-Style JWT Structure

Descope JWTs contain multi-tenant authorization data:

```json
{
  "sub": "user-id",
  "iss": "http://oidc-provider:3000",
  "aud": "test-client",
  "exp": 1711700000,
  "iat": 1711696400,
  "jti": "unique-token-id",
  "dct": "tenant-1",
  "tenants": {
    "tenant-1": {
      "roles": ["admin"],
      "permissions": ["projects.create", "projects.read"]
    },
    "tenant-2": {
      "roles": ["viewer"],
      "permissions": ["projects.read"]
    }
  }
}
```

### extraTokenClaims Hook

The `extraTokenClaims` hook is the mechanism for injecting custom claims into JWT access tokens. It runs after token generation but before signing, allowing arbitrary top-level claims.

**Trigger mechanism:** The test suite passes an `X-Tenant-Context` header on the token request to signal which tenant context to inject. This keeps the provider configuration stateless — the test controls the claims per request.

```
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded
X-Tenant-Context: tenant-1

grant_type=client_credentials&client_id=test-client&client_secret=test-secret&scope=openid
```

**When no `X-Tenant-Context` header is present**, the hook returns an empty object and the JWT contains only standard OIDC claims. This ensures backward compatibility — existing tests that do not need custom claims are unaffected.

### Multi-Key-Type Support (Growth)

For key-type coverage testing, the JWKS can include both RSA and EC keys simultaneously:

```js
const jwks = {
  keys: [
    { kty: 'RSA', /* ... */ },         // Primary signing key
    { kty: 'EC', crv: 'P-256', /* ... */ },  // Secondary key for EC coverage
  ],
};
```

node-oidc-provider uses the first key in the array for signing by default. Tests can verify that py-identity-model correctly selects the matching key from JWKS based on the JWT header's `alg` and `kid`.

## 6. Test Flow Diagrams

### client_credentials Grant (py-identity-model Integration Tests)

```
┌──────────┐                    ┌──────────────────┐
│test-runner│                    │node-oidc-provider│
│ (pytest)  │                    │                  │
└─────┬─────┘                    └────────┬─────────┘
      │                                    │
      │  1. GET /.well-known/openid-configuration
      │───────────────────────────────────▶│
      │◀───────────────────────────────────│
      │     { issuer, token_endpoint,      │
      │       jwks_uri, ... }              │
      │                                    │
      │  2. GET /jwks                      │
      │───────────────────────────────────▶│
      │◀───────────────────────────────────│
      │     { keys: [{ kty, kid, ... }] }  │
      │                                    │
      │  3. POST /token                    │
      │     grant_type=client_credentials  │
      │     client_id=test-client          │
      │     client_secret=test-secret      │
      │───────────────────────────────────▶│
      │◀───────────────────────────────────│
      │     { access_token: "eyJ...",      │
      │       token_type: "Bearer" }       │
      │                                    │
      │  4. Validate JWT locally           │
      │     (py-identity-model)            │
      │     - Decode header + payload      │
      │     - Match kid → JWKS key         │
      │     - Verify signature             │
      │     - Check iss, exp, iat          │
      │                                    │
```

**What each test validates:**
- **Step 1 (FR-9):** Discovery document contains required OIDC fields
- **Step 2 (FR-10):** JWKS endpoint returns at least one signing key
- **Step 3 (FR-11):** Token endpoint issues a valid JWT access token via `client_credentials` grant
- **Step 4 (FR-11, FR-12):** py-identity-model correctly validates the JWT (signature, issuer, expiration, standard claims)

### authorization_code Flow (identity-stack, Full Profile)

```
┌────────┐        ┌──────────┐       ┌──────────────────┐       ┌───────┐
│Browser │        │ Frontend │       │node-oidc-provider│       │ Tyk   │
│        │        │ (React)  │       │ (devInteractions)│       │Gateway│
└───┬────┘        └────┬─────┘       └────────┬─────────┘       └───┬───┘
    │                   │                      │                     │
    │ 1. Click "Login   │                      │                     │
    │    with OIDC"     │                      │                     │
    │──────────────────▶│                      │                     │
    │                   │                      │                     │
    │ 2. Redirect to /auth                     │                     │
    │◀─────────────────────────────────────────│                     │
    │                   │                      │                     │
    │ 3. devInteractions auto-login            │                     │
    │──────────────────────────────────────────▶│                     │
    │◀─────────────────────────────────────────│                     │
    │     302 → /callback?code=xxx             │                     │
    │                   │                      │                     │
    │ 4. Callback with  │                      │                     │
    │    auth code       │                      │                     │
    │──────────────────▶│                      │                     │
    │                   │ 5. Exchange code      │                     │
    │                   │    for tokens         │                     │
    │                   │─────────────────────▶│                     │
    │                   │◀─────────────────────│                     │
    │                   │  { access_token,     │                     │
    │                   │    id_token }         │                     │
    │                   │                      │                     │
    │                   │ 6. API request with   │                     │
    │                   │    Bearer token        │                     │
    │                   │──────────────────────────────────────────▶│
    │                   │                      │  7. Validate JWT   │
    │                   │                      │◀────────────────────│
    │                   │                      │  JWKS fetch        │
    │                   │                      │─────────────────────▶
    │                   │                      │                     │
    │                   │◀────────────────────────────────────────────│
    │                   │     API response (from FastAPI backend)    │
    │◀──────────────────│                      │                     │
```

## 7. Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OIDC provider | node-oidc-provider v9.x | OpenID-certified (Basic through FAPI 2.0), MIT license, ~2s startup, single maintainer but Auth0-sponsored with consistent releases |
| Base image | node:20-alpine | Under 200MB total image size (NFR-4), `wget` available for health checks |
| Storage adapter | In-memory (MemoryAdapter) | Ephemeral test fixture — no state survives restarts, no external dependencies |
| Login UI | devInteractions (built-in) | Minimal v1 scope — functional dev-only consent screen, custom UI deferred to I5 |
| Client registration | Static (provider.js) | Deterministic test behavior, known fixed client set |
| Token format | JWT (not opaque) | py-identity-model validates JWT structure; opaque tokens would require introspection |
| Transport | HTTP only | Test fixture in isolated Docker network; eliminates certificate management entirely |
| Custom claims | extraTokenClaims hook | Injects Descope-style `dct`/`tenants` at token generation time; triggered by request header |
| Key types | RSA (MVP), RSA + EC (Growth) | RSA is universal; EC coverage validates py-identity-model's multi-algorithm support |
| Version pinning | Exact version in package.json | node-oidc-provider ships breaking changes in MINOR versions for experimental features |
| Multi-provider gateway | Tyk openid_options.providers | Native multi-issuer support; zero backend code changes required |

## 8. Comparison with Existing .NET IdentityServer Setup

### Quantitative Comparison

| Metric | .NET IdentityServer | node-oidc-provider | Improvement |
|--------|--------------------|--------------------|-------------|
| Cold start to health check | ~60 seconds | ~2-3 seconds | **20-30x faster** |
| Docker image size | ~400MB+ | ~150MB | **2.5x smaller** |
| Health check start_period | 60 seconds | 5 seconds | **12x faster** |
| Health check retries | 20 | 10 | 2x fewer |
| Container count (with deps) | 3 (cert-generator + identityserver + test-runner) | 2 (oidc-provider + test-runner) | 1 fewer |
| Configuration files | 4+ (Config.cs, appsettings.json, Dockerfile, cert scripts) | 3 (provider.js, package.json, Dockerfile) | Simpler |
| Custom claims | C# code change + rebuild | JS hook, no rebuild | Runtime configurable |
| TLS management | PFX certs, CA bundles, shared volumes, env vars | None | Eliminated |
| License | Duende (commercial) | MIT | No restrictions |
| OIDC conformance | Not independently certified | Certified Basic through FAPI 2.0 | Higher confidence |

### Qualitative Comparison

**Maintenance burden:** The .NET IdentityServer setup requires knowledge of ASP.NET Core, Kestrel HTTPS configuration, PFX certificate generation, and C# client configuration. The node-oidc-provider setup requires knowledge of a single JavaScript configuration file.

**CI impact:** The 60-second `start_period` for IdentityServer means CI jobs spend at least a minute waiting before tests can begin. node-oidc-provider's 5-second startup makes integration tests feasible on every PR without dedicated infrastructure.

**Failure modes:** IdentityServer failures often involve certificate issues (expired, wrong hostname, CA not trusted) or .NET runtime version mismatches. node-oidc-provider failures are limited to JavaScript errors in `provider.js` — a single file with ~100 lines.

## 9. Security Considerations

### Test Fixture Security Posture

This is **test infrastructure**, not production infrastructure. Security constraints are intentionally relaxed:

- **Static credentials** (`test-client`/`test-secret`) are acceptable because they exist only within Docker test networks (NFR-6)
- **HTTP transport** is acceptable because containers communicate within an isolated bridge network (NFR-5)
- **devInteractions** is acceptable in the `full` profile because the profile name and code comments signal dev-only intent (NFR-7)
- **No rate limiting** on the test fixture — it serves a small number of test requests

### Guardrails

1. `provider.js` includes a header comment: `// TEST FIXTURE ONLY — DO NOT USE IN PRODUCTION`
2. Docker Compose profile is named `full`, not `production`
3. Static client secrets are clearly marked as test-only values
4. `devInteractions` is documented as auto-approving all consent — no real authentication occurs

## 10. Future Considerations

### I5 Deferral (Embedded NestJS OIDC Server)

The following are explicitly out of scope for I4 and deferred to I5:

- Custom login/consent UI (NestJS controllers replacing `devInteractions`)
- Persistent storage adapter (PostgreSQL/Redis)
- Dynamic Client Registration
- TLS termination and certificate management
- Key rotation automation
- Multi-tenant issuer support (multiple Provider instances per tenant)
- Production deployment configuration

### Growth Path Within I4

The Growth features (FR-13, FR-14) extend the MVP container:

1. **Descope-style claims** — `extraTokenClaims` hook already architected above, activated by `X-Tenant-Context` header
2. **Multi-key-type** — Add EC key to JWKS array, no structural changes
3. **Dual-issuer testing** — Two node-oidc-provider instances with different `ISSUER` env vars to validate py-identity-model's multi-issuer support
4. **Introspection/revocation** — Enable `features.introspection` and `features.revocation` in provider config
