---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-all-stories", "step-04-final-validation"]
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

*Cloud Provider Integration Testing*

- FR-PIM-23: Cassette-based integration test infrastructure — pytest-recording (vcrpy) for httpx, cassette/live mode switching, per-provider env templates
- FR-PIM-24: AWS Cognito integration tests — discovery, JWKS, client credentials, token validation, UserInfo, key rotation, `cognito:groups` claim handling, non-standard discovery URL
- FR-PIM-25: Microsoft Entra ID integration tests — discovery (v2.0), JWKS, client credentials, token validation, introspection, UserInfo, key rotation, `tid`/`oid` claims, multi-tenant discovery
- FR-PIM-26: Auth0 integration tests — discovery, JWKS, client credentials, token validation, introspection, revocation, UserInfo, key rotation, `permissions`/`org_id` claims, custom domains
- FR-PIM-27: Nightly CI workflow for real-provider validation with automated issue creation on drift detection

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
| FR-PIM-23 | Epic 11 | Cassette-based integration test infrastructure |
| FR-PIM-24 | Epic 11 | AWS Cognito integration tests |
| FR-PIM-25 | Epic 11 | Microsoft Entra ID integration tests |
| FR-PIM-26 | Epic 11 | Auth0 integration tests |
| FR-PIM-27 | Epic 11 | Nightly CI for real-provider validation |
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

### Epic 11: Cloud Provider Integration Testing
Developers can validate py-identity-model against AWS Cognito, Microsoft Entra ID, and Auth0 with cassette-based CI testing and periodic real-provider drift detection, proving the library works correctly across major cloud identity providers.
**FRs covered:** FR-PIM-23, FR-PIM-24, FR-PIM-25, FR-PIM-26, FR-PIM-27

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

---

## Epic 3: Relationship-Based Access Control

Admins can model and enforce fine-grained, document-level access control using FGA schema, relation tuples, and authorization checks — with production-quality testing.

**FRs covered:** FR-SSS-6, FR-SSS-7, FR-SSS-8, FR-SSS-9, FR-SSS-10, FR-SSS-11

**Architecture context:**
- ADR-4: Wave 2 is independently implementable — depends only on Descope FGA Management API, not Wave 1.
- ADR-6 ReBAC exception: Wave 2 gets production-quality testing despite being in a demo-tier repo — authorization bugs in a portfolio piece damage credibility.
- NFR-7: ReBAC authorization decisions must be consistent — no race conditions between relation updates and checks.
- NFR-16: Tighter test coverage than other waves.
- NFR-19: All FGA operations go through `DescopeManagementClient`.
- FGA uses action-oriented endpoints, not standard CRUD: `/api/fga/schema`, `/api/fga/relations`, `/api/fga/check`.
- Existing `backend/app/routers/protected.py` has document endpoints — FGA middleware integrates here.
- Existing FGA TF resources from `terraform-provider-descope` seed initial schema.

### Story 3.1: FGA Methods on DescopeManagementClient (Backend Service Layer)

As a backend developer,
I want FGA schema, relation tuple, and authorization check methods on `DescopeManagementClient`,
So that all Descope FGA API calls route through the single abstraction seam (NFR-19).

**Acceptance Criteria:**

**Given** `DescopeManagementClient` in `backend/app/services/descope.py` has no FGA methods
**When** Story 3.1 is complete
**Then** the following methods are added directly to `DescopeManagementClient`:
- `get_fga_schema()` — calls `POST /v1/mgmt/authz/schema/load`
- `update_fga_schema(schema: str)` — calls `POST /v1/mgmt/authz/schema/save`
- `create_relation(resource_type, resource_id, relation, target)` — calls `POST /v1/mgmt/authz/re/save`
- `delete_relation(resource_type, resource_id, relation, target)` — calls `POST /v1/mgmt/authz/re/delete`
- `list_relations(resource_type, resource_id)` — calls `POST /v1/mgmt/authz/re/who`
- `list_user_resources(resource_type, relation, target)` — calls `POST /v1/mgmt/authz/re/resource`
- `check_permission(resource_type, resource_id, relation, target)` — calls `POST /v1/mgmt/authz/re/has`, returns `bool`
**And** all methods use the existing `_request()` pattern with the same `httpx.AsyncClient` lifecycle
**And** no separate `DescopeFGAClient` subclass is created (NFR-19: single abstraction seam)

**Given** `check_permission()` is called with valid arguments
**When** the Descope API returns `{"allowed": true}`
**Then** the method returns `True`

**Given** `check_permission()` is called with valid arguments
**When** the Descope API returns `{"allowed": false}`
**Then** the method returns `False`

**Given** `list_relations()` is called for a resource with no relations
**When** the Descope API returns an empty response
**Then** the method returns an empty list (not `None`, not an error)

**Given** `list_user_resources()` is called for a user with no resources
**When** the Descope API returns an empty response
**Then** the method returns an empty list

**Given** the Descope FGA API returns a 4xx validation error (e.g., invalid resource type)
**When** any FGA method is called
**Then** the `httpx.HTTPStatusError` propagates to the caller (consistent with existing error pattern)

**Given** unit tests for all 7 FGA methods
**When** the test suite runs
**Then** each method's request payload is verified against the Descope API shape (resource/resourceType/relation/target fields)
**And** both success and error responses are tested
**And** coverage for the new methods exceeds 90%

### Story 3.2: FGA Schema & Relations Admin Router (Backend API Layer)

As a platform admin,
I want API endpoints to view/update the FGA schema and manage relation tuples,
So that I can configure and inspect authorization rules through the REST API.

**Acceptance Criteria:**

**Given** no FGA router exists
**When** Story 3.2 is complete
**Then** `backend/app/routers/fga.py` exists with routes prefixed under `/api/fga`
**And** the router is registered in `app/main.py`

**Given** an authenticated admin (owner or admin role)
**When** `GET /api/fga/schema` is called
**Then** the FGA schema is returned as `{"schema": "<schema text>"}`
**And** response time is < 200ms (NFR-3)

**Given** an authenticated admin
**When** `PUT /api/fga/schema` is called with `{"schema": "type user\ntype document..."}`
**Then** the schema is updated in Descope and the updated schema is returned
**And** the request body is validated: empty or missing `schema` field returns HTTP 422

**Given** an authenticated admin
**When** `POST /api/fga/relations` is called with `{"resource_type": "document", "resource_id": "d1", "relation": "editor", "target": "user:u1"}`
**Then** the relation is created in Descope and HTTP 201 is returned with the created relation echoed back

**Given** an authenticated admin
**When** `DELETE /api/fga/relations` is called with `{"resource_type": "document", "resource_id": "d1", "relation": "editor", "target": "user:u1"}`
**Then** the relation is deleted from Descope and HTTP 200 is returned

**Given** an authenticated admin
**When** `GET /api/fga/relations?resource_type=document&resource_id=d1` is called
**Then** all relation tuples for that resource are returned as `{"relations": [{"target": "...", "relation": "..."}]}`

**Given** an authenticated admin
**When** `POST /api/fga/check` is called with `{"resource_type": "document", "resource_id": "d1", "relation": "can_view", "target": "user:u1"}`
**Then** the check result is returned as `{"allowed": true}` or `{"allowed": false}`
**And** response time is < 200ms (NFR-3)

**Given** a non-admin user (member or viewer role)
**When** any `/api/fga/*` endpoint is called
**Then** HTTP 403 is returned (NFR-6)

**Given** the Descope FGA API returns a validation error (e.g., unknown resource type in schema)
**When** `PUT /api/fga/schema` is called
**Then** the error is caught and returned as HTTP 400 with the Descope error message

**Given** the Descope FGA API is unreachable
**When** any FGA endpoint is called
**Then** `httpx.RequestError` is caught and returned as HTTP 502 with a descriptive message

**Given** write endpoints (`POST /api/fga/relations`, `DELETE /api/fga/relations`, `PUT /api/fga/schema`)
**When** rate limiting is evaluated
**Then** `RATE_LIMIT_AUTH` ("10/minute") is applied, matching the pattern in `roles.py`

**Given** unit tests for the FGA router
**When** the test suite runs
**Then** all endpoints are tested for success, auth enforcement (403 for non-admin), error mapping (400/502), and rate limiting
**And** coverage for `routers/fga.py` exceeds 90%

### Story 3.3: FGA Dependency Factory, Document Model & CRUD Router with FGA Enforcement (Backend)

As a developer,
I want a `require_fga()` dependency factory and document CRUD endpoints with FGA-enforced access control,
So that documents demonstrate fine-grained, relation-based authorization end-to-end.

**Acceptance Criteria:**

**FGA Dependency Factory:**

**Given** no FGA dependency exists
**When** Story 3.3 is complete
**Then** `backend/app/dependencies/fga.py` contains a `require_fga(resource_type, relation)` factory function
**And** it returns a FastAPI dependency that extracts `user_id` from JWT claims (`sub`) and `resource_id` from the path parameter

**Given** a request with valid JWT claims containing `sub=user123` and path parameter `document_id=doc-1`
**When** `require_fga("document", "can_view")` executes
**Then** it calls `DescopeManagementClient.check_permission("document", "doc-1", "can_view", "user123")`
**And** if `True`, the dependency resolves successfully (request continues)

**Given** a user with NO relation to the document
**When** `require_fga()` executes and `check_permission()` returns `False`
**Then** HTTP 403 is raised with `{"detail": "Access denied"}`

**Given** a request with no JWT claims (unauthenticated)
**When** `require_fga()` executes
**Then** HTTP 401 is raised with `{"detail": "Not authenticated"}`

**Given** a request with JWT claims missing the `sub` field
**When** `require_fga()` executes
**Then** HTTP 401 is raised with `{"detail": "Missing user identity"}`

**Given** the Descope FGA API is unreachable
**When** `require_fga()` attempts to call `check_permission()`
**Then** the request fails with HTTP 502 (fail-closed, not fail-open — security-critical)

**Given** FGA check denials
**When** a user is denied access
**Then** a warning-level log entry is emitted with user_id, resource_type, resource_id, and relation (for security audit trail)

**Document Model & CRUD Router:**

**Given** no document model or router exists
**When** Story 3.3 is complete
**Then** `backend/app/models/document.py` contains a `Document` SQLModel with fields: `id` (UUID, primary key), `tenant_id` (indexed), `title`, `content`, `created_by`, `created_at`
**And** `backend/app/routers/documents.py` contains a router registered at `/api/documents`

**Given** an authenticated user
**When** `POST /api/documents` is called with `{"title": "My Doc", "content": "Hello"}`
**Then** a document is created in the database with the caller's `sub` as `created_by` and `dct` as `tenant_id`
**And** an FGA `owner` relation is created: `(document, <doc_id>, owner, <user_id>)`
**And** the FGA relation is created *before* the DB commit — if FGA fails, the document is not persisted

**Given** the DB commit fails after FGA relation creation succeeds
**When** the compensating action executes
**Then** the FGA `owner` relation is deleted (compensation pattern, logged as warning on failure)

**Given** an authenticated user
**When** `GET /api/documents` is called
**Then** the response contains only documents in the caller's tenant where the user has `can_view` permission via FGA
**And** document IDs are fetched from `list_user_resources("document", "can_view", user_id)` and then filtered by `tenant_id` (prevents cross-tenant info leak)

**Given** a user with `can_view` permission on `document:d1`
**When** `GET /api/documents/d1` is called
**Then** the document is returned (FGA check via `require_fga("document", "can_view")`)
**And** the document's `tenant_id` matches the caller's tenant (cross-tenant check enforced)

**Given** a user with `can_edit` permission on `document:d1`
**When** `PUT /api/documents/d1` is called with `{"title": "New Title"}`
**Then** the document is updated (FGA check via `require_fga("document", "can_edit")`)

**Given** a user with `can_delete` permission (owner) on `document:d1`
**When** `DELETE /api/documents/d1` is called
**Then** all FGA relations for the document are cleaned up first (via `list_relations` + `delete_relation` for each)
**And** then the document is deleted from the database
**And** if any FGA cleanup fails, the delete is aborted with HTTP 502

**Given** the document owner
**When** `POST /api/documents/d1/share` is called with `{"user_id": "user456", "relation": "viewer"}`
**Then** the target user is verified to exist in the same tenant (via `DescopeManagementClient.load_user()`)
**And** the relation is created in FGA
**And** only `"viewer"` or `"editor"` are accepted as relation values (Pydantic `Literal` validation)

**Given** the document owner
**When** `DELETE /api/documents/d1/share/user456` is called
**Then** both `viewer` and `editor` relations for that user on that document are deleted

**Given** a share request where the target user is not in the same tenant
**When** `POST /api/documents/d1/share` is called
**Then** HTTP 403 is returned with `"Cannot share with users outside your tenant"`

**Given** a document that does not exist or belongs to a different tenant
**When** any document endpoint is called with that ID
**Then** HTTP 404 is returned with `"Document not found"`

**Given** an unauthenticated request
**When** any `/api/documents` endpoint is called
**Then** HTTP 401 is returned

**Given** unit tests for the dependency factory and documents router
**When** the test suite runs
**Then** all scenarios are tested including: require_fga (allowed, denied, unauth, missing sub, API failure), create (with FGA owner relation), list (FGA-filtered), get/update/delete (FGA-enforced), share, revoke, compensation pattern, cross-tenant rejection, and unauthenticated access
**And** coverage for `dependencies/fga.py` and `routers/documents.py` exceeds 90%

### Story 3.4: FGA Unit Test Suite (Production-Quality Coverage)

As a QA engineer,
I want comprehensive unit tests for all FGA components achieving 90%+ coverage,
So that authorization correctness is verified to production standards (NFR-16, ADR-6 ReBAC exception).

**Acceptance Criteria:**

**Given** the FGA service methods on `DescopeManagementClient`
**When** unit tests execute
**Then** every FGA method has tests for: correct request payload shape, success response parsing, empty response handling, and HTTP error propagation
**And** `check_permission()` has tests for both `True` and `False` responses
**And** `list_relations()` and `list_user_resources()` have tests for empty and populated responses

**Given** the FGA admin router (`routers/fga.py`)
**When** unit tests execute
**Then** every endpoint has tests for: success path, admin role enforcement (403 for non-admin), Descope API error mapping (400 for validation errors, 502 for network errors), and rate limiting
**And** `POST /api/fga/check` has tests for both allowed and denied results

**Given** the `require_fga()` dependency factory
**When** unit tests execute
**Then** tests cover: permission granted, permission denied (403), unauthenticated (401), missing sub claim (401), and FGA API failure (502 — fail-closed)
**And** denial logging is verified

**Given** the documents router (`routers/documents.py`)
**When** unit tests execute
**Then** tests cover:
- Create: FGA owner relation created before DB commit, compensation on DB failure
- List: FGA-filtered by `can_view`, cross-tenant filtering, empty list handling
- Get: FGA `can_view` enforcement, cross-tenant 404
- Update: FGA `can_edit` enforcement
- Delete: FGA relation cleanup, abort on cleanup failure
- Share: same-tenant verification, Literal validation (only viewer/editor), cross-tenant rejection (403)
- Revoke: both viewer and editor relations deleted
- Unauthenticated: 401 for all endpoints

**Given** multi-level permission derivation in the schema (`editor implies viewer`, `owner implies editor`)
**When** check-related unit tests use mocked responses that reflect derivation
**Then** tests verify that the router/dependency correctly interprets `{"allowed": true}` for derived permissions (e.g., owner checked for `can_view`)

**Given** the complete FGA unit test suite
**When** `pytest --cov` runs on FGA-related files (`services/descope.py` FGA methods, `routers/fga.py`, `routers/documents.py`, `dependencies/fga.py`)
**Then** combined coverage exceeds 90% (NFR-16)

### Story 3.5: Document Access Control Demo Scenario & Terraform Seed

As a portfolio reviewer,
I want a working demo scenario showing document-level access control with realistic seed data,
So that I can see FGA/ReBAC working end-to-end.

**Acceptance Criteria:**

**Given** Terraform FGA resources exist in `terraform-provider-descope` (feat/fga-resources branch)
**When** `infra/fga.tf` is created in descope-saas-starter
**Then** it defines a `descope_fga_schema` resource with the document authorization schema:
```
type user
type document
  relations
    define owner: [user]
    define editor: [user]
    define viewer: [user] or editor or owner
  permissions
    define can_view: viewer
    define can_edit: editor or owner
    define can_delete: owner
```

**Given** a seed script exists (e.g., `backend/scripts/seed_demo.py`)
**When** the script runs against a deployed system
**Then** three sample documents are created with different access patterns:
- `public-roadmap` — all tenant members have `viewer` relation
- `board-minutes` — only users with `owner` role have access
- `team-project` — specific users have `editor`, others have `viewer`
**And** the script is idempotent (safe to re-run — checks for existing documents before creating)

**Given** a `viewer` user logs into the demo
**When** they navigate to the documents list
**Then** only documents they have `can_view` permission for are displayed

**Given** an `editor` user opens `team-project`
**When** the document renders
**Then** edit controls (update title/content) are visible

**Given** a user with no relations to `board-minutes`
**When** they attempt to access it directly via URL
**Then** HTTP 403 is returned

**Given** Docker Compose with the updated backend
**When** `docker compose up --build` is run
**Then** the application starts with all FGA and document routes registered (NFR-11)
**And** the database migration creates the `documents` table automatically (SQLModel `create_all`)

### Story 3.6: FGA Administration UI

As a platform admin,
I want a UI page to view the FGA schema, browse relations, and test authorization checks,
So that I can debug and verify access control rules visually.

**Acceptance Criteria:**

**Given** an admin user navigates to the FGA admin page
**When** the page loads
**Then** the current FGA schema is fetched from `GET /api/fga/schema` and displayed in a read-only code block
**And** a loading skeleton is shown while the schema loads

**Given** an admin views the relations panel
**When** they enter a resource type and resource ID and click "Load Relations"
**Then** `GET /api/fga/relations?resource_type=...&resource_id=...` is called
**And** all relation tuples are displayed in a table (columns: target, relation)

**Given** an admin wants to create a relation
**When** they fill in resource type, resource ID, relation, and target and click "Create"
**Then** `POST /api/fga/relations` is called with the form data
**And** on success, a toast notification confirms creation and the relations list refreshes

**Given** an admin wants to delete a relation
**When** they click the delete button on a relation row
**Then** `DELETE /api/fga/relations` is called
**And** on success, a toast notification confirms deletion and the relations list refreshes

**Given** an admin wants to test an authorization check
**When** they enter resource type, resource ID, relation, and target in the "Authorization Test" panel and click "Check"
**Then** `POST /api/fga/check` is called
**And** the result is displayed as "Allowed" (green) or "Denied" (red)

**Given** a non-admin user
**When** they visit the FGA admin page
**Then** the administration controls are hidden with an "admin or owner role required" message

**Given** an API error occurs (e.g., network failure, invalid resource type)
**When** any FGA operation is attempted
**Then** a toast notification displays the error message

**Given** the page follows existing UI patterns
**When** comparing to `RoleManagement.tsx`
**Then** it uses the same component library (shadcn/ui cards, tables, inputs, buttons, dialogs, toasts via sonner) and `useApiClient` hook

### Story 3.7: FGA Integration & E2E Tests

As a QA engineer,
I want integration and E2E tests covering the FGA feature end-to-end,
So that authorization correctness is verified across components with production-quality rigor (NFR-16).

**Acceptance Criteria:**

**Given** the FGA integration test suite
**When** tests execute against a running backend (with mocked or real Descope FGA API)
**Then** the following end-to-end scenarios pass:
- Create FGA schema via `PUT /api/fga/schema`
- Create relation tuples via `POST /api/fga/relations`
- Verify authorization check returns `{"allowed": true}` for existing relation
- Verify authorization check returns `{"allowed": false}` for non-existent relation
- Create a document, verify FGA owner relation is created
- Share a document with another user, verify they can read it
- Revoke share, verify access is denied
- Delete a document, verify FGA relations are cleaned up
- List documents returns only FGA-authorized documents

**Given** permission derivation is configured (editor implies viewer, owner implies all)
**When** E2E tests check derived permissions
**Then** an owner can view (via `can_view`), edit (via `can_edit`), and delete (via `can_delete`)
**And** an editor can view and edit but NOT delete
**And** a viewer can only view

**Given** cross-tenant isolation tests
**When** user in tenant A creates a document and shares it
**Then** user in tenant B cannot access the document even with a direct URL (HTTP 404 from tenant_id mismatch)
**And** `GET /api/documents` in tenant B does not include tenant A's documents

**Given** concurrent relation updates and authorization checks (NFR-7)
**When** tests create and delete relations in rapid succession while simultaneously checking permissions
**Then** no false-positive authorizations occur (checks return `false` only for relations that were never created or have been fully deleted)

**Given** schema update impact tests
**When** a relation type is removed from the FGA schema and an authorization check is performed for that relation type
**Then** the check reflects the updated schema (no stale grants)

**Given** Docker Compose with the complete FGA feature
**When** `docker compose up --build` is run
**Then** the application starts with all routes registered, the `documents` table is created, and the FGA endpoints are accessible (NFR-11)

**Given** the complete FGA test suite (unit + integration + E2E)
**When** all tests pass
**Then** the combined coverage for FGA-related code exceeds 90% (NFR-16)

---

## Epic 4: Enterprise SSO Federation

Tenant admins can configure OIDC/SAML SSO for their organization with domain routing. **Blocked on enterprise license (E074106).**

**FRs covered:** FR-SSS-12, FR-SSS-13, FR-SSS-14, FR-SSS-15

**Architecture context:**
- ADR-4: Wave 3 depends only on the existing tenant model, not on Waves 1-2.
- Enterprise license blocker (E074106): Blocks `descope_sso_application` TF resource → SSO config → step-up auth → MFA → OIDC/SAML apps.
- NFR-19: SSO operations go through `DescopeManagementClient`.
- SSO supports both OIDC and SAML providers per tenant.
- Domain routing maps email domains to SSO configurations.

### Story 4.1: Per-Tenant SSO Configuration API (Backend)

As a tenant admin,
I want to configure SSO for my organization through the API,
So that my users can authenticate using our corporate identity provider.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no SSO configuration methods
**When** Story 4.1 is complete
**Then** the client has `get_tenant_sso(tenant_id)`, `configure_tenant_sso_oidc(tenant_id, config)`, `configure_tenant_sso_saml(tenant_id, config)`, and `delete_tenant_sso(tenant_id)` methods

**Given** a tenant admin
**When** `GET /api/tenants/{tenant_id}/sso` is called
**Then** the current SSO configuration is returned (type: OIDC or SAML, status, provider details)
**And** the tenant_id matches the caller's tenant (tenant-scoped)

**Given** a tenant admin
**When** `PUT /api/tenants/{tenant_id}/sso` is called with OIDC config `{"type": "oidc", "client_id": "...", "client_secret": "...", "issuer_url": "..."}`
**Then** the SSO configuration is created/updated in Descope for that tenant

**Given** a tenant admin
**When** `PUT /api/tenants/{tenant_id}/sso` is called with SAML config `{"type": "saml", "idp_url": "...", "idp_cert": "...", "sp_entity_id": "..."}`
**Then** the SAML SSO configuration is created/updated in Descope (FR-SSS-13)

**Given** a tenant admin
**When** `DELETE /api/tenants/{tenant_id}/sso` is called
**Then** the SSO configuration is removed and users fall back to standard authentication

**Given** a user attempting to configure SSO for a different tenant
**When** the request is made
**Then** HTTP 403 is returned (tenant scoping enforced)

### Story 4.2: SSO Domain Routing

As a tenant admin,
I want to map email domains to my SSO configuration,
So that users with matching email addresses are automatically routed to SSO authentication.

**Acceptance Criteria:**

**Given** a tenant has SSO configured
**When** `PUT /api/tenants/{tenant_id}/sso/domains` is called with `{"domains": ["company.com", "subsidiary.com"]}`
**Then** those domains are mapped to the tenant's SSO provider (FR-SSS-14)

**Given** a user with email `user@company.com` attempts to log in
**When** the domain matches a configured SSO routing rule
**Then** the user is redirected to the tenant's SSO provider

**Given** a domain that is already claimed by another tenant
**When** a second tenant attempts to claim the same domain
**Then** HTTP 409 is returned with an error message

**Given** a tenant admin removes a domain mapping
**When** `DELETE /api/tenants/{tenant_id}/sso/domains/{domain}` is called
**Then** users with that domain revert to standard authentication

### Story 4.3: SSO Administration UI

As a tenant admin,
I want a UI page to configure SSO for my organization,
So that I can set up OIDC or SAML without using the API directly.

**Acceptance Criteria:**

**Given** a tenant admin navigates to the SSO settings page
**When** the page loads
**Then** the current SSO configuration is displayed (or "Not configured" if none)

**Given** a tenant admin selects "OIDC" configuration type
**When** they fill in client ID, client secret, and issuer URL and save
**Then** `PUT /api/tenants/{tenant_id}/sso` is called with the OIDC config
**And** success toast is shown on completion

**Given** a tenant admin selects "SAML" configuration type
**When** they fill in IDP URL, IDP certificate, and SP entity ID and save
**Then** `PUT /api/tenants/{tenant_id}/sso` is called with the SAML config

**Given** a tenant admin views the domain routing section
**When** they add or remove domains
**Then** the corresponding domain API endpoints are called and the list refreshes

**Given** a non-admin user
**When** they visit the SSO settings page
**Then** the configuration controls are hidden with an appropriate message

### Story 4.4: SSO E2E Tests

As a QA engineer,
I want E2E tests covering the SSO configuration happy path,
So that SSO setup and domain routing are verified end-to-end.

**Acceptance Criteria:**

**Given** the SSO E2E test suite
**When** the happy-path tests execute
**Then** the following scenarios pass:
- Configure OIDC SSO for a tenant
- Configure SAML SSO for a tenant
- Add domain routing rules
- Verify domain uniqueness constraint
- Delete SSO configuration
- Verify fallback to standard auth after SSO removal

**Given** Docker Compose is configured with SSO features
**When** `docker compose up --build` is run
**Then** the application starts with all SSO routes registered (NFR-11)

---

## Epic 5: Multi-Tenant Lifecycle

Admins can fully manage the tenant lifecycle — update settings, delete tenants, configure self-provisioning domains and default roles.

**FRs covered:** FR-SSS-16, FR-SSS-17, FR-SSS-18, FR-SSS-19

**Architecture context:**
- ADR-4: Wave 4 depends only on the existing tenant model and CRUD.
- Existing `tenants.py` router has `GET /api/tenants`, `POST /api/tenants`, `GET /api/tenants/{id}/members`.
- NFR-19: All operations via `DescopeManagementClient`.
- Tenant deletion must handle cascading cleanup (members, roles, settings).

### Story 5.1: Tenant Update API

As a tenant admin,
I want to update tenant settings (name, description) through the API,
So that I can manage my organization's identity without Descope console access.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no tenant update method
**When** Story 5.1 is complete
**Then** the client has `update_tenant(tenant_id, name, description)` method

**Given** a tenant admin
**When** `PUT /api/tenants/{tenant_id}` is called with `{"name": "New Name"}`
**Then** the tenant is updated in Descope and the updated tenant is returned

**Given** a user attempting to update a different tenant
**When** the request is made
**Then** HTTP 403 is returned (tenant-scoped)

**Given** an empty or missing tenant name
**When** `PUT /api/tenants/{tenant_id}` is called
**Then** HTTP 400 is returned with a validation error

### Story 5.2: Tenant Deletion API

As a platform owner,
I want to delete a tenant and all its associated data through the API,
So that I can decommission organizations cleanly.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no tenant delete method
**When** Story 5.2 is complete
**Then** the client has `delete_tenant(tenant_id)` method

**Given** a user with `owner` role
**When** `DELETE /api/tenants/{tenant_id}` is called
**Then** the tenant is deleted from Descope and HTTP 200 is returned

**Given** a user with `admin` role (not `owner`)
**When** `DELETE /api/tenants/{tenant_id}` is called
**Then** HTTP 403 is returned — only owners can delete tenants

**Given** a tenant with active members
**When** the tenant is deleted
**Then** all member associations are cleaned up by Descope

**Given** a non-existent tenant ID
**When** `DELETE /api/tenants/{tenant_id}` is called
**Then** HTTP 404 is returned

### Story 5.3: Self-Provisioning Domains

As a platform admin,
I want to configure self-provisioning domains for a tenant,
So that users with matching email domains are automatically added to the tenant on first login.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no self-provisioning methods
**When** Story 5.3 is complete
**Then** the client has `set_self_provisioning_domains(tenant_id, domains)` and `get_self_provisioning_domains(tenant_id)` methods

**Given** a tenant admin
**When** `PUT /api/tenants/{tenant_id}/domains` is called with `{"domains": ["company.com"]}`
**Then** self-provisioning domains are configured for the tenant

**Given** a new user with email `user@company.com` authenticates for the first time
**When** the domain matches a tenant's self-provisioning domains
**Then** the user is automatically associated with that tenant

**Given** a domain already claimed by another tenant
**When** a second tenant attempts to claim the same domain
**Then** HTTP 409 is returned

### Story 5.4: Default Role Management

As a tenant admin,
I want to configure the default role assigned to new members of my tenant,
So that new users get appropriate baseline permissions automatically.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` supports tenant metadata
**When** `PUT /api/tenants/{tenant_id}/default-role` is called with `{"role": "member"}`
**Then** the default role is stored for the tenant

**Given** a new user joins the tenant (via invitation or self-provisioning)
**When** their tenant membership is created
**Then** the configured default role is automatically assigned

**Given** no default role is configured
**When** a new user joins the tenant
**Then** no role is assigned (existing behavior preserved)

**Given** the specified default role does not exist in Descope
**When** `PUT /api/tenants/{tenant_id}/default-role` is called
**Then** HTTP 400 is returned with a descriptive error

### Story 5.5: Tenant Lifecycle UI Updates

As a tenant admin,
I want the tenant management UI updated with edit, delete, domain, and default role controls,
So that I can manage the full tenant lifecycle visually.

**Acceptance Criteria:**

**Given** the existing tenant management page
**When** an admin views a tenant
**Then** edit (name), delete, domain management, and default role sections are visible

**Given** an admin edits the tenant name
**When** they save
**Then** `PUT /api/tenants/{tenant_id}` is called and the UI refreshes

**Given** an owner clicks "Delete Tenant"
**When** they confirm in the confirmation dialog
**Then** `DELETE /api/tenants/{tenant_id}` is called and the user is redirected to the tenant list

**Given** an admin manages self-provisioning domains
**When** they add or remove domains
**Then** the domain API endpoints are called and the list updates

---

## Epic 6: M2M Security & Access Controls

Admins can manage access keys with IP restrictions and custom claims, configure allow/deny lists, and enforce password policies with per-tenant overrides.

**FRs covered:** FR-SSS-20, FR-SSS-21, FR-SSS-22, FR-SSS-23, FR-SSS-24, FR-SSS-25, FR-SSS-26

**Architecture context:**
- ADR-4: Wave 5+6 combined — depends only on existing access key and tenant models.
- Existing `accesskeys.py` router has full CRUD.
- NFR-19: All operations via `DescopeManagementClient`.
- `descope_list` TF resource manages IP/text lists at infrastructure level; runtime API manages full lifecycle.
- Password settings managed by `descope_password_settings` TF resource at infra level.

### Story 6.1: Access Key Enhancement (Backend)

As a platform admin,
I want to update access keys with IP restrictions and custom claims,
So that I can enforce M2M security policies for service accounts.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has basic access key CRUD
**When** Story 6.1 is complete
**Then** the client has `update_access_key(key_id, name, permitted_ips, custom_claims)` method

**Given** an authenticated admin
**When** `PATCH /api/keys/{key_id}` is called with `{"permitted_ips": ["10.0.0.0/8"]}`
**Then** the access key's permitted IPs are updated in Descope

**Given** an authenticated admin
**When** `PATCH /api/keys/{key_id}` is called with `{"custom_claims": {"env": "production"}}`
**Then** the access key's custom claims are updated

**Given** an invalid IP CIDR range
**When** `PATCH /api/keys/{key_id}` is called
**Then** HTTP 400 is returned with a validation error

**Given** a non-admin user
**When** any access key mutation endpoint is called
**Then** HTTP 403 is returned

### Story 6.2: Allow/Deny Lists API (Backend)

As a platform admin,
I want to manage IP and text allow/deny lists through the API,
So that I can enforce network security policies at runtime.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no list management methods
**When** Story 6.2 is complete
**Then** the client has `list_lists()`, `create_list(name, type, entries)`, `get_list(id)`, `update_list(id, entries)`, and `delete_list(id)` methods

**Given** an authenticated admin
**When** `GET /api/lists` is called
**Then** all allow/deny lists are returned with their type, name, and entry count

**Given** an authenticated admin
**When** `POST /api/lists` is called with `{"name": "Blocked IPs", "type": "ip_deny", "entries": ["1.2.3.4"]}`
**Then** the list is created in Descope and HTTP 201 is returned

**Given** an authenticated admin
**When** `PUT /api/lists/{id}` is called with updated entries
**Then** the list entries are updated in Descope

**Given** an authenticated admin
**When** `DELETE /api/lists/{id}` is called
**Then** the list is deleted and HTTP 200 is returned

### Story 6.3: Password Policy Management (Backend)

As a platform admin,
I want to manage password policies including per-tenant overrides,
So that I can enforce security requirements appropriate to each organization.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` has no password policy methods
**When** Story 6.3 is complete
**Then** the client has `get_password_policy()`, `update_password_policy(settings)`, `get_tenant_password_policy(tenant_id)`, and `update_tenant_password_policy(tenant_id, settings)` methods

**Given** an authenticated admin
**When** `GET /api/password-policy` is called
**Then** the project-level password policy is returned (min length, complexity requirements, history, expiration)

**Given** an authenticated admin
**When** `PUT /api/password-policy` is called with `{"min_length": 12, "require_uppercase": true}`
**Then** the project-level password policy is updated

**Given** a tenant admin
**When** `PUT /api/tenants/{tenant_id}/password-policy` is called with tenant-specific overrides
**Then** the per-tenant password policy override is saved (FR-SSS-25)

**Given** a tenant with no password policy override
**When** the tenant's effective policy is queried
**Then** the project-level policy applies as default

### Story 6.4: M2M & Security Admin UI

As a platform admin,
I want UI pages for access key management, allow/deny lists, and password policies,
So that I can manage M2M security controls visually.

**Acceptance Criteria:**

**Given** the existing access key management page
**When** an admin views an access key
**Then** IP restrictions and custom claims are displayed and editable

**Given** an admin navigates to the Lists management page
**When** the page loads
**Then** all allow/deny lists are displayed with name, type, and entry count

**Given** an admin creates a new list
**When** they fill in name, type, and entries
**Then** `POST /api/lists` is called and the list appears in the table

**Given** an admin navigates to the Password Policy page
**When** the page loads
**Then** the project-level policy is displayed with per-tenant override options

**Given** a non-admin user
**When** they visit any security admin page
**Then** the administration controls are hidden

### Story 6.5: M2M & Security E2E Tests

As a QA engineer,
I want E2E tests for access key enhancement, lists, and password policies,
So that security controls are verified end-to-end.

**Acceptance Criteria:**

**Given** the M2M security E2E test suite
**When** the happy-path tests execute
**Then** the following scenarios pass:
- Update access key with IP restrictions
- Update access key with custom claims
- Create, list, update, and delete an allow/deny list
- Get and update project-level password policy
- Set and get per-tenant password policy override
- UI loads all security admin pages without errors

---

## Epic 7: Advanced Protocol Support & Feature Parity

Developers get FastAPI middleware for drop-in token validation, Hybrid RP certification, and FAPI 2.0 support — achieving feature parity with Duende IdentityModel.

**FRs covered:** FR-PIM-10, FR-PIM-11, FR-PIM-12, FR-PIM-13

**Architecture context:**
- py-identity-model is production-grade (ADR-6).
- All features require dual sync/async API (NFR-9).
- Must maintain backwards compatibility (NFR-10).
- 80%+ coverage required (NFR-13).
- Conventional commits with semantic-release (NFR-14).

### Story 7.1: FastAPI Token Validation Middleware

As a FastAPI developer,
I want drop-in middleware for OIDC token validation,
So that I can protect endpoints with a single line of configuration.

**Acceptance Criteria:**

**Given** py-identity-model has no framework-specific middleware
**When** Story 7.1 is complete
**Then** a `FastAPITokenValidator` class exists that can be used as a FastAPI dependency

**Given** the middleware is configured with `issuer_url` and `audience`
**When** a request arrives with a valid Bearer token
**Then** the token is validated (signature, expiration, issuer, audience) and the claims are injected into the request

**Given** a request arrives with an expired or invalid token
**When** the middleware processes it
**Then** HTTP 401 is returned with a standard error response

**Given** JWKS is cached
**When** multiple requests arrive
**Then** token validation latency is < 5ms per request (NFR-1)

**Given** both sync and async FastAPI apps
**When** the middleware is used
**Then** it works correctly in both modes (NFR-9)

**Given** existing `validate_token()` callers
**When** the middleware is released
**Then** no backwards compatibility is broken (NFR-10)

### Story 7.2: Hybrid RP Profile Conformance

As a library maintainer,
I want py-identity-model to pass the OIDC Hybrid RP conformance profile,
So that it can be certified for Hybrid RP alongside Basic and Config.

**Acceptance Criteria:**

**Given** Hybrid RP profile requires `at_hash` and `c_hash` validation
**When** an ID token from a hybrid flow contains `at_hash`
**Then** it is validated against the `access_token` using the algorithm's hash function

**Given** an ID token from a hybrid flow contains `c_hash`
**When** validation occurs
**Then** it is validated against the `code` parameter

**Given** `at_hash` or `c_hash` does not match
**When** validation occurs
**Then** the token is rejected with a descriptive error

**Given** the OIDC conformance test harness (from Epic 1)
**When** Hybrid RP profile tests are run
**Then** all mandatory test cases pass

### Story 7.3: FAPI 2.0 Profile Compliance

As a library user building financial-grade APIs,
I want py-identity-model to support the FAPI 2.0 Security Profile,
So that I can build applications meeting financial regulatory requirements.

**Acceptance Criteria:**

**Given** existing DPoP support (PR #229) and PAR support (PR #230) are merged from Epic 1
**When** FAPI 2.0 profile compliance is evaluated
**Then** the library enforces: PAR required, PKCE required, DPoP recommended, `s_hash` validation

**Given** a FAPI 2.0 authorization request without PAR
**When** the request is built
**Then** the library raises an error indicating PAR is required for FAPI 2.0

**Given** a FAPI 2.0 authorization response
**When** the response is validated
**Then** `s_hash` (state hash) is checked if present in the ID token

**Given** the FAPI 2.0 test suite
**When** tests execute
**Then** coverage exceeds 80% for FAPI-related code

### Story 7.4: Feature Parity Assessment & Gap Closure

As a library maintainer,
I want a documented feature comparison with Duende IdentityModel and remaining gaps closed,
So that py-identity-model can be marketed as feature-equivalent.

**Acceptance Criteria:**

**Given** Duende IdentityModel's feature set
**When** a comparison is conducted
**Then** a feature parity matrix is produced documenting: covered, partially covered, not applicable, and gap items

**Given** the gap analysis identifies missing features
**When** gaps are prioritized
**Then** critical gaps (blocking parity claim) are addressed in this story

**Given** py-identity-model's documentation
**When** feature parity is claimed
**Then** the README and docs reflect the comparison and any remaining gaps are documented as known limitations

---

## Epic 8: Platform Publication & Project Health

Platform engineers can install the Terraform provider from the registry. Stale issues and PRs across repos are triaged and resolved. Sprint plan and task queue are updated.

**FRs covered:** FR-TFP-1, FR-TFP-2, FR-TFP-3, FR-SSS-27, FR-SSS-28, FR-CROSS-5

### Story 8.1: Publish Terraform Provider to Registry

As a platform engineer,
I want to install terraform-provider-descope from the Terraform Registry,
So that I can use standard `terraform init` without manual binary management.

**Acceptance Criteria:**

**Given** the fork at `jamescrowley321/terraform-provider-descope`
**When** the provider is published
**Then** `terraform init` downloads the provider from the Terraform Registry

**Given** the publishing requirements
**When** the provider is prepared
**Then** GPG signing key is configured, GitHub secrets are set, and the release workflow produces signed binaries

**Given** the existing acceptance tests
**When** they run against the published provider
**Then** all tests pass (NFR-17)

**Given** issue #22
**When** the provider is published
**Then** issue #22 is closed with a reference to the registry listing (FR-TFP-2)

### Story 8.2: Snake_case File Naming Standardization

As a contributor,
I want consistent snake_case file naming in the Terraform provider,
So that the codebase follows Go conventions and is easier to navigate.

**Acceptance Criteria:**

**Given** issue #109 identifies inconsistent file naming
**When** files are renamed to snake_case
**Then** all Go source files under `internal/` follow snake_case convention

**Given** files are renamed
**When** `go build ./...` is run
**Then** the provider compiles without errors

**Given** existing acceptance tests
**When** they run after renaming
**Then** all tests pass with no regressions

### Story 8.3: Triage Stale Issues and PRs (SaaS Starter)

As a project maintainer,
I want stale issues and open PRs triaged and resolved,
So that the project backlog reflects actual work remaining.

**Acceptance Criteria:**

**Given** ~10 stale issues (#5, #10, #28, #30-#34, #46, #48-#50)
**When** each is reviewed
**Then** each is either: closed as completed (already implemented), closed as won't-fix with reason, or updated with current status

**Given** open PRs (#99, #96-#98)
**When** each is reviewed
**Then** each is either merged, closed with reason, or updated with remaining work needed

**Given** the task queue and sprint plan
**When** triage is complete
**Then** both are updated to reflect current state (FR-CROSS-5)

### Story 8.4: Sprint Plan & Task Queue Refresh

As a project manager,
I want the sprint plan and task queue synchronized with current GitHub issue state,
So that tracking artifacts match reality.

**Acceptance Criteria:**

**Given** untracked issues (#242, #244-#246, #264) exist in GitHub
**When** the task queue is updated
**Then** all untracked issues are added with correct status, dependencies, and branch names

**Given** T101-T116 review fix tasks
**When** the sprint plan is reviewed
**Then** links to GitHub issues #240/#241 are added where applicable

**Given** completed tasks
**When** the queue is audited
**Then** all done tasks have correct PR references and branch names

---

## Epic 9: Provider Abstraction & Reference Architecture

The platform supports multiple identity providers through a documented reference architecture and common `IdentityProvider` interface, validated with Ory as a second provider.

**FRs covered:** FR-CROSS-1, FR-CROSS-2, FR-CROSS-3, FR-CROSS-4

**Architecture context:**
- ADR-2: Build Descope-specific first, then extract. All SaaS starter waves (Epics 2-6) must be complete before starting.
- ADR-3: Three-tier abstraction model — Tier 1 (abstract), Tier 2 (translate), Tier 3 (provider-specific).
- Ory as validation target: Keto (ReBAC), Kratos (users), Hydra (OIDC).

### Story 9.1: Reference Architecture Documentation

As a developer evaluating the platform,
I want documented reference architecture showing the three-repo pattern,
So that I can understand the design and apply it to my own projects.

**Acceptance Criteria:**

**Given** the three-repo pattern (protocol lib / IaC / application)
**When** the documentation is complete
**Then** a reference architecture document exists in `auth-planning/docs/` covering:
- Repository roles and responsibilities
- Dependency graph and coupling analysis
- TF-seeds-defaults / runtime-manages-lifecycle pattern
- Vendor abstraction seams
- Deployment model

**Given** the document
**When** a developer reads it
**Then** they can understand how to replicate the pattern for a different identity provider

### Story 9.2: IdentityProvider Interface Extraction

As a platform architect,
I want a common `IdentityProvider` interface extracted from `DescopeManagementClient`,
So that the application can support multiple identity providers behind a common API.

**Acceptance Criteria:**

**Given** `DescopeManagementClient` implements all Waves 1-6 features
**When** the interface is extracted
**Then** an abstract `IdentityProvider` class exists with methods for:
- User CRUD (Tier 1)
- ReBAC/authz checks — `check(subject, relation, object)` (Tier 1)
- SSO/Federation configuration (Tier 1)
- M2M/Access Keys (Tier 1)
- RBAC roles/permissions (Tier 2 — may need translation)
- Password policy (Tier 2)

**Given** the extracted interface
**When** `DescopeManagementClient` is refactored
**Then** it implements `IdentityProvider` with zero behavior changes (all existing tests pass)

**Given** provider-specific features (multi-tenancy model, flows, connectors)
**When** the interface is designed
**Then** Tier 3 features remain on `DescopeManagementClient` directly, not on the interface (ADR-3)

### Story 9.3: Capability Discovery

As a developer building provider-agnostic code,
I want to query which capabilities a provider supports,
So that I can gracefully handle features not available on all providers.

**Acceptance Criteria:**

**Given** the `IdentityProvider` interface
**When** `provider.supports("fga")` is called
**Then** it returns `True` for Descope (which supports FGA) (FR-CROSS-3)

**Given** a feature that a provider does not support
**When** `provider.supports("flows")` is called on a provider without flows
**Then** it returns `False`

**Given** the capability discovery system
**When** application code checks capabilities
**Then** it can conditionally enable/disable features in the UI and API

### Story 9.4: Ory Provider Validation

As a platform architect,
I want the `IdentityProvider` interface validated with Ory as a second provider,
So that the abstraction is proven to work beyond Descope.

**Acceptance Criteria:**

**Given** Ory components: Keto (ReBAC), Kratos (users), Hydra (OIDC)
**When** an `OryProvider` implementing `IdentityProvider` is built
**Then** Tier 1 methods work: user CRUD (Kratos), ReBAC checks (Keto), SSO via Hydra

**Given** Tier 2 features (RBAC, password policy)
**When** the Ory adapter is implemented
**Then** translation logic maps Ory's model to the common interface (or capability returns `False`)

**Given** both `DescopeProvider` and `OryProvider`
**When** the application is configured with either
**Then** core functionality (user management, authorization checks) works identically

**Given** the abstraction breaks for a Tier 2/3 feature
**When** the failure is documented
**Then** a decision is recorded: translation layer, capability flag, or stays provider-specific (ADR-2 sequence step 6)

---

## Epic 10: Extended OIDC Protocol Suite

Developers can use advanced OIDC features — CIBA, mTLS, Dynamic Client Registration, RP-Initiated Logout, JWT Client Auth, JARM, RAR, Discovery Cache TTL, AS Issuer Identification.

**FRs covered:** FR-PIM-14, FR-PIM-15, FR-PIM-16, FR-PIM-17, FR-PIM-18, FR-PIM-19, FR-PIM-20, FR-PIM-21, FR-PIM-22

**Architecture context:**
- py-identity-model is production-grade (ADR-6).
- All features require dual sync/async API (NFR-9).
- Backwards compatibility required (NFR-10).
- 80%+ coverage (NFR-13).
- Conventional commits (NFR-14).
- These map to existing GitHub issues #213-#221.

### Story 10.1: RP-Initiated Logout (RFC)

As a developer building an RP application,
I want RP-initiated logout support,
So that my application can properly terminate sessions at the OP.

**Acceptance Criteria:**

**Given** issue #214
**When** RP-Initiated Logout is implemented
**Then** `build_end_session_url(id_token_hint, post_logout_redirect_uri, state)` is available
**And** the URL is constructed per the RP-Initiated Logout spec

**Given** the OP's discovery document includes `end_session_endpoint`
**When** logout is initiated
**Then** the correct endpoint is used

**Given** both sync and async API
**When** logout is called
**Then** both interfaces work correctly (NFR-9)

### Story 10.2: JWT Client Authentication

As a developer building a confidential client,
I want `private_key_jwt` and `client_secret_jwt` authentication,
So that my client can authenticate to the token endpoint without sending secrets in the request body.

**Acceptance Criteria:**

**Given** issue #213
**When** JWT client authentication is implemented
**Then** `private_key_jwt` and `client_secret_jwt` methods are available for token endpoint authentication

**Given** `private_key_jwt` is configured
**When** a token request is made
**Then** a JWT assertion is generated with the correct claims (`iss`, `sub`, `aud`, `exp`, `jti`) and signed with the private key

**Given** `client_secret_jwt` is configured
**When** a token request is made
**Then** a JWT assertion is generated and signed with HMAC using the client secret

### Story 10.3: Discovery Cache TTL

As a developer,
I want configurable TTL on discovery document caching with forced refresh on failure,
So that my application handles key rotation gracefully.

**Acceptance Criteria:**

**Given** issue #219
**When** discovery cache TTL is implemented
**Then** `DiscoveryClient` accepts a `cache_ttl` parameter (default: 1 hour)

**Given** cached discovery data is older than TTL
**When** a discovery request is made
**Then** the cache is refreshed from the OP

**Given** a signature verification failure
**When** JWKS is used from cache
**Then** a forced JWKS refresh is triggered before retrying verification

**Given** the OP is temporarily unreachable during a refresh
**When** cached data exists and is within a grace period
**Then** stale cached data is used with a warning logged

### Story 10.4: AS Issuer Identification (RFC 9207)

As a developer,
I want authorization server issuer identification,
So that my application can detect mix-up attacks.

**Acceptance Criteria:**

**Given** issue #221
**When** AS Issuer Identification is implemented
**Then** the `iss` parameter in authorization responses is validated against the expected issuer

**Given** the `iss` parameter does not match the expected authorization server
**When** the response is processed
**Then** the response is rejected with a descriptive error

### Story 10.5: Dynamic Client Registration (RFC 7591)

As a developer building multi-tenant applications,
I want dynamic client registration,
So that my application can programmatically register with OPs.

**Acceptance Criteria:**

**Given** issue #216
**When** Dynamic Client Registration is implemented
**Then** `register_client(registration_endpoint, metadata)` is available in both sync/async

**Given** a registration request
**When** `register_client` is called
**Then** the client metadata is sent per RFC 7591 and the response includes `client_id` and optionally `client_secret`

**Given** the OP returns a registration error
**When** the response is processed
**Then** a descriptive error is raised with the OP's error details

### Story 10.6: CIBA (Client-Initiated Backchannel Authentication)

As a developer building decoupled authentication flows,
I want CIBA support,
So that my application can authenticate users via backchannel (e.g., push notification to mobile).

**Acceptance Criteria:**

**Given** issue #217
**When** CIBA is implemented
**Then** `initiate_backchannel_auth(login_hint, scope, binding_message)` and `poll_backchannel_auth(auth_req_id)` are available

**Given** a backchannel authentication request
**When** it is sent to the OP
**Then** the request includes required parameters per the CIBA spec

**Given** the OP responds with `auth_req_id`
**When** polling begins
**Then** the library polls at the specified interval until the user authenticates or the request expires

### Story 10.7: JARM, RAR, and mTLS

As a developer building advanced OIDC integrations,
I want JARM, RAR, and mTLS support,
So that my application can use JWT-secured responses, rich authorization, and certificate-bound tokens.

**Acceptance Criteria:**

**Given** issue #218 (JARM)
**When** JARM is implemented
**Then** JWT-secured authorization responses are validated (signature, claims)

**Given** issue #220 (RAR)
**When** RAR is implemented
**Then** `authorization_details` parameter can be included in authorization requests per RFC 9396

**Given** issue #215 (mTLS)
**When** mTLS is implemented
**Then** client certificate authentication and certificate-bound access tokens are supported

**Given** all three features
**When** tests execute
**Then** each feature has 80%+ coverage with both sync and async tests

---

## Epic 11: Cloud Provider Integration Testing

Developers can validate py-identity-model against AWS Cognito, Microsoft Entra ID, and Auth0 with cassette-based CI testing and periodic real-provider drift detection, proving the library works correctly across major cloud identity providers.

**FRs covered:** FR-PIM-23, FR-PIM-24, FR-PIM-25, FR-PIM-26, FR-PIM-27

**Architecture context:**
- py-identity-model is provider-agnostic by design — OIDC standardizes the protocol. But providers have quirks (non-standard URLs, custom claims, missing endpoints) that must be tested.
- Existing integration test infrastructure supports multi-provider via env var switching (`TEST_DISCO_ADDRESS`, etc.) with session-scoped fixtures and rate-limit retry logic.
- Cloud providers (Cognito, Entra, Auth0) are SaaS — cannot be Dockerized. Testing strategy uses **cassette recording** (pytest-recording/vcrpy) for deterministic CI, with periodic real-provider validation to detect drift.
- Account setup for each provider (User Pool, App Registration, Tenant) is a manual prerequisite done by the user — not part of the dev agent stories.
- Existing Makefile targets: `test-integration-ory`, `test-integration-descope`, `test-integration-local`. New targets will follow the same pattern.
- NFR-9: Dual sync/async API — all new tests must cover both APIs.
- NFR-13: 80%+ unit test coverage maintained.

**Testing strategy:**
- **CI (every PR):** Cassette replay — recorded HTTP responses committed to git. Fast, deterministic, no credentials.
- **Nightly/weekly:** Real provider calls — catches provider drift (key rotation changes, claim format changes, endpoint deprecation). Secrets in GitHub Actions.
- **Local dev:** `--record-mode=once` to record cassettes, default replays.

**Provider account prerequisites (manual, not in stories):**

| Provider | What to create | Free tier |
|---|---|---|
| AWS Cognito | User Pool + App Client (client credentials grant enabled) | Yes |
| Microsoft Entra ID | Azure AD tenant + App Registration (client credentials) | Yes |
| Auth0 | Tenant + Machine-to-Machine Application | Yes (1 tenant) |

Each provider needs: discovery URL, client ID, client secret configured in `.env.{provider}`.

### Story 11.1: Cassette Test Infrastructure

As a library maintainer,
I want a cassette-based integration test framework that can record and replay HTTP responses from identity providers,
So that CI tests are deterministic and fast while still validating real provider response formats.

**Acceptance Criteria:**

**Given** py-identity-model uses httpx for HTTP calls
**When** `pytest-recording` (vcrpy) is added to dev dependencies
**Then** it integrates with httpx via the vcrpy transport adapter
**And** `pyproject.toml` includes the new dependency

**Given** the cassette framework is configured
**When** tests run in default mode
**Then** cassettes are replayed from `src/tests/integration/cassettes/{provider}/` directories
**And** no network calls are made

**Given** a developer needs to record fresh cassettes
**When** tests run with `--record-mode=rewrite` or `--record-mode=once`
**Then** real HTTP calls are made and responses are saved as cassette YAML files
**And** the `.env.{provider}` file provides the connection credentials

**Given** the existing `conftest.py` session fixtures (discovery_document, jwks_response, client_credentials_token)
**When** cassette mode is active
**Then** fixtures work transparently — cassettes intercept the HTTP layer below the fixtures
**And** existing Ory and Descope integration tests are unaffected (no regression)

**Given** new providers need env templates
**When** checking the repo
**Then** `.env.cognito.example`, `.env.entra.example`, and `.env.auth0.example` exist with documented variables: `TEST_DISCO_ADDRESS`, `TEST_CLIENT_ID`, `TEST_CLIENT_SECRET`, `TEST_AUDIENCE`, `TEST_SCOPE`, plus provider-specific vars

**Given** new Makefile targets are needed
**When** running tests per provider
**Then** the following targets work: `make test-integration-cognito`, `make test-integration-entra`, `make test-integration-auth0`
**And** each target loads the corresponding `.env.{provider}` file and sets `CASSETTE_DIR` appropriately

**Given** cassette files may contain sensitive data (tokens, client secrets in request headers)
**When** cassettes are recorded
**Then** a cassette filter scrubs `Authorization` headers, `client_secret` values, and access tokens before saving
**And** `.gitignore` does NOT exclude cassettes (they must be committed), but a pre-commit check warns if unscrubbed secrets are detected

### Story 11.2: AWS Cognito Integration Tests

As a library maintainer,
I want integration tests that validate py-identity-model against AWS Cognito,
So that developers can trust the library works with Cognito's specific OIDC implementation and known quirks.

**Acceptance Criteria:**

**Given** a Cognito User Pool with an App Client configured for client credentials
**When** cassettes are recorded against the real Cognito endpoint
**Then** cassette files are saved to `src/tests/integration/cassettes/cognito/`

**Given** the Cognito discovery URL uses the non-standard format `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/openid-configuration`
**When** `get_discovery_document()` is called with this URL
**Then** the discovery document is fetched and parsed correctly
**And** the issuer, token_endpoint, jwks_uri, and userinfo_endpoint are extracted

**Given** Cognito's JWKS endpoint returns keys
**When** `get_jwks()` is called
**Then** keys are fetched, `kid` selection works, and the key set is cached

**Given** a valid client credentials token from Cognito
**When** `validate_token()` is called
**Then** signature verification, issuer validation, audience validation, and expiration check all pass
**And** both sync and async APIs produce identical results (NFR-9)

**Given** Cognito includes `cognito:groups` in the token claims
**When** the token is decoded
**Then** the `cognito:groups` claim is accessible via `ClaimsPrincipal.find_all("cognito:groups")`

**Given** Cognito does NOT support the standard introspection endpoint
**When** the introspection test runs
**Then** it is skipped with `pytest.mark.skip(reason="Cognito does not support introspection")`

**Given** Cognito's UserInfo endpoint
**When** `get_userinfo()` is called with a valid access token
**Then** the `sub` claim matches the token's `sub` (UserInfo `sub` consistency validation)

**Given** Cognito rotates JWKS keys
**When** a token signed with a new key is validated and the cached JWKS doesn't have the `kid`
**Then** the library forces a JWKS refresh and retries validation successfully

### Story 11.3: Microsoft Entra ID Integration Tests

As a library maintainer,
I want integration tests that validate py-identity-model against Microsoft Entra ID,
So that developers can trust the library works with Entra's v2.0 OIDC implementation and tenant-scoped discovery.

**Acceptance Criteria:**

**Given** an Entra ID tenant with an App Registration configured for client credentials
**When** cassettes are recorded against the real Entra endpoint
**Then** cassette files are saved to `src/tests/integration/cassettes/entra/`

**Given** Entra's v2.0 discovery URL `https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration`
**When** `get_discovery_document()` is called
**Then** the discovery document is fetched and parsed correctly
**And** the issuer includes the tenant ID and `/v2.0` path

**Given** Entra also supports a multi-tenant discovery URL (`/common/v2.0/`)
**When** `get_discovery_document()` is called with the common endpoint
**Then** the discovery document is fetched successfully
**And** the issuer contains `{tenantid}` placeholder (Entra's multi-tenant pattern)

**Given** Entra's JWKS endpoint
**When** `get_jwks()` is called
**Then** keys are fetched and `kid` selection works correctly
**And** Entra's key rotation (typically every ~6 weeks) is handled by the cache refresh mechanism

**Given** a valid client credentials token from Entra
**When** `validate_token()` is called
**Then** signature, issuer, audience, and expiration checks all pass
**And** both sync and async APIs produce identical results (NFR-9)

**Given** Entra tokens include `tid` (tenant ID) and `oid` (object ID) claims
**When** the token is decoded
**Then** `tid` and `oid` are accessible via `ClaimsPrincipal.find_first("tid")` and `ClaimsPrincipal.find_first("oid")`

**Given** Entra supports the introspection endpoint
**When** token introspection is tested
**Then** the introspection response is validated per RFC 7662

**Given** Entra does NOT support a standard token revocation endpoint
**When** the revocation test runs
**Then** it is skipped with `pytest.mark.skip(reason="Entra does not support standard token revocation")`

**Given** Entra's UserInfo endpoint
**When** `get_userinfo()` is called
**Then** the `sub` claim is validated for consistency with the ID token

### Story 11.4: Auth0 Integration Tests

As a library maintainer,
I want integration tests that validate py-identity-model against Auth0,
So that developers can trust the library works with Auth0's OIDC implementation and RBAC-specific claims.

**Acceptance Criteria:**

**Given** an Auth0 tenant with a Machine-to-Machine Application configured
**When** cassettes are recorded against the real Auth0 endpoint
**Then** cassette files are saved to `src/tests/integration/cassettes/auth0/`

**Given** Auth0's discovery URL `https://{domain}/.well-known/openid-configuration`
**When** `get_discovery_document()` is called
**Then** the discovery document is fetched and parsed correctly

**Given** Auth0's JWKS endpoint
**When** `get_jwks()` is called
**Then** keys are fetched, `kid` selection works, and caching is functional

**Given** a valid client credentials token from Auth0
**When** `validate_token()` is called
**Then** signature, issuer, audience, and expiration checks all pass
**And** both sync and async APIs produce identical results (NFR-9)

**Given** Auth0 includes `permissions` in the access token (when RBAC is enabled)
**When** the token is decoded
**Then** the `permissions` claim is accessible via `ClaimsPrincipal.find_all("permissions")`

**Given** Auth0 Organizations include `org_id` in the token
**When** the token is decoded
**Then** the `org_id` claim is accessible via `ClaimsPrincipal.find_first("org_id")`

**Given** Auth0 supports token introspection
**When** introspection is tested
**Then** the response is validated per RFC 7662

**Given** Auth0 supports token revocation
**When** revocation is tested
**Then** revocation follows RFC 7009

**Given** Auth0's UserInfo endpoint
**When** `get_userinfo()` is called
**Then** the `sub` claim is validated for consistency with the ID token

**Given** Auth0 supports custom domains (e.g., `auth.example.com` instead of `example.auth0.com`)
**When** the discovery URL uses a custom domain
**Then** discovery, JWKS, and token validation all work correctly (issuer matches custom domain)

**Given** Auth0 rotates signing keys
**When** a token signed with a new key is validated
**Then** the JWKS cache refresh detects the new key and validation succeeds

### Story 11.5: Nightly Provider Validation CI

As a library maintainer,
I want a nightly CI workflow that runs integration tests against real cloud providers,
So that provider drift (endpoint changes, claim format changes, key rotation schedule changes) is detected automatically.

**Acceptance Criteria:**

**Given** GitHub Actions supports scheduled workflows
**When** the nightly workflow is configured
**Then** it runs on a `cron: '0 6 * * *'` schedule (6 AM UTC daily) and can be triggered manually via `workflow_dispatch`

**Given** provider credentials are stored as GitHub Actions secrets
**When** the workflow runs
**Then** it executes `make test-integration-cognito`, `make test-integration-entra`, `make test-integration-auth0` with `--record-mode=none` (live calls, no cassette recording)
**And** each provider's tests run in a separate job for isolation

**Given** a provider test fails
**When** the failure is detected
**Then** a GitHub issue is automatically created with: provider name, failing test name, error message, and a diff between the expected (cassette) and actual response if available
**And** the issue is labeled `provider-drift` and assigned to the repository maintainer

**Given** a provider has changed its response format
**When** the maintainer decides to update cassettes
**Then** a manual workflow `workflow_dispatch` with input `record-provider={cognito|entra|auth0}` re-records cassettes and opens a PR with the updated cassette files

**Given** the nightly workflow
**When** all three providers pass
**Then** the workflow completes with a success status and no issues are created

**Given** a provider's API is temporarily unavailable (rate limit, outage)
**When** tests fail with network errors (not assertion errors)
**Then** the workflow retries once after 5 minutes before creating a drift issue
**And** the issue title includes "[Transient]" to distinguish from real drift
