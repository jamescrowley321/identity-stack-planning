---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0F'
epic_title: 'Conformance Specification — Extended & Advanced Tier Protocols'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0d-spec-token-flows.md
---

# Epic 0F: Conformance Specification — Extended & Advanced Tier Protocols

## Overview

This epic defines the cross-language conformance specifications and test definitions for Extended and Advanced tier protocols in the identity-model project. These capabilities go beyond the Core tier (Discovery, JWKS, JWT validation, Client Credentials, Authorization Code + PKCE) to cover token lifecycle management, delegation, proof-of-possession, and rich authorization patterns.

Each story produces three deliverables:

1. A section in `spec/capabilities.md` documenting the capability with normative RFC references.
2. A conformance test definition file (`spec/conformance/*.json`) with structured test cases that any language implementation can consume.
3. Test fixture files (`spec/test-fixtures/`) with sample requests and responses for deterministic testing.

These artifacts directly drive the implementation stories in Epics 1 (Python), 2 (Node.js), 3 (Go), and 4 (Rust). Without these specs, Extended/Advanced tier implementations lack an authoritative conformance baseline, risking behavioral divergence across language SDKs.

## Stories

---

### Story S.7: Token Introspection Conformance Spec + Test Cases (RFC 7662)

```yaml
story_id: S.7
title: "Token Introspection Capability Spec + Conformance Tests"
epic: EPIC-0F
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for OAuth2 Token Introspection,
> so that I can implement and verify introspection against a single authoritative source of truth that ensures interoperability across all language SDKs.

**Description**

Define the cross-language specification and conformance test definitions for OAuth2 Token Introspection (RFC 7662). Token introspection allows a protected resource to query the authorization server about the state and metadata of a token, enabling centralized token validation without local JWT decoding.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Introspection Request ([RFC 7662 Section 2.1](https://datatracker.ietf.org/doc/html/rfc7662#section-2.1)): POST to the introspection endpoint with `token` parameter (REQUIRED) and optional `token_type_hint` parameter.
   - Client Authentication on the introspection request — the introspection endpoint MUST be protected per [RFC 7662 Section 2.1](https://datatracker.ietf.org/doc/html/rfc7662#section-2.1). Implementations MUST support:
     - `client_secret_basic` ([RFC 6749 Section 2.3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)): HTTP Basic with URL-encoded `client_id:client_secret`
     - `client_secret_post` ([RFC 6749 Section 2.3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)): `client_id` and `client_secret` in the request body
   - Introspection Response ([RFC 7662 Section 2.2](https://datatracker.ietf.org/doc/html/rfc7662#section-2.2)): JSON object with:
     - `active` (REQUIRED, boolean) — indicator of whether the token is currently active
     - When `active=true`: `scope`, `client_id`, `username`, `token_type`, `exp`, `iat`, `nbf`, `sub`, `aud`, `iss`, `jti` (all OPTIONAL per spec but SHOULD be present when applicable)
     - When `active=false`: no other fields are guaranteed to be present
   - Error Response — HTTP 401 when the introspecting client fails authentication per [RFC 7662 Section 2.3](https://datatracker.ietf.org/doc/html/rfc7662#section-2.3)
   - Discovery-based endpoint resolution — the introspection endpoint URL SHOULD be obtained from the `introspection_endpoint` field in the OIDC Discovery document per [RFC 8414 Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2) (Authorization Server Metadata)

2. **`spec/conformance/introspection.json`** with test cases:
   - **INTR-001**: Successful introspection of active token — given a valid, non-expired token and authenticated client credentials, when the introspection endpoint is called with the `token` parameter, then the response contains `active=true` along with standard metadata fields (`scope`, `client_id`, `username`, `token_type`, `exp`, `iat`, `sub`, `iss`, `jti`)
   - **INTR-002**: Introspection of inactive/expired token — given an expired or revoked token and authenticated client credentials, when the introspection endpoint is called, then the response contains `active=false` and no other fields are required to be present
   - **INTR-003**: Client authentication on introspection request — given valid client credentials, when the introspection request is sent using `client_secret_basic`, then the `Authorization: Basic <base64(client_id:client_secret)>` header is correctly formed; and when sent using `client_secret_post`, then `client_id` and `client_secret` appear in the request body
   - **INTR-004**: Handle `token_type_hint` parameter — given a token and a `token_type_hint` value of `access_token` or `refresh_token`, when the introspection request is sent, then the hint is included in the request body; the server MAY use the hint to optimize lookup but MUST NOT fail if the hint is incorrect
   - **INTR-005**: Handle error response from introspection endpoint — given invalid client credentials, when the introspection endpoint is called, then the server returns HTTP 401 and the library surfaces an `invalid_client` error
   - **INTR-006**: Discovery-based endpoint resolution — given a valid OIDC Discovery document containing `introspection_endpoint`, when the library resolves the introspection endpoint, then it uses the URL from the discovery document rather than requiring manual configuration

3. **`spec/test-fixtures/introspection/`** with sample responses:
   - `active-response.json` — 200 response with `active=true` and all standard metadata fields populated
   - `active-minimal.json` — 200 response with `active=true` and only `active` field (tests that optional fields are truly optional)
   - `inactive-response.json` — 200 response with `active=false` only
   - `error-invalid-client.json` — 401 response with `error=invalid_client`
   - `discovery-with-introspection.json` — Discovery document containing `introspection_endpoint`

**Acceptance Criteria (Given/When/Then)**

- **AC-S.7.1** Given the `spec/capabilities.md` Token Introspection section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 7662 Section 2.1, 2.2, 2.3; RFC 6749 Section 2.3.1; RFC 8414 Section 2).
- **AC-S.7.2** Given the conformance test definition file `spec/conformance/introspection.json` is reviewed, when the test case list is checked, then it contains exactly six test cases (INTR-001 through INTR-006) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.7.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.7.4** Given the `spec/test-fixtures/introspection/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON matching the HTTP response body the test expects.
- **AC-S.7.5** Given the `active-response.json` fixture, when parsed, then it contains `active: true` and all standard introspection response fields (`scope`, `client_id`, `username`, `token_type`, `exp`, `iat`, `sub`, `iss`, `jti`).
- **AC-S.7.6** Given the `inactive-response.json` fixture, when parsed, then it contains only `active: false` and no other metadata fields.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Parse each introspection fixture file and assert its structural properties (field presence/absence, `active` boolean value).

**Integration Test Requirements**

- When a language implementation claims conformance, run all INTR-* test cases against a mock introspection endpoint that returns the corresponding fixture responses. The implementation must pass all six tests.
- Stand up a mock introspection endpoint that validates client authentication (both `client_secret_basic` and `client_secret_post`) and returns appropriate responses based on the token state.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete introspection request/response cycle using `client_secret_basic`, with annotated headers and body, referencing RFC sections inline.

**RFC References**

- [RFC 7662 Section 2.1 — Introspection Request](https://datatracker.ietf.org/doc/html/rfc7662#section-2.1)
- [RFC 7662 Section 2.2 — Introspection Response](https://datatracker.ietf.org/doc/html/rfc7662#section-2.2)
- [RFC 7662 Section 2.3 — Error Response](https://datatracker.ietf.org/doc/html/rfc7662#section-2.3)
- [RFC 6749 Section 2.3.1 — Client Password](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)

---

### Story S.8: Token Revocation Conformance Spec + Test Cases (RFC 7009)

```yaml
story_id: S.8
title: "Token Revocation Capability Spec + Conformance Tests"
epic: EPIC-0F
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for OAuth2 Token Revocation,
> so that I can implement token revocation correctly and verify my implementation against a shared conformance baseline that guarantees interoperability.

**Description**

Define the cross-language specification and conformance test definitions for OAuth2 Token Revocation (RFC 7009). Token revocation allows clients to notify the authorization server that a previously obtained token is no longer needed, enabling immediate invalidation rather than waiting for natural expiry.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Revocation Request ([RFC 7009 Section 2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1)): POST to the revocation endpoint with `token` parameter (REQUIRED) and optional `token_type_hint` parameter (`access_token` or `refresh_token`).
   - Client Authentication — the revocation endpoint requires client authentication per [RFC 7009 Section 2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1). The same authentication methods as the token endpoint apply (per [RFC 6749 Section 2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3)).
   - Revocation Response ([RFC 7009 Section 2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1)): HTTP 200 is returned regardless of whether the token was valid, expired, or already revoked. The server MUST NOT differentiate between these cases to prevent token scanning attacks.
   - Error Response ([RFC 7009 Section 2.2.1](https://datatracker.ietf.org/doc/html/rfc7009#section-2.2.1)):
     - `unsupported_token_type` — the authorization server does not support revocation of the presented token type
     - `invalid_client` — client authentication failed
   - Discovery-based endpoint resolution — the revocation endpoint URL SHOULD be obtained from the `revocation_endpoint` field in the OIDC Discovery document per [RFC 8414 Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2)

2. **`spec/conformance/revocation.json`** with test cases:
   - **REV-001**: Successful token revocation — given a valid access token and authenticated client credentials, when the revocation endpoint is called with the `token` parameter, then the server responds with HTTP 200 (empty body or empty JSON object); and given an already-expired or unknown token, when the revocation endpoint is called, then the server also responds with HTTP 200 (the response MUST NOT vary based on token validity)
   - **REV-002**: Revoke with `token_type_hint` — given a token and `token_type_hint=access_token`, when the revocation request is sent, then the hint is included in the request body; and given a token with `token_type_hint=refresh_token`, when the revocation request is sent, then the hint is included in the request body; the server MAY use the hint to optimize lookup but MUST accept the request even if the hint is incorrect
   - **REV-003**: Handle `unsupported_token_type` error — given a revocation request for a token type the server does not support revoking, when the server responds with HTTP 400 and `error=unsupported_token_type`, then the library parses and surfaces the error with the correct error code and optional `error_description`
   - **REV-004**: Handle `invalid_client` error on revocation — given invalid client credentials, when the revocation endpoint is called, then the server responds with HTTP 401 and `error=invalid_client`, and the library surfaces the authentication error
   - **REV-005**: Discovery-based endpoint resolution — given a valid OIDC Discovery document containing `revocation_endpoint`, when the library resolves the revocation endpoint, then it uses the URL from the discovery document rather than requiring manual configuration

3. **`spec/test-fixtures/revocation/`** with sample responses:
   - `revoke-success-empty.json` — 200 response with empty body (the most common server behavior)
   - `revoke-success-empty-object.json` — 200 response with `{}` (alternative valid response)
   - `error-unsupported-token-type.json` — 400 response with `error=unsupported_token_type`
   - `error-invalid-client.json` — 401 response with `error=invalid_client`
   - `discovery-with-revocation.json` — Discovery document containing `revocation_endpoint`

**Acceptance Criteria (Given/When/Then)**

- **AC-S.8.1** Given the `spec/capabilities.md` Token Revocation section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 7009 Section 2.1, 2.2.1; RFC 6749 Section 2.3; RFC 8414 Section 2).
- **AC-S.8.2** Given the conformance test definition file `spec/conformance/revocation.json` is reviewed, when the test case list is checked, then it contains exactly five test cases (REV-001 through REV-005) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.8.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.8.4** Given the `spec/test-fixtures/revocation/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON (or empty body for the success case) matching the HTTP response the test expects.
- **AC-S.8.5** Given the REV-001 test case, when reviewed, then it explicitly states that the server responds with HTTP 200 for both valid tokens and invalid/expired/unknown tokens, per RFC 7009 Section 2.1's requirement to prevent token scanning.
- **AC-S.8.6** Given the `discovery-with-revocation.json` fixture, when parsed, then it contains a valid discovery document with `revocation_endpoint` set to a well-formed URL.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Parse each revocation fixture file and assert its structural properties.

**Integration Test Requirements**

- When a language implementation claims conformance, run all REV-* test cases against a mock revocation endpoint. The mock must return HTTP 200 for all valid revocation requests (regardless of token state) and appropriate error responses for invalid client authentication or unsupported token types.
- Verify that the library correctly handles the case where the revocation endpoint returns an empty body (no JSON to parse).

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete revocation request/response cycle, with annotated headers and body, referencing RFC sections inline. Demonstrate both `access_token` and `refresh_token` revocation.

**RFC References**

- [RFC 7009 Section 2.1 — Revocation Request](https://datatracker.ietf.org/doc/html/rfc7009#section-2.1)
- [RFC 7009 Section 2.2.1 — Error Response](https://datatracker.ietf.org/doc/html/rfc7009#section-2.2.1)
- [RFC 6749 Section 2.3 — Client Authentication](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)

---

### Story S.12: Token Exchange Conformance Spec + Test Cases (RFC 8693)

```yaml
story_id: S.12
title: "Token Exchange Capability Spec + Conformance Tests"
epic: EPIC-0F
status: draft
priority: medium
estimation: L
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for OAuth2 Token Exchange,
> so that I can implement impersonation and delegation token flows correctly and verify my implementation against a shared conformance baseline.

**Description**

Define the cross-language specification and conformance test definitions for OAuth2 Token Exchange (RFC 8693). Token exchange enables a client to request a new token by presenting one or more existing tokens, supporting impersonation (acting as a user) and delegation (acting on behalf of a user) patterns that are essential in microservice architectures and cross-domain identity propagation.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Token Exchange Request ([RFC 8693 Section 2.1](https://datatracker.ietf.org/doc/html/rfc8693#section-2.1)): POST to the token endpoint with `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` and the following parameters:
     - `subject_token` (REQUIRED) — the security token representing the identity of the party on whose behalf the request is being made
     - `subject_token_type` (REQUIRED) — URI identifying the type of the `subject_token`
     - `actor_token` (OPTIONAL) — the security token representing the identity of the acting party (for delegation)
     - `actor_token_type` (REQUIRED when `actor_token` is present) — URI identifying the type of the `actor_token`
     - `resource` (OPTIONAL) — URI of the target service or resource
     - `audience` (OPTIONAL) — logical name of the target service
     - `scope` (OPTIONAL) — desired scope of the requested token
     - `requested_token_type` (OPTIONAL) — URI of the desired token type
   - Token Type URIs ([RFC 8693 Section 3](https://datatracker.ietf.org/doc/html/rfc8693#section-3)):
     - `urn:ietf:params:oauth:token-type:access_token`
     - `urn:ietf:params:oauth:token-type:refresh_token`
     - `urn:ietf:params:oauth:token-type:id_token`
     - `urn:ietf:params:oauth:token-type:saml1`
     - `urn:ietf:params:oauth:token-type:saml2`
     - `urn:ietf:params:oauth:token-type:jwt`
   - Token Exchange Response ([RFC 8693 Section 2.2](https://datatracker.ietf.org/doc/html/rfc8693#section-2.2)):
     - `access_token` (REQUIRED) — the security token issued by the authorization server
     - `issued_token_type` (REQUIRED) — URI of the type of token issued
     - `token_type` (REQUIRED) — typically `Bearer` or `N_A` per [RFC 8693 Section 2.2.1](https://datatracker.ietf.org/doc/html/rfc8693#section-2.2.1)
     - `expires_in` (RECOMMENDED)
     - `scope` (OPTIONAL — included if different from requested scope)
     - `refresh_token` (OPTIONAL)
   - Impersonation vs. Delegation Semantics ([RFC 8693 Section 1.1](https://datatracker.ietf.org/doc/html/rfc8693#section-1.1)):
     - Impersonation: only `subject_token` is provided; the resulting token represents the subject directly
     - Delegation: both `subject_token` and `actor_token` are provided; the resulting token may contain an `act` claim identifying the actor
   - Error Response ([RFC 6749 Section 5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)): standard OAuth2 error response applies

2. **`spec/conformance/token-exchange.json`** with test cases:
   - **EXCH-001**: Basic token exchange (impersonation) — given a valid `subject_token` and `subject_token_type=urn:ietf:params:oauth:token-type:access_token`, when the token exchange request is sent to the token endpoint with `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, then the response contains `access_token`, `issued_token_type`, `token_type`, and `expires_in`
   - **EXCH-002**: Delegation exchange — given a valid `subject_token` with `subject_token_type` and a valid `actor_token` with `actor_token_type`, when the token exchange request is sent, then the response contains a token representing the delegation relationship; the issued token MAY contain an `act` claim per [RFC 8693 Section 4.1](https://datatracker.ietf.org/doc/html/rfc8693#section-4.1)
   - **EXCH-003**: All token type URIs supported — given each of the six defined token type URIs (`access_token`, `refresh_token`, `id_token`, `saml1`, `saml2`, `jwt`), when used as `subject_token_type` in the request, then the library correctly serializes the full URI string in the request body without modification
   - **EXCH-004**: Requested token type and audience parameters — given `requested_token_type=urn:ietf:params:oauth:token-type:access_token` and `audience=https://api.example.com`, when the token exchange request is sent, then both parameters are included in the request body; the `issued_token_type` in the response MAY differ from the `requested_token_type`
   - **EXCH-005**: Parse exchange response — given a successful token exchange response, when the response is parsed, then all fields are correctly extracted: `access_token` (string), `issued_token_type` (URI string), `token_type` (string, e.g., `Bearer` or `N_A`), `expires_in` (integer, optional), `scope` (string, optional), `refresh_token` (string, optional)
   - **EXCH-006**: Handle error response from exchange — given an exchange request that the server rejects (e.g., invalid `subject_token`, unauthorized client, unsupported grant type), when the server responds with HTTP 400 and a standard OAuth2 error (`error=invalid_grant` or `error=invalid_request`), then the library parses and surfaces the error with the correct error code and `error_description`

3. **`spec/test-fixtures/token-exchange/`** with sample requests and responses:
   - `exchange-impersonation-success.json` — 200 response with `access_token`, `issued_token_type=urn:ietf:params:oauth:token-type:access_token`, `token_type=Bearer`, `expires_in`
   - `exchange-delegation-success.json` — 200 response with delegation semantics (includes `act` claim context in issued token metadata)
   - `exchange-n_a-token-type.json` — 200 response with `token_type=N_A` (for non-bearer tokens per RFC 8693 Section 2.2.1)
   - `exchange-request-impersonation.json` — sample request body for impersonation flow with annotated fields
   - `exchange-request-delegation.json` — sample request body for delegation flow with `actor_token` fields
   - `exchange-error-invalid-grant.json` — 400 response with `error=invalid_grant`
   - `exchange-error-invalid-request.json` — 400 response with `error=invalid_request`
   - `token-type-uris.json` — reference file listing all six token type URIs for validation

**Acceptance Criteria (Given/When/Then)**

- **AC-S.12.1** Given the `spec/capabilities.md` Token Exchange section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 8693 Section 1.1, 2.1, 2.2, 2.2.1, 3, 4.1; RFC 6749 Section 5.2).
- **AC-S.12.2** Given the conformance test definition file `spec/conformance/token-exchange.json` is reviewed, when the test case list is checked, then it contains exactly six test cases (EXCH-001 through EXCH-006) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.12.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.12.4** Given the `spec/test-fixtures/token-exchange/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON matching the HTTP request or response body the test expects.
- **AC-S.12.5** Given the EXCH-001 test case, when reviewed, then it explicitly requires `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` in the request body, verifying the library uses the correct grant type URI.
- **AC-S.12.6** Given the EXCH-003 test case, when reviewed, then it enumerates all six token type URIs from RFC 8693 Section 3 and verifies each is serialized correctly.
- **AC-S.12.7** Given the `token-type-uris.json` fixture, when parsed, then it contains all six URI strings matching the values defined in RFC 8693 Section 3.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Parse each token exchange fixture file and assert its structural properties (field presence, correct token type URIs, grant type value).
- Validate that `token-type-uris.json` contains exactly six entries matching the RFC 8693 Section 3 definitions.

**Integration Test Requirements**

- When a language implementation claims conformance, run all EXCH-* test cases against a mock token endpoint that accepts the `urn:ietf:params:oauth:grant-type:token-exchange` grant type. The mock must validate request structure, return the corresponding fixture responses, and the implementation must pass all six tests.
- For EXCH-002, verify that the mock endpoint receives both `subject_token` and `actor_token` parameters.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete impersonation exchange and a complete delegation exchange, with annotated request/response pairs and RFC section references at each step. Demonstrate the difference between `token_type=Bearer` and `token_type=N_A` in the response.

**RFC References**

- [RFC 8693 Section 1.1 — Delegation vs. Impersonation Semantics](https://datatracker.ietf.org/doc/html/rfc8693#section-1.1)
- [RFC 8693 Section 2.1 — Request](https://datatracker.ietf.org/doc/html/rfc8693#section-2.1)
- [RFC 8693 Section 2.2 — Response](https://datatracker.ietf.org/doc/html/rfc8693#section-2.2)
- [RFC 8693 Section 2.2.1 — Issued Token Type](https://datatracker.ietf.org/doc/html/rfc8693#section-2.2.1)
- [RFC 8693 Section 3 — Token Type Identifiers](https://datatracker.ietf.org/doc/html/rfc8693#section-3)
- [RFC 8693 Section 4.1 — "act" (Actor) Claim](https://datatracker.ietf.org/doc/html/rfc8693#section-4.1)
- [RFC 6749 Section 5.2 — Error Response](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)

---

### Story S.13: DPoP Conformance Spec + Test Cases (RFC 9449)

```yaml
story_id: S.13
title: "DPoP Capability Spec + Conformance Tests"
epic: EPIC-0F
status: draft
priority: medium
estimation: XL
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for Demonstrating Proof of Possession (DPoP),
> so that I can implement sender-constrained tokens with proof-of-possession correctly and verify my implementation against a shared conformance baseline that prevents token theft and replay attacks.

**Description**

Define the cross-language specification and conformance test definitions for DPoP (RFC 9449). DPoP binds access tokens to a specific client by requiring the client to prove possession of a private key on every request. This is a critical security mechanism for preventing token theft in public clients and is increasingly mandated by security-focused profiles such as FAPI 2.0.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - DPoP Proof JWT Structure ([RFC 9449 Section 4.2](https://datatracker.ietf.org/doc/html/rfc9449#section-4.2)):
     - JOSE Header: `typ` MUST be `dpop+jwt`, `alg` MUST be an asymmetric algorithm, `jwk` MUST contain the public key (no symmetric algorithms, no `x5c`/`x5t`)
     - Payload claims:
       - `jti` (REQUIRED) — unique identifier to prevent replay
       - `htm` (REQUIRED) — HTTP method of the request (`GET`, `POST`, etc.)
       - `htu` (REQUIRED) — HTTP URI of the request (scheme + authority + path, no query or fragment)
       - `iat` (REQUIRED) — issued-at timestamp
       - `ath` (REQUIRED for resource requests) — base64url-encoded SHA-256 hash of the access token per [RFC 9449 Section 4.2](https://datatracker.ietf.org/doc/html/rfc9449#section-4.2)
       - `nonce` (OPTIONAL) — server-provided nonce for replay prevention per [RFC 9449 Section 4.2](https://datatracker.ietf.org/doc/html/rfc9449#section-4.2)
   - DPoP Proof in Token Request ([RFC 9449 Section 5](https://datatracker.ietf.org/doc/html/rfc9449#section-5)): include the DPoP proof JWT in the `DPoP` HTTP header of the token request; `ath` claim is NOT included in token request proofs (only in resource request proofs)
   - DPoP-Bound Access Token ([RFC 9449 Section 6](https://datatracker.ietf.org/doc/html/rfc9449#section-6)): the authorization server binds the access token to the client's public key via a `cnf` claim containing `jkt` (JWK SHA-256 Thumbprint per [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638))
   - Resource Request with DPoP ([RFC 9449 Section 7](https://datatracker.ietf.org/doc/html/rfc9449#section-7)): use `Authorization: DPoP <access_token>` (NOT `Bearer`) and include the DPoP proof in the `DPoP` header with the `ath` claim
   - Nonce Handling ([RFC 9449 Section 8](https://datatracker.ietf.org/doc/html/rfc9449#section-8)): when the server responds with `DPoP-Nonce` header and HTTP 401 with `error=use_dpop_nonce`, the client MUST retry with the provided nonce included in the proof's `nonce` claim
   - Key Pair Generation — implementations MUST support generating DPoP key pairs for at minimum ES256 and RS256 algorithms
   - DPoP Proof Validation — for resource servers: verify `typ`, `alg`, `jwk`, `jti`, `htm`, `htu`, `iat`, and optionally `ath` and `nonce`; reject proofs with wrong `htm` or `htu`

2. **`spec/conformance/dpop.json`** with test cases:
   - **DPOP-001**: Generate valid DPoP proof JWT — given a DPoP key pair, an HTTP method (`POST`), and an HTTP URI (`https://server.example.com/token`), when a DPoP proof is generated, then the resulting JWT has: header with `typ=dpop+jwt`, `alg` matching the key pair algorithm, `jwk` containing the public key; and payload with `jti` (non-empty unique string), `htm=POST`, `htu=https://server.example.com/token`, and `iat` (recent timestamp)
   - **DPOP-002**: Include DPoP proof in token request header — given a DPoP proof JWT, when a token request is constructed, then the proof is sent in the `DPoP` HTTP header (not `Authorization`), and the `ath` claim is NOT present in the proof payload (token request proofs do not include access token hash)
   - **DPOP-003**: Generate resource request proof with `ath` claim — given a DPoP key pair and a DPoP-bound access token, when a DPoP proof is generated for a resource request, then the proof payload contains an `ath` claim whose value is `BASE64URL(SHA256(access_token))`
   - **DPOP-004**: Handle `use_dpop_nonce` error and retry — given a token or resource request that receives an HTTP 401 response with `error=use_dpop_nonce` and a `DPoP-Nonce` header, when the client retries, then the new DPoP proof includes the server-provided nonce in the `nonce` claim
   - **DPOP-005**: Verify `cnf.jkt` in access token matches DPoP key thumbprint — given a DPoP-bound access token containing a `cnf` claim with `jkt` field, when the JWK thumbprint of the DPoP key pair is computed per RFC 7638, then the `jkt` value in the token matches the computed thumbprint
   - **DPOP-006**: Reject DPoP proof with wrong `htm`/`htu` — given a DPoP proof where `htm` does not match the actual HTTP method or `htu` does not match the actual request URI, when proof validation is performed, then the proof is rejected with a validation error identifying the mismatched field
   - **DPOP-007**: Key pair generation (ES256, RS256 minimum) — given a request to generate a DPoP key pair with algorithm `ES256`, when the key pair is generated, then it produces a valid EC P-256 key pair; and given algorithm `RS256`, when generated, then it produces a valid RSA key pair with minimum 2048-bit modulus
   - **DPOP-008**: DPoP-bound token uses `Authorization: DPoP` scheme — given a DPoP-bound access token, when a resource request is constructed, then the `Authorization` header uses the `DPoP` scheme (`Authorization: DPoP <token>`) rather than `Bearer`

3. **`spec/test-fixtures/dpop/`** with sample data:
   - `dpop-proof-token-request.json` — sample DPoP proof JWT (decoded header + payload) for a token request (no `ath` claim)
   - `dpop-proof-resource-request.json` — sample DPoP proof JWT (decoded header + payload) for a resource request (with `ath` claim)
   - `dpop-keypair-es256.json` — sample ES256 key pair in JWK format (public + private)
   - `dpop-keypair-rs256.json` — sample RS256 key pair in JWK format (public + private)
   - `dpop-bound-token.json` — sample access token (decoded) containing `cnf.jkt` claim
   - `dpop-nonce-error-response.json` — HTTP 401 response with `error=use_dpop_nonce` and `DPoP-Nonce` header
   - `dpop-thumbprint-pairs.json` — array of JWK / expected-thumbprint pairs for deterministic JWK Thumbprint (RFC 7638) verification
   - `dpop-ath-pairs.json` — array of access_token / expected-ath pairs for deterministic `ath` computation verification

**Acceptance Criteria (Given/When/Then)**

- **AC-S.13.1** Given the `spec/capabilities.md` DPoP section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 9449 Sections 4.2, 5, 6, 7, 8; RFC 7638).
- **AC-S.13.2** Given the conformance test definition file `spec/conformance/dpop.json` is reviewed, when the test case list is checked, then it contains exactly eight test cases (DPOP-001 through DPOP-008) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.13.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.13.4** Given the `spec/test-fixtures/dpop/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON matching the expected data structure.
- **AC-S.13.5** Given the `dpop-thumbprint-pairs.json` fixture, when each JWK is processed through the RFC 7638 thumbprint algorithm, then the computed thumbprint matches the expected value in the fixture.
- **AC-S.13.6** Given the `dpop-ath-pairs.json` fixture, when each access token is processed through `BASE64URL(SHA256(access_token))`, then the computed `ath` matches the expected value in the fixture.
- **AC-S.13.7** Given the DPOP-001 test case, when reviewed, then it explicitly validates that no symmetric algorithms (e.g., `HS256`) are accepted for DPoP proof signing, and the `jwk` header parameter contains only the public key (no private key material).
- **AC-S.13.8** Given the DPOP-008 test case, when reviewed, then it explicitly validates that the `Authorization` header scheme is `DPoP` (not `Bearer`) when using a DPoP-bound token.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- For `dpop-thumbprint-pairs.json`, independently compute each JWK thumbprint and assert it matches the fixture's expected value.
- For `dpop-ath-pairs.json`, independently compute each `ath` value and assert it matches the fixture's expected value.
- Parse each DPoP proof fixture and assert structural properties (required header fields, required payload claims, absence of `ath` in token request proofs, presence of `ath` in resource request proofs).

**Integration Test Requirements**

- When a language implementation claims conformance, run all DPOP-* test cases against a mock authorization server and resource server that validate DPoP proofs. The mock must:
  - Verify the `DPoP` header is present and contains a valid JWT
  - Validate `htm`, `htu`, `iat`, and `jti` in the proof
  - For nonce tests (DPOP-004), initially respond with `use_dpop_nonce` and verify the retry includes the nonce
  - For resource requests, verify `ath` matches the access token hash and the `Authorization` scheme is `DPoP`
- The implementation must pass all eight tests.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete DPoP flow: key pair generation, token request with DPoP proof, receiving a DPoP-bound access token, and making a resource request with the bound token. Annotate each step with RFC section references and highlight the difference from Bearer token usage.

**RFC References**

- [RFC 9449 Section 4.2 — DPoP Proof JWT Syntax](https://datatracker.ietf.org/doc/html/rfc9449#section-4.2)
- [RFC 9449 Section 5 — DPoP Proof JWT in Token Request](https://datatracker.ietf.org/doc/html/rfc9449#section-5)
- [RFC 9449 Section 6 — DPoP-Bound Access Tokens](https://datatracker.ietf.org/doc/html/rfc9449#section-6)
- [RFC 9449 Section 7 — Protected Resource Access](https://datatracker.ietf.org/doc/html/rfc9449#section-7)
- [RFC 9449 Section 8 — Authorization Server-Provided Nonce](https://datatracker.ietf.org/doc/html/rfc9449#section-8)
- [RFC 7638 — JSON Web Key (JWK) Thumbprint](https://datatracker.ietf.org/doc/html/rfc7638)

---

### Story S.14: PAR Conformance Spec + Test Cases (RFC 9126)

```yaml
story_id: S.14
title: "PAR Capability Spec + Conformance Tests"
epic: EPIC-0F
status: draft
priority: medium
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for Pushed Authorization Requests (PAR),
> so that I can implement PAR correctly and verify my implementation against a shared conformance baseline that improves authorization request security by moving parameters to the back channel.

**Description**

Define the cross-language specification and conformance test definitions for Pushed Authorization Requests (RFC 9126). PAR improves the security of the authorization code flow by allowing the client to push the authorization request parameters directly to the authorization server via a back-channel POST, receiving a `request_uri` that is then used in the front-channel authorization URL. This eliminates exposure of sensitive parameters (scope, redirect_uri, etc.) in the browser's URL bar and enables request parameter integrity.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - PAR Request ([RFC 9126 Section 2.1](https://datatracker.ietf.org/doc/html/rfc9126#section-2.1)): POST to the PAR endpoint with all authorization request parameters in the body (same parameters that would normally go in the authorization URL: `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method`, etc.)
   - Client Authentication — the PAR endpoint MUST require client authentication per [RFC 9126 Section 2.1](https://datatracker.ietf.org/doc/html/rfc9126#section-2.1), using the same methods supported at the token endpoint
   - PAR Response ([RFC 9126 Section 2.2](https://datatracker.ietf.org/doc/html/rfc9126#section-2.2)):
     - `request_uri` (REQUIRED) — a URI referencing the pushed authorization request, with the `urn:ietf:params:oauth:request_uri:` prefix
     - `expires_in` (REQUIRED) — lifetime of the `request_uri` in seconds
   - Authorization URL with `request_uri` ([RFC 9126 Section 4](https://datatracker.ietf.org/doc/html/rfc9126#section-4)): the authorization URL MUST include only `client_id` and `request_uri` as query parameters; no other authorization request parameters should be duplicated
   - Error Response ([RFC 9126 Section 2.3](https://datatracker.ietf.org/doc/html/rfc9126#section-2.3)): standard OAuth2 error response format per [RFC 6749 Section 5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2), with error codes such as `invalid_request`, `unauthorized_client`, `invalid_client`
   - Discovery-based endpoint resolution — the PAR endpoint URL SHOULD be obtained from the `pushed_authorization_request_endpoint` field in the OIDC Discovery document per [RFC 9126 Section 5](https://datatracker.ietf.org/doc/html/rfc9126#section-5) and [RFC 8414 Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2)

2. **`spec/conformance/par.json`** with test cases:
   - **PAR-001**: Push authorization request to PAR endpoint — given valid authorization request parameters and authenticated client credentials, when the parameters are POSTed to the PAR endpoint, then the request body contains `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, and `code_challenge_method`; the client is authenticated per the token endpoint's method
   - **PAR-002**: Parse PAR response — given a successful PAR response (HTTP 201), when the response is parsed, then `request_uri` is extracted as a string beginning with `urn:ietf:params:oauth:request_uri:` and `expires_in` is extracted as a positive integer
   - **PAR-003**: Build authorization URL with `request_uri` only — given a `request_uri` obtained from a PAR response and a `client_id`, when the authorization URL is constructed, then it contains exactly two query parameters: `client_id` and `request_uri`; no other authorization request parameters (scope, redirect_uri, state, code_challenge, etc.) are present in the URL
   - **PAR-004**: Handle PAR error response — given an invalid PAR request (e.g., missing required parameter or invalid client), when the server responds with HTTP 400 or 401 and a standard OAuth2 error body, then the library parses and surfaces the error with the correct `error` code and `error_description`
   - **PAR-005**: Discovery-based endpoint resolution — given a valid OIDC Discovery document containing `pushed_authorization_request_endpoint`, when the library resolves the PAR endpoint, then it uses the URL from the discovery document rather than requiring manual configuration

3. **`spec/test-fixtures/par/`** with sample requests and responses:
   - `par-request-body.json` — sample PAR request body with all standard authorization parameters
   - `par-success-response.json` — HTTP 201 response with `request_uri=urn:ietf:params:oauth:request_uri:<unique_id>` and `expires_in=60`
   - `par-authorization-url-expected.json` — expected authorization URL components showing only `client_id` and `request_uri` query parameters
   - `par-error-invalid-request.json` — 400 response with `error=invalid_request`
   - `par-error-invalid-client.json` — 401 response with `error=invalid_client`
   - `discovery-with-par.json` — Discovery document containing `pushed_authorization_request_endpoint`

**Acceptance Criteria (Given/When/Then)**

- **AC-S.14.1** Given the `spec/capabilities.md` PAR section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 9126 Sections 2.1, 2.2, 2.3, 4, 5; RFC 6749 Section 5.2; RFC 8414 Section 2).
- **AC-S.14.2** Given the conformance test definition file `spec/conformance/par.json` is reviewed, when the test case list is checked, then it contains exactly five test cases (PAR-001 through PAR-005) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.14.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.14.4** Given the `spec/test-fixtures/par/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON matching the HTTP request or response body the test expects.
- **AC-S.14.5** Given the `par-success-response.json` fixture, when parsed, then `request_uri` begins with `urn:ietf:params:oauth:request_uri:` and `expires_in` is a positive integer.
- **AC-S.14.6** Given the PAR-003 test case, when reviewed, then it explicitly states that the authorization URL MUST contain only `client_id` and `request_uri` as query parameters and no other authorization request parameters are duplicated.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Parse each PAR fixture file and assert its structural properties (field presence, `request_uri` prefix format, `expires_in` type).
- Validate that `par-authorization-url-expected.json` contains exactly `client_id` and `request_uri` query parameters and no others.

**Integration Test Requirements**

- When a language implementation claims conformance, run all PAR-* test cases against a mock PAR endpoint. The mock must accept the pushed parameters, return a `request_uri`, and validate that the subsequent authorization URL uses only `client_id` and `request_uri`. The implementation must pass all five tests.
- For PAR-001, verify the mock receives all expected authorization parameters in the POST body.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete PAR flow: pushing parameters to the PAR endpoint, receiving a `request_uri`, constructing the minimal authorization URL, and completing the authorization code exchange. Annotate each step with RFC section references.

**RFC References**

- [RFC 9126 Section 2.1 — Pushed Authorization Request](https://datatracker.ietf.org/doc/html/rfc9126#section-2.1)
- [RFC 9126 Section 2.2 — Successful Response](https://datatracker.ietf.org/doc/html/rfc9126#section-2.2)
- [RFC 9126 Section 2.3 — Error Response](https://datatracker.ietf.org/doc/html/rfc9126#section-2.3)
- [RFC 9126 Section 4 — Authorization Request](https://datatracker.ietf.org/doc/html/rfc9126#section-4)
- [RFC 9126 Section 5 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc9126#section-5)
- [RFC 8414 Section 2 — Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414#section-2)
- [RFC 6749 Section 5.2 — Error Response](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)

---

### Story S.15: RAR Conformance Spec + Test Cases (RFC 9396)

```yaml
story_id: S.15
title: "RAR Capability Spec + Conformance Tests"
epic: EPIC-0F
status: draft
priority: medium
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for Rich Authorization Requests (RAR),
> so that I can implement fine-grained authorization beyond simple scopes and verify my implementation against a shared conformance baseline.

**Description**

Define the cross-language specification and conformance test definitions for Rich Authorization Requests (RFC 9396). RAR extends OAuth2 to express fine-grained authorization requirements using the `authorization_details` parameter — a structured JSON array that replaces or supplements the flat `scope` string. This enables authorization requests like "transfer $100 from account X to account Y" rather than the coarse-grained "scope=transfer".

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - `authorization_details` Request Parameter ([RFC 9396 Section 2](https://datatracker.ietf.org/doc/html/rfc9396#section-2)): a JSON array of objects, each with:
     - `type` (REQUIRED) — string identifying the authorization type (e.g., `payment_initiation`, `account_information`)
     - Additional fields specific to the type (e.g., `actions`, `locations`, `datatypes`, `identifier`)
   - Serialization in Authorization Request ([RFC 9396 Section 3](https://datatracker.ietf.org/doc/html/rfc9396#section-3)): `authorization_details` is serialized as a URL-encoded JSON string in the authorization request query parameters (or in the PAR request body when combined with PAR)
   - `authorization_details` in Token Response ([RFC 9396 Section 7](https://datatracker.ietf.org/doc/html/rfc9396#section-7)): the authorization server MAY return `authorization_details` in the token response to indicate the granted authorization, which may differ from what was requested
   - `authorization_details` in Token Introspection Response ([RFC 9396 Section 9](https://datatracker.ietf.org/doc/html/rfc9396#section-9)): the introspection response MAY include `authorization_details` reflecting the authorization associated with the token
   - `type` Field Validation ([RFC 9396 Section 2](https://datatracker.ietf.org/doc/html/rfc9396#section-2)): the `type` field is REQUIRED in each authorization detail object; implementations MUST reject requests where any object is missing `type`
   - Combination with PAR ([RFC 9396 Section 3](https://datatracker.ietf.org/doc/html/rfc9396#section-3), [RFC 9126](https://datatracker.ietf.org/doc/html/rfc9126)): when used with PAR, `authorization_details` is included as a JSON string in the PAR request body rather than in the authorization URL

2. **`spec/conformance/rar.json`** with test cases:
   - **RAR-001**: Serialize `authorization_details` as JSON array in request — given an array of authorization detail objects each with a `type` field and type-specific fields, when the authorization request is constructed, then `authorization_details` is serialized as a URL-encoded JSON array string in the request parameters; the JSON array MUST be valid JSON when decoded
   - **RAR-002**: Parse `authorization_details` from token response — given a token response containing an `authorization_details` field, when the response is parsed, then the `authorization_details` is correctly deserialized from a JSON array string into an array of objects, and each object's `type` and type-specific fields are accessible
   - **RAR-003**: Validate `authorization_details` `type` field (required) — given an `authorization_details` array where one or more objects are missing the `type` field, when validation is performed, then the implementation rejects the request with an error identifying the missing `type` field; and given all objects contain `type`, when validation is performed, then validation passes
   - **RAR-004**: Combine RAR with PAR — given `authorization_details` and a PAR endpoint, when the PAR request is sent, then `authorization_details` is included as a JSON string in the PAR POST body alongside other authorization parameters; the resulting `request_uri` used in the authorization URL does not contain `authorization_details` (it was pushed to the server)

3. **`spec/test-fixtures/rar/`** with sample data:
   - `rar-payment-initiation.json` — sample `authorization_details` array with a `payment_initiation` type containing `instructedAmount`, `creditorName`, `creditorAccount` fields (per RFC 9396 Section 2 examples)
   - `rar-account-information.json` — sample `authorization_details` array with an `account_information` type containing `actions`, `locations` fields
   - `rar-multiple-types.json` — sample `authorization_details` array with multiple objects of different types
   - `rar-missing-type.json` — invalid `authorization_details` array where one object is missing the required `type` field
   - `rar-token-response.json` — sample token response containing `authorization_details` in the response body
   - `rar-par-request-body.json` — sample PAR request body including `authorization_details` as a JSON string alongside standard authorization parameters

**Acceptance Criteria (Given/When/Then)**

- **AC-S.15.1** Given the `spec/capabilities.md` RAR section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 9396 Sections 2, 3, 7, 9; RFC 9126 for PAR combination).
- **AC-S.15.2** Given the conformance test definition file `spec/conformance/rar.json` is reviewed, when the test case list is checked, then it contains exactly four test cases (RAR-001 through RAR-004) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.15.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.15.4** Given the `spec/test-fixtures/rar/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON matching the expected data structure.
- **AC-S.15.5** Given the `rar-missing-type.json` fixture, when parsed, then at least one authorization detail object is missing the `type` field and no other unintentional differences exist relative to the valid fixtures.
- **AC-S.15.6** Given the `rar-payment-initiation.json` fixture, when parsed, then it matches the payment initiation example structure from RFC 9396 Section 2, including `type`, `instructedAmount` (with `currency` and `amount`), `creditorName`, and `creditorAccount`.
- **AC-S.15.7** Given the RAR-004 test case, when reviewed, then it explicitly validates that `authorization_details` appears in the PAR POST body and does NOT appear in the subsequent authorization URL query parameters.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Parse each RAR fixture file and assert structural properties (array structure, `type` field presence/absence, type-specific field presence).
- Validate that the serialized form of each fixture produces valid JSON when URL-decoded.

**Integration Test Requirements**

- When a language implementation claims conformance, run all RAR-* test cases against a mock authorization server. The mock must accept `authorization_details` in both direct authorization requests and PAR requests, and return `authorization_details` in the token response. The implementation must pass all four tests.
- For RAR-004, verify the mock PAR endpoint receives `authorization_details` in the POST body and that the subsequent authorization URL contains only `client_id` and `request_uri`.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete RAR flow: constructing a payment initiation `authorization_details`, sending it via a direct authorization request and via PAR, receiving the granted authorization in the token response, and accessing the type-specific fields. Annotate each step with RFC section references.

**RFC References**

- [RFC 9396 Section 2 — Request Parameter `authorization_details`](https://datatracker.ietf.org/doc/html/rfc9396#section-2)
- [RFC 9396 Section 3 — Authorization Request](https://datatracker.ietf.org/doc/html/rfc9396#section-3)
- [RFC 9396 Section 7 — Token Response](https://datatracker.ietf.org/doc/html/rfc9396#section-7)
- [RFC 9396 Section 9 — Token Introspection](https://datatracker.ietf.org/doc/html/rfc9396#section-9)
- [RFC 9126 — Pushed Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9126)
