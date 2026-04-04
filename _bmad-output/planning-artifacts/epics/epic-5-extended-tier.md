---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics.md
---

# identity-model — Epic 5 & Epic 6: Extended Tier + Advanced Tier

## Overview

This document covers two epics for the identity-model multi-language OIDC/OAuth2 client library project:

- **Epic 5 — Extended Tier (All Languages):** Token Introspection, Revocation, Exchange, and DPoP across Python, Node/TypeScript, Go, and Rust
- **Epic 6 — Advanced Tier + Documentation + Launch:** PAR, RAR, cross-language documentation site, registry publishing, and launch readiness

These epics build on top of the Foundation and Core tiers, adding protocol capabilities that differentiate identity-model from existing single-language libraries.

---

# Epic 5: Extended Tier — All Languages

Implement Token Introspection (RFC 7662), Token Revocation (RFC 7009), Token Exchange (RFC 8693), and DPoP (RFC 9449) across all four language SDKs (Python, Node/TypeScript, Go, Rust) with a consistent API surface and shared test vectors.

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

---

# Epic 6: Advanced Tier + Documentation + Launch

Implement PAR (RFC 9126) and RAR (RFC 9396) across all languages, build a unified cross-language documentation site, publish all packages to their respective registries, and execute launch activities.

## Story 6.1: Pushed Authorization Requests / PAR (RFC 9126) — All Languages

### User Story

**As a** developer building high-security OAuth2 flows (e.g., FAPI 2.0 compliant applications),
**I want** to push authorization request parameters directly to the authorization server's PAR endpoint and receive a `request_uri` to use in the authorization redirect,
**So that** sensitive authorization parameters are not exposed in the browser URL, request integrity is maintained, and I can comply with security profiles that mandate PAR.

### Acceptance Criteria

**Given** a valid OAuth2 client and a set of authorization request parameters,
**When** I call the PAR method,
**Then** the library sends a POST request to the pushed authorization request endpoint conforming to [RFC 9126 §2.1](https://www.rfc-editor.org/rfc/rfc9126#section-2.1), including all parameters that would normally appear in the authorization URL (e.g., `response_type`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method`) along with client authentication.

**Given** the PAR endpoint accepts the request,
**When** the response is received,
**Then** the library parses the response per [RFC 9126 §2.2](https://www.rfc-editor.org/rfc/rfc9126#section-2.2), returning the `request_uri` and `expires_in` values.

**Given** a successful PAR response with a `request_uri`,
**When** I build the authorization URL,
**Then** the library constructs the authorization redirect URL containing only `client_id` and the `request_uri` (no other authorization parameters), per [RFC 9126 §4](https://www.rfc-editor.org/rfc/rfc9126#section-4).

**Given** the PAR endpoint is discovered via OIDC discovery,
**When** the discovery document contains a `pushed_authorization_request_endpoint` field,
**Then** the library automatically uses that endpoint without requiring manual configuration.

**Given** the PAR request fails,
**When** an error response is received,
**Then** the library returns a structured OAuth2 error with error code, description, and URI.

**Given** any language SDK,
**When** PAR is implemented,
**Then** the implementation includes:
- Unit tests covering successful PAR requests, error responses, `request_uri` expiration handling, parameter serialization, and client authentication methods (client_secret_basic, client_secret_post, private_key_jwt)
- Integration tests against at least one real or simulated authorization server demonstrating the full PAR flow (push parameters, receive request_uri, build authorization URL, complete authorization code exchange)
- A working example in each language demonstrating PAR with PKCE as part of a secure authorization code flow

### RFC References

- [RFC 9126 §2 — Pushed Authorization Request Endpoint](https://www.rfc-editor.org/rfc/rfc9126#section-2)
- [RFC 9126 §2.1 — PAR Request](https://www.rfc-editor.org/rfc/rfc9126#section-2.1)
- [RFC 9126 §2.2 — PAR Response](https://www.rfc-editor.org/rfc/rfc9126#section-2.2)

---

## Story 6.2: Rich Authorization Requests / RAR (RFC 9396) — All Languages

### User Story

**As a** developer building applications that require fine-grained authorization beyond OAuth2 scopes (e.g., payment initiation, account access, or API-specific permissions),
**I want** to include structured `authorization_details` in my authorization and token requests,
**So that** I can express rich, typed authorization semantics that the authorization server and resource servers can enforce, moving beyond flat scope strings.

### Acceptance Criteria

**Given** an authorization request that requires fine-grained permissions,
**When** I construct the request with `authorization_details`,
**Then** the library serializes the `authorization_details` parameter as a JSON array of objects per [RFC 9396 §2](https://www.rfc-editor.org/rfc/rfc9396#section-2), where each object contains at minimum a `type` field and may contain `locations`, `actions`, `datatypes`, `identifier`, and `privileges` fields plus arbitrary extension fields.

**Given** an authorization or token response containing `authorization_details`,
**When** the response is parsed,
**Then** the library deserializes the `authorization_details` JSON array and exposes it as typed objects, preserving all standard and extension fields.

**Given** RAR is used in combination with PAR (RFC 9126),
**When** PAR is available,
**Then** the library supports sending `authorization_details` in the PAR request body, avoiding URL length constraints.

**Given** the authorization server advertises RAR support via discovery,
**When** the discovery document contains `authorization_details_types_supported` per [RFC 9396 §7](https://www.rfc-editor.org/rfc/rfc9396#section-7),
**Then** the library parses and exposes this metadata field.

**Given** any language SDK,
**When** RAR is implemented,
**Then** the implementation includes:
- Unit tests covering serialization/deserialization of `authorization_details` with all standard fields, custom extension fields, multiple authorization detail objects, and edge cases (empty array, missing type)
- Integration tests against at least one real or simulated authorization server demonstrating an end-to-end RAR flow (request with authorization_details, receive enriched token response)
- A working example in each language demonstrating RAR for a payment initiation scenario (or equivalent domain-specific authorization)

### RFC References

- [RFC 9396 §2 — The `authorization_details` Parameter](https://www.rfc-editor.org/rfc/rfc9396#section-2)
- [RFC 9396 §7 — Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc9396#section-7)

---

## Story 6.3: Cross-Language Documentation Site

### User Story

**As a** developer evaluating identity-model or onboarding onto a new language SDK,
**I want** a unified documentation site that covers all four language SDKs with consistent structure, an RFC coverage matrix, and getting-started guides per language,
**So that** I can quickly understand what is supported, find language-specific examples, and trust that the project has production-grade documentation.

### Acceptance Criteria

**Given** the documentation site is deployed,
**When** a developer visits the landing page,
**Then** the site displays a clear project overview, links to all four language SDKs, and a visual RFC coverage matrix showing which RFCs are implemented in which languages.

**Given** a developer selects a specific language (Python, Node/TypeScript, Go, or Rust),
**When** navigating to that language's section,
**Then** the site provides:
- A getting-started guide with installation, basic configuration, and a working code example
- API reference documentation generated from source (e.g., Sphinx for Python, TypeDoc for Node/TS, GoDoc for Go, rustdoc for Rust)
- Per-feature guides for each implemented RFC capability (Discovery, Token Validation, Introspection, Revocation, Token Exchange, DPoP, PAR, RAR)

**Given** the RFC coverage matrix,
**When** a developer views it,
**Then** each row is an RFC (with link to the RFC) and each column is a language, with status indicators (implemented, in progress, planned, not applicable).

**Given** the documentation needs to stay current,
**When** the documentation source is structured,
**Then** it uses a static site generator (e.g., MkDocs, Docusaurus, or mdBook) with source files in the repository, and can be built and previewed locally.

**Given** this story,
**When** documentation is delivered,
**Then** the deliverable includes:
- Unit tests or linting for documentation build (e.g., broken link checker, markdown linting)
- Integration tests verifying all code examples in the documentation compile/run successfully (doc-tests or extracted snippet tests)
- At least one complete example project per language linked from the getting-started guide

### RFC References

All RFCs covered in Epics 5 and 6 are referenced in the coverage matrix:
- [RFC 7662 — Token Introspection](https://www.rfc-editor.org/rfc/rfc7662)
- [RFC 7009 — Token Revocation](https://www.rfc-editor.org/rfc/rfc7009)
- [RFC 8693 — Token Exchange](https://www.rfc-editor.org/rfc/rfc8693)
- [RFC 9449 — DPoP](https://www.rfc-editor.org/rfc/rfc9449)
- [RFC 9126 — PAR](https://www.rfc-editor.org/rfc/rfc9126)
- [RFC 9396 — RAR](https://www.rfc-editor.org/rfc/rfc9396)

---

## Story 6.4: Registry Publishing — PyPI, npm, crates.io, Go Modules

### User Story

**As a** developer who wants to use identity-model in my project,
**I want** each language SDK published to its canonical package registry with automated CI/CD release pipelines,
**So that** I can install the library via standard tooling (`pip install`, `npm install`, `cargo add`, `go get`) and receive updates through normal dependency management workflows.

### Acceptance Criteria

**Given** the Python SDK is ready for release,
**When** a release tag is pushed,
**Then** CI/CD builds and publishes the package to PyPI with correct metadata (name, version, description, classifiers, license, homepage), the package is installable via `pip install identity-model`, and the PyPI project page links to documentation and source.

**Given** the Node/TypeScript SDK is ready for release,
**When** a release tag is pushed,
**Then** CI/CD builds and publishes the package to npm with correct `package.json` metadata, TypeScript type declarations included, the package is installable via `npm install @identity-model/oidc` (or chosen scope/name), and the npm page links to documentation and source.

**Given** the Rust SDK is ready for release,
**When** a release tag is pushed,
**Then** CI/CD builds and publishes the crate to crates.io with correct `Cargo.toml` metadata, the crate is installable via `cargo add identity-model`, and the crates.io page links to docs.rs documentation.

**Given** the Go SDK is ready for release,
**When** a release tag is pushed following Go module versioning conventions,
**Then** the module is available via `go get` with a proper `go.mod` file, tagged versions follow semver, and the Go module proxy indexes the release.

**Given** all registries,
**When** CI/CD pipelines are configured,
**Then** each pipeline includes:
- Unit tests and linting gates that must pass before publishing
- Integration tests that run against the built package (install from local artifact, run smoke tests)
- An example CI workflow file in each language SDK demonstrating the release process

**Given** release automation,
**When** versioning is managed,
**Then** all four SDKs follow semantic versioning, and a coordinated release process exists to publish aligned versions across languages when shared features ship.

### RFC References

Not directly RFC-linked. This story enables distribution of all RFC implementations from Epics 5 and 6.

---

## Story 6.5: Launch — README, CHANGELOG, Blog Post, GitHub Releases

### User Story

**As a** project maintainer preparing to publicly launch identity-model,
**I want** polished READMEs, CHANGELOGs, a blog post template, and GitHub Releases configured for all SDKs,
**So that** the project makes a strong first impression, developers can discover it via GitHub and search engines, and the release history is transparent and navigable.

### Acceptance Criteria

**Given** each language SDK repository,
**When** the README is finalized,
**Then** each README includes: project name and tagline, badges (CI status, latest version, license, RFC compliance), a feature overview with links to supported RFCs, quick-start installation and usage (code snippet), links to full documentation site, contributing guidelines, and license information.

**Given** each language SDK repository,
**When** the CHANGELOG is finalized,
**Then** each CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/) format with sections for Added, Changed, Deprecated, Removed, Fixed, and Security, and includes entries for all features shipped in Epics 5 and 6.

**Given** the launch is prepared,
**When** the blog post template is created,
**Then** it includes: the problem statement (fragmented identity libraries), the vision (cross-language identity-model), key differentiators (RFC compliance breadth, consistent API across languages, DPoP/PAR/RAR support), a feature comparison table vs. existing libraries per language, and call-to-action links to each SDK and the documentation site.

**Given** each language SDK repository,
**When** the initial GitHub Release is created,
**Then** each release includes: a semver tag, release notes summarizing all features, links to registry packages (PyPI/npm/crates.io/Go proxy), links to the documentation site, and SHA256 checksums for any binary artifacts.

**Given** launch readiness,
**When** all launch artifacts are delivered,
**Then** the deliverable includes:
- Unit tests or linting for all markdown artifacts (broken link checker, markdown lint)
- Integration tests verifying quick-start code snippets from each README compile and run successfully
- A complete example project per language that is linked from the README and blog post, demonstrating at least Discovery + Token Validation + one Extended Tier feature (Introspection, Revocation, Exchange, or DPoP)

### RFC References

All RFCs covered across the project are referenced in launch materials:
- [RFC 7662 — Token Introspection](https://www.rfc-editor.org/rfc/rfc7662)
- [RFC 7009 — Token Revocation](https://www.rfc-editor.org/rfc/rfc7009)
- [RFC 8693 — Token Exchange](https://www.rfc-editor.org/rfc/rfc8693)
- [RFC 9449 — DPoP](https://www.rfc-editor.org/rfc/rfc9449)
- [RFC 9126 — PAR](https://www.rfc-editor.org/rfc/rfc9126)
- [RFC 9396 — RAR](https://www.rfc-editor.org/rfc/rfc9396)
