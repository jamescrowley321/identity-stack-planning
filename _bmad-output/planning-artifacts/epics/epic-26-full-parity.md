---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '26'
epic_title: 'Complete feature parity — Python, Go and Rust implement the same capabilities with the same behavior'
date: '2026-10-28'
updated: '2026-11-15'
supersedes:
  - 'epic-20-pim-parity.md'
  - 'ralph-prompts/identity-model-go-rust-parity.md'
  - 'identity-model-parity-report-2026-09-05.md (state section)'
---

# Epic 26: Complete feature parity

Tracking issue: [identity-model#573](https://github.com/jamescrowley321/identity-model/issues/573) (reused; body to be refreshed). Go FAPI [#958](https://github.com/jamescrowley321/identity-model/issues/958) and Rust FAPI [#959](https://github.com/jamescrowley321/identity-model/issues/959) become sub-issues.

**Goal (James, 2026-10-27):** complete feature parity. Every capability row in `spec/capabilities.md` that one language implements, all three implement, with the same observable behavior, proven by shared `spec/vectors` that every language executes. Parity is enforced mechanically so it cannot silently drift again.

**Not in scope:** RAR and CIBA (no language has them; separate epics, planning PR #139). The FastAPI package (`fastapi-identity-model`) has no Go/Rust counterpart; framework middleware stays Epic 22.

**Sequencing:** starts after py **5.0.0 final** ships. 5.0 is released first as alpha pre-releases (`5.0.0aN`) cut from `release/v5` for a feedback period, then as 5.0.0 final via [#915](https://github.com/jamescrowley321/identity-model/issues/915), after which `release/v5` is deleted. The loops' gate is `origin/release/v5` being gone: that means 5.0.0 final, not the first alpha. Base `main`. Go/Rust are pre-1.0 and release independently; Python items are additive 5.x unless marked `!`.

**Python reference.** Python is the reference, and its 5.0 behaviour may still change during the alphas. The Python 5.0 rows below describe `release/v5` plus the eight spec-fix PRs open into it on 2026-11-15 ([#1121](https://github.com/jamescrowley321/identity-model/pull/1121), [#1124](https://github.com/jamescrowley321/identity-model/pull/1124), [#1126](https://github.com/jamescrowley321/identity-model/pull/1126), [#1128](https://github.com/jamescrowley321/identity-model/pull/1128), [#1129](https://github.com/jamescrowley321/identity-model/pull/1129), [#1130](https://github.com/jamescrowley321/identity-model/pull/1130), [#1132](https://github.com/jamescrowley321/identity-model/pull/1132), [#1136](https://github.com/jamescrowley321/identity-model/pull/1136)). Each story ports what 5.0.0 final ships on `main`: before starting a story, the loop diffs its Python reference against `main` and `docs/upgrade-v5.md`, and where they differ, `main` wins and the difference goes on the issue.

## Evidence

Source audit on 2026-10-28 at `4935907` (tip of the 5.0.0 stack, #976), three parallel audits (Python-behind, Go, Rust); Python cells re-checked on 2026-11-15 against `release/v5` and the eight spec-fix PRs. The 2026-09-05 parity report is stale.

### Where each language stands

| | Python | Go | Rust |
|---|---|---|---|
| Source lines (Go excl. tests; Rust incl. inline tests) | 19.1k | 6.6k | 16.4k |
| Core tier | yes (vector gaps below) | yes | yes |
| Extended: introspection, revocation, exchange | yes, untyped responses | yes, typed | yes, typed |
| Refresh, device auth, DCR | yes | **no** | **no** |
| DPoP | client + verifier (#478); nonce memory per origin and role (#1126); key import from JWK/PEM (#1110) | client + verifier; ES256/RS256 only | proof + verifier; **no HTTP transport**, runners skip all of `dpop.json` |
| Advanced: private_key_jwt, mTLS, PAR, JAR, JARM, RFC 9207, logout, FAPI validators/profile | yes | **no** | **no** |
| Config / retry / CA bundle / Cache-Control TTL / size bounds | yes | **no** (#757) | **no** (#758) |
| Discovery SSRF policy (endpoint authority, internal IP) | yes | **no** (#578) | **no** (#578) |
| Typed OAuth errors and typed responses | **no** (#791, #783, #772, #768); typed discovery/JWKS errors in 5.0 (#1129) | yes | yes |
| `client_secret_post` | yes (5.0, #1097) | yes | yes |
| Base `expected_nonce` | **no**; 5.0 makes `nonce` a required `validate_id_token` argument instead (#1132) | yes (base option) | yes (base option) |
| Typed error taxonomy | yes | yes | **partial** — ~250 `String`-payload variants; expiry/aud/iss/signature distinguishable only by message |
| Redirects | refuse all 3xx | follow | follow same-scheme (#867) |
| Retry of single-use requests | auth code, refresh and device poll never retried (5.0, #1126) | no retry at all (D3) | no retry at all (D3) |
| Public client without PKCE | refused before sending (5.0, #1126) | sent | sent |
| Token response without `access_token`/`token_type` | refused (5.0, #1126) | accepted | accepted |
| ID Token `nonce` | required argument: string, none, or `RefreshNonce` (5.0, #1132) | optional | optional |
| ID Token without `exp`/`iat` | refused (5.0, #1132) | accepted | accepted |

Confirmed on all three at the tip: #952 key-strength floor + EdDSA, #930 azp-needs-client_id, #888 `use=enc` never verifies.

### Enforcement is weaker than it looks

- The cross-language coverage gate was removed in #765 (#762). Each runner now self-checks, which leaves holes: a vector file with no `http` and no `input.operation` is silently skipped by every glob runner; Rust's skip list (`NOT_IMPLEMENTED = ["dpop"]`, citing merged #675) is hand-maintained; four KnownGaps raise unconditionally and can never flip (#868); nothing ties `capabilities.md` cells to the gap lists.
- `capabilities.md` is hand-maintained and wrong today ("Go and Rust have no known gaps" while Rust skips `dpop.json`).
- Every Advanced-tier row is `—`: no shared vectors exist for refresh, device, DCR, mTLS, private_key_jwt, PAR, JAR, JARM, RFC 9207, logout or FAPI. Python's `implemented` there rests on its own suite.
- JWT-004 (nonce) passes in Python only because the test file supplies its own validator.

### Cross-language divergences (same input, different result)

| Input | Python | Go | Rust | Issue |
|---|---|---|---|---|
| `"kid": ""` | kid-less (5.0, #1092) | kid-less | kid-less | #932 |
| `"use": ""` | signing key (5.0, #1092) | signing key | signing key | #963 |
| `client_id: ""` | unset (5.0, #1092) | unset | configured | #961 |
| `use` + `key_ops`, unknown `key_ops` | accepted (5.0, #1092) | accepted | accepted | #992 |
| Mistyped (non-list) `key_ops` | key dropped | ignored | ignored | #992, #1074 |
| Wrong-typed required discovery field | `invalid_document` (5.0, #1129) | `invalid_json` | `invalid_json` | #890 |
| Same `kid` on keys of different `kty` | first key whose `kty`/`alg`/`crv` fit (5.0, #1130) | first key | first key | #1153 |
| Cache-Control `max-age` | honoured (buggy regex, #901) | ignored, 24 h | ignored, 24 h | #757/#758 |
| UserInfo `expected_sub` | required (5.0, #1126) | optional | optional | #928, #1137 |
| UserInfo `application/jwt` | typed `UNVERIFIABLE_SUB`, JWT kept | untyped error, JWT dropped | untyped error, JWT dropped | #928 |
| HTTP on loopback | allowed | needs opt-in | needs `allow_http` | — |
| Duplicate kid | first key only | first key only | first key only | #575 |

## Shape of the work

**One story = one capability = one PR**, carrying the shared vector file plus every language that needs work, one commit per language (`feat(go)`, `feat(rust)`, `test(spec)`, …) so release routing sees each. Writing the vectors once and running them everywhere is the point; splitting by language would recreate the drift.

Each story's DoD: vector file added/extended; every runner claims it (no silent skip); KnownGaps removed for the languages it fixes; `capabilities.md` regenerated (Phase A gate); new modules added to the mutation surfaces (`GO_SURFACE`/`RUST_SURFACE`); live integration test where the fixture supports it.

## Phases and stories

### Phase A — Enforcement first (cross-language)

| # | Story | Issues |
|---|---|---|
| A1 | KnownGaps raise only while the gap exists (four unconditional adapters) | #868 |
| A2 | Every runner claims every vector: one dispatcher per language over `spec/vectors/*.json` (+ claims-validation fixtures), fails on an unclaimed vector; no `continue` paths | #762 |
| A3 | Machine-readable status: `spec/status/{py,go,rs}.json` is the only source of xfails/skips; `tools/gen_capabilities.py` renders the matrix status cells and gap notes; `--check` byte-diff in `ci-complete` | #991 |
| A4 | Rust: drop `dpop` from `NOT_IMPLEMENTED`, run the DPoP logic vectors it already passes, KnownGap the HTTP three; fix stale `spec/README.md` counts | #828 (part) |
| A5 | Go and Rust OIDF conformance harnesses (Basic, Config, Form Post), sharing `conformance/expected_modules.json`, blocking in CI. Needs E5, D8, D9 and C6, so it runs in loop 2 right after E5 | #1145 |

### Phase B — Python catches up (py; Go/Rust already pass)

The DPoP nonce cache (#784) and key import (#786) shipped in 5.0 (#1126, #1110), so the former B7 is gone.

| # | Story | Issues |
|---|---|---|
| B1 | Typed OAuth error (`error`, `error_description`, `error_uri`) | #791, #777 |
| B2 | Base `expected_nonce` (#574 §2). `client_secret_post` (§1) shipped in 5.0 via #1097 and the issuer match (§3) via #842. 5.0 puts `nonce` on `validate_id_token` only (#1132), so this needs an owner call first: add a base option to Python, or drop Go/Rust's in D9 | #574 |
| B3 | Typed token responses (auth code, exchange, client credentials, refresh, device). 5.0 already refuses a response without `access_token`/`token_type` (`INVALID_TOKEN_RESPONSE`, #1126) | #783 |
| B4 | Typed introspection members; reject missing/non-boolean `active`. Overlaps Gate B #1090 (`error_kind` on every introspection failure) | #772, #782 |
| B5 | UserInfo typed claims + `WWW-Authenticate`; injected-client test | #768, #769, #775 |
| B6 | Small: `revocation_endpoint` (#766), CC extra params (#778), Cache-Control regex (#901). The JWKS non-JSON parse error (#770) ships in 5.0 via #1129 | #766, #778, #901 |

### Phase C — Align semantics (all three)

| # | Story | Issues |
|---|---|---|
| C1 | Empty-value semantics (`kid`, `use`, `client_id`) + `key_ops` handling. Python half shipped in 5.0 (#1092); left: Rust `client_id: ""` (`!`), vectors in all three, the `capabilities.md` rule, mistyped `key_ops` | #992, #932, #961, #963 |
| C2 | Wrong-typed discovery fields classified consistently (Python 5.0: `invalid_document`, #1129) | #890 |
| C3 | Duplicate-kid try-all | #575 |
| C4 | ID-token vs access-token discrimination in the shared validators | #576 |
| C5 | Redirect policy, one rule in all three | #867 |
| C6 | Same-`kid` keys of different `kty`: pick the key whose `kty`/`alg`/`crv` fit the token `alg` (Python 5.0, #1130) | #1153, #1131 |

### Phase D — Go/Rust foundations (go + rust per story)

| # | Story | Issues |
|---|---|---|
| D1 | Rust typed error taxonomy (replace `String` payloads; tests match variants) | #993 |
| D2 | Injected Config: settings table with Python's defaults and ranges, validated build returning an error, env reads deleted and lint-banned; unit test checks `spec/config.md` | #994, #757, #758 |
| D3 | HTTP retry/backoff (429/5xx, `Retry-After`, 120 s cap) + CA bundle. Never retry authorization code, refresh or a device poll (Python 5.0, #1126); fresh DPoP proof and client assertion per attempt (#1110) | #995, #757, #758 |
| D4 | Client-owned caches (Go: remove globals), Cache-Control TTL 60–86400 clamp, 1 h fallback, `max_size`/`max_keys`, one `cache_max_entries`, trust-scope cache keys | #996, #757, #758 |
| D5 | Discovery hardening: endpoint-authority binding, internal-IP rejection, `DiscoveryPolicy`, Rust discovery single-flight, `application/json` check, full metadata model | #997, #578, #579 |
| D6 | Validation extras: signature-failure JWKS refresh sharing the cooldown, multiple issuers + `subject`, discovery-driven validate, cache metrics | #998, #578 |
| D7 | Rust Debug redaction sweep (`IdTokenValidationOptions`, `PkceChallenge`, `JsonWebKey` private members) | #999 |
| D8 | UserInfo `sub` (Python 5.0 rules): required `expected_sub`, typed missing/mismatch/unverifiable errors, unverified JWT on the error (redacted); `userinfo.json` runners match kinds; docs in all three name the signed-response API. Rust variant follows D1 | #1137, #928 |
| D9 | ID Token rules (Python 5.0, #1132): required `nonce` argument (string, none, or refresh nonce), `exp`/`iat` required, issuer required without discovery; `id-token.json` vectors. Carries the #574 §2 decision | #1151 |
| D10 | OAuth request MUSTs on the grants Go/Rust already have (Python 5.0, #1126): PKCE required for public clients (the #1133 vector), token responses must carry `access_token` and `token_type`, token-exchange `resource` absolute without fragment | #1152 |

### Phase E — Go/Rust capabilities (go + rust per story, vectors new)

| # | Story | Vector file |
|---|---|---|
| E1 | #1000 Shared client-auth abstraction + `private_key_jwt`: `aud` = the issuer as sole value, required, no endpoint fallback (RFC 10070 §4, #1121); RSA signing keys ≥ 2048 (#1124) | `client-auth.json` |
| E2 | #1001 Refresh-token grant: one attempt, never retried; refused bodies kept so a rotated refresh token survives; refresh nonce rule from D9 (#1126, #1110) | `refresh-token.json` |
| E3 | #1002 mTLS client auth, automatic `mtls_endpoint_aliases`, `cnf.x5t#S256` binding check | `mtls.json` |
| E4 | #1003 DPoP completeness: Rust HTTP transport (nonce retry, `Authorization: DPoP`); nonce memory keyed by scheme, host, port and server role, recorded from any status (#1126; Python leaves default ports unnormalised, #1133); ES384/ES512/PS256/EdDSA keys; key loading refuses unusable keys (#1110); DPoP on refresh; Bearer-downgrade error; Go `cnf.jkt` option + replay hook | `dpop.json` (closes #828) |
| E5 | #1004 Authorization URL (nonce, extras), callback parse, constant-time state, RFC 9207 `iss`; `redirect_uri` and `resource` absolute without fragment (#1126) | `authorize-callback.json` |
| E6 | #1005 PAR + front-channel URL with only `client_id` and `request_uri`; `redirect_uri` absolute without fragment (#1126) | `par.json` |
| E7 | #1006 JAR (request objects, JAR via PAR, ≤ 60 min lifetime under FAPI); no `request`/`request_uri` claims, query `client_id` matches the request object, RSA ≥ 2048 (#1124) | `jar.json` |
| E8 | #1007 JARM (signed) | `jarm.json` |
| E9 | #1008 Logout: end-session URL, post-logout state, back-channel logout token (`exp` required; `aud` checked like ID Tokens; issuer required without discovery, #1132) | `logout.json` |
| E10 | #1009 Device authorization (RFC 8628); each poll is one request, never retried (#1126) | `device-authorization.json` |
| E11 | #1010 Dynamic Client Registration (RFC 7591/7592); update drops the four server-set fields and refuses a different `client_id` (#1126) | `registration.json` |
| E12 | #1011 Rust ES512 verification | `validation.json` |
| E13 | #941 Verified signed UserInfo (py, go, rust): verify an `application/jwt` response with the issuer JWKS (`aud` = client_id, `iss` = issuer), then compare `sub`; without verification inputs D8's unverifiable error stands. FastAPI login uses it. After D6 and D8 | `userinfo.json` |

E13 is a new capability in all three languages, so it runs here, not in Gate B (#1069): shipped in Python alone it would reopen the #928 divergence. The FastAPI router change rides along because it only switches to the new call.

### Phase F — FAPI 2.0 (go + rust)

| # | Story | Issues |
|---|---|---|
| F1 | FAPI 2.0 validators (discovery with absent metadata non-compliant, client config, request); `KEY_NOT_ALLOWED` for RSA < 2048 and non-Ed25519 EdDSA keys (#1124) | #1012, #958, #959, #949 |
| F2 | Fail-closed FAPI 2.0 client profile | #1013, #958, #959, #951 |
| F3 | Ports of the late 5.0.0 Python work: signed introspection RFC 9701 (#957), PAR/JAR completeness (#955), sender-constraint completeness (#956), RS-side DPoP (#478) | #1014, #955–#957, #478 |

### Overlap with Gate B (#1069)

Gate B issues are 5.x follow-ups from the 5.0 design review. These touch the same code as parity stories; a loop builds on whichever landed first and does not redo it:

| Gate B | Parity story | Overlap |
|---|---|---|
| #1074 signing-key filter honours `key_ops` | C1 | C1's `key_ops` vectors must match this filter |
| #1072 Go/Rust resolvers return `enc` keys | C1, C6 | same Go/Rust JWKS lookup code |
| #1073 typed "no kid" error (Go/Rust) | D1, C1 | Rust variant belongs in D1's taxonomy |
| #1080 `private_key_jwt` `aud` vector | E1 | same `client-auth.json` vector; rule is now #1121's |
| #1090 introspection `error_kind` on every failure | B4 | same failure paths |
| #1070, #1071 explicit `client_id` / azp misconfiguration | C1, D9 | ID Token configuration |
| #1076, #1077 trust-scope cooldown, per-cache metrics | D4, D6 | Go/Rust port Python's final cache shape |
| #1087 mTLS aliases outside FAPI | E3 | alias resolution |
| #1083–#1086 FAPI profile follow-ups, #1088 `TokenBinding.ANY` | F2, F3 | port Python's final profile |

~45 stories. Execution: two sequential loops on the same repo (one workstream per repo): **loop 1** = Phases A–C (enforcement + Python + semantics, mostly py); **loop 2** = Phases D–F (Go/Rust). Prompts are written after the decisions below.

## Owner decisions

**Decided 2026-10-28 (James: "Do it"): all fourteen as recommended (bold).** Recorded on #573.

1. **Status files + generated matrix (A3).** Re-introduces a machine layer #765 removed. The generator only renders; runners still own coverage. **Accept.**
2. **Empty values (C1).** **Empty = absent** (Go's behavior) for `kid`, `use`, `client_id`. The Python change shipped in 5.0 (#1092); Rust `client_id` is the remaining breaking change.
3. **`key_ops` strictness (C1).** RFC 7517 §4.3 is a SHOULD NOT. **Relax Python to accept, match Go/Rust** — or keep strict everywhere if you prefer fail-closed.
4. **Redirects (C5).** **Refuse every 3xx in all three** (Python's rule, #867 as filed).
5. **Story shape.** **One capability per PR, all languages + vectors together** (above), vs per-language PRs.
6. **Go package shape.** **One package per capability** (`par`, `jar`, `jarm`, `device`, `registration`, `logout`, `fapi`, `mtls`, `internal/clientauth`), mirrored as Rust modules.
7. **Integration bar where node-oidc can't serve it** (mTLS termination, DCR, logout). **Canned HTTP vectors + capability-gated live tests (Keycloak) like Python.**
8. **Rust ES512 (E12).** jsonwebtoken can't verify P-521. **Hand-verify via aws-lc-rs** vs document as unsupported.
9. **Rust DPoP transport shape (E4).** **`dpop_key` on each client builder + a resource-request helper** vs a wrapper client like Go's `dpop.Transport`.
10. **Python-only conveniences:** `ClaimsPrincipal`/`to_principal`, Python's sync API. **n/a for Go/Rust** (record in the matrix as `n/a`).
11. **Logging.** **Go `slog` option, Rust `tracing` behind a feature**, both with Python's redaction rules — or stay log-free.
12. **Device flow polling.** **Single poll everywhere** (match Python); a polling loop is a later cross-language story. Since 5.0 the poll is also never HTTP-retried (#1126).
13. **Cache metrics API.** **Counter snapshot like Python's `get_cache_counters`**; OTel later.
14. **Base branch for loop 1.** **`main` after 5.0.0 final ships** (not an alpha); Python items land as 5.x minors.
