---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0B-SPEC'
epic_title: 'Conformance Specification — OIDC Discovery & JWKS/JWK'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-1-core-python.md
---

# Epic 0B-SPEC: Conformance Specification — OIDC Discovery & JWKS/JWK

## Overview

This epic defines the cross-language conformance specification and test definitions for two foundational identity-model capabilities: OIDC Discovery and JWKS/JWK handling. These specifications are language-agnostic — they describe **what** every identity-model implementation must do and provide machine-readable conformance test case definitions that each language binding's test harness will execute.

The deliverables are specification documents, conformance test case JSON files, and test fixture data. No application code is produced by this epic; implementation happens in language-specific epics (Epic 1 for Python, Epic 3 for Go, Epic 4 for Rust, etc.).

## Stories

---

### Story S.1 — OIDC Discovery Capability Spec + Conformance Tests

**User Story**

> As a contributor implementing identity-model in any supported language,
> I want a precise, cross-language specification and set of conformance test definitions for OIDC Discovery,
> so that every implementation handles provider metadata retrieval, validation, caching, and error cases identically.

**Description**

Author the OIDC Discovery section of `spec/capabilities.md`, a machine-readable conformance test definition file at `spec/conformance/discovery.json`, and sample test fixture documents under `spec/test-fixtures/discovery/`. Together these artifacts define the behavioral contract that every language binding must satisfy.

#### spec/capabilities.md — Discovery Section

The capabilities document must specify the following behaviors:

- **Fetch .well-known/openid-configuration** — Construct the discovery URL per [OIDC Discovery 1.0 §4.1 (Request)](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationRequest) and retrieve the JSON document per [§4.2 (Response)](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationResponse).
- **Validate required metadata fields** — The response MUST contain the following fields per [OIDC Discovery 1.0 §3 (Provider Metadata)](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata): `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`.
- **Issuer validation** — The `issuer` value in the response MUST exactly match the issuer used to construct the discovery URL per [OIDC Discovery 1.0 §4.3 (Validation)](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation). A mismatch MUST produce an error.
- **Cache discovery document with configurable TTL** — Implementations MUST cache the parsed discovery document. The cache TTL MUST be configurable (default: implementation-defined). A cache hit MUST NOT trigger a network request. After TTL expiry the next call MUST re-fetch.
- **Handle network errors, invalid JSON, missing required fields** — Implementations MUST surface distinct, typed errors for: HTTP transport failures, non-JSON response bodies, and missing required metadata fields.

#### spec/conformance/discovery.json — Test Case Definitions

| Test ID  | Title                                    | Description |
|----------|------------------------------------------|-------------|
| DISC-001 | Fetch and parse valid discovery document | Given a reachable issuer with a valid `.well-known/openid-configuration`, when discovery is invoked, then the returned metadata contains all required fields with correct types. |
| DISC-002 | Validate all required fields present     | Given a discovery document missing zero required fields, when field validation runs, then validation passes and all seven required fields are accessible. |
| DISC-003 | Detect issuer mismatch                   | Given a discovery document whose `issuer` value differs from the requested issuer, when discovery is invoked, then an issuer-mismatch error is raised per §4.3. |
| DISC-004 | Cache hit on second fetch within TTL     | Given a successful discovery fetch, when discovery is invoked again before the TTL expires, then no HTTP request is made and the cached document is returned. |
| DISC-005 | Cache miss after TTL expiry              | Given a cached discovery document whose TTL has expired, when discovery is invoked, then a new HTTP request is made and the cache is refreshed. |
| DISC-006 | Handle HTTP error (404, 500)             | Given an issuer whose discovery endpoint returns HTTP 404 or 500, when discovery is invoked, then a transport/HTTP error is raised with the status code. |
| DISC-007 | Handle invalid JSON response             | Given an issuer whose discovery endpoint returns a non-JSON body (e.g., HTML), when discovery is invoked, then a parse error is raised. |
| DISC-008 | Handle missing required field            | Given a discovery document that omits one or more required fields (e.g., `jwks_uri` is absent), when field validation runs, then a validation error is raised identifying the missing field(s). |

#### spec/test-fixtures/discovery/

Sample discovery documents to be used by conformance test harnesses:

- `valid.json` — A complete, standards-compliant discovery document with all required and common optional fields.
- `missing-jwks-uri.json` — A discovery document identical to `valid.json` but with `jwks_uri` removed.
- `missing-multiple-fields.json` — A discovery document missing `token_endpoint` and `subject_types_supported`.
- `issuer-mismatch.json` — A discovery document whose `issuer` value does not match the expected issuer (e.g., trailing slash difference or entirely different domain).

**Acceptance Criteria (Given/When/Then)**

- **AC-S.1.1** Given the `spec/capabilities.md` Discovery section, when reviewed against this story, then it covers all five specified behaviors (fetch, validate required fields, issuer validation, caching with configurable TTL, error handling) with normative language (MUST/SHOULD/MAY) and links to the corresponding OIDC Discovery 1.0 sections.
- **AC-S.1.2** Given `spec/conformance/discovery.json`, when parsed, then it contains exactly eight test case definitions (DISC-001 through DISC-008) each with: `id`, `title`, `description`, `given`, `when`, `then`, and `references` (RFC/spec section links).
- **AC-S.1.3** Given `spec/test-fixtures/discovery/`, when the directory is listed, then it contains at least four fixture files: `valid.json`, `missing-jwks-uri.json`, `missing-multiple-fields.json`, `issuer-mismatch.json`.
- **AC-S.1.4** Given `valid.json`, when parsed, then it contains all seven required OIDC Discovery metadata fields with syntactically correct values.
- **AC-S.1.5** Given any fixture file with intentional defects (missing field, issuer mismatch), when parsed, then the defect is clearly present and no other unintentional differences exist relative to `valid.json`.

**Unit Test Requirements**

- Parse each fixture file and assert its structural properties (field presence/absence, issuer value).
- Validate that `discovery.json` is well-formed JSON, all eight test IDs are present, and each test case contains all required keys.

**Integration Test Requirements**

- Stand up a mock OIDC provider (e.g., via HTTP stub or node-oidc-provider) that serves each fixture file at the `.well-known/openid-configuration` endpoint, and execute the DISC-001 through DISC-008 scenarios end-to-end.

**Example Requirements**

- Provide a runnable example (in at least one language) that fetches real discovery metadata from a public OIDC provider (e.g., Google, Microsoft) and prints the required fields, demonstrating the capability described in the spec.

**RFC / Spec References**

- [OIDC Discovery 1.0 §3 — OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [OIDC Discovery 1.0 §4.1 — OpenID Provider Configuration Request](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationRequest)
- [OIDC Discovery 1.0 §4.2 — OpenID Provider Configuration Response](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationResponse)
- [OIDC Discovery 1.0 §4.3 — OpenID Provider Configuration Validation](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation)

---

### Story S.2 — JWKS/JWK Capability Spec + Conformance Tests

**User Story**

> As a contributor implementing identity-model in any supported language,
> I want a precise, cross-language specification and set of conformance test definitions for JWKS retrieval and JWK handling,
> so that every implementation fetches key sets, resolves signing keys, handles key rotation, and caches correctly in an identical manner.

**Description**

Author the JWKS/JWK section of `spec/capabilities.md`, a machine-readable conformance test definition file at `spec/conformance/jwks.json`, and sample test fixture data under `spec/test-fixtures/jwks/`. These artifacts define the behavioral contract for JWKS retrieval and JWK key resolution that every language binding must satisfy.

#### spec/capabilities.md — JWKS/JWK Section

The capabilities document must specify the following behaviors:

- **Fetch JWKS from jwks_uri** — Retrieve the JWK Set document from the `jwks_uri` obtained during OIDC Discovery per [RFC 7517 §5 (JWK Set Format)](https://www.rfc-editor.org/rfc/rfc7517#section-5). The response MUST be a JSON object containing a `keys` array.
- **Parse JWK parameters** — Each key in the `keys` array MUST be parsed for the standard parameters per [RFC 7517 §4 (JWK Format)](https://www.rfc-editor.org/rfc/rfc7517#section-4): `kty` (required), `use`, `key_ops`, `alg`, `kid`.
- **Support RSA key type** — Implementations MUST support RSA public keys with parameters `n` (modulus) and `e` (exponent) per [RFC 7518 §6.3 (Parameters for RSA Keys)](https://www.rfc-editor.org/rfc/rfc7518#section-6.3).
- **Support EC key type** — Implementations MUST support Elliptic Curve public keys with parameters `crv`, `x`, and `y` per [RFC 7518 §6.2 (Parameters for Elliptic Curve Keys)](https://www.rfc-editor.org/rfc/rfc7518#section-6.2).
- **Resolve signing key by kid** — When a JWS header contains a `kid` parameter per [RFC 7515 §4.1.4 ("kid" Header Parameter)](https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4), the implementation MUST select the JWK from the set whose `kid` matches.
- **Handle missing kid** — When the JWS header does not contain a `kid`:
  - If the JWKS contains exactly one key, the implementation MUST use that key as a fallback per [RFC 7515 §4.1.4](https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4).
  - If the JWKS contains multiple keys, the implementation MUST raise an error indicating key ambiguity.
- **Cache JWKS with TTL** — Implementations MUST cache the fetched JWKS. The cache TTL MUST be configurable (default: implementation-defined). Cache behavior mirrors the discovery caching contract.
- **Force refresh on signature verification failure (cache bypass)** — When signature verification fails with the cached JWKS (e.g., due to key rotation), implementations MUST perform exactly one forced JWKS re-fetch bypassing the cache and retry verification. If verification fails again after the refresh, the error is surfaced.
- **Handle key rotation gracefully** — The combination of cache TTL and forced refresh MUST ensure that key rotation at the provider does not cause prolonged verification failures.

#### spec/conformance/jwks.json — Test Case Definitions

| Test ID  | Title                                    | Description |
|----------|------------------------------------------|-------------|
| JWK-001  | Fetch and parse valid JWKS               | Given a reachable `jwks_uri` returning a valid JWK Set, when the JWKS is fetched, then the `keys` array is parsed and each key's `kty` and `kid` are accessible. |
| JWK-002  | Resolve key by kid                       | Given a JWKS containing multiple keys, when a JWS with a `kid` header is presented, then the key with the matching `kid` is returned. |
| JWK-003  | Fallback to single key when JWT has no kid | Given a JWKS containing exactly one key and a JWS with no `kid` header, when key resolution is invoked, then the single key is returned. |
| JWK-004  | Error when no kid and multiple keys      | Given a JWKS containing multiple keys and a JWS with no `kid` header, when key resolution is invoked, then a key-ambiguity error is raised. |
| JWK-005  | Cache hit within TTL                     | Given a successful JWKS fetch, when JWKS is requested again before the TTL expires, then no HTTP request is made and the cached JWKS is returned. |
| JWK-006  | Force refresh bypasses cache             | Given a cached JWKS, when a force refresh is triggered (e.g., due to signature verification failure), then a new HTTP request is made regardless of TTL and the cache is updated. |
| JWK-007  | Handle RSA key type                      | Given a JWKS containing an RSA key (`kty: "RSA"`), when the key is parsed, then the `n` and `e` parameters are correctly decoded and the key is usable for signature verification. |
| JWK-008  | Handle EC key type                       | Given a JWKS containing an EC key (`kty: "EC"`), when the key is parsed, then the `crv`, `x`, and `y` parameters are correctly decoded and the key is usable for signature verification. |
| JWK-009  | Reject unsupported key type              | Given a JWKS containing a key with an unsupported `kty` (e.g., `"oct"` for symmetric or a fabricated value), when key resolution is invoked for that key, then an unsupported-key-type error is raised. |
| JWK-010  | Handle empty JWKS                        | Given a `jwks_uri` that returns `{"keys": []}`, when the JWKS is fetched, then the implementation returns an empty key set and subsequent key resolution attempts raise appropriate errors. |

#### spec/test-fixtures/jwks/

Sample JWK Set documents to be used by conformance test harnesses:

- `rsa-single.json` — A JWK Set containing a single RSA public key with `kid`, `kty`, `use`, `n`, `e`.
- `ec-single.json` — A JWK Set containing a single EC public key (P-256) with `kid`, `kty`, `use`, `crv`, `x`, `y`.
- `multiple-keys.json` — A JWK Set containing at least two keys (one RSA, one EC) with distinct `kid` values.
- `single-key-no-kid.json` — A JWK Set containing a single RSA key without a `kid` parameter (tests fallback behavior).
- `empty.json` — A JWK Set with an empty `keys` array: `{"keys": []}`.

**Acceptance Criteria (Given/When/Then)**

- **AC-S.2.1** Given the `spec/capabilities.md` JWKS/JWK section, when reviewed against this story, then it covers all nine specified behaviors (fetch, parse, RSA support, EC support, kid resolution, missing kid handling, caching, force refresh, key rotation) with normative language (MUST/SHOULD/MAY) and links to the corresponding RFC sections.
- **AC-S.2.2** Given `spec/conformance/jwks.json`, when parsed, then it contains exactly ten test case definitions (JWK-001 through JWK-010) each with: `id`, `title`, `description`, `given`, `when`, `then`, and `references` (RFC section links).
- **AC-S.2.3** Given `spec/test-fixtures/jwks/`, when the directory is listed, then it contains at least five fixture files: `rsa-single.json`, `ec-single.json`, `multiple-keys.json`, `single-key-no-kid.json`, `empty.json`.
- **AC-S.2.4** Given `rsa-single.json`, when parsed, then it contains a valid RSA public key with `kty: "RSA"` and base64url-encoded `n` and `e` values that decode to a valid RSA public key.
- **AC-S.2.5** Given `ec-single.json`, when parsed, then it contains a valid EC public key with `kty: "EC"`, `crv: "P-256"`, and base64url-encoded `x` and `y` values that decode to valid curve coordinates.
- **AC-S.2.6** Given `multiple-keys.json`, when parsed, then it contains at least two keys with distinct `kid` values and at least one RSA and one EC key.
- **AC-S.2.7** Given `empty.json`, when parsed, then it contains `{"keys": []}` and nothing else.

**Unit Test Requirements**

- Parse each fixture file and assert structural properties (key count, `kty` values, parameter presence).
- Validate that `jwks.json` is well-formed JSON, all ten test IDs are present, and each test case contains all required keys.
- For RSA and EC fixtures, verify that the key material decodes correctly (base64url decode `n`, `e`, `x`, `y` to byte arrays of expected lengths).

**Integration Test Requirements**

- Stand up a mock JWKS endpoint that serves each fixture file, and execute the JWK-001 through JWK-010 scenarios end-to-end.
- For cache tests (JWK-005, JWK-006), instrument the mock to count HTTP requests and assert that cached responses avoid extra fetches while force refresh triggers exactly one additional fetch.

**Example Requirements**

- Provide a runnable example (in at least one language) that fetches a real JWKS from a public OIDC provider's `jwks_uri` (obtained via discovery), prints each key's `kid` and `kty`, and demonstrates key resolution by `kid`.

**RFC / Spec References**

- [RFC 7517 §4 — JSON Web Key (JWK) Format](https://www.rfc-editor.org/rfc/rfc7517#section-4)
- [RFC 7517 §5 — JWK Set Format](https://www.rfc-editor.org/rfc/rfc7517#section-5)
- [RFC 7518 §6.2 — Parameters for Elliptic Curve Keys](https://www.rfc-editor.org/rfc/rfc7518#section-6.2)
- [RFC 7518 §6.3 — Parameters for RSA Keys](https://www.rfc-editor.org/rfc/rfc7518#section-6.3)
- [RFC 7515 §4.1.4 — "kid" (Key ID) Header Parameter](https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4)
