---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-through-12-accelerated']
inputDocuments:
  - docs/index.md
  - docs/descope-data-model.md
  - docs/oidc-certification-analysis.md
  - docs/ralph-planning/orchestrator-comparison.md
  - docs/ralph-planning/ralph-bmad-integration-plan.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28-01.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 5
classification:
  projectType: 'vertically-integrated-identity-platform'
  domain: 'identity-access-management'
  complexity: 'high'
  projectContext: 'brownfield'
  prdStrategy: 'single-unified-then-split-to-three'
  repoTagging: '[PIM] py-identity-model, [SSS] identity-stack, [TFP] terraform-provider-descope, [CROSS] cross-repo'
  qualityTiers:
    pim: 'production-grade'
    sss: 'demo-poc-quality'
    tfp: 'functional'
  targetAudiences:
    pim: 'OSS community + production users'
    sss: 'consulting clients + portfolio'
    tfp: 'consulting clients using Descope'
---

# Product Requirements Document - identity-stack-planning

**Author:** James
**Date:** 2026-03-28

## Executive Summary

This PRD defines the requirements for a vertically integrated identity platform spanning three repositories: **py-identity-model** (OIDC/OAuth2 Python library), **identity-stack** (B2B SaaS reference application with FastAPI + React + Terraform), and **terraform-provider-descope** (Descope IaC provider). py-identity-model is a production library targeting competitive dominance in the Python identity ecosystem — achieving OpenID Foundation RP certification, feature parity with Duende IdentityModel (.NET), and expansion into framework-specific middleware (FastAPI). The SaaS starter and TF provider serve as portfolio, consulting, and POC acceleration assets demonstrating enterprise identity patterns (RBAC, ReBAC/FGA, SSO, multi-tenancy) against real providers.

The work proceeds in parallel tracks: (A) py-identity-model review fix chain completion + OIDC conformance test harness + certification, (B) SaaS starter feature waves exposing TF-only resources as runtime APIs — RBAC CRUD, ReBAC/FGA, SSO configuration, tenant/access key enhancement, (C) TF provider registry publishing and maintenance, and (D) reference architecture documentation followed by iterative provider abstraction with Ory as the validation target. All tracks execute concurrently via Ralph loops against git worktrees. Each feature wave must be independently implementable without cross-wave dependencies within a repo.

The long-term trajectory: complete Descope-specific features, document the three-repo reference architecture pattern (protocol lib / IaC / application), extract a provider interface from `DescopeManagementClient`, and validate multi-provider feasibility using Ory (Keto for ReBAC, Kratos for users, Hydra for OIDC). The reference architecture has standalone value regardless of abstraction outcome.

### What Makes This Special

**No one else has the full stack.** A certified Python RP library, IaC for identity infrastructure, and a working reference application showing RBAC, ReBAC, SSO, and multi-tenancy — each piece stands alone; together they are a credibility multiplier. The core architectural insight is that the Descope coupling surface is narrow: the frontend is already vendor-agnostic (react-oidc-context), token validation is already vendor-agnostic (py-identity-model speaks OIDC, not Descope), and provider-specific code is concentrated in `DescopeManagementClient`. This makes multi-provider abstraction feasible without a massive rewrite. py-identity-model's certification path positions it against authlib and pyoidc as the only formally certified modern Python OIDC library — with a roadmap to absorb best features from competing libraries and expand into framework integrations.

## Project Classification

- **Project Type:** Vertically integrated identity platform (protocol library + IaC + reference application)
- **Domain:** Identity & Access Management
- **Complexity:** High — OIDC spec compliance, security-critical token handling, multi-tenancy, ReBAC/FGA, formal conformance testing, multi-provider abstraction
- **Project Context:** Brownfield — three existing repos with significant work complete; py-identity-model in production
- **PRD Strategy:** Single unified PRD, split into three coordinated repo-specific PRDs post-authoring
- **Repo Tagging:** `[PIM]` py-identity-model, `[SSS]` identity-stack, `[TFP]` terraform-provider-descope, `[CROSS]` cross-repo
- **Quality Tiers:** Production-grade (PIM), Demo/POC with ReBAC exception (SSS), Functional (TFP)
- **Target Audiences:** OSS community + production users (PIM), consulting clients + portfolio (SSS/TFP)

## Success Criteria

### User Success

- **[PIM]** Developers using py-identity-model in production experience zero breaking changes during feature expansion
- **[PIM]** A Python developer evaluating OIDC libraries finds py-identity-model covers every capability Duende IdentityModel offers
- **[PIM]** FastAPI developers can drop in middleware without writing token validation boilerplate
- **[SSS]** A solutions architect can clone the starter, point it at a Descope project, and have working RBAC + ReBAC + SSO in under an hour
- **[TFP]** A Descope user can `terraform init` without configuring dev_overrides or pointing at a fork

### Business Success

- **Personal satisfaction metric:** James judges each component as "I would confidently show this to anyone"
- **[PIM]** Feature parity with Duende IdentityModel achieved — no missing capabilities
- **[PIM]** OpenID Foundation RP certification (Basic RP + Config RP profiles)
- **Portfolio completeness:** The three-repo stack demonstrates end-to-end identity expertise without gaps

### Technical Success

- **[PIM]** OIDC conformance test harness passes Basic RP and Config RP profiles with zero failures
- **[PIM]** All Duende IdentityModel feature equivalents implemented with dual sync/async API
- **[PIM]** 80%+ test coverage maintained throughout expansion
- **[SSS]** All 6 feature waves implemented: RBAC CRUD, ReBAC/FGA, SSO, tenant enhancement, access keys, password settings
- **[SSS]** ReBAC/FGA implementation is correct — authorization decisions are provably right
- **[TFP]** Published to Terraform Registry with passing CI
- **[CROSS]** Provider interface extracted; Ory validates the abstraction for at least ReBAC

## Product Scope

### MVP

- **[PIM]** Review fix chain complete (T101-T116), conformance test harness operational, Basic RP certification submitted
- **[SSS]** Waves 1-2 complete (RBAC CRUD + ReBAC/FGA)
- **[TFP]** Registry published (PR #108 merged)
- **[CROSS]** Reference architecture documented

### Growth Features (Post-MVP)

- **[PIM]** Config RP certification, feature parity gap closure with Duende, FastAPI middleware
- **[SSS]** Waves 3-6 (SSO, tenant enhancement, access keys, password settings)
- **[CROSS]** Provider interface extraction from DescopeManagementClient

### Vision (Future)

- **[PIM]** Absorb best features from authlib/pyoidc — become the definitive Python identity library
- **[PIM]** Additional framework middleware (Django, Flask)
- **[SSS]** Ory as validated second provider (Keto, Kratos, Hydra)
- **[CROSS]** Multi-provider identity platform with clean abstraction

## Functional Requirements

### [PIM] py-identity-model

#### Review Fix Chain & Certification

- FR-PIM-1: Complete review fix chain for all 16 open feature PRs (T101-T116) — each PR's adversarial review findings resolved and merged
- FR-PIM-2: Build OIDC conformance test harness — thin FastAPI RP app using py-identity-model, Docker Compose extending OpenID conformance suite, automation via suite REST API
- FR-PIM-3: Pass Basic RP profile conformance tests — auth code flow, ID token validation (issuer, sub, aud, iat, kid handling, signatures), nonce validation, UserInfo sub mismatch detection, client_secret_basic auth
- FR-PIM-4: Pass Config RP profile conformance tests — discovery document retrieval, JWKS retrieval, issuer mismatch detection, key rotation handling via JWKS cache TTL/forced refresh (issue #219)
- FR-PIM-5: Submit for OpenID Foundation Basic RP + Config RP certification

#### Conformance Gap Closure

- FR-PIM-6: Implement missing `kid` handling — fallback logic when JWT has no `kid` and JWKS has single vs. multiple keys
- FR-PIM-7: Implement UserInfo `sub` vs. ID token `sub` mismatch validation
- FR-PIM-8: Implement JWKS cache TTL with forced refresh on signature verification failure (issue #219)
- FR-PIM-9: Verify nonce validation end-to-end through authorization flow

#### Feature Parity with Duende IdentityModel

- FR-PIM-10: Achieve feature parity with Duende IdentityModel — all equivalent capabilities implemented with dual sync/async API
- FR-PIM-11: Implement FastAPI middleware for token validation (drop-in integration)
- FR-PIM-12: Expand certification to Implicit RP and Hybrid RP profiles (at_hash, c_hash validation)
- FR-PIM-13: Implement FAPI 2.0 support (DPoP #229, PAR #230, existing PR #235)

#### Advanced OIDC Features (from issues #213-#221)

- FR-PIM-14: CIBA (Client-Initiated Backchannel Authentication)
- FR-PIM-15: mTLS (Mutual TLS Client Authentication)
- FR-PIM-16: Dynamic Client Registration (issue #216)
- FR-PIM-17: RP-Initiated Logout
- FR-PIM-18: JWT Client Authentication
- FR-PIM-19: JARM (JWT Secured Authorization Response Mode)
- FR-PIM-20: RAR (Rich Authorization Requests)
- FR-PIM-21: Discovery Cache TTL (issue #219)
- FR-PIM-22: AS Issuer Identification

### [SSS] identity-stack

#### Wave 1 — RBAC CRUD

- FR-SSS-1: GET/POST/PUT/DELETE `/api/roles` — role definition management
- FR-SSS-2: GET/POST/PUT/DELETE `/api/permissions` — permission definition management
- FR-SSS-3: Role-permission mapping management API
- FR-SSS-4: Admin role/permission management UI page
- FR-SSS-5: TF seeds default roles/permissions, runtime API manages full lifecycle

#### Wave 2 — ReBAC/FGA

- FR-SSS-6: GET/PUT `/api/fga/schema` — view/update FGA schema
- FR-SSS-7: POST/DELETE/GET `/api/fga/relations` — relation tuple CRUD
- FR-SSS-8: POST `/api/fga/check` — authorization check endpoint
- FR-SSS-9: FGA middleware integration — check relations in request pipeline
- FR-SSS-10: Demo scenario: document-level access control
- FR-SSS-11: UI: Relationship viewer + authorization test panel

#### Wave 3 — SSO Configuration

- FR-SSS-12: GET/PUT/DELETE `/api/tenants/{id}/sso` — per-tenant SSO config
- FR-SSS-13: OIDC and SAML SSO configuration support
- FR-SSS-14: SSO domain routing
- FR-SSS-15: UI: Tenant admin SSO configuration page

#### Wave 4 — Tenant Enhancement

- FR-SSS-16: PUT `/api/tenants/{id}` — update tenant name/settings
- FR-SSS-17: DELETE `/api/tenants/{id}`
- FR-SSS-18: Self-provisioning domain management
- FR-SSS-19: Default role management per tenant

#### Wave 5 — Access Key Enhancement + Lists

- FR-SSS-20: PATCH `/api/keys/{id}` — update access key
- FR-SSS-21: Permitted IP management for access keys
- FR-SSS-22: Custom claims on access keys
- FR-SSS-23: GET/POST/DELETE `/api/lists` — IP/text allow-deny lists

#### Wave 6 — Password Settings

- FR-SSS-24: GET/PUT `/api/password-policy` — password policy management
- FR-SSS-25: Per-tenant password policy overrides
- FR-SSS-26: Admin password settings UI

#### Triage & Cleanup

- FR-SSS-27: Close ~10 stale issues (#5, #10, #28, #30-#34, #46, #48-#50)
- FR-SSS-28: Merge/close open PRs (#99, #96-#98)

### [TFP] terraform-provider-descope

- FR-TFP-1: Merge PR #108 — publish provider to Terraform Registry
- FR-TFP-2: Close issue #22 after registry publish
- FR-TFP-3: Address issue #109 (snake_case file naming standardization)

### [CROSS] Cross-Repo

- FR-CROSS-1: Document reference architecture — three-repo pattern (protocol lib / IaC / application), TF-seeds-defaults/runtime-manages-lifecycle pattern
- FR-CROSS-2: Extract provider interface from `DescopeManagementClient` — define `IdentityProvider` interface with methods: list_users(), assign_role(), create_tenant(), check_fga_relation()
- FR-CROSS-3: Implement capability discovery — `provider.supports("fga")`, `provider.supports("rbac")`
- FR-CROSS-4: Validate abstraction with Ory — Keto for ReBAC, Kratos for users, Hydra for OIDC
- FR-CROSS-5: Update sprint plan, task queue, link T101-T116 to GitHub issues #240/#241, add untracked issues (#242, #244-#246, #264)

## Non-Functional Requirements

### Performance

- NFR-1: **[PIM]** Token validation latency < 5ms for cached JWKS (excluding network)
- NFR-2: **[PIM]** Discovery document caching with configurable TTL — no redundant network calls
- NFR-3: **[SSS]** API response times < 200ms for CRUD operations against Descope Management API

### Security

- NFR-4: **[PIM]** No algorithm confusion vulnerabilities — reject `alg=none` when signatures expected, validate `alg` against JWKS key type
- NFR-5: **[PIM]** All token validation follows OIDC Core spec strictly — no shortcuts on issuer, audience, expiration, signature checks
- NFR-6: **[SSS]** All new API endpoints require authentication; admin endpoints require appropriate role
- NFR-7: **[SSS]** ReBAC authorization decisions must be consistent — no race conditions between relation updates and checks
- NFR-8: **[CROSS]** No secrets in code, Terraform state, or git history

### Compatibility

- NFR-9: **[PIM]** Target latest stable Python versions only, dual sync/async API for all new features
- NFR-10: **[PIM]** Backwards-compatible API — existing integrations must not break (semantic versioning)
- NFR-11: **[SSS]** Existing Docker Compose deployment continues working as features are added
- NFR-12: **[TFP]** Compatible with Terraform 1.x, no breaking changes to existing resource schemas

### Testing

- NFR-13: **[PIM]** 80%+ unit test coverage maintained; conformance harness as integration gate
- NFR-14: **[PIM]** Conventional commits (Angular convention) with semantic-release
- NFR-15: **[SSS]** E2E tests covering happy path for each feature wave
- NFR-16: **[SSS]** ReBAC/FGA has tighter test coverage than other waves — authorization correctness is critical
- NFR-17: **[TFP]** Existing acceptance tests continue passing

### Architecture

- NFR-18: **[SSS]** Each feature wave independently implementable — no cross-wave dependencies within the repo
- NFR-19: **[SSS]** Descope-specific code concentrated in `DescopeManagementClient` — clean seam for future interface extraction
- NFR-20: **[CROSS]** Provider abstraction follows three-tier model: Tier 1 (abstract: user CRUD, ReBAC, SSO, access keys), Tier 2 (translate: RBAC, password policy), Tier 3 (provider-specific: multi-tenancy, flows, connectors)
