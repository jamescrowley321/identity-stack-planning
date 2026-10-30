---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '26'
epic_title: 'Complete feature parity — Python, Go and Rust implement the same capabilities with the same behavior'
date: '2026-10-28'
supersedes:
  - 'epic-20-pim-parity.md'
  - 'ralph-prompts/identity-model-go-rust-parity.md'
  - 'identity-model-parity-report-2026-09-05.md (state section)'
---

# Epic 26: Complete feature parity

Tracking issue: [identity-model#573](https://github.com/jamescrowley321/identity-model/issues/573) (reused; body to be refreshed). Go FAPI [#958](https://github.com/jamescrowley321/identity-model/issues/958) and Rust FAPI [#959](https://github.com/jamescrowley321/identity-model/issues/959) become sub-issues.

**Goal (James, 2026-10-27):** complete feature parity. Every capability row in `spec/capabilities.md` that one language implements, all three implement, with the same observable behavior, proven by shared `spec/vectors` that every language executes. Parity is enforced mechanically so it cannot silently drift again.

**Not in scope:** RAR and CIBA (no language has them; separate epics, planning PR #139). The FastAPI package (`fastapi-identity-model`) has no Go/Rust counterpart; framework middleware stays Epic 22.

**Sequencing:** starts after py 5.0.0 ships (v5-fapi loop + identity-model#915). Base `main`. Go/Rust are pre-1.0 and release independently; Python items are additive 5.x unless marked `!`.

## Evidence

Source audit on 2026-10-28 at `4935907` (tip of the 5.0.0 stack, #976), three parallel audits (Python-behind, Go, Rust). Findings below are source-verified; the 2026-09-05 parity report and `spec/capabilities.md` are both stale.

### Where each language stands

| | Python | Go | Rust |
|---|---|---|---|
| Source lines (Go excl. tests; Rust incl. inline tests) | 19.1k | 6.6k | 16.4k |
| Core tier | yes (vector gaps below) | yes | yes |
| Extended: introspection, revocation, exchange | yes, untyped responses | yes, typed | yes, typed |
| Refresh, device auth, DCR | yes | **no** | **no** |
| DPoP | client only; no verifier (#478, in 5.0.0), no nonce cache, no key import | client + verifier; ES256/RS256 only | proof + verifier; **no HTTP transport**, runners skip all of `dpop.json` |
| Advanced: private_key_jwt, mTLS, PAR, JAR, JARM, RFC 9207, logout, FAPI validators/profile | yes | **no** | **no** |
| Config / retry / CA bundle / Cache-Control TTL / size bounds | yes | **no** (#757) | **no** (#758) |
| Discovery SSRF policy (endpoint authority, internal IP) | yes | **no** (#578) | **no** (#578) |
| Typed OAuth errors and typed responses | **no** (#791, #783, #772, #768) | yes | yes |
| `client_secret_post`, base `expected_nonce` | **no** (#574) | yes | yes |
| Typed error taxonomy | yes | yes | **partial** — ~250 `String`-payload variants; expiry/aud/iss/signature distinguishable only by message |
| Redirects | refuse all 3xx | follow | follow same-scheme (#867) |

Confirmed on all three at the tip: #952 key-strength floor + EdDSA, #930 azp-needs-client_id, #888 `use=enc` never verifies.

### Enforcement is weaker than it looks

- The cross-language coverage gate was removed in #765 (#762). Each runner now self-checks, which leaves holes: a vector file with no `http` and no `input.operation` is silently skipped by every glob runner; Rust's skip list (`NOT_IMPLEMENTED = ["dpop"]`, citing merged #675) is hand-maintained; four KnownGaps raise unconditionally and can never flip (#868); nothing ties `capabilities.md` cells to the gap lists.
- `capabilities.md` is hand-maintained and wrong today ("Go and Rust have no known gaps" while Rust skips `dpop.json`).
- Every Advanced-tier row is `—`: no shared vectors exist for refresh, device, DCR, mTLS, private_key_jwt, PAR, JAR, JARM, RFC 9207, logout or FAPI. Python's `implemented` there rests on its own suite.
- JWT-004 (nonce) passes in Python only because the test file supplies its own validator.

### Cross-language divergences (same input, different result)

| Input | Python | Go | Rust | Issue |
|---|---|---|---|---|
| `"kid": ""` | kid lookup | kid-less | kid-less | #932 |
| `"use": ""` | key skipped | signing key | signing key | #963 |
| `client_id: ""` | configured, trusts aud `""` | unset | configured | #961 |
| `use` + `key_ops`, unknown `key_ops` | key dropped | accepted | accepted | new |
| Wrong-typed required discovery field | `missing_fields` / passes on number | `invalid_json` | `invalid_json` | #890 |
| Cache-Control `max-age` | honoured (buggy regex, #901) | ignored, 24 h | ignored, 24 h | #757/#758 |
| UserInfo `application/jwt` | raw JWT unless `expected_sub` | error | error | #928 |
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

### Phase B — Python catches up (py; Go/Rust already pass)

| # | Story | Issues |
|---|---|---|
| B1 | Typed OAuth error (`error`, `error_description`, `error_uri`) | #791, #777 |
| B2 | `client_secret_post` on token, introspection, revocation, exchange; base `expected_nonce`; close #574 §3 (done via #842) | #574 |
| B3 | Typed token responses (auth code, exchange, client credentials, refresh, device) | #783 |
| B4 | Typed introspection members; reject missing/non-boolean `active` | #772, #782 |
| B5 | UserInfo typed claims + `WWW-Authenticate`; injected-client test | #768, #769, #775 |
| B6 | Small: `revocation_endpoint` (#766), JWKS non-JSON parse error (#770), CC extra params (#778), Cache-Control regex (#901) | #766, #770, #778, #901 |
| B7 | DPoP nonce cache + key import from JWK/PEM | #784, #786 |

### Phase C — Align semantics (all three)

| # | Story | Issues |
|---|---|---|
| C1 | Empty-value semantics (`kid`, `use`, `client_id`) + `key_ops` handling, one decision each, new vectors | #992, #932, #961, #963, new |
| C2 | Wrong-typed discovery fields classified consistently | #890 |
| C3 | Duplicate-kid try-all | #575 |
| C4 | ID-token vs access-token discrimination in the shared validators | #576 |
| C5 | Redirect policy, one rule in all three | #867 |

### Phase D — Go/Rust foundations (go + rust per story)

| # | Story | Issues |
|---|---|---|
| D1 | Rust typed error taxonomy (replace `String` payloads; tests match variants) | #993 |
| D2 | Injected Config: settings table with Python's defaults and ranges, validated build returning an error, env reads deleted and lint-banned; unit test checks `spec/config.md` | #994, #757, #758 |
| D3 | HTTP retry/backoff (429/5xx, `Retry-After`, 120 s cap) + CA bundle | #995, #757, #758 |
| D4 | Client-owned caches (Go: remove globals), Cache-Control TTL 60–86400 clamp, 1 h fallback, `max_size`/`max_keys`, one `cache_max_entries`, trust-scope cache keys | #996, #757, #758 |
| D5 | Discovery hardening: endpoint-authority binding, internal-IP rejection, `DiscoveryPolicy`, Rust discovery single-flight, `application/json` check, full metadata model | #997, #578, #579 |
| D6 | Validation extras: signature-failure JWKS refresh sharing the cooldown, multiple issuers + `subject`, discovery-driven validate, cache metrics | #998, #578 |
| D7 | Rust Debug redaction sweep (`IdTokenValidationOptions`, `PkceChallenge`, `JsonWebKey` private members) | #999 |

### Phase E — Go/Rust capabilities (go + rust per story, vectors new)

| # | Story | Vector file |
|---|---|---|
| E1 | #1000 Shared client-auth abstraction + `private_key_jwt` (`aud` = issuer when known) | `client-auth.json` |
| E2 | #1001 Refresh-token grant | `refresh-token.json` |
| E3 | #1002 mTLS client auth, automatic `mtls_endpoint_aliases`, `cnf.x5t#S256` binding check | `mtls.json` |
| E4 | #1003 DPoP completeness: Rust HTTP transport (nonce retry + per-host cache, `Authorization: DPoP`); ES384/ES512/PS256/EdDSA keys; DPoP on refresh; Bearer-downgrade error; Go `cnf.jkt` option + replay hook | `dpop.json` (closes #828) |
| E5 | #1004 Authorization URL (nonce, extras), callback parse, constant-time state, RFC 9207 `iss` | `authorize-callback.json` |
| E6 | #1005 PAR + front-channel URL with only `client_id` and `request_uri` | `par.json` |
| E7 | #1006 JAR (request objects, JAR via PAR, ≤ 60 min lifetime under FAPI) | `jar.json` |
| E8 | #1007 JARM (signed) | `jarm.json` |
| E9 | #1008 Logout: end-session URL, post-logout state, back-channel logout token (`exp` required) | `logout.json` |
| E10 | #1009 Device authorization (RFC 8628) | `device-authorization.json` |
| E11 | #1010 Dynamic Client Registration (RFC 7591/7592) | `registration.json` |
| E12 | #1011 Rust ES512 verification | `validation.json` |

### Phase F — FAPI 2.0 (go + rust)

| # | Story | Issues |
|---|---|---|
| F1 | FAPI 2.0 validators (discovery with absent metadata non-compliant, client config, request) | #1012, #958, #959, #949 |
| F2 | Fail-closed FAPI 2.0 client profile | #1013, #958, #959, #951 |
| F3 | Ports of the late 5.0.0 Python work: signed introspection RFC 9701 (#957), PAR/JAR completeness (#955), sender-constraint completeness (#956), RS-side DPoP (#478) | #1014, #955–#957, #478 |

~40 stories. Execution: two sequential loops on the same repo (one workstream per repo): **loop 1** = Phases A–C (enforcement + Python + semantics, mostly py); **loop 2** = Phases D–F (Go/Rust). Prompts are written after the decisions below.

## Owner decisions

**Decided 2026-10-28 (James: "Do it"): all fourteen as recommended (bold).** Recorded on #573.

1. **Status files + generated matrix (A3).** Re-introduces a machine layer #765 removed. The generator only renders; runners still own coverage. **Accept.**
2. **Empty values (C1).** **Empty = absent** (Go's behavior) for `kid`, `use`, `client_id`. Breaking for Python (`!`).
3. **`key_ops` strictness (C1).** RFC 7517 §4.3 is a SHOULD NOT. **Relax Python to accept, match Go/Rust** — or keep strict everywhere if you prefer fail-closed.
4. **Redirects (C5).** **Refuse every 3xx in all three** (Python's rule, #867 as filed).
5. **Story shape.** **One capability per PR, all languages + vectors together** (above), vs per-language PRs.
6. **Go package shape.** **One package per capability** (`par`, `jar`, `jarm`, `device`, `registration`, `logout`, `fapi`, `mtls`, `internal/clientauth`), mirrored as Rust modules.
7. **Integration bar where node-oidc can't serve it** (mTLS termination, DCR, logout). **Canned HTTP vectors + capability-gated live tests (Keycloak) like Python.**
8. **Rust ES512 (E12).** jsonwebtoken can't verify P-521. **Hand-verify via aws-lc-rs** vs document as unsupported.
9. **Rust DPoP transport shape (E4).** **`dpop_key` on each client builder + a resource-request helper** vs a wrapper client like Go's `dpop.Transport`.
10. **Python-only conveniences:** `ClaimsPrincipal`/`to_principal`, Python's sync API. **n/a for Go/Rust** (record in the matrix as `n/a`).
11. **Logging.** **Go `slog` option, Rust `tracing` behind a feature**, both with Python's redaction rules — or stay log-free.
12. **Device flow polling.** **Single poll everywhere** (match Python); a polling loop is a later cross-language story.
13. **Cache metrics API.** **Counter snapshot like Python's `get_cache_counters`**; OTel later.
14. **Base branch for loop 1.** **`main` after 5.0.0 ships**; Python items land as 5.x minors.
