---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-multi-provider-test.md
  - _bmad-output/planning-artifacts/architecture-multi-provider-test.md
---

# Multi-Provider Test Infrastructure (I4) — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Initiative I4: Multi-Provider Test Infrastructure. It decomposes the requirements from the PRD and Architecture into implementable stories across two repositories:

- **[PIM]** py-identity-model — node-oidc-provider test fixture, Docker Compose integration, integration tests
- **[IS]** identity-stack (identity-stack) — `full` profile second provider, Tyk multi-provider OIDC

Each story is scoped to a single PR. Acceptance criteria reference FRs from the PRD.

## Requirements Inventory

### Functional Requirements

**[PIM] py-identity-model — Epic 1**

- FR-1: Create `provider.js` with in-memory adapter, static `client_credentials` client, `devInteractions` enabled
- FR-2: Create Dockerfile using `node:20-alpine`, image under 200MB
- FR-3: Create `package.json` with `oidc-provider` as sole production dependency
- FR-4: Container exposes port 3000, issuer configurable via `ISSUER` env var
- FR-5: Container passes health check within 5 seconds
- FR-6: Add `oidc-provider` service to `docker-compose.test.yml` with health check
- FR-7: Test runner depends on `oidc-provider` with `condition: service_healthy`
- FR-8: Test runner receives `DISCOVERY_URL` environment variable
- FR-9: Integration test verifies discovery document fetch
- FR-10: Integration test verifies JWKS endpoint returns valid key set
- FR-11: Integration test validates `client_credentials` access token via py-identity-model
- FR-12: Integration test verifies JWT contains standard claims
- FR-13: `extraTokenClaims` hook injects `dct`/`tenants` claims (Growth)
- FR-14: Integration test verifies Descope-style multi-tenant claims (Growth)

**[IS] identity-stack — Epic 2**

- FR-15: Add `node-oidc-provider` service to identity-stack `docker-compose.yml` under `full` profile
- FR-16: Distinct issuer URL and auth code flow client configuration
- FR-17: Host-accessible at `localhost:3100` (port mapping 3100:3000)
- FR-18: `docker compose --profile full up` starts node-oidc-provider without manual config
- FR-19: `devInteractions` provides functional dev-only login/consent

**[IS] identity-stack — Epic 3**

- FR-20: Tyk `openid_options.providers` array configured for both issuers
- FR-21: Tyk validates JWTs from either provider
- FR-22: Tyk rejects tokens not signed by configured providers
- FR-23: Tyk API definition stored as version-controlled JSON
- FR-24: Inline documentation for `openid_options.providers` pattern

### Non-Functional Requirements

- NFR-1: Cold start to health check under 5 seconds
- NFR-2: `client_credentials` token acquisition under 50ms
- NFR-3: Full integration test suite under 30 seconds (excluding startup)
- NFR-4: Docker image under 200MB
- NFR-5: HTTP only — no TLS for test fixture
- NFR-6: Static credentials marked as test-only
- NFR-7: `devInteractions` in `full` profile only, never production
- NFR-8: Existing IdentityServer tests continue working
- NFR-9: Pin `oidc-provider` to exact version
- NFR-10: Adding `full` profile service does not affect standalone/gateway profiles
- NFR-11: FastAPI backend zero code changes
- NFR-12: node-oidc-provider tests independently taggable (`pytest -m node_oidc`)
- NFR-13: CI runs node-oidc-provider tests on every PR
- NFR-14: Tyk multi-provider validated by end-to-end test
- NFR-15: 80%+ coverage not affected — integration tests are additive
- NFR-16: `provider.js` under 150 lines
- NFR-17: Single production dependency (`oidc-provider`)
- NFR-18: Tyk API definition is a single JSON file with inline documentation

### FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR-1 | Epic 1 | 1.1 | provider.js configuration |
| FR-2 | Epic 1 | 1.2 | Dockerfile |
| FR-3 | Epic 1 | 1.1 | package.json |
| FR-4 | Epic 1 | 1.1 | Port and issuer configuration |
| FR-5 | Epic 1 | 1.2 | Health check |
| FR-6 | Epic 1 | 1.3 | Docker Compose service |
| FR-7 | Epic 1 | 1.3 | Test runner dependency |
| FR-8 | Epic 1 | 1.3 | DISCOVERY_URL env var |
| FR-9 | Epic 1 | 1.4 | Discovery document test |
| FR-10 | Epic 1 | 1.4 | JWKS endpoint test |
| FR-11 | Epic 1 | 1.4 | Token validation test |
| FR-12 | Epic 1 | 1.4 | Standard claims test |
| FR-13 | Epic 1 | 1.5 | extraTokenClaims hook |
| FR-14 | Epic 1 | 1.5 | Descope-style claims test |
| FR-15 | Epic 2 | 2.1 | Full profile service |
| FR-16 | Epic 2 | 2.1 | Auth code client config |
| FR-17 | Epic 2 | 2.1 | Host port 3100 |
| FR-18 | Epic 2 | 2.1 | Profile-gated startup |
| FR-19 | Epic 2 | 2.1 | devInteractions |
| FR-20 | Epic 3 | 3.1 | Tyk providers array |
| FR-21 | Epic 3 | 3.1 | Dual-provider validation |
| FR-22 | Epic 3 | 3.2 | Token rejection |
| FR-23 | Epic 3 | 3.1 | Version-controlled API definition |
| FR-24 | Epic 3 | 3.1 | Inline documentation |

## Epic List

### Epic 1: node-oidc-provider Test Fixture for py-identity-model
Developers can run py-identity-model integration tests against a lightweight, OpenID-certified OIDC provider that starts in under 5 seconds, with no .NET SDK, certificates, or provider-specific credentials required.
**FRs covered:** FR-1 through FR-14
**Repo:** py-identity-model

### Epic 2: identity-stack Second Provider
Solutions architects running `docker compose --profile full up` see two functional OIDC providers (Descope + node-oidc-provider) demonstrating multi-provider capability.
**FRs covered:** FR-15 through FR-19
**Repo:** identity-stack (identity-stack)

### Epic 3: Tyk Multi-Provider OIDC Configuration
Tyk API gateway validates JWTs from both Descope and node-oidc-provider simultaneously, proving the identity-stack works with any OIDC-compliant provider — not just Descope.
**FRs covered:** FR-20 through FR-24
**Repo:** identity-stack (identity-stack)

---

## Epic 1: node-oidc-provider Test Fixture for py-identity-model

Developers can run py-identity-model integration tests against a lightweight, OpenID-certified OIDC provider that starts in under 5 seconds, with no .NET SDK, certificates, or provider-specific credentials required. Existing IdentityServer tests continue to work alongside the new provider.

### Story 1.1: Create node-oidc-provider Configuration and Package

As a library maintainer,
I want a minimal `provider.js` and `package.json` that configure node-oidc-provider as a test fixture,
So that py-identity-model has a fast, lightweight OIDC provider for integration testing.

**Acceptance Criteria:**

- [ ] **Given** a new directory `test-fixtures/node-oidc-provider/` is created
  **When** the directory contents are reviewed
  **Then** it contains `provider.js`, `package.json`, and `.dockerignore` (FR-1, FR-3)

- [ ] **Given** `provider.js` instantiates `oidc-provider` with configuration
  **When** the configuration is reviewed
  **Then** it uses the in-memory adapter, registers a static `client_credentials` client (`client_id: 'test-client'`, `client_secret: 'test-secret'`), enables `devInteractions`, and sets `formats.accessToken = 'jwt'` (FR-1)

- [ ] **Given** `provider.js` reads environment variables
  **When** `ISSUER` is set to `http://oidc-provider:3000`
  **Then** the provider uses that value as its issuer URL; when `ISSUER` is not set, it defaults to `http://localhost:3000` (FR-4)

- [ ] **Given** `provider.js` starts the server
  **When** the provider is running
  **Then** it listens on `0.0.0.0:3000` and `GET /.well-known/openid-configuration` returns HTTP 200 with a valid OpenID Configuration document (FR-4)

- [ ] **Given** `package.json` declares dependencies
  **When** the dependency list is reviewed
  **Then** `oidc-provider` is the sole production dependency, pinned to an exact version (e.g., `"9.7.1"`) (FR-3, NFR-9, NFR-17)

- [ ] **Given** `provider.js` is a single configuration file
  **When** line count is checked
  **Then** it is under 150 lines (NFR-16)

- [ ] **Given** the file contains static test credentials
  **When** the source is reviewed
  **Then** a header comment states `// TEST FIXTURE ONLY — DO NOT USE IN PRODUCTION` (NFR-6)

### Story 1.2: Create Dockerfile and Verify Image Constraints

As a library maintainer,
I want a Dockerfile that builds a small, fast-starting container for node-oidc-provider,
So that integration tests can run quickly in CI and locally.

**Acceptance Criteria:**

- [ ] **Given** a `Dockerfile` in `test-fixtures/node-oidc-provider/`
  **When** the Dockerfile is reviewed
  **Then** it uses `node:20-alpine` as the base image, copies `package.json` and `provider.js`, runs `npm ci --production`, and exposes port 3000 (FR-2)

- [ ] **Given** the Docker image is built with `docker build .`
  **When** the image size is inspected with `docker images`
  **Then** the image is under 200MB (FR-2, NFR-4)

- [ ] **Given** the container is started with `docker run`
  **When** the container's health check is monitored
  **Then** `/.well-known/openid-configuration` returns HTTP 200 within 5 seconds of startup (FR-5, NFR-1)

- [ ] **Given** the Dockerfile includes a `HEALTHCHECK` instruction
  **When** the health check configuration is reviewed
  **Then** it uses `wget -q --spider http://localhost:3000/.well-known/openid-configuration` with interval 2s, timeout 5s, retries 10, start_period 5s (FR-5)

### Story 1.3: Integrate node-oidc-provider into Docker Compose

As a library maintainer,
I want node-oidc-provider added to `docker-compose.test.yml` alongside the existing IdentityServer,
So that the test runner can discover and connect to the new provider automatically.

**Acceptance Criteria:**

- [ ] **Given** `docker-compose.test.yml` is updated
  **When** the service list is reviewed
  **Then** an `oidc-provider` service is defined with the build context `./test-fixtures/node-oidc-provider` and health check matching FR-6 (interval: 2s, timeout: 5s, retries: 10, start_period: 5s) (FR-6)

- [ ] **Given** the `oidc-provider` service is defined
  **When** the test-runner service dependencies are reviewed
  **Then** test-runner depends on `oidc-provider` with `condition: service_healthy` (FR-7)

- [ ] **Given** the test-runner service receives environment variables
  **When** the environment configuration is reviewed
  **Then** `DISCOVERY_URL=http://oidc-provider:3000/.well-known/openid-configuration` is set (FR-8)

- [ ] **Given** the existing IdentityServer services (cert-generator, identityserver) remain in the file
  **When** `docker compose up identityserver` is run
  **Then** the IdentityServer starts and passes its health check as before — no regression (NFR-8)

- [ ] **Given** both providers are defined in the same compose file
  **When** `docker compose up oidc-provider test-runner` is run
  **Then** the test runner starts after node-oidc-provider is healthy, without needing the IdentityServer services

### Story 1.4: Implement Integration Tests Against node-oidc-provider

As a library maintainer,
I want integration tests that validate py-identity-model's core OIDC operations against node-oidc-provider,
So that I can prove the library works correctly with a certified, non-.NET OIDC provider.

**Acceptance Criteria:**

- [ ] **Given** a new test module `src/tests/integration/test_node_oidc_provider.py`
  **When** tests are marked
  **Then** all tests use `@pytest.mark.node_oidc` so they can run independently with `pytest -m node_oidc` (NFR-12)

- [ ] **Given** the node-oidc-provider is running
  **When** the discovery document test executes
  **Then** it fetches `/.well-known/openid-configuration` using py-identity-model and validates that the response contains: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported` (FR-9)

- [ ] **Given** the node-oidc-provider is running
  **When** the JWKS test executes
  **Then** it fetches the JWKS endpoint using py-identity-model and validates that the response contains at least one key with `kty`, `kid`, and `use` fields (FR-10)

- [ ] **Given** the node-oidc-provider is running
  **When** the token acquisition and validation test executes
  **Then** it acquires a `client_credentials` access token from the token endpoint, then validates the JWT using py-identity-model's token validation pipeline (signature verification, issuer check, expiration check) (FR-11)

- [ ] **Given** a valid JWT access token from node-oidc-provider
  **When** the standard claims test inspects the decoded token
  **Then** the JWT contains `iss`, `sub`, `aud`, `exp`, `iat`, and `jti` claims (FR-12)

- [ ] **Given** the full integration test suite runs against node-oidc-provider
  **When** execution time is measured (excluding container startup)
  **Then** the suite completes in under 30 seconds (NFR-3)

- [ ] **Given** the node-oidc-provider integration tests are additive
  **When** the overall test suite coverage is measured
  **Then** the 80%+ unit test coverage requirement is unaffected — integration tests do not count toward the unit coverage gate (NFR-15)

### Story 1.5: Add Descope-Style Custom Claims (Growth)

As a library maintainer,
I want node-oidc-provider to emit JWTs with Descope-style `dct` and `tenants` claims,
So that py-identity-model integration tests can validate multi-tenant JWT structures without Descope credentials.

**Acceptance Criteria:**

- [ ] **Given** `provider.js` implements the `extraTokenClaims` hook
  **When** a token request includes an `X-Tenant-Context: tenant-1` header
  **Then** the issued JWT contains a `dct` claim set to `"tenant-1"` and a `tenants` claim with the structure `{ "tenant-1": { "roles": [...], "permissions": [...] } }` (FR-13)

- [ ] **Given** a token request does NOT include an `X-Tenant-Context` header
  **When** the token is issued
  **Then** the JWT contains only standard OIDC claims — no `dct` or `tenants` claims (backward compatibility)

- [ ] **Given** a new integration test for custom claims
  **When** the test acquires a token with `X-Tenant-Context: tenant-1`
  **Then** it validates that `dct == "tenant-1"` and `tenants["tenant-1"]["roles"]` is a list and `tenants["tenant-1"]["permissions"]` is a list (FR-14)

- [ ] **Given** the multi-tenant JWT structure matches Descope's format
  **When** the test validates claim structure
  **Then** the `tenants` map supports multiple tenant entries, each with `roles[]` and `permissions[]` arrays (FR-14)

### Story 1.6: Add Multi-Key-Type JWKS Support (Growth)

As a library maintainer,
I want node-oidc-provider to serve both RSA and EC keys in its JWKS,
So that py-identity-model's multi-algorithm key selection can be tested.

**Acceptance Criteria:**

- [ ] **Given** `provider.js` JWKS configuration includes both key types
  **When** the `/jwks` endpoint is fetched
  **Then** it returns at least one RSA key and one EC (P-256) key

- [ ] **Given** node-oidc-provider signs tokens with the primary key (RSA)
  **When** py-identity-model validates the JWT
  **Then** it correctly selects the RSA key from JWKS based on `kid` and `alg` header values

- [ ] **Given** the JWKS contains multiple key types
  **When** py-identity-model fetches and caches the JWKS
  **Then** both RSA and EC keys are available in the cached key set for subsequent validations

### Story 1.7: CI Pipeline Integration

As a library maintainer,
I want node-oidc-provider integration tests to run automatically on every PR,
So that OIDC protocol compliance is continuously validated without slowing down CI.

**Acceptance Criteria:**

- [ ] **Given** the CI workflow configuration is updated
  **When** a PR is opened or updated
  **Then** the node-oidc-provider integration tests run as part of the CI pipeline (NFR-13)

- [ ] **Given** the CI job starts the node-oidc-provider container
  **When** the container health check passes
  **Then** integration tests begin executing within 10 seconds of job start (container startup + health check)

- [ ] **Given** existing CI jobs for unit tests and IdentityServer integration tests
  **When** the node-oidc-provider CI job is added
  **Then** it runs in parallel with (not blocking) the existing test jobs

- [ ] **Given** the CI workflow uses `docker compose`
  **When** the `oidc-provider` and `test-runner` services are started
  **Then** only node-oidc-provider-dependent services start — IdentityServer services are not required

---

## Epic 2: identity-stack Second Provider

Solutions architects running `docker compose --profile full up` see two functional OIDC providers (Descope + node-oidc-provider) demonstrating that the identity-stack architecture supports any OIDC-compliant provider, not just Descope.

### Story 2.1: Add node-oidc-provider Service to Full Profile

As a solutions architect,
I want node-oidc-provider running as a second OIDC provider in the identity-stack full profile,
So that I can demonstrate multi-provider OIDC capability to clients.

**Acceptance Criteria:**

- [ ] **Given** `docker-compose.yml` in the identity-stack repo is updated
  **When** the service list is reviewed
  **Then** a `node-oidc-provider` service is defined under the `full` profile with build context pointing to the py-identity-model test fixture (FR-15)

- [ ] **Given** the `node-oidc-provider` service configuration
  **When** the port mapping is reviewed
  **Then** host port 3100 maps to container port 3000 (`3100:3000`), avoiding conflicts with other services (FR-17)

- [ ] **Given** the `node-oidc-provider` service environment
  **When** the issuer is reviewed
  **Then** `ISSUER=http://node-oidc-provider:3000` is set as a distinct issuer URL (FR-16)

- [ ] **Given** the `node-oidc-provider` service includes an authorization_code client
  **When** the client configuration is reviewed
  **Then** it registers a client with `grant_types: ['authorization_code']`, `redirect_uris: ['http://localhost:3000/callback']`, and appropriate scopes for interactive login (FR-16)

- [ ] **Given** `devInteractions` is enabled on the provider
  **When** a user navigates to the authorization endpoint
  **Then** a functional dev-only login/consent screen appears — no custom UI is required (FR-19)

- [ ] **Given** the service is gated behind the `full` profile
  **When** `docker compose up` is run without a profile flag
  **Then** node-oidc-provider does NOT start (NFR-10)
  **And when** `docker compose --profile full up` is run
  **Then** node-oidc-provider starts alongside all other full-profile services (FR-18)

### Story 2.2: Frontend Provider Selection (Growth)

As a user of the identity-stack demo,
I want to choose which OIDC provider to authenticate against,
So that the multi-provider capability is visible in the UI.

**Acceptance Criteria:**

- [ ] **Given** the frontend is running in the `full` profile
  **When** the login page is displayed
  **Then** there is a visual indicator or selector showing available providers (e.g., "Login with Descope" and "Login with OIDC Provider")

- [ ] **Given** a user selects the node-oidc-provider option
  **When** the OAuth2 flow initiates
  **Then** the browser redirects to node-oidc-provider's authorization endpoint (via `devInteractions`)

- [ ] **Given** a user authenticates via node-oidc-provider
  **When** the callback completes
  **Then** the frontend receives a valid access token and the user session is established

### Story 2.3: Backend Multi-Provider Awareness (Growth)

As a backend developer,
I want the FastAPI backend to display which provider authenticated the current request,
So that multi-provider capability is demonstrable in API responses.

**Acceptance Criteria:**

- [ ] **Given** a request arrives at the backend with a valid JWT
  **When** the `iss` claim is inspected
  **Then** the backend can identify whether the token came from Descope or node-oidc-provider

- [ ] **Given** a `/api/me` or equivalent endpoint exists
  **When** the response is returned
  **Then** it includes an `auth_provider` field indicating the token's issuer

- [ ] **Given** the backend requires zero code changes for JWT validation (NFR-11)
  **When** multi-provider awareness is added
  **Then** it is implemented as an additive response enrichment, not a change to the validation pipeline

---

## Epic 3: Tyk Multi-Provider OIDC Configuration

Tyk API gateway validates JWTs from both Descope and node-oidc-provider simultaneously, proving the identity-stack works with any OIDC-compliant provider without backend code changes.

### Story 3.1: Configure Tyk for Dual-Provider JWT Validation

As a platform engineer,
I want Tyk configured to validate JWTs from both Descope and node-oidc-provider,
So that API requests authenticated by either provider reach the FastAPI backend.

**Acceptance Criteria:**

- [ ] **Given** the Tyk API definition file in the `tyk/` directory
  **When** the `openid_options.providers` array is reviewed
  **Then** it contains entries for both the Descope issuer (`https://api.descope.com/{project_id}`) and the node-oidc-provider issuer (`http://node-oidc-provider:3000`) (FR-20)

- [ ] **Given** a valid JWT issued by Descope
  **When** the token is sent as a `Bearer` token in an API request through Tyk
  **Then** Tyk validates the JWT against Descope's JWKS and forwards the request to the backend (FR-21)

- [ ] **Given** a valid JWT issued by node-oidc-provider
  **When** the token is sent as a `Bearer` token in an API request through Tyk
  **Then** Tyk validates the JWT against node-oidc-provider's JWKS and forwards the request to the backend (FR-21)

- [ ] **Given** the Tyk API definition is a version-controlled file
  **When** the file location is checked
  **Then** it exists as a JSON file in the `tyk/` directory (FR-23)

- [ ] **Given** the `openid_options.providers` array configuration
  **When** the file is reviewed
  **Then** inline comments or adjacent documentation explain the providers array structure and how to add additional providers (FR-24)

### Story 3.2: Validate Token Rejection for Unknown Providers

As a platform engineer,
I want Tyk to reject tokens not signed by either configured provider,
So that only tokens from trusted issuers can access the backend.

**Acceptance Criteria:**

- [ ] **Given** a JWT signed by a key NOT in either provider's JWKS
  **When** the token is sent through Tyk
  **Then** Tyk returns HTTP 401 Unauthorized and the request does NOT reach the backend (FR-22)

- [ ] **Given** a JWT with an `iss` claim that does not match either configured provider
  **When** the token is sent through Tyk
  **Then** Tyk rejects the token with HTTP 401

- [ ] **Given** an expired JWT from a configured provider
  **When** the token is sent through Tyk
  **Then** Tyk rejects the token (standard JWT expiration validation)

### Story 3.3: Multi-Provider End-to-End Validation Test

As a platform engineer,
I want an automated test that validates the full multi-provider flow,
So that I can verify the Tyk + dual-provider configuration works end-to-end.

**Acceptance Criteria:**

- [ ] **Given** the `full` profile is running (Tyk + Descope + node-oidc-provider + backend)
  **When** the validation test acquires a `client_credentials` token from node-oidc-provider
  **Then** a request with that token passes through Tyk to the backend and returns a successful response (NFR-14)

- [ ] **Given** the validation test
  **When** it sends a request with a self-signed JWT (not from either provider)
  **Then** Tyk rejects the request with HTTP 401

- [ ] **Given** the validation test is automated
  **When** it runs as part of the integration test suite
  **Then** it completes without manual intervention and reports pass/fail clearly

---

## Implementation Order

### Recommended Sequence

```
Epic 1 (Stories 1.1 → 1.2 → 1.3 → 1.4) ──── MVP
    │
    ├── Story 1.5 (custom claims) ──────────── Growth, after MVP
    ├── Story 1.6 (multi-key) ──────────────── Growth, after MVP
    └── Story 1.7 (CI) ────────────────────── After Story 1.4
    │
Epic 2 (Story 2.1) ────────────────────────── After Epic 1 MVP (depends on same Docker image)
    │
    ├── Story 2.2 (frontend selection) ─────── Growth, after 2.1
    └── Story 2.3 (backend awareness) ─────── Growth, after 2.1
    │
Epic 3 (Stories 3.1 → 3.2 → 3.3) ─────────── After Epic 2 Story 2.1
```

**Dependencies:**
- Epic 1 Stories 1.1-1.2 (container + Dockerfile) must be complete before any other story
- Epic 1 Story 1.3 (Docker Compose) depends on 1.1-1.2
- Epic 1 Story 1.4 (integration tests) depends on 1.3
- Epic 2 depends on the Docker image built in Epic 1
- Epic 3 depends on Epic 2 Story 2.1 (node-oidc-provider running in identity-stack)
- Growth stories (1.5, 1.6, 2.2, 2.3) are independent of each other and can be parallelized

### Effort Estimates

| Story | Effort | Notes |
|-------|--------|-------|
| 1.1 | Small (1-2 hours) | Single JS file + package.json |
| 1.2 | Small (1 hour) | ~10-line Dockerfile |
| 1.3 | Small (1-2 hours) | Docker Compose service addition |
| 1.4 | Medium (3-4 hours) | 4-5 integration tests + pytest marks |
| 1.5 | Small (2-3 hours) | extraTokenClaims hook + test |
| 1.6 | Small (1-2 hours) | Add EC key to JWKS + test |
| 1.7 | Small (1-2 hours) | CI workflow update |
| 2.1 | Small (1-2 hours) | Docker Compose profile addition |
| 2.2 | Medium (3-4 hours) | Frontend UI changes |
| 2.3 | Small (1-2 hours) | Response enrichment |
| 3.1 | Small (2-3 hours) | Tyk JSON config + docs |
| 3.2 | Small (1-2 hours) | Rejection validation |
| 3.3 | Medium (2-3 hours) | E2E test automation |

**Total MVP (1.1-1.4, 2.1, 3.1-3.2):** ~12-16 hours
**Total with Growth:** ~22-30 hours
