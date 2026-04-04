---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0E'
epic_title: 'Conformance Specification — Dynamic Client Registration'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0b-ecosystem-research.md
---

# Epic 0E: Conformance Specification — Dynamic Client Registration

## Overview

This epic defines the cross-language conformance specification and test definitions for OpenID Connect Dynamic Client Registration in the identity-model project. These artifacts are language-agnostic: they specify **what** each implementation must support and **how** conformance is verified, without prescribing language-specific code.

Dynamic Client Registration enables relying parties to programmatically register with OpenID Providers without manual pre-registration. This capability is required for OpenID Foundation Dynamic RP certification.

Each story produces three deliverables:

1. A section in `spec/capabilities.md` documenting the capability with normative RFC references.
2. A conformance test definition file (`spec/conformance/*.json`) with structured test cases that any language implementation can consume.
3. Test fixture files (`spec/test-fixtures/`) with sample requests and responses for deterministic testing.

These artifacts directly drive the implementation stories in Epics 1 (Python), 2 (Node.js), 3 (Go), and 4 (Rust).

## Stories

---

### Story S.9: Dynamic Client Registration Spec + Conformance Tests

```yaml
story_id: S.9
title: "Dynamic Client Registration Spec + Conformance Tests"
epic: EPIC-0E
status: draft
priority: high
estimation: L
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, RFC-grounded specification and a complete set of conformance test definitions for Dynamic Client Registration and Client Configuration management,
> so that I can implement the registration flow required for OpenID Foundation Dynamic RP certification against a single authoritative source of truth.

**Description**

Define the cross-language specification and conformance test definitions for Dynamic Client Registration (RFC 7591) and Client Registration Management (RFC 7592). This covers the full lifecycle: registering a new client with an OpenID Provider, receiving a registration access token for subsequent management, and reading or updating the client configuration through the Client Configuration Endpoint.

**Deliverables**

1. **`spec/capabilities.md` section** covering:
   - Client Registration Request ([RFC 7591 §2](https://datatracker.ietf.org/doc/html/rfc7591#section-2)): POST to the registration endpoint with client metadata in the request body as a JSON object
   - Client metadata fields ([RFC 7591 §2](https://datatracker.ietf.org/doc/html/rfc7591#section-2)):
     - `redirect_uris` (REQUIRED for clients using flows with redirection)
     - `response_types` (e.g., `code`, `token`)
     - `grant_types` (e.g., `authorization_code`, `implicit`, `refresh_token`, `client_credentials`)
     - `application_type` (`web` or `native`)
     - `contacts` (array of email addresses)
     - `client_name` (human-readable name)
     - `logo_uri` (URL for the client logo)
     - `client_uri` (URL for the client home page)
     - `policy_uri` (URL for the client privacy policy)
     - `tos_uri` (URL for the client terms of service)
     - `token_endpoint_auth_method` (e.g., `client_secret_basic`, `client_secret_post`, `none`)
     - `scope` (space-separated list of scope values)
   - Client Registration Response ([RFC 7591 §3.2](https://datatracker.ietf.org/doc/html/rfc7591#section-3.2)): `client_id` (REQUIRED), `client_secret` (if applicable), `client_id_issued_at`, `client_secret_expires_at`, plus all registered metadata
   - Registration Access Token ([RFC 7592 §1.1](https://datatracker.ietf.org/doc/html/rfc7592#section-1.1)): `registration_access_token` and `registration_client_uri` returned alongside the registration response for subsequent management operations
   - Client Configuration Endpoint ([RFC 7592 §2](https://datatracker.ietf.org/doc/html/rfc7592#section-2)): GET to read current client configuration, PUT to update client configuration, using the registration access token as a Bearer token in the `Authorization` header
   - Error responses ([RFC 7591 §3.2.2](https://datatracker.ietf.org/doc/html/rfc7591#section-3.2.2)): `invalid_redirect_uri` (one or more `redirect_uris` values are invalid), `invalid_client_metadata` (the client metadata is invalid or inconsistent)

2. **`spec/conformance/dynamic-registration.json`** with test cases:
   - **DYN-001**: Register client with minimum required metadata — POST to the registration endpoint with only `redirect_uris`; verify the response contains `client_id`, `client_id_issued_at`, `registration_access_token`, and `registration_client_uri` (RFC 7591 §2, §3.2; RFC 7592 §1.1)
   - **DYN-002**: Register client with full metadata — POST to the registration endpoint with all supported metadata fields (`redirect_uris`, `response_types`, `grant_types`, `application_type`, `contacts`, `client_name`, `logo_uri`, `client_uri`, `policy_uri`, `tos_uri`, `token_endpoint_auth_method`, `scope`); verify the response echoes all provided metadata alongside `client_id`, `client_secret`, `client_id_issued_at`, `client_secret_expires_at`, `registration_access_token`, and `registration_client_uri` (RFC 7591 §2, §3.2; RFC 7592 §1.1)
   - **DYN-003**: Read client configuration via registration access token — GET the `registration_client_uri` with the `registration_access_token` as a Bearer token; verify the response contains the current client configuration matching what was registered (RFC 7592 §2)
   - **DYN-004**: Handle `invalid_redirect_uri` error — POST to the registration endpoint with a malformed or disallowed `redirect_uris` value; verify the response is HTTP 400 with `error=invalid_redirect_uri` (RFC 7591 §3.2.2)
   - **DYN-005**: Handle `invalid_client_metadata` error — POST to the registration endpoint with inconsistent or malformed metadata (e.g., `grant_types` includes `authorization_code` but `response_types` does not include `code`); verify the response is HTTP 400 with `error=invalid_client_metadata` (RFC 7591 §3.2.2)

3. **`spec/test-fixtures/dynamic-registration/`** with sample requests and responses:
   - `registration-request-minimal.json` — request body with only `redirect_uris`
   - `registration-request-full.json` — request body with all supported metadata fields
   - `registration-response-minimal.json` — 201 response with `client_id`, `client_id_issued_at`, `registration_access_token`, `registration_client_uri`, and echoed `redirect_uris`
   - `registration-response-full.json` — 201 response with all metadata fields, `client_id`, `client_secret`, `client_id_issued_at`, `client_secret_expires_at`, `registration_access_token`, and `registration_client_uri`
   - `config-read-response.json` — 200 response from GET to the Client Configuration Endpoint containing current client configuration
   - `error-invalid-redirect-uri.json` — 400 response with `error=invalid_redirect_uri` and `error_description`
   - `error-invalid-client-metadata.json` — 400 response with `error=invalid_client_metadata` and `error_description`

**Acceptance Criteria (Given/When/Then)**

- **AC-S.9.1** Given the `spec/capabilities.md` Dynamic Client Registration section is reviewed, when each normative statement is checked, then every statement includes an explicit RFC section reference (RFC 7591 §2, §3.2, §3.2.2; RFC 7592 §1.1, §2).
- **AC-S.9.2** Given the conformance test definition file `spec/conformance/dynamic-registration.json` is reviewed, when the test case list is checked, then it contains exactly five test cases (DYN-001 through DYN-005) each with: `id`, `title`, `description`, `rfc_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.9.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.9.4** Given the `spec/test-fixtures/dynamic-registration/` directory is reviewed, when each fixture file is validated, then it is well-formed JSON matching the HTTP request or response body the test expects.
- **AC-S.9.5** Given the registration response fixtures, when reviewed, then every response that includes a `client_secret` also includes `client_secret_expires_at`, and every response includes `registration_access_token` and `registration_client_uri` per RFC 7592 §1.1.
- **AC-S.9.6** Given the error test cases (DYN-004, DYN-005), when reviewed, then each covers a distinct error code (`invalid_redirect_uri`, `invalid_client_metadata`) with a specific trigger condition and expected HTTP status.
- **AC-S.9.7** Given test case DYN-003, when reviewed, then it specifies using the `registration_access_token` from a prior registration response as a Bearer token and validates that the returned configuration matches the originally registered metadata.

**Unit Test Requirements**

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Validate that all registration response fixtures contain the REQUIRED fields per RFC 7591 §3.2 (`client_id`) and RFC 7592 §1.1 (`registration_access_token`, `registration_client_uri`).

**Integration Test Requirements**

- When a language implementation claims conformance, run all DYN-* test cases against a mock registration endpoint that accepts metadata and returns the corresponding fixture responses. The mock must also expose a Client Configuration Endpoint that returns the registered metadata on GET. The implementation must pass all five tests.

**Example Requirements**

- Include a worked example in the capabilities spec showing a complete Dynamic Client Registration cycle: POST registration request with metadata, receive registration response with credentials and access token, then GET the Client Configuration Endpoint to read back the configuration. Annotate headers and body with RFC section references at each step.

**RFC References**

- [RFC 7591 §2 — Client Registration Request](https://datatracker.ietf.org/doc/html/rfc7591#section-2)
- [RFC 7591 §3.2 — Client Registration Response](https://datatracker.ietf.org/doc/html/rfc7591#section-3.2)
- [RFC 7591 §3.2.2 — Client Registration Error Response](https://datatracker.ietf.org/doc/html/rfc7591#section-3.2.2)
- [RFC 7592 §1.1 — Registration Access Token](https://datatracker.ietf.org/doc/html/rfc7592#section-1.1)
- [RFC 7592 §2 — Client Configuration Endpoint](https://datatracker.ietf.org/doc/html/rfc7592#section-2)
