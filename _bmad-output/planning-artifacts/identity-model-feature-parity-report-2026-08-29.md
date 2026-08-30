# identity-model — Cross-Language Feature Parity Report

**Python (`py-identity-model`) vs Go (`identity-model/go`) vs Rust (`rs-identity-model`)**
Reference implementation = **Python**. Basis: full source read of `py/src/py_identity_model/`, `go/pkg/`, `rust/src/` (2026-08-29). Legend: ✅ full · 🟡 partial / narrower · ❌ absent.

---

## 1. TL;DR

**Three tiers of completeness:**

- **Python is the superset.** Every core, extended, and advanced/FAPI capability — dual sync + async APIs, introspection, revocation, device auth, dynamic client registration, token exchange, DPoP, mTLS + cert-bound tokens, PAR, JAR, JARM, RFC 9207, RP-initiated + back-channel logout, FAPI 2.0 validators, retry/backoff, SSL-CA env config, ClaimsPrincipal, and a Cache-Control-derived TTL cache.
- **Go is core + a slice of extended.** Discovery, JWKS, JWT validation, client-credentials + auth-code, UserInfo — **plus** Introspection, Revocation, Token Exchange, and a **complete DPoP** implementation (keygen, proof signing, client transport, *and* a server-side verifier). No advanced/FAPI tier, no `refresh_token` grant, no `private_key_jwt`/mTLS.
- **Rust is core-only.** Discovery, JWKS, JWT validation, client-credentials + auth-code + PKCE, UserInfo. **Nothing** from the extended or advanced tiers — no introspection, revocation, token exchange, or DPoP.

**Rough surface ratio:** Python ≈ 100% · Go ≈ 45% · Rust ≈ 25% of the reference capability surface.

**Four surprising inversions — where the "reference" Python actually trails the ports** (§5): Python is missing `client_secret_post`, id-token `nonce` validation, and the RFC 8414 issuer-identifier match — all of which **Go and Rust have**; and Rust validates `azp`, which **Python and Go don't**.

**The declared `spec/capabilities.md` matrix is stale and wrong about Python** (§8): it marks Python as "planned" for auth-code, introspection, revocation, token-exchange, and DPoP — all of which Python fully implements. It predates the consolidation.

---

## 2. Master capability matrix

### Core tier
| # | Capability | Python | Go | Rust | Notes |
|---|---|:---:|:---:|:---:|---|
| A1 | Discovery fetch | ✅ | ✅ | ✅ | |
| A2 | Discovery metadata parse | ✅ | ✅ | ✅ | Py maps ~50 fields incl. mTLS/JARM/PAR/9207/BCL; Go/Rust map required set + overflow |
| A3 | Issuer validation | 🟡 | ✅ | ✅ | **Inversion:** Go/Rust enforce `issuer == requested` (RFC 8414 §3.3); Py does issuer *format* + endpoint-authority binding but **not** the identifier-match |
| A4 | Discovery cache | ✅ | ✅ | ✅ | |
| A5 | SSRF / endpoint-authority | ✅ | 🟡 | 🟡 | Py binds every advertised endpoint to issuer host + rejects internal-IP literals; Go/Rust only HTTPS + body-cap (+ Rust redirect-downgrade guard), **no host-pinning** |
| B1 | JWKS fetch | ✅ | ✅ | ✅ | Py size/key-count caps (512 KB / 100 keys); all cap body |
| B2 | JWKS key parsing | ✅ | 🟡 | 🟡 | Py: RSA/EC/**OKP/oct** usable. Go/Rust: RSA/EC only *verifiable* (OKP/oct parsed but not usable) |
| B3 | Key selection by `kid` | ✅ | ✅ | ✅ | |
| B4 | Key-omits-`alg` → header alg | ✅ | ✅ | ✅ | Py explicit fallback; Go/Rust header-driven by construction |
| B5 | Duplicate-`kid` try-all | ❌ | ❌ | ❌ | **All three** first-match only |
| B6 | Refresh-on-kid-miss + cooldown | ✅ | ✅ | ✅ | Deliberate cross-lang parity (5 s default) |
| B7 | JWKS cache | ✅ | ✅ | ✅ | |
| C1 | JWT signature verify | ✅ | ✅ | ✅ | |
| C2 | Algorithm support | ✅ | ✅ | 🟡 | Py widest (RS/PS/ES incl. ES256K + **EdDSA** + HS-vs-oct). Go RS/PS/ES256-512. **Rust narrowest: RS/PS/ES256+384 only — no ES512, no EdDSA.** All reject `none` |
| C3 | Registered-claim validation | 🟡 | 🟡 | ✅ | iss/aud/exp/nbf/iat everywhere. **`azp`: Rust ✅, Py ❌, Go ❌.** Go leaves `sub` parsed-but-unvalidated |
| C4 | Clock skew / leeway | ✅ | ✅ | ✅ | default 0 everywhere |
| C5 | Validation options config | ✅ | ✅ | ✅ | |
| C6 | at_hash / c_hash / nonce | 🟡 | 🟡 | 🟡 | **at_hash/c_hash: none.** **id-token nonce: Go ✅, Rust ✅, Py ❌** (inversion) |
| C7 | ID-vs-access-token discrimination | ❌ | ❌ | ❌ | **All three** treat every JWT identically |
| D1a | Grant: client_credentials | ✅ | ✅ | ✅ | |
| D1b | Grant: authorization_code | ✅ | ✅ | ✅ | |
| D3 | PKCE | ✅ | ✅ | ✅ | Py S256+plain; Go S256 helper; Rust S256 only |
| E1 | UserInfo fetch | ✅ | ✅ | ✅ | Py also DPoP-bound |
| E2 | UserInfo `sub` validation | ✅ | ✅ | ✅ | |

### Extended tier
| # | Capability | Python | Go | Rust | Notes |
|---|---|:---:|:---:|:---:|---|
| D1c | Grant: refresh_token | ✅ | ❌ | ❌ | Go/Rust model the *response* field but no refresh flow |
| D1d | Grant: token-exchange (RFC 8693) | ✅ | ✅ | ❌ | Go impl. is complete (actor/resource/audience/issued_token_type) |
| D1e | Grant: device_code (RFC 8628) | ✅ | ❌ | ❌ | Py polls with slow_down/pending handling |
| F1 | Introspection (RFC 7662) | ✅ | ✅ | ❌ | |
| F2 | Revocation (RFC 7009) | ✅ | ✅ | ❌ | Go re-checks HTTPS per redirect hop |
| F3 | Device Authorization (RFC 8628) | ✅ | ❌ | ❌ | |
| F4 | Dynamic Client Registration (7591/7592) | ✅ | ❌ | ❌ | Py incl. management CRUD |
| G3 | DPoP (RFC 9449) | ✅ | ✅ | ❌ | **Go = full**: keygen ES256/RS256, proof, RoundTripper w/ nonce retry, *server-side verifier* |
| E3 | Signed/encrypted UserInfo (JWT) | 🟡 | ❌ | ❌ | Py returns raw for caller to verify; Go/Rust reject `application/jwt` |

### Advanced / FAPI tier
| # | Capability | Python | Go | Rust | Notes |
|---|---|:---:|:---:|:---:|---|
| D2b | Client auth: client_secret_post | ❌ | ✅ | ✅ | **Inversion — Py lacks it** |
| D2c | Client auth: private_key_jwt (7523) | ✅ | ❌ | ❌ | |
| D2d | Client auth: mTLS / tls_client_auth | ✅ | ❌ | ❌ | |
| D4 | client_assertion (JWT) | ✅ | ❌ | ❌ | |
| G2 | mTLS + cert-bound tokens (RFC 8705) | ✅ | ❌ | ❌ | Py: x5t#S256 constant-time binding, fail-closed |
| G4 | PAR (RFC 9126) | ✅ | ❌ | ❌ | |
| G5 | JARM (signed) | ✅ | ❌ | ❌ | Py signed-only; encrypted JARM rejected |
| G6 | JAR / request objects (RFC 9101) | ✅ | ❌ | ❌ | |
| G7 | RFC 9207 `iss` in authz response | ✅ | ❌ | ❌ | |
| G9 | Authorize-URL builder / callback parse | ✅ | ❌ | 🟡 | Go: internal test helper only. Rust: **builder only, no callback parse** |
| G10 | Logout (RP-initiated / back-channel) | ✅ | ❌ | ❌ | Py RP-init + back-channel; **no front-channel** in any |
| K5 | FAPI 2.0 validators | ✅ | ❌ | ❌ | Py `core/fapi.py` |

### Cross-cutting (caching / HTTP / API / ops)
| # | Concern | Python | Go | Rust | Notes |
|---|---|:---:|:---:|:---:|---|
| H3 | Cache-Control→env→default TTL + clamp | ✅ | ❌ | ❌ | **Go/Rust: static 24 h only.** No `max-age` parse, no `*_CACHE_TTL` env, no `[60s,86400s]` clamp |
| H4 | LRU / max-entries bound + env | ✅ | ✅ | ✅ | Deliberate parity: default 64, `*_CACHE_MAX_ENTRIES`, 0=unbounded, neg→default |
| H5 | Single-flight / coalescing | ✅ | ✅ | 🟡 | Py & Go: disco + jwks. **Rust: JWKS only** (disco cache not coalesced) |
| H6 | Cache hit/miss/refresh metrics | 🟡 | ❌ | ❌ | Py: **async path only**. Go/Rust: none |
| H7 | kid-miss cooldown sidecar | ✅ | ✅ | ✅ | bounded in all three |
| I1 | Timeout config | ✅ | ✅ | ✅ | 30 s default everywhere |
| I2 | HTTP retry / backoff (+env) | ✅ | ❌ | ❌ | Py: 429/5xx exp-backoff, `Retry-After`, `HTTP_RETRY_*`. **Go/Rust: none** |
| I3 | SSL / CA-bundle env config | ✅ | ❌ | ❌ | Py: `SSL_CERT_FILE`/`CURL_CA_BUNDLE`/`REQUESTS_CA_BUNDLE`. Go/Rust: inject a whole client |
| I4 | Connection pooling | ✅ | ✅ | ✅ | implicit reuse everywhere |
| I5 | Explicit proxy config | ❌ | 🟡 | ❌ | none surface it; Go inherits `ProxyFromEnvironment` |
| J1 | Sync API | ✅ | ✅ | ❌ | **Rust async-only (tokio)** |
| J2 | Async API | ✅ | n/a | ✅ | Go uses goroutines/blocking; Py has full `aio/` mirror |
| J3 | Rich typed error taxonomy | ✅ | ✅ | ✅ | Py hierarchy; Go per-pkg typed+sentinel; Rust 7-variant enum |
| J4 | Typed models + overflow maps | ✅ | ✅ | ✅ | |
| K1 | ClaimsPrincipal / identity model | ✅ | ❌ | ❌ | Py `.NET`-style Claim/ClaimsIdentity/ClaimsPrincipal |
| K2 | SSL config env vars | ✅ | ❌ | ❌ | |
| K3 | Logging / telemetry + redaction | ✅ | ❌ | ❌ | Go/Rust: no logging at all |
| G8 | nonce/state **generation** helpers | ❌ | ❌ | ❌ | All validate but **none generate** state/nonce |

---

## 3. What each language covers, by tier

- **Python:** Core ✅ · Extended ✅ · Advanced/FAPI ✅ · dual sync+async · operational (retry, SSL-env, TTL policy, logging, metrics-async, ClaimsPrincipal, FAPI validators).
- **Go:** Core ✅ · Extended **partial** (introspection, revocation, token-exchange, DPoP-full — but no refresh grant, no device auth, no DCR, no JWT-userinfo) · Advanced/FAPI ❌ · sync/goroutine model.
- **Rust:** Core ✅ (auth-code + PKCE) · Extended ❌ · Advanced/FAPI ❌ · async-only.

---

## 4. Divergences *within* the shared core (the subtle stuff)

Even where all three "have" a feature, they differ:

- **JWT algorithms (C2):** Python accepts EdDSA, ES256K, and HS-against-`oct`; Go is asymmetric-only RS/PS/ES256-512; **Rust is the narrowest — RS/PS/ES256 & ES384 only, no ES512, no EdDSA.** A token signed ES512 or EdDSA validates in Python, maybe Go, **not Rust**.
- **Cache TTL (H3):** Python honors the provider's `Cache-Control: max-age` (then `*_CACHE_TTL` env, then a clamped default). **Go and Rust ignore server cache headers entirely and use a fixed 24 h TTL** — a real behavioral divergence against a rotating provider.
- **SSRF posture (A5):** Python is materially stronger — it pins every advertised endpoint to the issuer's scheme+host and rejects internal-IP literals (incl. octal/hex/decimal encodings). Go/Rust only enforce HTTPS + a body cap.
- **Single-flight (H5):** Rust coalesces concurrent JWKS misses but **not** discovery misses; Python and Go coalesce both.
- **Retry (I2):** Only Python retries transient 429/5xx with backoff. Go/Rust surface the error on the first failure.

---

## 5. Inversions — where Python (the reference) trails the ports

These are worth deciding on explicitly, because "match Python" would *remove* them:

1. **`client_secret_post` (D2b):** Go & Rust support secret-in-body; **Python does not** (only Basic, private_key_jwt, mTLS, none). Some providers require post.
2. **id-token `nonce` validation (C6):** Go & Rust validate an expected `nonce`; **Python has no id-token nonce validation** at all.
3. **RFC 8414 issuer-identifier match (A3):** Go & Rust reject a discovery doc whose `issuer` ≠ the requested issuer; **Python doesn't do that specific check** (it validates issuer *format* + endpoint authority instead).
4. **`azp` validation (C3):** **Rust** validates `azp`; Python and Go don't.

---

## 6. Gaps common to all three (parity-neutral — fix once, everywhere)

- **Duplicate-`kid` try-all (B5)** — all pick the first key with a matching `kid`; none retry other same-`kid` candidates on verify failure.
- **`at_hash` / `c_hash` (C6)** — none implement token/code hash binding.
- **ID-token vs access-token discrimination (C7)** — none distinguish token classes (the `scope`-present discriminator from the Python F-07 work is not in the shared validators).
- **state/nonce *generation* (G8)** — all validate, none generate.
- **Front-channel logout** — absent in all three (Python has RP-init + back-channel only).

---

## 7. Native-port hardening (things Go/Rust do that are worth back-porting)

The ports aren't strictly a subset — they added defenses uniformly:

- **Universal 1 MiB streamed body caps** on *every* endpoint (Go & Rust). Python caps JWKS (512 KB) but not uniformly elsewhere.
- **HTTPS→HTTP redirect-downgrade refusal** (Rust `http.rs`; Go revocation re-checks per hop).
- **Duplicate top-level claim-key rejection** (Go — JWT smuggling defense).
- **NumericDate 2⁵³ overflow guards** (Go & Rust).
- **Reserved-parameter injection guards** on token requests (Go & Rust — `extra_param`s can't override `grant_type`/`client_id`/etc.).
- **Secret redaction in `Debug`/`repr`** (Rust; Python has `repr=False` + guarded responses; Go less so).
- **Cancellation-safe single-flight** (Go `context.WithoutCancel`; Rust RAII `FlightGuard`) so one caller's cancel can't poison a shared fetch.

---

## 8. Documentation discrepancy (also a planning-audit finding)

`spec/capabilities.md` — the repo's own "canonical cross-language capability matrix" — is **stale**: it marks **Python** as `planned` for Authorization Code + PKCE, Introspection, Revocation, Token Exchange, and DPoP, all of which Python **fully implements**. Its footnote still says Python "merges into `python/` at a later date," i.e. it predates the consolidation. It should be regenerated from reality. (This matrix is a good candidate to make *machine-generated* from the conformance runners rather than hand-maintained.)

---

## 9. Recommended parity backlog (prioritized)

**P0 — cheap correctness/security parity, all languages:**
- ID-token vs access-token discrimination (C7) and `at_hash`/`c_hash` (C6) in the shared validators.
- Duplicate-`kid` try-all (B5).
- Reconcile the four inversions (§5): decide whether Python *adopts* `client_secret_post`, id-token `nonce`, and the RFC 8414 issuer-match (recommended: yes to all three), and whether Go/Python adopt `azp`.

**P1 — operational parity, Go + Rust:**
- Cache-Control-derived TTL + `*_CACHE_TTL` env + clamp (H3).
- HTTP retry/backoff + `HTTP_RETRY_*` (I2).
- SSL/CA-bundle env config (I3).
- Cache metrics (H6) — and finish Python's sync-path instrumentation.
- Rust: widen algorithms to ES512/EdDSA (C2); add discovery single-flight (H5).

**P2 — extended-tier parity, Rust (largest gap):**
- Introspection, Revocation, Token Exchange, DPoP — to reach Go's level.
- `refresh_token` grant in Go + Rust.

**P3 — advanced/FAPI parity, Go + Rust** (large, likely deliberate scope): mTLS + cert-bound tokens, PAR, JAR, JARM, RFC 9207, private_key_jwt, DCR, device auth, logout, FAPI validators.

**Housekeeping:** regenerate `spec/capabilities.md` from the conformance runners; extend the shared `spec/` vectors to cover C6/C7/B5 so parity is enforced mechanically by the existing `spec-vector-coverage` gate rather than reviewed by hand.

---

*Evidence: per-item `file:line` citations were gathered in the underlying inventories (Python `py/src/py_identity_model/`, Go `go/pkg/`, Rust `rust/src/`); available on request.*
