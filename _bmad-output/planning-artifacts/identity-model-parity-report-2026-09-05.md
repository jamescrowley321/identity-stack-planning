# identity-model Cross-Language Parity Report — 2026-09-05

Refresh of `identity-model-feature-parity-report-2026-08-29.md`, extended to CI gates and test harnesses per issue [identity-model#639](https://github.com/jamescrowley321/identity-model/issues/639). Verified against main @ `ba30926` (post claims-validators #623–#625, id-token stack #629–#632, Config API #605, CI parity #635/#636, docs overhaul #640, `spec/vectors/` rename #641) by three independent source-read audits. Full evidence with file:line citations in the companion appendices:

- [Feature matrix](identity-model-parity-2026-09-05-feature-matrix.md)
- [CI-gate matrix](identity-model-parity-2026-09-05-ci-gates.md)
- [Test-harness matrix](identity-model-parity-2026-09-05-test-harness.md)

## Executive summary

**Feature surface** (row-weighted over the 61-row reference surface): Python ≈98%, Go ≈58%, Rust ≈52%. The 2026-08-29 headline numbers (Go ≈45%, Rust ≈25%) were size-weighted impressions; recomputed row-wise on the old matrix they were Go ≈56% / Rust ≈48%, so the like-for-like movement since 08-29 is **Go +2pts, Rust +4pts** — claims validators + full id-token profile in both, plus introspection in Rust. Rust's remaining gap to Go is almost entirely extended-tier (revocation, token-exchange, DPoP, refresh) plus the sync API.

**Inversions** — the places where Go and Rust do something Python does not, despite Python being the reference: two of the four are closed by the id-token stack (id-token `nonce` validation, and `azp` for Python and Go). **`client_secret_post` and the RFC 8414 issuer-identifier match remain the only two places the ports beat the reference.** Detail below.

**CI gates**: the native languages now have lint + vuln gates (#635/#636), but Python still stands alone on mutation pressure (#638, in flight), line-coverage floors ([#643](https://github.com/jamescrowley321/identity-model/issues/643)), CodeQL, and Dependabot ecosystems ([#642](https://github.com/jamescrowley321/identity-model/issues/642)). The two HIGH items: Go/Rust mutation gates, and the id-token vectors being invisible to the mechanical coverage gate despite all three runners existing (quick win, tracked on [#608](https://github.com/jamescrowley321/identity-model/issues/608)).

**Test harnesses**: Python has 7 harness systems (~2,140 test fns) vs 3 each for Go (256) and Rust (~250). The judged-real gaps for native-library users: the security suite's vector-inexpressible behaviors (SSRF pinning, duplicate-kid, size limits — each guards per-language HTTP/cache code), the unvectorized forgery-corpus classes ([#646](https://github.com/jamescrowley321/identity-model/issues/646)), and cross-issuer rejection (cheap for Go — its CI leg already boots two issuers). Load suite and OIDF certification judged Python-specific scaffolding / deferred.

**Release automation**: scope-routed PSR works, but PSR parses squash **bodies** — rust-v0.3.1 was cut by #636's inner `fix(rust)` bullet despite the `ci:` title. Decision needed (document or disable): [#644](https://github.com/jamescrowley321/identity-model/issues/644) item 2.

## The two remaining inversions

Both are small, additive, and backward-compatible. Neither needs a decision framework — they are simply
work Python is missing.

### `client_secret_post` in Python — recommended, P0

Go and Rust both support it for token, introspection, revocation and token-exchange; Python supports only
`private_key_jwt`, mTLS and HTTP Basic. `spec/capabilities.md`'s own extended-tier MUSTs require
`client_secret_post`, so Python currently contradicts the spec it anchors (see
[#645](https://github.com/jamescrowley321/identity-model/issues/645)). The unused constants already exist in
`oidc_constants.py` and `config.py`. Adding it is a new option on the existing config surface;
`client_secret_basic` stays the default, so nothing breaks.

Worth doing alongside it: Go and Rust expose an expected-nonce field on *base* token validation, while
Python's `TokenValidationConfig` has none — Python satisfies the equivalent spec vector through a
claims-validator adapter in its test suite instead. Adding the field is a trivial public-surface parity fix.

### RFC 8414 issuer-identifier match in Python — recommended as opt-in

Go and Rust compare the discovery document's `issuer` against the requested issuer and reject a mismatch.
Python validates issuer *format* and endpoint-authority binding, but never makes that comparison. The house
rule is that hardening in the identity libraries ships opt-in and default-off, so this should land as an
opt-in check now and flip to default-on at the next major version. Until then the divergence belongs in
`capabilities.md`.

### Rust's `azp` strictness — leave it alone

Rust enforces `azp` on base validation whenever an expected audience is set; Python and Go now implement the
narrower profile-scoped form. Removing a shipped security check from the crate to match laxer siblings is the
wrong direction, and no interop breakage has been observed. Document the divergence and revisit only if a real
provider breaks.

Together the first two are one small Python pull request — auth method, nonce field, opt-in issuer match —
after which [identity-model#574](https://github.com/jamescrowley321/identity-model/issues/574) covers exactly
that and nothing else.

## Consolidated gap backlog → tracker mapping

Every audited gap is now on the tracker. New issues opened by this audit are marked ★.

### P0 / high-leverage

| Gap | Issue | Size |
|---|---|---|
| Go/Rust mutation gates (only asymmetry that demonstrably lets an untested security regression merge) | [#638](https://github.com/jamescrowley321/identity-model/issues/638) — PR in flight; overlaps story [#612](https://github.com/jamescrowley321/identity-model/issues/612) | L |
| id-token + claims-validation vectors invisible to the coverage gate (runners exist ×3; pure gate wiring) | [#608](https://github.com/jamescrowley321/identity-model/issues/608) (updated with evidence) | S first win, L full story |
| `client_secret_post` + base nonce field + opt-in RFC 8414 issuer match in Python (see above) | [#574](https://github.com/jamescrowley321/identity-model/issues/574) (scope narrowed) | S–M |
| Duplicate-kid try-all — still ❌ in all three | [#575](https://github.com/jamescrowley321/identity-model/issues/575) | S ×3 |
| ID-vs-access discrimination (C7) — ❌ ×3, currently middleware-scoped by design | [#576](https://github.com/jamescrowley321/identity-model/issues/576) — needs the scope decision, not code first | — |
| ~~at_hash/c_hash (C6)~~ | [#577](https://github.com/jamescrowley321/identity-model/issues/577) **CLOSED — delivered ×3 by the id-token stack** | done |

### CI / release hygiene (new from this audit)

| Gap | Issue | Size |
|---|---|---|
| Dependabot gomod+cargo, CodeQL Go, changes-filter blind spots (.env.* profiles), Go format gate, Rust toolchain pin, branch-protection re-baseline | ★ [#642](https://github.com/jamescrowley321/identity-model/issues/642) | S each |
| Go/Rust line-coverage floors (CONS-1.5 remainder; #549 closed unlanded) | ★ [#643](https://github.com/jamescrowley321/identity-model/issues/643) | S–M |
| Tag-push publish bypass · squash-body release triggering (owner decision) · crates.io trusted publishing | ★ [#644](https://github.com/jamescrowley321/identity-model/issues/644) | S ×3 |
| capabilities.md truth-up: stale divergence note, MUST-vs-Python contradiction, INTR python coverage | ★ [#645](https://github.com/jamescrowley321/identity-model/issues/645) | S |

### Test-harness lifts (mapped to Epic 23 where they already exist)

| Gap | Issue | Size |
|---|---|---|
| Vectorize forged-corpus classes (HS256-confusion construction, oversized, multi-aud-untrusted) → Go/Rust prove offline for free | ★ [#646](https://github.com/jamescrowley321/identity-model/issues/646) | M |
| Go cross-issuer rejection (both IdPs already up in its CI leg); Rust needs the second fixture | [#613](https://github.com/jamescrowley321/identity-model/issues/613) | S(go)/M(rust) |
| Keycloak legs for Go/Rust; nightly Ory/Descope legs (harness is TEST_*-driven, secrets exist) | [#613](https://github.com/jamescrowley321/identity-model/issues/613) | M |
| Go/Rust as resource servers in the token-blaster harness | [#611](https://github.com/jamescrowley321/identity-model/issues/611) | M–L |
| Port vector-inexpressible security behaviors (dup-kid, size limits, SSRF pinning, kid-miss cooldown) to Go/Rust package tests | [#578](https://github.com/jamescrowley321/identity-model/issues/578) + [#575](https://github.com/jamescrowley321/identity-model/issues/575) | M–L |
| Unrun OIDF profiles (dynamic/backchannel/rpinitiated-logout/fapi2 configs exist, no workflow) | [#607](https://github.com/jamescrowley321/identity-model/issues/607) | M |

### Feature build-out (existing epics, confirmed still-accurate)

Go/Rust Config API [#618](https://github.com/jamescrowley321/identity-model/issues/618)/[#619](https://github.com/jamescrowley321/identity-model/issues/619) (Core, unblocks config conformance runners) · Rust extended tier: revocation, token-exchange, DPoP, refresh, device, DCR, ES512/EdDSA [#579](https://github.com/jamescrowley321/identity-model/issues/579) · Go extended tier: refresh, device, DCR, signed UserInfo · operational parity (TTL/retry/SSL-env/metrics/SSRF) [#578](https://github.com/jamescrowley321/identity-model/issues/578) · Advanced-FAPI tier for both natives: owner-scheduled, unchanged. Explicit non-goals: porting the load suite; Go/Rust OIDF harnesses (deferred until an RP layer exists).

## Sequencing proposal

1. **Now (in flight)**: #638 mutation gates → then #608's gate-flip first win (S).
2. **The Python inversions PR** — `client_secret_post`, the base nonce field, and the opt-in issuer match, in one change; #574 closes with it. In parallel: #642/#643/#644 CI hygiene (small, and only #644's squash-body question needs a decision).
3. **Next harness wave** (Epic 23 order): #613 cross-issuer + Keycloak legs, #646 corpus vectorization, #645 capabilities truth-up (after #638 merges — both touch capabilities.md).
4. **Then**: Config Go (#618) → Rust (#619), Rust extended tier (#579), operational parity (#578).
