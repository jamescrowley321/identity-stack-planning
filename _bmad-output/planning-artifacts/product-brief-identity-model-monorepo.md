---
workflowType: 'product-brief'
project_name: 'identity-model'
user_name: 'James'
date: '2026-04-03'
status: 'draft'
---

# Product Brief — identity-model: Multi-Language OIDC/OAuth2 Client Library

**Author:** James
**Date:** 2026-04-03
**Status:** Draft

## The Problem

The identity protocol client space outside of C#/.NET is fragmented and underwhelming:

- **Python:** Scattered libraries (authlib, python-jose, PyJWT) — none offer a unified, production-grade OIDC client experience
- **Node/TypeScript:** `openid-client` and `jose` are solid but separate concerns; `oidc-client-ts` is browser-only; no unified server+client protocol library
- **Go:** `coreos/go-oidc` is minimal; `golang.org/x/oauth2` is low-level; no cohesive OIDC client library
- **Rust:** Nascent ecosystem — `openidconnect-rs` exists but has rough ergonomics and limited adoption

Duende Software's [IdentityModel](https://github.com/IdentityModel/IdentityModel) and [IdentityServer](https://github.com/DuendeSoftware/IdentityServer) set the standard for what a well-designed identity client library looks like — clean abstractions, comprehensive RFC coverage, and a developer experience that makes complex protocols accessible. Their work is the gold standard in C#/.NET and a direct inspiration for this project. Outside of .NET, however, no equivalent exists. Developers cobble together 3-4 libraries per language to approximate what Duende's ecosystem provides in one cohesive package. There is no cross-language identity client brand.

## The Vision

**identity-model** brings the design philosophy pioneered by Duende's IdentityModel to the rest of the ecosystem — a single project providing production-grade, RFC-compliant OIDC/OAuth2 client libraries across Python, Node/TypeScript, Go, and Rust. This is an explicit port: we adopt their architectural patterns, capability taxonomy, and commitment to spec compliance, adapted idiomatically for each target language.

The value is not in any single language port. **The value is the abstraction and standardization across client interactions.** A developer moving between Python and Go gets the same mental model, the same capability surface, the same RFC compliance guarantees. An organization using multiple languages gets one identity client library family with consistent behavior.

### What This Is

- A **protocol client library** — standards-compliant interaction with any OIDC/OAuth2 provider
- A **unified abstraction** — same concepts, same capability surface, idiomatic per language
- **RFC-first** — every feature maps to a specific RFC or OIDC specification section

### What This Is NOT

- Not an identity provider / authorization server (no token issuance, no consent screens)
- Not a framework middleware (though middleware can be built on top)
- Not tied to any specific IdP (Descope, Okta, Auth0, Keycloak — all work)

## Market Position

| Competitor | Language | Strengths | Gaps |
|------------|----------|-----------|------|
| **Duende IdentityModel** | C# | The reference implementation — complete, well-maintained, RFC-compliant, trusted. Direct inspiration for this project. | .NET ecosystem only |
| **openid-client (panva)** | Node | Solid RP implementation, good maintenance | Node-only, no unified cross-language story |
| **jose (panva)** | Node | Best-in-class JOSE/JWT | Separate from OIDC, Node-only |
| **authlib** | Python | Broad scope (client + server) | Monolithic, maintenance concerns, Python-only |
| **go-oidc (coreos)** | Go | CoreOS pedigree, minimal | Minimal feature surface, no client credentials, stale |
| **openidconnect-rs** | Rust | Only real option | Rough DX, limited adoption, Rust-only |
| **py-identity-model** | Python | Production-proven, clean API, RFC-compliant | Python-only (until now) |

**Our wedge:** No one owns the cross-language identity client space. Duende proved the model works — their IdentityModel library demonstrated that a well-abstracted, RFC-compliant client library creates enormous value for an ecosystem. We're porting that proven design philosophy to the four most relevant non-.NET languages, with full credit to the patterns and thinking that Duende established.

## Existing Foundation: py-identity-model

py-identity-model (v2.17.1) is the reference implementation. Production-proven, Apache 2.0 licensed, with:

### Current Capabilities (to be ported)

| Capability | RFCs/Specs | Module |
|------------|-----------|--------|
| OIDC Discovery | OpenID Connect Discovery 1.0 | `discovery.py` |
| JWKS Retrieval + Caching | RFC 7517 (JWK), RFC 7518 (JWA) | `jwks.py`, `jwk/` |
| JWT Validation | RFC 7519 (JWT), RFC 7515 (JWS) | `token_validation.py` |
| Client Credentials Flow | RFC 6749 Section 4.4 | `token_client.py` |
| UserInfo Endpoint | OpenID Connect Core 1.0 Section 5.3 | `identity.py` |
| Sync + Async APIs | — | `sync/`, `aio/` |
| SSL/TLS Configuration | — | `ssl_config.py` |
| Structured Error Handling | — | `exceptions.py` |

### Module Structure (Reference)

```
py_identity_model/
├── aio/           # Async API surface
├── sync/          # Sync API surface
├── client/        # HTTP client management
├── core/          # Core protocol logic
├── internal/      # Internal utilities
├── jwk/           # JWK/JWKS handling
├── messages/      # Request/response models
├── discovery.py   # OIDC Discovery
├── jwks.py        # JWKS operations
├── token_validation.py  # JWT validation
├── token_client.py      # Token endpoint client
├── identity.py          # UserInfo
├── oidc_constants.py    # OIDC/OAuth2 constants
├── jwt_claim_types.py   # Standard claim types
└── exceptions.py        # Error hierarchy
```

### Planned Capabilities (from Main PRD roadmap)

These are already planned for py-identity-model and should be part of the cross-language spec:

| Capability | RFCs/Specs | Status |
|------------|-----------|--------|
| Authorization Code + PKCE | RFC 6749, RFC 7636 | FR-PIM-4 |
| DPoP (Proof of Possession) | RFC 9449 | FR-PIM-5 |
| Token Introspection | RFC 7662 | FR-PIM-6 |
| Token Revocation | RFC 7009 | FR-PIM-7 |
| Token Exchange | RFC 8693 | FR-PIM-8 |

## Monorepo Strategy

### Repository Structure

Rename `py-identity-model` → `identity-model`. Single monorepo with language-specific directories:

```
identity-model/
├── spec/                    # Cross-language specification
│   ├── capabilities.md      # Canonical capability matrix
│   ├── conformance/         # Shared conformance test definitions
│   │   ├── discovery.json   # Expected behaviors per RFC
│   │   ├── jwks.json
│   │   ├── validation.json
│   │   ├── client-credentials.json
│   │   ├── authorization-code.json
│   │   ├── introspection.json
│   │   ├── revocation.json
│   │   └── token-exchange.json
│   └── test-fixtures/       # Shared test data (JWKs, tokens, discovery docs)
│
├── python/                  # py-identity-model (existing, relocated)
│   ├── src/
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
│
├── node/                    # node-identity-model (new)
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── README.md
│
├── go/                      # go-identity-model (new)
│   ├── pkg/
│   ├── internal/
│   ├── go.mod
│   └── README.md
│
├── rust/                    # rs-identity-model (new)
│   ├── src/
│   ├── tests/
│   ├── Cargo.toml
│   └── README.md
│
├── infra/                   # Shared test infrastructure
│   └── docker-compose.yml   # node-oidc-provider for conformance tests
│
├── docs/                    # Cross-language documentation
│   ├── getting-started.md
│   ├── rfc-coverage.md
│   └── architecture.md
│
├── .github/
│   └── workflows/           # Per-language CI + cross-language conformance
│
└── README.md                # Project overview + language matrix
```

### Package Names & Distribution

| Language | Package Name | Registry | Import |
|----------|-------------|----------|--------|
| Python | `py-identity-model` | PyPI | `from py_identity_model import ...` |
| Node/TS | `@identity-model/node` | npm | `import { ... } from '@identity-model/node'` |
| Go | `github.com/jamescrowley321/identity-model/go` | Go modules | `import "github.com/jamescrowley321/identity-model/go/pkg/discovery"` |
| Rust | `identity-model` | crates.io | `use identity_model::discovery::...` |

## Cross-Language Specification

The key differentiator is a **shared specification** that all language ports implement. This ensures behavioral consistency — not just API similarity.

### Capability Matrix (All Languages Must Implement)

| Tier | Capability | Spec Reference | Priority |
|------|-----------|---------------|----------|
| **Core** | OIDC Discovery | OpenID Connect Discovery 1.0 | P0 — MVP |
| **Core** | JWKS Retrieval + Caching | RFC 7517, RFC 7518 | P0 — MVP |
| **Core** | JWT Validation (Signature + Claims) | RFC 7519, RFC 7515 | P0 — MVP |
| **Core** | Client Credentials Flow | RFC 6749 Section 4.4 | P0 — MVP |
| **Core** | Authorization Code + PKCE | RFC 6749, RFC 7636 | P0 — MVP |
| **Core** | UserInfo Endpoint | OIDC Core 1.0 Section 5.3 | P0 — MVP |
| **Extended** | Token Introspection | RFC 7662 | P1 |
| **Extended** | Token Revocation | RFC 7009 | P1 |
| **Extended** | Token Exchange | RFC 8693 | P1 |
| **Extended** | DPoP (Proof of Possession) | RFC 9449 | P1 |
| **Advanced** | PAR (Pushed Authorization Requests) | RFC 9126 | P2 |
| **Advanced** | RAR (Rich Authorization Requests) | RFC 9396 | P2 |
| **Advanced** | CIBA (Client-Initiated Backchannel Auth) | OpenID CIBA Core | P2 |
| **Advanced** | JWT Secured Authorization Response Mode (JARM) | OpenID JARM | P2 |

### Conformance Testing Strategy

Each capability has a **language-agnostic conformance definition** in `spec/conformance/`:

```json
{
  "capability": "discovery",
  "spec": "OpenID Connect Discovery 1.0",
  "tests": [
    {
      "id": "DISC-001",
      "description": "Fetch and parse discovery document from .well-known endpoint",
      "input": { "issuer": "https://test-provider" },
      "expected": {
        "issuer_matches": true,
        "required_fields_present": ["issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"],
        "response_cached": true
      }
    }
  ]
}
```

Each language port translates these into native test cases. The shared `infra/docker-compose.yml` runs `node-oidc-provider` as the conformance test target (already planned in PRD 3).

## Language-Specific Design Notes

### Node/TypeScript

- **Target:** Node 20+, ESM-first, full TypeScript with strict mode
- **HTTP:** `undici` (Node built-in) or `fetch` API
- **JWT:** `jose` (panva) as the JOSE layer — best-in-class, no need to reimplement
- **Async:** Native `async/await`, no callback APIs
- **DX priority:** TypeScript types as documentation, `zod` for runtime validation of discovery docs
- **Differentiator vs openid-client:** Unified library (not separate JOSE + OIDC), server-side focus, explicit RFC mapping

### Go

- **Target:** Go 1.22+, modules
- **HTTP:** `net/http` standard library
- **JWT:** `golang-jwt/jwt/v5` or `go-jose/go-jose/v4`
- **Pattern:** Functional options for configuration (`WithTimeout()`, `WithCache()`)
- **Concurrency:** `sync.Pool` for HTTP clients, `singleflight` for deduplicating concurrent discovery fetches
- **Differentiator vs go-oidc:** Complete capability surface (client credentials, introspection, revocation, DPoP), actively maintained, part of cross-language family

### Rust

- **Target:** Rust 2024 edition, MSRV 1.75+
- **HTTP:** `reqwest` (async) with `rustls` default
- **JWT:** `jsonwebtoken` crate
- **Async:** `tokio` runtime, `async/await`
- **Error handling:** `thiserror` for library errors, `Result<T, IdentityError>` everywhere
- **Differentiator vs openidconnect-rs:** Better DX (builder patterns, clear error types), complete RFC coverage, actively maintained, part of cross-language family

## Cross-Language Conformance Architecture

### Build-Time Enforcement

The cross-language conformance strategy operates at three levels:

1. **Shared Specification Layer** (`spec/`)
   - `spec/capabilities.md` — canonical feature matrix with per-language status (implemented/in-progress/planned/N-A)
   - `spec/conformance/*.json` — machine-readable test case definitions consumed by each language's test runner
   - `spec/test-fixtures/` — shared test data (JWKs, tokens, discovery docs, request/response pairs)

2. **Per-Language Test Harness**
   - Each language implements a conformance test runner that loads `spec/conformance/*.json` and executes tests against its own implementation
   - Test runners produce standardized JSON output for cross-language comparison
   - CI enforces that all languages pass the same conformance test suite before merge

3. **Integration Test Infrastructure** (`infra/`)
   - Shared `docker-compose.yml` running `node-oidc-provider` as the conformance target
   - Authorization Code flow automation (headless browser or test-mode endpoints)
   - Per-language integration test suites execute against the shared provider

### spec/capabilities.md Schema

The capabilities file uses this structure to enable automated status tracking and documentation generation:

```yaml
capabilities:
  - name: "OIDC Discovery"
    tier: core
    spec_ref: "OpenID Connect Discovery 1.0"
    conformance_file: "spec/conformance/discovery.json"
    languages:
      python: { status: implemented, version: "2.17.1" }
      node: { status: planned }
      go: { status: planned }
      rust: { status: planned }
```

This schema is consumed by:
- Epic 9 Story 9.3 (RFC coverage matrix generator)
- CI status checks (fail if a language claims "implemented" but conformance tests fail)
- Documentation site (auto-generated feature comparison tables)

## Phasing

### Phase 0: Specification + Monorepo Setup (2-3 weeks)

1. Create `spec/capabilities.md` — canonical capability matrix with RFC references
2. Create `spec/conformance/` — language-agnostic test definitions for Core tier
3. Restructure `py-identity-model` → `identity-model/python/` (preserve git history)
4. Set up monorepo CI (GitHub Actions matrix for all languages)
5. Move existing `test-fixtures/` → `spec/test-fixtures/`

### Phase 1: Core Tier — All Languages in Parallel (6-8 weeks)

Each language implements the 6 Core capabilities:
- OIDC Discovery
- JWKS Retrieval + Caching
- JWT Validation
- Client Credentials Flow
- Authorization Code + PKCE
- UserInfo Endpoint

**Python:** Already has most of this. Fill gaps (auth code + PKCE), align with new conformance tests.

**Node, Go, Rust:** Greenfield implementations following the spec + conformance definitions. Each language should be idiomatic — not a transliteration of the Python code.

### Phase 2: Extended Tier (4-6 weeks)

All languages add:
- Token Introspection (RFC 7662)
- Token Revocation (RFC 7009)
- Token Exchange (RFC 8693)
- DPoP (RFC 9449)

### Phase 3: Advanced Tier + Documentation + Launch (4-6 weeks)

- PAR, RAR, CIBA, JARM
- Cross-language documentation site
- Registry publishing (PyPI, npm, crates.io, Go modules)
- Blog post / launch announcement

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Package name unavailable on one or more registries (crates.io, npm, PyPI) | Medium | High | Epic 13 Story 13.1 researches availability early. Have 2-3 fallback names pre-approved. |
| R2 | One language implementation falls significantly behind others | High | Medium | Define a Minimum Viable Language (MVL) — Core tier only. Ship languages independently as they reach MVL. Do not gate one language's release on another. |
| R3 | Conformance spec definitions are ambiguous, causing divergent implementations | Medium | High | Story R.4 (cross-language conformance strategy) evaluates spec clarity. Each conformance test must include given/when/then with fixture references. Run cross-language conformance comparison in CI. |
| R4 | node-oidc-provider limitations prevent testing certain flows (DPoP, FAPI 2.0) | Medium | Medium | Epic 14 Story 14.6 evaluates alternative providers (Keycloak, Ory Hydra). Maintain provider-agnostic test harness. |
| R5 | Monorepo tooling complexity (4 languages, 4 build systems, 1 CI) | High | Medium | Epic 11 (Contributor DX) provides dev containers, unified Makefile. Accept that CI will be slow; optimize with path-filtered triggers (Epic 0A Story 0A.3). |
| R6 | Duende Software objects to "port" framing | Low | High | Prominent attribution in README, docs, and launch materials. Frame as "inspired by" not "port of." Reach out to Duende before launch. |
| R7 | Scope creep — framework integrations (Epic 2B) dilute focus from core library | Medium | Medium | Treat Epic 2B as post-Core. Ship Core tier for all languages before any framework integration. |

## Success Criteria

### Technical

- All 4 languages pass the same conformance test suite against node-oidc-provider
- Each language has >= 80% test coverage
- Each language has CI/CD publishing to its respective package registry
- Cross-language behavior is verified by shared conformance definitions

### Market

- Published packages on PyPI, npm, crates.io, and Go modules
- Documentation site with RFC coverage matrix
- At least one production deployment per language within 6 months of launch
- GitHub stars + downloads demonstrate traction outside C# identity ecosystem

### Strategic

- Position identity-model as the cross-language port of Duende's IdentityModel patterns, with explicit attribution
- Consulting engagements reference the cross-language capability as a differentiator
- Foundation for potential server-side (IdP) capabilities in the future
- Maintain a respectful relationship with Duende Software — credit their work prominently in README, docs, and launch materials

## Relationship to Existing Roadmap

This initiative is **PRD 6** in the identity-stack-planning roadmap:

- **Depends on:** Main PRD (py-identity-model protocol features complete), PRD 3 (node-oidc-provider test infrastructure)
- **Independent of:** PRD 1 (secrets), PRD 2 (gateway), PRD 5 (canonical identity)
- **Synergy with PRD 4:** The multi-IdP gateway demo validates that identity-model libraries work with multiple providers — the conformance tests prove it at the library level

```
Existing Roadmap:
  Main PRD → PRD 5 (canonical) ──→ PRD 4 (multi-IdP demo)
  Main PRD → PRD 2 (gateway) → PRD 3 (test infra) → PRD 4

New:
  Main PRD → PRD 6 (identity-model monorepo)
  PRD 3 (test infra) → PRD 6 (shared conformance tests use node-oidc-provider)
```

## Open Questions

1. **GitHub organization:** Should this live under `jamescrowley321/identity-model` or a dedicated GitHub org (e.g., `identity-model-org`)?
2. **Versioning:** Unified version across all languages (v3.0.0 for all on launch) or independent per-language versioning?
3. **py-identity-model migration:** Redirect existing PyPI package to new monorepo, or publish as a new package?
4. **Community model:** Solo-maintained with AI-assisted development, or seek contributors from the start?
5. **Licensing:** Stay Apache 2.0 across all languages?
