---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-epic-1-stories", "step-04-epic-2-stories"]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# auth-planning - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for auth-planning, decomposing the requirements from the PRD and Architecture into implementable stories across the three-repo vertically integrated identity platform (py-identity-model, descope-saas-starter, terraform-provider-descope).

## Requirements Inventory

### Functional Requirements

**[PIM] py-identity-model**

*Review Fix Chain & Certification*

- FR-PIM-1: Complete review fix chain for all 16 open feature PRs (T101-T116) — each PR's adversarial review findings resolved and merged
- FR-PIM-2: Build OIDC conformance test harness — thin FastAPI RP app using py-identity-model, Docker Compose extending OpenID conformance suite, automation via suite REST API
- FR-PIM-3: Pass Basic RP profile conformance tests — auth code flow, ID token validation (issuer, sub, aud, iat, kid handling, signatures), nonce validation, UserInfo sub mismatch detection, client_secret_basic auth
- FR-PIM-4: Pass Config RP profile conformance tests — discovery document retrieval, JWKS retrieval, issuer mismatch detection, key rotation handling via JWKS cache TTL/forced refresh (issue #219)
- FR-PIM-5: Submit for OpenID Foundation Basic RP + Config RP certification

*Conformance Gap Closure*

- FR-PIM-6: Implement missing `kid` handling — fallback logic when JWT has no `kid` and JWKS has single vs. multiple keys
- FR-PIM-7: Implement UserInfo `sub` vs. ID token `sub` mismatch validation
- FR-PIM-8: Implement JWKS cache TTL with forced refresh on signature verification failure (issue #219)
- FR-PIM-9: Verify nonce validation end-to-end through authorization flow

*Feature Parity with Duende IdentityModel*

- FR-PIM-10: Achieve feature parity with Duende IdentityModel — all equivalent capabilities implemented with dual sync/async API
- FR-PIM-11: Implement FastAPI middleware for token validation (drop-in integration)
- FR-PIM-12: Expand certification to Hybrid RP profile (at_hash, c_hash validation)
- FR-PIM-13: Implement FAPI 2.0 support (DPoP #229, PAR #230, existing PR #235)

*Advanced OIDC Features (from issues #213-#221)*

- FR-PIM-14: CIBA (Client-Initiated Backchannel Authentication)
- FR-PIM-15: mTLS (Mutual TLS Client Authentication)
- FR-PIM-16: Dynamic Client Registration (issue #216)
- FR-PIM-17: RP-Initiated Logout
- FR-PIM-18: JWT Client Authentication
- FR-PIM-19: JARM (JWT Secured Authorization Response Mode)
- FR-PIM-20: RAR (Rich Authorization Requests)
- FR-PIM-21: Discovery Cache TTL (issue #219)
- FR-PIM-22: AS Issuer Identification

**[SSS] descope-saas-starter**

*Wave 1 — RBAC CRUD*

- FR-SSS-1: GET/POST/PUT/DELETE `/api/roles` — role definition management
- FR-SSS-2: GET/POST/PUT/DELETE `/api/permissions` — permission definition management
- FR-SSS-3: Role-permission mapping management API
- FR-SSS-4: Admin role/permission management UI page
- FR-SSS-5: TF seeds default roles/permissions, runtime API manages full lifecycle

*Wave 2 — ReBAC/FGA*

- FR-SSS-6: GET/PUT `/api/fga/schema` — view/update FGA schema
- FR-SSS-7: POST/DELETE/GET `/api/fga/relations` — relation tuple CRUD
- FR-SSS-8: POST `/api/fga/check` — authorization check endpoint
- FR-SSS-9: FGA middleware integration — check relations in request pipeline
- FR-SSS-10: Demo scenario: document-level access control
- FR-SSS-11: UI: Relationship viewer + authorization test panel

*Wave 3 — SSO Configuration*

- FR-SSS-12: GET/PUT/DELETE `/api/tenants/{id}/sso` — per-tenant SSO config
- FR-SSS-13: OIDC and SAML SSO configuration support
- FR-SSS-14: SSO domain routing
- FR-SSS-15: UI: Tenant admin SSO configuration page

*Wave 4 — Tenant Enhancement*

- FR-SSS-16: PUT `/api/tenants/{id}` — update tenant name/settings
- FR-SSS-17: DELETE `/api/tenants/{id}`
- FR-SSS-18: Self-provisioning domain management
- FR-SSS-19: Default role management per tenant

*Wave 5 — Access Key Enhancement + Lists*

- FR-SSS-20: PATCH `/api/keys/{id}` — update access key
- FR-SSS-21: Permitted IP management for access keys
- FR-SSS-22: Custom claims on access keys
- FR-SSS-23: GET/POST/DELETE `/api/lists` — IP/text allow-deny lists

*Wave 6 — Password Settings*

- FR-SSS-24: GET/PUT `/api/password-policy` — password policy management
- FR-SSS-25: Per-tenant password policy overrides
- FR-SSS-26: Admin password settings UI

*Triage & Cleanup*

- FR-SSS-27: Close ~10 stale issues (#5, #10, #28, #30-#34, #46, #48-#50)
- FR-SSS-28: Merge/close open PRs (#99, #96-#98)

**[TFP] terraform-provider-descope**

- FR-TFP-1: Merge PR #108 — publish provider to Terraform Registry
- FR-TFP-2: Close issue #22 after registry publish
- FR-TFP-3: Address issue #109 (snake_case file naming standardization)

**[CROSS] Cross-Repo**

- FR-CROSS-1: Document reference architecture — three-repo pattern (protocol lib / IaC / application), TF-seeds-defaults/runtime-manages-lifecycle pattern
- FR-CROSS-2: Extract provider interface from `DescopeManagementClient` — define `IdentityProvider` interface with methods: list_users(), assign_role(), create_tenant(), check_fga_relation()
- FR-CROSS-3: Implement capability discovery — `provider.supports("fga")`, `provider.supports("rbac")`
- FR-CROSS-4: Validate abstraction with Ory — Keto for ReBAC, Kratos for users, Hydra for OIDC
- FR-CROSS-5: Update sprint plan, task queue, link T101-T116 to GitHub issues #240/#241, add untracked issues (#242, #244-#246, #264)

### NonFunctional Requirements

**Performance**

- NFR-1: [PIM] Token validation latency < 5ms for cached JWKS (excluding network)
- NFR-2: [PIM] Discovery document caching with configurable TTL — no redundant network calls
- NFR-3: [SSS] API response times < 200ms for CRUD operations against Descope Management API

**Security**

- NFR-4: [PIM] No algorithm confusion vulnerabilities — reject `alg=none` when signatures expected, validate `alg` against JWKS key type
- NFR-5: [PIM] All token validation follows OIDC Core spec strictly — no shortcuts on issuer, audience, expiration, signature checks
- NFR-6: [SSS] All new API endpoints require authentication; admin endpoints require appropriate role
- NFR-7: [SSS] ReBAC authorization decisions must be consistent — no race conditions between relation updates and checks
- NFR-8: [CROSS] No secrets in code, Terraform state, or git history

**Compatibility**

- NFR-9: [PIM] Target latest stable Python versions only, dual sync/async API for all new features
- NFR-10: [PIM] Backwards-compatible API — existing integrations must not break (semantic versioning)
- NFR-11: [SSS] Existing Docker Compose deployment continues working as features are added
- NFR-12: [TFP] Compatible with Terraform 1.x, no breaking changes to existing resource schemas

**Testing**

- NFR-13: [PIM] 80%+ unit test coverage maintained; conformance harness as integration gate
- NFR-14: [PIM] Conventional commits (Angular convention) with semantic-release
- NFR-15: [SSS] E2E tests covering happy path for each feature wave
- NFR-16: [SSS] ReBAC/FGA has tighter test coverage than other waves — authorization correctness is critical
- NFR-17: [TFP] Existing acceptance tests continue passing

**Architecture**

- NFR-18: [SSS] Each feature wave independently implementable — no cross-wave dependencies within the repo
- NFR-19: [SSS] Descope-specific code concentrated in `DescopeManagementClient` — clean seam for future interface extraction
- NFR-20: [CROSS] Provider abstraction follows three-tier model: Tier 1 (abstract: user CRUD, ReBAC, SSO, access keys), Tier 2 (translate: RBAC, password policy), Tier 3 (provider-specific: multi-tenancy, flows, connectors)

### Additional Requirements

- **Conformance harness starter template:** OIDC conformance harness in `py-identity-model/conformance/` — Docker Compose extending OpenID conformance suite + thin FastAPI RP app + test automation script
- **TF-seeds-defaults / runtime-manages-lifecycle pattern:** Terraform provisions initial state (roles, permissions, tenants, FGA schema), runtime APIs own full CRUD lifecycle
- **ADR-2 (Iterative abstraction):** Build everything Descope-specific first; do not design `IdentityProvider` interface up front. Extract from working code after all waves complete.
- **ADR-4 (Wave independence):** Each SaaS starter feature wave independently implementable with no cross-wave dependencies
- **ADR-5 (Conformance harness as quality gate):** First-class architectural component — validates malformed response rejection, not just happy path
- **ADR-6 (Quality tiers):** py-identity-model=production-grade, descope-saas-starter=demo/POC (ReBAC exception: production-quality testing), terraform-provider-descope=functional
- **Enterprise license blocker (E074106):** Blocks `descope_sso_application` TF resource, cascading to SSO config (T18), step-up auth (T21), MFA enforcement (T22), OIDC/SAML app registration (T25)
- **Cross-repo interface contracts:** `validate_token()`, `get_discovery_document()`, `to_principal()` must remain backwards-compatible across py-identity-model versions
- **`DescopeManagementClient` is the single abstraction seam:** All Descope Management API calls route through this class — new wave features must extend it, not bypass it
- **Frontend role hardcoding:** `RoleManagement.tsx` has hardcoded `AVAILABLE_ROLES` — must be updated to fetch dynamically from `GET /api/roles` when Wave 1 lands

### UX Design Requirements

None — deferred per user preference. UX planning may be added as a future initiative.

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-PIM-1 | Epic 1 | Review fix chain for 16 feature PRs |
| FR-PIM-2 | Epic 1 | OIDC conformance test harness |
| FR-PIM-3 | Epic 1 | Basic RP profile conformance tests |
| FR-PIM-4 | Epic 1 | Config RP profile conformance tests |
| FR-PIM-5 | Epic 1 | OpenID Foundation certification submission |
| FR-PIM-6 | Epic 1 | Missing `kid` handling |
| FR-PIM-7 | Epic 1 | UserInfo `sub` mismatch validation |
| FR-PIM-8 | Epic 1 | JWKS cache TTL with forced refresh |
| FR-PIM-9 | Epic 1 | Nonce validation end-to-end |
| FR-PIM-10 | Epic 7 | Feature parity with Duende IdentityModel |
| FR-PIM-11 | Epic 7 | FastAPI middleware for token validation |
| FR-PIM-12 | Epic 7 | Hybrid RP profile certification |
| FR-PIM-13 | Epic 7 | FAPI 2.0 support (DPoP, PAR) |
| FR-PIM-14 | Epic 10 | CIBA |
| FR-PIM-15 | Epic 10 | mTLS |
| FR-PIM-16 | Epic 10 | Dynamic Client Registration |
| FR-PIM-17 | Epic 10 | RP-Initiated Logout |
| FR-PIM-18 | Epic 10 | JWT Client Authentication |
| FR-PIM-19 | Epic 10 | JARM |
| FR-PIM-20 | Epic 10 | RAR |
| FR-PIM-21 | Epic 10 | Discovery Cache TTL |
| FR-PIM-22 | Epic 10 | AS Issuer Identification |
| FR-SSS-1 | Epic 2 | Role definition CRUD API |
| FR-SSS-2 | Epic 2 | Permission definition CRUD API |
| FR-SSS-3 | Epic 2 | Role-permission mapping API |
| FR-SSS-4 | Epic 2 | Admin role/permission management UI |
| FR-SSS-5 | Epic 2 | TF seeds defaults, runtime manages lifecycle |
| FR-SSS-6 | Epic 3 | FGA schema view/update API |
| FR-SSS-7 | Epic 3 | Relation tuple CRUD API |
| FR-SSS-8 | Epic 3 | Authorization check endpoint |
| FR-SSS-9 | Epic 3 | FGA middleware integration |
| FR-SSS-10 | Epic 3 | Document-level access control demo |
| FR-SSS-11 | Epic 3 | Relationship viewer + test panel UI |
| FR-SSS-12 | Epic 4 | Per-tenant SSO config API |
| FR-SSS-13 | Epic 4 | OIDC and SAML SSO support |
| FR-SSS-14 | Epic 4 | SSO domain routing |
| FR-SSS-15 | Epic 4 | Tenant admin SSO config UI |
| FR-SSS-16 | Epic 5 | Tenant update API |
| FR-SSS-17 | Epic 5 | Tenant delete API |
| FR-SSS-18 | Epic 5 | Self-provisioning domain management |
| FR-SSS-19 | Epic 5 | Default role management per tenant |
| FR-SSS-20 | Epic 6 | Access key update API |
| FR-SSS-21 | Epic 6 | Permitted IP management |
| FR-SSS-22 | Epic 6 | Custom claims on access keys |
| FR-SSS-23 | Epic 6 | IP/text allow-deny lists API |
| FR-SSS-24 | Epic 6 | Password policy management API |
| FR-SSS-25 | Epic 6 | Per-tenant password policy overrides |
| FR-SSS-26 | Epic 6 | Admin password settings UI |
| FR-SSS-27 | Epic 8 | Close stale issues |
| FR-SSS-28 | Epic 8 | Merge/close open PRs |
| FR-TFP-1 | Epic 8 | Terraform Registry publish |
| FR-TFP-2 | Epic 8 | Close issue #22 |
| FR-TFP-3 | Epic 8 | snake_case file naming |
| FR-CROSS-1 | Epic 9 | Reference architecture documentation |
| FR-CROSS-2 | Epic 9 | IdentityProvider interface extraction |
| FR-CROSS-3 | Epic 9 | Capability discovery |
| FR-CROSS-4 | Epic 9 | Ory validation |
| FR-CROSS-5 | Epic 8 | Sprint plan + task queue updates |

## Epic List

### Epic 1: Certified OIDC Library
Developers can rely on a certified, spec-compliant OIDC/OAuth2.0 Python library with all review findings resolved and conformance gaps closed.
**FRs covered:** FR-PIM-1, FR-PIM-2, FR-PIM-3, FR-PIM-4, FR-PIM-5, FR-PIM-6, FR-PIM-7, FR-PIM-8, FR-PIM-9

### Epic 2: Role & Permission Administration
Admins can define, edit, and assign roles and permissions through both API and UI, with Terraform seeding defaults and runtime managing the full lifecycle.
**FRs covered:** FR-SSS-1, FR-SSS-2, FR-SSS-3, FR-SSS-4, FR-SSS-5

### Epic 3: Relationship-Based Access Control
Admins can model and enforce fine-grained, document-level access control using FGA schema, relation tuples, and authorization checks — with production-quality testing.
**FRs covered:** FR-SSS-6, FR-SSS-7, FR-SSS-8, FR-SSS-9, FR-SSS-10, FR-SSS-11

### Epic 4: Enterprise SSO Federation
Tenant admins can configure OIDC/SAML SSO for their organization with domain routing. Blocked on enterprise license (E074106).
**FRs covered:** FR-SSS-12, FR-SSS-13, FR-SSS-14, FR-SSS-15

### Epic 5: Multi-Tenant Lifecycle
Admins can fully manage the tenant lifecycle — update settings, delete tenants, configure self-provisioning domains and default roles.
**FRs covered:** FR-SSS-16, FR-SSS-17, FR-SSS-18, FR-SSS-19

### Epic 6: M2M Security & Access Controls
Admins can manage access keys with IP restrictions and custom claims, configure allow/deny lists, and enforce password policies with per-tenant overrides.
**FRs covered:** FR-SSS-20, FR-SSS-21, FR-SSS-22, FR-SSS-23, FR-SSS-24, FR-SSS-25, FR-SSS-26

### Epic 7: Advanced Protocol Support & Feature Parity
Developers get FastAPI middleware for drop-in token validation, Hybrid RP certification, and FAPI 2.0 support — achieving feature parity with Duende IdentityModel.
**FRs covered:** FR-PIM-10, FR-PIM-11, FR-PIM-12, FR-PIM-13

### Epic 8: Platform Publication & Project Health
Platform engineers can install the Terraform provider from the registry. Stale issues and PRs across repos are triaged and resolved. Sprint plan and task queue are updated.
**FRs covered:** FR-TFP-1, FR-TFP-2, FR-TFP-3, FR-SSS-27, FR-SSS-28, FR-CROSS-5

### Epic 9: Provider Abstraction & Reference Architecture
The platform supports multiple identity providers through a documented reference architecture and common `IdentityProvider` interface, validated with Ory as a second provider.
**FRs covered:** FR-CROSS-1, FR-CROSS-2, FR-CROSS-3, FR-CROSS-4

### Epic 10: Extended OIDC Protocol Suite
Developers can use advanced OIDC features — CIBA, mTLS, Dynamic Client Registration, RP-Initiated Logout, JWT Client Auth, JARM, RAR, Discovery Cache TTL, AS Issuer Identification.
**FRs covered:** FR-PIM-14, FR-PIM-15, FR-PIM-16, FR-PIM-17, FR-PIM-18, FR-PIM-19, FR-PIM-20, FR-PIM-21, FR-PIM-22

### Deliverable: GitHub Issues
After all stories are finalized, create GitHub issues for each story in the appropriate repository (py-identity-model, descope-saas-starter, terraform-provider-descope).

---

## Epic 1: Certified OIDC Library

Developers can rely on a certified, spec-compliant OIDC/OAuth2.0 Python library with all review findings resolved, conformance gaps closed, and provider integration tests passing against both Ory Hydra and Duende IdentityServer.

### Story 1.1: Fix Core Infrastructure PRs

As a library maintainer,
I want all adversarial review findings resolved for the core infrastructure PRs (T101-T104),
So that the foundational features — OAuth callback state, HTTP client DI, enhanced token validation, and base request/response classes — are production-ready and mergeable.

**Acceptance Criteria:**

**Given** PR #211 (OAuth callback state) has review findings including TypeError on None state/URL
**When** all findings for T101 are addressed and tests pass
**Then** PR #211 passes CI, maintains 80%+ coverage, and is merge-ready
**And** the fix uses conventional commits (Angular convention)

**Given** PR #222 (HTTP client DI) has adversarial review findings
**When** all findings for T102 are addressed
**Then** PR #222 passes CI with no regressions to existing tests
**And** dependency injection does not break backwards compatibility with existing `validate_token()` callers

**Given** PR #223 (enhanced token validation) has review findings
**When** all findings for T103 are addressed
**Then** PR #223 passes CI and token validation rejects `alg=none` when signatures are expected (NFR-4)

**Given** PR #224 (base request/response classes) has review findings
**When** all findings for T104 are addressed
**Then** PR #224 passes CI and both sync and async APIs expose the new base classes (NFR-9)

### Story 1.2: Fix Standard Flow PRs

As a library maintainer,
I want all adversarial review findings resolved for the standard OAuth flow PRs (T105-T108),
So that auth code + PKCE, introspection, revocation, and refresh flows are production-ready.

**Acceptance Criteria:**

**Given** PR #225 (auth code + PKCE) has review findings
**When** all findings for T105 are addressed
**Then** PR #225 passes CI, PKCE code_verifier/code_challenge are validated per RFC 7636
**And** both sync and async APIs are available

**Given** PR #226 (introspection) has review findings
**When** all findings for T106 are addressed
**Then** PR #226 passes CI and introspection responses are validated per RFC 7662

**Given** PR #227 (revocation) has review findings
**When** all findings for T107 are addressed
**Then** PR #227 passes CI and token revocation follows RFC 7009

**Given** PR #228 (refresh) has review findings
**When** all findings for T108 are addressed
**Then** PR #228 passes CI and refresh token rotation is handled correctly

### Story 1.3: Fix Advanced Protocol PRs

As a library maintainer,
I want all adversarial review findings resolved for the advanced protocol PRs (T109-T114),
So that DPoP, PAR, JAR, device auth grant, token exchange, and FAPI 2.0 features are production-ready.

**Acceptance Criteria:**

**Given** PRs #229 (DPoP), #230 (PAR), #232 (JAR), #233 (device auth), #234 (token exchange), #235 (FAPI 2.0) each have review findings
**When** all findings for T109-T114 are addressed sequentially
**Then** each PR passes CI with 80%+ coverage maintained
**And** no regressions to previously merged PRs in the chain

**Given** FAPI 2.0 (PR #235) combines DPoP and PAR
**When** T114 fixes are applied
**Then** FAPI 2.0 correctly composes DPoP proof generation with PAR request submission
**And** both sync and async APIs are available for all six features

### Story 1.4: Fix Configuration & Performance PRs

As a library maintainer,
I want all adversarial review findings resolved for the configuration and performance PRs (T115-T116),
So that policy configuration and performance benchmarks are production-ready and the full review fix chain is complete.

**Acceptance Criteria:**

**Given** PR #236 (policy config) has review findings
**When** all findings for T115 are addressed
**Then** PR #236 passes CI and policy configuration does not break existing validation behavior (NFR-10)

**Given** PR #237 (performance benchmarks) has review findings
**When** all findings for T116 are addressed
**Then** PR #237 passes CI and benchmarks demonstrate token validation < 5ms for cached JWKS (NFR-1)

**Given** all 16 PRs (T101-T116) have been fixed
**When** the full chain is merged in sequence
**Then** all CI checks pass, coverage remains >= 80%, and no backwards-incompatible changes are introduced

### Story 1.5: Build OIDC Conformance Test Harness

As a library maintainer,
I want a conformance test harness that runs the OpenID Foundation conformance suite against py-identity-model,
So that I can validate spec compliance automatically before certification submission.

**Acceptance Criteria:**

**Given** the harness needs to run the OpenID conformance suite locally
**When** `docker compose up` is run in `py-identity-model/conformance/`
**Then** the OpenID conformance suite container starts alongside a thin FastAPI RP app that uses py-identity-model for all OIDC operations

**Given** the FastAPI RP app is running
**When** the conformance suite sends authorization requests
**Then** the RP app handles the full auth code flow using py-identity-model's `authorize()`, `exchange_code()`, and `validate_token()` methods

**Given** test plan configs exist for Basic RP and Config RP profiles
**When** `python run_tests.py --profile basic-rp` is executed
**Then** the automation script drives the conformance suite via its REST API and reports pass/fail per test case

**Given** the harness is a first-class architectural component (ADR-5)
**When** reviewing the directory structure
**Then** it follows the layout: `conformance/{docker-compose.yml, app.py, run_tests.py, configs/{basic-rp.json, config-rp.json}, README.md}`

### Story 1.6: Implement `kid` Handling Fallback

As a developer using py-identity-model,
I want the library to correctly handle JWTs with missing `kid` headers,
So that token validation works with providers that don't always include `kid` in JWT headers.

**Acceptance Criteria:**

**Given** a JWT with no `kid` header and a JWKS with a single key
**When** `validate_token()` is called
**Then** the library uses the single JWKS key for signature verification

**Given** a JWT with no `kid` header and a JWKS with multiple keys
**When** `validate_token()` is called
**Then** the library rejects the token with a clear error indicating ambiguous key selection

**Given** a JWT with a `kid` header that matches a JWKS key
**When** `validate_token()` is called
**Then** the matching key is used (existing behavior, no regression)

**Given** both sync and async APIs
**When** `kid` fallback logic executes
**Then** behavior is identical in both APIs (NFR-9)

### Story 1.7: Implement UserInfo `sub` Mismatch Validation

As a developer using py-identity-model,
I want the library to detect when the UserInfo endpoint returns a different `sub` than the ID token,
So that identity substitution attacks are prevented per OIDC Core Section 5.3.2.

**Acceptance Criteria:**

**Given** an ID token with `sub=user123`
**When** the UserInfo response contains `sub=user456`
**Then** the library raises a validation error indicating `sub` mismatch

**Given** an ID token with `sub=user123`
**When** the UserInfo response contains `sub=user123`
**Then** validation succeeds and the UserInfo claims are returned

**Given** the UserInfo response is missing the `sub` claim entirely
**When** validation is performed
**Then** the library raises an error per OIDC Core spec requirements

### Story 1.8: Implement JWKS Cache TTL with Forced Refresh

As a developer using py-identity-model,
I want JWKS keys to be cached with a configurable TTL and force-refreshed on signature verification failure,
So that key rotation is handled gracefully without manual intervention (issue #219).

**Acceptance Criteria:**

**Given** a JWKS cache TTL is configured (e.g., 300 seconds)
**When** a token validation request occurs within the TTL window
**Then** the cached JWKS is used without a network call (NFR-1, NFR-2)

**Given** a JWKS cache has expired (past TTL)
**When** a token validation request occurs
**Then** the library fetches fresh JWKS from the provider's JWKS endpoint

**Given** a cached JWKS key does not match the JWT's `kid`
**When** signature verification fails
**Then** the library forces a JWKS refresh (ignoring TTL) and retries verification once
**And** if the retry also fails, a clear error is raised (no infinite retry loops)

**Given** the TTL is configurable
**When** the developer sets `jwks_cache_ttl=60`
**Then** the cache expires after 60 seconds

### Story 1.9: Verify Nonce Validation End-to-End

As a developer using py-identity-model,
I want nonce validation to work end-to-end through the authorization flow,
So that replay attacks are prevented per OIDC Core Section 3.1.2.1.

**Acceptance Criteria:**

**Given** an authorization request is initiated with a generated nonce
**When** the ID token is returned with a matching `nonce` claim
**Then** validation succeeds

**Given** an authorization request is initiated with nonce `abc123`
**When** the ID token is returned with `nonce=xyz789`
**Then** validation fails with a nonce mismatch error

**Given** an authorization request is initiated with a nonce
**When** the ID token is returned without a `nonce` claim
**Then** validation fails with a missing nonce error

**Given** nonce state needs to persist between the authorization request and callback
**When** the flow completes
**Then** the nonce is stored and retrievable via the state management mechanism from PR #211

### Story 1.10: Ory Hydra Integration Tests

As a library maintainer,
I want integration tests that validate py-identity-model against a local Ory Hydra instance,
So that I can prove the library works correctly with Ory as an identity provider (issue #245, #246).

**Acceptance Criteria:**

**Given** a Docker Compose file for local Ory Hydra setup
**When** `docker compose up` is run
**Then** Ory Hydra starts with a pre-configured OAuth2 client, discovery endpoint is accessible, and JWKS endpoint returns valid keys

**Given** Ory Hydra is running locally
**When** the integration test suite executes
**Then** the following flows are validated: authorization code + PKCE, token validation, discovery document retrieval, JWKS key fetching, token introspection, and token revocation

**Given** Ory Hydra performs key rotation
**When** a new key is published to the JWKS endpoint
**Then** py-identity-model's JWKS cache refresh detects the new key and validates tokens signed with it

**Given** the Ory integration test suite
**When** comparing its test coverage with the Duende integration test suite (Story 1.11)
**Then** both suites cover the same set of OIDC flows and validation scenarios (parity)

### Story 1.11: Duende IdentityServer Integration Tests

As a library maintainer,
I want integration tests that validate py-identity-model against a local Duende IdentityServer instance,
So that I can prove the library works correctly with Duende as an identity provider, at parity with Ory coverage.

**Acceptance Criteria:**

**Given** a Docker Compose file for local Duende IdentityServer setup
**When** `docker compose up` is run
**Then** Duende IdentityServer starts with a pre-configured client, discovery endpoint is accessible, and JWKS endpoint returns valid keys

**Given** Duende IdentityServer is running locally
**When** the integration test suite executes
**Then** the following flows are validated: authorization code + PKCE, token validation, discovery document retrieval, JWKS key fetching, token introspection, and token revocation

**Given** Duende IdentityServer performs key rotation
**When** a new key is published to the JWKS endpoint
**Then** py-identity-model's JWKS cache refresh detects the new key and validates tokens signed with it

**Given** the Duende integration test suite
**When** comparing with the Ory test suite (Story 1.10)
**Then** both suites cover identical OIDC flows and validation scenarios (parity)

### Story 1.12: Pass Basic RP Conformance Tests

As a library maintainer,
I want py-identity-model to pass the OpenID Foundation Basic RP profile conformance tests,
So that the library demonstrably implements the core OIDC spec correctly.

**Acceptance Criteria:**

**Given** the conformance harness from Story 1.5 is running
**When** the Basic RP test plan is executed
**Then** all test cases pass for: authorization code flow, ID token validation (issuer, sub, aud, iat), signature verification, and client_secret_basic authentication

**Given** the conformance suite sends a JWT with an invalid issuer
**When** the RP validates the token
**Then** validation is rejected (NFR-5: strict OIDC Core compliance)

**Given** the conformance suite sends a JWT with `alg=none`
**When** the RP validates the token with signatures expected
**Then** validation is rejected (NFR-4: no algorithm confusion)

**Given** the conformance suite tests nonce validation
**When** the RP processes the authorization response
**Then** nonce is validated end-to-end per Story 1.9's implementation

### Story 1.13: Pass Config RP Conformance Tests

As a library maintainer,
I want py-identity-model to pass the OpenID Foundation Config RP profile conformance tests,
So that the library correctly handles provider discovery and key management.

**Acceptance Criteria:**

**Given** the conformance harness from Story 1.5 is running
**When** the Config RP test plan is executed
**Then** all test cases pass for: discovery document retrieval, JWKS retrieval, and issuer validation

**Given** the conformance suite returns an issuer mismatch in the discovery document
**When** the RP fetches and validates the discovery document
**Then** the mismatch is detected and an error is raised

**Given** the conformance suite rotates JWKS keys during the test
**When** the RP attempts to validate a token signed with the new key
**Then** the JWKS cache refresh from Story 1.8 detects the new key and validation succeeds

**Given** the conformance suite presents multiple keys in the JWKS
**When** the RP validates a JWT with a specific `kid`
**Then** the correct key is selected and signature verification succeeds

### Story 1.14: Submit for OpenID Foundation Certification

As a library maintainer,
I want to submit py-identity-model for OpenID Foundation Basic RP + Config RP certification,
So that the library has official certification that builds developer trust and credibility.

**Acceptance Criteria:**

**Given** all Basic RP conformance tests pass (Story 1.12)
**When** the test results are exported from the conformance suite
**Then** results are in the format required by the OpenID Foundation submission process

**Given** all Config RP conformance tests pass (Story 1.13)
**When** the test results are exported
**Then** results are in the format required for Config RP profile submission

**Given** both test result sets are ready
**When** the certification application is submitted to the OpenID Foundation
**Then** the submission includes: library name, version, test results for Basic RP and Config RP profiles, and contact information

**Given** the certification is granted
**When** updating the library
**Then** the README, PyPI metadata, and documentation are updated with the OpenID Certified mark and certification ID

---

## Epic 2: Role & Permission Administration

Admins can define, edit, and assign roles and permissions through both API and UI, with Terraform seeding defaults and runtime managing the full lifecycle.

**FRs covered:** FR-SSS-1, FR-SSS-2, FR-SSS-3, FR-SSS-4, FR-SSS-5

**Architecture context:**
- ADR-1: Terraform seeds default roles (owner, admin, member, viewer) and 12 permissions. Runtime API manages the full CRUD lifecycle.
- ADR-4: Wave 1 is independently implementable with no cross-wave dependencies.
- NFR-19: All Descope Management API calls route through `DescopeManagementClient` — new methods must be added there, not bypassed.
- Existing `roles.py` has user-to-role assignment endpoints (`GET /roles/me`, `POST /roles/assign`, `POST /roles/remove`). Role definition CRUD is added alongside these — paths do not conflict.
- `RoleManagement.tsx` has hardcoded `AVAILABLE_ROLES = ["owner", "admin", "member", "viewer"]` — must be replaced with dynamic fetch.
- No `permissions.py` router exists yet — must be created.

### Story 2.1: Permission Definition CRUD (Backend)

As a platform admin,
I want to create, list, update, and delete permission definitions through the API,
So that I can manage the set of available permissions at runtime without direct Descope console access.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no permission management methods
**When** Story 2.1 is complete
**Then** the client has `list_permissions()`, `create_permission(name, description)`, `update_permission(name, new_name, description)`, and `delete_permission(name)` methods
**And** all methods call the Descope Management API via the existing `_request()` pattern (NFR-19)

**Given** an authenticated user with owner or admin role
**When** `GET /api/permissions` is called
**Then** all permission definitions are returned as `{"permissions": [{"name": "...", "description": "..."}]}`
**And** response time is < 200ms (NFR-3)

**Given** an authenticated admin
**When** `POST /api/permissions` is called with `{"name": "reports.read", "description": "View reports"}`
**Then** the permission is created in Descope and the response includes the created permission with HTTP 201

**Given** an authenticated admin
**When** `PUT /api/permissions/{name}` is called with `{"new_name": "...", "description": "..."}`
**Then** the permission is updated in Descope and the updated permission is returned

**Given** an authenticated admin
**When** `DELETE /api/permissions/{name}` is called
**Then** the permission is deleted from Descope and HTTP 200 is returned with `{"status": "deleted", "name": "..."}`

**Given** a non-admin user (member or viewer role)
**When** any `/api/permissions` endpoint is called
**Then** HTTP 403 is returned (NFR-6)

**Given** a request to create a permission with a name that already exists in Descope
**When** `POST /api/permissions` is called
**Then** the Descope API error is caught and returned as an appropriate HTTP error (400 or 409)

**Given** the Descope Management API is unreachable or returns a server error
**When** any permission endpoint is called
**Then** the error is caught and returned as HTTP 502 with a descriptive message, following the `httpx.HTTPStatusError` / `httpx.RequestError` pattern from existing routers

**Given** write endpoints (`POST`, `PUT`, `DELETE`)
**When** rate limiting is evaluated
**Then** `RATE_LIMIT_AUTH` ("10/minute") is applied, matching the existing pattern in `roles.py` and `accesskeys.py`

### Story 2.2: Role Definition CRUD with Permission Mapping (Backend)

As a platform admin,
I want to create, list, update, and delete role definitions — including their permission assignments — through the API,
So that I can manage the RBAC model at runtime without modifying Terraform configuration.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no role definition management methods
**When** Story 2.2 is complete
**Then** the client has `list_roles()`, `create_role(name, description, permission_names)`, `update_role(name, new_name, description, permission_names)`, and `delete_role(name)` methods
**And** all methods call the Descope Management API via the existing `_request()` pattern (NFR-19)

**Given** an authenticated user with owner or admin role
**When** `GET /api/roles` is called
**Then** all role definitions are returned as `{"roles": [{"name": "...", "description": "...", "permissionNames": [...]}]}`
**And** each role includes its assigned permission names (FR-SSS-3)

**Given** an authenticated admin
**When** `POST /api/roles` is called with `{"name": "editor", "description": "Can edit content", "permission_names": ["documents.read", "documents.write"]}`
**Then** the role is created in Descope with the specified permission mapping (FR-SSS-3)
**And** the response includes the created role with HTTP 201

**Given** an authenticated admin
**When** `PUT /api/roles/{name}` is called with `{"description": "Updated description", "permission_names": ["documents.read"]}`
**Then** the role definition and its permission mapping are updated in Descope
**And** the updated role is returned

**Given** an authenticated admin
**When** `DELETE /api/roles/{name}` is called
**Then** the role is deleted from Descope and HTTP 200 is returned with `{"status": "deleted", "name": "..."}`

**Given** a non-admin user
**When** any role definition mutation endpoint (`POST`, `PUT`, `DELETE /api/roles`) is called
**Then** HTTP 403 is returned (NFR-6)

**Given** the existing user-to-role assignment endpoints (`GET /roles/me`, `POST /roles/assign`, `POST /roles/remove`)
**When** new role definition CRUD endpoints are added to `roles.py`
**Then** existing endpoints continue to function without regression
**And** route paths do not conflict (`GET /api/roles` returns definitions; `GET /api/roles/me` returns the current user's roles)

**Given** a Descope Management API error (e.g., role not found, duplicate name, invalid permission reference)
**When** the API call fails
**Then** `httpx.HTTPStatusError` is caught and returned as an appropriate HTTP error with a descriptive message

**Given** write endpoints (`POST`, `PUT`, `DELETE`)
**When** rate limiting is evaluated
**Then** `RATE_LIMIT_AUTH` is applied

### Story 2.3: Admin Role & Permission Management UI

As a platform admin,
I want a UI page to manage roles, permissions, and their mappings,
So that I can administer the RBAC model visually without using the API directly.

**Acceptance Criteria:**

**Given** `RoleManagement.tsx` has hardcoded `AVAILABLE_ROLES = ["owner", "admin", "member", "viewer"]`
**When** the page loads
**Then** roles are fetched dynamically from `GET /api/roles` and the hardcoded constant is removed
**And** the role selection dropdown for user assignment is populated from the API response

**Given** an admin user on the Role Management page
**When** the roles section renders
**Then** all role definitions are displayed in a table/list showing name, description, and assigned permissions
**And** each role's permissions are shown as badges

**Given** an admin user
**When** they click "Create Role" and fill in name, description, and select permissions via checkboxes
**Then** `POST /api/roles` is called with the form data
**And** on success, a toast notification confirms creation and the role list refreshes

**Given** an admin user
**When** they edit an existing role's description or permission assignments
**Then** `PUT /api/roles/{name}` is called with the updated fields
**And** the role list refreshes to reflect the changes

**Given** an admin user
**When** they click delete on a role
**Then** a confirmation dialog is shown
**And** on confirm, `DELETE /api/roles/{name}` is called and the list refreshes

**Given** an admin user on the permissions section
**When** they view, create, edit, or delete a permission
**Then** the corresponding `/api/permissions` endpoint is called
**And** the permissions list updates accordingly

**Given** a non-admin user
**When** they visit the Role Management page
**Then** the role/permission administration sections are hidden
**And** the existing "You need an admin or owner role" alert is preserved

**Given** the page is loading data or an API call is in progress
**When** the user waits
**Then** appropriate loading states are shown
**And** API errors display toast notifications via the existing `sonner` toast pattern

**Given** the permissions list is available
**When** creating or editing a role
**Then** available permissions are shown as a multi-select (checkboxes) populated from `GET /api/permissions`

### Story 2.4: TF Seed Verification & E2E Tests

As a platform engineer,
I want verification that Terraform-seeded defaults are accessible through the runtime APIs and E2E tests covering the RBAC administration happy path,
So that the TF-seeds-defaults / runtime-manages-lifecycle pattern (ADR-1) is validated and feature quality is assured.

**Acceptance Criteria:**

**Given** Terraform has seeded 4 roles (owner, admin, member, viewer) and 12 permissions in `infra/rbac.tf`
**When** `GET /api/roles` is called after deployment
**Then** all 4 TF-seeded roles appear with their correct permission mappings (owner=12, admin=11, member=5, viewer=2)

**Given** TF-seeded permissions exist in Descope
**When** `GET /api/permissions` is called
**Then** all 12 TF-seeded permissions are returned (projects.create, projects.read, projects.update, projects.delete, members.invite, members.remove, members.update_role, documents.read, documents.write, documents.delete, settings.manage, billing.manage)

**Given** a new permission is created via `POST /api/permissions` at runtime
**When** `GET /api/permissions` is called
**Then** both TF-seeded and runtime-created permissions appear in the response (FR-SSS-5)

**Given** a new role is created via `POST /api/roles` with runtime-created permissions
**When** `GET /api/roles` is called
**Then** both TF-seeded and runtime-created roles appear (FR-SSS-5)

**Given** Docker Compose is configured with the updated backend
**When** `docker compose up --build` is run
**Then** the application starts successfully with all new routes (`/api/permissions`, `/api/roles` CRUD) registered (NFR-11)

**Given** the E2E test suite for Wave 1 RBAC administration
**When** the happy-path tests execute
**Then** the following scenarios pass:
- List all permissions (includes TF-seeded)
- Create a new permission
- Update the permission's description
- Delete the permission
- List all roles (includes TF-seeded with permission mappings)
- Create a new role with permission assignments
- Update the role's permission mapping
- Delete the role
- UI loads roles dynamically (no hardcoded values)
**And** all scenarios complete within the NFR-3 response time target (< 200ms per API call)

**Given** an admin creates a role, assigns it to a user via `POST /roles/assign`, then lists roles
**When** the full lifecycle is exercised
**Then** the runtime-created role functions identically to TF-seeded roles for user assignment
