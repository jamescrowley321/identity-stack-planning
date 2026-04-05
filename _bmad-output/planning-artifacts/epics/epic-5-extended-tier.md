---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics.md
---

# Epic 5: Extended Tier — All Languages

## Overview

This document covers Epic 5 for the identity-model multi-language OIDC/OAuth2 client library project:

- **Epic 5 — Extended Tier (All Languages):** Token Introspection, Revocation, Exchange, and DPoP across Python, Node/TypeScript, Go, and Rust

This epic builds on top of the Foundation and Core tiers, adding protocol capabilities that differentiate identity-model from existing single-language libraries.

Implement Token Introspection (RFC 7662), Token Revocation (RFC 7009), Token Exchange (RFC 8693), and DPoP (RFC 9449) across all four language SDKs (Python, Node/TypeScript, Go, Rust) with a consistent API surface and shared test vectors.

## Story Decomposition

Each protocol capability below is described as a single cross-language story for specification clarity. During sprint planning, each MUST be decomposed into per-language implementation stories (e.g., 5.1-py, 5.1-node, 5.1-go, 5.1-rust) following the same pattern established in the Core Tier epics (Epics 1-4). Each per-language story should be independently estimable and deliverable.

## Story 5.1: Token Introspection (RFC 7662) — All Languages

### User Story

**As a** backend service developer using any of the four identity-model SDKs,
**I want** to introspect access and refresh tokens at the authorization server's introspection endpoint,
**So that** I can determine whether a token is active, retrieve its metadata (scopes, expiration, client_id), and make authorization decisions without relying solely on local JWT validation.

### Acceptance Criteria

**Given** a valid OAuth2 client with introspection endpoint credentials,
**When** I call the introspection method with an access token or refresh token,
**Then** the library sends a POST request conforming to [RFC 7662 §2.1](https://www.rfc-editor.org/rfc/rfc7662#section-2.1) with the `token` parameter and optional `token_type_hint`, and returns a parsed introspection response conforming to [RFC 7662 §2.2](https://www.rfc-editor.org/rfc/rfc7662#section-2.2) including at minimum the `active` boolean field.

**Given** the authorization server returns `"active": false`,
**When** the introspection response is parsed,
**Then** the library returns an introspection result indicating the token is inactive, and no other claims are guaranteed per [RFC 7662 §2.2](https://www.rfc-editor.org/rfc/rfc7662#section-2.2).

**Given** the authorization server returns `"active": true` with metadata,
**When** the introspection response is parsed,
**Then** the library exposes all standard introspection response fields (`scope`, `client_id`, `username`, `token_type`, `exp`, `iat`, `nbf`, `sub`, `aud`, `iss`, `jti`) as typed properties, with unknown fields preserved as extension data.

**Given** the introspection endpoint is discovered via OIDC discovery,
**When** the discovery document contains an `introspection_endpoint` field,
**Then** the library automatically uses that endpoint without requiring manual configuration.

**Given** any language SDK,
**When** introspection is implemented,
**Then** the implementation includes:
- Unit tests covering active/inactive responses, malformed responses, error responses, and all standard fields
- Integration tests against at least one real or simulated authorization server (e.g., Keycloak, mock server)
- A working example in each language demonstrating introspection of an access token with result inspection

### RFC References

- [RFC 7662 §2 — Introspection Endpoint](https://www.rfc-editor.org/rfc/rfc7662#section-2)
- [RFC 7662 §2.1 — Introspection Request](https://www.rfc-editor.org/rfc/rfc7662#section-2.1)
- [RFC 7662 §2.2 — Introspection Response](https://www.rfc-editor.org/rfc/rfc7662#section-2.2)

---

## Story 5.2: Token Revocation (RFC 7009) — All Languages

### User Story

**As a** developer building logout or session management flows,
**I want** to revoke access tokens and refresh tokens at the authorization server's revocation endpoint,
**So that** compromised or no-longer-needed tokens are immediately invalidated server-side, reducing the window of exposure.

### Acceptance Criteria

**Given** a valid OAuth2 client with revocation endpoint credentials,
**When** I call the revocation method with a token and optional `token_type_hint` (either `access_token` or `refresh_token`),
**Then** the library sends a POST request conforming to [RFC 7009 §2.1](https://www.rfc-editor.org/rfc/rfc7009#section-2.1) with the `token` parameter and client authentication.

**Given** the authorization server successfully revokes the token,
**When** the revocation response is received,
**Then** the library returns a success result, and the HTTP response status is 200 per [RFC 7009 §2.2](https://www.rfc-editor.org/rfc/rfc7009#section-2.2), regardless of whether the token was valid (the server treats invalid tokens as already revoked).

**Given** the revocation request fails due to an invalid client or unsupported token type,
**When** the error response is received,
**Then** the library returns a structured error with the OAuth2 error code (`unsupported_token_type`, `invalid_client`, etc.) per [RFC 7009 §2.2.1](https://www.rfc-editor.org/rfc/rfc7009#section-2.2.1).

**Given** the revocation endpoint is discovered via OIDC discovery,
**When** the discovery document contains a `revocation_endpoint` field,
**Then** the library automatically uses that endpoint without requiring manual configuration.

**Given** any language SDK,
**When** revocation is implemented,
**Then** the implementation includes:
- Unit tests covering successful revocation, already-revoked tokens, error responses, and both token type hints
- Integration tests against at least one real or simulated authorization server confirming the revoked token is no longer accepted
- A working example in each language demonstrating revocation of a refresh token during logout

### RFC References

- [RFC 7009 §2 — Token Revocation](https://www.rfc-editor.org/rfc/rfc7009#section-2)
- [RFC 7009 §2.1 — Revocation Request](https://www.rfc-editor.org/rfc/rfc7009#section-2.1)
- [RFC 7009 §2.2 — Revocation Response](https://www.rfc-editor.org/rfc/rfc7009#section-2.2)

---

## Story 5.3: Token Exchange (RFC 8693) — All Languages

### User Story

**As a** developer building microservice architectures with delegation or impersonation patterns,
**I want** to exchange one token for another via the authorization server's token endpoint using the token exchange grant type,
**So that** I can obtain scoped-down tokens for downstream services, perform delegation flows, or impersonate users in a standards-compliant manner.

### Acceptance Criteria

**Given** a valid OAuth2 client and a subject token (e.g., an access token),
**When** I call the token exchange method with the subject token and a requested token type,
**Then** the library sends a POST request to the token endpoint with `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` conforming to [RFC 8693 §2.1](https://www.rfc-editor.org/rfc/rfc8693#section-2.1), including `subject_token`, `subject_token_type`, and optional `resource`, `audience`, `scope`, `requested_token_type`, `actor_token`, and `actor_token_type` parameters.

**Given** the authorization server issues an exchanged token,
**When** the response is received,
**Then** the library parses the response per [RFC 8693 §2.2](https://www.rfc-editor.org/rfc/rfc8693#section-2.2) and returns the `access_token`, `issued_token_type`, `token_type`, `expires_in`, optional `scope`, and optional `refresh_token`.

**Given** a delegation scenario,
**When** both `subject_token` and `actor_token` are provided,
**Then** the library includes both tokens in the request with their respective token type URIs per [RFC 8693 §3](https://www.rfc-editor.org/rfc/rfc8693#section-3), supporting `urn:ietf:params:oauth:token-type:access_token`, `urn:ietf:params:oauth:token-type:refresh_token`, `urn:ietf:params:oauth:token-type:id_token`, `urn:ietf:params:oauth:token-type:saml1`, `urn:ietf:params:oauth:token-type:saml2`, and `urn:ietf:params:oauth:token-type:jwt`.

**Given** the exchange request fails,
**When** the error response is received,
**Then** the library returns a structured OAuth2 error including the error code, description, and URI.

**Given** any language SDK,
**When** token exchange is implemented,
**Then** the implementation includes:
- Unit tests covering delegation (subject + actor), impersonation (subject only), all token type URIs from [RFC 8693 §3](https://www.rfc-editor.org/rfc/rfc8693#section-3), error responses, and optional parameter combinations
- Integration tests against at least one real or simulated authorization server demonstrating a successful exchange flow
- A working example in each language demonstrating both delegation and impersonation token exchange patterns

### RFC References

- [RFC 8693 §2.1 — Token Exchange Request](https://www.rfc-editor.org/rfc/rfc8693#section-2.1)
- [RFC 8693 §2.2 — Token Exchange Response](https://www.rfc-editor.org/rfc/rfc8693#section-2.2)
- [RFC 8693 §3 — Token Type Identifiers](https://www.rfc-editor.org/rfc/rfc8693#section-3)

---

## Story 5.4: DPoP — Demonstrating Proof of Possession (RFC 9449) — All Languages

### User Story

**As a** security-conscious developer building applications that handle sensitive resources,
**I want** to bind access tokens to client key pairs using DPoP proof JWTs,
**So that** stolen tokens cannot be replayed by attackers who do not possess the private key, providing sender-constrained token security without requiring mTLS.

### Acceptance Criteria

**Given** a client with a generated asymmetric key pair,
**When** I initiate a token request with DPoP enabled,
**Then** the library generates a DPoP proof JWT conforming to [RFC 9449 §4](https://www.rfc-editor.org/rfc/rfc9449#section-4), including the `typ` header set to `dpop+jwt`, the `jwk` header containing the public key, and claims `jti`, `htm`, `htu`, and `iat`, and attaches it as the `DPoP` header on the token request per [RFC 9449 §5](https://www.rfc-editor.org/rfc/rfc9449#section-5).

**Given** the authorization server returns a DPoP-bound access token (with `token_type` of `DPoP`),
**When** I access a protected resource,
**Then** the library generates a new DPoP proof JWT for that resource request including the `ath` (access token hash) claim per [RFC 9449 §7](https://www.rfc-editor.org/rfc/rfc9449#section-7), and sends the access token in the `Authorization: DPoP` header alongside the `DPoP` proof header.

**Given** the authorization server returns a `use_dpop_nonce` error with a `DPoP-Nonce` response header,
**When** the nonce is received,
**Then** the library automatically retries the request including the `nonce` claim in the DPoP proof JWT per [RFC 9449 §10](https://www.rfc-editor.org/rfc/rfc9449#section-10), and caches the nonce for subsequent requests to the same server.

**Given** the client needs to generate or manage DPoP key pairs,
**When** the DPoP module is used,
**Then** the library provides key pair generation helpers supporting at minimum ES256 and RS256 algorithms, key persistence/loading from PEM or JWK, and key pair rotation without breaking existing bound tokens.

**Given** any language SDK,
**When** DPoP is implemented,
**Then** the implementation includes:
- Unit tests covering DPoP proof JWT generation and structure validation, `ath` claim computation, nonce handling and retry, key pair generation for ES256 and RS256, and error cases (missing key, invalid algorithm)
- Integration tests against at least one real or simulated authorization server demonstrating a full DPoP flow (token request with proof, resource access with bound token)
- A working example in each language demonstrating end-to-end DPoP: key generation, token acquisition with DPoP proof, and protected resource access

### RFC References

- [RFC 9449 §4 — DPoP Proof JWTs](https://www.rfc-editor.org/rfc/rfc9449#section-4)
- [RFC 9449 §5 — DPoP Token Request](https://www.rfc-editor.org/rfc/rfc9449#section-5)
- [RFC 9449 §7 — Protected Resource Access](https://www.rfc-editor.org/rfc/rfc9449#section-7)
- [RFC 9449 §10 — Authorization Server-Provided Nonce](https://www.rfc-editor.org/rfc/rfc9449#section-10)

