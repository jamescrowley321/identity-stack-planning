---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# Epic 3: Core Tier — Go

## Overview

Greenfield implementation of a production-grade OIDC/OAuth2 client library in Go, porting the core capabilities from `py-identity-model` (the Python reference implementation) into idiomatic Go. This epic delivers the `go/` directory within the identity-model monorepo as a standalone Go module published at `github.com/jamescrowley321/identity-model/go`.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Language version** | Go 1.22+ | Generics, `net/http` routing improvements, range-over-func |
| **Module system** | Go modules | Standard dependency management |
| **HTTP client** | `net/http` stdlib | Zero external dependencies for HTTP; `sync.Pool` for client reuse |
| **JOSE library** | `go-jose/v4` or `golang-jwt/v5` | Mature, audited JWT/JWS/JWK handling |
| **Configuration** | Functional options pattern | `WithTimeout()`, `WithCache()`, `WithHTTPClient()` — idiomatic Go API |
| **Concurrency** | `golang.org/x/sync/singleflight` | Deduplicate concurrent JWKS/discovery fetches |
| **Client pooling** | `sync.Pool` | Reuse HTTP clients to reduce GC pressure |

## Module Path

```
github.com/jamescrowley321/identity-model/go
```

## Package Structure

```
go/
├── pkg/
│   ├── discovery/   # OIDC Discovery client
│   ├── jwks/        # JWKS fetching + key resolution
│   ├── jwt/         # JWT validation
│   ├── token/       # Token endpoint client (client credentials, auth code, PKCE)
│   └── userinfo/    # UserInfo endpoint client
├── internal/        # Shared internal utilities
├── examples/        # Usage examples per capability
├── go.mod
├── go.sum
└── README.md
```

## RFC References

| Spec | URL | Relevant Sections |
|------|-----|-------------------|
| OIDC Discovery 1.0 | https://openid.net/specs/openid-connect-discovery-1_0.html | Section 3, Section 4 |
| RFC 7517 (JWK) | https://www.rfc-editor.org/rfc/rfc7517 | Section 4, Section 5 |
| RFC 7519 (JWT) | https://www.rfc-editor.org/rfc/rfc7519 | Section 4.1, Section 7.2 |
| RFC 7515 (JWS) | https://www.rfc-editor.org/rfc/rfc7515 | Section 4.1 |
| RFC 6749 (OAuth 2.0) | https://www.rfc-editor.org/rfc/rfc6749 | Section 4.1, Section 4.4, Section 5.1, Section 5.2 |
| RFC 7636 (PKCE) | https://www.rfc-editor.org/rfc/rfc7636 | Section 4.1–Section 4.6 |
| OIDC Core 1.0 | https://openid.net/specs/openid-connect-core-1_0.html | Section 3.1.3.7, Section 5.1, Section 5.3 |

## Story List

| Story | Title | Key Packages |
|-------|-------|--------------|
| 3.1 | Project Scaffolding | all |
| 3.2 | OIDC Discovery Client | `pkg/discovery` |
| 3.3 | JWKS Client + Key Resolution | `pkg/jwks` |
| 3.4 | JWT Validation | `pkg/jwt` |
| 3.5 | Client Credentials + Authorization Code + PKCE | `pkg/token` |
| 3.6 | UserInfo Endpoint | `pkg/userinfo` |

---

## Story 3.1: Project Scaffolding

**As a** Go developer contributing to identity-model,
**I want** a properly structured Go module with package layout, CI pipeline, and documentation,
**So that** I have a working foundation to build OIDC/OAuth2 capabilities on top of.

### Acceptance Criteria

- [ ] **Given** the identity-model monorepo, **When** a developer navigates to `go/`, **Then** a valid `go.mod` exists with module path `github.com/jamescrowley321/identity-model/go` and Go version `>= 1.22`
- [ ] **Given** the `go/` directory, **When** inspecting the package structure, **Then** the following packages exist: `pkg/discovery`, `pkg/jwks`, `pkg/jwt`, `pkg/token`, `pkg/userinfo`, and `internal/`
- [ ] **Given** each package directory, **When** inspecting contents, **Then** each contains at minimum a `doc.go` file with package-level documentation describing the package purpose and relevant RFC references
- [ ] **Given** the `go/` directory, **When** running `go build ./...`, **Then** the build succeeds with zero errors
- [ ] **Given** the `go/` directory, **When** running `go vet ./...`, **Then** no issues are reported
- [ ] **Given** the repository, **When** a PR is opened that touches `go/**`, **Then** a GitHub Actions workflow runs `go build ./...`, `go test ./...`, `go vet ./...`, and `golangci-lint run`
- [ ] **Given** the `go/` directory, **When** inspecting `README.md`, **Then** it documents the module path, package layout, installation instructions (`go get`), minimum Go version, and links to the cross-language specification
- [ ] **Given** the `go/examples/` directory, **When** inspecting contents, **Then** a minimal `hello/` example exists that imports at least one package and compiles
- [ ] **Given** the scaffolding, **When** running `go test ./...`, **Then** at least one placeholder test per package passes
- [ ] **Given** the `infra/` directory at the monorepo root, **When** running `docker-compose up`, **Then** a `node-oidc-provider` instance is available for integration tests (or scaffolding documents how to start it)

### References

- Go Modules: https://go.dev/ref/mod
- Project layout conventions: https://go.dev/doc/modules/layout

---

## Story 3.2: OIDC Discovery Client

**As a** Go developer integrating with an OIDC provider,
**I want** a discovery client that fetches and caches the OpenID Connect provider configuration,
**So that** my application can dynamically resolve provider endpoints without hardcoding URLs.

### Acceptance Criteria

- [ ] **Given** a valid OIDC issuer URL, **When** calling `discovery.FetchConfiguration(ctx, issuerURL, opts...)`, **Then** the client fetches `{issuerURL}/.well-known/openid-configuration` and returns a typed `ProviderConfiguration` struct containing all required metadata fields per [OIDC Discovery 1.0 Section 3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [ ] **Given** the response, **When** required metadata fields are missing (`issuer`, `authorization_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`), **Then** the client returns a descriptive error identifying the missing fields per [OIDC Discovery 1.0 Section 3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [ ] **Given** the fetched configuration, **When** the `issuer` field in the response does not exactly match the requested issuer URL, **Then** the client returns an issuer mismatch error per [OIDC Discovery 1.0 Section 4.3](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfigurationValidation)
- [ ] **Given** a previously fetched configuration, **When** a subsequent call occurs within the cache TTL, **Then** the cached response is returned without an HTTP request
- [ ] **Given** the cache TTL has expired, **When** a subsequent call occurs, **Then** the client re-fetches the configuration from the provider
- [ ] **Given** the functional options API, **When** calling with `WithCacheTTL(duration)`, **Then** the cache TTL is set to the specified duration (default: 24 hours)
- [ ] **Given** the functional options API, **When** calling with `WithHTTPClient(client)`, **Then** the custom HTTP client is used for the request
- [ ] **Given** the functional options API, **When** calling with `WithTimeout(duration)`, **Then** the request context deadline is set accordingly
- [ ] **Given** concurrent goroutines calling `FetchConfiguration` for the same issuer, **When** the cache is empty or expired, **Then** only one HTTP request is made (singleflight deduplication)
- [ ] **Given** unit tests, **When** running `go test ./pkg/discovery/...`, **Then** all tests pass covering: successful fetch, missing fields, issuer mismatch, cache hit, cache expiry, singleflight behavior, custom options, and HTTP error handling
- [ ] **Given** the `infra/` docker-compose with `node-oidc-provider`, **When** running integration tests with the `integration` build tag, **Then** tests pass against a live provider confirming real discovery document fetch and validation
- [ ] **Given** the `go/examples/discovery/` directory, **When** inspecting contents, **Then** a runnable example demonstrates fetching and printing provider configuration for a given issuer URL

### References

- [OIDC Discovery 1.0 Section 3 — Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [OIDC Discovery 1.0 Section 4 — Obtaining Provider Configuration](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)

---

## Story 3.3: JWKS Client + Key Resolution

**As a** Go developer validating JWTs from an OIDC provider,
**I want** a JWKS client that fetches, caches, and resolves signing keys by `kid`,
**So that** my application can verify token signatures efficiently without fetching keys on every request.

### Acceptance Criteria

- [ ] **Given** a JWKS URI (obtained from discovery), **When** calling `jwks.FetchKeySet(ctx, jwksURI, opts...)`, **Then** the client fetches the JWKS document and returns a typed `JSONWebKeySet` containing all keys per [RFC 7517 Section 5](https://www.rfc-editor.org/rfc/rfc7517#section-5)
- [ ] **Given** a fetched key set, **When** calling `keySet.ResolveKey(kid)`, **Then** the key matching the specified `kid` is returned per [RFC 7517 Section 4.5](https://www.rfc-editor.org/rfc/rfc7517#section-4.5)
- [ ] **Given** a fetched key set, **When** `ResolveKey(kid)` is called with a `kid` not present in the cached set, **Then** the client performs a forced refresh (re-fetch) and retries resolution before returning a key-not-found error
- [ ] **Given** a JWT signature verification failure, **When** the caller invokes `keySet.ForceRefresh(ctx)`, **Then** the cached key set is invalidated and re-fetched from the provider
- [ ] **Given** a previously fetched key set, **When** a subsequent call occurs within the cache TTL, **Then** the cached key set is returned without an HTTP request
- [ ] **Given** concurrent goroutines calling `FetchKeySet` for the same JWKS URI, **When** the cache is empty or expired, **Then** only one HTTP request is made (singleflight deduplication)
- [ ] **Given** the JWKS response, **When** parsing individual keys, **Then** the `kty`, `use`, `alg`, and `kid` fields are validated per [RFC 7517 Section 4](https://www.rfc-editor.org/rfc/rfc7517#section-4)
- [ ] **Given** the functional options API, **When** calling with `WithCacheTTL(duration)` or `WithHTTPClient(client)`, **Then** the options are applied consistently with the discovery client
- [ ] **Given** unit tests, **When** running `go test ./pkg/jwks/...`, **Then** all tests pass covering: successful fetch, key resolution by kid, forced refresh on miss, forced refresh on sig failure, cache behavior, singleflight, malformed JWKS, and empty JWKS
- [ ] **Given** the `infra/` docker-compose with `node-oidc-provider`, **When** running integration tests with the `integration` build tag, **Then** tests pass against a live provider confirming real JWKS fetch, key resolution, and rotation handling
- [ ] **Given** the `go/examples/jwks/` directory, **When** inspecting contents, **Then** a runnable example demonstrates fetching a JWKS and resolving a key by `kid`

### References

- [RFC 7517 Section 4 — JWK Parameters](https://www.rfc-editor.org/rfc/rfc7517#section-4)
- [RFC 7517 Section 5 — JWK Set Format](https://www.rfc-editor.org/rfc/rfc7517#section-5)
- [RFC 7515 Section 4.1 — JWS Header Parameters (`kid`, `alg`)](https://www.rfc-editor.org/rfc/rfc7515#section-4.1)

---

## Story 3.4: JWT Validation

**As a** Go developer receiving JWTs from an OIDC provider,
**I want** a comprehensive JWT validation function that checks signatures and standard claims,
**So that** my application only accepts well-formed, authentic, unexpired tokens.

### Acceptance Criteria

- [ ] **Given** a raw JWT string and a key set, **When** calling `jwt.Validate(ctx, rawToken, keySet, opts...)`, **Then** the token signature is verified against the key resolved by `kid` from the JWKS per [RFC 7515 Section 4.1](https://www.rfc-editor.org/rfc/rfc7515#section-4.1)
- [ ] **Given** a valid token, **When** validating, **Then** the following registered claims are checked per [RFC 7519 Section 4.1](https://www.rfc-editor.org/rfc/rfc7519#section-4.1): `iss` (must match expected issuer), `aud` (must contain expected audience), `exp` (must not be expired), `nbf` (must not be before validity period), `iat` (must be present)
- [ ] **Given** a token with `alg: "none"` in the header, **When** validating, **Then** the token is rejected with an explicit error per [RFC 7519 Section 7.2](https://www.rfc-editor.org/rfc/rfc7519#section-7.2)
- [ ] **Given** a token with a `nonce` claim, **When** calling with `WithExpectedNonce(nonce)`, **Then** the nonce is validated against the expected value per [OIDC Core 1.0 Section 3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
- [ ] **Given** the functional options API, **When** calling with `WithExpectedIssuer(iss)`, `WithExpectedAudience(aud)`, `WithClockSkew(duration)`, or `WithRequiredClaims(claims...)`, **Then** validation behavior is configured accordingly
- [ ] **Given** a valid token, **When** validation succeeds, **Then** a typed `Claims` struct is returned containing all standard and custom claims with access methods
- [ ] **Given** an invalid token (expired, bad signature, wrong issuer, wrong audience, missing required claims), **When** validation fails, **Then** a descriptive error is returned identifying the specific validation failure
- [ ] **Given** a token whose `kid` is not in the cached JWKS, **When** validating, **Then** the validator triggers a JWKS forced refresh and retries before failing
- [ ] **Given** unit tests, **When** running `go test ./pkg/jwt/...`, **Then** all tests pass covering: valid token, expired token, not-yet-valid token, wrong issuer, wrong audience, `alg=none` rejection, nonce validation, missing claims, bad signature, kid-not-found with refresh, clock skew tolerance, and custom required claims
- [ ] **Given** the `infra/` docker-compose with `node-oidc-provider`, **When** running integration tests with the `integration` build tag, **Then** tests pass against a live provider confirming real token issuance and validation
- [ ] **Given** the `go/examples/jwt-validation/` directory, **When** inspecting contents, **Then** a runnable example demonstrates validating a JWT with configurable options

### References

- [RFC 7519 Section 4.1 — Registered Claim Names](https://www.rfc-editor.org/rfc/rfc7519#section-4.1)
- [RFC 7519 Section 7.2 — Validating a JWT](https://www.rfc-editor.org/rfc/rfc7519#section-7.2)
- [RFC 7515 Section 4.1 — JWS Header Parameters](https://www.rfc-editor.org/rfc/rfc7515#section-4.1)
- [OIDC Core 1.0 Section 3.1.3.7 — ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

---

## Story 3.5: Client Credentials + Authorization Code + PKCE

**As a** Go developer building a backend service or web application,
**I want** a token endpoint client supporting client credentials, authorization code, and PKCE flows,
**So that** my application can obtain access tokens from any standards-compliant OAuth2 provider.

### Acceptance Criteria

- [ ] **Given** a client ID and client secret, **When** calling `token.ClientCredentials(ctx, tokenEndpoint, clientID, clientSecret, opts...)`, **Then** the client sends a `grant_type=client_credentials` POST request and returns a typed `TokenResponse` containing `access_token`, `token_type`, `expires_in`, and optional `scope` per [RFC 6749 Section 4.4](https://www.rfc-editor.org/rfc/rfc6749#section-4.4)
- [ ] **Given** client authentication, **When** using `WithClientAuth(method)`, **Then** the client supports `client_secret_basic` (HTTP Basic, default) and `client_secret_post` (form body) authentication methods per [RFC 6749 Section 2.3](https://www.rfc-editor.org/rfc/rfc6749#section-2.3)
- [ ] **Given** an authorization code, **When** calling `token.AuthorizationCode(ctx, tokenEndpoint, clientID, code, redirectURI, opts...)`, **Then** the client sends a `grant_type=authorization_code` request and returns a `TokenResponse` per [RFC 6749 Section 4.1](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)
- [ ] **Given** PKCE parameters, **When** calling `token.GenerateCodeVerifier()`, **Then** a cryptographically random code verifier of 43–128 characters is generated per [RFC 7636 Section 4.1](https://www.rfc-editor.org/rfc/rfc7636#section-4.1)
- [ ] **Given** a code verifier, **When** calling `token.S256Challenge(verifier)`, **Then** the S256 code challenge is computed as `BASE64URL(SHA256(verifier))` per [RFC 7636 Section 4.2](https://www.rfc-editor.org/rfc/rfc7636#section-4.2)
- [ ] **Given** an authorization code exchange with PKCE, **When** calling with `WithCodeVerifier(verifier)`, **Then** the `code_verifier` parameter is included in the token request per [RFC 7636 Section 4.5](https://www.rfc-editor.org/rfc/rfc7636#section-4.5)
- [ ] **Given** the token endpoint returns an error response, **When** parsing the response, **Then** a typed `TokenError` is returned containing `error`, `error_description`, and `error_uri` per [RFC 6749 Section 5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)
- [ ] **Given** the functional options API, **When** calling with `WithScopes(scopes...)`, `WithExtraParams(params)`, or `WithHTTPClient(client)`, **Then** the options are applied to the token request
- [ ] **Given** unit tests, **When** running `go test ./pkg/token/...`, **Then** all tests pass covering: client credentials success, auth code exchange, PKCE verifier generation (length, charset), S256 challenge computation (against known test vectors from RFC 7636 Appendix B), client_secret_basic vs client_secret_post, error response parsing, missing parameters, and custom options
- [ ] **Given** the `infra/` docker-compose with `node-oidc-provider`, **When** running integration tests with the `integration` build tag, **Then** tests pass against a live provider confirming real client credentials flow, authorization code exchange, and PKCE challenge verification
- [ ] **Given** the `go/examples/client-credentials/` directory, **When** inspecting contents, **Then** a runnable example demonstrates obtaining an access token via client credentials flow
- [ ] **Given** the `go/examples/pkce/` directory, **When** inspecting contents, **Then** a runnable example demonstrates PKCE challenge generation and authorization code exchange

### References

- [RFC 6749 Section 4.1 — Authorization Code Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)
- [RFC 6749 Section 4.4 — Client Credentials Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.4)
- [RFC 6749 Section 5.1 — Successful Token Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.1)
- [RFC 6749 Section 5.2 — Error Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)
- [RFC 7636 Section 4.1 — Code Verifier](https://www.rfc-editor.org/rfc/rfc7636#section-4.1)
- [RFC 7636 Section 4.2 — Code Challenge](https://www.rfc-editor.org/rfc/rfc7636#section-4.2)
- [RFC 7636 Section 4.5 — Token Request with PKCE](https://www.rfc-editor.org/rfc/rfc7636#section-4.5)
- [RFC 7636 Section 4.6 — Server Verification](https://www.rfc-editor.org/rfc/rfc7636#section-4.6)

---

## Story 3.6: UserInfo Endpoint

**As a** Go developer who has obtained an access token,
**I want** a UserInfo client that fetches the authenticated user's profile claims,
**So that** my application can display user information and verify identity consistency with the ID token.

### Acceptance Criteria

- [ ] **Given** a valid access token, **When** calling `userinfo.Fetch(ctx, userInfoEndpoint, accessToken, opts...)`, **Then** the client sends a GET request with `Authorization: Bearer {accessToken}` and returns a typed `UserInfoResponse` containing the user's claims per [OIDC Core 1.0 Section 5.3](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
- [ ] **Given** the UserInfo response, **When** the `sub` claim is present, **Then** the response struct provides typed access to all standard claims defined in [OIDC Core 1.0 Section 5.1](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) (`sub`, `name`, `given_name`, `family_name`, `email`, `email_verified`, `picture`, etc.)
- [ ] **Given** a previously obtained ID token, **When** calling with `WithSubjectValidation(expectedSub)`, **Then** the client verifies that the UserInfo `sub` matches the ID token `sub` and returns an error on mismatch per [OIDC Core 1.0 Section 5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse)
- [ ] **Given** the UserInfo endpoint returns an error (401, 403, or other), **When** parsing the response, **Then** a descriptive error is returned including the HTTP status and any WWW-Authenticate challenge details
- [ ] **Given** the functional options API, **When** calling with `WithHTTPClient(client)` or `WithTimeout(duration)`, **Then** the options are applied to the request
- [ ] **Given** the UserInfo response contains additional non-standard claims, **When** accessing the response, **Then** custom claims are accessible via a generic `Claims() map[string]interface{}` method
- [ ] **Given** unit tests, **When** running `go test ./pkg/userinfo/...`, **Then** all tests pass covering: successful fetch with standard claims, sub consistency validation (match and mismatch), error responses (401, 403, 5xx), custom claims access, and custom options
- [ ] **Given** the `infra/` docker-compose with `node-oidc-provider`, **When** running integration tests with the `integration` build tag, **Then** tests pass against a live provider confirming real UserInfo fetch with a valid access token and sub consistency check
- [ ] **Given** the `go/examples/userinfo/` directory, **When** inspecting contents, **Then** a runnable example demonstrates fetching user info with an access token and printing the returned claims

### References

- [OIDC Core 1.0 Section 5.1 — Standard Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)
- [OIDC Core 1.0 Section 5.3 — UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
- [OIDC Core 1.0 Section 3.1.3.7 — ID Token Validation (sub consistency)](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
