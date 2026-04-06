---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0E-LOGOUT'
epic_title: 'Conformance Specification — OIDC Logout Mechanisms'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0b-ecosystem-research.md
  - _bmad-output/planning-artifacts/epics/epic-0c-spec-jwt-validation.md
  - _bmad-output/planning-artifacts/epics/epic-0d-spec-token-flows.md
---

# Epic 0E-LOGOUT: Conformance Specification — OIDC Logout Mechanisms

## Overview

This epic defines the cross-language conformance specification and test definitions for all OpenID Connect logout mechanisms in the identity-model project. These artifacts are language-agnostic: they specify **what** each implementation must support and **how** conformance is verified, without prescribing language-specific code.

The logout specification is split into two stories:

- **S.10a** — RP-Initiated Logout and Front-Channel Logout (browser-facing mechanisms): end-session URL construction, state validation, and front-channel iframe logout.
- **S.10b** — Back-Channel Logout and Session Management (server-side mechanisms): logout token validation, rejection of malformed tokens, and session state polling.

Each story produces three deliverables:

1. A section in `spec/capabilities.md` documenting the capability with normative spec references.
2. A conformance test definition file (`spec/conformance/*.json`) with structured test cases that any language implementation can consume.
3. Test fixture files (`spec/test-fixtures/`) with sample tokens, URLs, and responses for deterministic testing.

These artifacts directly drive the implementation stories in Epics 1 (Python), 2 (Node.js), 3 (Go), and 4 (Rust).

## Stories

---

### Story S.10a: RP-Initiated & Front-Channel Logout Spec

```yaml
story_id: S.10a
title: "RP-Initiated & Front-Channel Logout Spec"
epic: EPIC-0E-LOGOUT
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, spec-grounded specification and conformance test definitions for RP-Initiated Logout and Front-Channel Logout,
> so that I can implement and verify browser-based logout flows — end-session URL construction, state validation on redirect, and front-channel iframe logout — against a single authoritative source of truth.

**Description**

Define the cross-language specification and conformance test definitions for RP-Initiated Logout and Front-Channel Logout. These are the browser-facing logout mechanisms where the RP initiates logout via redirect or the OP notifies RPs via hidden iframes.

**Deliverables**

1. **`spec/capabilities.md` section** covering:

   - **RP-Initiated Logout** ([OpenID Connect RP-Initiated Logout 1.0 §2](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)):
     - Build `end_session_endpoint` URL with the following parameters:
       - `id_token_hint` — the ID Token previously issued to the RP, passed as a hint about the End-User's current authenticated session
       - `post_logout_redirect_uri` — the URL to which the OP will redirect after logout
       - `state` — opaque value for maintaining state between the logout request and the callback
       - `client_id` — the RP's client identifier (used when `id_token_hint` is not provided)
     - `end_session_endpoint` discovered from the OP's discovery document ([OpenID Connect Discovery 1.0 §3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata))

   - **Front-Channel Logout** ([OpenID Connect Front-Channel Logout 1.0 §2](https://openid.net/specs/openid-connect-frontchannel-1_0.html#RPLogout)):
     - `frontchannel_logout_uri` — RP-registered URI that the OP renders in a hidden iframe to effect logout
     - `frontchannel_logout_session_required` — boolean indicating whether the OP must include `sid` (session ID) and `iss` (issuer) query parameters in the `frontchannel_logout_uri`
     - Iframe-based logout handling: the OP loads each registered RP's `frontchannel_logout_uri` in a hidden iframe during session termination

2. **`spec/conformance/logout-rp-frontchannel.json`** with test cases:
   - **LOGOUT-001**: Build RP-Initiated logout URL with all parameters — given an `end_session_endpoint`, `id_token_hint`, `post_logout_redirect_uri`, `state`, and `client_id`, when the logout URL is constructed, then the resulting URL contains all parameters as query string values appended to the `end_session_endpoint` (RP-Initiated Logout 1.0 §2)
   - **LOGOUT-002**: Build logout URL with only `id_token_hint` — given an `end_session_endpoint` and `id_token_hint` (no `post_logout_redirect_uri`, no `state`, no `client_id`), when the logout URL is constructed, then the resulting URL contains only `id_token_hint` as a query parameter (RP-Initiated Logout 1.0 §2)
   - **LOGOUT-003**: Validate `state` on post-logout redirect — given a logout request was sent with a `state` value, when the OP redirects to the `post_logout_redirect_uri` with a `state` parameter, then the library verifies the returned `state` matches the original value and raises an error on mismatch (RP-Initiated Logout 1.0 §2)
   - **LOGOUT-008**: Handle front-channel logout URI construction — given an RP's `frontchannel_logout_uri` and `frontchannel_logout_session_required=true`, when the front-channel logout URI is constructed by the OP, then the resulting URL includes `iss` and `sid` as query parameters appended to the `frontchannel_logout_uri` (Front-Channel Logout 1.0 §2)

3. **`spec/test-fixtures/logout/`** fixtures for this story:
   - `end-session-url-all-params.json` — expected logout URL components with all RP-Initiated parameters
   - `end-session-url-minimal.json` — expected logout URL with only `id_token_hint`
   - `frontchannel-logout-uri-with-session.json` — front-channel logout URI with `iss` and `sid` query parameters
   - `discovery-logout-metadata.json` — sample discovery document fragment containing `end_session_endpoint`, `check_session_iframe`, `frontchannel_logout_supported`, `frontchannel_logout_session_supported`, `backchannel_logout_supported`, `backchannel_logout_session_supported`

**Acceptance Criteria (Given/When/Then)**

- **AC-S.10a.1** Given the `spec/capabilities.md` RP-Initiated and Front-Channel Logout section is reviewed, when each normative statement is checked, then every statement includes an explicit spec section reference (RP-Initiated Logout 1.0 §2, Front-Channel Logout 1.0 §2, OpenID Connect Discovery 1.0 §3).
- **AC-S.10a.2** Given the conformance test definition file `spec/conformance/logout-rp-frontchannel.json` is reviewed, when the test case list is checked, then it contains exactly four test cases (LOGOUT-001, LOGOUT-002, LOGOUT-003, LOGOUT-008) each with: `id`, `title`, `description`, `spec_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.10a.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.10a.4** Given the `end_session_endpoint` URL construction test cases (LOGOUT-001, LOGOUT-002), when reviewed, then they cover both the full-parameter case and the minimal case, and the expected URLs are deterministically verifiable.
- **AC-S.10a.5** Given the front-channel logout test case (LOGOUT-008), when reviewed, then it explicitly requires the inclusion of `iss` and `sid` query parameters when `frontchannel_logout_session_required` is `true`.
- **AC-S.10a.6** Given the discovery document fixture, when reviewed, then it contains all logout-related metadata fields defined across the four logout specifications.

---

### Story S.10b: Back-Channel Logout & Session Management Spec

```yaml
story_id: S.10b
title: "Back-Channel Logout & Session Management Spec"
epic: EPIC-0E-LOGOUT
status: draft
priority: high
estimation: M
```

**User Story**

> As a library implementer working on any identity-model language SDK,
> I want a precise, spec-grounded specification and conformance test definitions for Back-Channel Logout and Session Management,
> so that I can implement and verify server-side logout token validation and session state polling against a single authoritative source of truth.

**Description**

Define the cross-language specification and conformance test definitions for Back-Channel Logout and Session Management. These are the server-side mechanisms where the OP sends logout tokens directly to RPs or RPs poll for session state changes.

**Deliverables**

1. **`spec/capabilities.md` section** covering:

   - **Back-Channel Logout** ([OpenID Connect Back-Channel Logout 1.0 §2](https://openid.net/specs/openid-connect-backchannel-1_0.html#BCLogout)):
     - Receive and validate Logout Token — a JWT with an `events` claim containing the member name `http://schemas.openid.net/event/backchannel-logout` (value is an empty JSON object `{}`)
     - Logout Token validation rules:
       - Must contain `iss`, `iat`, `aud`, `jti`, and `events` claims
       - Must contain either `sub` or `sid` (or both)
       - Must NOT contain a `nonce` claim
       - `events` claim must contain the `http://schemas.openid.net/event/backchannel-logout` member
       - Standard JWT validation applies (signature, `exp` if present, `iss`, `aud`)
     - `backchannel_logout_uri` — RP-registered URI where the OP sends the Logout Token via HTTP POST
     - `backchannel_logout_session_required` — boolean indicating whether the OP must include a `sid` claim in the Logout Token

   - **Session Management** ([OpenID Connect Session Management 1.0 §2](https://openid.net/specs/openid-connect-session-1_0.html#OPiframe)):
     - `check_session_iframe` — OP-provided URL for an iframe that supports session state polling via `postMessage`
     - OP iframe receives `postMessage` with `"client_id origin"` and responds with `"changed"`, `"unchanged"`, or `"error"`
     - Session state string: opaque value provided by the OP in the authentication response, used by the RP to detect session changes

2. **`spec/conformance/logout-backchannel-session.json`** with test cases:
   - **LOGOUT-004**: Parse and validate back-channel logout token — given a well-formed Logout Token JWT containing `iss`, `sub`, `aud`, `iat`, `jti`, and `events` (with `http://schemas.openid.net/event/backchannel-logout` member), when the token is validated, then it is accepted as a valid Logout Token (Back-Channel Logout 1.0 §2.4)
   - **LOGOUT-005**: Reject logout token with missing `events` claim — given a JWT that is otherwise valid but does not contain an `events` claim, when it is validated as a Logout Token, then validation fails with an appropriate error indicating the missing `events` claim (Back-Channel Logout 1.0 §2.4)
   - **LOGOUT-006**: Reject logout token with wrong `events` claim value — given a JWT with an `events` claim that does not contain the `http://schemas.openid.net/event/backchannel-logout` member, when it is validated as a Logout Token, then validation fails with an appropriate error indicating the incorrect `events` value (Back-Channel Logout 1.0 §2.4)
   - **LOGOUT-007**: Reject expired logout token — given a Logout Token JWT with an `exp` claim in the past, when it is validated, then validation fails with an appropriate expiration error (Back-Channel Logout 1.0 §2.4, RFC 7519 §4.1.4)
   - **LOGOUT-009**: Reject logout token with neither `sub` nor `sid` — given a JWT with an `events` claim containing the `http://schemas.openid.net/event/backchannel-logout` member but missing both `sub` and `sid` claims, when validated as a Logout Token, then validation fails with an appropriate error indicating that at least one of `sub` or `sid` must be present (Back-Channel Logout 1.0 §2.4)
   - **LOGOUT-010**: Reject logout token containing `nonce` claim — given a JWT with a `nonce` claim, when validated as a Logout Token, then validation fails with an appropriate error indicating that Logout Tokens must not contain a `nonce` claim per Back-Channel Logout 1.0 §2.4

3. **`spec/test-fixtures/logout/`** fixtures for this story:
   - `backchannel-logout-token-valid.json` — well-formed Logout Token JWT payload with all required claims including `events`
   - `backchannel-logout-token-missing-events.json` — Logout Token JWT payload missing the `events` claim
   - `backchannel-logout-token-wrong-events.json` — Logout Token JWT payload with `events` claim containing an incorrect member name
   - `backchannel-logout-token-expired.json` — Logout Token JWT payload with `exp` in the past
   - `backchannel-logout-token-no-sub-no-sid.json` — Logout Token JWT payload with `events` claim present but both `sub` and `sid` claims missing
   - `backchannel-logout-token-with-nonce.json` — Logout Token JWT payload containing a `nonce` claim that must be rejected

**Acceptance Criteria (Given/When/Then)**

- **AC-S.10b.1** Given the `spec/capabilities.md` Back-Channel Logout and Session Management section is reviewed, when each normative statement is checked, then every statement includes an explicit spec section reference (Back-Channel Logout 1.0 §2, §2.4, Session Management 1.0 §2).
- **AC-S.10b.2** Given the conformance test definition file `spec/conformance/logout-backchannel-session.json` is reviewed, when the test case list is checked, then it contains exactly six test cases (LOGOUT-004, LOGOUT-005, LOGOUT-006, LOGOUT-007, LOGOUT-009, LOGOUT-010) each with: `id`, `title`, `description`, `spec_references` (array of section links), `given`/`when`/`then` fields, and `fixture_files` (array of paths to test fixture files used by the test).
- **AC-S.10b.3** Given a test case in the conformance file, when its `given`/`when`/`then` fields are reviewed, then they are precise enough for a developer to implement the test in any language without ambiguity.
- **AC-S.10b.4** Given the back-channel logout token fixtures, when each fixture is validated, then the valid token fixture contains the `http://schemas.openid.net/event/backchannel-logout` member in its `events` claim, and the invalid fixtures each violate exactly one validation rule.
- **AC-S.10b.5** Given test case LOGOUT-009, when reviewed, then it explicitly requires rejection when both `sub` and `sid` are absent, matching the Back-Channel Logout 1.0 §2.4 requirement that at least one must be present.
- **AC-S.10b.6** Given test case LOGOUT-010, when reviewed, then it explicitly requires rejection when a `nonce` claim is present, matching the Back-Channel Logout 1.0 §2.4 prohibition against `nonce` in Logout Tokens.

**Unit Test Requirements** (shared across S.10a, S.10b)

- Validate that each conformance test case JSON entry conforms to the conformance test schema (`spec/conformance/schema.json`).
- Validate that all `fixture_files` references in conformance test cases resolve to existing files in `spec/test-fixtures/`.
- Validate that the back-channel logout token fixtures are well-formed JWT payloads (valid JSON with the expected claim structure).
- Validate that URL construction fixtures produce deterministic, reproducible URLs when parameters are applied in a canonical order.

**Integration Test Requirements** (shared across S.10a, S.10b)

- When a language implementation claims conformance, run all LOGOUT-* test cases. The implementation must:
  - Correctly construct RP-Initiated logout URLs from discovery metadata and provided parameters (LOGOUT-001, LOGOUT-002).
  - Validate `state` round-trip on post-logout redirect (LOGOUT-003).
  - Accept valid back-channel logout tokens and reject invalid ones (LOGOUT-004 through LOGOUT-007, LOGOUT-009, LOGOUT-010).
  - Construct front-channel logout URIs with session parameters when required (LOGOUT-008).
- The implementation must pass all ten tests (LOGOUT-001 through LOGOUT-010).

**Example Requirements** (shared across S.10a, S.10b)

- Include a worked example in the capabilities spec showing:
  1. An RP-Initiated logout URL constructed from a discovery document's `end_session_endpoint` with annotated query parameters.
  2. A complete back-channel Logout Token with annotated claims, including the `events` claim structure.
  3. A front-channel logout iframe scenario showing the `frontchannel_logout_uri` with `iss` and `sid` parameters.

**Spec References**

- [OpenID Connect RP-Initiated Logout 1.0 §2 — RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html#RPLogout)
- [OpenID Connect Front-Channel Logout 1.0 §2 — RP-Initiated Logout](https://openid.net/specs/openid-connect-frontchannel-1_0.html#RPLogout)
- [OpenID Connect Back-Channel Logout 1.0 §2 — Backchannel Logout](https://openid.net/specs/openid-connect-backchannel-1_0.html#BCLogout)
- [OpenID Connect Back-Channel Logout 1.0 §2.4 — Logout Token Validation](https://openid.net/specs/openid-connect-backchannel-1_0.html#Validation)
- [OpenID Connect Session Management 1.0 §2 — OP iframe](https://openid.net/specs/openid-connect-session-1_0.html#OPiframe)
- [OpenID Connect Discovery 1.0 §3 — Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [RFC 7519 §4.1.4 — "exp" (Expiration Time) Claim](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4)
