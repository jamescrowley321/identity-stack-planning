---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'CIT'
epic_title: 'OIDC Spec-Citation Correctness — fix wrong citations and the behavior they mis-specified'
date: '2026-10-03'
inputDocuments:
  - docs/oidc-citation-audit-2026-10-03/00-audit.md
  - docs/oidc-citation-audit-2026-10-03/C1-auth-time.md
  - docs/oidc-citation-audit-2026-10-03/C2-azp.md
  - docs/oidc-citation-audit-2026-10-03/C3-hash-binding.md
  - docs/oidc-citation-audit-2026-10-03/C4-userinfo.md
  - docs/oidc-citation-audit-2026-10-03/C5-backchannel-logout.md
  - docs/oidc-citation-audit-2026-10-03/C6-discovery-and-kid.md
  - docs/oidc-citation-audit-2026-10-03/C7-coverage-and-gate.md
---

# Epic CIT: OIDC Spec-Citation Correctness

Tracking issue: see `implementation-artifacts/status.md`.

## Evidence

We audited identity-model at `1e3b6a6` against the OpenID texts: Core 1.0 incorporating errata set 2, Discovery 1.0, Registration 1.0, RP-Initiated Logout 1.0, and Back-Channel Logout 1.0 incorporating errata set 1. About 365 OIDC citations were checked across `py/`, `go/`, `rust/`, `spec/`, `docs/` and `conformance/`.

Every cited section number exists. The errors are about which step or sub-section is cited, and how strong the requirement is:

| # | Citation error | Sites |
|---|---|---|
| 1 | auth_time/max_age cited as §3.1.3.7 **step 12**. Step 12 is acr; auth_time is step 13, a SHOULD. "Present when max_age was sent" comes from Core §2 / §3.1.2.1. | ~30, all three languages + IDT-006 |
| 2 | azp cited as steps **4-6**. azp is steps 4-5; step 6 is TLS/signature. | ~15 |
| 3 | azp == client_id cited as step 6 **MUST**. It is step 5 and a SHOULD. | ~10 |
| 4 | "Multiple audiences MUST carry azp". Errata 2 removed this rule; Core 1.0 only had it as a SHOULD. | ~10 |
| 5 | at_hash/c_hash "MUST match" cited to §3.3.2.11, which only defines the claims. The rules are §3.2.2.9 item 3 (at_hash) and §3.3.2.10 item 3 (c_hash). | ~60 |
| 6 | c_hash test value credited to a "§3.3.2.11 worked example". It comes from Core Appendix A.4/A.6. | 2 |
| 7 | UserInfo sub-match cited to §5.3.4. The rule is in §5.3.2. | 9 |
| 8 | Back-Channel validation steps cited to §2.4, which is a claim list. The steps are in §2.6. | ~20 |
| 9 | Back-Channel "exp not required". §2.4 says REQUIRED (since errata set 1, 2023-12-15). | 2 + behavior |
| 10 | `backchannel_logout_*` metadata cited to §3. The metadata is defined in §2.1. | 3 |
| 11 | "§2.5 mandates 400". It is §2.8. | 2 |
| 12 | "Discovery §3 default when omitted" for `response_types_supported` / `id_token_signing_alg_values_supported`. Both are REQUIRED with no default. | 5 |
| 13 | "Core §10.1: RP MUST use the single key when kid is absent". §10.1 only constrains the OP. | 3 |

Per-cluster analysis (blast radius, spec text, py/go/rust parity, provider impact) is in `docs/oidc-citation-audit-2026-10-03/`.

## What the analysis found beyond citations

Five of the miscitations encoded wrong behavior:

- **Back-Channel Logout accepts a token with no `exp` (py).** This violates a spec MUST. A probe accepted a signed token with no `exp`. `_REQUIRED_CLAIMS` omits `exp`, and a unit test asserts the wrong rule. Go and Rust have no Back-Channel Logout yet. Origin: #442 followed the 2022 Final; errata set 1 added `exp`.
- **azp is enforced unconditionally in all three languages.** Errata 2 requires neither rule (multi-aud ⇒ azp; azp == client_id). One effect: Google cross-client ID tokens (aud = backend, azp = mobile client) are rejected. Rust also applies both rules to *access tokens* in base JWT validation.
- **A real MUST is missing:** §3.1.3.7 step 3 says the client MUST reject a token whose `aud` contains audiences it does not trust. No language does this; all three only check that `client_id ∈ aud`. Today the azp rule (multi-aud ⇒ azp) is the only partial defense.
- **at_hash/c_hash presence is required whenever the caller passes the access token or code.** That is a MUST only for values issued together with the ID Token from the authorization endpoint. In the Code Flow at_hash is OPTIONAL (§3.1.3.6), and checking it is a MAY (§3.1.3.8). The integration tests skip the check because node-oidc-provider omits at_hash.
- **The py FAPI check reports `response_types_supported=None` as compliant,** based on an invented default.
- **Go and Rust pick the key for a kid-less JWT differently from py.** A single-key JWKS whose key has a kid → Go/Rust reject the token (after a forced refresh). py accepts it. The OP is compliant, so this is an interop bug.

Already filed, and absorbed by this epic: #774 (py `application/jwt` UserInfo skips the sub check), #773 (missing-sub divergence), #771 (py doesn't require all Discovery §3 fields).

## Decisions

- **D1 — relaxing azp (CIT-6) needs owner sign-off.** It loosens a default-on check. Per policy, hardening beyond the spec is opt-in. The recommendation is opt-in (`validate_azp`, default off) landing *after* CIT-5, so default mode never loses its only multi-audience defense. If the decision is to keep azp strict, CIT-6 shrinks to citation text, and the Google cross-client case stays a documented limitation.
- **D2 — `require_key_set=False` (#771 extension).** Spec MUSTs are unconditional, so the flag has to stop switching off the `jwks_uri` requirement. py has users, so this needs either a deprecation cycle or a breaking release.
- **D3 — at_hash/c_hash presence input (CIT-7).** "Where did the ID Token come from" is not quite enough. In `code id_token` the ID Token comes from the authorization endpoint while the access token comes from the token endpoint. Presence must be required only when the **value being bound was returned in the same response as the ID Token**. The API has to say that per value (access token, code), not per ID Token.
- **Citation fixes land first and alone (CIT-1).** Behavior stories then rebase onto correct rationale text, and the CI gate (CIT-9) can go green without a baseline file.

## Stories (in landing order)

| ID | Title | Size | Depends on |
|---|---|---|---|
| CIT-1 | `docs: correct OIDC spec citations across py, go, rust, spec, docs and conformance` | M | — |
| CIT-2 | `fix(logout): require exp in Back-Channel Logout Tokens` | S | — |
| CIT-3 | `fix(fapi): treat missing REQUIRED discovery metadata as a violation` | S | — |
| CIT-4 | `fix(rust): drop azp enforcement from base JWT validation` | S | — |
| CIT-5 | `fix(token-validation): reject untrusted additional audiences (Core §3.1.3.7 step 3)` | M | — |
| CIT-6 | `fix(id-token): make azp rules opt-in per Core errata 2 §3.1.3.7 steps 4-5` | M | CIT-4, CIT-5, D1 |
| CIT-7 | `fix(id-token): require at_hash/c_hash only for values issued with the ID Token` | M | CIT-1, D3 |
| CIT-8 | `fix(go,rust): select the key for a kid-less JWT the same way as Python` | M | — |
| CIT-9 | `ci(tools): gate OIDC section/step citations against a vendored spec index` | S | CIT-1 |
| #774, #773 | existing UserInfo fixes | S | — |
| #771 | existing Discovery §3 required fields, extended for `require_key_set` + empty arrays | M | #821, D2 |

Cross-language behavior stories (CIT-5, -6, -7, -8) land py + go + rust + `spec/` vectors together, with separate `fix(go)` / `fix(rust)` commits, rebase-merged.

### CIT-1 — citation sweep (doc-only)

Scope: every incorrect and fix-recommended line in `00-audit.md` and `C1`–`C7`, including the C7 "missed" lines (step comments with no § on the line, e.g. `idtoken.go:135,140`, `id_token.rs:293,302`, `logout_logic.py:81-103`, `fapi.py:149,201`). Excluded: CHANGELOGs.

- **Given** `spec/vectors/*.json`, **when** diffed, **then** only `spec`/`notes`/`then`/`references` strings change. No `input`/`expect` diffs.
- **Given** the repo, **when** grepping `step 12`, `steps 4-6`, `5\.3\.4`, `worked example`, **then** no hit points at auth_time, azp, UserInfo sub, or a §3.3.2.11 example.
- **Given** `spec/capabilities.md:111`, **then** the label reads §5.3.2 and matches `#UserInfoResponse`.
- **Given** `conformance/app.py:1264`, **when** UserInfo fails for a non-sub reason, **then** the log does not claim a sub mismatch.
- Wording rule: say what the spec requires, at the strength it requires it. Where the library is stricter, say so as library policy and do not attribute it to the spec.
- All unit, integration and conformance suites pass with no test logic changed.

### CIT-2 — Back-Channel Logout `exp` (py; spec MUST, unconditional)

- **Given** a correctly signed Logout Token with no `exp`, **when** `validate_logout_token` runs (sync and aio), **then** it is rejected with a typed error.
- `test_logout_token_without_exp_accepted` is inverted. The `_valid_logout_claims` fixtures gain `exp`.
- `docs/api/logout.md` lists `exp` as required.
- The live Keycloak test still passes (Keycloak 26.3 emits `exp`).
- Record against #573 that the Go/Rust ports must carry this rule.

### CIT-3 — FAPI discovery defaults (py)

- **Given** `response_types_supported=None`, **then** `is_compliant` is False, and the violation names the field as REQUIRED by Discovery §3.
- **Given** `id_token_signing_alg_values_supported=None`, **then** the violation text claims no RS256 default.
- `test_response_types_none_is_compliant` is renamed and its assertion flipped.

### CIT-4 — Rust base validation stops reading azp

- **Given** an access token `aud=["api", …]` with `azp="spa-client"` and expected audience `api`, **when** `validate_token` runs, **then** it succeeds.
- The divergence note at `spec/capabilities.md:69-71` is removed.
- The cargo-mutants gate is green.

### CIT-5 — untrusted additional audiences (spec MUST, unconditional)

- **Given** `aud=[client_id, X]` where X is not caller-trusted, **then** reject with a typed reason in py, go and rust.
- A caller-supplied `trusted_audiences` lists what is trusted. It cannot turn the check off.
- **Given** a single-aud token (Cognito shape), **then** behavior is unchanged.
- The FAPI `invalid-secondary-aud` pass moves from `conformance/app.py:_validate_fapi2_audience` into the library.
- New shared vectors.

### CIT-6 — azp opt-in (gated on D1)

- **Given** `aud=[cid, trusted]` with no azp, **then** accept by default. With `validate_azp`, **then** reject `azp_required_multi_aud`.
- **Given** `aud=cid, azp="android-client"`, **then** accept by default. With `validate_azp`, **then** reject `azp_mismatch`.
- `azp=cid` → accept in both modes. A Cognito-shaped vector (single aud, no azp) is accepted in both modes.
- The vector runners pass the flag from the vector input. Mutation gates are green with no waivers.
- The strict-xfail `tests/security/test_azp_validation.py` (asserts a MUST on base validation) is deleted.
- The token-characterization harness is run against Descope and the result recorded in the PR.

### CIT-7 — at_hash/c_hash presence (gated on D3)

- **Given** a token-endpoint ID Token with no at_hash, plus an access token, **then** accept (verify-if-present).
- A wrong at_hash still rejects (`at_hash_mismatch`).
- **Given** an access token issued in the same authorization response as the ID Token, **when** at_hash is absent, **then** reject with a new typed `at_hash_missing`.
- The same three cases for c_hash (`c_hash_missing`). This adds the missing c_hash-absent vector.
- An EdDSA → SHA-512 accept vector is added (the gap from #651).
- The integration tests drop their skip workaround.
- Before merge, record at_hash presence on Cognito code-grant and InitiateAuth tokens. The expected effect on Cognito is relax-only.

### CIT-8 — kid-less key selection parity (go, rust)

Shared vectors, run by py, go and rust:
- no kid, single sig key that has a kid → accept, no JWKS refresh;
- {sig, enc} → the sig key is used;
- {RSA, EC} with RS256 → the RSA key is used;
- two RSA sig keys → reject with a typed ambiguous-key error, distinct from key-not-found;
- alg none → rejected before key selection.

The py docstrings at `parsers.py:228-232,294` stop attributing an RP MUST to §10.1.

### CIT-9 — citation gate

`tools/check_oidc_citations.py`, plus a vendored section index at `spec/oidc-sections/*.tsv` (regenerated by `make oidc-section-index`; CI never fetches). It runs as a test under `make test-tools`, which is already required. It checks:
- the section exists in the named spec;
- `openid.net` anchors exist, and a link's § label matches its anchor;
- `§3.1.3.7 step N` and Back-Channel `§2.6 step N` lines carry that step's topic keyword.

A prototype found 48 real violations at `1e3b6a6` with 0 false positives. ACs: the synthetic table (≥18 cases) passes, and the whole-repo run reports 0 violations once CIT-1 has landed.

Known limit: it does not catch a wrong-topic citation to a real section (5.3.4 vs 5.3.2), or MUST/SHOULD strength. Those stay review concerns.

## Scope boundaries — deferred, not in this epic

- Typed reason enums for py/rust ID-token and UserInfo errors. The runners currently match message substrings. Tracked separately under the typed-errors rule, not here.
- Key-aware token-hash selection per **OpenID Connect Token Hash Algorithms 1.0** (2026-09-04). "For EdDSA, implementations MUST NOT infer the hash algorithm from the alg Header Parameter alone." Today EdDSA-Ed448 / `Ed448` / `ES256K` / ML-DSA fail closed (false reject, never a bypass). Link #651, #579.
- Making the UserInfo subject decision explicit (a breaking API change across all three languages). The §5.3.2 MUST is currently caller-optional; CIT-1 documents the caller's obligation.
- Signed/encrypted UserInfo verification (§5.3.4 steps 2-3). Go and Rust refuse `application/jwt`, and #774 closes the py fail-open.
- Dropping py's fallback to `use=enc` keys when no key is marked for signing. CIT-8 ports the fallback for parity.
- Go/Rust Back-Channel Logout. Belongs to #573.
