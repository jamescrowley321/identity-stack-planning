---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0E'
epic_title: 'Conformance Specification — Hybrid RP Profile'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0b-ecosystem-research.md
  - _bmad-output/planning-artifacts/epics/epic-0c-spec-jwt-validation.md
  - _bmad-output/planning-artifacts/epics/epic-0d-spec-token-flows.md
---

# Epic 0E: Conformance Specification — Hybrid RP Profile

## Overview

This epic defines the cross-language conformance specification and test definitions for the OpenID Connect Hybrid Flow Relying Party profile. These artifacts are language-agnostic: they specify **what** each implementation must support and **how** conformance is verified, targeting OpenID Foundation Hybrid RP certification readiness.

The Hybrid Flow combines elements of the Authorization Code and Implicit flows, returning some tokens from the authorization endpoint and others from the token endpoint. This introduces unique validation requirements — notably `c_hash` and `at_hash` validation, and different ID Token validation rules depending on which endpoint issued the token.

Each story produces three deliverables:

1. A section in `spec/capabilities.md` documenting the capability with normative OIDC Core references.
2. A conformance test definition file (`spec/conformance/*.json`) with structured test cases that any language implementation can consume.
3. Test fixture files (`spec/test-fixtures/`) with sample hybrid responses and tokens for deterministic testing.

These artifacts directly drive the implementation stories in Epics 1 (Python), 2 (Node.js), 3 (Go), and 4 (Rust).

## Stories

---

### Story S.8: Hybrid RP Profile Spec + Conformance Tests

```yaml
story_id: S.8
title: "Hybrid RP Profile Spec + Conformance Tests"
epic: EPIC-0E
status: draft
priority: high
estimation: L
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, OIDC-Core-grounded specification and a complete set of conformance test definitions for the Hybrid Flow Relying Party profile,
> so that I can implement and verify hybrid flow support against a single authoritative source of truth and achieve OpenID Foundation Hybrid RP certification.

**Description**

Define the cross-language specification and conformance test definitions for the OIDC Hybrid Flow RP profile. The Hybrid Flow is unique in that it returns tokens from both the authorization endpoint (via fragment) and the token endpoint, with each endpoint imposing different ID Token validation rules. This story covers all three hybrid `response_type` combinations, the `c_hash` and `at_hash` hash validation mechanisms, and the detached signature pattern where the ID Token in the authorization response acts as a detached signature over the authorization code.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Hybrid Flow `response_type=code id_token` ([OIDC Core 1.0 §3.3.2.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthRequest)): authorization request construction with hybrid response type, `openid` scope required, `nonce` parameter REQUIRED
   - Hybrid Flow `response_type=code token` (§3.3.2.1): returns authorization code and access token from the authorization endpoint, no ID Token in authorization response
   - Hybrid Flow `response_type=code id_token token` (§3.3.2.1): returns authorization code, ID Token, and access token from the authorization endpoint
   - Fragment-based response delivery ([OIDC Core 1.0 §3.3.2.5](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthResponse)): all hybrid response parameters returned in the URI fragment, not query string
   - `c_hash` validation ([OIDC Core 1.0 §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation)): left half of the hash of the ASCII octets of the authorization `code` value, where the hash algorithm is the one used in the `alg` header of the ID Token (SHA-256 for RS256/ES256/PS256, SHA-384 for RS384/ES384/PS384, SHA-512 for RS512/ES512/PS512)
   - `at_hash` validation in hybrid context ([OIDC Core 1.0 §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation)): left half of the hash of the ASCII octets of the `access_token` value, present when `response_type=code id_token token`
   - ID Token validation from authorization endpoint ([OIDC Core 1.0 §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation)): `nonce` REQUIRED, `c_hash` REQUIRED, `at_hash` REQUIRED when access token issued alongside, `iss`, `aud`, `exp` as per standard ID Token validation
   - ID Token validation from token endpoint ([OIDC Core 1.0 §3.3.2.12](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken2Validation)): follows the same rules as the Authorization Code flow (§3.1.3.7), `nonce` must match value from authorization request, `c_hash` and `at_hash` MAY be present but are not required
   - Detached signature pattern: the ID Token returned from the authorization endpoint acts as a detached signature binding the `code` (via `c_hash`) and optionally the `access_token` (via `at_hash`) to the authenticated session, enabling the RP to verify that the code was issued in the same authentication transaction
   - Authorization code exchange ([OIDC Core 1.0 §3.3.3.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridTokenRequest)): after validating the authorization response, the RP exchanges the code at the token endpoint per the standard Authorization Code flow

2. **`spec/conformance/hybrid-rp.json`** with test cases:
   - **HYB-001**: Parse hybrid response (`code` + `id_token` from fragment) — given a URI with a fragment containing `code`, `id_token`, and `state` parameters, when the hybrid response is parsed, then the `code`, `id_token`, and `state` are correctly extracted from the fragment (not the query string) ([OIDC Core §3.3.2.5](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthResponse))
   - **HYB-002**: Validate `c_hash` matches authorization code — given an ID Token containing a `c_hash` claim and a known authorization code, when `c_hash` validation is performed, then the left half of `SHA-256(ASCII(code))` (base64url-encoded) matches the `c_hash` value in the ID Token ([OIDC Core §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation))
   - **HYB-003**: Reject `c_hash` mismatch — given an ID Token containing a `c_hash` claim that does not match the authorization code, when `c_hash` validation is performed, then the library raises a validation error indicating the code hash does not match ([OIDC Core §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation))
   - **HYB-004**: Validate `at_hash` in `code id_token token` response — given an ID Token from a `response_type=code id_token token` authorization response containing an `at_hash` claim and a known access token, when `at_hash` validation is performed, then the left half of `SHA-256(ASCII(access_token))` (base64url-encoded) matches the `at_hash` value ([OIDC Core §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation))
   - **HYB-005**: Exchange code for tokens after hybrid response — given a valid authorization code obtained from a hybrid flow authorization response, when the code is exchanged at the token endpoint with `grant_type=authorization_code`, then the token response contains `access_token`, `token_type`, `id_token`, and optionally `refresh_token` ([OIDC Core §3.3.3.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridTokenRequest), [§3.3.3.3](https://openid.net/specs/openid-connect-core-1_0.html#HybridTokenResponse))
   - **HYB-006**: Validate ID Token from token endpoint (different rules than auth endpoint) — given an ID Token received from the token endpoint in a hybrid flow, when validation is performed, then the token is validated per Authorization Code flow rules (§3.1.3.7 / §3.3.2.12): `iss` matches discovery issuer, `aud` contains `client_id`, `exp` has not passed, `nonce` matches the original request; `c_hash` and `at_hash` are NOT required (unlike the authorization endpoint ID Token) ([OIDC Core §3.3.2.12](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken2Validation))
   - **HYB-007**: Handle `response_type=code token` (no `id_token` in auth response) — given a hybrid authorization response for `response_type=code token`, when the response is parsed, then `code` and `access_token` are extracted from the fragment, no `id_token` is expected in the authorization response, and the RP must exchange the code at the token endpoint to obtain an ID Token ([OIDC Core §3.3.2.1](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthRequest), [§3.3.2.5](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthResponse))
   - **HYB-008**: Verify nonce consistency between auth and token endpoint ID Tokens — given an ID Token from the authorization endpoint and an ID Token from the token endpoint (both from the same hybrid flow), when the `nonce` claim is checked in both tokens, then both contain the same `nonce` value matching the original authorization request ([OIDC Core §3.3.2.11](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation), [§3.3.2.12](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken2Validation))

3. **`spec/test-fixtures/hybrid/`** with sample responses and tokens:
   - `hybrid-code-idtoken-fragment.txt` — raw URI fragment for `response_type=code id_token` containing `code`, `id_token`, and `state`
   - `hybrid-code-token-fragment.txt` — raw URI fragment for `response_type=code token` containing `code`, `access_token`, `token_type`, and `state`
   - `hybrid-code-idtoken-token-fragment.txt` — raw URI fragment for `response_type=code id_token token` containing all parameters
   - `c-hash-pairs.json` — array of known `code` / `c_hash` pairs for RS256, ES256, and PS256 algorithms, each independently verifiable
   - `at-hash-pairs.json` — array of known `access_token` / `at_hash` pairs for RS256, ES256, and PS256 algorithms
   - `hybrid-idtoken-auth-endpoint.json` — sample decoded ID Token from authorization endpoint with `nonce`, `c_hash`, and `at_hash` claims
   - `hybrid-idtoken-token-endpoint.json` — sample decoded ID Token from token endpoint with `nonce` but without `c_hash`/`at_hash`
   - `hybrid-token-exchange-success.json` — well-formed 200 token endpoint response with `access_token`, `id_token`, `token_type`, `expires_in`
   - `hybrid-c-hash-mismatch.json` — ID Token with a `c_hash` that does not match the accompanying authorization code

**Acceptance Criteria (Given/When/Then)**

- **AC-S.8.1** Given the `spec/capabilities.md` Hybrid RP Profile section is reviewed, when each normative statement is checked, then every statement includes an explicit OIDC Core section reference (§3.3.2.1, §3.3.2.5, §3.3.2.11, §3.3.2.12, §3.3.3.1, §3.3.3.3, and §3.1.3.7 where cross-referenced).
- **AC-S.8.2** Given the conformance test definition file `spec/conformance/hybrid-rp.json` is reviewed, when the test case list is checked, then it contains exactly eight test cases (HYB-001 through HYB-008) each with: `id`, `title`, `description`, `spec_references` (array of OIDC Core section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.8.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.8.4** Given the `c_hash` test fixtures, when the `code`/`c_hash` pairs are validated, then each pair is independently verifiable by computing `BASE64URL(left_half(SHA-256(ASCII(code))))` and comparing to the expected `c_hash`.
- **AC-S.8.5** Given the `at_hash` test fixtures, when the `access_token`/`at_hash` pairs are validated, then each pair is independently verifiable by computing `BASE64URL(left_half(SHA-256(ASCII(access_token))))` and comparing to the expected `at_hash`.
- **AC-S.8.6** Given test cases HYB-002 and HYB-006, when compared, then the ID Token validation rules applied at the authorization endpoint (HYB-002: `c_hash` REQUIRED, `at_hash` conditionally REQUIRED) differ from those at the token endpoint (HYB-006: `c_hash` and `at_hash` NOT required), reflecting §3.3.2.11 vs §3.3.2.12.
- **AC-S.8.7** Given test case HYB-007, when reviewed, then it explicitly handles the `response_type=code token` case where no ID Token is present in the authorization response and the RP must exchange the code to obtain one.
- **AC-S.8.8** Given test case HYB-008, when reviewed, then it validates that the `nonce` claim is consistent across both the authorization endpoint and token endpoint ID Tokens within the same flow.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Validate that all `c-hash-pairs.json` entries are mathematically correct: `c_hash == BASE64URL(left_half(HASH(ASCII(code))))` for the specified algorithm.
- Validate that all `at-hash-pairs.json` entries are mathematically correct: `at_hash == BASE64URL(left_half(HASH(ASCII(access_token))))` for the specified algorithm.
- Validate that fragment-based test fixtures contain only fragment parameters (no query string parameters).

**Integration Test Requirements**

- When a language implementation claims Hybrid RP conformance, run all HYB-* test cases against a mock OP that:
  - Returns hybrid authorization responses via fragment with the appropriate parameters for each `response_type`
  - Issues ID Tokens with valid `c_hash` and `at_hash` claims at the authorization endpoint
  - Issues ID Tokens without `c_hash`/`at_hash` at the token endpoint
  - Maintains nonce consistency across both endpoints
- The implementation must pass all eight tests.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete `response_type=code id_token` hybrid flow:
  1. Authorization request construction with `response_type=code id_token`, `scope=openid`, `nonce`, and `state`
  2. Authorization response fragment parsing
  3. `c_hash` validation step-by-step (hash computation, left-half extraction, base64url encoding, comparison)
  4. Code exchange at the token endpoint
  5. Token endpoint ID Token validation (noting the different rules from the authorization endpoint ID Token)
  - Annotate each step with the applicable OIDC Core section reference.

**OIDC Core References**

- [OIDC Core 1.0 §3.3 — Authentication using the Hybrid Flow](https://openid.net/specs/openid-connect-core-1_0.html#HybridFlowAuth)
- [OIDC Core 1.0 §3.3.2.1 — Authentication Request](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthRequest)
- [OIDC Core 1.0 §3.3.2.5 — Successful Authentication Response](https://openid.net/specs/openid-connect-core-1_0.html#HybridAuthResponse)
- [OIDC Core 1.0 §3.3.2.11 — ID Token Validation (Authorization Endpoint)](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDTokenValidation)
- [OIDC Core 1.0 §3.3.2.12 — ID Token Validation (Token Endpoint)](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken2Validation)
- [OIDC Core 1.0 §3.3.3.1 — Token Request](https://openid.net/specs/openid-connect-core-1_0.html#HybridTokenRequest)
- [OIDC Core 1.0 §3.3.3.3 — Successful Token Response](https://openid.net/specs/openid-connect-core-1_0.html#HybridTokenResponse)
- [OIDC Core 1.0 §3.1.3.7 — ID Token Validation (Authorization Code Flow)](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
