---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0D'
epic_title: 'Conformance Specification — OAuth2 Token Flows'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0b-ecosystem-research.md
---

# Epic 0D: Conformance Specification — OAuth2 Token Flows

## Overview

This epic defines the cross-language conformance specifications and test definitions for OAuth2 token flows in the identity-model project. These artifacts are language-agnostic: they specify **what** each implementation must support and **how** conformance is verified, without prescribing language-specific code.

Each story produces three deliverables:

1. A section in `spec/capabilities.md` documenting the capability with normative RFC references.
2. A conformance test definition file (`spec/conformance/*.json`) with structured test cases that any language implementation can consume.
3. Test fixture files (`spec/test-fixtures/`) with sample requests and responses for deterministic testing.

These artifacts directly drive the implementation stories in Epics 1 (Python), 2 (Node.js), 3 (Go), and 4 (Rust).

## Stories

---

### Story S.5: Client Credentials Flow Capability Spec + Conformance Tests

```yaml
story_id: S.5
title: "Client Credentials Flow Capability Spec + Conformance Tests"
epic: EPIC-0D
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for the Client Credentials grant,
> so that I can implement and verify the flow against a single authoritative source of truth rather than re-interpreting the RFCs independently.

**Description**

Define the cross-language specification and conformance test definitions for the OAuth2 Client Credentials grant type. This is the simplest token acquisition flow — no user interaction, no redirects — making it the ideal starting point for the token flow spec suite.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Client Credentials Grant request ([RFC 6749 §4.4.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.2)): POST to token endpoint, `grant_type=client_credentials`
   - Client authentication methods:
     - `client_secret_basic` ([RFC 6749 §2.3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)): HTTP Basic with URL-encoded `client_id:client_secret` in the `Authorization` header
     - `client_secret_post` ([RFC 6749 §2.3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)): `client_id` and `client_secret` sent in the request body
   - Access Token Response ([RFC 6749 §5.1](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1)): `access_token`, `token_type`, `expires_in`, `scope`
   - Error Response ([RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)): `error`, `error_description`, `error_uri`
   - Scope parameter ([RFC 6749 §3.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3))

2. **`spec/conformance/client-credentials.json`** with test cases:
   - **CC-001**: Successful token request with `client_secret_basic` — verify `Authorization: Basic <base64(client_id:client_secret)>` header is sent, `grant_type=client_credentials` in body, response parsed correctly
   - **CC-002**: Successful token request with `client_secret_post` — verify `client_id` and `client_secret` appear in the request body alongside `grant_type`
   - **CC-003**: Request with `scope` parameter — verify scope is included in the token request body, response scope may differ from requested scope
   - **CC-004**: Handle `invalid_client` error — verify the library correctly parses and surfaces the error when the authorization server rejects client credentials (HTTP 401, `error=invalid_client`)
   - **CC-005**: Handle `invalid_scope` error — verify the library correctly parses and surfaces the error when a requested scope is not allowed (HTTP 400, `error=invalid_scope`)
   - **CC-006**: Handle server error (HTTP 500) — verify the library raises/returns an appropriate error rather than attempting to parse a non-JSON response body
   - **CC-007**: Parse access token response fields — verify `access_token`, `token_type`, `expires_in`, and `scope` are all correctly extracted from a well-formed response
   - **CC-008**: Handle missing `expires_in` gracefully — verify the library does not fail when `expires_in` is absent from the response (it is RECOMMENDED but not REQUIRED per RFC 6749 §5.1)

3. **`spec/test-fixtures/token-responses/`** with sample responses:
   - `cc-success.json` — well-formed 200 response with all fields
   - `cc-success-minimal.json` — 200 response with only required fields (no `expires_in`, no `scope`)
   - `cc-error-invalid-client.json` — 401 response with `error=invalid_client`
   - `cc-error-invalid-scope.json` — 400 response with `error=invalid_scope`
   - `cc-error-server.json` — 500 response with non-JSON body

**Acceptance Criteria (Given/When/Then)**

- **AC-S.5.1** Given the `spec/capabilities.md` Client Credentials section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 6749 §4.4.2, §2.3.1, §5.1, §5.2, §3.3).
- **AC-S.5.2** Given the conformance test definition file `spec/conformance/client-credentials.json` is reviewed, when the test case list is checked, then it contains exactly eight test cases (CC-001 through CC-008) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.5.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.5.4** Given the `spec/test-fixtures/token-responses/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON (or plaintext for the 500 error case) matching the HTTP response body the test expects.
- **AC-S.5.5** Given both `client_secret_basic` and `client_secret_post` authentication methods, when the spec and test cases are reviewed, then each method has at least one dedicated test case covering the correct request construction.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (schema to be defined in `spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.

**Integration Test Requirements**

- When a language implementation claims conformance, run all CC-* test cases against a mock token endpoint that returns the corresponding fixture responses. The implementation must pass all eight tests.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete Client Credentials request/response cycle using `client_secret_basic`, with annotated headers and body, referencing RFC sections inline.

**RFC References**

- [RFC 6749 §2.3.1 — Client Password](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)
- [RFC 6749 §3.3 — Access Token Scope](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3)
- [RFC 6749 §4.4 — Client Credentials Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4)
- [RFC 6749 §4.4.2 — Access Token Request](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.2)
- [RFC 6749 §5.1 — Successful Response](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1)
- [RFC 6749 §5.2 — Error Response](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)

---

### Story S.6: Authorization Code + PKCE Flow Capability Spec + Conformance Tests

```yaml
story_id: S.6
title: "Authorization Code + PKCE Flow Capability Spec + Conformance Tests"
epic: EPIC-0D
status: draft
priority: high
estimation: L
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for the Authorization Code flow with PKCE,
> so that I can implement the most common interactive authentication flow with confidence that my implementation is interoperable and secure.

**Description**

Define the cross-language specification and conformance test definitions for the OAuth2 Authorization Code grant type with Proof Key for Code Exchange (PKCE). This is the primary flow for user-facing authentication in both web and native applications. The spec mandates S256 as the only supported `code_challenge_method`, in alignment with current best practices ([OAuth 2.0 Security BCP §2.1.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-2.1.1)).

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Authorization Request ([RFC 6749 §4.1.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1)): `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`
   - PKCE `code_verifier` generation ([RFC 7636 §4.1](https://datatracker.ietf.org/doc/html/rfc7636#section-4.1)): 43-128 characters, unreserved character set `[A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"`
   - PKCE `code_challenge` computation ([RFC 7636 §4.2](https://datatracker.ietf.org/doc/html/rfc7636#section-4.2)): S256 method (`BASE64URL(SHA256(code_verifier))`), plain method (identity transform)
   - `code_challenge` and `code_challenge_method` in the authorization request ([RFC 7636 §4.3](https://datatracker.ietf.org/doc/html/rfc7636#section-4.3))
   - Authorization Response ([RFC 6749 §4.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2)): `code`, `state`
   - Token Request with `code` + `code_verifier` ([RFC 6749 §4.1.3](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3), [RFC 7636 §4.5](https://datatracker.ietf.org/doc/html/rfc7636#section-4.5)): `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `code_verifier`
   - Token Response ([RFC 6749 §5.1](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1)) with ID token ([OIDC Core §3.1.3.3](https://openid.net/specs/openid-connect-core-1_0.html#TokenResponse))
   - Error responses: authorization endpoint errors ([RFC 6749 §4.1.2.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1)), token endpoint errors ([RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2))
   - `state` parameter for CSRF protection ([RFC 6749 §10.12](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12))

2. **`spec/conformance/authorization-code.json`** with test cases:
   - **AUTHZ-001**: Generate valid `code_verifier` — verify output length is between 43 and 128 characters, and every character is in the unreserved set `[A-Za-z0-9\-._~]` (RFC 7636 §4.1)
   - **AUTHZ-002**: Generate S256 `code_challenge` from verifier — given a known `code_verifier`, verify the output matches `BASE64URL(SHA256(code_verifier))` using a precomputed expected value (RFC 7636 §4.2)
   - **AUTHZ-003**: Build authorization URL with PKCE parameters — verify the constructed URL includes `response_type=code`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256`, and `scope` as query parameters (RFC 6749 §4.1.1, RFC 7636 §4.3)
   - **AUTHZ-004**: Build authorization URL with `state` — verify the constructed URL includes a `state` parameter and that it is preserved through the flow for CSRF validation (RFC 6749 §4.1.1, §10.12)
   - **AUTHZ-005**: Exchange authorization code for tokens with `code_verifier` — verify the token request body includes `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, and `code_verifier` (RFC 6749 §4.1.3, RFC 7636 §4.5)
   - **AUTHZ-006**: Parse token response with ID token — verify the library extracts `access_token`, `token_type`, `expires_in`, `refresh_token`, and `id_token` from the response (RFC 6749 §5.1, OIDC Core §3.1.3.3)
   - **AUTHZ-007**: Handle `invalid_grant` error (expired or already-used code) — verify the library correctly parses and surfaces the error (HTTP 400, `error=invalid_grant`) (RFC 6749 §5.2)
   - **AUTHZ-008**: Handle `redirect_uri` mismatch error — verify the library correctly parses and surfaces the error when the token request `redirect_uri` does not match the authorization request (HTTP 400, `error=invalid_grant`) (RFC 6749 §4.1.3)
   - **AUTHZ-009**: Validate `state` matches on callback — verify the library detects when the `state` returned by the authorization server does not match the original value, and raises an appropriate error (RFC 6749 §10.12)
   - **AUTHZ-010**: Reject `plain` `code_challenge_method` — verify the library refuses to use `code_challenge_method=plain` and requires S256, in alignment with security best practices (RFC 7636 §4.2, OAuth Security BCP §2.1.1)

3. **`spec/test-fixtures/auth-code/`** with sample requests and responses:
   - `pkce-verifier-challenge-pairs.json` — array of known `code_verifier` / `code_challenge` pairs for deterministic testing
   - `authorization-url-expected.json` — sample authorization URL components with expected query parameters
   - `token-request-expected.json` — sample token request body with all required fields
   - `ac-token-success.json` — well-formed 200 token response with `access_token`, `id_token`, `refresh_token`, `token_type`, `expires_in`
   - `ac-token-success-minimal.json` — 200 token response with only required fields
   - `ac-error-invalid-grant.json` — 400 response with `error=invalid_grant`
   - `ac-error-redirect-mismatch.json` — 400 response with `error=invalid_grant` and descriptive `error_description`
   - `ac-authz-error-access-denied.json` — authorization endpoint error redirect with `error=access_denied`

**Acceptance Criteria (Given/When/Then)**

- **AC-S.6.1** Given the `spec/capabilities.md` Authorization Code + PKCE section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 6749 §4.1.1, §4.1.2, §4.1.2.1, §4.1.3, §5.1, §5.2, §10.12; RFC 7636 §4.1, §4.2, §4.3, §4.5; OIDC Core §3.1.3.3).
- **AC-S.6.2** Given the conformance test definition file `spec/conformance/authorization-code.json` is reviewed, when the test case list is checked, then it contains exactly ten test cases (AUTHZ-001 through AUTHZ-010) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.6.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.6.4** Given the PKCE test fixtures, when the `code_verifier`/`code_challenge` pairs are validated, then each pair is independently verifiable by computing `BASE64URL(SHA256(code_verifier))` and comparing to the expected `code_challenge`.
- **AC-S.6.5** Given the test case AUTHZ-010, when reviewed, then it explicitly requires that the library reject `plain` as a `code_challenge_method` and mandate S256.
- **AC-S.6.6** Given the `state` validation test cases (AUTHZ-004, AUTHZ-009), when reviewed, then they cover both the happy path (state matches) and the failure path (state mismatch or missing).
- **AC-S.6.7** Given the token response fixtures, when reviewed, then at least one fixture includes an `id_token` field to validate OIDC-layer parsing alongside the OAuth2 fields.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Validate that all `pkce-verifier-challenge-pairs.json` entries are mathematically correct (SHA256 + base64url).

**Integration Test Requirements**

- When a language implementation claims conformance, run all AUTHZ-* test cases against a mock authorization server. The mock must handle both the authorization endpoint (returning `code` and `state`) and the token endpoint (validating `code_verifier` and returning tokens). The implementation must pass all ten tests.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete Authorization Code + PKCE flow from authorization URL construction through token exchange, with annotated request/response pairs and RFC section references at each step.

**RFC References**

- [RFC 6749 §4.1 — Authorization Code Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
- [RFC 6749 §4.1.1 — Authorization Request](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1)
- [RFC 6749 §4.1.2 — Authorization Response](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2)
- [RFC 6749 §4.1.2.1 — Error Response (Authorization)](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1)
- [RFC 6749 §4.1.3 — Access Token Request](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3)
- [RFC 6749 §5.1 — Successful Response](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1)
- [RFC 6749 §5.2 — Error Response (Token)](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)
- [RFC 6749 §10.12 — Cross-Site Request Forgery](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12)
- [RFC 7636 §4.1 — Client Creates a Code Verifier](https://datatracker.ietf.org/doc/html/rfc7636#section-4.1)
- [RFC 7636 §4.2 — Client Creates the Code Challenge](https://datatracker.ietf.org/doc/html/rfc7636#section-4.2)
- [RFC 7636 §4.3 — Client Sends the Code Challenge with the Authorization Request](https://datatracker.ietf.org/doc/html/rfc7636#section-4.3)
- [RFC 7636 §4.5 — Client Sends the Authorization Code and the Code Verifier](https://datatracker.ietf.org/doc/html/rfc7636#section-4.5)
- [OIDC Core §3.1.3.3 — Successful Token Response](https://openid.net/specs/openid-connect-core-1_0.html#TokenResponse)
