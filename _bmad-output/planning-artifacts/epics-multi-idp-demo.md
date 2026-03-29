---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-multi-idp-demo.md
  - _bmad-output/planning-artifacts/architecture-multi-idp-demo.md
---

# Multi-IdP Gateway Demo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for PRD 4 (Multi-IdP Gateway Demo), decomposing the requirements from the PRD and Architecture into implementable stories. All code lives within the identity-stack repository. Each story is scoped to a single PR.

## Requirements Inventory

### Functional Requirements

| FR | Epic | Description |
|----|------|-------------|
| FR-1 | Epic 1 | Tyk Go plugin, PostAuth hook |
| FR-2 | Epic 1 | ClaimMapper interface with CanonicalIdentity |
| FR-3 | Epic 1 | DescopeMapper implementation |
| FR-4 | Epic 1 | OryMapper implementation |
| FR-5 | Epic 1 | GenericMapper (fallback) implementation |
| FR-6 | Epic 1 | Provider detection via issuer claim |
| FR-7 | Epic 1 | Canonical header injection |
| FR-8 | Epic 1 | Error handling (HTTP 500 on normalization failure) |
| FR-9 | Epic 1 | Plugin compilation via tyk-plugin-compiler |
| FR-10 | Epic 1 | Makefile build-plugin target |
| FR-11 | Epic 1 | Plugin source at tyk/plugins/claim-normalizer/ |
| FR-12 | Epic 2 | /demo/multi-idp route with provider card grid |
| FR-13 | Epic 2 | Provider card: logo, name, Sign In button, status |
| FR-14 | Epic 2 | signinPopup() via oidc-client-ts |
| FR-15 | Epic 2 | Auto-call GET /api/whoami after popup auth |
| FR-16 | Epic 2 | Raw claims (collapsible) + normalized response display |
| FR-17 | Epic 2 | Provider configs from env vars / config file |
| FR-18 | Epic 2 | Independent OIDC sessions per provider |
| FR-19 | Epic 3 | node-oidc-provider Docker Compose service |
| FR-20 | Epic 3 | node-oidc-provider Descope-compatible claims |
| FR-21 | Epic 3 | Ory Hydra Docker Compose service |
| FR-22 | Epic 3 | Minimal consent/login stub for Ory Hydra |
| FR-23 | Epic 3 | Register local IdPs in Tyk openid_options |
| FR-24 | Epic 3 | Docker healthchecks + depends_on ordering |
| FR-25 | Epic 3 | Cloud IdP setup docs (v2) |
| FR-26 | Epic 4 | GET /api/whoami reads canonical headers only |
| FR-27 | Epic 4 | /api/whoami JSON response schema |
| FR-28 | Epic 4 | /api/whoami 401 if X-User-ID missing |
| FR-29 | Epic 4 | Zero IdP-specific code in /api/whoami |
| FR-30 | Epic 4 | /api/whoami accessible only through Tyk |

### Non-Functional Requirements

| NFR | Description |
|-----|-------------|
| NFR-1 | Plugin < 2ms latency |
| NFR-2 | Popup flow < 3s for local IdPs |
| NFR-3 | Full round-trip < 5s for local IdPs |
| NFR-4 | Canonical headers stripped from inbound requests |
| NFR-5 | Plugin logs provider name + user ID only, not token contents |
| NFR-6 | No IdP secrets committed to git |
| NFR-7 | Popup redirect URIs restricted to localhost |
| NFR-8 | Plugin compiled against exact Tyk version |
| NFR-9 | Demo UI works in Chrome, Firefox, Edge |
| NFR-10 | Adding new IdP requires only: mapper file, registry entry, Tyk provider entry, UI card config |
| NFR-11 | Each ClaimMapper has unit tests (well-formed, missing optional, malformed claims) |
| NFR-12 | GenericMapper tested with 3+ provider claim formats |
| NFR-13 | Integration test: node-oidc-provider JWT through Tyk to /api/whoami |
| NFR-14 | build-plugin target in CI |
| NFR-15 | docker compose --profile full up starts everything, demo usable within 60s |
| NFR-16 | docker compose --profile full down -v cleans up |

## Epic List

### Epic 1: Claim Normalization Plugin
A Tyk Go plugin (PostAuth hook) that normalizes heterogeneous JWT claim formats from multiple OIDC providers into canonical HTTP headers, enabling fully IdP-agnostic backend code.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11

### Epic 2: Multi-IdP Demo UI
A React demo page at `/demo/multi-idp` displaying a grid of provider cards, each performing an independent OIDC popup login and showing both raw claims and normalized API responses side by side.
**FRs covered:** FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18

### Epic 3: Local IdP Provisioning
Docker Compose services for node-oidc-provider and Ory Hydra under the `full` profile, with healthchecks, zero-config startup, and Tyk OIDC provider registration.
**FRs covered:** FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25

### Epic 4: Demo API Endpoint
A GET `/api/whoami` endpoint in FastAPI that reads only canonical headers and returns a normalized identity response, containing zero IdP-specific code.
**FRs covered:** FR-26, FR-27, FR-28, FR-29, FR-30

---

## Epic 1: Claim Normalization Plugin

A Tyk Go plugin (PostAuth hook) that normalizes heterogeneous JWT claim formats from multiple OIDC providers into canonical HTTP headers (`X-User-ID`, `X-User-Email`, `X-Roles`, `X-Tenant`, `X-IdP`), enabling fully IdP-agnostic backend code.

### Story 1.1: Plugin Scaffold and PostAuth Hook Registration

As a platform engineer,
I want a Go plugin project that registers a PostAuth hook with the Tyk gateway,
So that claim normalization logic can execute after JWT validation and before upstream forwarding.

**FRs:** FR-1, FR-11

**Acceptance Criteria:**

- [ ] Plugin source directory exists at `tyk/plugins/claim-normalizer/` with `main.go`, `go.mod`, `go.sum`
- [ ] `main.go` exports a `PostAuthHook` function with the signature Tyk expects for Go plugins
- [ ] Plugin compiles without errors using `tykio/tyk-plugin-compiler` Docker image (version matching docker-compose.yml Tyk version)
- [ ] When loaded by Tyk, the plugin logs a startup message confirming registration
- [ ] Plugin hook executes on every authenticated request (verified by a temporary log statement)

### Story 1.2: ClaimMapper Interface and CanonicalIdentity Struct

As a plugin developer,
I want a `ClaimMapper` interface and `CanonicalIdentity` struct that define the normalization contract,
So that per-provider mappers have a consistent API and output format.

**FRs:** FR-2

**Acceptance Criteria:**

- [ ] `ClaimMapper` interface defined in `mappers/mapper.go` with methods: `CanMap(issuer string) bool` and `MapClaims(claims map[string]interface{}) (*CanonicalIdentity, error)`
- [ ] `CanonicalIdentity` struct defined in `canonical.go` with fields: `UserID` (string), `Email` (string), `Roles` ([]string), `Tenant` (string), `Provider` (string)
- [ ] `CanonicalIdentity` has a method to inject its fields as HTTP headers on a request
- [ ] Header names match the contract: `X-User-ID`, `X-User-Email`, `X-Roles` (JSON array string), `X-Tenant`, `X-IdP`
- [ ] Empty optional fields produce empty string headers (not omitted headers)
- [ ] Unit tests verify header injection for fully populated and partially populated `CanonicalIdentity` instances

### Story 1.3: Issuer-Based Provider Detection and Normalization Pipeline

As a plugin developer,
I want a normalization pipeline that detects the IdP from the JWT issuer claim and dispatches to the correct mapper,
So that each request is normalized by the appropriate provider-specific logic.

**FRs:** FR-6, FR-7, FR-8

**Acceptance Criteria:**

- [ ] `normalizer.go` implements an issuer-to-mapper registry initialized with all registered `ClaimMapper` implementations
- [ ] Registry iterates mappers calling `CanMap(issuer)` and uses the first match
- [ ] If no mapper matches the issuer, `GenericMapper` is used as fallback
- [ ] Pipeline extracts JWT claims from the Tyk request context (decoded claims post-JWT-validation)
- [ ] On successful mapping, canonical headers are injected on the upstream request (FR-7)
- [ ] On mapping failure (missing required claims, type errors), the plugin returns HTTP 500 with structured JSON error body: `{"error": "claim_normalization_failed", "detail": "..."}` (FR-8)
- [ ] Error logs include mapper name and claim key names but NOT claim values (NFR-5)
- [ ] Inbound canonical headers (`X-User-ID`, `X-User-Email`, `X-Roles`, `X-Tenant`, `X-IdP`) are stripped from the original request before normalization runs (NFR-4)
- [ ] Unit tests cover: successful dispatch to correct mapper, fallback to GenericMapper for unknown issuer, error response on missing `sub` claim

### Story 1.4: DescopeMapper Implementation

As a plugin developer,
I want a Descope-specific claim mapper that extracts identity from Descope's multi-tenant JWT structure,
So that Descope tokens produce correct canonical headers including tenant-scoped roles.

**FRs:** FR-3

**Acceptance Criteria:**

- [ ] `mappers/descope.go` implements `ClaimMapper` interface
- [ ] `CanMap()` returns true for issuers matching `https://api.descope.com/` prefix (handles both OIDC and session issuer formats)
- [ ] `MapClaims()` extracts: `sub` -> UserID, `email` -> Email, `dct` -> Tenant, `tenants[dct].roles` -> Roles
- [ ] Provider is hardcoded to `"descope"`
- [ ] When `dct` is missing, Tenant is empty string and Roles is empty slice (no error)
- [ ] When `email` is missing, Email is empty string (no error)
- [ ] When `sub` is missing, returns error (sub is required)
- [ ] When `tenants` map is present but `dct` value is not a key in the map, Roles is empty slice
- [ ] Unit tests cover: well-formed Descope claims, missing `dct`, missing `email`, missing `sub`, `dct` pointing to nonexistent tenant, malformed `tenants` (wrong type), null values

### Story 1.5: OryMapper Implementation

As a plugin developer,
I want an Ory Hydra-specific claim mapper that extracts identity from Ory's `ext` namespace,
So that Ory Hydra tokens produce correct canonical headers.

**FRs:** FR-4

**Acceptance Criteria:**

- [ ] `mappers/ory.go` implements `ClaimMapper` interface
- [ ] `CanMap()` returns true for issuers matching `http://ory-hydra` prefix (handles port variations)
- [ ] `MapClaims()` extracts: `sub` -> UserID, `email` -> Email, `ext.roles` -> Roles, `ext.tenant` -> Tenant
- [ ] Provider is hardcoded to `"ory"`
- [ ] When `ext` is missing, Roles and Tenant are empty (no error)
- [ ] When `ext.roles` is missing but `ext` exists, Roles is empty slice
- [ ] When `sub` is missing, returns error
- [ ] Unit tests cover: well-formed Ory claims, missing `ext`, missing `ext.roles`, missing `sub`, `ext.roles` with wrong type (string instead of array), null values

### Story 1.6: GenericMapper (Fallback) Implementation

As a plugin developer,
I want a generic fallback mapper that extracts standard OIDC claims,
So that any unconfigured OIDC provider (including node-oidc-provider) still produces usable canonical headers.

**FRs:** FR-5

**Acceptance Criteria:**

- [ ] `mappers/generic.go` implements `ClaimMapper` interface
- [ ] `CanMap()` always returns true (fallback -- accepts any issuer)
- [ ] `MapClaims()` extracts: `sub` -> UserID, `email` -> Email
- [ ] If top-level `roles` claim exists and is an array of strings, extract as Roles
- [ ] If top-level `dct` claim exists and is a string, extract as Tenant
- [ ] Provider is hardcoded to `"generic"`
- [ ] When `sub` is missing, returns error
- [ ] When `email` is missing, Email is empty string (no error)
- [ ] Unit tests cover: minimal claims (sub only), standard claims (sub + email), claims with top-level roles, claims with top-level dct, claims from at least 3 different OIDC provider formats to verify fallback correctness (NFR-12)

### Story 1.7: Build Pipeline and Makefile Target

As a platform engineer,
I want a `build-plugin` Makefile target that compiles the plugin using the version-pinned Tyk plugin compiler,
So that the plugin binary is reproducibly built and CI can fail on compilation errors.

**FRs:** FR-9, FR-10

**Acceptance Criteria:**

- [ ] `Makefile` at the repository root includes a `build-plugin` target
- [ ] Target runs `tykio/tyk-plugin-compiler:v5.3` Docker container (version matching docker-compose.yml)
- [ ] Plugin source at `tyk/plugins/claim-normalizer/` is mounted as input
- [ ] Compiled `.so` file is output to `tyk/plugins/claim-normalizer.so`
- [ ] If Go compilation fails, the make target exits with non-zero status
- [ ] If the tyk-plugin-compiler version does not match the Tyk gateway version in docker-compose.yml, a version mismatch produces a build-time error (NFR-8)
- [ ] `.so` file is gitignored (only source is committed)
- [ ] CI pipeline includes the `build-plugin` target; build failure fails the pipeline (NFR-14)

---

## Epic 2: Multi-IdP Demo UI

A React demo page at `/demo/multi-idp` displaying a responsive grid of provider cards. Each card performs an independent OIDC popup login via `oidc-client-ts`, then displays both raw token claims and the normalized `/api/whoami` response.

### Story 2.1: ProviderCard Component

As a developer viewing the demo,
I want a reusable ProviderCard React component that displays a provider's identity and status,
So that each IdP is represented consistently in the demo grid.

**FRs:** FR-13

**Acceptance Criteria:**

- [ ] `ProviderCard` component accepts a `ProviderConfig` prop (id, name, icon, authority, clientId, scope)
- [ ] Card displays: provider icon/logo, provider name, "Sign In" button in idle state
- [ ] After authentication, card displays a status indicator (authenticated / unauthenticated)
- [ ] Card has a "Sign Out" action to clear the per-provider session
- [ ] Component is visually self-contained and renders correctly as a grid item
- [ ] Unit test verifies rendering in idle state and authenticated state

### Story 2.2: Provider Configuration and Grid Layout

As a developer viewing the demo,
I want the demo page to load provider configurations from environment variables and display them in a responsive grid,
So that provider setup is configuration-driven and the page looks good on all screen sizes.

**FRs:** FR-12, FR-17

**Acceptance Criteria:**

- [ ] `/demo/multi-idp` route exists in the React router
- [ ] `providers.config.ts` loads provider configurations from environment variables: `VITE_DESCOPE_PROJECT_ID`, `VITE_NODE_OIDC_AUTHORITY`, `VITE_ORY_HYDRA_AUTHORITY`, `VITE_GATEWAY_URL`
- [ ] Provider configs include at minimum: Descope, node-oidc-provider, Ory Hydra
- [ ] `MultiIdpDemo` page renders a grid of `ProviderCard` components from the loaded configs
- [ ] Grid layout is responsive: 4 columns on desktop (>1024px), 2 on tablet (768-1024px), 1 on mobile (<768px)
- [ ] Page includes a heading and brief explanation of what the demo shows
- [ ] Page renders correctly with zero authenticated providers (all cards in idle state)

### Story 2.3: Descope OIDC Popup Flow

As a developer viewing the demo,
I want the Descope provider card to perform an OIDC popup login using `oidc-client-ts`,
So that I can authenticate with Descope and see the round-trip result.

**FRs:** FR-14, FR-18

**Acceptance Criteria:**

- [ ] Clicking "Sign In" on the Descope card creates a `UserManager` instance with Descope-specific OIDC configuration (authority = `https://api.descope.com/{project_id}`, client_id, scope = `openid email profile`)
- [ ] `signinPopup()` opens a popup window to Descope's authorization endpoint
- [ ] After successful authentication, popup closes and the card receives the `User` object with `access_token`
- [ ] The Descope card's OIDC session is independent of other provider cards and the main app's auth context (FR-18)
- [ ] Popup redirect URI is restricted to `http://localhost:*` origin (NFR-7)
- [ ] Card transitions to authenticated state after successful popup

### Story 2.4: node-oidc-provider and Ory Hydra Popup Flows

As a developer viewing the demo,
I want provider cards for node-oidc-provider and Ory Hydra to perform OIDC popup logins,
So that I can authenticate with local IdPs and see the round-trip results.

**FRs:** FR-14, FR-18

**Acceptance Criteria:**

- [ ] node-oidc-provider card creates a `UserManager` with authority = `http://localhost:3001`, client_id = `demo-client`
- [ ] Ory Hydra card creates a `UserManager` with authority = `http://localhost:4444/`, client_id = `demo-client`
- [ ] Both cards use `signinPopup()` for popup-based authentication
- [ ] node-oidc-provider popup shows the built-in `devInteractions` login form
- [ ] Ory Hydra popup redirects to the consent stub's login form
- [ ] After authentication, both cards receive `User` objects with access tokens
- [ ] Each card's OIDC session is independent of all other cards

### Story 2.5: Raw Claims and Normalized Response Display

As a developer viewing the demo,
I want each provider card to display raw token claims and the normalized `/api/whoami` response,
So that I can visually compare claim formats across providers and see the normalization in action.

**FRs:** FR-15, FR-16

**Acceptance Criteria:**

- [ ] After successful popup auth, the card automatically calls `GET /api/whoami` through the Tyk gateway (`VITE_GATEWAY_URL`) with the provider's access token in the `Authorization: Bearer` header (FR-15)
- [ ] Card displays two sections: (a) raw token claims (collapsible, secondary styling) and (b) normalized API response (prominent, primary styling) (FR-16)
- [ ] Raw claims section shows the decoded JWT payload as formatted JSON
- [ ] Normalized response section shows: `user_id`, `email`, `roles`, `tenant`, `provider` with clear labels
- [ ] Visual emphasis is on the normalized output being identical in structure across all providers -- this is the "aha moment"
- [ ] If the `/api/whoami` call fails, an error message is displayed in the card
- [ ] Loading state is shown while the API call is in progress

### Story 2.6: Popup Callback Route

As a developer,
I want a popup callback route that handles OIDC authorization code exchange in the popup window,
So that the popup flow completes correctly and returns tokens to the parent window.

**FRs:** FR-14

**Acceptance Criteria:**

- [ ] A callback route exists at `/demo/multi-idp/callback` (or equivalent popup callback URL)
- [ ] The callback page processes the authorization code response using `oidc-client-ts` `UserManager.signinPopupCallback()`
- [ ] After processing, the popup window closes automatically
- [ ] The callback handles errors (user denied consent, invalid state) gracefully with an error message before closing
- [ ] The callback route works correctly for all registered providers (Descope, node-oidc-provider, Ory Hydra)

---

## Epic 3: Local IdP Provisioning

Docker Compose services for node-oidc-provider and Ory Hydra under the `full` profile, with healthchecks, zero-config startup, Tyk OIDC provider registration, and dependency ordering.

### Story 3.1: node-oidc-provider Docker Compose Service

As a platform engineer,
I want a node-oidc-provider service in docker-compose.yml under the `full` profile,
So that a local OIDC provider starts automatically with zero manual configuration.

**FRs:** FR-19, FR-20

**Acceptance Criteria:**

- [ ] `idp/node-oidc-provider/` directory contains `Dockerfile`, `provider.js`, `package.json`
- [ ] Dockerfile uses `node:20-alpine`, installs `oidc-provider`, copies `provider.js`
- [ ] `provider.js` configures: in-memory adapter, static client (`demo-client` / `demo-secret`), `redirect_uris` including popup callback, `devInteractions` enabled, JWT access tokens
- [ ] `extraTokenClaims` hook emits Descope-compatible claims: `roles`, `dct`, `email` (FR-20)
- [ ] Service definition in `docker-compose.yml` under `full` profile, exposed on port 3001
- [ ] Healthcheck: `wget -q --spider http://localhost:3001/.well-known/openid-configuration` with 5s interval, 10 retries (FR-24)
- [ ] No IdP secrets committed to git; client_secret set via environment variable or Docker Compose `.env` file (NFR-6)
- [ ] `docker compose --profile full up node-oidc-provider` starts and becomes healthy within 10 seconds

### Story 3.2: Ory Hydra Docker Compose Service with Consent Stub

As a platform engineer,
I want an Ory Hydra service with a minimal login/consent stub in docker-compose.yml under the `full` profile,
So that a local OAuth2/OIDC provider starts automatically with test users.

**FRs:** FR-21, FR-22

**Acceptance Criteria:**

- [ ] `ory-hydra` service in `docker-compose.yml` uses `oryd/hydra:v2` image, `full` profile
- [ ] Ory Hydra configured with in-memory storage (`DSN=memory`), issuer `http://ory-hydra:4444/`
- [ ] Healthcheck: `wget -q --spider http://localhost:4444/health/alive` (FR-24)
- [ ] `idp/hydra-consent/` directory contains a minimal Node.js Express app (or static page) for login/consent (FR-22)
- [ ] Consent stub auto-accepts consent and presents a basic login form with hardcoded test user (`demo@ory.local` / `password`)
- [ ] Consent stub sets `ext.roles` and `ext.tenant` in the access token claims via consent session
- [ ] `hydra-consent` service depends on `ory-hydra` being healthy
- [ ] OAuth2 client pre-configured via Hydra admin API on startup (client_id = `demo-client`, redirect_uris including popup callback, grant_types = `authorization_code`, response_types = `code`)
- [ ] No IdP secrets committed to git (NFR-6)

### Story 3.3: Tyk Multi-Provider OIDC Registration and Dependency Ordering

As a platform engineer,
I want both local IdPs registered in Tyk's OIDC provider configuration with correct dependency ordering,
So that the Tyk gateway validates tokens from all three providers (Descope + two local).

**FRs:** FR-23, FR-24

**Acceptance Criteria:**

- [ ] Tyk API definition's `openid_options.providers` array includes entries for: Descope (cloud), node-oidc-provider (local), Ory Hydra (local)
- [ ] Each provider entry specifies the correct issuer URL and client_id-to-policy mapping
- [ ] Tyk gateway `depends_on` includes both `node-oidc-provider` and `ory-hydra` with `condition: service_healthy` (FR-24)
- [ ] Tyk gateway does not start until all IdP discovery endpoints return 200
- [ ] After all services are healthy, Tyk can validate JWTs from all three providers
- [ ] `docker compose --profile full up` starts all services and the demo page is usable within 60 seconds (NFR-15)
- [ ] `docker compose --profile full down -v` removes all containers and volumes cleanly (NFR-16)

### Story 3.4: Cloud IdP Setup Documentation

As a developer wanting to add Entra ID or Cognito to the demo,
I want setup guides documenting how to configure cloud IdPs,
So that I can extend the demo with my own cloud identity provider accounts.

**FRs:** FR-25

**Acceptance Criteria:**

- [ ] `docs/setup-entra-id.md` documents: Azure AD app registration, redirect URI configuration, app role manifest, required scopes, Tyk provider entry, EntraMapper activation
- [ ] `docs/setup-cognito.md` documents: Cognito user pool creation, app client configuration, group creation, required scopes, Tyk provider entry, CognitoMapper activation
- [ ] Both guides include screenshots or CLI commands for each configuration step
- [ ] Both guides note that these are v2 features requiring the user's own cloud accounts
- [ ] Guides reference the corresponding mapper implementations (v2) and the ProviderConfig format for adding a UI card

---

## Epic 4: Demo API Endpoint

A GET `/api/whoami` endpoint in FastAPI that reads only canonical headers and returns a normalized identity response, containing zero IdP-specific code.

### Story 4.1: GET /api/whoami Endpoint

As a backend developer,
I want a GET `/api/whoami` endpoint that reads canonical headers and returns a normalized identity response,
So that the backend demonstrates complete IdP agnosticism.

**FRs:** FR-26, FR-27, FR-28, FR-29

**Acceptance Criteria:**

- [ ] `GET /api/whoami` endpoint exists in the FastAPI backend
- [ ] Endpoint reads ONLY canonical headers: `X-User-ID`, `X-User-Email`, `X-Roles`, `X-Tenant`, `X-IdP` (FR-26)
- [ ] Returns JSON response: `{ "user_id": "...", "email": "...", "roles": [...], "tenant": "...", "provider": "..." }` (FR-27)
- [ ] `X-Roles` header (JSON array string) is parsed into a Python list for the response
- [ ] Returns HTTP 401 with `{"detail": "Not authenticated"}` if `X-User-ID` header is missing (FR-28)
- [ ] Endpoint source file contains zero IdP-specific imports, logic, or conditional branches (FR-29)
- [ ] No imports from py-identity-model, descope SDK, or any identity-provider library
- [ ] Unit tests cover: all headers present, missing `X-User-ID` (401), missing optional headers (empty values in response), `X-Roles` with empty array, `X-Roles` with multiple roles

### Story 4.2: Gateway-Only Access and Integration Test

As a platform engineer,
I want the `/api/whoami` endpoint to be accessible only through the Tyk gateway (in `full` profile),
So that canonical headers are always set by the gateway and cannot be spoofed by direct backend access.

**FRs:** FR-30

**Acceptance Criteria:**

- [ ] In the `full` Docker Compose profile, `/api/whoami` is routed through Tyk (gateway handles authentication and claim normalization)
- [ ] Direct backend access to `/api/whoami` (port 8000) without canonical headers returns 401 (X-User-ID is missing because no plugin injected it)
- [ ] Integration test: request with a valid JWT from node-oidc-provider flows through Tyk, hits the claim normalization plugin, and returns a correct `/api/whoami` response with all canonical fields populated (NFR-13)
- [ ] Integration test verifies the response contains: `user_id` (non-empty), `email`, `roles` (list), `provider` = `"generic"` (node-oidc-provider uses GenericMapper)
- [ ] Integration test can run as part of `make test-integration` (requires `full` profile services running)
