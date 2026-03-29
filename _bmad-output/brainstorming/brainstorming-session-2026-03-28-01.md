---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments: []
session_topic: 'Descope feature completion, RBAC/ReBAC API exposure, and path to provider-agnostic identity platform'
session_goals: 'Complete Descope-specific features, expose TF-only resources as APIs, design canonical user/RBAC/ReBAC model, plan federation and multi-provider abstraction'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Morphological Analysis', 'Decision Tree Mapping']
ideas_generated: []
context_file: ''
---

## Session Overview

**Topic:** Completing the Descope-specific feature set across all three repos, exposing RBAC and ReBAC capabilities correctly through APIs, and planning the path to a provider-agnostic identity platform.

**Goals:**
1. Finish Descope-related features and review fix chains
2. Expose TF-only resources (FGA/ReBAC, SSO, roles/permissions CRUD, lists, password settings, applications) as SaaS starter APIs
3. Design a canonical user/RBAC/ReBAC API/UI model
4. Plan federation with Ory and Identity Server
5. Eventually abstract into configurable multi-provider backends

### Context: Current State Analysis (2026-03-28)

---

## 1. py-identity-model — GitHub State Audit

### Open PRs: 20
- **16 feature PRs** (#211-#237): All implemented, passing CI, held open for adversarial review fixes
- **4 dependency update PRs** (#212, #231, #238, #263): Automated, unmerged

### Open Issues: 39
- 16 correspond to open feature PRs (will close on merge)
- 5 NEW issues not tracked in task queue:
  - **#242** — OpenID Connect RP Certification tracking issue
  - **#244** — Keycloak integration test environment
  - **#245** — Local Ory Hydra Docker Compose for integration testing
  - **#246** — Formalize Ory Network (cloud) integration tests
  - **#264** — Migrate Terraform provider source to jamescrowley321/descope
- 8 new spec issues (#213-#221) for advanced OIDC features (CIBA, mTLS, Dynamic Client Registration, RP-Initiated Logout, JWT Client Auth, JARM, RAR, Discovery Cache TTL, AS Issuer ID)
- Provider example issues (#33, #35-#39): Flask, Azure AD, Google, Cognito, Auth0, Okta

### Review Fix Chain (T101-T116): CRITICAL PATH
- **T101** (PR #211 — OAuth Callback State): **in_progress**, test phase
- T102-T116: 15 tasks pending, strictly sequential
- Each task = one PR's review findings fix
- All 16 feature PRs blocked on this chain completing

### Planning Discrepancies Found
- Sprint plan header says "as of 2026-03-24" but is stale — shows T37 in_progress when T32-T47 are all done
- Task queue T101-T116 issue column is blank — should reference GitHub issues #240, #241
- 5 new issues (#242, #244, #245, #246, #264) have no task queue entries

---

## 2. terraform-provider-descope — GitHub State Audit

### Open PRs: 1
- **#108** — feat: publish provider to Terraform Registry

### Open Issues: 2
- **#109** — chore: standardize Go file naming to snake_case
- **#22** — feat: publish fork to Terraform Registry (related to PR #108)

### Status: Nearly complete. 22/28 tasks done. Blocked items are enterprise license (SSO app) and design decisions (JWT/flows wontfix).

---

## 3. descope-saas-starter — GitHub State Audit

### Open PRs: 4
- **#99** — fix: Handle missing tenant context + add page content E2E tests
- #96-#98 — Dependabot dependency bumps

### Open Issues: 38
- **~10 stale issues** that correspond to already-merged PRs and should be closed:
  - #5 (RBAC → merged PR #25), #28 (security headers → PR #37), #30 (structured logging → PR #89)
  - #31 (audit logging → PR #58), #32 (health checks → PR #59), #33 (retry logic → PR #60)
  - #34 (E2E testing → PR #94), #46/#48/#49/#50 (shadcn/ui migration → PRs #90/#92/#93)
  - #10 (access keys → PR #27)
- **Multi-Provider Architecture** (#74-#81, #100): 8 issues for abstraction refactor
- **Enterprise Auth** (#7-#9): SSO config, step-up auth, MFA enforcement
- **Advanced Auth** (#38-#45): FGA/ReBAC, RBAC hierarchy, social login, passkeys, magic link, step-up, audit, JWT templates

---

## 4. TF Resource → SaaS Starter API Gap Matrix

### Resources WITH API exposure (partial or full)
| TF Resource | In TF Config? | API Coverage | Key Gaps |
|---|---|---|---|
| `descope_tenant` | YES (2 tenants) | Partial — create, list, current, update attrs | No update name, delete, self-provisioning domains, default roles, parent hierarchy |
| `descope_access_key` | YES (2 keys) | Good — CRUD + activate/deactivate | No update, no permitted IPs, no custom claims/attrs, no global keys |
| `descope_role` | YES (4 roles) | Minimal — read own roles, assign/remove on users | **No role CRUD API** — can't list all roles, create, update, delete, or manage permission mappings |
| `descope_permission` | YES (12 perms) | Consumed only — `require_permission` in middleware | **No permission CRUD API** — all management is TF-only |

### Resources with ZERO API exposure (100% gap)
| TF Resource | Purpose | Priority for SaaS Starter |
|---|---|---|
| **`descope_fga_schema`** | ReBAC schema definition (object types, relations) | **HIGH** — core to ReBAC demo |
| **`descope_sso`** | Per-tenant SSO config (OIDC/SAML) | **HIGH** — federation demo |
| **`descope_sso_application`** | SSO applications (inbound OIDC/SAML) | **HIGH** — federation demo |
| **`descope_list`** | IP/text allow-deny lists | MEDIUM — security feature |
| **`descope_password_settings`** | Password policy (complexity, lockout) | MEDIUM — admin feature |
| **`descope_third_party_application`** | External OAuth provider integration | MEDIUM — federation |
| **`descope_outbound_application`** | Outbound OAuth apps | MEDIUM — federation |
| **`descope_inbound_application`** | Cross-project auth integration | LOW — advanced |
| **`descope_descoper`** | Descope account management | LOW — infra-only |
| **`descope_management_key`** | Mgmt API key lifecycle | LOW — infra-only |

### Data Sources with ZERO usage
| Data Source | Purpose | Notes |
|---|---|---|
| `descope_fga_check` | Check FGA authorization (allowed?) | **Critical for ReBAC runtime** — this is the authz check |
| `descope_project` | Read project config | Useful for admin dashboard |
| `descope_project_export` | Full project snapshot | Useful for backup/migration |
| `descope_password_settings` | Read password policy | Needed if exposing settings UI |

---

## 5. RBAC/ReBAC Current State

### RBAC (Role-Based Access Control)
- **Defined in TF:** 4 roles (owner, admin, member, viewer) with 12 permissions
- **Runtime enforcement:** JWT claims `tenants[dct].roles` and `tenants[dct].permissions` checked via `require_role()` / `require_permission()` dependencies
- **API gaps:** No role/permission CRUD API, no role hierarchy API, no dynamic role management
- **UI:** Roles page shows current user's roles; admin can assign/remove roles on users

### ReBAC (Relationship-Based Access Control) — FGA
- **TF resource exists:** `descope_fga_schema` for defining object types and relations
- **TF data source exists:** `descope_fga_check` for authorization checks
- **SaaS starter:** ZERO FGA/ReBAC implementation — no schema, no relations, no checks, no API, no UI
- **GitHub issues:** #38 (Document-Level Authorization with FGA) and #39 (RBAC Enhancement) are open but unworked

---

## Session Setup

**User:** James — authentication and identity SME, new to Descope specifically, deep OIDC/OAuth2 knowledge
**Priority order:**
1. Finish Descope-specific features (review fix chains, open PRs)
2. Expose TF-only resources as SaaS starter APIs (especially RBAC CRUD, ReBAC/FGA)
3. Design canonical user/RBAC/ReBAC model
4. Plan federation with Ory and Identity Server
5. Abstract into configurable multi-provider backends

**Key constraint:** Some resources exist only in Terraform — need to decide which get runtime APIs vs. remain infra-only.

---

## Technique Execution: Phase 1 — Question Storming

### Key Questions Generated (48 total)

#### Viability & Direction
- Q1: Is this idea even viable or are we wasting time?
- Q2: What order of execution aligns with creating a simulacra of common enterprise patterns?
- Q3: Is there a way to create a reference architecture using the auth project tools, then refactor to a generic multi-provider implementation?
- Q6: What exactly would make it not viable — abstraction cost, provider API surface mismatch, or maintenance burden?
- Q7: Are we abstracting at the wrong layer — API/UI, Terraform/IaC, or identity model/claims?
- Q10: Is the real value in the abstraction itself or in a reference implementation against Descope that's structured well enough that adding Ory later is straightforward?
- Q17: Are we building an identity platform or an identity provider comparison framework?

#### TF Resource Exposure Boundary
- Q1-seed: Which TF resources represent deploy-time config that should never have a runtime API?
- Q2-seed: If a tenant admin can assign roles but can't create role definitions — bug or feature?
- Q3-seed: What's minimum viable ReBAC that demonstrates the concept without a full authz engine?
- Q13: Which enterprise patterns require runtime APIs vs. just TF configuration?

#### Architecture & Coupling
- Q22: Is the reference architecture the combination of all three repos — py-identity-model (protocol), TF provider (IaC), SaaS starter (application)?
- Q23: What are the natural seams where Descope-specific code is already isolated vs. entangled?
- Q24: Is DescopeManagementClient already a natural abstraction boundary — interface in front, swap implementations?
- Q25: Frontend uses react-oidc-context (vendor-agnostic) — is the real refactor backend-only?
- Q26: Is the Descope coupling actually just the Management API calls (user CRUD, role assignment, tenant ops)?
- Q27: Does "refactor to generic" mean defining an IdentityManagementProvider interface with methods like list_users(), assign_role(), create_tenant(), check_fga_relation()?

#### RBAC/ReBAC Specific
- Q37: Does "expose RBAC correctly" mean role/permission definition CRUD, or fixing existing assignment/enforcement?
- Q38: For ReBAC/FGA — do we need schema management, relation tuple CRUD, and authz check APIs, or a subset?
- Q39: Does FGA call Descope Management API directly or go through py-identity-model?
- Q40: What's the demo scenario for ReBAC — document-level access, org hierarchy, or something else?
- Q41: Is the right split RBAC for "who can access this page/endpoint" and ReBAC for "who can access this specific resource"?

#### Sequencing & Execution
- Q28: Is the order (a) build all Descope features, (b) document patterns as reference architecture, (c) extract interface, (d) add Ory as second provider?
- Q29: Is py-identity-model OIDC certification independent or a prerequisite for credible reference architecture?
- Q34: Can review fix chain run in parallel with new SaaS starter feature work?
- Q47: Is execution: triage → review fixes → RBAC CRUD → ReBAC/FGA → SSO → document → extract interface → second provider?
- Q48: Or can steps 3-5 be done with the interface in mind from the start — building IdentityProvider.list_roles() instead of Descope-specific endpoints?

#### Generic/Multi-Provider Design
- Q43: Do Descope tenants map to Ory organizations the same way, or do we need a translation layer?
- Q44: Does "generic" mean identical API contract regardless of provider, or configurable with provider-specific capabilities?
- Q45: Should the generic version have capability discovery — "this backend supports FGA" vs "this backend only supports RBAC"?
- Q46: What's the second provider that validates the abstraction — Ory, Keycloak, or Identity Server?

#### Audience & Enterprise Credibility
- Q11: What are the top 5 enterprise identity patterns every Fortune 500 deals with?
- Q15: What's the minimum capability set where a solutions architect says "this is how I'd build it"?
- Q31: Who is the audience — portfolio/expertise, team adopting Descope, or open-source identity community?

### Creative Breakthroughs
1. **The coupling might be narrow** — frontend already vendor-agnostic via react-oidc-context, backend token validation already vendor-agnostic via py-identity-model. Descope coupling may be limited to Management API calls only.
2. **Reference architecture first, abstraction second** — build it right for Descope, document the patterns, then extract the interface. Don't design the abstraction up front.
3. **The key fork (Q47 vs Q48)** — build Descope-specific then refactor, OR build with the interface from day one. This is the critical architecture decision.

### Critical Risk Identified: AI-Generated Code Needs Conformance Verification

The 16 open feature PRs in py-identity-model were AI-generated via Ralph loops. They pass unit tests and CI, but the OIDC conformance suite deliberately sends malformed responses (wrong issuer, bad signatures, missing claims, key rotation) to verify correct *rejection* behavior. Unit tests alone don't prove spec compliance.

**Decision: Build the OIDC conformance test harness as early as possible in the py-identity-model track — don't wait until all review fixes are done.**

Revised py-identity-model sequencing:
1. Continue review fix chain (T101-T116) — these fix known code issues
2. **In parallel**: Build conformance test harness (conformance/ directory, thin FastAPI RP, Docker Compose with OpenID conformance suite)
3. Run harness against *already-merged* features first (discovery, JWKS, token validation) — verify baseline
4. As review-fixed PRs merge, run harness against new features (auth code, introspection, etc.)
5. Fix any conformance failures the harness reveals (these are the bugs AI-generated tests won't catch)
6. Target Basic RP + Config RP certification first

---

## Technique Execution: Phase 2 — Morphological Analysis

### Key Architectural Principle Established

**Platform teams use TF for infrastructure-level integration (OIDC/OAuth2 system connections). Runtime APIs handle user-facing operations (people, roles, relationships, access).**

### Dimension 1: TF (Deploy) vs. Runtime (API) Split

| Capability | Platform Team (TF) | Runtime (Admin API/UI) |
|---|---|---|
| Permission definitions | Seed defaults | CRUD + list all |
| Role definitions | Seed defaults | CRUD + manage permission mappings |
| Role assignment | — | Assign/remove/list per user per tenant |
| FGA schema | Seed initial schema | Update schema, version it |
| FGA relation tuples | — | Create/delete/list relations |
| FGA authz checks | — | Check endpoint (middleware + API) |
| SSO config | Platform-wide defaults | Per-tenant OIDC/SAML config |
| SSO applications | Register platform apps | Dynamic registration if needed |
| Tenant CRUD | Seed initial tenants | Full CRUD + settings + hierarchy |
| Access keys | Seed service accounts | Full lifecycle per tenant |
| Password settings | Platform-wide policy | Per-tenant overrides |
| Lists (IP allow/deny) | Platform-wide lists | Per-tenant lists |
| User management | — | Full CRUD + invite + activate/deactivate |
| Applications (inbound/outbound/3P) | Register integrations | — |
| Management keys | Provision for services | — |

### Dimension 2: Provider Abstraction Tiers

Using Descope data model (docs/descope-data-model.md) as ground truth, mapped against Ory and IdentityServer:

**Tier 1 — Strong abstraction candidates (similar shape across providers):**
- User CRUD — everyone has a user store
- ReBAC / authorization checks — `check(subject, relation, object)` works across Descope FGA, Ory Keto, Zanzibar-style
- SSO/Federation — everyone supports OIDC/SAML, different config but same concept
- M2M/Access Keys — maps to OAuth2 Client Credentials everywhere
- Session management — tokens are tokens

**Tier 2 — Requires translation layer:**
- RBAC roles/permissions — Descope has first-class objects, Ory models as Keto relations, IdentityServer uses .NET claims
- Password policy — exists everywhere, completely different config shapes

**Tier 3 — Provider-specific, don't abstract:**
- Multi-tenancy — fundamentally different (Descope tenants, Ory has nothing native, IdentityServer uses realms/schemes)
- Flows/auth orchestration — completely proprietary
- Connectors — completely proprietary
- JWT claim structure — each provider puts roles/tenants in different claim shapes

### Key Insight: Narrow Coupling Surface

- Frontend already vendor-agnostic via `react-oidc-context`
- Backend token validation already vendor-agnostic via `py-identity-model`
- Descope coupling is concentrated in `DescopeManagementClient` (Management API calls only)
- This means the refactor surface is narrow: extract interface from `DescopeManagementClient`, add provider implementations

### Agreed Direction: Iterative Discovery

1. Build everything for Descope — complete RBAC CRUD, ReBAC/FGA, SSO APIs
2. While building, notice the seams — document where Descope-specific vs provider-agnostic
3. After Descope is complete, domain modeling exercise — map each concept to Ory/IdentityServer
4. Extract only Tier 1 abstractions first
5. Try Ory as second provider — Keto for ReBAC (strong match), Kratos for users (reasonable)
6. If Tier 2/3 breaks, decide: translation layer, capability flags, or stays provider-specific

**Multi-tenancy is the hardest abstraction. ReBAC is the easiest and most valuable.**

---

## Technique Execution: Phase 3 — Decision Tree Mapping

### Complete Execution Plan

#### Parallel Tracks (all run concurrently)

**Track A: py-identity-model (certification path)**
```
A1. Continue review fix chain T101-T116 via Ralph loops
A2. IN PARALLEL: Build OIDC conformance test harness
    ├── conformance/ directory in py-identity-model
    ├── Thin FastAPI RP app using py-identity-model
    ├── Docker Compose extending OpenID conformance suite
    └── Automation via suite's REST API (run-test-plan.py pattern)
A3. Run harness against ALREADY-MERGED features (discovery, JWKS, token validation)
    └── Verify baseline — catch bugs AI-generated tests missed
A4. As review-fixed PRs merge → run harness against new features
    ├── Auth code + PKCE (PR #225)
    ├── Token validation enhancements (PR #223)
    ├── Introspection (PR #226), Revocation (PR #227)
    └── Each merge = run conformance tests = fix failures
A5. Close conformance gaps identified in certification analysis:
    ├── UserInfo sub mismatch validation
    ├── Missing kid handling (single vs multiple JWKS keys)
    ├── JWKS cache TTL / forced refresh (issue #219)
    └── Nonce validation end-to-end
A6. Target Basic RP + Config RP certification
A7. Expand: Implicit RP, Hybrid RP, then FAPI 2.0
```

**Track B: descope-saas-starter (Descope feature completion)**
```
B0. Triage & cleanup
    ├── Close ~10 stale issues (#5, #10, #28, #30-#34, #46, #48-#50)
    ├── Merge/close open PRs (#99, #96-#98)
    └── Update sprint plan & task queue

B1. Wave 1 — RBAC CRUD (foundation)
    ├── GET/POST/PUT/DELETE /api/roles — role definition management
    ├── GET/POST/PUT/DELETE /api/permissions — permission definition management
    ├── Role-permission mapping management
    ├── TF seeds defaults, runtime API manages lifecycle
    └── UI: Admin role/permission management page

B2. Wave 2 — ReBAC/FGA (highest abstraction value)
    ├── GET/PUT /api/fga/schema — view/update FGA schema
    ├── POST/DELETE/GET /api/fga/relations — relation tuple CRUD
    ├── POST /api/fga/check — authorization check endpoint
    ├── FGA middleware integration (check relations in request pipeline)
    ├── Demo scenario: document-level access control
    └── UI: Relationship viewer + authorization test panel

B3. Wave 3 — SSO Configuration (federation story)
    ├── GET/PUT/DELETE /api/tenants/{id}/sso — per-tenant SSO config
    ├── OIDC and SAML configuration support
    ├── SSO domain routing
    └── UI: Tenant admin SSO configuration page

B4. Wave 4 — Tenant Enhancement
    ├── PUT /api/tenants/{id} — update name/settings
    ├── DELETE /api/tenants/{id}
    ├── Self-provisioning domain management
    └── Default role management per tenant

B5. Wave 5 — Access Key Enhancement + Lists
    ├── PATCH /api/keys/{id} — update key
    ├── Permitted IP management, custom claims on keys
    └── GET/POST/DELETE /api/lists — IP/text allow-deny lists

B6. Wave 6 — Password Settings + Polish
    ├── GET/PUT /api/password-policy
    └── Per-tenant overrides + admin UI
```

**Track C: terraform-provider-descope (maintenance)**
```
C1. Merge PR #108 (Registry publishing)
C2. Close issue #22 after registry publish
C3. Address issue #109 (snake_case naming) if desired
C4. Ongoing upstream sync as needed
```

**Track D: Planning & Documentation (continuous)**
```
D1. Triage: close stale SaaS starter issues
D2. Add untracked py-identity-model issues to task queue (#242, #244-#246, #264)
D3. Update sprint plan (stale since 2026-03-24)
D4. Link T101-T116 to GitHub issues #240, #241
D5. After each wave completes, update sprint plan and task queue
```

#### Sequential Phase: Reference Architecture → Abstraction

```
After Track B completes (all Descope features built):

R1. Document Reference Architecture
    ├── Three-repo pattern: protocol lib / IaC / application
    ├── TF seeds → Runtime API manages → UI exposes pattern
    ├── RBAC lifecycle: define → assign → enforce
    ├── ReBAC lifecycle: schema → relations → runtime checks
    ├── SSO lifecycle: platform defaults → tenant self-service
    └── Map DescopeManagementClient methods to abstract operations

R2. Domain Modeling Exercise
    ├── Map each Descope concept to Ory and IdentityServer equivalents
    ├── Classify as Tier 1 (abstract) / Tier 2 (translate) / Tier 3 (provider-specific)
    ├── Identify capability gaps per provider
    └── Design IdentityProvider interface from working Descope implementation

R3. Extract Provider Interface (iterative)
    ├── Define interface from DescopeManagementClient seams
    ├── Tier 1 first: user CRUD, ReBAC checks, SSO config, access keys
    ├── Add capability discovery: provider.supports("fga"), provider.supports("rbac")
    └── Descope becomes first implementation of the interface

R4. Second Provider: Ory
    ├── Keto → ReBAC (strong match, validate first)
    ├── Kratos → User management
    ├── Hydra → OAuth2/OIDC protocol layer
    └── Discover where abstraction breaks → translate, flag, or skip

R5. Viability Check
    ├── If Ory works: proceed to Identity Server as third provider
    └── If Ory breaks: document why, keep Descope-specific, value is in reference arch
```

### Critical Path Summary

```
TODAY → Triage/Cleanup (1-2 days)
     → Track A (py-identity-model): review fixes + conformance harness (parallel, weeks)
     → Track B Wave 1 (RBAC CRUD) → Wave 2 (ReBAC/FGA) → Wave 3 (SSO) → Waves 4-6
     → Document Reference Architecture
     → Domain Modeling Exercise
     → Extract Interface → Try Ory → Viability Decision
```

### Key Decisions Made
1. **Build Descope-specific first, abstract iteratively** — no big upfront design
2. **Conformance test harness is urgent** — AI-generated code must be validated against spec
3. **All tracks run in parallel** — py-identity-model, SaaS starter, TF provider, planning
4. **ReBAC is the highest-value abstraction target** — Descope FGA ↔ Ory Keto maps cleanly
5. **Multi-tenancy may never abstract** — fundamentally different across providers
6. **Viability is discovered, not assumed** — if abstraction breaks on Ory, that's a valid outcome

---

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Descope Feature Completion (Immediate — Track B)**
- RBAC CRUD APIs (role/permission definitions — currently TF-only)
- ReBAC/FGA APIs (schema, relation tuples, authorization checks — zero code exists)
- SSO configuration APIs (per-tenant OIDC/SAML — zero code exists)
- Tenant enhancement (update, delete, self-provisioning domains)
- Access key enhancement (update, permitted IPs, custom claims)
- Password settings + Lists APIs
- *All follow the same model: TF seeds defaults, runtime API manages lifecycle*

**Theme 2: OIDC Conformance & AI Code Verification (Urgent — Track A)**
- Build conformance test harness (thin FastAPI RP + OpenID conformance suite)
- Validate already-merged features against spec adversarial tests
- Validate AI-generated features as review-fixed PRs merge
- Close specific conformance gaps: missing `kid` handling, UserInfo `sub` mismatch, JWKS cache TTL, nonce validation
- Target Basic RP + Config RP certification
- *Unit tests passing ≠ spec compliance. The harness is the quality gate.*

**Theme 3: Architecture & Abstraction Strategy (Deferred — Phases R1-R5)**
- Narrow coupling surface: Descope-specific code lives only in `DescopeManagementClient`
- Frontend already vendor-agnostic (`react-oidc-context`), backend token validation already vendor-agnostic (`py-identity-model`)
- Three-tier abstraction model: Tier 1 (abstract), Tier 2 (translate), Tier 3 (provider-specific)
- `IdentityProvider` interface extracted from working code, not designed up front
- Capability discovery: `provider.supports("fga")`
- *Build for Descope, notice seams, extract iteratively. Viability is discovered.*

**Theme 4: Domain Modeling & Provider Mapping (Future — Phase R2)**
- Descope-to-OAuth2.0 mapping exists — needs equivalent for Ory and IdentityServer
- ReBAC: strongest abstraction candidate (Descope FGA ↔ Ory Keto ↔ Zanzibar)
- Multi-tenancy: hardest (Descope tenants ≠ Ory orgs ≠ IdentityServer realms) — may not abstract
- RBAC: requires translation layer (first-class objects vs relation tuples vs .NET claims)
- *Iterative domain modeling after Descope is complete, informed by real implementation*

**Theme 5: Planning Hygiene (Immediate — Track D)**
- ~10 stale SaaS starter issues to close
- 5 untracked py-identity-model issues to add to task queue
- Sprint plan stale since 2026-03-24
- T101-T116 issue column needs GitHub issue links
- TF provider registry publishing (PR #108)

### Breakthrough Concepts

1. **The coupling is narrower than expected** — the refactor to multi-provider may be smaller than feared. `DescopeManagementClient` is the only Descope-specific surface.
2. **"Reference architecture first, abstraction second"** — build a complete, credible Descope implementation. Document the patterns. Then extract the interface. If Ory doesn't fit, the reference architecture alone is valuable.
3. **Platform (TF) vs Runtime (API) is the real architectural boundary** — platform teams configure OIDC integrations via TF; user/role/relationship operations are always runtime.
4. **Conformance harness as AI code quality gate** — the OpenID conformance suite's adversarial tests catch exactly the edge cases AI-generated unit tests miss.

### Prioritized Action Plans

**Priority 1: Planning Cleanup (this week)**
- Close stale SaaS starter issues (#5, #10, #28, #30-#34, #46, #48-#50)
- Add untracked py-identity-model issues (#242, #244-#246, #264) to task queue
- Update sprint plan (stale since 2026-03-24)
- Link T101-T116 to GitHub issues #240, #241
- Merge/close SaaS starter PRs #96-#99

**Priority 2: OIDC Conformance Harness (start immediately, parallel with review fixes)**
- Create `conformance/` directory in py-identity-model
- Build thin FastAPI RP app using py-identity-model
- Docker Compose extending OpenID conformance suite
- Run against already-merged features first (discovery, JWKS, token validation)
- Continue review fix chain T101-T116 via Ralph loops in parallel

**Priority 3: SaaS Starter Wave 1 — RBAC CRUD (next sprint)**
- GET/POST/PUT/DELETE /api/roles — role definition management
- GET/POST/PUT/DELETE /api/permissions — permission definition management
- Role-permission mapping management
- Admin role/permission management UI page

**Priority 4: SaaS Starter Wave 2 — ReBAC/FGA (after Wave 1)**
- FGA schema, relation tuple CRUD, authorization check API
- FGA middleware integration
- Document-level access control demo scenario
- Relationship viewer + authorization test panel UI

**Priority 5: SaaS Starter Wave 3 — SSO (after Wave 2)**
- Per-tenant SSO configuration (OIDC/SAML)
- SSO domain routing
- Tenant admin SSO config UI

---

## Session Summary and Insights

### Key Achievements

- **48 strategic questions** surfaced through Question Storming — defining the problem space before solving it
- **Multi-dimensional analysis** via Morphological Analysis — TF vs Runtime split, provider abstraction tiers, domain concept mapping across Descope/Ory/IdentityServer
- **Complete execution plan** with 4 parallel tracks and 6 sequential waves via Decision Tree Mapping
- **6 key architectural decisions** made with clear rationale
- **Critical risk identified and mitigated** — conformance test harness prioritized to validate AI-generated code

### Session Reflections

This session started with a viability question ("is this even worth it?") and arrived at a pragmatic answer: build the reference architecture for Descope first, discover if abstraction is viable by trying it, and accept that the reference architecture alone has value even if multi-provider doesn't pan out. The iterative approach avoids both over-engineering and under-planning.

The most valuable discovery was that the Descope coupling surface is narrower than expected — concentrated in `DescopeManagementClient` — making the eventual abstraction smaller than feared. Combined with the TF-seeds-defaults/runtime-manages-lifecycle pattern, every new feature has a clear design template.

### Techniques Used

1. **Question Storming** — 48 questions across 6 categories, 3 breakthroughs
2. **Morphological Analysis** — 4-dimension matrix (TF/Runtime split, provider tiers, domain mapping, abstraction surface)
3. **Decision Tree Mapping** — 4 parallel tracks, 6 waves, sequential abstraction phases, critical path identified

### Facilitator Notes

James demonstrated deep identity domain expertise throughout — particularly in the clear Platform-vs-Runtime principle and the pragmatic "iterative discovery" approach to abstraction. The decision to prioritize the OIDC conformance harness reflects mature engineering judgment: trusting but verifying AI-generated code against the actual specification's adversarial test suite.
