---
title: "Epic 2 — Core Tier: Node/TypeScript"
project: identity-model
status: draft
created: 2026-04-04
inputDocuments:
  - name: "OIDC Discovery 1.0"
    url: "https://openid.net/specs/openid-connect-discovery-1_0.html"
    sections: ["§3", "§4"]
  - name: "OIDC Core 1.0"
    url: "https://openid.net/specs/openid-connect-core-1_0.html"
    sections: ["§3.1.3.7", "§5.1", "§5.3"]
  - name: "RFC 7517 — JSON Web Key (JWK)"
    url: "https://www.rfc-editor.org/rfc/rfc7517"
    sections: ["§4", "§5"]
  - name: "RFC 7519 — JSON Web Token (JWT)"
    url: "https://www.rfc-editor.org/rfc/rfc7519"
    sections: ["§4.1", "§7.2"]
  - name: "RFC 7515 — JSON Web Signature (JWS)"
    url: "https://www.rfc-editor.org/rfc/rfc7515"
    sections: ["§4.1"]
  - name: "RFC 6749 — OAuth 2.0 Authorization Framework"
    url: "https://www.rfc-editor.org/rfc/rfc6749"
    sections: ["§4.1", "§4.4", "§5.1", "§5.2"]
  - name: "RFC 7636 — Proof Key for Code Exchange (PKCE)"
    url: "https://www.rfc-editor.org/rfc/rfc7636"
    sections: ["§4.1", "§4.2", "§4.3", "§4.4", "§4.5", "§4.6"]
---

# Epic 2 — Core Tier: Node/TypeScript

## Overview

Greenfield implementation of a standards-compliant OIDC/OAuth 2.0 client library in TypeScript, published as `@identity-model/node` on npm. The library covers OIDC Discovery, JWKS key resolution, JWT validation, OAuth 2.0 token flows (Client Credentials, Authorization Code + PKCE), and UserInfo endpoint access.

## Technology Decisions

| Concern | Decision |
|---|---|
| Runtime | Node 20+ |
| Module system | ESM-first (`"type": "module"` in package.json) |
| Language | Strict TypeScript (`strict: true`) |
| HTTP | `undici` / built-in `fetch` |
| JOSE | `jose` (panva) — JWK, JWS, JWT operations |
| Runtime validation | `zod` |
| Testing | `vitest` |

> **Note:** The JOSE library decision (`jose` by panva) is provisional pending the Node/TypeScript ecosystem audit in [Epic 0B Story 0B.5](epic-0b-ecosystem-research.md). If the audit recommends an alternative, this decision will be revised.

## Package

```
@identity-model/node
```

---

## Story 2.1 — Project Scaffolding

### User Story

**As a** library maintainer,
**I want** a fully configured TypeScript project with ESM output, linting, testing, and CI,
**So that** contributors can develop, test, and publish the package from day one.

### Acceptance Criteria

**AC 2.1.1 — Package manifest**

> **Given** a fresh clone of the repository,
> **When** a developer runs `npm install`,
> **Then** all dependencies are installed successfully, `package.json` declares `"type": "module"`, the `exports` field maps `.` to the ESM entry point, and `engines` requires `node >= 20`.

**AC 2.1.2 — TypeScript compilation**

> **Given** the `tsconfig.json` with `strict: true`, `module: "NodeNext"`, and `moduleResolution: "NodeNext"`,
> **When** a developer runs `npm run build`,
> **Then** the project compiles to `dist/` with declaration files and a source map, and zero errors.

**AC 2.1.3 — Vitest configuration**

> **Given** a `vitest.config.ts` at the project root,
> **When** a developer runs `npm test`,
> **Then** vitest discovers and runs all `*.test.ts` files under `src/`, reporting results to stdout.

**AC 2.1.4 — CI pipeline**

> **Given** a CI workflow configuration (e.g., `.github/workflows/ci.yml`),
> **When** a pull request is opened,
> **Then** the pipeline runs lint, type-check, and test steps on Node 20 and Node 22.

**AC 2.1.5 — README**

> **Given** the package root,
> **When** a developer opens `README.md`,
> **Then** it contains installation instructions, a minimal usage example, and links to API documentation.

**AC 2.1.6 — Unit tests**

> **Given** the scaffolding is complete,
> **When** `npx vitest run` is executed,
> **Then** at least one smoke-test file passes, confirming the toolchain works end-to-end.

**AC 2.1.7 — Integration test harness**

> **Given** a `tests/integration/` directory with a `node-oidc-provider` fixture server,
> **When** integration tests are executed,
> **Then** the fixture server starts, serves a discovery document, and shuts down cleanly after the test suite.

**AC 2.1.8 — Usage example**

> **Given** an `examples/` directory,
> **When** a developer reads `examples/README.md`,
> **Then** they find a runnable example that imports from the built package.

### References

- N/A (tooling story — no specific RFC section)

---

## Story 2.2 — OIDC Discovery Client

### User Story

**As a** relying-party developer,
**I want** to fetch and parse an OpenID Provider's discovery document from the `.well-known/openid-configuration` endpoint,
**So that** my application can automatically configure itself against any spec-compliant OIDC provider.

### Acceptance Criteria

**AC 2.2.1 — Fetch discovery document**

> **Given** a valid issuer URL (e.g., `https://op.example.com`),
> **When** `discover(issuerUrl)` is called,
> **Then** the client fetches `{issuerUrl}/.well-known/openid-configuration` and returns a typed `OidcProviderMetadata` object.

**AC 2.2.2 — Runtime validation**

> **Given** a response from the discovery endpoint,
> **When** the JSON is parsed,
> **Then** required fields per OIDC Discovery §3 (`issuer`, `authorization_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`) are validated with zod, and a `DiscoveryValidationError` is thrown if any are missing or malformed.

**AC 2.2.3 — Issuer mismatch rejection**

> **Given** a discovery document where the `issuer` field does not exactly match the requested issuer URL,
> **When** validation runs,
> **Then** it throws an `IssuerMismatchError` per OIDC Discovery §4.

**AC 2.2.4 — Configurable TTL cache**

> **Given** a `cacheTtlMs` option (default: 3600000),
> **When** `discover()` is called multiple times within the TTL window,
> **Then** only one HTTP request is made; subsequent calls return the cached result.

**AC 2.2.5 — Cache invalidation**

> **Given** a cached discovery document whose TTL has expired,
> **When** `discover()` is called again,
> **Then** a fresh HTTP request is made and the cache is updated.

**AC 2.2.6 — Unit tests (vitest)**

> **Given** mocked HTTP responses,
> **When** unit tests for the discovery client are executed,
> **Then** all happy-path and error-path scenarios (missing fields, issuer mismatch, network errors) are covered and pass.

**AC 2.2.7 — Integration tests (node-oidc-provider)**

> **Given** a running `node-oidc-provider` instance,
> **When** `discover()` is called with the provider's issuer URL,
> **Then** the returned metadata matches the provider's actual configuration.

**AC 2.2.8 — Usage example**

> **Given** `examples/discovery.ts`,
> **When** executed with `tsx`,
> **Then** it prints the discovered provider metadata to stdout.

### References

- [OIDC Discovery 1.0 §3 — OpenID Provider Metadata](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata)
- [OIDC Discovery 1.0 §4 — Obtaining OpenID Provider Configuration Information](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)

---

## Story 2.3 — JWKS Client + Key Resolution

### User Story

**As a** relying-party developer,
**I want** to fetch, cache, and resolve JSON Web Keys from the provider's JWKS endpoint,
**So that** my application can verify token signatures without manual key management.

### Acceptance Criteria

**AC 2.3.1 — Fetch JWKS**

> **Given** a `jwks_uri` from the discovery document,
> **When** `fetchJwks(jwksUri)` is called,
> **Then** the client retrieves the JWK Set and returns an array of typed `JsonWebKey` objects validated against RFC 7517 §5.

**AC 2.3.2 — Key resolution by `kid`**

> **Given** a cached JWK Set containing multiple keys,
> **When** `resolveKey(kid)` is called with a specific key ID,
> **Then** the matching key is returned, or a `KeyNotFoundError` is thrown if no key matches.

**AC 2.3.3 — Algorithm filtering**

> **Given** a JWK Set with keys of various algorithms,
> **When** `resolveKey(kid, { alg: "RS256" })` is called,
> **Then** only keys matching the requested algorithm and `use: "sig"` are considered.

**AC 2.3.4 — Key caching**

> **Given** a JWKS response,
> **When** multiple key resolutions occur within the cache window,
> **Then** only one HTTP request is made to the JWKS endpoint.

**AC 2.3.5 — Key rotation (forced refresh)**

> **Given** a cached JWK Set that does not contain a `kid` referenced in an incoming token,
> **When** `resolveKey(kid, { forceRefresh: true })` is called,
> **Then** the cache is invalidated, a fresh JWKS is fetched, and resolution is retried before throwing `KeyNotFoundError`.

**AC 2.3.6 — Rate-limited refresh**

> **Given** multiple forced-refresh requests in rapid succession,
> **When** refresh is triggered,
> **Then** at most one HTTP request is made within a configurable cooldown window (default: 10 seconds) to prevent abuse.

**AC 2.3.7 — Unit tests (vitest)**

> **Given** mocked JWKS responses,
> **When** unit tests are executed,
> **Then** all scenarios (happy path, missing kid, forced refresh, rate limiting, malformed JWKS) are covered and pass.

**AC 2.3.8 — Integration tests (node-oidc-provider)**

> **Given** a running `node-oidc-provider` instance,
> **When** the JWKS client fetches and resolves keys from the provider's `jwks_uri`,
> **Then** the resolved keys can be used to verify a token issued by the provider.

**AC 2.3.9 — Usage example**

> **Given** `examples/jwks.ts`,
> **When** executed with `tsx`,
> **Then** it fetches and prints the public keys from a provider's JWKS endpoint.

### References

- [RFC 7517 §4 — JSON Web Key Parameters](https://www.rfc-editor.org/rfc/rfc7517#section-4)
- [RFC 7517 §5 — JWK Set Format](https://www.rfc-editor.org/rfc/rfc7517#section-5)
- [RFC 7515 §4.1 — JWS Header Parameters (`kid`, `alg`)](https://www.rfc-editor.org/rfc/rfc7515#section-4.1)

---

## Story 2.4 — JWT Validation

### User Story

**As a** relying-party developer,
**I want** to validate ID tokens and access tokens according to the OIDC and JWT specifications,
**So that** my application only accepts authentic, unexpired, correctly-scoped tokens.

### Acceptance Criteria

**AC 2.4.1 — Signature verification**

> **Given** a signed JWT and a resolved JWK,
> **When** `validateToken(jwt, options)` is called,
> **Then** the signature is verified using the `jose` library, and an `InvalidSignatureError` is thrown on failure.

**AC 2.4.2 — Algorithm none rejection**

> **Given** a JWT with `alg: "none"` in the header,
> **When** validation is attempted,
> **Then** the token is rejected with an `UnsupportedAlgorithmError`, regardless of other options.

**AC 2.4.3 — Issuer validation**

> **Given** validation options that include `expectedIssuer`,
> **When** the token's `iss` claim does not match,
> **Then** an `IssuerMismatchError` is thrown per RFC 7519 §4.1.1.

**AC 2.4.4 — Audience validation**

> **Given** validation options that include `expectedAudience`,
> **When** the token's `aud` claim does not contain the expected audience,
> **Then** an `AudienceMismatchError` is thrown per RFC 7519 §4.1.3.

**AC 2.4.5 — Temporal claims (`exp`, `nbf`, `iat`)**

> **Given** a JWT with `exp`, `nbf`, and `iat` claims,
> **When** validation runs,
> **Then** tokens past `exp` are rejected (`TokenExpiredError`), tokens before `nbf` are rejected (`TokenNotYetValidError`), and a configurable `clockToleranceSec` (default: 0) is applied to both checks.

**AC 2.4.6 — Nonce validation (ID tokens)**

> **Given** validation options with `expectedNonce`,
> **When** the token's `nonce` claim does not match,
> **Then** a `NonceMismatchError` is thrown per OIDC Core §3.1.3.7.

**AC 2.4.7 — Typed claims output**

> **Given** a valid token,
> **When** validation succeeds,
> **Then** the return value is a typed `ValidatedToken<T>` containing the parsed header and payload with zod-validated standard claims.

**AC 2.4.8 — Unit tests (vitest)**

> **Given** a set of crafted JWTs (valid, expired, wrong issuer, wrong audience, alg=none, bad signature, missing nonce),
> **When** unit tests are executed,
> **Then** every validation rule is exercised and all tests pass.

**AC 2.4.9 — Integration tests (node-oidc-provider)**

> **Given** a token issued by a running `node-oidc-provider` instance,
> **When** the token is validated with `validateToken()` using the provider's discovered metadata and resolved keys,
> **Then** validation succeeds for valid tokens and fails predictably for tampered tokens.

**AC 2.4.10 — Usage example**

> **Given** `examples/validate-token.ts`,
> **When** executed with `tsx`,
> **Then** it demonstrates validating an ID token against a live provider.

### References

- [RFC 7519 §4.1 — JWT Registered Claims (iss, sub, aud, exp, nbf, iat)](https://www.rfc-editor.org/rfc/rfc7519#section-4.1)
- [RFC 7519 §7.2 — Validating a JWT](https://www.rfc-editor.org/rfc/rfc7519#section-7.2)
- [RFC 7515 §4.1 — JWS Header `alg` Parameter](https://www.rfc-editor.org/rfc/rfc7515#section-4.1)
- [OIDC Core 1.0 §3.1.3.7 — ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

---

## Story 2.5 — Client Credentials + Authorization Code + PKCE Flows

### User Story

**As a** relying-party developer,
**I want** to obtain tokens via Client Credentials and Authorization Code (with PKCE) flows,
**So that** my application can authenticate to APIs and securely exchange authorization codes for tokens.

### Acceptance Criteria

**AC 2.5.1 — Client Credentials grant**

> **Given** a `client_id`, `client_secret`, and a `token_endpoint`,
> **When** `clientCredentialsGrant(options)` is called,
> **Then** a POST request is sent with `grant_type=client_credentials` and the response is parsed into a typed `TokenResponse` per RFC 6749 §4.4.

**AC 2.5.2 — Client authentication methods**

> **Given** a `clientAuthMethod` option of `"client_secret_basic"` or `"client_secret_post"`,
> **When** a token request is made,
> **Then** credentials are sent via the `Authorization: Basic` header (§2.3.1) or in the request body respectively.

**AC 2.5.3 — PKCE code_verifier generation**

> **Given** no input,
> **When** `generateCodeVerifier()` is called,
> **Then** it returns a cryptographically random string between 43 and 128 characters, using unreserved characters per RFC 7636 §4.1.

**AC 2.5.4 — PKCE code_challenge generation**

> **Given** a `code_verifier`,
> **When** `generateCodeChallenge(verifier, method)` is called with `method: "S256"`,
> **Then** it returns the Base64url-encoded SHA-256 hash of the verifier per RFC 7636 §4.2.

**AC 2.5.5 — Authorization Code exchange**

> **Given** an authorization `code`, `redirect_uri`, `code_verifier`, and token endpoint,
> **When** `authorizationCodeGrant(options)` is called,
> **Then** a POST request is sent with `grant_type=authorization_code`, `code`, `redirect_uri`, and `code_verifier`, and the response is parsed into a `TokenResponse` per RFC 6749 §4.1.

**AC 2.5.6 — Token response validation**

> **Given** a token endpoint response,
> **When** the JSON is parsed,
> **Then** required fields (`access_token`, `token_type`) are validated with zod per RFC 6749 §5.1, and error responses are parsed as `TokenErrorResponse` per §5.2.

**AC 2.5.7 — Scope support**

> **Given** a `scope` option,
> **When** any grant request is made,
> **Then** the `scope` parameter is included in the token request.

**AC 2.5.8 — Unit tests (vitest)**

> **Given** mocked token endpoint responses,
> **When** unit tests are executed,
> **Then** all grant types, auth methods, PKCE generation, success responses, and error responses are covered and pass.

**AC 2.5.9 — Integration tests (node-oidc-provider)**

> **Given** a running `node-oidc-provider` instance with a registered client,
> **When** Client Credentials and Authorization Code + PKCE flows are executed end-to-end,
> **Then** valid tokens are obtained and can be validated using Story 2.4's `validateToken()`.

**AC 2.5.10 — Usage example**

> **Given** `examples/client-credentials.ts` and `examples/authorization-code-pkce.ts`,
> **When** executed with `tsx`,
> **Then** they demonstrate obtaining tokens from a live provider.

### References

- [RFC 6749 §4.1 — Authorization Code Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)
- [RFC 6749 §4.4 — Client Credentials Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.4)
- [RFC 6749 §5.1 — Successful Token Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.1)
- [RFC 6749 §5.2 — Error Response](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)
- [RFC 7636 §4.1 — Client Creates a Code Verifier](https://www.rfc-editor.org/rfc/rfc7636#section-4.1)
- [RFC 7636 §4.2 — Client Creates the Code Challenge](https://www.rfc-editor.org/rfc/rfc7636#section-4.2)
- [RFC 7636 §4.3–§4.6 — PKCE Protocol Flow](https://www.rfc-editor.org/rfc/rfc7636#section-4.3)

---

## Story 2.6 — UserInfo Endpoint Client

### User Story

**As a** relying-party developer,
**I want** to fetch user claims from the UserInfo endpoint using an access token,
**So that** my application can retrieve profile information beyond what is embedded in the ID token.

### Acceptance Criteria

**AC 2.6.1 — Fetch UserInfo**

> **Given** a valid access token and a `userinfo_endpoint` from the discovery document,
> **When** `fetchUserInfo(accessToken, userinfoEndpoint)` is called,
> **Then** a GET request is sent with `Authorization: Bearer {accessToken}` and the JSON response is returned as a typed `UserInfoResponse`.

**AC 2.6.2 — Sub claim validation**

> **Given** a UserInfo response and the `sub` claim from the corresponding ID token,
> **When** the response is received,
> **Then** the `sub` claim in the UserInfo response is compared to the ID token's `sub`, and a `SubjectMismatchError` is thrown if they do not match per OIDC Core §5.3.

**AC 2.6.3 — Standard claims parsing**

> **Given** a UserInfo response,
> **When** the JSON is parsed,
> **Then** standard claims (`sub`, `name`, `email`, `email_verified`, `picture`, etc.) are validated with zod per OIDC Core §5.1, and unknown claims are preserved in the typed output.

**AC 2.6.4 — Error handling**

> **Given** a UserInfo endpoint that returns an HTTP 401 or 403,
> **When** the response is received,
> **Then** a `UserInfoError` is thrown with the HTTP status and any `WWW-Authenticate` header details.

**AC 2.6.5 — Bearer token via POST body**

> **Given** an option `method: "POST"`,
> **When** `fetchUserInfo()` is called,
> **Then** the access token is sent as a form-encoded `access_token` parameter in the request body instead of the Authorization header.

**AC 2.6.6 — Unit tests (vitest)**

> **Given** mocked UserInfo endpoint responses,
> **When** unit tests are executed,
> **Then** all scenarios (valid response, sub mismatch, HTTP errors, POST method) are covered and pass.

**AC 2.6.7 — Integration tests (node-oidc-provider)**

> **Given** a running `node-oidc-provider` instance and a valid access token obtained via Story 2.5,
> **When** `fetchUserInfo()` is called,
> **Then** the returned claims match the user's configured profile in the provider.

**AC 2.6.8 — Usage example**

> **Given** `examples/userinfo.ts`,
> **When** executed with `tsx`,
> **Then** it demonstrates fetching and printing user claims from a live provider.

### References

- [OIDC Core 1.0 §5.1 — Standard Claims](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims)
- [OIDC Core 1.0 §5.3 — UserInfo Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
