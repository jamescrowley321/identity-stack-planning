---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-1'
epic_title: 'Core Tier — Python Alignment'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 1: Core Tier — Python Alignment

## Overview

py-identity-model (v2.17.1) already implements most Core-tier capabilities: OIDC Discovery, JWKS fetching, JWT validation, Client Credentials, and UserInfo. This epic closes the remaining gaps and aligns every module against the new cross-language conformance spec so that all `DISC-*`, `JWK-*`, `VAL-*`, `CC-*`, and `UI-*` conformance tests pass.

The single net-new implementation is the Authorization Code + PKCE flow, which is currently absent from py-identity-model.

## Target Modules

| Module | Path | Conformance Suite |
|--------|------|-------------------|
| `discovery.py` | `py-identity-model/identity_model/discovery.py` | DISC-* |
| `jwks.py` | `py-identity-model/identity_model/jwks.py` | JWK-* |
| `token_validation.py` | `py-identity-model/identity_model/token_validation.py` | VAL-* |
| `token_client.py` | `py-identity-model/identity_model/token_client.py` | CC-*, AUTHZ-* |
| `identity.py` | `py-identity-model/identity_model/identity.py` | UI-* |
| Supporting | `jwk/`, `aio/`, `sync/`, `client/`, `core/`, `messages/`, `exceptions.py` | — |

## Stories

---

### Story 1.1 — Align OIDC Discovery with Conformance Spec

**User Story**

> As a library consumer,
> I want py-identity-model's OIDC Discovery implementation to be fully conformant with the cross-language spec,
> so that I can rely on consistent provider metadata retrieval regardless of which identity-model language binding I use.

**Description**

Verify and, where necessary, fix `discovery.py` so that it passes every `DISC-*` conformance test. This includes well-known endpoint construction, required-field validation of the OpenID Provider Configuration document, and correct error handling for unreachable or malformed discovery responses.

**Acceptance Criteria**

- **AC-1.1.1** Given a standards-compliant OIDC provider, when `discover()` is called with the issuer URL, then the returned `ProviderConfiguration` contains all required fields per [OIDC Discovery 1.0 section 3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata) (issuer, authorization_endpoint, token_endpoint, jwks_uri, response_types_supported, subject_types_supported, id_token_signing_alg_values_supported).
- **AC-1.1.2** Given a discovery document whose `issuer` value does not match the requested issuer, when `discover()` is called, then it raises an `IssuerMismatchError`.
- **AC-1.1.3** Given an unreachable or non-JSON discovery endpoint, when `discover()` is called, then it raises an appropriate `DiscoveryError` with a meaningful message.
- **AC-1.1.4** Given the discovery implementation, when the conformance harness executes all `DISC-*` tests, then every test passes.
- **AC-1.1.5** Unit tests cover: required field validation, issuer mismatch detection, malformed JSON handling, network error handling, and cache behavior.
- **AC-1.1.6** Integration tests run against node-oidc-provider and verify end-to-end discovery retrieval, including cache refresh.
- **AC-1.1.7** A working usage example is added to `examples/` demonstrating OIDC Discovery with at least two providers (e.g., node-oidc-provider and a public provider).

**RFC References**

- [OIDC Discovery 1.0 section 3 — Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [OIDC Discovery 1.0 section 4 — Obtaining OpenID Provider Configuration Information](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)

---

### Story 1.2 — Align JWKS + JWT Validation with Conformance Spec

**User Story**

> As a library consumer,
> I want py-identity-model's JWKS retrieval and JWT validation to be fully conformant with the cross-language spec,
> so that token signature verification is reliable, handles key rotation gracefully, and behaves identically across all identity-model language bindings.

**Description**

Verify and fix `jwks.py` and `token_validation.py` so that all `JWK-*` and `VAL-*` conformance tests pass. This story explicitly addresses issue #219 (JWKS cache TTL with forced refresh on signature verification failure) and the `kid` fallback logic when a JWT header contains no `kid` and the JWKS contains a single key versus multiple keys.

**Acceptance Criteria**

- **AC-1.2.1** Given a JWKS endpoint returning multiple keys, when a JWT with a `kid` header is validated, then the correct key is selected by `kid` match per [RFC 7515 section 4.1.4](https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4).
- **AC-1.2.2** Given a JWKS endpoint returning a single key and a JWT with no `kid` header, when the JWT is validated, then the single available key is used as a fallback.
- **AC-1.2.3** Given a JWKS endpoint returning multiple keys and a JWT with no `kid` header, when the JWT is validated, then an appropriate error is raised indicating key ambiguity.
- **AC-1.2.4** Given a cached JWKS and a JWT signed with a rotated key (unknown `kid`), when validation fails with the cached JWKS, then the library performs a forced JWKS refresh and retries validation exactly once (issue #219).
- **AC-1.2.5** Given a JWT, when validation is performed, then all registered claims are checked per [RFC 7519 section 4.1](https://www.rfc-editor.org/rfc/rfc7519#section-4.1): `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`.
- **AC-1.2.6** Given a JWT with `alg: none` in the header, when validation is performed, then it is rejected.
- **AC-1.2.7** Given the implementation, when the conformance harness executes all `JWK-*` and `VAL-*` tests, then every test passes.
- **AC-1.2.8** Unit tests cover: kid matching, kid fallback (single key), kid ambiguity (multiple keys, no kid), cache TTL expiry, forced refresh on unknown kid, all registered claim validations, alg:none rejection, expired/not-yet-valid tokens.
- **AC-1.2.9** Integration tests run against node-oidc-provider and verify end-to-end JWKS retrieval, key rotation (forced refresh), and JWT validation.
- **AC-1.2.10** A working usage example is added to `examples/` demonstrating JWKS-based JWT validation including cache refresh behavior.

**RFC References**

- [RFC 7517 section 4 — JWK Format](https://www.rfc-editor.org/rfc/rfc7517#section-4)
- [RFC 7517 section 5 — JWK Set Format](https://www.rfc-editor.org/rfc/rfc7517#section-5)
- [RFC 7519 section 4.1 — Registered Claim Names](https://www.rfc-editor.org/rfc/rfc7519#section-4.1)
- [RFC 7519 section 7.2 — Validating a JWT](https://www.rfc-editor.org/rfc/rfc7519#section-7.2)
- [RFC 7515 section 4.1 — Registered Header Parameter Names (kid, alg)](https://www.rfc-editor.org/rfc/rfc7515#section-4.1)

---

### Story 1.3 — Implement Authorization Code + PKCE Flow

**User Story**

> As a library consumer,
> I want py-identity-model to support the Authorization Code + PKCE flow,
> so that I can implement secure, standards-compliant user authentication in web and native applications without relying on external libraries.

**Description**

This is a **net-new implementation** -- py-identity-model does not currently have Authorization Code or PKCE support. Implement the full flow: authorization URL construction with PKCE parameters (code_verifier, code_challenge, code_challenge_method), authorization response handling, and token exchange. Both sync and async APIs must be provided following the existing `aio/` and `sync/` patterns.

**Acceptance Criteria**

- **AC-1.3.1** Given a client configuration, when an authorization URL is constructed, then it includes all required parameters per [RFC 6749 section 4.1.1](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1): `response_type=code`, `client_id`, `redirect_uri`, `scope`, and `state`.
- **AC-1.3.2** Given PKCE is enabled (default), when an authorization URL is constructed, then a cryptographically random `code_verifier` (43-128 characters, unreserved characters per [RFC 7636 section 4.1](https://www.rfc-editor.org/rfc/rfc7636#section-4.1)) is generated and the derived `code_challenge` using S256 method per [RFC 7636 section 4.2](https://www.rfc-editor.org/rfc/rfc7636#section-4.2) is included in the request.
- **AC-1.3.3** Given an authorization response containing a `code`, when the token exchange is performed, then the request includes the `code_verifier` per [RFC 7636 section 4.5](https://www.rfc-editor.org/rfc/rfc7636#section-4.5) and the token endpoint returns access and ID tokens per [RFC 6749 section 5.1](https://www.rfc-editor.org/rfc/rfc6749#section-5.1).
- **AC-1.3.4** Given an authorization response containing an `error` parameter, when the response is processed, then an appropriate exception is raised with the error code and description per [RFC 6749 section 4.1.2.1](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2.1).
- **AC-1.3.5** Given a token response containing an ID token, when it is processed, then the ID token is validated per [OIDC Core 1.0 section 3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation) including `nonce` validation when present.
- **AC-1.3.6** Given the implementation, when the conformance harness executes all `AUTHZ-*` and `PKCE-*` tests, then every test passes.
- **AC-1.3.7** Both sync (`sync/`) and async (`aio/`) API surfaces are provided, consistent with existing py-identity-model patterns.
- **AC-1.3.8** Unit tests cover: code_verifier generation (length, character set), code_challenge derivation (S256), authorization URL construction, state parameter handling, authorization error responses, token exchange request formatting, token exchange error handling, ID token validation during exchange.
- **AC-1.3.9** Integration tests run against node-oidc-provider and verify the complete Authorization Code + PKCE flow end-to-end including token exchange and ID token validation.
- **AC-1.3.10** A working usage example is added to `examples/` demonstrating the full Authorization Code + PKCE flow with a local callback server.

**RFC References**

- [RFC 6749 section 4.1 — Authorization Code Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)
- [RFC 7636 section 4.1 — code_verifier](https://www.rfc-editor.org/rfc/rfc7636#section-4.1)
- [RFC 7636 section 4.2 — code_challenge_method](https://www.rfc-editor.org/rfc/rfc7636#section-4.2)
- [RFC 7636 section 4.3 — code_challenge in Authorization Request](https://www.rfc-editor.org/rfc/rfc7636#section-4.3)
- [RFC 7636 section 4.6 — Server Verifies code_verifier](https://www.rfc-editor.org/rfc/rfc7636#section-4.6)
- [RFC 6749 section 5.1 — Successful Access Token Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.1)
- [RFC 6749 section 5.2 — Error Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)
- [OIDC Core 1.0 section 3.1.3.7 — ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

---

### Story 1.4 — Align Client Credentials Flow with Conformance Spec

**User Story**

> As a library consumer,
> I want py-identity-model's Client Credentials flow to be fully conformant with the cross-language spec,
> so that machine-to-machine token acquisition is reliable and behaves identically across all identity-model language bindings.

**Description**

Verify and fix `token_client.py` so that all `CC-*` conformance tests pass. This includes correct token request formatting, client authentication methods (client_secret_basic, client_secret_post), scope handling, and error response parsing.

**Acceptance Criteria**

- **AC-1.4.1** Given valid client credentials, when a Client Credentials token request is made per [RFC 6749 section 4.4](https://www.rfc-editor.org/rfc/rfc6749#section-4.4), then an access token response is returned containing at minimum `access_token`, `token_type`, and optionally `expires_in` and `scope` per [RFC 6749 section 5.1](https://www.rfc-editor.org/rfc/rfc6749#section-5.1).
- **AC-1.4.2** Given `client_secret_basic` authentication, when the token request is sent, then the `Authorization` header contains a properly Base64-encoded `client_id:client_secret` value with URL-encoded components.
- **AC-1.4.3** Given `client_secret_post` authentication, when the token request is sent, then `client_id` and `client_secret` are included in the request body.
- **AC-1.4.4** Given invalid client credentials, when a token request is made, then the error response is parsed per [RFC 6749 section 5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2) and an appropriate exception is raised containing `error`, `error_description`, and `error_uri` when present.
- **AC-1.4.5** Given a request with a `scope` parameter, when the token request is sent, then scopes are space-delimited in the request body.
- **AC-1.4.6** Given the implementation, when the conformance harness executes all `CC-*` tests, then every test passes.
- **AC-1.4.7** Unit tests cover: request body formatting, client_secret_basic header encoding (including special characters), client_secret_post body inclusion, successful response parsing, error response parsing, missing/extra fields handling.
- **AC-1.4.8** Integration tests run against node-oidc-provider and verify end-to-end Client Credentials token acquisition with both authentication methods.
- **AC-1.4.9** A working usage example is added to `examples/` demonstrating Client Credentials flow with scope selection and token introspection.

**RFC References**

- [RFC 6749 section 4.4 — Client Credentials Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.4)
- [RFC 6749 section 5.1 — Successful Access Token Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.1)
- [RFC 6749 section 5.2 — Error Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)

---

### Story 1.5 — Align UserInfo Endpoint with Conformance Spec

**User Story**

> As a library consumer,
> I want py-identity-model's UserInfo implementation to be fully conformant with the cross-language spec,
> so that I can reliably retrieve and validate user claims from any OIDC provider.

**Description**

Verify and fix `identity.py` so that all `UI-*` conformance tests pass. This story explicitly addresses `sub` mismatch validation: the UserInfo response `sub` must match the `sub` claim in the ID token, and the library must raise an error if they differ per OIDC Core 1.0 section 5.3.4.

**Acceptance Criteria**

- **AC-1.5.1** Given a valid access token, when the UserInfo endpoint is called, then the response is parsed and standard claims are available per [OIDC Core 1.0 section 5.1](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims).
- **AC-1.5.2** Given a UserInfo response and a previously obtained ID token, when the `sub` claim in the UserInfo response does not match the `sub` claim in the ID token, then a `SubMismatchError` is raised per [OIDC Core 1.0 section 5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse).
- **AC-1.5.3** Given an expired or invalid access token, when the UserInfo endpoint is called, then the HTTP error is handled and an appropriate exception is raised.
- **AC-1.5.4** Given a UserInfo endpoint that returns a JWT (signed response), when the response is processed, then the JWT is validated before claims are extracted.
- **AC-1.5.5** Given the implementation, when the conformance harness executes all `UI-*` tests, then every test passes.
- **AC-1.5.6** Unit tests cover: successful JSON response parsing, successful JWT response parsing and validation, sub mismatch detection, invalid/expired token error handling, missing required claims handling.
- **AC-1.5.7** Integration tests run against node-oidc-provider and verify end-to-end UserInfo retrieval including sub validation against the ID token.
- **AC-1.5.8** A working usage example is added to `examples/` demonstrating UserInfo retrieval with sub mismatch validation.

**RFC References**

- [OIDC Core 1.0 section 5.1 — Standard Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)
- [OIDC Core 1.0 section 5.3 — UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
- [OIDC Core 1.0 section 5.3.4 — UserInfo Response Validation](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse)

---

## Dependencies

- **node-oidc-provider** Docker image for integration tests (all stories)
- **Cross-language conformance spec** finalized with test IDs: `DISC-*`, `JWK-*`, `VAL-*`, `CC-*`, `UI-*`, `AUTHZ-*`, `PKCE-*`
- Story 1.3 (Auth Code + PKCE) is net-new and has no dependency on existing module alignment; it can proceed in parallel with Stories 1.1, 1.2, 1.4, and 1.5

## Story Sequencing

| Order | Story | Rationale |
|-------|-------|-----------|
| 1 | 1.1 Discovery | Foundation — all other flows depend on discovery metadata |
| 2 | 1.2 JWKS + JWT Validation | Required by token validation in all subsequent flows |
| 3 | 1.4 Client Credentials | Simplest token flow; validates token_client.py plumbing |
| 4 | 1.5 UserInfo | Depends on having valid access tokens (from 1.4 or 1.3) |
| 5 | 1.3 Auth Code + PKCE | Net-new; most complex; benefits from validated discovery + JWKS + token infrastructure |

Stories 1.1 and 1.2 can run in parallel. Stories 1.4 and 1.5 can run in parallel after 1.2 completes.
