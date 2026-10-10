# C3-hash-binding: at_hash / c_hash citations and behavior

Checkout: im-audit @ 1e3b6a6. Spec: Core 1.0 incorporating errata set 2 (`specs/openid-connect-core-1_0.txt`), cross-checked against the 2014 final at openid.net.

## 1. Spec re-verification

| Topic | Where it actually lives (errata 2 txt line) | Text |
|---|---|---|
| at_hash claim, Code Flow | §3.1.3.6 (L1014) | "at_hash OPTIONAL. Access Token hash value…" |
| at_hash RP check, Code Flow | §3.1.3.8 (L1053) | "if the ID Token contains an at_hash Claim, the Client **MAY** use it to validate the Access Token…" |
| at_hash RP check, Implicit | §3.2.2.9 (L1246) | "the Client **SHOULD** do the following: 1. Hash… with the hash algorithm specified in JWA for the alg… 2. left-most half… 3. The value of at_hash in the ID Token **MUST match** the value produced in the previous step." |
| at_hash claim, Implicit | §3.2.2.10 | "If the ID Token is issued from the Authorization Endpoint with an access_token value (id_token token), this is **REQUIRED**" |
| at_hash RP check, Hybrid | §3.3.2.9 (L1460) | "validated in the same manner as for the Implicit Flow, as defined in Section 3.2.2.9" |
| c_hash RP check, Hybrid | §3.3.2.10 item 3 (L1470) | "The value of c_hash in the ID Token MUST match the value produced in the previous step **if c_hash is present in the ID Token**." |
| claim definitions, Hybrid authz-endpoint ID Token | §3.3.2.11 (L1484) | Defines nonce/at_hash/c_hash only. at_hash REQUIRED for `code id_token token`, else OPTIONAL. c_hash REQUIRED for `code id_token` and `code id_token token`. No RP validation rule. |
| Hybrid token-endpoint ID Token | §3.3.3.6 | "The at_hash and c_hash Claims **MAY be omitted** from the ID Token returned from the Token Endpoint…" |
| Example values | App. A.3 (L4316), A.4 (L4361), A.6 (L4428) | `access_token=jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KF0Y` → `at_hash 77QmUPtjPfzWtF2AnpK9RQ`; `code=Qcb0Orv1zh30vL1MPRsbm-diHiMwcLyZvn1arpZv-Jxf_11jnpEX3Tgfvk` → `c_hash LDktKdoQak3Pk0cnXxCltA`. Both recomputed and confirmed. |

2014 vs errata 2: the hash rules are the same. The 2014 final already says "if c_hash is present" in §3.3.2.10 item 3. Nothing in errata 2 changes this cluster.

Findings (a)-(c) confirmed:
- (a) §3.3.2.11 contains no "MUST match" rule. It only defines claims and per-response-type OP REQUIRED/OPTIONAL. The MUST-match rules are §3.2.2.9 item 3 (at_hash; reached via §3.3.2.9 for Hybrid and §3.1.3.8 for Code, where it is a MAY) and §3.3.2.10 item 3 (c_hash, if present).
- (b) `LDktKdoQak3Pk0cnXxCltA` comes from App. A.4/A.6. Core has no "§3.3.2.11 worked example". The repo's at_hash value is **not** the Core example. `jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KntU` is the A.3 token with its last 4 chars changed (`KntU` vs `KF0Y`), and `T7VF8gELfbwjUBkK04GEhg` is that string's self-computed hash. The hash is correct for its input, but no at_hash vector is anchored to an external published value. Core's real pair (`…KF0Y` → `77QmUPtjPfzWtF2AnpK9RQ`) is not used anywhere.
- (c) In the Code Flow, at_hash is OPTIONAL (§3.1.3.6) and checking it is a MAY (§3.1.3.8). c_hash plays no part in the pure Code Flow. "authorization-code flows (§3.3.2.11)" is wrong on both counts.

EdDSA: Core (both versions) defines no EdDSA mapping; `grep EdDSA` on Core finds nothing. Core says "the hash algorithm specified in JWA for the alg", and RFC 8037 EdDSA specifies none. The mapping comes from the **OpenID Connect Token Hash Algorithms 1.0** (https://openid.net/specs/openid-connect-token-hash-algorithms-1_0.html, Standards Track, published 4 September 2026). Its Table 1:
- `EdDSA`+Ed25519 key and `Ed25519` map to SHA-512.
- `EdDSA`+Ed448 key and `Ed448` map to SHAKE256 with 114-byte output.
- `ES256K` maps to SHA-256.
- ML-DSA-* maps to SHAKE256 with 64-byte output.

The guide also says implementations "MUST NOT infer EdDSA hash algorithms from the alg parameter alone" and "MUST determine the EdDSA parameter set from the key". All three languages hard-wire `EdDSA` to SHA-512 from the alg alone. For Ed448 this fails closed: a valid token is falsely rejected, which is safe but non-conformant. `Ed448`, `ES256K` and `ML-DSA-*` all fall into `unsupported_alg` (fail closed). py `core/parsers.py:27,30` already knows `ES256K`/`Ed448` key types.

## 2. Blast radius (every §-citation/rationale instance)

CHANGELOGs (`py/CHANGELOG.md`, `go/CHANGELOG.md`) are historical release notes. Leave them alone.

### spec/ (normative and shared, highest priority)
- `spec/capabilities.md:21`: "§3.1.3.7, §3.3.2.11"
- `spec/vectors/id-token.json:3`: `spec` field "§2, §3.1.3.7, §3.3.2.11"
- `spec/vectors/id-token.json:5`: notes "real OIDC §3.3.2.11 left-half construction" and "equals the value in the OIDC Core §3.3.2.11 worked example" (wrong: it is A.4/A.6)
- `spec/vectors/id-token.json:436,438` (IDT-007), `:530,532` (IDT-008), `:584,586` (IDT-009), `:657,659` (IDT-010), `:689,691` (IDT-011): "MUST equal … (§3.3.2.11)" plus `references`
- `spec/vectors/id-token.json:484-501`: vector "access token supplied but at_hash absent" → `reject at_hash_mismatch` (see BEHAVIOR B1)

### py
- `py/src/py_identity_model/core/id_token_logic.py:1,17-18` ("hybrid and authorization-code flows (§3.3.2.11)"), `:45-48`, `:59-63` (EdDSA comment, no source given), `:84`, `:132`, `:144`, `:163`, `:165`, `:225`, `:237`
- `py/src/py_identity_model/sync/id_token.py:7,25,36,57,59` ("the token's at_hash MUST match it (§3.3.2.11)")
- `py/src/py_identity_model/aio/id_token.py:7,25,36,57,59` (same)
- `py/src/py_identity_model/exceptions.py:94`
- `py/src/tests/unit/test_id_token_validation.py:5,61,252,260,274,291,299,311,319,327,335,348,511,529,625,643` (`:274` is the "MUST be present" claim, `:327` is "§3.3.2.11: the EdDSA family hashes with SHA-512", which Core does not say)
- `py/src/tests/unit/test_id_token_conformance.py:5`
- `py/src/tests/integration/test_id_token_validation.py:1`, `:14-16` and `:212-213` ("like most OPs, emits at_hash only for authorization-endpoint responses": unsupported. Keycloak, Google and Cognito hosted-UI code-flow ID Tokens carry at_hash)
- `py/packages/fastapi-identity-model/fastapi_identity_model/middleware.py:41-44`: "Claims that only ever appear in an ID token (OIDC Core 1.0 §2, §3.1.3.6)". §2 defines nothing about nonce exclusivity, §3.1.3.6 defines only at_hash, and c_hash is defined in §3.3.2.11. Nothing in Core says these "only ever appear" in an ID token. This is a heuristic, not a spec rule. The negative check at `:102` is **always-on** in the middleware. It belongs to the F-07 discriminator work; see §5.

### go
- `go/pkg/idtoken/doc.go:7`, `:15-18` ("hybrid and authorization-code flows (§3.3.2.11)")
- `go/pkg/idtoken/idtoken.go:18,98,109,162-166` (the EdDSA mapping is stated with no source)
- `go/pkg/idtoken/options.go:104-105,113-114` ("requires the token's at_hash to be present and match … (§3.3.2.11)")
- `go/pkg/idtoken/errors.go:33,36,39,42,51`
- `go/pkg/idtoken/idtoken_test.go:27` ("Real OIDC §3.3.2.11 left-half hashes"), `:38` ("matches the OIDC Core §3.3.2.11 worked example"), `:211,253,274`
- `go/pkg/idtoken/idtoken_integration_test.go:142-148,245-257` (the "OPs emit it only for authorization-endpoint responses" claim)

### rust
- `rust/src/jwt/id_token.rs:1,14-15` ("hybrid and authorization-code flows (§3.3.2.11)"), `:84,143,150,185-188,203-205,222,250,339,352,369,620,677` ("The RS256 case is the OIDC Core §3.3.2.11 worked example")
- `rust/src/error.rs:25`
- `rust/tests/id_token_validation.rs:34-39,457-487` (the "mints at_hash only for authorization-endpoint" claim)

### docs
- `docs/api/id-token.md:5-6` ("§3.1.3.7 / §3.3.2.11"), `:15-17`, `:31-32`. The comments "enforce at_hash (hybrid/implicit)" / "enforce c_hash (hybrid)" here are actually the most accurate in the repo.

No hits in `node/` or `conformance/`. `conformance/app.py` runs only the code flow and never passes `access_token`/`code` to the hash checks.

## 3. Classification

| # | Item | Class | Verdict |
|---|---|---|---|
| D1 | Every "§3.3.2.11" cited for a MUST-match rule (list above) | DOC-ONLY | Re-cite at_hash to §3.2.2.9 item 3 (via §3.3.2.9 for Hybrid; §3.1.3.8 MAY for Code) and c_hash to §3.3.2.10 item 3. Keep §3.3.2.11 only where the text is about *claim definition / OP REQUIRED-ness*. |
| D2 | "§3.3.2.11 worked example" for `LDktKdoQak3Pk0cnXxCltA` (json:5, go test:38, rust:677) | DOC-ONLY | Credit "OIDC Core 1.0 Appendix A.4/A.6". |
| D3 | "authorization-code flows (§3.3.2.11)" (py logic:17-18, go doc.go:15-16, rust id_token.rs:14-15) | DOC-ONLY | In the Code Flow, at_hash is OPTIONAL (§3.1.3.6) and checking it is a MAY (§3.1.3.8). c_hash does not apply. |
| D4 | EdDSA→SHA-512 cited as §3.3.2.11 (py test:327; mapping comments in all 3) | DOC-ONLY | Cite the OpenID Connect Token Hash Algorithms 1.0, Table 1, and state that EdDSA-with-Ed448 is a known false-reject. |
| D5 | "most OPs emit at_hash only for authorization-endpoint responses" (py/go/rust integration tests) | DOC-ONLY | Unsupported generalisation. Narrow it to "node-oidc-provider's code-flow ID Token omits at_hash". |
| D6 | middleware.py:41 citation and "only ever appear" | DOC-ONLY (citation) | Cite §3.1.3.6/§3.3.2.11 for the claim definitions and call it a heuristic. Whether the always-on negative check is acceptable is an F-07 question and stays out of this cluster. |
| B1 | `access_token` supplied, `at_hash` absent → reject (py logic:226-235, go idtoken.go:99-107, rust id_token.rs:340-350, vector json:484, py test:274, rust test:640-644) | **BEHAVIOR** | **Spec MUST** only for an authz-endpoint ID Token issued with an access token (`id_token token`, `code id_token token`: §3.2.2.10/§3.3.2.11 REQUIRED, plus §3.2.2.9 MUST match). **Beyond spec** in the Code Flow (§3.1.3.6 OPTIONAL, §3.1.3.8 MAY "if the ID Token contains an at_hash") and for the Hybrid token-endpoint ID Token (§3.3.3.6 "MAY be omitted"). The check is opt-in (only when the caller passes `access_token`), but one knob covers two different rules, verify-if-present and require-presence, and the library has no flow context to tell them apart. A Code Flow caller who passes the token-endpoint access token to "verify at_hash" gets a hard reject from any spec-compliant OP that omits it. The repo's own integration tests have to work around exactly that against node-oidc-provider. |
| B2 | `code` supplied, `c_hash` absent → reject (py:238-247, go:110-118, rust:353-363) | **BEHAVIOR** (same shape) | §3.3.2.10 item 3 is MUST match **if present**. OP-side REQUIRED for authz-endpoint `code id_token[ token]` (§3.3.2.11), may be omitted from the token-endpoint ID Token (§3.3.3.6). Rejecting absence is spec-justified only for the front-channel ID Token. No vector pins this case today. |
| B3 | unknown/absent alg → `unsupported_alg` / `alg_required` | Spec-consistent, DOC-ONLY | If at_hash/c_hash must be checked, the hash cannot be computed without a mappable alg, so failing closed is the only spec-safe outcome and needs no opt-in. Re-cite to §3.2.2.9/§3.3.2.10 item 1 plus the Token Hash Alg Guide "MUST select per Table 1". Minor side effect: the alg is resolved **before** the presence check, so under B1's new verify-if-present mode an absent at_hash plus an unknown alg would still error. Order the checks deliberately in B1. |
| B4 | EdDSA hard-wired to SHA-512 from alg alone, and `Ed448`/`ES256K`/`ML-DSA` → unsupported | BEHAVIOR, but fails closed (false reject, not bypass) | The Guide says MUST NOT infer from alg and MUST use the key. That needs key-aware dispatch, which the pure validator (`header_alg` only) cannot do. Not hardening, a conformance gap. Recommend a follow-up issue, not a story here (minimal fix). Extends open #651. |

## 4. Cross-language parity

py, go and rust behave identically on B1-B4: the same presence-required semantics, suffix-based alg dispatch, `{EdDSA, Ed25519}`→SHA-512, and alg resolved before the presence check. All three run IDT-007..011. No behavioral divergence.

One divergence in error typing, outside this cluster's fix but it affects how B1 gets built:
- Go has typed `Reason*` labels (`errors.go`).
- py raises a single `IdTokenValidationException` with no reason field. Its conformance runner maps reasons by **message substring** (`test_id_token_conformance.py:52-64`).
- Rust has `IdentityError::IdTokenValidation(String)` and also maps by substring (`rust/tests/spec_conformance_id_token.rs:104-121`).

This is the magic-string pattern the project rules prohibit. If B1 adds new reasons (`at_hash_missing`, `c_hash_missing`), py/rust would have to grow more substrings. Recommendation: B1 introduces the typed reason enum in py and rust at least for the reasons it touches, or depends on a separate typed-reason story if another cluster owns that.

Not tested: no c_hash-absent vector (B2), no EdDSA vector (py unit test only; Go uncovered per #651).

## 5. Cognito impact

- Cognito signs ID Tokens with RS256, so the SHA-256 path applies and EdDSA/Ed448 is irrelevant.
- The AWS doc's default ID-token example payload (docs.aws.amazon.com …/amazon-cognito-user-pools-using-the-id-token.html) shows **no at_hash**. In practice, ID Tokens from Cognito's `/oauth2/token` (managed login / authorization-code grant) are widely observed to carry `at_hash`. ID Tokens from the `InitiateAuth`/`RespondToAuthChallenge` API flows (SRP, USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH) are not believed to. **Unverified with a live token:** no Cognito env file or characterization output exists in the repo (`grep -ril cognito py/src/tests` returns nothing). Before shipping B1, run `test_token_characterization.py` against a Cognito env for both code-grant and InitiateAuth tokens.
- Today, a Cognito InitiateAuth caller who passes `access_token=` gets a hard `at_hash_mismatch` reject. Callers who don't pass it are unaffected, since every hash check is opt-in. B1's proposed default (verify-if-present for token-endpoint tokens) **relaxes** behavior for that caller from reject to accept-if-absent and does not tighten anything for Cognito. The middleware's always-on `at_hash`/`nonce` negative heuristic (middleware.py:102) only rejects ID tokens presented as bearer tokens. Cognito access tokens carry neither claim, so there is no change there.

## 6. Overlap with existing issues/PRs

- #577 (closed): "Add opt-in validation in all three + a spec/ vector". That is the origin of B1. It never decided between presence and match.
- #629/#630/#631/#632 (merged): introduced the code, vectors and citations.
- #651 (open): Go at_hash/c_hash alg dispatch untested (empty alg, EdDSA). Overlaps B4 and the missing EdDSA vector. Fold the EdDSA vector into Story 2 and have #651 reference it.
- #579 (open): Rust EdDSA/ES512 algorithm widening. Related to B4 only.
- #573 (open epic): parity. Story 2 is a parity-safe 3-language change.
- No existing issue covers the citation errors or the presence-vs-match semantics.

## 7. Stories

### Story 1: `docs: correct at_hash/c_hash spec citations and example provenance`
- **Scope:** every D1-D6 line in §2 (spec/capabilities.md, spec/vectors/id-token.json `spec`/`notes`/`then`/`references` strings only, py core/sync/aio/exceptions + unit/integration test comments, go doc/idtoken/options/errors + tests, rust id_token.rs/error.rs + tests, docs/api/id-token.md, middleware.py:41 comment). CHANGELOGs excluded.
- **Mapping:** at_hash MUST-match → "§3.2.2.9 (via §3.3.2.9 Hybrid; §3.1.3.8 MAY in Code Flow)". c_hash → "§3.3.2.10 item 3". Claim/OP-REQUIRED text → §3.1.3.6/§3.2.2.10/§3.3.2.11. Example → "Core App. A.4/A.6". EdDSA → "OpenID Connect Token Hash Algorithms 1.0, Table 1". Code Flow → at_hash OPTIONAL. Also fix "most OPs" in the integration tests.
- **ACs:**
  - Given the repo, when `grep -rn '3\.3\.2\.11' --exclude=CHANGELOG.md` runs (including `§3.3.2.11` in JSON), then every remaining hit refers to claim definition/OP REQUIRED-ness, never to an RP MUST-match rule.
  - Given `grep -rn 'worked example'`, there are zero hits that credit §3.3.2.11.
  - Given the JSON vectors, only rationale strings change: no `input`/`expect` diffs (`git diff` on id-token.json touches only `spec`, `notes`, `then`, `references`). Py/go/rust conformance suites pass unchanged.
- **Tests:** none new. All existing unit/conformance tests stay green.
- **Size:** S. **Depends on:** none. Land it first, so Story 2's vector edits rebase onto correct rationale text.
- Optional, in the same PR because it is data-only: add one IDT-007 accept vector using the real Core A.3 pair (`…KF0Y` → `77QmUPtjPfzWtF2AnpK9RQ`) so at_hash has an external anchor like c_hash does. This adds a vector but changes no behavior. If the doc-only purity matters more, move it to Story 2.

### Story 2: `fix(id-token): split at_hash/c_hash "verify if present" from "require presence" per flow`
(cross-language: py + `fix(go):` + `fix(rust):` commits, rebase-merge)
- **Problem:** B1/B2. Today a single opt-in input means "require + match", which is beyond spec in the Code Flow and for Hybrid token-endpoint ID Tokens.
- **Design (recommended):** with the hash input (`access_token`/`code`), the caller passes a required typed enum stating where the ID Token came from, e.g. `IdTokenSource { AuthorizationEndpoint, TokenEndpoint }` (py `enum`, go typed const, rust enum; no shim in rust).
  - `AuthorizationEndpoint`: at_hash present and matching, **unconditional** (spec MUST, §3.2.2.10/§3.3.2.11 REQUIRED plus §3.2.2.9). c_hash present and matching (§3.3.2.11 REQUIRED plus §3.3.2.10).
  - `TokenEndpoint`: verify if present, accept if absent (§3.1.3.8 / §3.3.3.6).
  - No new default-on hardening, and the spec MUSTs are not configurable once the source is declared.
  - The alternative of a `require_at_hash` bool is rejected, because it would make an implicit-flow spec MUST optional.
- **Scope:** `py/src/py_identity_model/core/id_token_logic.py`, `sync/id_token.py`, `aio/id_token.py`, `exceptions.py` (typed reason); `go/pkg/idtoken/{idtoken,options,errors}.go`; `rust/src/jwt/id_token.rs`, `rust/src/error.rs` (typed reason variant); `spec/vectors/id-token.json` (inputs gain `id_token_source`); the three conformance runners; `docs/api/id-token.md`; the integration tests drop their skip workaround (pass `TokenEndpoint` and assert absent-at_hash is accepted).
- **ACs:**
  - Given a TokenEndpoint ID Token with no at_hash and an access token, when validated, then accept (new vector).
  - Given a TokenEndpoint ID Token with a wrong at_hash, then reject `at_hash_mismatch`.
  - Given an AuthorizationEndpoint ID Token with no at_hash and an access token, then reject `at_hash_missing` (new typed reason).
  - Same three for c_hash (`c_hash_missing`). This also closes the missing c_hash-absent vector.
  - Given an absent at_hash in TokenEndpoint mode and an unmappable alg, then accept, because there is nothing to verify. The alg is resolved only once a hash claim must be checked (decide explicitly and vector it).
  - Given an EdDSA header and an at_hash that is the SHA-512 left-half, then accept (new vector; also covers #651's EdDSA gap).
  - py/rust conformance runners map reasons by typed enum, not message substring, at least for every reason in IDT-007..011.
- **Tests/vectors:** extend IDT-007/009 with source-tagged vectors and add an EdDSA case. Mutation gate: the presence branch and the source branch must each be killed by a vector.
- **Cognito gate:** before merge, run `test_token_characterization.py` against Cognito code-grant and InitiateAuth tokens and record at_hash presence in the PR. The expected change for Cognito is relax-only.
- **Size:** M (3 languages, API change, vectors, release: py minor/feat? It is a breaking signature change for go/rust callers, so treat it as `feat!`/major per release routing; rust has no users).
- **Depends on:** Story 1. Can absorb or depend on a typed-reason story if another cluster owns that.

### Follow-up issue (not a story here, minimal-fix rule)
`fix(id-token): key-aware token-hash selection per OpenID Connect Token Hash Algorithms 1.0`. EdDSA must resolve SHA-512 vs SHAKE256-114 from the verified key; add `Ed448`, `ES256K` (SHA-256) and ML-DSA (SHAKE256-64). Today all of these fail closed (false reject, no bypass). Link #651 and #579.
