---
workflowType: 'research'
project_name: 'identity-model'
document_type: 'competitive-analysis'
date: '2026-04-05'
status: 'draft'
epic_ref: 'EPIC-12'
story_ref: '12.1'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Competitive Analysis — OIDC/OAuth2 Client Libraries Across Ecosystems

**Author:** James (AI-assisted)
**Date:** 2026-04-05
**Status:** Draft
**Epic:** 12 — Competitive Analysis & Market Research
**Story:** 12.1 — Deep Competitive Analysis Per Language Ecosystem

## Executive Summary

This analysis evaluates 18 OIDC/OAuth2 libraries across five language ecosystems (Python, Node/TypeScript, Go, Rust) plus the Duende IdentityModel (.NET) reference baseline. Libraries are categorized by **layer** — identity-model sits at the protocol client layer and will likely depend on or wrap lower-layer libraries (JOSE primitives, HTTP/OAuth2 transport) rather than replace them.

The key finding: **no ecosystem outside of .NET has a unified protocol client library that composes the lower layers into a cohesive OIDC/OAuth2 experience with modern RFC coverage.** Developers in every ecosystem must manually stitch together 2-4 libraries from different layers. identity-model's value is the integration — not reimplementing primitives.

### Key Findings

1. **The gap is at the integration layer, not the primitive layer.** Every ecosystem has adequate JOSE and basic OAuth2 libraries. What's missing is the orchestration layer that composes discovery + JWKS + validation + token flows + modern extensions into one coherent API. Duende IdentityModel is the only library that does this well.

2. **identity-model should build on existing primitives, not replace them.** PyJWT, jose (panva), go-jose/golang-jwt, jsonwebtoken (Rust), and golang.org/x/oauth2 are high-quality, widely-adopted lower layers. Wrapping or depending on them is the right strategy — it reduces scope, leverages battle-tested crypto, and avoids NIH.

3. **Modern RFC coverage (DPoP, PAR, RAR, Token Exchange) is absent at the protocol layer** in Python, Go, and Rust. openid-client (Node) is the only non-.NET library covering these — and it's maintained by one person.

4. **Single-maintainer risk is pervasive at every layer.** The Node ecosystem's entire JOSE+OIDC foundation rests on one person (panva). Rust's OIDC+OAuth2 stack is one person (ramosbugs). Go's OIDC validation is one person (ericchiang). This reinforces the value of a team-maintained alternative.

---

## Library Layer Model

Libraries in each ecosystem operate at distinct layers. identity-model sits at **Layer 3** and composes libraries from Layers 1-2.

```
Layer 4: Framework Integration     Auth.js, passport-oidc, oidc-client-ts
         (middleware, UI, sessions)
                    ↑
Layer 3: Protocol Client           identity-model, Duende IdentityModel,
         (OIDC flows, discovery,    authlib, openid-client, openidconnect-rs,
          token mgmt, validation)   zitadel/oidc
                    ↑
Layer 2: OAuth2 Transport          golang.org/x/oauth2, oauth2-rs, oauthlib,
         (token acquisition,        requests-oauthlib
          grant types, HTTP)
                    ↑
Layer 1: JOSE / JWT Primitives     PyJWT, jose, jsonwebtoken, josekit,
         (sign, verify, encode,     go-jose, golang-jwt, python-jose
          decode, key handling)
```

### What This Means for identity-model

| Layer | identity-model's Relationship | Examples |
|-------|------------------------------|----------|
| **Layer 1 — JOSE** | **Depend on.** Use as the cryptographic foundation. Do not reimplement JWT signing/verification. | PyJWT (Python), jose (Node), golang-jwt or go-jose (Go), jsonwebtoken (Rust) |
| **Layer 2 — OAuth2 Transport** | **Wrap or complement.** Build higher-level protocol operations on top of, or alongside, existing OAuth2 grant machinery. | golang.org/x/oauth2 (Go), oauth2-rs (Rust) |
| **Layer 3 — Protocol Client** | **Compete and differentiate.** This is identity-model's layer. Provide the unified discovery + validation + token management + modern extensions that no single library in Python/Go/Rust offers today. | authlib (Python), openid-client (Node), zitadel/oidc (Go), openidconnect-rs (Rust) |
| **Layer 4 — Framework** | **Enable, don't build.** identity-model should be usable by framework integrations (middleware, etc.) but should not itself be framework-coupled. | Auth.js, passport-oidc, oidc-client-ts |

---

## Reference Baseline: Duende IdentityModel (.NET)

Duende IdentityModel is the gold standard that identity-model aims to port across languages. Notably, Duende itself follows the layered model: it **delegates JWT validation** to `Microsoft.IdentityModel.Tokens` (Layer 1) rather than reimplementing it.

| Attribute | Value |
|-----------|-------|
| Latest version | 8.1.0 (2026-03-18) |
| NuGet downloads | 20.5M (Duende) + 559M (legacy) |
| License | Apache 2.0 (client library always free) |
| Bus factor | 4 (leastprivilege, josephdecock, brockallen, damianh) |
| Commits Q1 2026 | 87 (~29/month) |
| Project age | 10+ years |

### Duende Feature Coverage

| Capability | IdentityModel | Notes |
|-----------|:---:|-------|
| OIDC Discovery | Full | `DiscoveryCache` with 24h TTL, configurable validation policy |
| JWKS/JWK | Full | Integrated with discovery |
| JWT Validation | Partial | Delegates to `Microsoft.IdentityModel.Tokens` (Layer 1) |
| Client Credentials | Full | `RequestClientCredentialsTokenAsync()` |
| Auth Code + PKCE | Full | `AuthorizationCodeTokenRequest.CodeVerifier` |
| UserInfo | Full | GET and POST (v8.0+) |
| Introspection (7662) | Full | `IntrospectTokenAsync()` |
| Revocation (7009) | Full | `RevokeTokenAsync()` |
| Token Exchange (8693) | Full | `TokenExchangeTokenRequest` |
| DPoP (9449) | Full | `IDPoPProofTokenFactory`, nonce retry |
| PAR (9126) | Full | `PushedAuthorizationRequest` (v7.0+) |
| RAR (9396) | None | Server-side only (IdentityServer) |
| Dynamic Registration (7591) | Full | `DynamicClientRegistrationRequest` |
| Device Auth (8628) | Full | `DeviceAuthorizationRequest` |
| CIBA | Full | `BackchannelAuthenticationRequest` |

### Key Design Patterns to Port

- **Typed Request/Response hierarchy:** Every operation has a dedicated `*Request` → `*Response` pair inheriting from `ProtocolRequest`/`ProtocolResponse`
- **Unified error model:** `ProtocolResponse.IsError` + `ErrorType` (Http/Protocol/Exception) enum
- **HttpClient extension methods:** All operations are composable extensions on the HTTP client
- **DiscoveryCache with policy:** Configurable validation (HTTPS, issuer match, DNS) with sensible secure defaults
- **Delegates to Layer 1:** Duende does NOT reimplement JWT crypto — it relies on Microsoft's JOSE library, proving the layered approach works for the gold standard itself

### Gaps identity-model Can Address

- **Integrated JWT validation** — Duende delegates to a separate library; identity-model can offer a more cohesive API by tightly wrapping its Layer 1 dependency
- **No built-in token caching/lifecycle** — Requires separate `Duende.AccessTokenManagement` package
- **No RAR client support** — Only server-side (IdentityServer Enterprise)
- **No FAPI 2.0 client-side profile enforcement**
- **.NET-only** — No cross-language story

---

## Python Ecosystem

### Layer Map

```
Layer 3 (Protocol Client):   authlib ←── identity-model competes here
                                ↑
Layer 2 (OAuth2 Transport):   oauthlib, requests-oauthlib ←── largely obsolete (sync, server-side)
                                ↑
Layer 1 (JOSE Primitives):    PyJWT, python-jose ←── identity-model depends on PyJWT
```

### Layer 1 — JOSE Primitives (Potential Dependencies)

| Library | Version | Downloads/mo | Stars | License | Bus Factor | Status | identity-model Relationship |
|---------|---------|-------------|-------|---------|-----------|--------|----------------------------|
| **PyJWT** | 2.12.1 | 496M | 5,635 | MIT | 2 | Active | **Current dependency.** Best-in-class JWT encode/decode. py.typed. PyJWKClient for JWKS fetching. 6 historical CVEs (3 high), all fixed. |
| **python-jose** | 3.5.0 | 36M | 1,746 | MIT | 0 | Abandoned | **Avoid.** 10 months since last commit. 2 critical CVEs (algorithm confusion 9.3, HMAC timing 9.8). Users should migrate to PyJWT. |

**Recommendation:** Continue depending on PyJWT. It has the best maintenance, type safety (py.typed), and adoption (496M/mo). python-jose is a dead end.

### Layer 2 — OAuth2 Transport (Largely Irrelevant)

| Library | Version | Downloads/mo | Stars | License | Bus Factor | Status | identity-model Relationship |
|---------|---------|-------------|-------|---------|-----------|--------|----------------------------|
| **oauthlib** | 3.3.1 | 296M | 2,961 | BSD-3 | 2 | Low activity | **Not useful.** Server/provider-side OAuth2 logic. No client-side value. |
| **requests-oauthlib** | 2.0.0 | 334M | 1,773 | ISC | 0 | Abandoned | **Not useful.** Sync-only (tied to `requests`), no release in 2+ years. Downloads come from being a transitive dep of `google-auth`. |

**Recommendation:** Neither library is relevant to identity-model. oauthlib is server-focused; requests-oauthlib is architecturally obsolete in an httpx/async world. identity-model already uses httpx directly.

### Layer 3 — Protocol Client (Direct Competition)

| Library | Version | Downloads/mo | Stars | License | Bus Factor | Last Release | CVEs |
|---------|---------|-------------|-------|---------|-----------|-------------|------|
| **authlib** | 1.6.9 | 123M | 5,261 | BSD-3 | 1 | 2026-03-02 | 9 (1 critical) |

authlib is identity-model's **only real competitor** in the Python ecosystem. Everything else operates at a different layer.

**authlib Strengths:**
- Most feature-complete Python OIDC library (discovery, JWKS, JWT, all core flows)
- Framework integrations (Flask, Django, FastAPI, Starlette)
- Async support via httpx `AsyncOAuth2Client`
- 123M monthly downloads, established brand

**authlib Weaknesses:**
- **9 CVEs** including a critical JWS header injection (CVSS 9.1), Bleichenbacher padding oracle, and alg:none bypass. Heavy security debt for a security library.
- **Bus factor 1** — lepture has 1,352 commits; next contributor has 211
- **JOSE deprecation in progress** — migrating from `authlib.jose` to separate `joserfc` library (only 156 stars). Disruptive for existing users.
- **No modern RFCs** — No DPoP (9449), PAR (9126), RAR (9396), or Token Exchange (8693)
- **No py.typed** — No type annotation marker despite Python ecosystem moving toward strict typing
- **Server-side bias** — Introspection and revocation are implemented as server endpoints, not client operations

**identity-model Competitive Advantages vs. authlib:**

| Dimension | identity-model | authlib |
|-----------|---------------|---------|
| Modern RFCs (DPoP, PAR, Token Exchange) | Planned (P1/P2) | None |
| CVE history | 0 | 9 (1 critical, 3+ high) |
| Type safety (py.typed) | Yes | No |
| Async architecture | First-class dual sync/async | Secondary async via httpx |
| JOSE stability | Depends on PyJWT (stable) | Deprecating own JOSE module |
| Client-side focus | Purpose-built for relying parties | Client + server hybrid |
| Maintenance model | Team-maintained (planned) | Single maintainer |

**Positioning:** identity-model is the modern, client-focused alternative to authlib — async-first, type-safe, zero CVEs, with modern RFC coverage that authlib lacks. The timing is favorable: authlib's JOSE deprecation creates migration pressure, and the async+typed Python ecosystem (FastAPI, Litestar) needs a library built for it.

---

## Node/TypeScript Ecosystem

### Layer Map

```
Layer 4 (Framework):          Auth.js, oidc-client-ts ←── different category
                                ↑
Layer 3 (Protocol Client):    openid-client ←── identity-model's competitor
                                ↑                (also: oauth4webapi at a lower protocol level)
Layer 1 (JOSE Primitives):    jose ←── identity-model depends on jose (Epic 2 decision)
```

Note: Node lacks a distinct Layer 2 — jose and openid-client handle both JOSE and OAuth2 protocol concerns. passport-openidconnect is abandoned (v0.1.2, zero commits in 12+ months) and excluded from analysis.

### Layer 1 — JOSE Primitives (Dependency)

| Library | Version | Downloads/wk | Stars | License | Bus Factor | Status | identity-model Relationship |
|---------|---------|-------------|-------|---------|-----------|--------|----------------------------|
| **jose** | 6.2.2 | 61M | 7,477 | MIT | 1 (panva) | Active | **Planned dependency** (Epic 2 tech decision, pending 0B.5 research). Zero-dep, tree-shakeable ESM, works on every JS runtime. 6 historical CVEs (all medium, v2-era, patched). Best-in-class. |

**Recommendation:** Use jose as the JOSE layer. It's the clear best choice — zero dependencies, multi-runtime, excellent TypeScript types. The Epic 0B.5 Node ecosystem audit should confirm this, but no viable alternative exists at this quality level.

### Layer 3 — Protocol Client (Direct Competition)

| Library | Version | Downloads/wk | Stars | License | Bus Factor | Last Release | CVEs |
|---------|---------|-------------|-------|---------|-----------|-------------|------|
| **openid-client** | 6.8.2 | 6.7M | 2,323 | MIT | 1 (panva) | 2026-02-07 | 0 |

openid-client is the **strongest incumbent in any ecosystem** — full RFC coverage, FAPI 2.0 certified, zero CVEs, excellent TypeScript types.

**openid-client Strengths:**
- Full coverage: Discovery, JWKS, JWT validation, all flows, Introspection, Revocation, DPoP, PAR, RAR
- OpenID Certified (Basic RP, FAPI 1.0 RP, FAPI 2.0 RP)
- Zero CVEs. Zero dependencies (v6 uses Web Crypto directly via oauth4webapi)
- Clean functional API (v6 rewrite)
- Same author as jose and node-oidc-provider — coordinated ecosystem

**openid-client Weaknesses:**
- **Bus factor 1** — Filip Skokan (panva) is the sole maintainer. 61M weekly downloads of jose + 6.7M of openid-client resting on one person is an organizational risk.
- **v6 dropped features** — Dynamic Client Registration, encrypted assertions, Self-Issued OP support removed in the rewrite
- **Not middleware-oriented** — Designed for obtaining tokens (RP client), not for validating incoming tokens in a backend service. The "validate this JWT from my IdP as middleware" use case requires assembling jose + discovery manually.

**identity-model Competitive Position (Node):**

This is the toughest ecosystem to enter. openid-client is feature-complete and well-maintained. The competitive angles are narrow but real:

| Angle | identity-model Opportunity |
|-------|---------------------------|
| **Governance** | Multi-maintainer with organizational backing vs. bus factor 1 |
| **Server-side validation DX** | One-liner token validation with auto-discovery/JWKS — the py-identity-model `TokenValidationMiddleware` pattern ported to Node |
| **Unified API** | jose + protocol operations in one coherent package (openid-client delegates crypto to oauth4webapi which delegates to Web Crypto) |
| **Multi-tenant JWT** | First-class support for multi-tenant claims structures (Descope `dct` + `tenants` pattern) — currently left to application code everywhere |

**Positioning:** Don't compete head-on with openid-client on RFC coverage. Instead, focus on the server-side validation middleware niche (Express/Fastify/Hono) and the governance/sustainability story. identity-model's Node SDK should be positioned as the "backend JWT validation + token management" complement, not a full RP client replacement.

### Layer 4 — Framework Integration (Different Category)

| Library | Version | Downloads/wk | Stars | License | Bus Factor | Notes |
|---------|---------|-------------|-------|---------|-----------|-------|
| **oidc-client-ts** | 3.5.0 | 2.3M | 1,885 | Apache-2.0 | 1-2 | Browser-only. Auth Code+PKCE, DPoP, Revocation. Descended from Duende's oidc-client-js. |
| **Auth.js** | 0.34.3 (@auth/core) | 5.6M combined | 28,174 | ISC | 2-3 | Framework-coupled (Next.js, SvelteKit). Depends on jose + oauth4webapi transitively. 11 CVEs (2 critical). |

**Recommendation:** These are not competitors — they're potential consumers. oidc-client-ts is browser-side (identity-model is server-side). Auth.js is a framework auth solution that wraps protocol libraries. Epic 2B explores React/Next.js adapters that could bridge identity-model with these higher-layer tools.

---

## Go Ecosystem

### Layer Map

```
Layer 3 (Protocol Client):   coreos/go-oidc (validation only)  ←── identity-model fills
                              zitadel/oidc (full, but coupled)       the gap between these
                              ory/fosite (server framework)
                                ↑
Layer 2 (OAuth2 Transport):   golang.org/x/oauth2 ←── identity-model complements this
                                ↑
Layer 1 (JOSE Primitives):    go-jose/v4, golang-jwt/v5 ←── identity-model depends on one
```

### Layer 1 — JOSE Primitives (Potential Dependencies)

| Library | Status | identity-model Relationship |
|---------|--------|----------------------------|
| **go-jose/go-jose/v4** | Active, well-maintained | **Strong candidate.** Full JOSE suite (JWS, JWE, JWK). Used by coreos/go-oidc, zitadel/oidc, and many others. |
| **golang-jwt/jwt/v5** | Active (33 commits/yr) | **Alternative candidate.** JWT-focused (no JWE). Simpler API. 1 moderate CVE (claim validation type confusion, fixed). |

**Recommendation:** Epic 0B Story 0B.2 (Go ecosystem audit) must resolve the go-jose vs. golang-jwt decision. go-jose is more complete (JWE, JWK Set); golang-jwt is simpler and more popular. Both are viable Layer 1 dependencies.

### Layer 2 — OAuth2 Transport (Complement, Don't Replace)

| Library | Version | Stars | Importers | License | Bus Factor | identity-model Relationship |
|---------|---------|-------|-----------|---------|-----------|----------------------------|
| **golang.org/x/oauth2** | v0.36.0 | 5,833 | 46,692 | BSD-3 | Low-Med (Google-maintained) | **Complement.** The de facto standard for Go OAuth2 token acquisition. identity-model should interop with x/oauth2's `TokenSource` and `Token` types, not replace them. |

golang.org/x/oauth2 provides: Client Credentials, Auth Code + PKCE, Device Auth Grant, auto-refresh via `TokenSource`, and provider-specific configs (Google, GitHub, etc.). It explicitly **will not add** introspection (#493 closed), revocation (#455 closed), DPoP (#651 open, no timeline), or PAR (#653 open, no timeline).

**Recommendation:** identity-model's Go SDK should accept `x/oauth2.Token` as input and produce compatible types. The value proposition is everything x/oauth2 won't do: discovery, JWKS, JWT validation, introspection, revocation, DPoP, PAR, Token Exchange. Don't fork or wrap x/oauth2 — complement it.

### Layer 3 — Protocol Client (Direct Competition / Gap)

| Library | Version | Stars | Importers | License | Bus Factor | Last Release | CVEs |
|---------|---------|-------|-----------|---------|-----------|-------------|------|
| **coreos/go-oidc** | v3.17.0 | 2,370 | 1,331 | Apache-2.0 | 1 | 2025-11-21 | 0 |
| **zitadel/oidc** | v3.46.0 | 1,798 | ~50 | Apache-2.0 | 2-3 | 2026-04-02 | 0 |
| **ory/fosite** | v0.49.0 | 2,538 | 610 | Apache-2.0 | 1 | 2024-12-12 | 4 (fixed) |

**coreos/go-oidc** — Validation-only. Discovery + JWKS + ID Token verification. No token flows (delegates to x/oauth2), no introspection, no revocation, no modern RFCs. Bus factor 1, 4 commits/year. Well-regarded but extremely narrow.

**zitadel/oidc** — Most feature-complete Go OIDC library (client + server). Discovery, validation, Client Credentials, Auth Code + PKCE, UserInfo, Introspection, Token Exchange. But: coupled to ZITADEL's product roadmap, v4 in pre-release, no DPoP/PAR/RAR. OpenID Certified (Basic RP).

**ory/fosite** — Server-side OAuth2 framework. Has introspection, revocation, PAR as server endpoints — not useful for client-side. Effectively dormant (3 commits/year, last release Dec 2024, never reached v1.0).

**The Go Gap:** Today, a Go developer building a backend that validates JWTs from an IdP must:
1. Use coreos/go-oidc for discovery + token verification
2. Use golang.org/x/oauth2 for obtaining tokens
3. Manually bridge the two (go-oidc `Provider` → x/oauth2 `Endpoint`)
4. Write custom code for introspection, revocation, Token Exchange
5. Have zero options for DPoP or PAR

**identity-model fills the entire gap** between Layers 1-2 and what developers actually need. A single `go get` that provides discovery, JWKS management, JWT validation, token introspection, revocation, exchange, DPoP, and PAR — interoperating with x/oauth2's types — would have **no direct competitor.**

**Positioning:** Go is the highest-impact market entry after Python. The structural gap is the widest: 46K dependents on x/oauth2 paired with zero unified protocol client. identity-model doesn't replace x/oauth2 — it's the missing top half.

---

## Rust Ecosystem

### Layer Map

```
Layer 3 (Protocol Client):   openidconnect-rs ←── identity-model competes here
                                ↑
Layer 2 (OAuth2 Transport):   oauth2-rs ←── identity-model may wrap or depend on
                                ↑
Layer 1 (JOSE Primitives):    jsonwebtoken, josekit ←── identity-model depends on one
```

### Layer 1 — JOSE Primitives (Potential Dependencies)

| Library | Version | Downloads (90d) | Stars | License | Bus Factor | identity-model Relationship |
|---------|---------|----------------|-------|---------|-----------|----------------------------|
| **jsonwebtoken** | 10.3.0 | 25.4M | 2,027 | MIT | 1 | **Primary candidate.** JWT sign/verify with pluggable crypto backends (aws_lc_rs or rust_crypto). No async, no remote JWKS fetching — identity-model adds these. 1 CVE (moderate, type confusion in claim validation, fixed in 10.3.0). |
| **josekit** | 0.10.3 | 551K | 91 | MIT/Apache-2.0 | 1 | **Alternative.** Full JOSE (JWS + JWE + JWK). But: OpenSSL dependency (not pure-Rust), pre-1.0, uses `anyhow` for errors (un-idiomatic for libraries), 0 commits in 6 months. |

**Recommendation:** jsonwebtoken is the stronger choice despite no JWE support. Pure-Rust crypto (no OpenSSL), larger adoption (25M vs 551K), typed errors. identity-model adds the missing async JWKS fetching and OIDC-aware validation on top. Epic 0B Story 0B.3 (Rust ecosystem audit) should confirm.

### Layer 2 — OAuth2 Transport (Potential Dependency)

| Library | Version | Downloads (90d) | Stars | License | Bus Factor | identity-model Relationship |
|---------|---------|----------------|-------|---------|-----------|----------------------------|
| **oauth2-rs** | 5.0.0 | 7.0M | 1,168 | MIT/Apache-2.0 | 1 (ramosbugs) | **Potential dependency or complement.** Clean builder pattern, extensible types, introspection + revocation + Device Auth. Same maintainer as openidconnect-rs. |

oauth2-rs provides typed OAuth2 grant builders with pluggable HTTP clients (`SyncHttpClient`/`AsyncHttpClient` traits). It has introspection and revocation — which openidconnect-rs gets via this dependency.

**Recommendation:** Evaluate wrapping oauth2-rs for token acquisition flows rather than building from scratch. Its `ExtraTokenFields` trait and typed request builders are well-designed. The risk is the shared single-maintainer with openidconnect-rs — if ramosbugs becomes unavailable, both crates stall simultaneously.

### Layer 3 — Protocol Client (Direct Competition)

| Library | Version | Downloads (90d) | Stars | License | Bus Factor | Last Release | CVEs |
|---------|---------|----------------|-------|---------|-----------|-------------|------|
| **openidconnect-rs** | 4.0.1 | 2.1M | 610 | MIT | 1 (ramosbugs) | 2025-07-06 | 0 direct |

openidconnect-rs is the only Rust OIDC RP library. It provides: Discovery, JWKS, JWT validation, all core flows (Client Credentials, Auth Code + PKCE), UserInfo, plus Introspection and Revocation via oauth2-rs.

**openidconnect-rs Weaknesses:**
- **Effectively dormant** — 4 commits in the past year, 68 open issues
- **DPoP PR open for 3 years** (#109) with no merge. Maintainer said DPoP "would make sense as a separate crate"
- **Zero modern RFCs** — No DPoP, PAR, RAR, Token Exchange
- **Verbose generics** — `Client<...>` carries 5+ type parameters, making simple operations cumbersome
- **No security policy** despite being security-critical
- **Single maintainer** who also maintains oauth2-rs (shared bus factor 1)

**identity-model Competitive Advantages vs. openidconnect-rs:**

| Dimension | identity-model | openidconnect-rs |
|-----------|---------------|-----------------|
| Modern RFCs (DPoP, PAR, Token Exchange) | Planned | None (DPoP PR stalled 3 years) |
| Maintenance activity | Active (planned team) | 4 commits/year |
| Security policy | Planned (SECURITY.md, cargo-audit CI, fuzzing) | None |
| API ergonomics | Builder patterns without type-param cascade | 5+ generic type params on Client |
| Crypto approach | Pure-Rust (rustls/RustCrypto via jsonwebtoken) | Configurable (reqwest/curl/ureq) |
| OpenID Certification | Planned | None |

**Positioning:** Rust is the most underserved ecosystem. identity-model would be the first Rust crate with DPoP, PAR, RAR, or Token Exchange. The competitive bar is low (dormant incumbent), but the market is smaller — position Rust for credibility and cross-language completeness rather than as the primary adoption driver.

---

## Cross-Ecosystem: Protocol Client Feature Heatmap

Comparing only Layer 3 (protocol client) libraries — the layer identity-model competes at:

| Capability | Duende (.NET) | authlib (Py) | openid-client (Node) | zitadel/oidc (Go) | openidconnect-rs (Rust) |
|-----------|:---:|:---:|:---:|:---:|:---:|
| OIDC Discovery | Full | Full | Full | Full | Full |
| JWKS + Caching | Full | Full | Full | Full | Full |
| JWT Validation | Partial* | Full | Full | Full | Full |
| Client Credentials | Full | Full | Full | Full | Full |
| Auth Code + PKCE | Full | Full | Full | Full | Full |
| UserInfo | Full | Full | Full | Full | Full |
| Introspection (7662) | Full | Server** | Full | Full | Full*** |
| Revocation (7009) | Full | Server** | Full | Partial | Full*** |
| Token Exchange (8693) | Full | None | Partial | Full | None |
| DPoP (9449) | Full | **None** | Full | **None** | **None** |
| PAR (9126) | Full | **None** | Full | **None** | **None** |
| RAR (9396) | None | **None** | Full | **None** | **None** |
| CIBA | Full | None | N/A | None | None |
| FAPI 2.0 | Full | **None** | Full (certified) | **None** | **None** |

\* Delegates to Microsoft.IdentityModel.Tokens (Layer 1)
\** Server-side endpoint implementation, not client-side
\*** Via oauth2-rs (Layer 2) dependency

**The pattern is clear:** Python, Go, and Rust have zero client-side DPoP/PAR/RAR support. Only Duende and openid-client cover these — and they serve .NET and Node respectively.

---

## Dependency Health Assessment

Since identity-model will depend on Layer 1/2 libraries, their health matters:

### Layer 1 Dependencies (JOSE) — Health Summary

| Library | Ecosystem | Monthly Downloads | Bus Factor | CVEs | py.typed / TS | Async | Verdict |
|---------|-----------|------------------|-----------|------|--------------|-------|---------|
| **PyJWT** | Python | 496M | 2 | 6 (fixed) | Yes | No | **Good.** Stable, typed, well-maintained. py-identity-model already depends on it. |
| **jose** | Node | 61M/wk | 1 (panva) | 6 (med, fixed) | Yes | N/A | **Good quality, bus factor risk.** Best-in-class but single maintainer for 61M weekly downloads. |
| **go-jose/v4** | Go | N/A | 2-3 | 0 | N/A | N/A | **Good.** Full JOSE suite, actively maintained. |
| **golang-jwt/v5** | Go | N/A | 2 | 0 | N/A | N/A | **Good.** JWT-focused, simpler API, active. |
| **jsonwebtoken** | Rust | 25M/90d | 1 | 1 (mod, fixed) | N/A | No | **Acceptable.** Largest Rust JWT crate. Single maintainer but active (33 commits/yr). |

### Layer 2 Dependencies (OAuth2 Transport) — Health Summary

| Library | Ecosystem | Importers | Bus Factor | CVEs | Verdict |
|---------|-----------|-----------|-----------|------|---------|
| **golang.org/x/oauth2** | Go | 46,692 | Low-Med (Google) | 1 (high, fixed) | **Good.** Semi-official, widely adopted. Not a dependency — a complement. |
| **oauth2-rs** | Rust | 280 crates | 1 (ramosbugs) | 0 | **Acceptable.** Clean API, but single maintainer shared with openidconnect-rs. |

**Key dependency risk:** The jose (Node) and jsonwebtoken (Rust) dependencies each have bus factor 1. identity-model should monitor these and have contingency plans (e.g., could fork jose under an org if panva becomes unavailable). For Python, PyJWT's bus factor of 2 is adequate.

---

## Maintenance Health Summary

### Bus Factor by Layer

| Bus Factor | Layer 3 (Competitors) | Layer 1-2 (Dependencies) |
|-----------|----------------------|--------------------------|
| **0 (abandoned)** | python-jose, requests-oauthlib, passport-oidc, ory/fosite (near-dormant) | — |
| **1 (critical)** | authlib, coreos/go-oidc, openidconnect-rs, openid-client | jose, jsonwebtoken, oauth2-rs, josekit |
| **2-3** | zitadel/oidc, Auth.js | PyJWT, oauthlib, go-jose, golang-jwt |
| **4+** | Duende IdentityModel | golang.org/x/oauth2 (Google-backed) |

### CVE History (Layer 3 Only — Competitors)

| Library | Total CVEs | Critical | High | Notable |
|---------|-----------|---------|------|---------|
| authlib | 9 | 1 | 3+ | JWS header injection (9.1), Bleichenbacher oracle, alg:none bypass |
| openid-client | 0 | 0 | 0 | Clean record |
| zitadel/oidc | 0 | 0 | 0 | Clean (note: ZITADEL the product has separate CVEs) |
| openidconnect-rs | 0 | 0 | 0 | Clean (transitive RSA timing issue via dep) |
| ory/fosite | 4 | 0 | 0 | Redirect URI and revocation bugs |
| Auth.js | 11 | 2 | 4 | Open redirects, auth bypass, PKCE check failures |

---

## Strategic Recommendations

### 1. Per-Language Go-to-Market Priority

| Priority | Language | Rationale |
|----------|---------|-----------|
| **1** | **Python** | Existing py-identity-model foundation. Only real competitor (authlib) has CVE baggage and no modern RFCs. JOSE migration creates a window. |
| **2** | **Go** | Widest structural gap. No unified protocol client exists — developers manually bridge go-oidc + x/oauth2. Zero DPoP/PAR options. First-mover advantage. |
| **3** | **Rust** | Most underserved. Dormant incumbent (4 commits/yr). Smallest market but strongest differentiation signal. |
| **4** | **Node/TypeScript** | Strongest incumbent (openid-client). Compete on governance, middleware DX, and multi-tenant patterns — not feature parity. |

### 2. Dependency Strategy Per Language

| Language | Layer 1 (JOSE) | Layer 2 (OAuth2) | Build Strategy |
|----------|---------------|-----------------|----------------|
| **Python** | Depend on PyJWT | N/A (use httpx directly) | Wrap PyJWT for validation; build protocol operations on httpx |
| **Node** | Depend on jose | N/A (use fetch/undici) | Wrap jose for JWKS/validation; build protocol client from scratch |
| **Go** | Depend on go-jose or golang-jwt (0B.2 decides) | Complement x/oauth2 (interop with TokenSource/Token) | Build protocol client that accepts x/oauth2 types |
| **Rust** | Depend on jsonwebtoken (0B.3 decides) | Evaluate wrapping oauth2-rs | Build on top of jsonwebtoken + reqwest; optionally use oauth2-rs for grant flows |

### 3. Differentiation Axes

| Axis | identity-model | Best Incumbent |
|------|---------------|----------------|
| **Cross-language consistency** | Same mental model, shared conformance tests, consistent API surface | None exist (every library is single-language) |
| **Modern RFC coverage** | DPoP + PAR + RAR + Token Exchange in all languages | Only Duende (.NET) and openid-client (Node) |
| **Integration layer value** | Composes Layer 1+2 into cohesive protocol client | Developers must assemble 2-4 libraries themselves |
| **Multi-maintainer governance** | Team-maintained, security policy, SBOM | Bus factor 1 across most competitors |
| **Client-side focus** | Purpose-built for relying parties | authlib/oauthlib/fosite have server-side bias |

### 4. Key Risks

| Risk | Mitigation |
|------|-----------|
| openid-client (Node) is feature-complete and OpenID Certified | Don't compete head-on; focus on middleware DX, governance, and multi-tenant patterns |
| authlib has 123M monthly downloads | Target async+typed niche; time entry with JOSE migration disruption |
| golang.org/x/oauth2 is standard library | Complement, don't replace. Interop with its types. |
| Layer 1 dependencies have bus factor 1 (jose, jsonwebtoken) | Monitor health; maintain ability to fork under org if needed |
| Rust market is small | Ship for credibility and completeness, not as primary adoption driver |
| Duende relationship | Prominent attribution; frame as "inspired by" not "port of" |

---

## Data Collection Notes

- GitHub metrics collected 2026-04-05
- Download stats from PyPI, npm, crates.io, NuGet as of 2026-04-05
- CVE data from GitHub Security Advisories, OSV, Snyk, RustSec
- Feature assessments based on current main branch documentation and source code
- "Bus factor" = number of contributors with >5% of total commits who are active in last 12 months
- Layer classifications are the author's assessment; some libraries span layers (authlib, zitadel/oidc)
