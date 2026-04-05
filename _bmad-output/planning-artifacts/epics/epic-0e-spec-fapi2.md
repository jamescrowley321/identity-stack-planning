---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0E-FAPI'
epic_title: 'Conformance Specification — FAPI 2.0 Security Profile'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0d-spec-token-flows.md
---

# Epic 0E-FAPI: Conformance Specification — FAPI 2.0 Security Profile

## Overview

This epic defines the cross-language conformance specification and test definitions for the Financial-grade API (FAPI) 2.0 Security Profile in the identity-model project. FAPI 2.0 represents the most stringent security profile for OAuth 2.0 deployments, mandating sender-constrained tokens, Pushed Authorization Requests, PKCE with S256, and JWT-secured authorization responses. These requirements are critical for financial services, open banking, and any high-security API ecosystem.

These artifacts are language-agnostic: they specify **what** each implementation must support and **how** conformance is verified, without prescribing language-specific code.

Each story produces three deliverables:

1. A section in `spec/capabilities.md` documenting the capability with normative spec/RFC references.
2. A conformance test definition file (`spec/conformance/*.json`) with structured test cases that any language implementation can consume.
3. Test fixture files (`spec/test-fixtures/`) with sample requests and responses for deterministic testing.

These artifacts directly drive the implementation stories in Epics 1 (Python), 2 (Node.js), 3 (Go), and 4 (Rust).

## Stories

---

### Story S.11a: FAPI 2.0 — Flow Constraints & PAR Requirement

```yaml
story_id: S.11a
title: "FAPI 2.0 — Flow Constraints & PAR Requirement"
epic: EPIC-0E-FAPI
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, spec-grounded specification and conformance test definitions for the FAPI 2.0 flow constraints — authorization code flow only, PKCE S256, PAR requirement, and strict redirect URI matching,
> so that I can implement and verify these foundational FAPI 2.0 gatekeeping requirements against a single authoritative source of truth.

**Description**

Define the cross-language specification and conformance test definitions for the [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-2_0-security-profile.html) flow constraints and PAR requirement. These are the gatekeeping rules that reject non-compliant requests before any cryptographic token binding occurs:

- **Authorization code flow ONLY** — implicit and hybrid flows are prohibited (§5.3.2)
- **PKCE required with S256** — every authorization request must include a code challenge using the S256 method (§5.3.2)
- **PAR required** — Pushed Authorization Requests ([RFC 9126 §2](https://datatracker.ietf.org/doc/html/rfc9126#section-2)) are mandatory; plain query-parameter authorization requests are not permitted for sensitive data (§5.3.2)
- **Strict redirect URI matching** — exact match required, no wildcards or partial matches (§5.3.2)

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - FAPI 2.0 Security Profile overview and scope ([FAPI 2.0 §1](https://openid.net/specs/fapi-2_0-security-profile.html#section-1))
   - Authorization code flow requirement — implicit and hybrid flows prohibited ([FAPI 2.0 §5.3.2](https://openid.net/specs/fapi-2_0-security-profile.html#section-5.3.2))
   - PKCE with S256 requirement ([FAPI 2.0 §5.3.2](https://openid.net/specs/fapi-2_0-security-profile.html#section-5.3.2), [RFC 7636 §4.2](https://datatracker.ietf.org/doc/html/rfc7636#section-4.2))
   - Pushed Authorization Requests ([RFC 9126 §2](https://datatracker.ietf.org/doc/html/rfc9126#section-2)) — PAR endpoint, `request_uri` in authorization request
   - Strict redirect URI matching — exact string comparison, no wildcards ([FAPI 2.0 §5.3.2](https://openid.net/specs/fapi-2_0-security-profile.html#section-5.3.2))

2. **`spec/conformance/fapi2-flow-constraints.json`** with test cases:
   - **FAPI-001**: Reject implicit flow attempt — given a FAPI 2.0 client, when an authorization request is constructed with `response_type=token`, then the library must reject the request and raise an error indicating that only `response_type=code` is permitted under FAPI 2.0 (FAPI 2.0 §5.3.2)
   - **FAPI-002**: Reject authorization request without PKCE — given a FAPI 2.0 client, when an authorization request is constructed without a `code_challenge` parameter, then the library must reject the request and raise an error indicating that PKCE is mandatory (FAPI 2.0 §5.3.2, RFC 7636 §4.3)
   - **FAPI-003**: Reject authorization request without PAR — given a FAPI 2.0 client, when an authorization request is constructed without first pushing the request to the PAR endpoint, then the library must reject the request and raise an error indicating that PAR is required (FAPI 2.0 §5.3.2, RFC 9126 §2)
   - **FAPI-006**: Reject non-S256 PKCE method — given a FAPI 2.0 client, when an authorization request is constructed with `code_challenge_method=plain`, then the library must reject the request and raise an error indicating that only S256 is permitted (FAPI 2.0 §5.3.2, RFC 7636 §4.2)
   - **FAPI-010**: Strict redirect URI matching — reject partial match — given a FAPI 2.0 client with a registered redirect URI of `https://app.example.com/callback`, when a redirect URI of `https://app.example.com/callback/extra` or `https://app.example.com/callback?foo=bar` is provided, then the library must reject the URI and raise an error indicating that exact redirect URI matching is required (FAPI 2.0 §5.3.2)

3. **`spec/test-fixtures/fapi2/`** fixtures for this story:
   - `par-request-expected.json` — sample PAR request body with all required fields (`request`, `client_id`, or individual authorization parameters)
   - `par-response-success.json` — 201 response with `request_uri` and `expires_in`
   - `redirect-uri-matching-cases.json` — array of `{ registered, attempted, should_match }` entries for strict URI matching tests
   - `fapi2-error-implicit-rejected.json` — error response structure for rejected implicit flow attempt
   - `fapi2-error-no-pkce.json` — error response structure for missing PKCE
   - `fapi2-error-no-par.json` — error response structure for missing PAR

**Acceptance Criteria (Given/When/Then)**

- **AC-S.11a.1** Given the `spec/capabilities.md` FAPI 2.0 flow constraints section is reviewed, when each normative statement is checked, then every statement includes an explicit spec or RFC section reference (FAPI 2.0 §5.3.2; RFC 7636 §4.2, §4.3; RFC 9126 §2).
- **AC-S.11a.2** Given the conformance test definition file `spec/conformance/fapi2-flow-constraints.json` is reviewed, when the test case list is checked, then it contains exactly five test cases (FAPI-001, FAPI-002, FAPI-003, FAPI-006, FAPI-010) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.11a.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.11a.4** Given test cases FAPI-001, FAPI-002, FAPI-003, and FAPI-006, when reviewed, then each negative test case explicitly requires that the library reject the invalid request and raise a descriptive error, rather than silently proceeding.
- **AC-S.11a.5** Given the redirect URI matching test fixtures, when each `{ registered, attempted, should_match }` entry is evaluated, then only exact string matches are accepted; all partial matches, wildcard expansions, and query-parameter additions are rejected.

---

### Story S.11b: FAPI 2.0 — Sender-Constrained Tokens (DPoP & mTLS)

```yaml
story_id: S.11b
title: "FAPI 2.0 — Sender-Constrained Tokens (DPoP & mTLS)"
epic: EPIC-0E-FAPI
status: draft
priority: high
estimation: L
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, spec-grounded specification and conformance test definitions for FAPI 2.0 sender-constrained tokens — DPoP proof generation, DPoP `cnf.jkt` verification, and mTLS certificate-bound token verification,
> so that I can implement and verify sender-constraining requirements that prevent token theft and replay attacks in financial-grade deployments.

**Description**

Define the cross-language specification and conformance test definitions for the sender-constraining mechanisms required by FAPI 2.0. Access tokens MUST be sender-constrained via either DPoP ([RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449)) or mTLS ([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705)):

- **DPoP proof generation** — creating a DPoP proof JWT with `htm`, `htu`, `iat`, `jti`, and `jwk` header (RFC 9449 §4.3)
- **DPoP `cnf.jkt` verification** — verifying the JWK Thumbprint confirmation method in the access token matches the proof key (RFC 9449 §6.1)
- **mTLS certificate-bound tokens** — verifying the `x5t#S256` confirmation method in the access token matches the client certificate thumbprint (RFC 8705 §3)

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Sender-constrained tokens via DPoP ([RFC 9449 §4](https://datatracker.ietf.org/doc/html/rfc9449#section-4)) — DPoP proof generation, `cnf` claim binding
   - Sender-constrained tokens via mTLS ([RFC 8705 §3](https://datatracker.ietf.org/doc/html/rfc8705#section-3)) — certificate-bound access tokens, `x5t#S256` confirmation method

2. **`spec/conformance/fapi2-sender-constraining.json`** with test cases:
   - **FAPI-004**: Generate DPoP proof for token request — given a FAPI 2.0 client configured for DPoP sender-constraining, when a token request is constructed, then the request must include a valid DPoP proof JWT in the `DPoP` header, containing `htm`, `htu`, `iat`, and `jti` claims, signed with the client's ephemeral key (RFC 9449 §4.3)
   - **FAPI-008**: Verify sender-constrained access token (DPoP `cnf` claim) — given a FAPI 2.0 client using DPoP, when an access token response is received containing a `cnf` claim with a `jkt` (JWK Thumbprint) member, then the library must verify that the `jkt` value matches the thumbprint of the DPoP key used in the proof (RFC 9449 §6.1)
   - **FAPI-011**: mTLS certificate-bound token verification — given a FAPI 2.0 client using mTLS sender-constraining, when an access token response is received containing a `cnf` claim with an `x5t#S256` (X.509 Certificate SHA-256 Thumbprint) member, then the library must verify that the `x5t#S256` value matches the SHA-256 thumbprint of the client certificate used for mutual TLS authentication (RFC 8705 §3)

3. **`spec/test-fixtures/fapi2/`** fixtures for this story:
   - `dpop-proof-expected.json` — sample DPoP proof JWT (header + payload) with `htm`, `htu`, `iat`, `jti`, and `jwk` in header
   - `dpop-cnf-token-response.json` — token response with `token_type=DPoP` and JWT access token containing `cnf.jkt`
   - `mtls-cnf-token-response.json` — token response with JWT access token containing `cnf.x5t#S256` for mTLS certificate-bound verification

**Acceptance Criteria (Given/When/Then)**

- **AC-S.11b.1** Given the `spec/capabilities.md` sender-constraining section is reviewed, when each normative statement is checked, then every statement includes an explicit spec or RFC section reference (RFC 9449 §4, §4.3, §6.1; RFC 8705 §3).
- **AC-S.11b.2** Given the conformance test definition file `spec/conformance/fapi2-sender-constraining.json` is reviewed, when the test case list is checked, then it contains exactly three test cases (FAPI-004, FAPI-008, FAPI-011) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.11b.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.11b.4** Given the DPoP test fixtures, when the DPoP proof JWT is validated, then it contains all required claims (`htm`, `htu`, `iat`, `jti`) and a `jwk` header parameter, and the `cnf.jkt` in the corresponding token response matches the JWK thumbprint of the proof key.
- **AC-S.11b.5** Given the mTLS test fixture, when the token response is validated, then the `cnf.x5t#S256` value in the access token matches the SHA-256 thumbprint of the client certificate in the fixture.

---

### Story S.11c: FAPI 2.0 — JARM & Transaction Binding

```yaml
story_id: S.11c
title: "FAPI 2.0 — JARM & Transaction Binding"
epic: EPIC-0E-FAPI
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, spec-grounded specification and conformance test definitions for FAPI 2.0 JARM response validation and s_hash transaction binding,
> so that I can implement and verify JWT-secured authorization responses and state-binding mechanisms that protect against authorization response tampering and CSRF attacks.

**Description**

Define the cross-language specification and conformance test definitions for JARM and transaction binding mechanisms required by FAPI 2.0:

- **JARM** — JWT Secured Authorization Response Mode ([OpenID JARM §2](https://openid.net/specs/oauth-v2-jarm.html#section-2)) for authorization responses
- **ID Token as detached signature** — the ID Token is used for transaction binding, not for claims delivery (§5.3.3)
- **s_hash** — state hash embedded in the ID Token for CSRF binding (§5.3.3)

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - JARM — JWT Secured Authorization Response Mode ([OpenID JARM §2](https://openid.net/specs/oauth-v2-jarm.html#section-2)) — JWT-encoded authorization responses, `response_mode=jwt`
   - ID Token as detached signature ([FAPI 2.0 §5.3.3](https://openid.net/specs/fapi-2_0-security-profile.html#section-5.3.3)) — not used for claims delivery
   - `s_hash` — state hash in the ID Token ([FAPI 2.0 §5.3.3](https://openid.net/specs/fapi-2_0-security-profile.html#section-5.3.3)) — `BASE64URL(LEFT_HALF(SHA256(state)))`

2. **`spec/conformance/fapi2-jarm.json`** with test cases:
   - **FAPI-005**: Validate JARM response (JWT-encoded authorization response) — given a FAPI 2.0 client that requires JARM, when an authorization response is received as a JWT, then the library must decode the JWT, validate the signature against the authorization server's JWKS, and extract the `code` and `state` parameters from the JWT payload (OpenID JARM §2.3)
   - **FAPI-007**: Validate `s_hash` in ID Token matches state — given a FAPI 2.0 client, when an ID Token is received containing an `s_hash` claim, then the library must compute `BASE64URL(LEFT_HALF(SHA256(state)))` using the original `state` value and verify it matches the `s_hash` claim in the ID Token (FAPI 2.0 §5.3.3)
   - **FAPI-009**: Reject authorization response without JARM when required — given a FAPI 2.0 client configured to require JARM, when an authorization response is received as plain query parameters instead of a JWT, then the library must reject the response and raise an error indicating that JARM is required (OpenID JARM §2)

3. **`spec/test-fixtures/fapi2/`** fixtures for this story:
   - `jarm-response-jwt.json` — sample JARM JWT (header + payload) containing `code`, `state`, and `iss` claims
   - `jarm-jwks.json` — authorization server JWKS for validating the JARM response signature
   - `s-hash-pairs.json` — array of known `state` / `s_hash` pairs for deterministic testing (SHA-256 left-half, base64url-encoded)

**Acceptance Criteria (Given/When/Then)**

- **AC-S.11c.1** Given the `spec/capabilities.md` JARM and transaction binding section is reviewed, when each normative statement is checked, then every statement includes an explicit spec or RFC section reference (FAPI 2.0 §5.3.3; OpenID JARM §2, §2.3).
- **AC-S.11c.2** Given the conformance test definition file `spec/conformance/fapi2-jarm.json` is reviewed, when the test case list is checked, then it contains exactly three test cases (FAPI-005, FAPI-007, FAPI-009) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.11c.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.11c.4** Given the `s_hash` test fixtures, when the `state`/`s_hash` pairs are validated, then each pair is independently verifiable by computing `BASE64URL(LEFT_HALF(SHA256(state)))` and comparing to the expected `s_hash` value.
- **AC-S.11c.5** Given the JARM test fixtures, when the JARM JWT is validated against the provided JWKS, then the signature verification succeeds and the extracted `code` and `state` claims match the expected values.
- **AC-S.11c.6** Given test case FAPI-009, when reviewed, then the negative test case explicitly requires that the library reject the non-JARM response and raise a descriptive error, rather than silently proceeding.

**Unit Test Requirements** (shared across S.11a, S.11b, S.11c)

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Validate that all `s-hash-pairs.json` entries are mathematically correct (`BASE64URL(LEFT_HALF(SHA256(state)))` matches expected `s_hash`).
- Validate that the DPoP proof fixture JWT structure contains all required claims and header parameters per RFC 9449 §4.3.
- Validate that the JARM fixture JWT can be decoded and its header contains `alg` and `kid` fields.
- Validate that the mTLS fixture token response contains a `cnf` claim with an `x5t#S256` member.

**Integration Test Requirements** (shared across S.11a, S.11b, S.11c)

- When a language implementation claims FAPI 2.0 conformance, run all FAPI-* test cases against a mock authorization server and PAR endpoint. The mock must:
  - Accept PAR requests and return `request_uri` values.
  - Return JARM-encoded authorization responses (signed JWTs).
  - Validate DPoP proofs on the token endpoint and return DPoP-bound access tokens with `cnf.jkt`.
  - Return mTLS certificate-bound access tokens with `cnf.x5t#S256`.
  - Return ID Tokens containing `s_hash` claims.
  - Enforce strict redirect URI matching.
- The implementation must pass all eleven tests (FAPI-001 through FAPI-011).

**Example Requirements** (shared across S.11a, S.11b, S.11c)

- Include a worked example in the capabilities spec showing a complete FAPI 2.0-compliant authorization flow from PAR request through DPoP-bound token acquisition, with annotated request/response pairs and spec/RFC section references at each step.
- Include a second worked example showing JARM response validation, including JWT decoding, signature verification, and `code`/`state` extraction.

**Spec and RFC References**

- [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-2_0-security-profile.html) — §1 (Introduction), §5.3.2 (Authorization Server requirements / Client requirements), §5.3.3 (ID Token as detached signature)
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) — §4.1 (Code Verifier), §4.2 (Code Challenge), §4.3 (Authorization Request)
- [RFC 9126 — OAuth 2.0 Pushed Authorization Requests (PAR)](https://datatracker.ietf.org/doc/html/rfc9126) — §2 (Pushed Authorization Request Endpoint)
- [RFC 9449 — OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://datatracker.ietf.org/doc/html/rfc9449) — §4 (DPoP Proof JWTs), §4.3 (Checking DPoP Proofs), §6.1 (JWK Thumbprint Confirmation Method)
- [RFC 8705 — OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens](https://datatracker.ietf.org/doc/html/rfc8705) — §3 (Mutual-TLS Client Certificate-Bound Access Tokens)
- [OpenID JARM — JWT Secured Authorization Response Mode](https://openid.net/specs/oauth-v2-jarm.html) — §2 (JWT-Encoded Authorization Response), §2.3 (Processing Rules)
- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) — §4.1 (Authorization Code Grant)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics) — §2.1.1 (PKCE), §4.11 (Open Redirection)
