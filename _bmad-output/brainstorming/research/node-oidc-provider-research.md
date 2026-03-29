# node-oidc-provider Research Summary

## Project Vitals

| Attribute | Value |
|---|---|
| **Repository** | `panva/node-oidc-provider` |
| **Version** | v9.7.1 (released 2026-03-18) |
| **Stars** | 3,707 |
| **Forks** | 783 |
| **License** | MIT |
| **Language** | JavaScript (ESM, Node.js) |
| **Open Issues** | 0 (all issues/PRs closed) |
| **Total Issues (all time)** | ~1,405 |
| **Release Cadence** | ~monthly (10 releases in last 12 months) |
| **Last Updated** | 2026-03-28 |
| **Node.js Framework** | Built on Koa internally, mountable to Express, Fastify, Hapi, NestJS, Koa |
| **Key Dependency** | `jose` v6 (panva's own JWT/JWK library, 7,465 stars) |

### Maintainer Risk Assessment

panva (Filip Skokan) is the sole maintainer with 2,627 of ~2,700 total contributions. The next highest contributor (dependabot) has 29. This is a **single-maintainer project**, which is a known risk. However:

- He is also the sole maintainer of `jose` (7,465 stars) and `openid-client` (2,318 stars), forming the Node.js OIDC ecosystem trifecta
- He is sponsored by Auth0/Okta
- The project has passed the OpenID Connect conformance suite multiple times
- Release cadence is consistent and ongoing
- Zero open issues suggests either aggressive triage or the project is mature

**Risk mitigation**: The MIT license means the community could fork if needed. The codebase is well-documented and the adapter interface is clean enough that the community has produced adapters for DynamoDB, Firestore, Knex, Prisma, Sequelize, MongoDB, Redis.

---

## Use Case 1: Integration Target for py-identity-model and descope-saas-starter

### 1. OIDC Feature Support

node-oidc-provider has the most comprehensive OIDC/OAuth 2.0 spec coverage of any open-source Node.js library:

| Feature | Supported | Default |
|---|---|---|
| Discovery (`.well-known/openid-configuration`) | Yes | Always on |
| JWKS (`/jwks`) | Yes | Always on |
| Authorization Code + PKCE | Yes | PKCE enforced by default |
| Token Introspection (RFC 7662) | Yes | Disabled by default |
| Token Revocation (RFC 7009) | Yes | Disabled by default |
| Device Authorization Flow (RFC 8628) | Yes | Disabled by default |
| CIBA | Yes | Disabled by default |
| DPoP (RFC 9449) | Yes | **Enabled by default** |
| PAR (RFC 9126) | Yes | Available |
| JAR (RFC 9101) | Yes | Available |
| FAPI 1.0 + FAPI 2.0 | Yes | Disabled by default |
| JARM | Yes | Available |
| mTLS (RFC 8705) | Yes | Disabled by default |
| Resource Indicators (RFC 8707) | Yes | Available |
| JWT Access Tokens (RFC 9068) | Yes | Configurable |
| Dynamic Client Registration | Yes | Disabled by default |
| RP-Initiated Logout | Yes | Available |
| Back-Channel Logout | Yes | Available |
| Client Credentials Grant | Yes | Disabled by default |

### 2. JWT/Claims Structure vs. Descope

**Standard claims**: node-oidc-provider issues standard OIDC claims (`sub`, `iss`, `aud`, `exp`, `iat`, `auth_time`, `acr`, `amr`, `sid`, etc.). Claims are mapped to scopes via the `claims` configuration:

```js
claims: {
  openid: ['sub'],
  email: ['email', 'email_verified'],
  profile: ['name', 'given_name', 'family_name', ...],
  // Custom scopes with custom claims:
  tenants: ['dct', 'tenants'],
}
```

**Multi-tenant JWT support**: node-oidc-provider does NOT natively issue Descope-style multi-tenant JWTs with the `dct` and `tenants` structure. However, it is fully achievable via two mechanisms:

1. **`extraTokenClaims` hook** -- injects arbitrary top-level claims into JWT access tokens:
   ```js
   async extraTokenClaims(ctx, token) {
     return {
       dct: 'current-tenant-id',
       tenants: {
         'tenant-1': { roles: ['admin'], permissions: ['projects.create'] },
         'tenant-2': { roles: ['viewer'], permissions: ['projects.read'] },
       }
     };
   }
   ```

2. **`findAccount` + `claims()` method** -- the Account object's `claims()` function can return any claims, including nested objects, scoped by the `use` parameter (id_token vs userinfo).

**Key difference**: Descope uses two issuer formats (`https://api.descope.com/{project_id}` and `https://api.descope.com/v1/apps/{project_id}`). node-oidc-provider uses a single issuer set at Provider construction. For testing py-identity-model's dual-issuer validation, you would need to run two Provider instances or customize issuer handling.

### 3. Docker Container for Integration Testing

There is **no official Docker image**, but creating one is trivial. A minimal Dockerfile:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm init -y && npm install oidc-provider
COPY provider.js .
EXPOSE 3000
CMD ["node", "provider.js"]
```

The provider can be configured entirely via a JavaScript configuration file, making it highly suitable for Docker-based integration tests. The built-in `MemoryAdapter` (LRU cache, 1000 entries max) is perfect for test scenarios -- no external storage needed.

### 4. Storage Adapters

**Built-in**: In-memory adapter using `quick-lru` (suitable for development/testing only).

**Adapter interface** is clean -- 7 methods to implement: `upsert`, `find`, `findByUid`, `findByUserCode`, `consume`, `destroy`, `revokeByGrantId`. Models include: Grant, Session, AccessToken, AuthorizationCode, RefreshToken, ClientCredentials, Client, DeviceCode, Interaction, and more.

**Community adapters** (from v8 era, adaptable to v9): MongoDB, Redis, Redis with JSON, DynamoDB, Firestore, Knex (SQL), Prisma, Sequelize.

### 5. Claims, Scopes, and Token Format Configurability

Extremely configurable:
- **Claims**: Define any claim names, map them to scopes, control which go in id_token vs userinfo
- **Scopes**: Add custom scopes beyond `openid` and `offline_access`
- **Token formats**: Access tokens can be opaque or JWT (RFC 9068). Configurable per-resource via `features.resourceIndicators`
- **TTL**: Per-token-type TTL with function-based overrides
- **Key types**: RSA, EC (P-256, P-384, P-521), OKP (Ed25519, X25519)
- **Custom grant types**: `registerGrantType()` API for token exchange, etc.

### 6. OpenID Connect Conformance

**Yes, certified.** Filip Skokan has certified node-oidc-provider for:
- Basic, Implicit, Hybrid, Config, Form Post, 3rd Party-Init
- Back-Channel Logout and RP-Initiated Logout
- FAPI 1.0
- FAPI CIBA
- FAPI 2.0

The repo contains a `/certification` directory with conformance test runner code.

### 7. py-identity-model Integration Test Architecture

**Current state**: py-identity-model uses a .NET Duende IdentityServer in Docker (`mcr.microsoft.com/dotnet/aspnet:8.0`) with custom certificate generation. This is heavyweight (~60s startup, multi-stage build, PFX certificate management).

**Proposed architecture with node-oidc-provider**:

```yaml
# docker-compose.test.yml
services:
  oidc-provider:
    build: ./test-fixtures/oidc-provider
    ports: ["3000:3000"]
    environment:
      - ISSUER=http://oidc-provider:3000
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/.well-known/openid-configuration"]
      interval: 2s
      timeout: 5s
      retries: 10
      start_period: 5s

  test-runner:
    build: ...
    environment:
      - DISCOVERY_URL=http://oidc-provider:3000/.well-known/openid-configuration
    depends_on:
      oidc-provider:
        condition: service_healthy
```

**Advantages over current IdentityServer setup**:
- Startup time: ~2-3 seconds vs ~60 seconds for .NET
- Image size: ~150MB (node:alpine) vs ~400MB+ (.NET aspnet + sdk)
- No certificate management needed for HTTP-only test scenarios
- Custom claims (including Descope-style `dct`/`tenants`) via `extraTokenClaims`
- Client credentials grant for machine-to-machine tests (the primary py-identity-model test pattern)
- Full control over token formats, TTLs, and key types

**What you can test against node-oidc-provider**:
- Discovery document fetch and parsing
- JWKS key retrieval and caching
- JWT validation (both opaque and JWT access tokens)
- Token endpoint (client_credentials, authorization_code)
- Introspection and revocation endpoints
- Custom claims including multi-tenant structures
- Key rotation scenarios (change JWKS config, restart)
- Multiple key types (RSA + EC simultaneously)

**What you cannot test (Descope-specific)**:
- Descope's dual-issuer format (workaround: run two instances)
- Descope Management API integration
- Descope session token format specifics

---

## Use Case 2: Embedded in NestJS/Fastify as a Full OIDC Provider

### 1. Embedding in NestJS

The documented NestJS pattern is straightforward:

```typescript
import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
const callback = provider.callback();

@Controller('oidc')
export class OidcController {
  @All('/*')
  public mountedOidc(@Req() req: Request, @Res() res: Response): void {
    req.url = req.originalUrl.replace('/oidc', '');
    return callback(req, res);
  }
}
```

This mounts all OIDC endpoints under `/oidc/*`. NestJS handles business logic (user management, tenant CRUD, etc.), while node-oidc-provider handles the OIDC protocol layer at `/oidc/auth`, `/oidc/token`, `/oidc/jwks`, etc.

**Interaction flow**: When authentication is needed, node-oidc-provider redirects to an `interactions.url` that you implement as a NestJS controller. Your NestJS code handles login UI, consent screens, MFA, etc., then calls `provider.interactionFinished()` to resume the OIDC flow.

### 2. Embedding in Fastify

```js
const fastify = new Fastify();
await fastify.register(require('@fastify/middie'));
fastify.use('/oidc', provider.callback());
```

Note: node-oidc-provider is built on Koa internally. For Fastify, it uses `@fastify/middie` or `@fastify/express` as a compatibility layer. This adds a small overhead but works correctly.

### 3. Production-Grade Setup

A production deployment requires:

**Persistent storage adapter**: Implement the 7-method adapter interface backed by PostgreSQL, Redis, or MongoDB. The adapter handles Sessions, Grants, AccessTokens, RefreshTokens, AuthorizationCodes, DeviceCodes, and Clients.

**Key management**: Provide a JWKS with private keys. Recommended rotation procedure:
1. Add new key at end of `keys` array (available for verification, not signing)
2. Reload all processes
3. Move new key to front of array (now used for signing)
4. Reload all processes

**Client registration**: Either static (via `clients` config array) or dynamic (via OIDC Dynamic Client Registration feature). Production systems typically use a database-backed Client model via the adapter.

**Proxy configuration**: `provider.proxy = true` when behind TLS-terminating proxy (nginx, load balancer). Required for correct HTTPS URL generation.

### 4. Multi-Tenancy Support

node-oidc-provider does **not** have built-in multi-tenancy. Approaches:

**Option A: Multiple Provider instances** -- one per tenant, each with its own issuer URL, JWKS, and configuration. Routing via subdomain or path prefix. This is the cleanest OIDC-compliant approach but resource-intensive.

```
https://tenant1.auth.example.com/.well-known/openid-configuration
https://tenant2.auth.example.com/.well-known/openid-configuration
```

**Option B: Single issuer, tenant context in claims** -- one Provider instance, inject tenant information via `extraTokenClaims` and `findAccount`. This is the Descope model. The token tells the RP which tenant the user is acting as. Simpler to operate but less standard.

**Option C: Dynamic configuration** -- use middleware to inspect the request and dynamically configure the provider per-request. This is fragile and not recommended.

### 5. Production Challenges

| Challenge | Complexity | Notes |
|---|---|---|
| **Adapter implementation** | Medium | 7 methods, but must handle TTL/expiry, grant revocation chains, and session-uid lookups correctly |
| **Interaction UI** | High | node-oidc-provider provides NO production-ready UI. You must build login, consent, MFA, password reset screens. The built-in `devInteractions` feature is for development only |
| **Key management** | Medium | Must implement key rotation strategy. No built-in HSM/KMS integration |
| **Session storage** | Medium | Sessions must be persistent and shared across instances in multi-node deployments |
| **Upgrade path** | Low-Medium | Breaking changes in experimental features shipped as MINOR versions. Stable features follow semver correctly |
| **Custom grant types** | Medium | Token exchange (RFC 8693), ROPC, etc. require custom implementation via `registerGrantType` |
| **Logging/monitoring** | Low | Event emitter API covers all actions. Hook into events for metrics/logging |

### 6. Comparison with Alternatives

| Feature | node-oidc-provider | Ory Hydra | Keycloak |
|---|---|---|---|
| **Language** | Node.js/JavaScript | Go | Java |
| **Architecture** | Library (embedded) | Standalone service | Standalone service |
| **User store** | BYO (via `findAccount`) | Delegates to "login app" | Built-in + LDAP/AD |
| **Admin UI** | None | Basic | Full-featured |
| **Multi-tenancy** | Manual | Manual (via multiple OAuth2 clients) | Built-in "realms" |
| **OIDC conformance** | Certified (Basic through FAPI 2.0) | Certified (Basic) | Certified |
| **Login UI** | BYO | BYO | Built-in themes |
| **Deployment** | npm dependency | Docker/binary | Docker/binary |
| **Memory footprint** | ~50-100MB | ~30-50MB | ~500MB-1GB+ |
| **Startup time** | <1s | ~2s | ~15-30s |
| **License** | MIT | Apache 2.0 | Apache 2.0 |
| **Best for** | Embedding OIDC into existing Node.js apps | Microservice architectures needing OAuth2 | Enterprise with need for admin UI, federation, LDAP |

**When to use node-oidc-provider**: You already have a Node.js application (NestJS/Fastify/Express) and want to add OIDC provider capabilities without running a separate service. You are willing to build your own login UI and user store. You need advanced protocol support (FAPI, DPoP, CIBA).

**When to use Ory Hydra**: You want a standalone OAuth2/OIDC service that delegates login decisions to your existing application (any language). Good for polyglot microservice architectures.

**When to use Keycloak**: You need an out-of-the-box identity platform with admin console, user federation (LDAP/AD), social login, and theme customization. Willing to accept Java/JVM resource overhead.

### 7. Node.js Identity Ecosystem

The typical Node.js identity stack:

```
node-oidc-provider  →  OIDC/OAuth2 protocol layer (authorization server)
         |
    jose (panva)    →  JWT/JWK/JWS/JWE primitives
         |
  openid-client     →  OIDC relying party / client library
         |
   Passport.js      →  Authentication middleware (strategy pattern)
         |
  Custom user store →  Database (Prisma/TypeORM/Knex + PostgreSQL/MongoDB)
```

panva's three libraries (`jose`, `node-oidc-provider`, `openid-client`) form a coherent ecosystem. They share the same author, consistent API design, and proper spec compliance.

---

## Architecture Recommendations

### For py-identity-model Integration Tests (High Priority)

**Recommendation**: Replace or supplement the .NET IdentityServer with node-oidc-provider in Docker.

1. Create a `test-fixtures/node-oidc-provider/` directory with a minimal `provider.js` that:
   - Configures client_credentials clients for machine-to-machine tests
   - Enables introspection and revocation features
   - Uses `extraTokenClaims` to emit Descope-style `dct`/`tenants` claims
   - Supports both RSA and EC keys for key-type coverage
   - Runs on HTTP (no certificate management needed)

2. Benefits: 10x faster startup, 3x smaller image, configurable claims structure, easier maintenance (JS vs C#/.NET), MIT license (no Duende licensing concerns).

3. Keep the existing IdentityServer setup for now as a secondary integration target if needed, but make node-oidc-provider the primary.

### For Embedded OIDC Provider (Medium Priority, Future)

**Recommendation**: node-oidc-provider is the right choice for embedding OIDC into a NestJS/Fastify application, with caveats:

1. **You must build your own login/consent UI** -- this is significant work. Budget 2-4 weeks for a production-grade implementation with MFA, password reset, social login.

2. **Multi-tenancy requires architectural decisions upfront** -- the single-issuer-with-tenant-claims approach (matching Descope's model) is simpler to operate. Multiple issuers is more spec-compliant but requires more infrastructure.

3. **Implement a proper adapter early** -- the in-memory adapter loses state on restart. Use Redis for sessions/tokens and PostgreSQL for clients/grants from day one.

4. **Key rotation needs automation** -- consider integrating with a secrets manager (AWS Secrets Manager, HashiCorp Vault) for JWKS key lifecycle.

### Key Files Referenced

- `/home/james/repos/auth/py-identity-model/examples/docker-compose.test.yml` -- current integration test Docker Compose (uses .NET IdentityServer)
- `/home/james/repos/auth/py-identity-model/examples/identity-server/Dockerfile` -- current IdentityServer Dockerfile (multi-stage .NET build)
- `/home/james/repos/auth/py-identity-model/examples/descope/Dockerfile` -- Descope example Dockerfile
- `/home/james/repos/auth/py-identity-model/CLAUDE.md` -- py-identity-model architecture and testing patterns
