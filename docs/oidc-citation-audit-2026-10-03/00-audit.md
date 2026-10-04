# OIDC citation audit — identity-model @ 1e3b6a6 (origin/main), 2026-10-03

Checked against: Core 1.0 (errata set 2), Discovery, Registration, RP-Initiated/Back-Channel Logout (final).
~365 OIDC citations checked across py/go/rust/spec/docs/conformance. Section numbers all exist; errors are wrong sub-section/step/strength.

## Incorrect

1. §3.1.3.7 "step 12" for auth_time/max_age -> step 13 (12 is acr). Step 13 is SHOULD; "MUST be present" comes from Core §2 (auth_time).
   go/pkg/idtoken/{doc.go:14, errors.go:27,29, idtoken.go:91,147, idtoken_integration_test.go:25,223, idtoken_test.go:177, options.go:30,123,133}
   rust/src/jwt/id_token.rs:13,157,322; rust/tests/id_token_validation.rs:55
   py/src/py_identity_model/{aio/id_token.py:61, sync/id_token.py:61, core/id_token_logic.py:16,167,209}
   py/src/tests/integration/test_id_token_validation.py:41; py/src/tests/integration/conftest.py:1024
   py/src/tests/unit/test_id_token_validation.py:207,214,222,238; spec/vectors/id-token.json:340
2. §3.1.3.7 "steps 4-6" for azp -> 4-5 (6 = TLS/signature).
   go/pkg/idtoken/{doc.go:11, idtoken.go:78,123, idtoken_test.go:128}; rust/src/jwt/id_token.rs:10,280
   py/src/py_identity_model/core/id_token_logic.py:13,182; py/src/tests/unit/test_id_token_validation.py:156 (range); spec/vectors/id-token.json:94
3. §3.1.3.7 "step 6" for azp == client_id -> step 5, and it is SHOULD not MUST (MUST wording is supportable via Core §2 azp).
   go/pkg/idtoken/{errors.go:22, options.go:88}; rust/src/jwt/id_token.rs:128; py/src/py_identity_model/core/id_token_logic.py:159
   py/src/tests/unit/test_id_token_validation.py:162,168; spec/vectors/id-token.json:213
4. "Multiple audiences MUST carry azp" (§3.1.3.7 step 4) -> not in errata-2; original 1.0 was SHOULD.
   go/pkg/idtoken/{doc.go:11, errors.go:20}; rust/src/jwt/{claims.rs:536, mod.rs:463, id_token.rs:296}; py core/id_token_logic.py:186; py tests unit/test_id_token_validation.py:150; spec/vectors/id-token.json:94
5. at_hash/c_hash "MUST match" cited to §3.3.2.11 (defines claims only) -> at_hash §3.2.2.9 item 3 (code flow: §3.1.3.8, MAY); c_hash §3.3.2.10 item 3.
   py aio/id_token.py:57,59; sync/id_token.py:57,59; core/id_token_logic.py:163,165,225,237
   py tests unit/test_id_token_validation.py:260,299,529,643; spec/vectors/id-token.json:436,438,530,532,584,586,657,659
   (also go errors.go:33-42, options.go:105,114, idtoken.go:98,109; rust id_token.rs:143,150,339,352 — same pattern)
6. c_hash test value attributed to "§3.3.2.11 worked example" -> Core Appendix A.4/A.6.
   go/pkg/idtoken/idtoken_test.go:38; rust/src/jwt/id_token.rs:677
7. UserInfo sub-match cited to Core §5.3.4 -> §5.3.2 (5.3.4 = TLS/decrypt/signature only).
   py core/models.py:1152; core/userinfo_logic.py:88; py tests unit/test_aio_userinfo.py:102, test_sync_userinfo.py:112
   conformance/app.py:1228,1260,1264; spec/capabilities.md:111 (label §5.3.4, anchor #UserInfoResponse = 5.3.2)
8. Back-Channel Logout validation steps cited to §2.4 (claim list, no steps) -> §2.6 Logout Token Validation.
   py core/logout_logic.py:31 ("§2.4 step 4" events -> §2.6 step 6), :53 ("§2.4 step 2" required claims -> §2.4 claim list), docstring :61-71 numbering
   py tests unit/test_logout_token_validation.py:3,138; test_aio_logout_token_validation.py:4
9. Back-Channel "exp is not required" (§2.4) -> §2.4 says exp REQUIRED; §2.6 step 4 validates it. BEHAVIOR BUG: _REQUIRED_CLAIMS omits exp.
   py core/logout_logic.py:53; py tests unit/test_logout_token_validation.py:178
10. backchannel_logout_supported / _session_supported cited to Back-Channel §3 (Implementation Considerations) -> §2.1.
   py core/models.py:603; core/response_processors.py:403; py tests unit/test_discovery_logout_fields.py:5
11. Back-Channel "§2.5 mandates 400" -> §2.8 (and end of §2.6). conformance/app.py:1755
12. "Discovery §3 default when omitted" for response_types_supported ["code"] / id_token_signing_alg_values_supported ["RS256"] -> Discovery §3 marks both REQUIRED, no default; defaults belong to Registration §2 client metadata (response_types, id_token_signed_response_alg).
   py core/fapi.py:171,196; py tests unit/test_fapi.py:368
13. "Core §10.1: no kid + single-key JWKS, RP MUST use that key" -> §10.1 only constrains signer ("multiple keys -> kid MUST be provided"). py core/parsers.py:230

## Debatable
- §3.3.2.11 listed as "validation" section in summaries/headers (id-token.json:3, capabilities.md:21, docs/api/id-token.md:5-6, many py/go/rust docstrings) — it's the Hybrid ID Token claims section.
- go/pkg/idtoken/doc.go:16 "authorization-code flows (§3.3.2.11)" — code-flow at_hash is §3.1.3.6 (OPTIONAL).
- "sub REQUIRED (§2 / §3.1.3.7)" — §3.1.3.7 has no sub rule.
- Basic draft-32 links (py jwt_claim_types.py:34,73) — point to final Core §5.7 / §5.1.1.
- conformance/app.py:1698 §2.4/§2.5 for validate+respond -> §2.6/§2.8.
- spec/vectors/discovery.json:48,56 caching cited to Discovery §4 (no caching text).
- docs/security/control-matrix.md:42 issuer pinning cited to Core §2 -> Discovery §4.3/§7.2.
- spec/capabilities.md:110 "MUST GET with Bearer" (§5.3.1 says RECOMMENDED); :83 token_endpoint "REQUIRED unless only Implicit".
- fastapi middleware.py:41 c_hash under "Core §2, §3.1.3.6" — c_hash only in §3.3.2.11.
