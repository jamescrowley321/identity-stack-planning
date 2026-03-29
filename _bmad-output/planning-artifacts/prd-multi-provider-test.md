---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-through-12-accelerated']
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-01.md
  - _bmad-output/brainstorming/research/node-oidc-provider-research.md
  - _bmad-output/planning-artifacts/prd.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 1
  projectDocs: 1
classification:
  projectType: 'multi-provider-test-infrastructure'
  domain: 'identity-access-management'
  complexity: 'medium'
  projectContext: 'brownfield'
  prdStrategy: 'single-focused'
  repoTagging: '[PIM] py-identity-model, [IS] identity-stack'
  qualityTiers:
    pim: 'production-grade'
    is: 'demo-poc-quality'
  targetAudiences:
    pim: 'OSS community + production users'
    is: 'consulting clients + portfolio'
---

# Product Requirements Document — Multi-Provider Test Infrastructure (I4)

**Author:** James
**Date:** 2026-03-29

## Executive Summary

This PRD defines the requirements for **Initiative I4: Multi-Provider Test Infrastructure** — introducing `node-oidc-provider` as a lightweight, OpenID-certified OIDC provider for two purposes: (1) a Docker-based integration test fixture for py-identity-model, replacing or supplementing the heavyweight .NET IdentityServer currently used, and (2) a second OIDC provider wired into identity-stack's Docker Compose `full` profile, demonstrating multi-provider capability alongside Descope. A third epic configures Tyk to validate JWTs from both providers simultaneously.

node-oidc-provider (MIT, maintained by panva/Auth0) is certified from Basic RP through FAPI 2.0, starts in ~2 seconds (vs ~60s for .NET IdentityServer), produces a ~150MB Docker image (vs ~400MB+), and requires zero external infrastructure when using its built-in in-memory adapter. Its `extraTokenClaims` hook can emit Descope-style multi-tenant JWTs (`dct` + `tenants` map), making it a realistic stand-in for integration testing without Descope credentials.

The same Docker container serves double duty: py-identity-model test fixture AND identity-stack second provider. This initiative is scoped tightly — I5 (embedded NestJS OIDC server with custom UI, persistent adapter, production deployment) is explicitly deferred to backlog per Party Mode consensus. The v1 configuration is intentionally minimal: in-memory adapter, static clients, `devInteractions` (built-in dev consent screen), `client_credentials` grant, HTTP only.

**Repo impact:**
- **[PIM]** py-identity-model — `test-fixtures/node-oidc-provider/` (provider.js, Dockerfile), `docker-compose.test.yml` updates, integration test additions
- **[IS]** identity-stack — `docker-compose.yml` (`full` profile), Tyk multi-provider OIDC configuration in `tyk/` API definitions

## Project Classification

- **Project Type:** Multi-provider test infrastructure (integration test fixture + multi-provider demonstration)
- **Domain:** Identity & Access Management
- **Complexity:** Medium — well-understood OIDC protocol, established library, no custom UI or persistence required for v1
- **Project Context:** Brownfield — py-identity-model has existing .NET IdentityServer integration tests; identity-stack has existing Descope provider and Docker Compose configuration
- **PRD Strategy:** Single focused PRD covering I4 only (I5 deferred to backlog)
- **Repo Tagging:** `[PIM]` py-identity-model, `[IS]` identity-stack
- **Quality Tiers:** Production-grade test infrastructure (PIM), Demo/POC quality (IS)
- **Target Audiences:** OSS contributors running py-identity-model tests (PIM), consulting clients and portfolio reviewers evaluating multi-provider capability (IS)

## Success Criteria

### User Success

- **[PIM]** A developer running `docker compose -f docker-compose.test.yml up` gets a working OIDC provider in under 5 seconds, without .NET SDK, certificates, or provider-specific credentials
- **[PIM]** Integration tests that currently run against IdentityServer can run against node-oidc-provider with no changes to test assertions (same OIDC protocol, same claim structures)
- **[IS]** A solutions architect running `docker compose --profile full up` sees two functional OIDC providers (Descope + node-oidc-provider) and can authenticate against either

### Business Success

- **Portfolio credibility:** The identity-stack demonstrates multi-provider OIDC — not just "works with Descope" but "works with any OIDC provider"
- **Test infrastructure cost:** Eliminates .NET IdentityServer dependency for py-identity-model integration tests — no Duende license considerations, no .NET toolchain requirement
- **Developer experience:** 10x faster integration test startup reduces CI time and local development friction

### Technical Success

- **[PIM]** node-oidc-provider container starts and passes health check within 5 seconds
- **[PIM]** node-oidc-provider Docker image is under 200MB
- **[PIM]** All existing py-identity-model integration test scenarios (discovery, JWKS, token validation) pass against node-oidc-provider
- **[PIM]** node-oidc-provider emits JWTs with Descope-style `dct` and `tenants` claims via `extraTokenClaims` hook
- **[IS]** Tyk validates JWTs from both Descope and node-oidc-provider simultaneously without code changes to the FastAPI backend
- **[IS]** The `full` Docker Compose profile includes node-oidc-provider as a running service with health check

## Product Scope

### MVP

- **[PIM]** node-oidc-provider Docker container with in-memory adapter, static `client_credentials` client, `devInteractions` enabled, HTTP only
- **[PIM]** `test-fixtures/node-oidc-provider/` directory with `provider.js` (~100 lines), `Dockerfile` (~10 lines), and `package.json`
- **[PIM]** `docker-compose.test.yml` updated to include node-oidc-provider service with health check
- **[PIM]** Integration tests running against node-oidc-provider: discovery fetch, JWKS retrieval, JWT validation, `client_credentials` token acquisition
- **[IS]** node-oidc-provider service added to `docker-compose.yml` under `full` profile
- **[IS]** Tyk `openid_options.providers` array configured for both Descope and node-oidc-provider issuers

### Growth Features (Post-MVP)

- **[PIM]** Descope-style `dct`/`tenants` claims via `extraTokenClaims` for multi-tenant test scenarios
- **[PIM]** Multiple key types (RSA + EC simultaneously) for key-type coverage testing
- **[PIM]** Dual-issuer testing (two node-oidc-provider instances with different issuers) to validate py-identity-model's multi-issuer support
- **[PIM]** Token introspection and revocation endpoint test coverage
- **[IS]** UI indicator showing which provider authenticated the current session

### Vision (Future)

- **[PIM]** Full OIDC conformance test harness using node-oidc-provider as the authorization server
- **[PIM]** Key rotation scenario tests (JWKS change + restart, cache invalidation)
- **[IS]** Three+ simultaneous providers in `full` profile (Descope + node-oidc-provider + Ory Hydra) — feeds into PRD 4 (Multi-IdP Gateway Demo)
- **[IS]** Provider capability discovery (`provider.supports("fga")`, `provider.supports("rbac")`) driven by which providers are active

## Functional Requirements

### [PIM] Epic 1 — node-oidc-provider Test Fixture for py-identity-model

#### Container & Configuration

- FR-1: Create `test-fixtures/node-oidc-provider/provider.js` that instantiates `oidc-provider` with in-memory adapter, a single static `client_credentials` client (client_id: `test-client`, client_secret: `test-secret`), and `devInteractions` enabled
- FR-2: Create `test-fixtures/node-oidc-provider/Dockerfile` using `node:20-alpine` base image producing an image under 200MB
- FR-3: Create `test-fixtures/node-oidc-provider/package.json` with `oidc-provider` as sole production dependency
- FR-4: Container exposes port 3000 and starts the provider on `0.0.0.0:3000` with issuer URL configurable via `ISSUER` environment variable (default: `http://localhost:3000`)
- FR-5: Container passes Docker health check (`/.well-known/openid-configuration` returns HTTP 200) within 5 seconds of startup

#### Docker Compose Integration

- FR-6: Add `oidc-provider` service to `docker-compose.test.yml` with health check configuration (interval: 2s, timeout: 5s, retries: 10, start_period: 5s)
- FR-7: Test runner service depends on `oidc-provider` with `condition: service_healthy`
- FR-8: Test runner receives `DISCOVERY_URL=http://oidc-provider:3000/.well-known/openid-configuration` environment variable

#### Integration Tests

- FR-9: Integration test verifies discovery document fetch from node-oidc-provider returns valid OpenID Configuration with required fields (`issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`)
- FR-10: Integration test verifies JWKS endpoint returns valid JSON Web Key Set with at least one signing key
- FR-11: Integration test acquires a `client_credentials` access token from node-oidc-provider's token endpoint and validates it using py-identity-model's token validation pipeline (signature, issuer, expiration)
- FR-12: Integration test verifies JWT access token contains standard claims (`iss`, `sub`, `aud`, `exp`, `iat`, `jti`)

#### Custom Claims (Growth)

- FR-13: Configure `extraTokenClaims` hook to inject `dct` (current tenant ID) and `tenants` (map of tenant ID to roles/permissions) into JWT access tokens when `X-Tenant-Context` header is present on the token request
- FR-14: Integration test verifies Descope-style multi-tenant claims are present in the issued JWT and match the expected structure (`tenants.{tenant_id}.roles[]`, `tenants.{tenant_id}.permissions[]`)

### [IS] Epic 2 — node-oidc-provider as identity-stack Second Provider

- FR-15: Add `node-oidc-provider` service to identity-stack's `docker-compose.yml` under the `full` profile, using the same Docker image built for Epic 1
- FR-16: node-oidc-provider service in identity-stack uses a distinct issuer URL (`http://node-oidc-provider:3000`) and its own static client configuration suitable for authorization code flow (redirect_uri pointing to the frontend)
- FR-17: node-oidc-provider service is accessible from the host at `http://localhost:3100` (port mapping 3100:3000) to avoid conflicts with other services
- FR-18: `docker compose --profile full up` starts Descope-connected services AND node-oidc-provider without manual configuration
- FR-19: node-oidc-provider's `devInteractions` provides a functional (dev-only) login/consent screen — no custom UI required for v1

### [IS] Epic 3 — Tyk Multi-Provider OIDC Configuration

- FR-20: Configure Tyk API definition's `openid_options.providers` array to include both the Descope OIDC issuer and the node-oidc-provider issuer
- FR-21: Tyk validates JWT access tokens from either provider — a valid Descope token and a valid node-oidc-provider token both pass Tyk's JWT middleware and reach the FastAPI backend
- FR-22: Tyk rejects tokens not signed by either configured provider's JWKS keys
- FR-23: Tyk API definition is stored as a version-controlled JSON file in the `tyk/` directory
- FR-24: Document the `openid_options.providers` configuration pattern in a code comment or inline documentation within the Tyk API definition file, explaining how to add additional providers

## Non-Functional Requirements

### Performance

- NFR-1: **[PIM]** node-oidc-provider container cold start (from `docker compose up` to health check passing) completes in under 5 seconds
- NFR-2: **[PIM]** `client_credentials` token acquisition latency under 50ms (excluding container startup)
- NFR-3: **[PIM]** Full integration test suite against node-oidc-provider completes in under 30 seconds (excluding container startup), compared to current ~120 seconds against .NET IdentityServer
- NFR-4: **[PIM]** Docker image size under 200MB (compared to ~400MB+ for .NET IdentityServer image)

### Security

- NFR-5: **[PIM]** node-oidc-provider test fixture runs HTTP only — no TLS certificate management required for test scenarios. This is acceptable because the fixture runs in an isolated Docker network for testing purposes only.
- NFR-6: **[PIM]** Static client credentials (`test-client`/`test-secret`) are used only in test fixtures, never in production. Test fixture code includes a comment explicitly marking these as test-only values.
- NFR-7: **[IS]** node-oidc-provider in the `full` profile uses `devInteractions` — the built-in dev-only consent screen. This must NOT be exposed in any production deployment. Docker Compose profile naming (`full` not `production`) signals this intent.

### Compatibility

- NFR-8: **[PIM]** Existing .NET IdentityServer integration tests continue to work — node-oidc-provider supplements, does not forcibly replace. Both test targets can coexist in `docker-compose.test.yml` with separate profiles or service names.
- NFR-9: **[PIM]** node-oidc-provider v9.x (current stable) used. Pin to exact version in `package.json` to prevent breaking changes from minor version bumps (node-oidc-provider ships breaking changes to experimental features in MINOR versions per its versioning policy).
- NFR-10: **[IS]** Adding node-oidc-provider to the `full` profile does not affect the `standalone` or `gateway` profiles — default `docker compose up` (no profile flag) behavior is unchanged.
- NFR-11: **[IS]** FastAPI backend requires zero code changes to accept tokens from node-oidc-provider — Tyk handles multi-provider JWT validation at the gateway layer.

### Testing

- NFR-12: **[PIM]** node-oidc-provider integration tests are tagged/marked so they can run independently from .NET IdentityServer tests (e.g., `pytest -m node_oidc` vs `pytest -m identity_server`)
- NFR-13: **[PIM]** CI pipeline runs node-oidc-provider integration tests on every PR — the 5-second startup makes this feasible without dedicated infrastructure
- NFR-14: **[IS]** Tyk multi-provider configuration is validated by a test that acquires tokens from both providers and verifies both pass through Tyk to the backend
- NFR-15: **[PIM]** 80%+ unit test coverage requirement (existing) is not affected — integration tests against node-oidc-provider are additive

### Maintainability

- NFR-16: **[PIM]** node-oidc-provider configuration is a single `provider.js` file under 150 lines — no framework, no build step, no TypeScript compilation
- NFR-17: **[PIM]** The test fixture has exactly one production dependency (`oidc-provider`) — no middleware frameworks, no ORMs, no build tools
- NFR-18: **[IS]** Tyk API definition for multi-provider OIDC is a single JSON file with inline comments documenting the `providers` array structure
