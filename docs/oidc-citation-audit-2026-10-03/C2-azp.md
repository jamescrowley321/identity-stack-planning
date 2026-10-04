# C2-azp — azp rules miscited, and enforced as unconditional MUSTs

**Verdict: this is a behavior bug, not just doc text.** All three languages unconditionally enforce two azp rules that errata-2 Core does not require:
- (R1) a token with more than one audience must carry azp;
- (R2) a present azp must equal client_id.

Rust also enforces both rules in **base** JWT validation for every token, access tokens included. Under the project policy (spec MUSTs are unconditional, everything else is opt-in and default-off), both rules become opt-in. Rust's base enforcement should be deleted.

Proposal: 2 stories, plus 1 follow-up issue for an adjacent §3.1.3.7 step 3 MUST gap. The follow-up should land before or with story 2.

## 1. Spec reading (`specs/openid-connect-core-1_0.txt`, Core 1.0 incorporating errata set 2)

**§3.1.3.7 steps** (`:1033-1037`)
- step 3 (MUST): "The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience, **or if it contains additional audiences not trusted by the Client**."
- step 4: "If the implementation is using extensions (which are beyond the scope of this specification) that result in the azp (authorized party) Claim being present, it SHOULD validate the azp value as specified by those extensions."
- step 5: "This validation MAY include that when an azp (authorized party) Claim is present, the Client SHOULD verify that its client_id is the Claim Value."
- step 6 is TLS/signature, not azp.

**§2 `azp`** (`:462`, wording verified):
> "OPTIONAL. Authorized party - the party to which the ID Token was issued. If present, it MUST contain the OAuth 2.0 Client ID of this party. ... in practice, the azp Claim only occurs when extensions beyond the scope of this specification are used; therefore, implementations not using such extensions are encouraged to not use azp and to ignore it when it does occur."

**1.0 (2014) vs errata 2** (confirmed by the change logs in the Basic and Implicit texts, `basic:1197` "Fixed #973 and #1009 - The azp Claim only occurs when extensions are used"):
- In 2014, step 4 was "If the ID Token contains multiple audiences, the Client SHOULD verify that an azp Claim is present."
- In 2014, step 5 was "If an azp Claim is present, the Client SHOULD verify that its client_id is the Claim Value."
- Errata 2 removed R1 entirely and reduced R2 to "MAY include ... SHOULD".
- **Neither edition ever made R1 or R2 a MUST.**

**Does §2 "If present, it MUST contain the Client ID of this party" justify unconditional R2? No.**
- "This party" refers back to "the party to which the ID Token was issued", which is the authorized party, not the validating RP.
- The MUST is an OP-side constraint on the claim's *content*: azp must be a client ID, namely the client ID of whoever the token was issued to. It says nothing about which client must receive the token.
- The RP-side comparison is defined only in step 5, and only as MAY/SHOULD.
- In the same paragraph, §2 tells non-extension RPs to *ignore* azp.

**Real counter-example: Google.** Google's docs say azp is "The client_id of the authorized presenter. This claim is only needed when the party requesting the ID token is not the same as the audience of the ID token." In the Android/iOS cross-client flow, aud is the web/backend client and azp is the mobile client. A backend validating with its own client_id (= aud) is therefore **rejected today with `azp_mismatch` in py, go and rust**.

## 2. What each language enforces today

| Rule | py | go | rust |
|---|---|---|---|
| R1 multi-aud requires azp (empty-string azp counts as absent) | `core/id_token_logic.py:185-190`, unconditional in `validate_id_token` | `pkg/idtoken/idtoken.go:136-138` (`ReasonAZPRequiredMultiAud`), unconditional | profile: `src/jwt/id_token.rs:290-297`, unconditional. **Base: `src/jwt/claims.rs:304-319`, every token whenever `expected_audience` is set** (here `azp: ""` counts as present) |
| R2 present azp == client_id | `id_token_logic.py:191-195`, when `client_id` is set (always, = `config.audience`) | `idtoken.go:141-143`, when `WithClientID` is set | profile: `id_token.rs:299-306`. **Base: `claims.rs:306-311`, every token** |
| Base `validate_token` | no azp | no azp | **enforces R1+R2** |

**Where the behavior differs:**
- `spec/capabilities.md:69-71` documents the Rust base enforcement as a "deliberate divergence ... Rust stays strict".
- Rust base also disagrees with Rust's own profile on empty-string azp:
  - base `None if len>1`: `azp:""` passes R1 and then fails R2;
  - profile: `azp:""` fails R1.
  - Both still reject, so this has no practical effect.
- py/go R1 and R2 match exactly, including null/empty handling (`idtoken.go:123-133` mirrors py's `not azp` / `is not None`).

**Rust base blast radius.** It applies to access tokens validated by a resource server with `expected_audience` set to the RS identifier:
- Auth0: access tokens carry `aud=[api, https://<tenant>/userinfo]` and `azp=<client_id>`. They fail R2 because azp ≠ the API audience.
- Keycloak: access tokens carry `azp=<requesting client>` and `aud=<resource>`. They fail R2.

That breaks every such access token. Rust has no users, so nobody is hit today.

## 3. Provider and conformance impact of making R1/R2 opt-in (default off)

**Providers**
- **AWS Cognito:** no impact either way.
  - ID token `aud` is a single string (the app client id) and carries no `azp` (AWS docs ID-token payload).
  - Access tokens carry no `aud` (they use `client_id`).
  - Python users on `validate_token` never ran the azp code.
- **node-oidc-provider** (conformance + integration fixture): `azp` is absent on ID and access tokens, and ID-token aud is a single value (`conformance/token_characterization_node-oidc.md:14-16`). No impact.
- **Descope:** no characterization on disk (no `token_characterization_descope.md`).
  - Session JWTs use the project id as `aud`, and I have not seen `azp` on them.
  - Recommend running `test_token_characterization.py --env-file=.env.descope` as part of the story to record this. Removing a default reject cannot newly break it.
- **Loosening only:** opt-in R1/R2 can only turn rejects into accepts. No provider that passes today will fail.
- **What gets fixed:** Google cross-client ID tokens with the default config.

**OIDF conformance**
- The OIDC RP plans have no azp module. I cloned the suite to `scratchpad/cs`:
  - `condition/client/ValidateIdToken.java` has the comment "azp - not currently checked";
  - azp appears only in standard-claim allowlists (`ValidateIdTokenStandardClaims.java:22`).
  - The `oidcc-client-test-*` list used by `conformance/` contains nothing about azp.
- **FAPI RP plans do care:** `fapi2-security-profile-final-client-test-invalid-secondary-aud` (and the FAPI1-adv and CIBA equivalents).
  - The test issues `aud=[client_id, client_id+"1"]` with no azp and expects rejection: "untrusted aud value ... **or that the 'azp' claim is missing**".
  - It cites step 3 (MUST) and old-1.0 step 4 (SHOULD).
  - It is PASSED in `conformance/results/fapi2-rp-latest.json:35`, but that pass comes from the **harness**, not the library: `conformance/app.py:1298-1321` `_validate_fapi2_audience`. The harness calls base `validate_token` (`app.py:1555`), not `validate_id_token`.
  - So making R1 opt-in **does not change any conformance result**.
- **Real gap exposed (step 3 MUST, not this cluster's citations):** no language rejects untrusted *additional* audiences.
  - All three check membership only: py via PyJWT intersection; go `jwt/claims.go:78` `Contains`; rust `claims.rs:282` `contains`.
  - R1 is currently the library's only partial defense against multi-aud tokens, and it is the wrong rule.
  - Removing R1 by default before step 3 is enforced slightly weakens defaults against multi-aud tokens. Hence the follow-up below, which should be sequenced before or with story 2.

## 4. Instances (file:line) and classification

**BEHAVIOR (code + tests + vectors encoding R1/R2 as unconditional MUSTs)**
- py `core/id_token_logic.py:182-195` (code + "steps 4-6" / "Step 4 ... MUST" / "Step 6 ... MUST" comments); `:158-159` docstring "MUST equal it (§3.1.3.7 step 6)"
- py tests `tests/unit/test_id_token_validation.py:149-171`; `tests/unit/test_id_token_conformance.py:58-59` (reason→substring map)
- py `tests/security/test_azp_validation.py:1-50`: F-10 strict-xfail on **base** `validate_token`, asserting "OIDC Core 3.1.3.7 says a multi-audience token's azp MUST ...". The rule is wrong and the layer is wrong. Delete it, or rewrite it as an opt-in-flag test.
- go `pkg/idtoken/idtoken.go:78-80,123-145`; `errors.go:20-23` ("step 4" / "step 6"); `options.go:86-89` ("azp MUST equal it (§3.1.3.7 step 6)"); `idtoken_test.go:128-156`
- rust profile `src/jwt/id_token.rs:280-307`, tests `:460-558`; options doc `:127`
- rust base `src/jwt/claims.rs:296-319`, tests `:536-622`; `src/jwt/mod.rs:463-491` (end-to-end multi-aud azp test)
- rust `tests/spec_conformance_id_token.rs:112-113`
- vectors `spec/vectors/id-token.json`:
  - IDT-003 `:89-205`: the `then` text at `:94` says "multiple audiences REQUIRE an azp ... (§3.1.3.7 steps 4-6)", with reject vectors at `:138-182`;
  - IDT-004 `:208-257`: `then` at `:213` says "MUST equal ... (step 6)", with a reject vector at `:238-256`;
  - IDT-001 `then` `:12`.

**DOC-ONLY**
- `spec/capabilities.md:69-74` (the "deliberate divergence, Rust stays strict" note)
- `docs/api/id-token.md:9-10` ("must carry azp" / "must equal")
- `go/pkg/idtoken/doc.go:10-11` ("MUST carry ... MUST identify ... steps 4-6")
- py `jwt_claim_types.py:113`: "This Claim is only needed when the ID Token has a single audience". This is stale pre-1.0 draft wording and states the inverse of the old rule. Replace it with the §2 text.
- py `exceptions.py:94`, `sync/id_token.py:42`, `aio/id_token.py:42`, `core/id_token_logic.py:12` ("azp rules when the token carries multiple audiences")
- rust `src/error.rs:24`, `src/jwt/id_token.rs:9,88,104,375`, `README.md:29` ("`azp` ... validated during JWT verification")
- CHANGELOGs (`go/CHANGELOG.md:55`, `rust/CHANGELOG.md:122`): historical, leave as is.

**Adjacent, not in scope:** py and rust vector runners map typed `reason` to message substrings (`test_id_token_conformance.py:58`, `spec_conformance_id_token.rs:112`), and py has no reason enum. That falls under the typed-errors rule but is a separate concern. Note it only.

## 5. Existing issues / PRs

- No open issue on azp.
- Origin: #496 (F-10 adversarial suite); #629/#630/#631/#632 (id-token profile py/vectors/rust/go, which introduced R1/R2 as MUST); #653 (capabilities "Rust stays strict" note); #654/#645 (capabilities truth-ups).
- #574/#639 (parity) do not cover azp.
- Nothing open on the step-3 untrusted-audience gap.

## 6. Stories

### Story 1 — `fix(rust): drop azp enforcement from base JWT validation` (S)
- **Scope:**
  - `rust/src/jwt/claims.rs:296-319` plus tests `:536-622`;
  - `rust/src/jwt/mod.rs:463-491`;
  - `rust/README.md:29`;
  - `spec/capabilities.md:69-71` (remove the divergence note).
- **Change:** base validation stops reading `azp`. The profile in `id_token.rs` remains the only azp path, the same as py and go.
- **AC:**
  - Given an access token `aud=["api","https://t/userinfo"], azp="spa-client"` and `expected_audience="api"`, When `validate_token` runs, Then it succeeds.
  - Given the same claims passed through `validate_id_token`, Then the result is decided only by the profile (story 2 semantics).
  - The cargo-mutants gate is green.
- **Tests:** replace the deleted tests with one base-validation test asserting the Auth0-shaped token is accepted. No vector change, because base JWT vectors carry no azp.
- **Dependencies:** none. Lands first (bottom of the stack).

### Story 2 — `fix(id-token): make azp rules opt-in per OIDC Core errata 2 §3.1.3.7 steps 4-5` (M)
- **Scope:** py `core/id_token_logic.py`, `sync|aio/id_token.py` (new kwarg); go `pkg/idtoken/{options,idtoken,errors,doc}.go`; rust `src/jwt/id_token.rs` (builder field); `spec/vectors/id-token.json` IDT-001/003/004; all three runners; `docs/api/id-token.md`; the DOC-ONLY strings in §4; py `tests/security/test_azp_validation.py`.
- **Change:**
  - Add one opt-in, default-off switch: py `validate_azp: bool = False`, go `WithAZPValidation()`, rust `.validate_azp(true)`.
  - When the switch is on, R1 and R2 are enforced exactly as today, with the same reason codes `azp_required_multi_aud` / `azp_mismatch`.
  - When it is off, azp is ignored, per the §2 "ignore it" guidance.
  - Citations become "§3.1.3.7 steps 4-5 (SHOULD); R1 is the Core 1.0 (2014) step-4 SHOULD, removed in errata set 2".
  - No MUST wording anywhere.
- **AC:**
  - Given `aud=[cid,"other"]` with no azp, When the profile runs with defaults, Then accept. With `validate_azp`, Then reject `azp_required_multi_aud`.
  - Given `aud=cid, azp="android-client"` (Google cross-client), When defaults, Then accept. With `validate_azp`, Then reject `azp_mismatch`.
  - Given `azp=cid`, Then accept in both modes.
  - py, go and rust produce identical outcomes for every IDT-003/004 vector, and the vector runners pass the flag from the vector input.
  - A Cognito-shaped ID token (single aud, no azp) is accepted in both modes. Add it as a vector.
  - The mutation gates in all three languages are green, with no waivers on the new branch.
- **Vectors:**
  - Add `"validate_azp": true` to the existing reject vectors.
  - Add default-mode accept twins for "multiple audiences, azp absent" and "azp present but does not match", and a Cognito-shaped vector.
  - Rewrite the IDT-003/004 `then` text and IDT-001 `:12`.
- **Integration:** run the py/go/rust live id-token integration tests against node-oidc. Run the token-characterization harness against Descope and record the result in the PR.
- **Dependencies:** Story 1 (otherwise Rust base still rejects in default mode, so the vector-level parity is hollow end-to-end). Ideally also the follow-up below, so the default does not lose its only multi-aud defense before step 3 lands.

### Follow-up issue (separate cluster; file, do not size here) — `fix(token-validation): reject untrusted additional audiences (§3.1.3.7 step 3 MUST)`
- Today all three languages accept `aud=[client_id, X]` for any X.
- Step 3 MUST says such a token is rejected unless the client trusts X.
- Shape: unconditional rejection, plus a caller-supplied `trusted_audiences` allowlist. That list says what is trusted; it does not switch the MUST off.
- Moves the FAPI `invalid-secondary-aud` pass from `conformance/app.py:_validate_fapi2_audience` into the library, the same pattern as the userinfo-sub feedback.
- Cognito: single aud, unaffected.
- Needs its own py+go+rust+vector story set.
