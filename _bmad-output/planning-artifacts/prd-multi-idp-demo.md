---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-through-12-accelerated']
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-03-29-01.md
  - _bmad-output/brainstorming/research/tyk-gateway-research.md
  - _bmad-output/brainstorming/research/node-oidc-provider-research.md
  - _bmad-output/planning-artifacts/prd.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 2
  brainstorming: 1
  projectDocs: 1
classification:
  projectType: 'multi-idp-gateway-demo'
  domain: 'identity-access-management'
  complexity: 'medium'
  projectContext: 'greenfield-within-brownfield'
  prdStrategy: 'standalone-initiative-prd'
  repoTagging: '[IS] identity-stack'
  qualityTiers:
    plugin: 'production-grade'
    demo-ui: 'demo-poc-quality'
    local-idps: 'demo-poc-quality'
    whoami-api: 'demo-poc-quality'
  targetAudiences:
    primary: 'consulting clients + portfolio reviewers'
    secondary: 'developers evaluating multi-provider identity architectures'
dependencies:
  - 'PRD 2: API Gateway & Deployment Topology (Tyk + OpenFeature)'
  - 'PRD 3: Multi-Provider Test Infrastructure (node-oidc-provider)'
---

# Product Requirements Document - Multi-IdP Gateway Demo (I8)

**Author:** James
**Date:** 2026-03-29

## Executive Summary

This PRD defines the capstone initiative for the identity-stack platform: a **Multi-IdP Gateway Demo** that visually proves a single backend can serve authenticated requests from any OIDC-compliant identity provider without IdP-specific code. A Tyk Go plugin (PostAuth hook) normalizes heterogeneous JWT claim formats from Descope, node-oidc-provider, Ory Hydra, and (in v2) Entra ID and Cognito into canonical HTTP headers (`X-User-ID`, `X-User-Email`, `X-Roles`, `X-Tenant`, `X-IdP`). A React demo page renders a grid of provider cards, each performing an OIDC popup login flow via `oidc-client-ts`, then making a round-trip API call through the gateway. The backend reads only canonical headers and returns a normalized identity response. The "aha moment" is seeing the same canonical `{user_id, email, roles, provider}` output regardless of which identity provider issued the token.

This initiative depends on PRD 2 (Tyk API Gateway integration) and PRD 3 (node-oidc-provider as a second provider) being complete. It lives entirely within the identity-stack repository.

### What Makes This Special

**The demo is the argument.** Every identity platform vendor claims "works with any provider." This demo proves it live: three different IdPs, three different claim formats, one backend, one canonical output. The Tyk claim normalization plugin is a reusable architectural pattern -- not a toy. The plugin's `ClaimMapper` interface is extensible: adding a new IdP means adding one Go file implementing one interface. The backend never changes.

## Project Classification

- **Project Type:** Multi-IdP federation demo with reusable claim normalization plugin
- **Domain:** Identity & Access Management
- **Complexity:** Medium -- Go plugin development against Tyk's plugin API, multi-provider OIDC configuration, popup-based OAuth flows in React
- **Project Context:** Greenfield within brownfield -- new plugin and demo UI built on top of existing identity-stack + Tyk infrastructure (from PRD 2/3)
- **PRD Strategy:** Standalone initiative PRD (PRD 4 of 4 in the toolchain expansion plan)
- **Repo Tagging:** `[IS]` identity-stack -- all code lives in identity-stack (tyk/plugins/, frontend demo page, backend endpoint, docker-compose.yml)
- **Quality Tiers:** Production-grade (claim normalization plugin), Demo/POC (UI, local IdP configs, whoami endpoint)
- **Target Audiences:** Consulting clients and portfolio reviewers (primary), developers evaluating multi-provider identity architectures (secondary)

## Success Criteria

### User Success

- A developer runs `docker compose --profile full up`, opens the demo page, clicks "Sign In" on any provider card, and sees the same canonical identity output within 30 seconds of first interaction
- A solutions architect viewing the demo understands the claim normalization pattern without reading source code -- the UI makes the mapping visible (raw claims vs. normalized output)
- Adding a new identity provider requires only: (1) a new Go file implementing `ClaimMapper`, (2) a Tyk OIDC provider entry, (3) a provider card in the UI -- no backend changes

### Business Success

- **Portfolio impact:** The demo is the single most compelling artifact in the identity-stack portfolio -- "here's multi-provider federation working live"
- **Consulting credibility:** Demonstrates practical IdP abstraction, not theoretical architecture diagrams
- **Reusable plugin:** The claim normalization plugin is extractable for real gateway deployments, not just demo code

### Technical Success

- Claim normalization plugin handles 3 IdP claim formats (Descope, node-oidc-provider, Ory Hydra) with correct mapping in v1
- All 3 IdPs work out of the box with zero manual configuration via `docker compose --profile full up`
- GET `/api/whoami` returns identical response schema regardless of which IdP issued the token
- Plugin compiles against the pinned Tyk version using `tykio/tyk-plugin-compiler` Docker image with zero build warnings
- End-to-end flow (popup login -> token acquisition -> API call through gateway -> normalized response) completes in < 5 seconds per provider

## Product Scope

### MVP (v1)

- **3 IdPs:** Descope (cloud, already configured), node-oidc-provider (local Docker, zero-config), Ory Hydra (local Docker, zero-config)
- **Claim normalization plugin** with `ClaimMapper` interface and 3 provider mappers + generic fallback
- **Demo UI** with provider card grid, popup OIDC flows, raw claims display, normalized response display
- **GET `/api/whoami`** endpoint reading canonical headers only
- **Docker Compose** services for node-oidc-provider and Ory Hydra in the `full` profile
- All zero-config -- `docker compose --profile full up` starts everything

### Growth Features (v2)

- **Cloud IdPs:** Entra ID and Cognito mapper implementations with setup instructions (requires user's own tenant/pool)
- **Enhanced UI:** Side-by-side comparison mode, claim diff highlighting, provider health indicators
- **Plugin metrics:** Prometheus counters per-provider (normalized_claims_total, normalization_errors_total)
- **Additional mappers:** More granular role/permission extraction for Entra groups and Cognito custom attributes

### Vision (v3)

- **IdentityServer (.NET)** as additional provider with mapper
- **Dynamic provider registration** -- add new IdPs via configuration without rebuilding the plugin
- **Claim mapping DSL** -- declarative YAML/JSON mapping rules as alternative to compiled Go mappers
- **Live claim transformation inspector** -- UI shows the mapping pipeline step by step

## Functional Requirements

### Epic 1: Tyk Claim Normalization Plugin (Go, PostAuth Hook)

- FR-1: Implement a Tyk Go plugin registered as a `PostAuth` hook that executes after JWT validation and before upstream forwarding
- FR-2: Define a `ClaimMapper` interface with method `MapClaims(claims map[string]interface{}) (*CanonicalIdentity, error)` where `CanonicalIdentity` contains `UserID`, `Email`, `Roles` ([]string), `Tenant` (string), and `Provider` (string)
- FR-3: Implement `DescopeMapper` -- extracts `sub`, `email`, reads `dct` as tenant, reads `tenants[dct].roles` as roles, sets provider to `descope`
- FR-4: Implement `OryMapper` -- extracts `sub`, `email`, reads `ext.roles` as roles, reads `ext.tenant` or metadata for tenant, sets provider to `ory`
- FR-5: Implement `GenericMapper` -- extracts `sub`, `email`, reads top-level `roles` claim if present, sets provider to `generic`. Used as fallback for node-oidc-provider (whose claims mirror Descope format via `extraTokenClaims`) and any unconfigured IdP
- FR-6: Implement provider detection by inspecting the `iss` (issuer) claim against a configurable issuer-to-mapper registry. Fall back to `GenericMapper` for unknown issuers
- FR-7: Plugin injects canonical headers on the upstream request: `X-User-ID`, `X-User-Email`, `X-Roles` (JSON array string), `X-Tenant`, `X-IdP`
- FR-8: Plugin returns HTTP 500 with structured error body if claim normalization fails (missing required claims, mapper error)
- FR-9: Plugin is compiled using `tykio/tyk-plugin-compiler` Docker image matching the exact Tyk Gateway version used in docker-compose.yml
- FR-10: Provide `Makefile` target `build-plugin` that builds the plugin `.so` file into `tyk/plugins/` directory
- FR-11: Plugin source lives at `tyk/plugins/claim-normalizer/` within the identity-stack repository

### Epic 2: Multi-IdP Demo UI (React)

- FR-12: Create a `/demo/multi-idp` route in the React frontend displaying a grid of provider cards
- FR-13: Each provider card displays: provider logo/icon, provider name, a "Sign In" button, and (after auth) a status indicator (authenticated/unauthenticated)
- FR-14: "Sign In" button triggers an OIDC authorization code flow via `oidc-client-ts` `signinPopup()` using the provider's OIDC configuration (authority, client_id, redirect_uri, scope)
- FR-15: After successful popup auth, the card automatically calls `GET /api/whoami` through the Tyk gateway with the provider's access token in the `Authorization: Bearer` header
- FR-16: Each card displays two sections: (a) raw token claims (collapsible, secondary) and (b) normalized API response (primary, prominent). The visual emphasis is on the normalized output being identical across providers
- FR-17: Provider configurations (authority URL, client_id, scopes) are loaded from environment variables or a configuration file, not hardcoded
- FR-18: The demo page functions without the main application's authentication context -- it manages its own per-provider OIDC sessions independently

### Epic 3: Local IdP Provisioning (Docker Compose)

- FR-19: Add a `node-oidc-provider` service to docker-compose.yml under the `full` profile with in-memory adapter, static client configuration (client_id, client_secret, redirect_uris for popup flow), and `devInteractions` enabled for zero-config login
- FR-20: Configure node-oidc-provider to emit Descope-compatible claims via `extraTokenClaims` hook: `dct` (tenant), `tenants` map with roles, `email`
- FR-21: Add an `ory-hydra` service to docker-compose.yml under the `full` profile with in-memory storage, pre-configured OAuth2 client, and consent/login stub endpoints
- FR-22: Provide a minimal consent/login application for Ory Hydra (can be a simple Node.js Express app or static page) that auto-accepts consent and presents a basic login form with hardcoded test users
- FR-23: Register both local IdPs in Tyk's `openid_options.providers` array with their respective issuer URLs and client IDs
- FR-24: All local IdP services must pass Docker healthchecks (discovery endpoint returns 200) before Tyk gateway starts (via `depends_on` with `condition: service_healthy`)
- FR-25: Document configuration instructions for cloud IdPs (Entra ID, Cognito) as v2 setup guides -- not automated, requires user's own accounts

### Epic 4: Demo API Endpoint

- FR-26: Implement `GET /api/whoami` endpoint in the FastAPI backend that reads ONLY the canonical headers: `X-User-ID`, `X-User-Email`, `X-Roles`, `X-Tenant`, `X-IdP`
- FR-27: `/api/whoami` returns a JSON response: `{ "user_id": "...", "email": "...", "roles": [...], "tenant": "...", "provider": "..." }`
- FR-28: `/api/whoami` returns HTTP 401 if `X-User-ID` header is missing (request was not authenticated by Tyk)
- FR-29: `/api/whoami` must contain zero IdP-specific imports, logic, or conditional branches -- it is fully IdP-agnostic by reading only canonical headers
- FR-30: `/api/whoami` is accessible only through the Tyk gateway (the `full` profile routes it through Tyk). Direct backend access without canonical headers returns 401

## Non-Functional Requirements

### Performance

- NFR-1: **[IS]** Claim normalization plugin adds < 2ms latency to the request pipeline (measured at the plugin boundary, excluding Tyk's own JWT validation overhead)
- NFR-2: **[IS]** OIDC popup flow completes in < 3 seconds for local IdPs (node-oidc-provider, Ory Hydra) from button click to token receipt
- NFR-3: **[IS]** Full round-trip (popup login -> API call -> normalized response displayed) completes in < 5 seconds for local IdPs

### Security

- NFR-4: **[IS]** Canonical headers (`X-User-ID`, `X-Roles`, etc.) are stripped from inbound requests by Tyk before forwarding -- the backend trusts these headers only because Tyk sets them after validation. Clients cannot spoof canonical headers
- NFR-5: **[IS]** Plugin does not log or expose full JWT token contents. Logs only provider name and user ID on successful normalization. Errors log claim key names, not values
- NFR-6: **[IS]** No IdP secrets (client_secrets, management keys) are committed to git. Local IdP client secrets are set via environment variables or Docker Compose `.env` file
- NFR-7: **[IS]** Popup redirect URIs are restricted to `http://localhost:*` origins in all local IdP configurations

### Compatibility

- NFR-8: **[IS]** Plugin compiles against the exact Tyk Gateway version specified in docker-compose.yml using the matching `tykio/tyk-plugin-compiler` tag. Version mismatch produces a build-time error, not a runtime crash
- NFR-9: **[IS]** Demo UI works in Chrome, Firefox, and Edge. Safari popup flow may require user interaction acknowledgment (known browser limitation, documented)
- NFR-10: **[IS]** Adding a new IdP mapper requires only: (1) new Go file implementing `ClaimMapper`, (2) entry in issuer-to-mapper registry, (3) Tyk OIDC provider entry, (4) UI provider card configuration. No changes to existing mappers, plugin core, backend, or docker-compose services

### Testing

- NFR-11: **[IS]** Each `ClaimMapper` implementation has unit tests covering: (a) well-formed claims from the real provider format, (b) missing optional claims (email, tenant), (c) malformed claims (wrong types, null values)
- NFR-12: **[IS]** `GenericMapper` is tested with claims from at least 3 OIDC providers to verify fallback correctness
- NFR-13: **[IS]** Integration test: request with a valid JWT from node-oidc-provider flows through Tyk, hits the plugin, and returns a correct `/api/whoami` response with all canonical fields populated
- NFR-14: **[IS]** Plugin build is tested in CI via the `build-plugin` Makefile target -- build failure fails the CI pipeline

### Operational

- NFR-15: **[IS]** `docker compose --profile full up` starts all services (frontend, backend, Tyk, Redis, node-oidc-provider, Ory Hydra) and the demo page is usable within 60 seconds of the command completing
- NFR-16: **[IS]** `docker compose --profile full down -v` cleanly removes all containers and volumes with no orphaned resources
