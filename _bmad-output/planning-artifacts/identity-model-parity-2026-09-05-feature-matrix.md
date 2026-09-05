# FEATURE-parity refresh — identity-model (2026-09-05, main @ ba30926)

Path shorthands: PY = py/src/py_identity_model, GO = go/pkg, RS = rust/src, SPEC = spec.

## 1. Refreshed capability matrix

Legend: ✅ full · 🟡 partial · ❌ absent · Δ = changed vs the 2026-08-29 report · ⚑ = disagrees with spec/capabilities.md on main today.

### Core tier

| # | Capability | Py | Go | Rust | Evidence / notes |
|---|---|:--:|:--:|:--:|---|
| A1 | Discovery fetch | ✅ | ✅ | ✅ | PY/sync,aio/discovery.py · GO/discovery/discovery.go · RS/discovery/client.rs |
| A2 | Metadata parse | ✅ | ✅ | ✅ | unchanged |
| A3 | Issuer validation | 🟡 | ✅ | ✅ | Inversion intact — see §2 I-3 |
| A4 | Discovery cache | ✅ | ✅ | ✅ | |
| A5 | SSRF / endpoint-authority | ✅ | 🟡 | 🟡 | PY/core/response_processors.py:100-172 (authority pinning + internal-IP rejection); Go/Rust still HTTPS+body-cap only |
| B1 | JWKS fetch | ✅ | ✅ | ✅ | |
| B2 | JWKS key parsing | ✅ | 🟡 | 🟡 | GO/jwt/jwt.go:134-136 (RSA/EC only); RS/jwks/key.rs:73-80 (RSA/EC only) |
| B3 | kid selection | ✅ | ✅ | ✅ | |
| B4 | key-omits-alg fallback | ✅ | ✅ | ✅ | PY/core/parsers.py:234-236 |
| B5 | Duplicate-kid try-all | ❌ | ❌ | ❌ | First-match everywhere: PY/core/parsers.py:223-232; GO/jwks/jwks.go:122-126; RS/jwks/key.rs:144-148 |
| B6 | kid-miss refresh + cooldown | ✅ | ✅ | ✅ | |
| B7 | JWKS cache | ✅ | ✅ | ✅ | |
| C1 | Signature verify | ✅ | ✅ | ✅ | |
| C2 | Algorithm support | ✅ | ✅ | 🟡 | Py incl. EdDSA/ES256K; Go RS/PS/ES 256-512 (GO/jwt/options.go:13-17); Rust RS/PS 256-512 + ES256/384 only, no ES512/EdDSA (RS/jwt/mod.rs:240-247) |
| C3 | Registered-claim validation | ✅ Δ | 🟡 | ✅ | Py now enforces sub-required + azp via id-token profile (PY/core/id_token_logic.py:175-196). Go base still leaves sub unvalidated (id-token path requires it: GO/idtoken/idtoken.go:74-76) |
| C4 | Clock skew | ✅ | ✅ | ✅ | |
| C5 | Validation options | ✅ | ✅ | ✅ | |
| C6 | at_hash / c_hash / nonce | ✅ Δ | ✅ Δ | ✅ Δ | Biggest change: all three now do nonce + at_hash + c_hash + auth_time/max_age in the id-token profile. Old report's "at_hash/c_hash: none" no longer true anywhere |
| C7 | ID-vs-access discrimination | ❌ | ❌ | ❌ | Explicitly middleware-scoped — PY/core/id_token_logic.py:20-23 docstring |
| D1a/D1b | client_credentials / auth_code | ✅ | ✅ | ✅ | GO/token/token.go:74,97; RS/token/mod.rs:142,171 |
| D3 | PKCE | ✅ | ✅ | ✅ | |
| E1/E2 | UserInfo + sub check | ✅ | ✅ | ✅ | GO/userinfo/userinfo.go:25-27; RS/userinfo/mod.rs:80-89 |
| NEW | ID-token validation (first-class) | ✅ | ✅ | ✅ | Py #629/#630 (sync/id_token.py, aio, core/id_token_logic.py); Go #632 (GO/idtoken/); Rust #631 (RS/jwt/id_token.rs). Shared SPEC/vectors/id-token.json (IDT-001..011), runners in all 3. ⚠ still cross_language_coverage_gate:"pending" — gate enforces only validation.json; skip-comment stale, both runners exist |
| NEW | Injectable claims validators | ✅ | ✅ | ✅ | PY/core/claims_validation.py · GO/jwt/claims_validation.go · RS/jwt/claims_validation.rs. Shared fixture SPEC/test-fixtures/claims-validation/vectors.json (19 vectors, runners ×3) |
| NEW | Typed fail-closed Config API | ✅ | ❌ | ❌ | PY/core/config.py (#605). Contract SPEC/config.md + SPEC/vectors/config.json (prose tests, no executable vectors — deliberately outside gate per capabilities.md †). Go/Rust: no config module — matches "planned" |

### Extended tier

| # | Capability | Py | Go | Rust | Evidence |
|---|---|:--:|:--:|:--:|---|
| D1c | refresh_token grant | ✅ | ❌ | ❌ | GO/token exposes only CC/AC/Exchange; RS/token only client_credentials/exchange_code |
| D1d | Token exchange (8693) | ✅ | ✅ | ❌ | GO/token/token.go:134 |
| D1e/F3 | Device auth (8628) | ✅ | ❌ | ❌ | PY/sync,aio/device_auth.py |
| F1 | Introspection (7662) | ✅ | ✅ | ✅ Δ | Rust gained it post-report (#584, rust 0.1.0): RS/introspection/mod.rs — basic+post client auth, token_type_hint, typed response, INTR-keyed tests. ⚑ see §1a flag 2 |
| F2 | Revocation (7009) | ✅ | ✅ | ❌ | matches "planned" |
| F4 | DCR (7591/7592) | ✅ | ❌ | ❌ | PY/sync,aio/registration.py |
| G3 | DPoP (9449) | ✅ | ✅ | ❌ | GO/dpop/ full incl. server verify.go |
| E3 | Signed/encrypted UserInfo | 🟡 | ❌ | ❌ | Go/Rust actively reject application/jwt: GO/userinfo/userinfo.go:91-92; RS/userinfo/mod.rs:153-160 |

### Advanced / FAPI tier — no cell changed since 2026-08-29

Python ✅ for D2c private_key_jwt, D2d mTLS, D4, G2 cert-bound (8705), G4 PAR, G5 JARM, G6 JAR, G7 RFC 9207, G9 authorize-URL+callback, G10 logout, K5 FAPI; Go/Rust ❌ throughout except D2b client_secret_post (Go ✅ Rust ✅ Py ❌ — inversion I-1) and G9 Rust 🟡 (builder only: RS/token/pkce.rs:100; no callback parse; Go still internal test-helper only). Zero private_key_jwt/client_assertion code in GO/ or RS/. RAR/CIBA: nothing anywhere — capabilities.md "planned ×3" accurate.

### Cross-cutting — no cell changed since 2026-08-29

- H3 Cache-Control TTL: Py-only. H4 LRU bound ✅×3. H5 single-flight: Py+Go; Rust JWKS-only (flight_gate only in RS/jwks/cache.rs:84, nothing in RS/discovery/).
- H6 metrics: Py async-only (record_* only in PY/aio/token_validation.py) · Go/Rust none.
- I2 retry/backoff: Py-only. I3 SSL/CA env: Py-only. I5 proxy, J1-J4, K1-K3, G8: unchanged (RS/jwt/mod.rs:126: "this crate has no logging facility").

### 1a. spec/capabilities.md flags (post-#640/#641)

Matrix now mostly truthful. Remaining discrepancies:
1. Line 49 "Known cross-language divergences" note STALE: still says Python lacks id-token nonce validation and "Rust validates azp, which Python and Go do not." Both wrong since #629-#632. Only client_secret_post and RFC 8414 issuer match remain Python-missing.
2. Python "implemented" for Introspection/Revocation/Token Exchange contradicts the doc's own MUSTs (lines 96-102, 161-167, 252-255 require client_secret_basic AND client_secret_post — Python has only basic/mTLS/private_key_jwt). Also INTR-001..006 vector IDs executed by Go+Rust tests but no Python test references any INTR-* id.
3. id-token.json still opted out of the coverage gate despite all three runners existing.

## 2. The four inversions, re-verified on main

| # | Inversion | Status | Evidence |
|---|---|---|---|
| I-1 | client_secret_post | STILL PRESENT | Py none: PY/core/token_client_logic.py:76-90 (private_key_jwt → mTLS → Basic only), same introspection_logic.py:42-57, revocation_logic.py:39-53; only dead constants (oidc_constants.py:409, config.py:132 enum unwired). Go: token/options.go:16-18 + token.go:204, introspection.go:69, revocation.go:82. Rust: token/mod.rs:83,232; introspection/mod.rs:145 |
| I-2 | id-token nonce | RESOLVED in Python (Δ) | PY/core/id_token_logic.py:199-207 (constant-time, fail-closed) via first-class validate_id_token. Residual: Go/Rust also expose expected-nonce on BASE JWT validation (GO/jwt/options.go:71-74; RS/jwt/options.rs:164-166); Python's base TokenValidationConfig has no nonce field — JWT-004 satisfied via claims-validator adapter (test_spec_conformance.py:169-226) |
| I-3 | RFC 8414 issuer-identifier match | STILL PRESENT | Python validates issuer format only (PY/core/validators.py:26,204-226) + endpoint-authority binding; no doc.issuer == requested compare anywhere. Go: discovery.go:206 (DISC-003). Rust: client.rs:88-89. Last inversion where both ports beat the reference |
| I-4 | azp | RESOLVED for Py+Go (Δ); Rust eager behavior unchanged | Py: id_token_logic.py:182-196 (multi-aud ⇒ azp required; present azp must equal client_id). Go: idtoken.go:125-145. Rust: retains always-on azp in base validate_token when expected_audience set (RS/jwt/claims.rs:296-315) plus profile (id_token.rs:280-286). Plan's I-4 rec ("soften Rust to opt-in") NOT implemented — but the Py/Go direction (profile-scoped, keyed to client_id) is opt-in-shaped |

Net: 2 of 4 closed by the id-token stack; I-1 and I-3 remain open — the two P0 items still requiring §3 sign-off.

## 3. Coverage estimate

Denominator: reference (Python) surface = 61 rows (22 core + 9 extended + 11 advanced + 16 cross-cutting + 3 new). ✅=1, 🟡=0.5:

| Tier (rows) | Python | Go | Rust |
|---|---|---|---|
| Core (22) | 21.5 | 20.5 | 20.5 |
| Extended (9) | 8.5 | 4 | 1 |
| Advanced (11) | 11 | 0 | 0.5 |
| Cross-cutting (16) | 15.5 | 9 | 7.5 |
| New (3) | 3 | 2 | 2 |
| Total /61 | 59.5 ≈ 98% | 35.5 ≈ 58% | 31.5 ≈ 52% |

Caveat: old report's "Go ≈45% · Rust ≈25%" were size-weighted impressions; same row arithmetic on the 08-29 matrix gives Go ≈56%, Rust ≈48%. Like-for-like deltas: Go +2pts, Rust +4pts. In old-report style: Python ≈100% · Go ≈48% · Rust ≈32%. Rust's gap to Go is now almost entirely extended-tier (revocation, token-exchange, DPoP, refresh) plus sync API.

## 4. Gap list (candidate work items)

Python (two open inversions + residuals):
- client_secret_post for token/introspection/revocation/token-exchange — S, Core (P0 I-1; unblocks capabilities.md MUST conformance)
- RFC 8414 issuer-identifier match — S, Core (P0 I-3)
- First-class expected_nonce on base TokenValidationConfig — S, Core
- Sync-path cache-metrics instrumentation (H6) — S, P1 operational
- Uniform body caps / redirect-downgrade / dup-claim-key back-ports — M, P3

Go:
- Config API — M, Core (epic not started)
- refresh_token grant — S, Extended · Device auth — M · DCR — M · Signed UserInfo — S
- Base-validation sub + azp outside idtoken pkg (C3 residual) — S, Core
- H3 TTL + env / I2 retry / I3 SSL env / H6 metrics — M combined, P1
- A5 SSRF endpoint-authority pinning — M, P1
- B5 dup-kid / C7 discriminator / G8 helpers — S each
- Advanced-FAPI set (private_key_jwt, mTLS/8705, PAR, JAR, JARM, 9207, logout, FAPI validators, authorize-URL) — L, owner-scheduled

Rust:
- Config API — M, Core · Revocation — S/M · Token Exchange — M · DPoP (Go as template) — L · refresh_token — S · device auth — M · DCR — M · E3 — S
- ES512 + EdDSA (C2, jsonwebtoken-crate constraint) — M, Core
- Discovery single-flight — S, P1 · H3/I2/I3/H6 — M, P1 · A5 pinning — M, P1
- Sync API (J1) — L, deliberate-scope decision · logging (K3) — M
- azp softening per plan I-4, if that decision stands — S, Core
- B5 / C7 / G8 — S each · callback-parse half of G9 — S
- Advanced-FAPI set — L, owner-scheduled

Spec/housekeeping (parity-neutral, high leverage):
- Flip id-token.json gate flag + extend spec_coverage_gate.py to per-capability reports — S/M
- Fix stale divergence note at SPEC/capabilities.md:49 — S
- Add INTR-vector-keyed Python conformance tests (or mark n/a) — S
- B5/C7/G8 + front-channel logout: gaps common to all three — fix-once-everywhere candidates
