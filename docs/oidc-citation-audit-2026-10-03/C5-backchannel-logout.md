# C5 — Back-Channel Logout citations + Logout Token `exp`

Checkout: im-audit @ 1e3b6a6. Spec text: `specs/openid-connect-backchannel-1_0.txt`. **Note:** the txt is
"Back-Channel Logout 1.0 **incorporating errata set 1**" (2023-12-15), not the plain "final 1.0" the brief names. That difference decides finding (b).

## 1. Spec reading (re-verified)

| Topic | Where it actually lives |
|---|---|
| Claim list (iss/aud/iat/**exp**/jti/events REQUIRED, sub/sid OPTIONAL, nonce PROHIBITED) | §2.4 (no numbered steps) |
| `logout_token` POST param | §2.5 |
| RP validation steps 1-11 | §2.6 |
| "reject ... return an HTTP 400" | end of §2.6 |
| "RP MUST respond with HTTP 400 Bad Request" / 200 / Cache-Control no-store | §2.8 |
| `backchannel_logout_supported`, `backchannel_logout_session_supported` | §2.1 |
| §3 | "Implementation Considerations", one paragraph, defines no metadata |

§2.6 steps that are MUSTs: 2 signature; 3 `alg` as for ID Tokens + "an alg with the value none MUST NOT be used"; 4 "Validate the iss, aud, iat, and exp Claims in the same way they are validated in ID Tokens"; 5 sub and/or sid; 6 events contains `http://schemas.openid.net/event/backchannel-logout`; 7 no nonce. Steps 8-11 are "Optionally".

§2.4: `exp` "REQUIRED. Expiration time, as specified in Section 2 of [OpenID.Core]".

### `exp` history (fetched from openid.net, cached in `scratchpad/bclhist/`)
| Version | Date | `exp` in §2.4 | §2.6 step |
|---|---|---|---|
| draft-04 | 2017-01-25 | absent | "iss, aud, and iat" |
| draft-05/06 | 2020-07/08 | absent | same |
| draft-07 | 2022-04-18 | absent | same |
| **Final 1.0** | 2022-09-12 | **absent** | "Validate the iss, aud, and iat Claims" |
| **1.0 incorporating errata set 1** | **2023-12-15** | **REQUIRED** | "iss, aud, iat, and exp" |

So `exp` became REQUIRED in errata set 1 (Dec 2023). PIM's rule ("exp optional, checked if present") was correct for the 2022 Final. It's wrong against the current published spec, and the current spec is the one this audit uses. The origin is issue #442, which says "`exp` (if present)" and cites "§2.4" with the `#Validation` anchor, which actually points to §2.6.

## 2. (b) BEHAVIOR: missing `exp` is accepted. Confirmed end to end.

Trace for `validate_logout_token` (sync `py/src/py_identity_model/sync/logout.py:54`, aio mirror):
1. `validate_token` → `core/token_validation_logic.py:192` `decode_and_validate_jwt(options=token_validation_config.options)`. The default `options` is `None` (`core/models.py:1420`).
2. `core/jwt_helpers.py:143-152` `_decode_jwt` calls PyJWT `decode(..., options=None)`. No `require` list is ever injected. `_sanitize_options` (`jwt_helpers.py:28-66`) only blocks *disabling* `verify_exp`. PyJWT's `verify_exp` only fires **when `exp` is present**, and `require` defaults to `[]`.
3. `core/logout_logic.py:57` `_REQUIRED_CLAIMS = ("iss","aud","iat","jti","events")` has no `exp`.
→ A signed token with no `exp` passes.

Empirical evidence (`uv run`, no tracked files touched):
- `uv run pytest src/tests/unit/test_logout_token_validation.py src/tests/unit/test_aio_logout_token_validation.py`: 17 passed, including `test_logout_token_without_exp_accepted` (`test_logout_token_validation.py:177-189`).
- `scratchpad/bcl_probe.py` with `perform_disco=False`, RS256: `no-exp ACCEPTED`.

Classification: **BEHAVIOR, spec MUST (§2.4 REQUIRED + §2.6 step 4)**. Per the project rule it's unconditional with no option. The test at `:178` encodes the wrong rule.

Impact:
- **Cognito**: none. Cognito isn't a back-channel-logout OP, and the change only touches `validate_logout_token`. The ID-token and access-token paths are unchanged.
- **Keycloak 26.3** (`infra/keycloak/Dockerfile:6`): `DefaultTokenManager.initLogoutToken` sets `token.exp(now+2min)` and cites errata set 1, so the live test (`py/src/tests/integration/test_backchannel_logout_live.py`) keeps passing.
- **OIDF suite**: `GenerateLogoutTokenClaims.java` always emits `exp = iat+120s`, so the 8 green BCL tests are unaffected.
- **Risk**: a pre-2023 OP that omits `exp` will now be rejected. That's intended (MUST).

## 3. Other §2.6 MUSTs: py status

| Step | py | Evidence |
|---|---|---|
| 3 alg none | Rejected. Disco path: typed `TokenValidationException` (`core/parsers.py:78,191`). Non-disco with `algorithms=["RS256"]`: typed reject. | probe |
| 3 alg none, caller sets `algorithms=["none"]`, non-disco | Rejected, but as an **untyped `NotImplementedError`** from PyJWK, which breaks the `PyIdentityModelException` contract. Edge case caused by caller misconfiguration. | probe `alg-none algs=none` |
| 4 iss/aud/iat/exp | iss/aud: PyJWT (when issuer/audience are configured). iat: presence via `_REQUIRED_CLAIMS`. **exp: presence missing** (above). | |
| 5 sub/sid | enforced `logout_logic.py:96-101` | unit tests |
| 6 events member | enforced `logout_logic.py:103-115` | unit tests |
| 7 no nonce | enforced `logout_logic.py:89-94` | unit tests |
| §2.4 "member value MUST be a JSON object" | not checked (`events: {evt: "x"}` is accepted). This is an OP-side MUST that §2.6 step 6 doesn't ask the RP to check. **Not a bug.** | probe |

## 4. Parity
- **Go: not implemented.** There's no logout token validation and no `backchannel_logout_*` discovery fields (grep over `go/` returns no hits).
- **Rust: not implemented.** Same; `rust/src/discovery/metadata.rs:52` only has `end_session_endpoint`.
- `spec/capabilities.md:40` correctly says py=implemented, go/rust=planned. There are no `spec/` vectors for logout tokens.
- So there's no divergence today. The exp fix is py-only, and the rule must be carried into the Go/Rust ports (parity epic #573).

## 5. Blast radius (all instances)

### BEHAVIOR
| file:line | issue |
|---|---|
| `py/src/py_identity_model/core/logout_logic.py:57` | `_REQUIRED_CLAIMS` lacks `exp` |
| `py/src/tests/unit/test_logout_token_validation.py:177-189` | `test_logout_token_without_exp_accepted` asserts the wrong rule; comment `:178` "§2.4: exp is not required" |
| `py/src/tests/unit/test_logout_token_validation.py:58-69` | `_valid_logout_claims` fixture has no `exp`, so every "valid" token in the suite is non-conformant |
| `py/src/tests/unit/test_aio_logout_token_validation.py` | uses the shared/own valid-claims shape; needs `exp` plus a missing-exp reject test |

### DOC-ONLY (citations / text)
| file:line | now | should be |
|---|---|---|
| `py/.../core/logout_logic.py:6-8` | BCL §2.4; "(signature, iss, aud, iat, exp)" | §2.6 (claims §2.4) |
| `py/.../core/logout_logic.py:31` | "§2.4, validation step 4" (events) | §2.6 step 6 |
| `py/.../core/logout_logic.py:35` | §2.5 for `logout_token` param | **correct**, keep |
| `py/.../core/logout_logic.py:53` | "§2.4 validation step 2" | §2.4 (REQUIRED claims) / §2.6 step 4 |
| `py/.../core/logout_logic.py:61` | §2.4 | §2.6 |
| `py/.../core/logout_logic.py:63-71` | "(when present) exp"; steps 2/4/3/5 | exp required; §2.6 steps 4/6/5/7 |
| `py/.../core/logout_logic.py:81,89,96,103` | "Step 2/5/3/4" | §2.6 steps 4/7/5/6 |
| `py/.../sync/logout.py:4-7, 29, 31` | §2.4; "exp when present" | §2.6; exp required |
| `py/.../aio/logout.py:6, 28, 31` | same | same |
| `py/.../exceptions.py:84-86` | §2.4 rules | §2.6 (claims §2.4) |
| `py/.../core/models.py:603` | BCL §3 | §2.1 |
| `py/.../core/response_processors.py:403` | BCL §3 | §2.1 |
| `py/src/tests/unit/test_logout_token_validation.py:3, :138` | §2.4 / "§2.4 step 2" | §2.6 / §2.4 |
| `py/src/tests/unit/test_aio_logout_token_validation.py:4` | §2.4 | §2.6 |
| `conformance/app.py:1698` | "§2.4/§2.5 ... responds 200 ... or 400" | §2.5 (request), §2.6 (validation), §2.8 (response) |
| `conformance/app.py:1755` | "Spec §2.5 mandates 400" | §2.8 (also end of §2.6) |
| `conformance/app.py:1772` | receiver §2.5 | **correct**, keep |
| `conformance/app.py:1782` | §2.8 cache headers | **correct**, keep |
| `docs/api/logout.md:31-34` | "(signature, iss, aud, exp)"; required list `iss/aud/iat/jti/events` | add `exp` to required list; cite §2.4/§2.6 |
| `py/CHANGELOG.md` | historical | leave |

No JSON/`§` hits: there are no logout vectors under `spec/`. No hits in node/.

## 6. Overlap
- #442 (CLOSED) is the origin of "exp (if present)". PR #450 (merged) is the implementation.
- #607, #473, #242 (OPEN) cover conformance evidence and the cert tracker. None covers exp.
- #573 (OPEN) is the cross-language parity epic. Go/Rust BCL belongs there.
- No existing issue or PR covers the exp MUST or the citation fixes.

## 7. OIDF conformance
Plan `oidcc-client-back-channel-logout-rp-basic` (`conformance/configs/backchannel-logout-rp.json`). Suite tests (gitlab `openid/client/logout/`): BackChannelLogout, AlgNone, NoEvent, WithNonce, WrongAlg, WrongAud, WrongEvent, WrongIssuer. **There is no missing-exp test**, and no missing-sub/sid or missing-jti test either. Last run 8/8 PASSED (`conformance/results/backchannel-logout-rp-latest.json`). The exp gap can only be caught by our own tests.

## 8. Stories

### S1: `fix(logout): require exp in Back-Channel Logout Tokens (BCL 1.0 errata 1 §2.4, §2.6 step 4)`. Size S.
Scope: `core/logout_logic.py` (add `"exp"` to `_REQUIRED_CLAIMS`, fix docstrings), `sync/logout.py`, `aio/logout.py`, both unit test files, `docs/api/logout.md`.
Unconditional (spec MUST), no config flag. Reuse `LogoutTokenValidationException` (consistent with the sibling rules; no new reason enum, to avoid scope creep).
AC:
- Given a correctly signed Logout Token with valid iss/aud/iat/jti/events/sub and **no `exp`**, when `validate_logout_token` (sync and async) runs, then it raises `LogoutTokenValidationException` naming `exp`.
- Given the same token with `exp` in the future, then it is accepted.
- Given `exp` in the past, then `TokenExpiredException` (unchanged).
- Given `validate_logout_token_claims` called directly with no `exp`, then it raises.
Tests: replace `test_logout_token_without_exp_accepted` with `..._without_exp_rejected` (sync and aio, the aio one is new). Add `exp` to `_valid_logout_claims` and to the aio fixture. Add a pure `test_missing_exp_rejected` next to `test_missing_jti_rejected`. Run the Keycloak live BCL integration test (`make test` integration) to show the real OP token still passes; KC 26.3 emits exp. Don't change the conformance plan (the suite always sends exp). A `fix(logout)` commit cuts a py release.
Deps: none. Land S2 in the same PR if convenient, since it touches the same docstrings.

### S2: `docs(logout): correct Back-Channel Logout section citations (§2.6 steps, §2.1 metadata, §2.8 response)`. Size S.
Scope: every DOC-ONLY row in §5 except docs/api (that one goes in S1): `logout_logic.py`, `sync|aio/logout.py`, `exceptions.py:85`, `models.py:603`, `response_processors.py:403`, test-file headers and comments, `conformance/app.py:1698,1755`.
AC: Given the repo, when you grep `Back-Channel Logout 1.0 §`, then every validation-rule cite is §2.6 (with the correct step number), claim-presence cites are §2.4, the request is §2.5, the response/400 is §2.8, and discovery metadata is §2.1. No `§3` cites remain for metadata. No behavior change; unit tests pass unchanged.
Deps: none (folding it into S1 avoids a docstring conflict).

### S3 (track only, no PR now): carry the Logout Token rules into Go and Rust ports under #573
Add a note or AC to #573: when Go/Rust implement BCL, the required set includes `exp` and must match py. Ship it with a `spec/` normative vector file (missing exp / nonce / events / sub+sid / alg none) so all three languages run the same cases. Size M when executed. Deps: S1.

### Optional follow-up (not filed unless James wants it)
`alg: none` with caller-supplied `algorithms=["none"]` on the non-disco path raises an untyped `NotImplementedError` rather than a `TokenValidationException`. The token is still rejected, so the §2.6 step 3 MUST holds. This is general token validation, not BCL-specific.
