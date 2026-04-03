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

**Duende IdentityServer** dominates in C# because it provides the complete, standards-compliant, well-abstracted identity experience. Outside of C#, developers cobble together 3-4 libraries per language to achieve what Duende gives .NET developers in one package. There is no cross-language identity client brand.

## The Vision

**identity-model** becomes the Duende of the non-C# world — a single project providing production-grade, RFC-compliant OIDC/OAuth2 client libraries across Python, Node/TypeScript, Go, and Rust.

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
| **Duende IdentityModel** | C# | Complete, well-maintained, RFC-compliant, trusted brand | C#-only |
| **openid-client (panva)** | Node | Solid RP implementation, good maintenance | Node-only, no unified cross-language story |
| **jose (panva)** | Node | Best-in-class JOSE/JWT | Separate from OIDC, Node-only |
| **authlib** | Python | Broad scope (client + server) | Monolithic, maintenance concerns, Python-only |
| **go-oidc (coreos)** | Go | CoreOS pedigree, minimal | Minimal feature surface, no client credentials, stale |
| **openidconnect-rs** | Rust | Only real option | Rough DX, limited adoption, Rust-only |
| **py-identity-model** | Python | Production-proven, clean API, RFC-compliant | Python-only (until now) |

**Our wedge:** No one owns the cross-language identity client space. Duende proved the model works in C#. We replicate the value proposition — standardized, RFC-compliant, production-grade — across the four most relevant non-C# languages.

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

- Position identity-model as the "Duende for everyone else"
- Consulting engagements reference the cross-language capability as a differentiator
- Foundation for potential server-side (IdP) capabilities in the future

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
