# identity-model Cross-Language Parity Report — 2026-09-05

Refresh of `identity-model-feature-parity-report-2026-08-29.md`, extended to CI gates and test harnesses per issue [identity-model#639](https://github.com/jamescrowley321/identity-model/issues/639) (task IM.P2). Verified against main @ `ba30926` (post claims-validators #623–#625, id-token stack #629–#632, Config API #605, CI parity #635/#636, docs overhaul #640, `spec/vectors/` rename #641) by three independent source-read audits. Full evidence with file:line citations in the companion appendices:

- [Feature matrix](identity-model-parity-2026-09-05-feature-matrix.md)
- [CI-gate matrix](identity-model-parity-2026-09-05-ci-gates.md)
- [Test-harness matrix](identity-model-parity-2026-09-05-test-harness.md)

## Executive summary

**Feature surface** (row-weighted over the 61-row reference surface): Python ≈98%, Go ≈58%, Rust ≈52%. The 2026-08-29 headline numbers (Go ≈45%, Rust ≈25%) were size-weighted impressions; recomputed row-wise on the old matrix they were Go ≈56% / Rust ≈48%, so the like-for-like movement since 08-29 is **Go +2pts, Rust +4pts** — claims validators + full id-token profile in both, plus introspection in Rust. Rust's remaining gap to Go is almost entirely extended-tier (revocation, token-exchange, DPoP, refresh) plus the sync API.

**Inversions**: 2 of 4 closed by the id-token stack — nonce (I-2) and azp (I-4, Py+Go) are done. **client_secret_post (I-1) and RFC 8414 issuer match (I-3) remain the only places the ports beat the reference.** Decision record below.

**CI gates**: the native languages now have lint + vuln gates (#635/#636), but Python still stands alone on mutation pressure (#638, in flight), line-coverage floors ([#643](https://github.com/jamescrowley321/identity-model/issues/643)), CodeQL, and Dependabot ecosystems ([#642](https://github.com/jamescrowley321/identity-model/issues/642)). The two HIGH items: Go/Rust mutation gates, and the id-token vectors being invisible to the mechanical coverage gate despite all three runners existing (quick win, tracked on [#608](https://github.com/jamescrowley321/identity-model/issues/608)).

**Test harnesses**: Python has 7 harness systems (~2,140 test fns) vs 3 each for Go (256) and Rust (~250). The judged-real gaps for native-library users: the security suite's vector-inexpressible behaviors (SSRF pinning, duplicate-kid, size limits — each guards per-language HTTP/cache code), the unvectorized forgery-corpus classes ([#646](https://github.com/jamescrowley321/identity-model/issues/646)), and cross-issuer rejection (cheap for Go — its CI leg already boots two issuers). Load suite and OIDF certification judged Python-specific scaffolding / deferred.

**Release automation**: scope-routed PSR works, but PSR parses squash **bodies** — rust-v0.3.1 was cut by #636's inner `fix(rust)` bullet despite the `ci:` title. Decision needed (document or disable): [#644](https://github.com/jamescrowley321/identity-model/issues/644) item 2.

## Decision record — the four inversions (§3 of the reconciliation plan)

Owner sign-off requested on D-1, D-3, D-4; D-2 is a residual with an obvious call.

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| **D-1** | Add `client_secret_post` to Python (token / introspection / revocation / token-exchange)? | **Yes — implement, S-sized, P0.** New auth-method option on the existing config surface; `client_secret_basic` stays the default, so fully backward-compatible. | Go and Rust both ship it; `spec/capabilities.md`'s own extended-tier MUSTs require it, so Python currently contradicts the spec it anchors ([#645](https://github.com/jamescrowley321/identity-model/issues/645) item 2). Dead constants for it already exist in `oidc_constants.py` / `config.py`. |
| **D-2** | Add first-class `expected_nonce` to Python's base `TokenValidationConfig`? | **Yes — S-sized, alongside D-1.** | Go/Rust expose nonce on base validation; Python covers JWT-004 only via a claims-validator adapter in the test suite. Parity of public surface, trivially additive. |
| **D-3** | Enforce RFC 8414 issuer-identifier match (`doc.issuer == requested`) in Python? | **Yes — as opt-in, default-off, flip default at next major.** | House rule: hardening in the identity libs is opt-in and backward-compatible by default. Go/Rust enforce it default-on (DISC-003); document the divergence in capabilities.md until the major bump aligns Python. |
| **D-4** | Soften Rust's always-on base-validation azp rules to opt-in (the plan's original I-4 recommendation)? | **No — keep Rust strict, document the divergence.** | Removing a shipped security check from the crate to match laxer siblings is the wrong direction; Py/Go now implement the profile-scoped variant, and no interop breakage from Rust's eagerness has been observed. Revisit only if a real-world OP break surfaces. |

If D-1..D-3 are approved they collapse into one small Python PR (auth-method + nonce field + opt-in issuer match) plus a vectors/capabilities.md follow-up; [identity-model#574](https://github.com/jamescrowley321/identity-model/issues/574) then narrows to exactly that work and closes.

## Consolidated gap backlog → tracker mapping

Every audited gap is now on the tracker. New issues opened by this audit are marked ★.

### P0 / high-leverage

| Gap | Issue | Size |
|---|---|---|
| Go/Rust mutation gates (only asymmetry that demonstrably lets an untested security regression merge) | [#638](https://github.com/jamescrowley321/identity-model/issues/638) — PR in flight; overlaps story [#612](https://github.com/jamescrowley321/identity-model/issues/612) | L |
| id-token + claims-validation vectors invisible to the coverage gate (runners exist ×3; pure gate wiring) | [#608](https://github.com/jamescrowley321/identity-model/issues/608) (updated with evidence) | S first win, L full story |
| Inversions I-1/I-3 + residuals (decision record above) | [#574](https://github.com/jamescrowley321/identity-model/issues/574) (scope narrowed) | S–M |
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
2. **On D-1..D-3 sign-off**: the single Python inversions PR; #574 closes. In parallel: #642/#643/#644 CI hygiene (S items, no decisions needed except #644-2).
3. **Next harness wave** (Epic 23 order): #613 cross-issuer + Keycloak legs, #646 corpus vectorization, #645 capabilities truth-up (after #638 merges — both touch capabilities.md).
4. **Then**: Config Go (#618) → Rust (#619), Rust extended tier (#579), operational parity (#578).
