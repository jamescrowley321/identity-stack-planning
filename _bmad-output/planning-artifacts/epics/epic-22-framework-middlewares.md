---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '22'
epic_title: 'Framework Middlewares — Go & Rust'
date: '2026-08-12'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-5-extended-tier.md
---

# Epic 22: Framework Middlewares — Go & Rust

Deliver web-framework middleware for the Go and Rust identity-model client libraries, achieving parity with the reference `fastapi-identity-model` package (v0.2.0) from py-identity-model (PIM). PIM's package is a **thin adapter** over the client core — it wires the already-shipped validation, discovery, and RP-flow primitives into FastAPI's request lifecycle and adds nothing new to the protocol layer. This epic mirrors that adapter idiomatically in Go (`net/http` plus router shims) and Rust (`axum`/`tower`, optional `actix`).

## Design Constraint — Thin Adapter, Not a Re-implementation

Every story in this epic is bound by a single hard constraint: the middleware **MUST** delegate all protocol logic to the shipped client libraries (`go/pkg/*` and `rust/src/*`). Token signature verification, JWKS retrieval and caching, discovery, issuer/audience/expiry validation, PKCE generation, and callback validation belong to the client core. The middleware layer is responsible only for: extracting the token from the transport (HTTP header, cookie, form body), invoking the core validators, translating outcomes into HTTP responses per a fixed error taxonomy, injecting the resulting principal into the framework's request-scoped state, and (for the RP router) mapping the browser redirect choreography onto the core's flow primitives. A middleware story that re-implements any protocol logic already present in the core is out of spec, regardless of test coverage.

## Parity Target — `fastapi-identity-model` v0.2.0 Behaviors

The reference package exhibits the following behaviors, which each Go/Rust story below mirrors idiomatically rather than literally:

- **Resource-server middleware** — a required, non-empty audience that raises a construction-time error when unset (so an operator cannot silently ship a server that skips `aud` enforcement); ID-token-vs-access-token rejection (reject any token carrying ID-token-only claims `nonce` / `at_hash` / `c_hash`, with an optional positive marker requiring a `scope`/`scp` claim to be present); a deliberate error taxonomy — **401** for an invalid or absent token, **403** for a missing required claim or scope, **503** for a transient network or provider outage so callers can retry, **500** for an unexpected internal fault with no internal detail leaked; injection of the authenticated principal into request-scoped state (`user` / `claims` / `token`); and configurable excluded paths (defaulting to `/docs`, `/openapi.json`, `/health`) plus a CORS `OPTIONS` preflight bypass.
- **Dependency-injection accessors / extractors** — current-user, claims, and token accessors that yield 401 when the request is unauthenticated; `require_claim` and `require_scope` guards that yield 403 when the claim or scope is absent, where scope is parsed fail-closed from either the space-delimited `scope` string or the list-valued `scp` claim.
- **RP login router (optional)** — `GET /login` (builds an authorization request with PKCE S256, `state`, and `nonce`); `GET /callback` and `POST /callback` (the latter for the `form_post` response mode); `POST /logout` (POST-only, so a cross-site `GET` cannot force a logout); single-use flow state popped on callback; a check that the discovery document's `issuer` equals the issuer implied by the configured URL; nonce binding on the returned ID token; a hard gate on a UserInfo `sub` that does not match the ID token `sub`; and token storage only when explicitly enabled.

## Story Decomposition

Stories 22.1–22.4 are per-language, per-surface and are independently estimable and deliverable. Story 22.5 is a decision-and-documentation story whose output is recorded in this epic body and carried into the architecture artifacts. During sprint planning, the middleware stories MAY be further split by router adapter (e.g. 22.1-core, 22.1-gin, 22.1-echo, 22.1-chi) following the per-language decomposition pattern established in the Core Tier epics.

## Story 22.1: Go Resource-Server Middleware

### User Story

**As a** Go backend developer building an OAuth2-protected resource server,
**I want** a `net/http` middleware that validates bearer access tokens by delegating to the identity-model Go client core (`go/pkg/jwt`, `go/pkg/discovery`, `go/pkg/jwks`),
**So that** I can protect my routes with audience-enforced, sender-appropriate token validation and a predictable error contract, without re-implementing any JWT or JWKS logic in my application.

### Acceptance Criteria

**Given** a developer constructs the middleware,
**When** no audience (or an empty audience) is configured,
**Then** construction fails immediately with a descriptive error, and the middleware cannot be built without a non-empty audience — making it impossible to ship a resource server that silently skips `aud` enforcement.

**Given** the middleware is configured with a non-empty audience,
**When** a request carries a valid access token whose validated claims include that audience,
**Then** the middleware delegates verification to `go/pkg/jwt` (signature, issuer, expiry, `aud`) using keys resolved through `go/pkg/discovery` and `go/pkg/jwks`, and on success passes the request to the next handler with the principal injected into the `context.Context` under stable keys exposing the user, the full claim set, and the raw token.

**Given** a request whose `Authorization` header is absent, malformed, or carries a token that fails signature, issuer, expiry, or audience validation,
**When** the middleware processes it,
**Then** it responds **401 Unauthorized** with a `WWW-Authenticate: Bearer` challenge carrying `error="invalid_token"` per [RFC 6750 §3](https://www.rfc-editor.org/rfc/rfc6750#section-3), and no principal is injected.

**Given** a request whose token carries ID-token-only claims (`nonce`, `at_hash`, or `c_hash`),
**When** the middleware evaluates the token as an access token,
**Then** it rejects the token with **401 Unauthorized** (`invalid_token`), because an ID token was presented where an access token is required; and when the optional positive-marker check is enabled, a token lacking any `scope` or `scp` claim is likewise rejected as not an access token.

**Given** a request bearing a validly signed token that is missing an application-required claim or scope enforced by the middleware configuration,
**When** the middleware applies that requirement,
**Then** it responds **403 Forbidden** with `error="insufficient_scope"` per [RFC 6750 §3.1](https://www.rfc-editor.org/rfc/rfc6750#section-3.1), distinguishing an authorization failure (valid identity, insufficient grant) from an authentication failure.

**Given** the middleware cannot reach the JWKS or discovery endpoint (DNS failure, timeout, connection reset, or a provider 5xx),
**When** key material or metadata cannot be resolved to validate an otherwise well-formed token,
**Then** the middleware responds **503 Service Unavailable** (optionally with a `Retry-After` header) rather than 401, signalling a transient provider outage so that callers retry instead of treating the token as invalid.

**Given** an unexpected internal fault (panic recovery, an unanticipated error from the core),
**When** the middleware handles the request,
**Then** it responds **500 Internal Server Error** with a generic body that leaks no internal error detail, stack trace, or token contents, while logging the underlying cause server-side.

**Given** the middleware configuration,
**When** a request targets a configured excluded path (defaulting to `/docs`, `/openapi.json`, `/health`) or is a CORS `OPTIONS` preflight,
**Then** the middleware bypasses token validation and passes the request through unmodified.

**Given** the common Go web routers,
**When** router-specific ergonomics are needed,
**Then** the epic ships thin adapters/examples for `gin`, `echo`, and `chi` that wrap the single `net/http` core middleware without duplicating its logic — each adapter only translates the framework's handler/context types to and from the standard `http.Handler` and `context.Context`.

**Given** this story,
**When** the Go resource-server middleware is delivered,
**Then** the implementation includes:
- Unit tests covering: construction failure on empty audience; success-path principal injection into `context.Context`; the full 401 / 403 / 503 / 500 taxonomy with the correct status, `WWW-Authenticate`/error code, and no-leak body; ID-token rejection for each of `nonce`, `at_hash`, `c_hash`; the optional positive `scope`/`scp` marker; excluded-path and `OPTIONS` bypass.
- A delegation test (or code-review gate) asserting the middleware performs no signature verification, JWKS fetch, or claim validation of its own and instead calls `go/pkg/jwt` / `go/pkg/discovery` / `go/pkg/jwks`.
- Integration tests against a real or simulated authorization server (e.g. Keycloak or a mock) exercising a valid token, an expired token, an ID token presented as an access token, and a JWKS-endpoint outage mapped to 503.
- Working examples for plain `net/http`, `gin`, `echo`, and `chi`.

### RFC References

- [RFC 6750 §2 — Authenticated Requests (Bearer Token Usage)](https://www.rfc-editor.org/rfc/rfc6750#section-2)
- [RFC 6750 §3 — The WWW-Authenticate Response Header Field](https://www.rfc-editor.org/rfc/rfc6750#section-3)
- [RFC 6750 §3.1 — Error Codes (`invalid_token`, `insufficient_scope`)](https://www.rfc-editor.org/rfc/rfc6750#section-3.1)
- [OpenID Connect Core §2 — ID Token (`nonce`, `at_hash`)](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [OpenID Connect Core §3.3.2.11 — ID Token (`c_hash`)](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken)

---

## Story 22.2: Go RP Login Router

### User Story

**As a** Go developer building a confidential relying-party (RP) web application,
**I want** an optional login router that mounts `/login`, `/callback`, and `/logout` and drives the OpenID Connect authorization-code flow with PKCE by delegating to the identity-model Go client core,
**So that** I can add standards-compliant interactive sign-in and sign-out to my `net/http` application without hand-rolling the redirect choreography, state/nonce binding, or ID-token and UserInfo validation.

### Acceptance Criteria

**Given** the RP router is mounted,
**When** a browser issues `GET /login`,
**Then** the router builds an authorization request carrying `response_type=code`, `client_id`, `redirect_uri`, `scope`, a cryptographically random `state`, a cryptographically random `nonce`, and a PKCE `code_challenge` with `code_challenge_method=S256` per [RFC 6749 §4.1.1](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1) and [RFC 7636 §4](https://www.rfc-editor.org/rfc/rfc7636#section-4), persists the associated single-use flow state (code verifier, `state`, `nonce`), and redirects the user agent to the authorization endpoint.

**Given** an in-flight authorization request,
**When** the authorization server redirects back to `GET /callback` (query response mode) or posts to `POST /callback` (the `form_post` response mode),
**Then** the router accepts both, reads the `code` and `state` from the query string or the form body respectively, and validates `state` against the stored flow state.

**Given** a callback arrives,
**When** the router looks up the flow state by `state`,
**Then** the stored flow state is popped exactly once (single-use): a replayed or duplicate callback for the same `state` finds no state and is rejected, preventing authorization-response replay.

**Given** a validated callback,
**When** the router exchanges the `code` for tokens and validates the returned ID token,
**Then** it enforces that the ID token's `nonce` equals the `nonce` stored for this flow per [OpenID Connect Core §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation), rejecting the response on mismatch.

**Given** the configured provider URL and the fetched discovery document,
**When** the router initializes or validates the provider metadata,
**Then** it enforces that the discovery document's `issuer` exactly equals the issuer implied by the configured URL, and fails with an error when they differ, preventing issuer confusion.

**Given** the router calls the UserInfo endpoint after a successful token exchange,
**When** the UserInfo response is received,
**Then** the router hard-gates on the UserInfo `sub`: if it does not exactly match the `sub` of the validated ID token, the login is rejected per [OpenID Connect Core §5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse).

**Given** a signed-in session,
**When** a logout is requested,
**Then** the router serves logout only on `POST /logout` (and rejects `GET`), so that a cross-site `GET` (e.g. an `<img>` tag) cannot force a logout.

**Given** the RP application's token-handling posture,
**When** tokens are obtained,
**Then** the router stores tokens only when token storage is explicitly enabled in configuration; otherwise it establishes the authenticated session without persisting the raw tokens.

**Given** the current state of the Go client library,
**When** this story is scheduled,
**Then** the AC explicitly records a **dependency caveat**: the RP login flow requires an authorization-request builder plus callback / `state` / `iss` ([RFC 9207](https://www.rfc-editor.org/rfc/rfc9207)) validation that the Go client core does **not** yet provide — only PKCE helpers exist today. This story therefore **depends on the parity-hardening callback-validation work** (the authorization-request builder and callback/state/`iss` validators must land in `go/pkg/*` first, or be delivered as a prerequisite sub-story). When that surface exists, the router MUST delegate `iss` validation to it per [RFC 9207 §2](https://www.rfc-editor.org/rfc/rfc9207#section-2) rather than implementing it in the middleware layer.

**Given** this story,
**When** the Go RP login router is delivered,
**Then** the implementation includes:
- Unit tests covering: `/login` request construction (PKCE S256, random `state`, random `nonce`); `state` validation and single-use flow-state pop (including replay rejection); `nonce` binding on the ID token; issuer-equals-URL enforcement; UserInfo `sub`-mismatch rejection; `POST`-only logout (with `GET` rejected); and token storage gated on explicit opt-in.
- A delegation test (or code-review gate) asserting the router calls the core authorization-request builder and callback/`state`/`iss` validators rather than re-implementing them.
- Integration tests against a real or simulated OpenID Provider exercising an end-to-end login for both query and `form_post` callbacks, plus negative cases for `state` mismatch, `nonce` mismatch, `iss` mismatch, and UserInfo `sub` mismatch.
- A working example RP application built on `net/http`.

### RFC References

- [RFC 6749 §4.1 — Authorization Code Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)
- [RFC 6749 §4.1.1 — Authorization Request](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1)
- [RFC 7636 §4 — Proof Key for Code Exchange (PKCE)](https://www.rfc-editor.org/rfc/rfc7636#section-4)
- [RFC 9207 §2 — Authorization Response `iss` Parameter](https://www.rfc-editor.org/rfc/rfc9207#section-2)
- [OpenID Connect Core §3.1.3.7 — ID Token Validation (`nonce`)](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
- [OpenID Connect Core §5.3.4 — UserInfo Response (`sub` verification)](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse)
- [OAuth 2.0 Form Post Response Mode](https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html)

---

## Story 22.3: Rust Resource-Server Middleware

### User Story

**As a** Rust backend developer building an OAuth2-protected resource server on `axum`/`tower`,
**I want** an idiomatic `Layer`/`Service` middleware that validates bearer access tokens by delegating to the identity-model Rust client core (`rust/src/*`),
**So that** I can protect my routes with audience-enforced token validation and a predictable error contract, without re-implementing any JWT or JWKS logic in my application.

### Acceptance Criteria

**Given** a developer constructs the middleware `Layer`,
**When** no audience (or an empty audience) is configured,
**Then** construction fails at build time (a fallible builder returning an error, or a type that cannot be constructed without a non-empty audience), so it is impossible to ship a resource server that silently skips `aud` enforcement.

**Given** the middleware is configured with a non-empty audience,
**When** a request carries a valid access token whose validated claims include that audience,
**Then** the `tower::Service` delegates verification to the Rust client core (signature, issuer, expiry, `aud`, JWKS resolution, discovery) and, on success, inserts the principal into the request extensions under stable types exposing the user, the full claim set, and the raw token, before calling the inner service.

**Given** a request whose `Authorization` header is absent, malformed, or carries a token that fails signature, issuer, expiry, or audience validation,
**When** the middleware processes it,
**Then** it short-circuits with **401 Unauthorized** and a `WWW-Authenticate: Bearer error="invalid_token"` challenge per [RFC 6750 §3](https://www.rfc-editor.org/rfc/rfc6750#section-3), and no principal is inserted into the request extensions.

**Given** a request whose token carries ID-token-only claims (`nonce`, `at_hash`, or `c_hash`),
**When** the middleware evaluates the token as an access token,
**Then** it rejects the token with **401 Unauthorized** (`invalid_token`); and when the optional positive-marker check is enabled, a token lacking any `scope` or `scp` claim is likewise rejected as not an access token.

**Given** a request bearing a validly signed token that is missing an application-required claim or scope,
**When** the middleware applies that requirement,
**Then** it responds **403 Forbidden** with `error="insufficient_scope"` per [RFC 6750 §3.1](https://www.rfc-editor.org/rfc/rfc6750#section-3.1), where scope is parsed fail-closed from the space-delimited `scope` string or the list-valued `scp` claim.

**Given** the middleware cannot reach the JWKS or discovery endpoint (timeout, connection error, or a provider 5xx),
**When** key material or metadata cannot be resolved to validate an otherwise well-formed token,
**Then** the middleware responds **503 Service Unavailable** (optionally with `Retry-After`) rather than 401, signalling a transient provider outage so callers retry.

**Given** an unexpected internal fault,
**When** the middleware handles the request,
**Then** it responds **500 Internal Server Error** with a generic body leaking no internal error detail or token contents, while recording the underlying cause via `tracing`.

**Given** the middleware configuration,
**When** a request targets a configured excluded path (defaulting to `/docs`, `/openapi.json`, `/health`) or is a CORS `OPTIONS` preflight,
**Then** the middleware bypasses token validation and passes the request through.

**Given** the Rust web ecosystem,
**When** framework coverage is delivered,
**Then** the primary implementation targets `axum`/`tower` (`Layer` + `Service`), with an optional `actix-web` adapter provided as a thin shim over the same core validation entry point, and neither adapter duplicates protocol logic.

**Given** this story,
**When** the Rust resource-server middleware is delivered,
**Then** the implementation includes:
- Unit tests covering: build-time failure on empty audience; success-path principal insertion into request extensions; the full 401 / 403 / 503 / 500 taxonomy with correct status, challenge/error code, and no-leak body; ID-token rejection for each of `nonce`, `at_hash`, `c_hash`; the optional positive `scope`/`scp` marker; excluded-path and `OPTIONS` bypass.
- A delegation test (or code-review gate) asserting the middleware performs no signature verification, JWKS fetch, or claim validation of its own and instead calls `rust/src/*`.
- Integration tests against a real or simulated authorization server exercising a valid token, an expired token, an ID token presented as an access token, and a JWKS-endpoint outage mapped to 503.
- Working examples for `axum` and (optionally) `actix-web`.

### RFC References

- [RFC 6750 §2 — Authenticated Requests (Bearer Token Usage)](https://www.rfc-editor.org/rfc/rfc6750#section-2)
- [RFC 6750 §3 — The WWW-Authenticate Response Header Field](https://www.rfc-editor.org/rfc/rfc6750#section-3)
- [RFC 6750 §3.1 — Error Codes (`invalid_token`, `insufficient_scope`)](https://www.rfc-editor.org/rfc/rfc6750#section-3.1)
- [OpenID Connect Core §2 — ID Token (`nonce`, `at_hash`)](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [OpenID Connect Core §3.3.2.11 — ID Token (`c_hash`)](https://openid.net/specs/openid-connect-core-1_0.html#HybridIDToken)

---

## Story 22.4: Rust RP Login Router

### User Story

**As a** Rust developer building a confidential relying-party (RP) web application on `axum`,
**I want** an optional login router that mounts `/login`, `/callback`, and `/logout` and drives the OpenID Connect authorization-code flow with PKCE by delegating to the identity-model Rust client core,
**So that** I can add standards-compliant interactive sign-in and sign-out without hand-rolling the redirect choreography, state/nonce binding, or ID-token and UserInfo validation.

### Acceptance Criteria

**Given** the RP router is mounted on an `axum::Router`,
**When** a browser issues `GET /login`,
**Then** the router builds an authorization request carrying `response_type=code`, `client_id`, `redirect_uri`, `scope`, a cryptographically random `state`, a cryptographically random `nonce`, and a PKCE `code_challenge` with `code_challenge_method=S256` per [RFC 6749 §4.1.1](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1) and [RFC 7636 §4](https://www.rfc-editor.org/rfc/rfc7636#section-4), persists the single-use flow state (code verifier, `state`, `nonce`), and redirects the user agent to the authorization endpoint.

**Given** an in-flight authorization request,
**When** the authorization server redirects back to `GET /callback` (query response mode) or posts to `POST /callback` (the `form_post` response mode),
**Then** the router accepts both handlers, reads `code` and `state` from the query string or the form body respectively, and validates `state` against the stored flow state.

**Given** a callback arrives,
**When** the router looks up the flow state by `state`,
**Then** the stored flow state is popped exactly once (single-use): a replayed or duplicate callback for the same `state` finds no state and is rejected.

**Given** a validated callback,
**When** the router exchanges the `code` for tokens and validates the returned ID token,
**Then** it enforces that the ID token's `nonce` equals the `nonce` stored for this flow per [OpenID Connect Core §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation), rejecting the response on mismatch.

**Given** the configured provider URL and the fetched discovery document,
**When** the router initializes or validates provider metadata,
**Then** it enforces that the discovery document's `issuer` exactly equals the issuer implied by the configured URL, failing with an error on any difference.

**Given** the router calls the UserInfo endpoint after a successful token exchange,
**When** the UserInfo response is received,
**Then** the router hard-gates on the UserInfo `sub`: if it does not exactly match the validated ID token's `sub`, the login is rejected per [OpenID Connect Core §5.3.4](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse).

**Given** a signed-in session,
**When** a logout is requested,
**Then** the router serves logout only on `POST /logout` (and rejects `GET`), so a cross-site `GET` cannot force a logout.

**Given** the RP application's token-handling posture,
**When** tokens are obtained,
**Then** the router stores tokens only when token storage is explicitly enabled; otherwise it establishes the authenticated session without persisting the raw tokens.

**Given** the current state of the Rust client library,
**When** this story is scheduled,
**Then** the AC explicitly records the same **dependency caveat** as Story 22.2: the RP login flow requires an authorization-request builder plus callback / `state` / `iss` ([RFC 9207](https://www.rfc-editor.org/rfc/rfc9207)) validation that the Rust client core does **not** yet expose — only PKCE helpers exist today. This story therefore **depends on the parity-hardening callback-validation work** landing in `rust/src/*` (or delivered as a prerequisite sub-story), and the router MUST delegate `iss` validation to that surface per [RFC 9207 §2](https://www.rfc-editor.org/rfc/rfc9207#section-2) rather than implementing it in the middleware layer.

**Given** this story,
**When** the Rust RP login router is delivered,
**Then** the implementation includes:
- Unit tests covering: `/login` request construction (PKCE S256, random `state`, random `nonce`); `state` validation and single-use flow-state pop (including replay rejection); `nonce` binding; issuer-equals-URL enforcement; UserInfo `sub`-mismatch rejection; `POST`-only logout (with `GET` rejected); and token storage gated on explicit opt-in.
- A delegation test (or code-review gate) asserting the router calls the core authorization-request builder and callback/`state`/`iss` validators rather than re-implementing them.
- Integration tests against a real or simulated OpenID Provider exercising an end-to-end login for both query and `form_post` callbacks, plus negative cases for `state`, `nonce`, `iss`, and UserInfo `sub` mismatch.
- A working example RP application built on `axum`.

### RFC References

- [RFC 6749 §4.1 — Authorization Code Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)
- [RFC 6749 §4.1.1 — Authorization Request](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1)
- [RFC 7636 §4 — Proof Key for Code Exchange (PKCE)](https://www.rfc-editor.org/rfc/rfc7636#section-4)
- [RFC 9207 §2 — Authorization Response `iss` Parameter](https://www.rfc-editor.org/rfc/rfc9207#section-2)
- [OpenID Connect Core §3.1.3.7 — ID Token Validation (`nonce`)](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
- [OpenID Connect Core §5.3.4 — UserInfo Response (`sub` verification)](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse)
- [OAuth 2.0 Form Post Response Mode](https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html)

---

## Story 22.5: Packaging & Layout Decision

### User Story

**As a** maintainer of the identity-model monorepo,
**I want** a documented decision on where the Go and Rust middleware live and how they are published, mirroring PIM's package split between the client core and `fastapi-identity-model`,
**So that** the heavy web-framework dependencies of the middleware never leak into the dependency graph of the thin client core, while the middleware still shares the monorepo's tooling, CI, and coordinated versioning.

### Acceptance Criteria

**Given** the two candidate layouts — (a) middleware living in-repo as `go/middleware/` and `rust/middleware/` (or `rust/crates/`), versus (b) middleware split into separately-published modules/crates,
**When** the decision is made,
**Then** this epic body records the chosen layout, the reasoning, and the rejected alternative, and the decision is carried into the architecture artifacts.

**Given** the client core is deliberately kept dependency-light,
**When** the packaging boundary is chosen,
**Then** the decision guarantees that adding the middleware does not introduce `axum`/`tower`/`actix`, `gin`/`echo`/`chi`, or any web-framework dependency as a transitive dependency of the core client library.

**Given** the naming constraint on this project,
**When** module paths and package/crate names are chosen,
**Then** they avoid the IdentityServer and Duende marks, and follow the pattern `identity-model-<framework>` for crates (e.g. `identity-model-axum`, `identity-model-actix`) and `.../go/middleware` (with per-router subpackages such as `.../go/middleware/gin`) for Go.

**Given** this story,
**When** the packaging decision is delivered,
**Then** the deliverable includes: the recorded decision below; the concrete module/crate names and their locations; the versioning and release approach (how these modules/crates tag and publish relative to the core); and confirmation, via a dependency-graph check, that the core client library's published artifact gains no web-framework dependency.

### Decision & Recommendation

**Recommendation: source-in-monorepo, published as separate modules/crates (a hybrid of the two candidates, mirroring PIM's split).**

PIM keeps `fastapi-identity-model` in the same repository as the client core but publishes it as a **separate package** so that installing the core never drags in FastAPI. This epic adopts the same shape for Go and Rust:

- **Go** — a nested module `.../go/middleware/go.mod` with its own module path and version tags (e.g. `.../go/middleware/vX.Y.Z`), depending on the core `go/pkg/*` module. Router adapters live as subpackages (`.../go/middleware/gin`, `.../go/middleware/echo`, `.../go/middleware/chi`) so an application pulls only the framework it uses. A nested module is required because Go's dependency resolution is module-scoped: without a separate module, any application importing the core would transitively acquire `gin`/`echo`/`chi`.
- **Rust** — a separate workspace crate `identity-model-axum` (and optional `identity-model-actix`) under the repo's `crates/`, depending on the core client crate. Cargo feature flags MAY gate `actix` support, but the framework middleware is kept out of the core crate entirely so `cargo add identity-model` never resolves `axum`/`tower`.

**Why not pure in-repo, single-module/crate (candidate a):** it would place web-framework dependencies inside the core's module/crate boundary, breaking the "thin, dependency-light core" property that is the whole point of the parity target.

**Why not a fully separate repository (candidate b, external):** it would forfeit the monorepo's shared CI, cross-language test vectors, coordinated versioning, and single-PR review of core-plus-adapter changes — costs PIM already declined to pay by keeping `fastapi-identity-model` in-tree.

The recommended layout keeps the middleware physically co-located and version-coordinated with the core while enforcing the dependency boundary through the module/crate split — capturing the benefits of both candidates and matching the established PIM precedent.

### RFC References

Not directly RFC-linked. This story governs packaging and dependency boundaries for the middleware that implement the RFC/OIDC behaviors specified in Stories 22.1–22.4.
