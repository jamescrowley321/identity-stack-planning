---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0C'
epic_title: 'Conformance Specification — JWT Validation & UserInfo'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0b-ecosystem-research.md
---

# Epic 0C: Conformance Specification — JWT Validation & UserInfo

## Overview

This epic defines the cross-language conformance specification and test definitions for JWT/ID Token validation and the UserInfo endpoint. These are language-agnostic artifacts — JSON test case definitions, capability specifications, and test fixtures — that all language implementations (Python, Node.js, Go, Rust) must satisfy to be considered conformant.

The deliverables from this epic feed directly into the language-specific implementation epics (Epics 1-4). Every language implementation runs these same conformance test cases against its own code, ensuring behavioral consistency across the monorepo.

## Stories

---

### Story S.3: JWT Validation Capability Spec + Conformance Tests

```yaml
story_id: S.3
title: "JWT Validation Capability Spec + Conformance Tests"
epic: EPIC-0C
status: draft
priority: high
estimated_effort: M
```

**User Story**

> As the architect defining the identity-model conformance specification,
> I want a formal capability definition and machine-readable conformance test suite for JWT and ID Token validation,
> so that every language implementation validates tokens identically and can prove conformance against a shared, authoritative test corpus.

**Description**

Define the cross-language specification and conformance test definitions for JWT/ID Token validation. This story produces three artifacts:

1. **`spec/capabilities.md` section** covering JWT validation capabilities
2. **`spec/conformance/validation.json`** with machine-readable test case definitions
3. **`spec/test-fixtures/tokens/`** with sample JWTs for use by all language test runners

**Capability Specification (`spec/capabilities.md` section)**

The JWT Validation section of the capabilities spec must define the following required behaviors:

- **JWS Signature Verification** — Validate JWS signature using the resolved key per [RFC 7515 Section 5.2](https://datatracker.ietf.org/doc/html/rfc7515#section-5.2) (Message Signature or MAC Verification).
- **Registered Claims Validation** — Validate all registered claims per [RFC 7519 Section 4.1](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1):
  - `iss` (Issuer) per [Section 4.1.1](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1)
  - `sub` (Subject) per [Section 4.1.2](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2)
  - `aud` (Audience) per [Section 4.1.3](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3) — must accept both string and array forms
  - `exp` (Expiration Time) per [Section 4.1.4](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4)
  - `nbf` (Not Before) per [Section 4.1.5](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5)
  - `iat` (Issued At) per [Section 4.1.6](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6)
  - `jti` (JWT ID) per [Section 4.1.7](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.7)
- **ID Token Validation** — Per [OIDC Core 1.0 Section 3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation):
  - `iss` matches the issuer from discovery
  - `aud` contains the `client_id`
  - `azp` is present and matches when multiple audiences exist
  - `exp` has not passed
  - `iat` is within a reasonable window
  - `nonce` matches if present in the authentication request
- **Reject `alg=none`** when a signature is expected, per [RFC 8725 Section 3.1](https://datatracker.ietf.org/doc/html/rfc8725#section-3.1) (JWT BCP).
- **Reject algorithm/key type mismatch** — e.g., an RSA key used with an EC algorithm.
- **Clock skew tolerance** — Configurable tolerance applied to `exp`, `nbf`, and `iat` checks.
- **Supported algorithms** — RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512.

**Conformance Test Cases (`spec/conformance/validation.json`)**

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| VAL-001 | Valid token with RS256 signature | Accept |
| VAL-002 | Valid token with ES256 signature | Accept |
| VAL-003 | Reject expired token | Reject: token expired |
| VAL-004 | Reject token not yet valid (nbf in future) | Reject: token not yet valid |
| VAL-005 | Reject wrong issuer | Reject: issuer mismatch |
| VAL-006 | Reject wrong audience | Reject: audience mismatch |
| VAL-007 | Reject tampered signature | Reject: signature verification failed |
| VAL-008 | Reject alg=none | Reject: algorithm none not permitted |
| VAL-009 | Accept token within clock skew tolerance | Accept |
| VAL-010 | Validate nonce matches | Accept |
| VAL-011 | Reject missing nonce when expected | Reject: nonce missing |
| VAL-012 | Accept audience as string or array | Accept |
| VAL-013 | Validate azp when multiple audiences | Accept |
| VAL-014 | Reject alg/key type mismatch | Reject: algorithm key type mismatch |

**Test Fixtures (`spec/test-fixtures/tokens/`)**

Pre-generated sample JWTs and corresponding key material:

- `valid-rs256.jwt` — Valid token signed with RS256
- `valid-es256.jwt` — Valid token signed with ES256
- `expired.jwt` — Token with `exp` in the past
- `wrong-issuer.jwt` — Token with incorrect `iss` claim
- `wrong-audience.jwt` — Token with incorrect `aud` claim
- `tampered.jwt` — Token with modified payload but original signature
- `alg-none.jwt` — Token with `alg=none` and no signature
- `keys/` — RSA and EC key pairs (PEM + JWK format) used to sign the fixtures

**Acceptance Criteria**

- **AC-S.3.1** Given the `spec/capabilities.md` JWT Validation section is reviewed, when checked against this story, then it specifies all behaviors listed above with normative RFC/OIDC section references for each.
  - _Given_ the capability spec exists, _When_ a reviewer checks for JWS signature verification, _Then_ it references [RFC 7515 Section 5.2](https://datatracker.ietf.org/doc/html/rfc7515#section-5.2) and describes the verification procedure.
  - _Given_ the capability spec exists, _When_ a reviewer checks for registered claims, _Then_ every claim from [RFC 7519 Section 4.1](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1) is listed with its subsection reference and validation rule.
  - _Given_ the capability spec exists, _When_ a reviewer checks for ID Token validation, _Then_ all checks from [OIDC Core 1.0 Section 3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation) are enumerated.

- **AC-S.3.2** Given the `spec/conformance/validation.json` file is reviewed, when parsed, then it contains all 14 test cases (VAL-001 through VAL-014) with fields: `test_id`, `description`, `input` (token reference + validation parameters), `expected_result` (accept/reject + error category), and `rfc_reference`.
  - _Given_ the conformance file is loaded, _When_ a test runner reads it, _Then_ each test case is self-contained with enough information to execute without ambiguity.
  - _Given_ a test case specifies "reject", _When_ it is reviewed, _Then_ it includes the expected error category (e.g., `signature_invalid`, `token_expired`, `issuer_mismatch`).

- **AC-S.3.3** Given the `spec/test-fixtures/tokens/` directory is reviewed, when inventoried, then it contains all listed JWT files and a `keys/` subdirectory with the corresponding signing keys in both PEM and JWK format.
  - _Given_ the fixture tokens exist, _When_ a valid token fixture is decoded and verified against the fixture keys, _Then_ signature verification succeeds.
  - _Given_ the tampered token fixture exists, _When_ it is decoded and verified against the fixture keys, _Then_ signature verification fails.

- **AC-S.3.4** Given any language implementation, when it runs its conformance test suite against `spec/conformance/validation.json` using `spec/test-fixtures/tokens/`, then all 14 test cases produce the expected result.

**Unit Test Requirements**

Each language implementation must include unit tests that:
- Load each test case from `spec/conformance/validation.json`
- Load the corresponding token from `spec/test-fixtures/tokens/`
- Execute the validation logic with the specified parameters
- Assert the expected result (accept or reject with correct error category)

**Integration Test Requirements**

Each language implementation must include integration tests that:
- Validate a token obtained from a live OIDC provider (e.g., node-oidc-provider in CI)
- Verify that clock skew tolerance works against a real token endpoint
- Confirm ID Token validation passes end-to-end after a real Authorization Code flow

**Example Requirements**

Each language implementation must include a runnable example demonstrating:
- How to validate an ID Token received from an OIDC provider
- How to configure clock skew tolerance
- How to handle and display validation errors to the caller

**Normative References**

- [RFC 7515 — JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515) — Section 5.2: Message Signature or MAC Verification
- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519) — Section 4.1: Registered Claim Names
- [RFC 8725 — JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) — Section 3.1: Use and Validate the Algorithm
- [OpenID Connect Core 1.0 — Section 3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation) — ID Token Validation

---

### Story S.4: UserInfo Capability Spec + Conformance Tests

```yaml
story_id: S.4
title: "UserInfo Capability Spec + Conformance Tests"
epic: EPIC-0C
status: draft
priority: high
estimated_effort: S
```

**User Story**

> As the architect defining the identity-model conformance specification,
> I want a formal capability definition and machine-readable conformance test suite for the UserInfo endpoint,
> so that every language implementation fetches and validates UserInfo responses identically and can prove conformance against shared test definitions.

**Description**

Define the cross-language specification and conformance test definitions for the OIDC UserInfo endpoint. This story produces three artifacts:

1. **`spec/capabilities.md` section** covering UserInfo capabilities
2. **`spec/conformance/userinfo.json`** with machine-readable test case definitions
3. **`spec/test-fixtures/userinfo/`** with sample UserInfo responses

**Capability Specification (`spec/capabilities.md` section)**

The UserInfo section of the capabilities spec must define the following required behaviors:

- **Fetch UserInfo with Bearer Token** — Send a request to the UserInfo endpoint with the access token as a Bearer token per [OIDC Core 1.0 Section 5.3.1](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoRequest) (UserInfo Request).
- **Parse UserInfo Response** — Parse the successful response as a JSON object containing standard claims per [OIDC Core 1.0 Section 5.3.2](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse) (Successful UserInfo Response).
- **Standard Claims** — Support all standard claims defined in [OIDC Core 1.0 Section 5.1](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims):
  - `sub` (Subject — REQUIRED)
  - `name`, `given_name`, `family_name`, `middle_name`, `nickname`, `preferred_username`
  - `profile`, `picture`, `website`
  - `email`, `email_verified`
  - `gender`, `birthdate`, `zoneinfo`, `locale`
  - `phone_number`, `phone_number_verified`
  - `address` (structured claim)
  - `updated_at`
- **Validate `sub` Match** — The `sub` claim in the UserInfo response MUST match the `sub` claim in the ID Token per [OIDC Core 1.0 Section 5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponseValidation) (UserInfo Response Validation). Reject the response if they differ.
- **Handle Error Responses** — Handle error responses per [OIDC Core 1.0 Section 5.3.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoError) (UserInfo Error Response), including:
  - `401 Unauthorized` — invalid or expired access token
  - `403 Forbidden` — insufficient scope for requested claims

**Conformance Test Cases (`spec/conformance/userinfo.json`)**

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| UI-001 | Fetch UserInfo with valid bearer token | Success: returns JSON with standard claims |
| UI-002 | Parse standard claims from response | Success: all present standard claims are parsed correctly |
| UI-003 | Validate sub matches ID token sub | Success: sub values match |
| UI-004 | Reject sub mismatch between UserInfo and ID token | Reject: subject mismatch |
| UI-005 | Handle 401 unauthorized response | Error: unauthorized (invalid token) |
| UI-006 | Handle 403 forbidden response (insufficient scope) | Error: forbidden (insufficient scope) |

**Test Fixtures (`spec/test-fixtures/userinfo/`)**

Pre-built sample responses:

- `valid-response.json` — Successful UserInfo response with standard claims (`sub`, `name`, `email`, `email_verified`, etc.)
- `full-claims-response.json` — Response with all standard claims populated (Section 5.1 completeness check)
- `sub-mismatch-response.json` — Response where `sub` differs from the associated ID Token's `sub`
- `error-401.json` — Simulated 401 Unauthorized error response body
- `error-403.json` — Simulated 403 Forbidden error response body

**Acceptance Criteria**

- **AC-S.4.1** Given the `spec/capabilities.md` UserInfo section is reviewed, when checked against this story, then it specifies all behaviors listed above with normative OIDC section references for each.
  - _Given_ the capability spec exists, _When_ a reviewer checks for the UserInfo request behavior, _Then_ it references [OIDC Core 1.0 Section 5.3.1](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoRequest) and describes Bearer token usage.
  - _Given_ the capability spec exists, _When_ a reviewer checks for standard claims, _Then_ every claim from [OIDC Core 1.0 Section 5.1](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) is listed.
  - _Given_ the capability spec exists, _When_ a reviewer checks for sub validation, _Then_ it references [OIDC Core 1.0 Section 5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponseValidation) and states that mismatched `sub` values must result in rejection.

- **AC-S.4.2** Given the `spec/conformance/userinfo.json` file is reviewed, when parsed, then it contains all 6 test cases (UI-001 through UI-006) with fields: `test_id`, `description`, `input` (request parameters + fixture references), `expected_result` (success/error + details), and `oidc_reference`.
  - _Given_ the conformance file is loaded, _When_ a test runner reads it, _Then_ each test case is self-contained with enough information to execute without ambiguity.
  - _Given_ a test case specifies an error, _When_ it is reviewed, _Then_ it includes the expected HTTP status code and error category.

- **AC-S.4.3** Given the `spec/test-fixtures/userinfo/` directory is reviewed, when inventoried, then it contains all listed response fixture files.
  - _Given_ the valid response fixture exists, _When_ it is parsed as JSON, _Then_ it contains at minimum `sub`, `name`, `email`, and `email_verified` claims.
  - _Given_ the full claims response fixture exists, _When_ it is parsed, _Then_ it contains every standard claim from OIDC Core 1.0 Section 5.1.

- **AC-S.4.4** Given any language implementation, when it runs its conformance test suite against `spec/conformance/userinfo.json` using `spec/test-fixtures/userinfo/`, then all 6 test cases produce the expected result.

**Unit Test Requirements**

Each language implementation must include unit tests that:
- Load each test case from `spec/conformance/userinfo.json`
- Load the corresponding fixture from `spec/test-fixtures/userinfo/`
- Mock the HTTP layer to return the fixture response
- Assert the expected result (success with parsed claims, or error with correct category)

**Integration Test Requirements**

Each language implementation must include integration tests that:
- Fetch UserInfo from a live OIDC provider (e.g., node-oidc-provider in CI) using a valid access token
- Validate that the `sub` in the UserInfo response matches the `sub` in the corresponding ID Token
- Confirm that an expired or revoked access token returns a 401 error

**Example Requirements**

Each language implementation must include a runnable example demonstrating:
- How to fetch UserInfo after obtaining an access token
- How to access standard claims from the parsed response
- How to handle error responses gracefully

**Normative References**

- [OpenID Connect Core 1.0 — Section 5.1](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) — Standard Claims
- [OpenID Connect Core 1.0 — Section 5.3.1](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoRequest) — UserInfo Request
- [OpenID Connect Core 1.0 — Section 5.3.2](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse) — Successful UserInfo Response
- [OpenID Connect Core 1.0 — Section 5.3.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoError) — UserInfo Error Response
- [OpenID Connect Core 1.0 — Section 5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponseValidation) — UserInfo Response Validation
