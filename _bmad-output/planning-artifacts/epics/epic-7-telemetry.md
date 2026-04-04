---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '7'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 7: OpenTelemetry Integration

**Goal:** Every identity-model language port ships with built-in OpenTelemetry instrumentation, giving consumers automatic observability over OIDC/OAuth2 protocol operations without writing custom tracing code.

## Overview

Identity operations are security-critical and latency-sensitive. Developers need visibility into discovery fetches, JWKS resolution, token validation, and token endpoint calls — especially when debugging auth failures in production. Rather than leaving this to consumers, identity-model should emit OTel spans, metrics, and semantic attributes out of the box, following [OpenTelemetry Semantic Conventions for HTTP](https://opentelemetry.io/docs/specs/semconv/http/) and proposing identity-specific conventions.

All instrumentation must be **opt-in and zero-cost when disabled** — no OTel dependency required at runtime unless the consumer enables it.

---

### Story 7.1: Define Cross-Language Telemetry Specification

As a **port maintainer**,
I want a shared telemetry specification in `spec/telemetry.md`,
So that all language ports emit consistent span names, attributes, and metrics.

**Scope:**

Define standard span names and semantic attributes for all identity-model operations:

| Operation | Span Name | Key Attributes |
|-----------|-----------|---------------|
| Discovery fetch | `identity.discovery` | `oidc.issuer`, `http.request.method`, `http.response.status_code`, `identity.cache.hit` |
| JWKS fetch | `identity.jwks` | `oidc.jwks_uri`, `identity.cache.hit`, `identity.cache.force_refresh` |
| JWT validation | `identity.jwt.validate` | `oidc.issuer`, `jwt.alg`, `jwt.kid`, `identity.validation.result` (valid/expired/invalid_sig/wrong_aud/etc) |
| Client credentials | `identity.token.client_credentials` | `oidc.token_endpoint`, `oauth.grant_type`, `oauth.scope`, `http.response.status_code` |
| Auth code exchange | `identity.token.authorization_code` | `oidc.token_endpoint`, `oauth.grant_type`, `oauth.pkce_method`, `http.response.status_code` |
| Token introspection | `identity.token.introspect` | `oidc.introspection_endpoint`, `token.active`, `http.response.status_code` |
| Token revocation | `identity.token.revoke` | `oidc.revocation_endpoint`, `http.response.status_code` |
| UserInfo fetch | `identity.userinfo` | `oidc.userinfo_endpoint`, `http.response.status_code` |

Define standard metrics:
- `identity.discovery.duration` (histogram) — discovery fetch latency
- `identity.jwt.validation.duration` (histogram) — validation latency
- `identity.jwt.validation.result` (counter, by result) — success/failure breakdown
- `identity.token.request.duration` (histogram) — token endpoint latency
- `identity.cache.hit_ratio` (gauge) — discovery + JWKS cache effectiveness

**Acceptance Criteria:**

**Given** a contributor reading spec/telemetry.md
**When** they implement instrumentation in any language
**Then** the span names, attribute keys, and metric names match exactly across all ports

**Given** the telemetry spec
**When** compared to OpenTelemetry Semantic Conventions for HTTP (https://opentelemetry.io/docs/specs/semconv/http/)
**Then** all HTTP-level attributes follow existing conventions; identity-specific attributes use the `identity.*`, `oidc.*`, `oauth.*`, and `jwt.*` namespaces

- [ ] **Unit test:** Validation script checks spec/telemetry.md for completeness (all operations covered, all attributes typed)
- [ ] **Integration test:** At least one language port's spans validated against the spec in CI
- [ ] **Example:** Sample trace visualization showing a full auth code flow (discovery → JWKS → token exchange → validation → UserInfo) with all spans and attributes

---

### Story 7.2: Python OTel Instrumentation

As a **Python developer using py-identity-model**,
I want optional OpenTelemetry instrumentation,
So that I get automatic tracing of all identity operations in my existing OTel pipeline.

**Scope:**

- Optional dependency: `py-identity-model[otel]` installs `opentelemetry-api`
- Instrumentation activates automatically when OTel SDK is configured (checks for active TracerProvider)
- Zero overhead when OTel is not installed or not configured — guard all tracing behind `try/import` or feature flag
- Spans on: discovery, JWKS fetch, JWT validation, token client calls, UserInfo
- Attributes per spec/telemetry.md
- Metrics via OTel Metrics API
- Works with both sync and async APIs

**Acceptance Criteria:**

**Given** a FastAPI app with OTel SDK configured and `py-identity-model[otel]` installed
**When** a token validation occurs
**Then** an `identity.jwt.validate` span appears in the trace with `jwt.alg`, `jwt.kid`, `oidc.issuer`, and `identity.validation.result` attributes

**Given** py-identity-model installed WITHOUT the `[otel]` extra
**When** any identity operation executes
**Then** no import errors occur and no performance overhead is added

**Given** a discovery fetch with caching
**When** the first call misses cache and the second hits cache
**Then** both `identity.discovery` spans have `identity.cache.hit` attribute (false then true)

- [ ] **Unit test:** Mock TracerProvider, verify correct span names and attributes emitted for each operation
- [ ] **Unit test:** Verify zero-cost when OTel not installed (no import errors, no performance regression)
- [ ] **Integration test:** Full auth code flow against node-oidc-provider with Jaeger/OTLP collector, verify complete trace
- [ ] **Example:** `examples/otel-fastapi/` — FastAPI app with Aspire Dashboard showing identity-model spans alongside app spans

---

### Story 7.3: Node/TypeScript OTel Instrumentation

As a **Node.js developer using @identity-model/node**,
I want optional OpenTelemetry instrumentation,
So that identity operations appear in my existing OTel traces.

**Scope:**

- Optional peer dependency: `@opentelemetry/api`
- Instrumentation activates when OTel SDK is registered (checks for active TracerProvider)
- Zero overhead when `@opentelemetry/api` is not installed
- Spans and attributes per spec/telemetry.md
- Compatible with `@opentelemetry/instrumentation-http` (child spans nest correctly)

**Acceptance Criteria:**

**Given** a Node app with `@opentelemetry/sdk-node` configured
**When** identity-model performs a client credentials token request
**Then** an `identity.token.client_credentials` span appears with `oauth.grant_type`, `oauth.scope`, and `http.response.status_code` attributes

**Given** `@opentelemetry/api` is NOT installed
**When** any identity operation executes
**Then** no errors and no performance overhead

- [ ] **Unit test:** Mock TracerProvider, verify spans and attributes for each operation
- [ ] **Unit test:** Verify graceful no-op when OTel not available
- [ ] **Integration test:** Full flow against node-oidc-provider with OTLP collector
- [ ] **Example:** `examples/otel-express/` — Express app with OTel showing identity spans

---

### Story 7.4: Go OTel Instrumentation

As a **Go developer using go-identity-model**,
I want optional OpenTelemetry instrumentation,
So that identity operations are traced in my existing OTel pipeline.

**Scope:**

- Optional module: `github.com/jamescrowley321/identity-model/go/otel` (separate Go module to avoid forcing the dependency)
- Middleware/wrapper pattern: `otel.WrapDiscoveryClient(client)` or functional option `discovery.New(issuer, WithTracing())`
- Uses `go.opentelemetry.io/otel` API
- Spans and attributes per spec/telemetry.md
- Context propagation via `context.Context` (standard Go pattern)

**Acceptance Criteria:**

**Given** a Go app with OTel SDK configured and `WithTracing()` option enabled
**When** a JWKS fetch occurs with cache miss then cache hit
**Then** two `identity.jwks` spans appear with correct `identity.cache.hit` attributes

**Given** identity-model used WITHOUT the otel module
**When** any identity operation executes
**Then** no OTel dependency is pulled in and no overhead exists

- [ ] **Unit test:** Mock TracerProvider, verify span names and attributes
- [ ] **Unit test:** Verify no dependency on OTel when otel module not imported
- [ ] **Integration test:** Full flow against node-oidc-provider with OTLP collector
- [ ] **Example:** `examples/otel-chi/` — Chi router app with OTel showing identity spans

---

### Story 7.5: Rust OTel Instrumentation

As a **Rust developer using identity-model**,
I want optional OpenTelemetry instrumentation,
So that identity operations appear in my tracing pipeline.

**Scope:**

- Cargo feature flag: `identity-model = { features = ["otel"] }`
- Uses `opentelemetry` and `tracing-opentelemetry` crates behind the feature flag
- `#[instrument]` attribute macros on key functions when feature enabled
- Spans and attributes per spec/telemetry.md
- Compatible with `tracing` ecosystem (spans work with `tracing-subscriber` even without OTel)

**Acceptance Criteria:**

**Given** a Rust app with `tracing-opentelemetry` subscriber and `otel` feature enabled
**When** a JWT validation occurs
**Then** an `identity.jwt.validate` span appears with correct attributes

**Given** identity-model compiled WITHOUT the `otel` feature
**When** any identity operation executes
**Then** no OTel dependencies are compiled and no runtime overhead exists

- [ ] **Unit test:** Verify spans emitted with mock subscriber
- [ ] **Unit test:** Verify compilation and zero-cost without feature flag
- [ ] **Integration test:** Full flow against node-oidc-provider with OTLP collector
- [ ] **Example:** `examples/otel-axum/` — Axum app with OTel showing identity spans

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 7.1 (Telemetry Spec) | Epic 0 spec stories (capabilities defined) |
| 7.2 (Python) | 7.1, Epic 1 (Python core) |
| 7.3 (Node) | 7.1, Epic 2 (Node core) |
| 7.4 (Go) | 7.1, Epic 3 (Go core) |
| 7.5 (Rust) | 7.1, Epic 4 (Rust core) |

## Design Principles

1. **Opt-in, zero-cost when off** — No OTel dependency unless explicitly enabled
2. **Consistent across languages** — Same span names, same attributes, per spec/telemetry.md
3. **Composable with existing instrumentation** — Identity spans nest correctly under HTTP/framework spans
4. **Security-aware** — Never include tokens, secrets, or PII in span attributes. Only metadata (issuer, alg, kid, cache status, result).
