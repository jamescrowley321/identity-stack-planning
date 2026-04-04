---
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# Epic 4: Core Tier — Rust (identity-model)

## Overview

GREENFIELD implementation of an OIDC/OAuth2.0 client library in Rust, published as `identity-model` on crates.io. This epic delivers feature parity with the core OIDC Relying Party capabilities needed for discovery, key resolution, JWT validation, token acquisition (client credentials, authorization code + PKCE), and UserInfo retrieval.

### Tech Decisions

| Decision | Choice |
|----------|--------|
| Edition | Rust 2024 |
| MSRV | 1.75+ |
| HTTP client | reqwest (async) with rustls |
| JWT | jsonwebtoken crate |
| Async runtime | tokio |
| Error handling | thiserror; `Result<T, IdentityError>` everywhere |
| Configuration | Builder patterns |
| Crate name | `identity-model` (crates.io) |

### RFC & Specification References

| Spec | URL | Relevant Sections |
|------|-----|-------------------|
| OIDC Discovery 1.0 | https://openid.net/specs/openid-connect-discovery-1_0.html | §3, §4 |
| RFC 7517 (JWK) | https://www.rfc-editor.org/rfc/rfc7517 | §4, §5 |
| RFC 7519 (JWT) | https://www.rfc-editor.org/rfc/rfc7519 | §4.1, §7.2 |
| RFC 7515 (JWS) | https://www.rfc-editor.org/rfc/rfc7515 | §4.1 |
| RFC 6749 (OAuth 2.0) | https://www.rfc-editor.org/rfc/rfc6749 | §4.1, §4.4, §5.1, §5.2 |
| RFC 7636 (PKCE) | https://www.rfc-editor.org/rfc/rfc7636 | §4.1–§4.6 |
| OIDC Core 1.0 | https://openid.net/specs/openid-connect-core-1_0.html | §3.1.3.7, §5.1, §5.3 |

---

## Story List

| Story | Title | Description |
|-------|-------|-------------|
| 4.1 | Project Scaffolding | Cargo.toml, module structure, CI, README |
| 4.2 | OIDC Discovery Client | Async discovery fetch, deserialization, caching with TTL |
| 4.3 | JWKS Client + Key Resolution | Fetch, cache, and resolve keys by kid |
| 4.4 | JWT Validation | Signature and claims validation with builder options |
| 4.5 | Client Credentials + Authorization Code + PKCE | Token endpoint client with PKCE support |
| 4.6 | UserInfo Endpoint | Fetch and validate UserInfo claims |

---

## Story 4.1: Project Scaffolding

As a Rust developer,
I want a well-structured crate with idiomatic module layout, CI, and documentation,
So that I can begin implementing OIDC/OAuth2 features on a solid foundation.

**Acceptance Criteria:**

- [ ] **Given** a new Rust project is initialized
  **When** `Cargo.toml` is reviewed
  **Then** it declares `name = "identity-model"`, `edition = "2024"`, `rust-version = "1.75"`, and lists `reqwest` (with `rustls-tls` feature), `jsonwebtoken`, `tokio`, `thiserror`, `serde`, and `serde_json` as dependencies

- [ ] **Given** the `src/` directory is created
  **When** the module structure is reviewed
  **Then** it contains `src/lib.rs` and submodules: `src/discovery/`, `src/jwks/`, `src/jwt/`, `src/token/`, `src/userinfo/`, and `src/error.rs`

- [ ] **Given** `src/error.rs` defines the crate error type
  **When** the error type is reviewed
  **Then** `IdentityError` is an enum using `#[derive(thiserror::Error)]` with variants for HTTP, deserialization, validation, and configuration errors, and all public functions return `Result<T, IdentityError>`

- [ ] **Given** `src/lib.rs` re-exports public types
  **When** the public API surface is reviewed
  **Then** key types from each submodule are re-exported at the crate root for ergonomic use

- [ ] **Given** a `.github/workflows/ci.yml` is created
  **When** a PR is opened
  **Then** CI runs `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and `cargo doc --no-deps` against the MSRV (1.75) and stable toolchains

- [ ] **Given** a `README.md` is created at the crate root
  **When** it is reviewed
  **Then** it includes a crate description, MSRV badge, usage example showing discovery + token validation, and links to the RFC specifications listed above

- [ ] **Given** unit tests exist in `src/error.rs`
  **When** `cargo test` is run
  **Then** tests under `#[cfg(test)]` verify `IdentityError` display messages and `From` conversions

- [ ] **Given** an integration test file exists at `tests/scaffolding.rs`
  **When** `cargo test` is run
  **Then** it verifies that the crate compiles and public re-exports are accessible

- [ ] **Given** an `examples/` directory exists
  **When** `examples/basic_setup.rs` is reviewed
  **Then** it demonstrates importing the crate, constructing a placeholder config with builder pattern, and printing the module structure

**References:**
- Rust Edition Guide: https://doc.rust-lang.org/edition-guide/
- Cargo manifest: https://doc.rust-lang.org/cargo/reference/manifest.html

---

## Story 4.2: OIDC Discovery Client

As a Rust developer,
I want to fetch and cache an OIDC provider's discovery document,
So that my application can dynamically resolve provider endpoints without hardcoding URLs.

**Acceptance Criteria:**

- [ ] **Given** a valid OIDC issuer URL
  **When** `DiscoveryClient::discover(issuer_url)` is called
  **Then** it performs an async HTTP GET to `{issuer_url}/.well-known/openid-configuration` and returns a deserialized `ProviderMetadata` struct
  *(OIDC Discovery 1.0 §4)*

- [ ] **Given** the discovery response JSON
  **When** it is deserialized with serde
  **Then** the `ProviderMetadata` struct contains all REQUIRED fields: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`, plus RECOMMENDED and OPTIONAL fields as `Option<T>`
  *(OIDC Discovery 1.0 §3)*

- [ ] **Given** a `ProviderMetadata` is deserialized
  **When** validation runs
  **Then** it rejects documents where `issuer` does not exactly match the requested issuer URL (case-sensitive, no trailing slash normalization)
  *(OIDC Discovery 1.0 §3)*

- [ ] **Given** a `DiscoveryClient` with caching enabled
  **When** `discover()` is called twice within the TTL window
  **Then** the second call returns the cached result without an HTTP request; the cache uses `tokio::sync::RwLock` for thread-safe async access

- [ ] **Given** a cached discovery document
  **When** the TTL expires
  **Then** the next call to `discover()` fetches a fresh document from the provider and updates the cache

- [ ] **Given** the discovery endpoint returns a non-200 status or invalid JSON
  **When** `discover()` is called
  **Then** it returns `Err(IdentityError::Http(...))` or `Err(IdentityError::Deserialization(...))` with a descriptive message

- [ ] **Given** unit tests exist in `src/discovery/`
  **When** `cargo test` is run
  **Then** tests under `#[cfg(test)]` verify: successful deserialization, issuer mismatch rejection, missing required field rejection, and cache TTL behavior (using mocked time or short TTL)

- [ ] **Given** integration tests exist in `tests/discovery.rs`
  **When** `cargo test` is run against a running node-oidc-provider
  **Then** tests verify: fetching a real discovery document, validating required fields are present, and confirming the `issuer` value matches

- [ ] **Given** an example file `examples/discovery.rs` exists
  **When** it is reviewed
  **Then** it demonstrates creating a `DiscoveryClient`, fetching metadata from a configurable issuer URL (via env var), and printing key endpoint URLs

**References:**
- OIDC Discovery 1.0 §3 (Provider Metadata): https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
- OIDC Discovery 1.0 §4 (Obtaining Configuration): https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationRequest

---

## Story 4.3: JWKS Client + Key Resolution

As a Rust developer,
I want to fetch, cache, and resolve JSON Web Keys by `kid`,
So that my application can verify JWT signatures using the correct key material from the provider.

**Acceptance Criteria:**

- [ ] **Given** a `jwks_uri` from the discovery document
  **When** `JwksClient::fetch(jwks_uri)` is called
  **Then** it performs an async HTTP GET and returns a deserialized `JsonWebKeySet` containing a `Vec<JsonWebKey>`
  *(RFC 7517 §5)*

- [ ] **Given** a `JsonWebKey` struct
  **When** the JWKS response is deserialized
  **Then** each key contains `kty`, `kid`, `use`, and `alg` fields; RSA keys include `n` and `e`; EC keys include `crv`, `x`, and `y`
  *(RFC 7517 §4)*

- [ ] **Given** a cached `JsonWebKeySet`
  **When** `resolve_key(kid)` is called
  **Then** it returns the `JsonWebKey` matching the given `kid`, or `Err(IdentityError::KeyNotFound)` if no match exists

- [ ] **Given** a JWT signature verification fails with a `kid` not in the cache
  **When** the caller invokes `force_refresh()` and retries
  **Then** the client fetches a fresh JWKS from the provider, updates the cache, and the caller can retry key resolution (supporting key rotation)
  *(RFC 7517 §5)*

- [ ] **Given** a `JwksClient` with caching enabled
  **When** `fetch()` is called multiple times within the TTL
  **Then** subsequent calls return the cached key set without HTTP requests; the cache uses `tokio::sync::RwLock`

- [ ] **Given** the JWKS contains both RSA and EC keys
  **When** `resolve_key(kid)` is called for an EC key
  **Then** it returns the correct EC key with `kty = "EC"` and appropriate curve parameters
  *(RFC 7517 §4)*

- [ ] **Given** the JWKS endpoint returns an error or invalid JSON
  **When** `fetch()` is called
  **Then** it returns `Err(IdentityError::Http(...))` or `Err(IdentityError::Deserialization(...))` with context

- [ ] **Given** unit tests exist in `src/jwks/`
  **When** `cargo test` is run
  **Then** tests under `#[cfg(test)]` verify: JWKS deserialization (RSA + EC), key resolution by `kid`, key-not-found error, cache hit behavior, and force refresh semantics

- [ ] **Given** integration tests exist in `tests/jwks.rs`
  **When** `cargo test` is run against a running node-oidc-provider
  **Then** tests verify: fetching a real JWKS, resolving a key by `kid`, and confirming key type fields are present

- [ ] **Given** an example file `examples/jwks.rs` exists
  **When** it is reviewed
  **Then** it demonstrates fetching a JWKS from a provider's `jwks_uri`, listing all key IDs, and resolving a specific key

**References:**
- RFC 7517 §4 (JWK Parameters): https://www.rfc-editor.org/rfc/rfc7517#section-4
- RFC 7517 §5 (JWK Set): https://www.rfc-editor.org/rfc/rfc7517#section-5

---

## Story 4.4: JWT Validation

As a Rust developer,
I want to validate JWTs (signature, issuer, audience, expiration, and other claims),
So that my application can securely verify tokens from any OIDC provider.

**Acceptance Criteria:**

- [ ] **Given** a JWT string and a resolved `JsonWebKey`
  **When** `validate_token(token, key, options)` is called
  **Then** it verifies the JWS signature using the `jsonwebtoken` crate, supporting RS256, RS384, RS512, ES256, ES384, and PS256 algorithms
  *(RFC 7515 §4.1)*

- [ ] **Given** a JWT with `alg: "none"` in the header
  **When** `validate_token()` is called
  **Then** it returns `Err(IdentityError::Validation("algorithm none is not permitted"))` regardless of options
  *(RFC 7515 §4.1)*

- [ ] **Given** a `ValidationOptions` builder
  **When** configured with `.issuer("https://example.com").audience("my-client").require_exp(true).require_nbf(false)`
  **Then** the resulting options enforce `iss` matching, `aud` matching, `exp` presence and not-expired check, and skip `nbf` validation
  *(RFC 7519 §4.1)*

- [ ] **Given** a valid JWT
  **When** claims validation runs
  **Then** it validates: `iss` matches expected issuer, `aud` contains expected audience, `exp` is in the future (with configurable clock skew tolerance), `iat` is present, and `nbf` (if present) is in the past
  *(RFC 7519 §4.1)*

- [ ] **Given** a JWT with a `nonce` claim
  **When** `ValidationOptions` includes `.expected_nonce("abc123")`
  **Then** validation checks that the token's `nonce` claim matches the expected value, returning `Err(IdentityError::Validation(...))` on mismatch
  *(OIDC Core 1.0 §3.1.3.7)*

- [ ] **Given** an expired JWT
  **When** `validate_token()` is called with default options
  **Then** it returns `Err(IdentityError::Validation("token expired"))` with the `exp` value in the error context
  *(RFC 7519 §4.1)*

- [ ] **Given** a JWT with an `aud` that does not match
  **When** `validate_token()` is called
  **Then** it returns `Err(IdentityError::Validation("audience mismatch"))` listing expected vs. actual values

- [ ] **Given** unit tests exist in `src/jwt/`
  **When** `cargo test` is run
  **Then** tests under `#[cfg(test)]` verify: valid token acceptance, expired token rejection, audience mismatch rejection, issuer mismatch rejection, `alg=none` rejection, nonce validation, `nbf` future rejection, clock skew tolerance, and `ValidationOptions` builder correctness

- [ ] **Given** integration tests exist in `tests/jwt_validation.rs`
  **When** `cargo test` is run against a running node-oidc-provider
  **Then** tests verify: acquiring a token via client credentials, validating it end-to-end (discovery -> JWKS -> validate), and confirming rejection of a tampered token

- [ ] **Given** an example file `examples/validate_token.rs` exists
  **When** it is reviewed
  **Then** it demonstrates the full validation flow: discover provider, fetch JWKS, build `ValidationOptions`, validate a token, and print decoded claims

**References:**
- RFC 7519 §4.1 (Registered Claims): https://www.rfc-editor.org/rfc/rfc7519#section-4.1
- RFC 7519 §7.2 (Validating a JWT): https://www.rfc-editor.org/rfc/rfc7519#section-7.2
- RFC 7515 §4.1 (JOSE Header): https://www.rfc-editor.org/rfc/rfc7515#section-4.1
- OIDC Core 1.0 §3.1.3.7 (ID Token Validation): https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation

---

## Story 4.5: Client Credentials + Authorization Code + PKCE

As a Rust developer,
I want a token endpoint client that supports client credentials grants, authorization code exchange, and PKCE,
So that my application can acquire tokens using standard OAuth 2.0 flows.

**Acceptance Criteria:**

- [ ] **Given** a `TokenClient` configured with `client_id`, `client_secret`, and `token_endpoint`
  **When** `client_credentials(scope)` is called
  **Then** it sends a POST to the token endpoint with `grant_type=client_credentials`, client authentication via HTTP Basic or POST body, and the requested scope; it returns a deserialized `TokenResponse` with `access_token`, `token_type`, `expires_in`, and optional `scope`
  *(RFC 6749 §4.4, §5.1)*

- [ ] **Given** a `TokenClient` configured for authorization code flow
  **When** `exchange_code(code, redirect_uri, code_verifier)` is called
  **Then** it sends a POST with `grant_type=authorization_code`, the authorization `code`, `redirect_uri`, `client_id`, and `code_verifier`; it returns a `TokenResponse` including `access_token`, optional `id_token`, and optional `refresh_token`
  *(RFC 6749 §4.1, §5.1)*

- [ ] **Given** PKCE is required
  **When** `PkceChallenge::generate()` is called
  **Then** it produces a cryptographically random `code_verifier` (43-128 characters, unreserved URI characters) and computes `code_challenge` as `BASE64URL(SHA256(code_verifier))` with `code_challenge_method = "S256"`, using `ring` or `sha2` crate
  *(RFC 7636 §4.1–§4.4)*

- [ ] **Given** a `PkceChallenge`
  **When** `authorization_url(metadata, client_id, redirect_uri, scope, state, pkce)` is called
  **Then** it constructs an authorization URL with query parameters: `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, and `code_challenge_method`
  *(RFC 6749 §4.1, RFC 7636 §4.3)*

- [ ] **Given** the token endpoint returns an error response
  **When** the response body contains `error` and `error_description` fields
  **Then** `TokenClient` returns `Err(IdentityError::TokenEndpoint { error, description })` with the server's error details
  *(RFC 6749 §5.2)*

- [ ] **Given** `TokenClient` supports builder-pattern configuration
  **When** `.client_id("x").client_secret("y").token_endpoint("url").build()` is called
  **Then** it returns a configured `TokenClient` or `Err(IdentityError::Configuration(...))` if required fields are missing

- [ ] **Given** unit tests exist in `src/token/`
  **When** `cargo test` is run
  **Then** tests under `#[cfg(test)]` verify: PKCE verifier generation (length, charset), S256 challenge computation (against known test vectors from RFC 7636 Appendix B), `TokenResponse` deserialization, error response parsing, and builder validation

- [ ] **Given** integration tests exist in `tests/token_client.rs`
  **When** `cargo test` is run against a running node-oidc-provider
  **Then** tests verify: successful client credentials token acquisition, token response field presence, and error handling for invalid client credentials

- [ ] **Given** an example file `examples/client_credentials.rs` exists
  **When** it is reviewed
  **Then** it demonstrates configuring a `TokenClient` from discovery metadata, acquiring a client credentials token, and printing the access token and expiry

**References:**
- RFC 6749 §4.1 (Authorization Code Grant): https://www.rfc-editor.org/rfc/rfc6749#section-4.1
- RFC 6749 §4.4 (Client Credentials Grant): https://www.rfc-editor.org/rfc/rfc6749#section-4.4
- RFC 6749 §5.1 (Successful Response): https://www.rfc-editor.org/rfc/rfc6749#section-5.1
- RFC 6749 §5.2 (Error Response): https://www.rfc-editor.org/rfc/rfc6749#section-5.2
- RFC 7636 §4.1 (Code Verifier): https://www.rfc-editor.org/rfc/rfc7636#section-4.1
- RFC 7636 §4.2 (Code Challenge Creation): https://www.rfc-editor.org/rfc/rfc7636#section-4.2
- RFC 7636 §4.3 (Auth Request): https://www.rfc-editor.org/rfc/rfc7636#section-4.3
- RFC 7636 §4.4–§4.6 (Server Verification): https://www.rfc-editor.org/rfc/rfc7636#section-4.4

---

## Story 4.6: UserInfo Endpoint

As a Rust developer,
I want to fetch and validate the UserInfo response from an OIDC provider,
So that my application can retrieve user profile claims and confirm they are consistent with the ID token.

**Acceptance Criteria:**

- [ ] **Given** a valid access token and a `userinfo_endpoint` from discovery metadata
  **When** `UserInfoClient::fetch(access_token)` is called
  **Then** it sends a GET request with `Authorization: Bearer {access_token}` and returns a deserialized `UserInfoResponse` containing the `sub` claim and any additional profile claims
  *(OIDC Core 1.0 §5.3)*

- [ ] **Given** the `UserInfoResponse` is returned
  **When** the `sub` claim is compared to the `sub` from the ID token
  **Then** it validates that both values match exactly; a mismatch returns `Err(IdentityError::Validation("sub mismatch between ID token and UserInfo"))`
  *(OIDC Core 1.0 §5.3)*

- [ ] **Given** the UserInfo response contains standard claims
  **When** the response is deserialized
  **Then** the `UserInfoResponse` struct provides typed accessors for standard claims (`sub`, `name`, `given_name`, `family_name`, `email`, `email_verified`, `picture`, `locale`, etc.) as `Option<T>` fields, plus a `HashMap<String, serde_json::Value>` for additional claims
  *(OIDC Core 1.0 §5.1)*

- [ ] **Given** the UserInfo endpoint returns a non-200 status
  **When** `fetch()` is called
  **Then** it returns `Err(IdentityError::Http(...))` with status code and response body context

- [ ] **Given** the access token is expired or invalid
  **When** `fetch()` is called and the endpoint returns 401
  **Then** it returns `Err(IdentityError::Http { status: 401, .. })` with a message indicating the bearer token was rejected

- [ ] **Given** unit tests exist in `src/userinfo/`
  **When** `cargo test` is run
  **Then** tests under `#[cfg(test)]` verify: successful deserialization of standard claims, `sub` mismatch detection, handling of missing optional claims, and additional claims in the overflow map

- [ ] **Given** integration tests exist in `tests/userinfo.rs`
  **When** `cargo test` is run against a running node-oidc-provider
  **Then** tests verify: fetching UserInfo with a valid access token, confirming `sub` is present, and confirming a 401 response for an invalid token

- [ ] **Given** an example file `examples/userinfo.rs` exists
  **When** it is reviewed
  **Then** it demonstrates acquiring a token, fetching UserInfo, printing standard claims, and validating `sub` consistency with the token's `sub` claim

**References:**
- OIDC Core 1.0 §5.1 (Standard Claims): https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
- OIDC Core 1.0 §5.3 (UserInfo Endpoint): https://openid.net/specs/openid-connect-core-1_0.html#UserInfo
- OIDC Core 1.0 §3.1.3.7 (ID Token Validation — sub consistency): https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation
