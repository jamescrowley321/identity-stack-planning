# Auth Workspace Sprint Plan

## Overview

This sprint plan prioritizes work across three repos. The **terraform-provider-descope** remains the primary project for infrastructure, with **py-identity-model** elevated to active sprint planning now that its issue backlog is comprehensive and spec-referenced.

**Execution method:** Ralph loops — one task at a time through: analysis -> plan -> execute -> test -> code review.

**py-identity-model requirement:** Every feature task MUST include integration tests (in `src/tests/integration/`) and usage examples (in `examples/`). Unit tests alone are not sufficient.

---

## Current Status (as of 2026-03-24)

### terraform-provider-descope
- **Done:** T1-T5, T9-T13, T29-T30 (all resources except blocked, CI tasks)
- **Blocked:** T6 (SSO app — enterprise license), T7 (JWT — blocked), T8 (flow — Go SDK bugs), T31 (registry — manual setup needed)

### descope-saas-starter
- **Done:** T14-T17, T19, T26 (session, tenants, RBAC, attrs, access keys, admin portal), T64-T65, T67 (security headers, rate limiting, structured logging)
- **Blocked:** T18, T20-T25 (cascading blocks from TF provider)
- **Pending:** T27-T28, T66, T68-T79, T80-T84 (UI framework, features, hardening)

### py-identity-model
- **Done:** T32-T36 (Sprint A complete, Sprint B base classes + auth code done)
- **In progress:** T37 (#16 Introspection — Sprint C)
- **Pending:** T38-T63 (remaining protocol features, FAPI, examples)

---

## Priority Tiers

### Tier 1: Stabilize Terraform Provider (DONE)

| Task | Status | Issue | Description |
|------|--------|-------|-------------|
| T1 | done | [#74](https://github.com/jamescrowley321/terraform-provider-descope/issues/74) | Fix flaky TestProjectAuthorization |
| T2 | done | [#73](https://github.com/jamescrowley321/terraform-provider-descope/issues/73) | Fix flaky TestProjectSettings |
| T3 | done | [#72](https://github.com/jamescrowley321/terraform-provider-descope/issues/72) | Fix flaky TestDescoperTagRoles |

### Tier 2: Core Terraform Resources (Critical Path)

| Task | Status | Issue | Description | Complexity | Enables |
|------|--------|-------|-------------|------------|---------|
| T4 | done | [#18](https://github.com/jamescrowley321/terraform-provider-descope/issues/18) | descope_permission and descope_role | Large | SaaS Starter RBAC |
| T5 | done | [#16](https://github.com/jamescrowley321/terraform-provider-descope/issues/16) | descope_sso resource | Large | SaaS Starter SSO |
| T6 | blocked | [#8](https://github.com/jamescrowley321/terraform-provider-descope/issues/8) | descope_sso_application — **requires enterprise license (E074106)** | Large | SaaS Starter SSO |
| T7 | blocked | [#17](https://github.com/jamescrowley321/terraform-provider-descope/issues/17) | descope_jwt resource | Medium | SaaS Starter JWT |
| T8 | blocked | [#19](https://github.com/jamescrowley321/terraform-provider-descope/issues/19) | descope_flow — **Go SDK bugs, PR #81 closed** | Medium | SaaS Starter Flows |
| T9 | done | [#15](https://github.com/jamescrowley321/terraform-provider-descope/issues/15) | descope_password_settings | Medium | Auth hardening |
| T10 | done | [#13](https://github.com/jamescrowley321/terraform-provider-descope/issues/13) | descope_outbound_application | Medium | App integrations |
| T11 | done | [#12](https://github.com/jamescrowley321/terraform-provider-descope/issues/12) | descope_third_party_application | Medium | App integrations |
| T12 | done | [#11](https://github.com/jamescrowley321/terraform-provider-descope/issues/11) | descope_fga resources (Fine-Grained Authorization) | Large | Future ReBAC |
| T13 | done | [#20](https://github.com/jamescrowley321/terraform-provider-descope/issues/20) | descope_project_export data source | Medium | Environment replication |

### Tier 3: SaaS Starter Phases (Test Provider Features)

| Task | Status | Issue | Description | Complexity | Depends On |
|------|--------|-------|-------------|------------|------------|
| T14 | done | [#3](https://github.com/jamescrowley321/descope-saas-starter/issues/3) | Phase 1c: Session Management | Medium | — |
| T15 | done | [#4](https://github.com/jamescrowley321/descope-saas-starter/issues/4) | Phase 2a: Tenant Management | Medium | T14 |
| T16 | done | [#5](https://github.com/jamescrowley321/descope-saas-starter/issues/5) | Phase 2b: Roles & Permissions (RBAC) | Medium | T4, T15 |
| T17 | done | [#6](https://github.com/jamescrowley321/descope-saas-starter/issues/6) | Phase 2c: Custom Attributes | Medium | T15, T16 |
| T18 | blocked | [#7](https://github.com/jamescrowley321/descope-saas-starter/issues/7) | Phase 3a: SSO Configuration | Large | T5, T6, T16 |
| T19 | done | [#10](https://github.com/jamescrowley321/descope-saas-starter/issues/10) | Phase 4a: Access Key Management | Medium | T16 |
| T20 | blocked | [#11](https://github.com/jamescrowley321/descope-saas-starter/issues/11) | Phase 4b: JWT Templates & Custom Claims | Medium | T7, T17, T19 |
| T21 | blocked | [#8](https://github.com/jamescrowley321/descope-saas-starter/issues/8) | Phase 3b: Step-Up Authentication | Medium | T18 |
| T22 | blocked | [#9](https://github.com/jamescrowley321/descope-saas-starter/issues/9) | Phase 3c: MFA Enforcement | Medium | T18 |
| T23 | blocked | [#12](https://github.com/jamescrowley321/descope-saas-starter/issues/12) | Phase 5a: Custom Flows | Large | T8 |
| T24 | blocked | [#13](https://github.com/jamescrowley321/descope-saas-starter/issues/13) | Phase 5b: Connector Integrations | Large | T23 |
| T25 | blocked | [#15](https://github.com/jamescrowley321/descope-saas-starter/issues/15) | Phase 5d: OIDC/SAML Application Registration | Large | T6 |
| T26 | done | [#14](https://github.com/jamescrowley321/descope-saas-starter/issues/14) | Phase 5c: Admin Portal & User Management | Large | T16 |
| T27 | pending | [#16](https://github.com/jamescrowley321/descope-saas-starter/issues/16) | Phase 6: Full Terraform Configuration | Large | All TF resources |
| T28 | pending | [#17](https://github.com/jamescrowley321/descope-saas-starter/issues/17) | Phase 7: Documentation & Developer Experience | Medium | T27 |

### Tier 4: Terraform CI/Infrastructure

| Task | Status | Issue | Description | Complexity | Depends On |
|------|--------|-------|-------------|------------|------------|
| T29 | done | [#26](https://github.com/jamescrowley321/terraform-provider-descope/issues/26) | Resolve pre-existing SonarCloud findings | Medium | After Tier 1 |
| T30 | done | [#24](https://github.com/jamescrowley321/terraform-provider-descope/issues/24) | Add Snyk CLI workflow job | Small | — |
| T31 | blocked | [#22](https://github.com/jamescrowley321/terraform-provider-descope/issues/22) | Publish fork to Terraform Registry — **requires manual registry signup, GPG key, secrets** | Medium | After several resources shipped |

### Tier 5: py-identity-model (Sprint-Based)

Organized into sprints by dependency order. Features that directly support the SaaS starter are marked with **[SaaS]**. Features needed by the Descope example are marked with **[Descope]**.

#### Sprint A: Foundation & SaaS Starter Immediate Value (DONE)

| Task | Issue | Description | Status |
|------|-------|-------------|--------|
| T33 | [#117](https://github.com/jamescrowley321/py-identity-model/issues/117) | DI for HTTP Client | done |
| T34 | [#93](https://github.com/jamescrowley321/py-identity-model/issues/93) | Enhanced Token Validation | done |
| T55 | [#219](https://github.com/jamescrowley321/py-identity-model/issues/219) | Discovery Cache with TTL | pending |
| T46 | [#109](https://github.com/jamescrowley321/py-identity-model/issues/109) | DiscoveryPolicy & Architecture | pending |

#### Sprint B: Base Classes & Core Protocol Endpoints (PARTIAL)

| Task | Issue | Description | Status | Depends On |
|------|-------|-------------|--------|------------|
| T35 | [#88](https://github.com/jamescrowley321/py-identity-model/issues/88) | Base Request/Response Classes | done | — |
| T36 | [#90](https://github.com/jamescrowley321/py-identity-model/issues/90) | Auth Code Grant + PKCE | done | T35 |
| T39 | [#19](https://github.com/jamescrowley321/py-identity-model/issues/19) | Refresh Token Grant **[SaaS]** | pending | T35 |
| T38 | [#17](https://github.com/jamescrowley321/py-identity-model/issues/17) | Token Revocation **[SaaS]** | pending | T35 |
| T56 | [#214](https://github.com/jamescrowley321/py-identity-model/issues/214) | RP-Initiated Logout **[SaaS]** | pending | T35 |

#### Sprint C: Protocol Endpoints & Client Auth (IN PROGRESS)

| Task | Issue | Description | Status | Depends On |
|------|-------|-------------|--------|------------|
| T37 | [#16](https://github.com/jamescrowley321/py-identity-model/issues/16) | Token Introspection | in_progress | T35 |
| T57 | [#213](https://github.com/jamescrowley321/py-identity-model/issues/213) | JWT Client Authentication (private_key_jwt) | pending | T35 |
| T58 | [#221](https://github.com/jamescrowley321/py-identity-model/issues/221) | AS Issuer Identification (RFC 9207) | pending | T32 (#116) |

#### Sprint D: Advanced Grants

Independent grant types that expand protocol coverage. These can be implemented in any order.

| Task | Issue | Description | Complexity | Depends On |
|------|-------|-------------|------------|------------|
| T43 | [#91](https://github.com/jamescrowley321/py-identity-model/issues/91) | Device Authorization Grant (RFC 8628) | Large | T35 |
| T44 | [#92](https://github.com/jamescrowley321/py-identity-model/issues/92) | Token Exchange (RFC 8693) | Large | T35 |
| T59 | [#217](https://github.com/jamescrowley321/py-identity-model/issues/217) | CIBA (Backchannel Authentication) | Large | T35 |
| T60 | [#220](https://github.com/jamescrowley321/py-identity-model/issues/220) | Rich Authorization Requests (RFC 9396) | Medium | T35 |
| T61 | [#216](https://github.com/jamescrowley321/py-identity-model/issues/216) | Dynamic Client Registration (RFC 7591) | Medium | T35 |

#### Sprint E: Modern Security (FAPI Track)

These build toward FAPI 2.0 compliance. Each is individually useful but together they form the FAPI security profile.

| Task | Issue | Description | Complexity | Depends On |
|------|-------|-------------|------------|------------|
| T40 | [#94](https://github.com/jamescrowley321/py-identity-model/issues/94) | DPoP (RFC 9449) | Large | T35 |
| T41 | [#95](https://github.com/jamescrowley321/py-identity-model/issues/95) | PAR (RFC 9126) | Large | T35 |
| T62 | [#215](https://github.com/jamescrowley321/py-identity-model/issues/215) | mTLS Client Auth (RFC 8705) | Large | T35 |
| T42 | [#96](https://github.com/jamescrowley321/py-identity-model/issues/96) | JAR (RFC 9101) | Large | T35, T41 |
| T63 | [#218](https://github.com/jamescrowley321/py-identity-model/issues/218) | JARM (Authorization Response Mode) | Medium | T32 (#116) |
| T45 | [#97](https://github.com/jamescrowley321/py-identity-model/issues/97) | FAPI 2.0 Compliance | Large | T40, T41, T42, T57, T62 |

#### Sprint F: Examples, Docs & Benchmarks

Cross-cutting work best done after core features stabilize.

| Task | Issue | Description | Complexity | Depends On |
|------|-------|-------------|------------|------------|
| T47 | [#112](https://github.com/jamescrowley321/py-identity-model/issues/112) | Performance Benchmarks | Medium | Sprint A complete |
| T48 | [#83](https://github.com/jamescrowley321/py-identity-model/issues/83) | Comprehensive API Documentation | Large | Sprint B+ complete |
| T50 | [#38](https://github.com/jamescrowley321/py-identity-model/issues/38) | Auth0 Example | Small | T36 (auth code + PKCE) |
| T49 | [#39](https://github.com/jamescrowley321/py-identity-model/issues/39) | Okta Example | Small | T36 |
| T53 | [#35](https://github.com/jamescrowley321/py-identity-model/issues/35) | Azure AD Example | Small | T36 |
| T52 | [#36](https://github.com/jamescrowley321/py-identity-model/issues/36) | Google Example | Small | T36 |
| T51 | [#37](https://github.com/jamescrowley321/py-identity-model/issues/37) | Cognito Example | Small | T36 |
| T54 | [#33](https://github.com/jamescrowley321/py-identity-model/issues/33) | Flask Middleware Example | Small | T36 |

### Tier 6: SaaS Starter — UI Framework & E2E Testing

Foundation work that should run before feature showcase phases.

#### Phase 0: shadcn/ui + Tailwind Migration

| Task | Repo | Issue | Description | Complexity | Depends On |
|------|------|-------|-------------|------------|------------|
| T80 | descope-saas-starter | [#51](https://github.com/jamescrowley321/descope-saas-starter/issues/51) | Tailwind CSS v4 + shadcn/ui foundation | Medium | — |
| T81 | descope-saas-starter | [#52](https://github.com/jamescrowley321/descope-saas-starter/issues/52) | App shell — sidebar, header, navigation, dark mode | Medium | T80 |
| T82 | descope-saas-starter | [#53](https://github.com/jamescrowley321/descope-saas-starter/issues/53) | Migrate Dashboard page (establishes pattern) | Medium | T81 |
| T83 | descope-saas-starter | [#54](https://github.com/jamescrowley321/descope-saas-starter/issues/54) | Migrate remaining pages (Members, Roles, Keys, Profile, Settings, Login) | Large | T82 |
| T84 | descope-saas-starter | [#55](https://github.com/jamescrowley321/descope-saas-starter/issues/55) | Playwright E2E tests (Python) for UI and API | Large | T81 |

### Tier 7: SaaS Starter — Descope Feature Showcase

New phases demonstrating advanced Descope capabilities. Organized by theme.

#### Phase 8: Authorization Deep Dive (RBAC + ReBAC)

| Task | Repo | Issue | Description | Complexity | Depends On |
|------|------|-------|-------------|------------|------------|
| T72 | descope-saas-starter | [#38](https://github.com/jamescrowley321/descope-saas-starter/issues/38) | Document-Level Authorization with FGA (ReBAC) | Large | T12 (TF FGA resources), T16 (RBAC) |
| T73 | descope-saas-starter | [#39](https://github.com/jamescrowley321/descope-saas-starter/issues/39) | RBAC Enhancement — Hierarchical Roles and Permission Inheritance | Medium | T16 (RBAC) |

#### Phase 9: Authentication Methods

| Task | Repo | Issue | Description | Complexity | Depends On |
|------|------|-------|-------------|------------|------------|
| T74 | descope-saas-starter | [#40](https://github.com/jamescrowley321/descope-saas-starter/issues/40) | Social Login Integration (Google, GitHub) | Medium | — |
| T75 | descope-saas-starter | [#41](https://github.com/jamescrowley321/descope-saas-starter/issues/41) | Passkey / WebAuthn Authentication | Medium | — |
| T76 | descope-saas-starter | [#42](https://github.com/jamescrowley321/descope-saas-starter/issues/42) | Magic Link Authentication for User Invitations | Medium | — |

#### Phase 10: Advanced Features

| Task | Repo | Issue | Description | Complexity | Depends On |
|------|------|-------|-------------|------------|------------|
| T77 | descope-saas-starter | [#43](https://github.com/jamescrowley321/descope-saas-starter/issues/43) | Step-Up Authentication for Sensitive Operations | Medium | T34 (py-identity-model #93 enhanced validation) |
| T78 | descope-saas-starter | [#44](https://github.com/jamescrowley321/descope-saas-starter/issues/44) | Descope Audit Trail Integration | Medium | T67 (structured logging) |
| T79 | descope-saas-starter | [#45](https://github.com/jamescrowley321/descope-saas-starter/issues/45) | JWT Template Customization Demo | Medium | — |

### Tier 9: SaaS Starter Hardening (Security, Observability, Testing)

#### Sprint G: Security Hardening (MOSTLY DONE)

| Task | Repo | Issue | Description | Complexity | Status |
|------|------|-------|-------------|------------|--------|
| T64 | descope-saas-starter | [#28](https://github.com/jamescrowley321/descope-saas-starter/issues/28) | Security headers middleware | Small | done |
| T65 | descope-saas-starter | [#29](https://github.com/jamescrowley321/descope-saas-starter/issues/29) | Rate limiting middleware | Medium | done |
| T67 | descope-saas-starter | [#30](https://github.com/jamescrowley321/descope-saas-starter/issues/30) | Structured logging with correlation IDs | Medium | done |
| T66 | descope-saas-starter | [#31](https://github.com/jamescrowley321/descope-saas-starter/issues/31) | Auth audit logging | Medium | pending |

#### Sprint H: Reliability & Testing

| Task | Repo | Issue | Description | Complexity | Depends On |
|------|------|-------|-------------|------------|------------|
| T68 | descope-saas-starter | [#32](https://github.com/jamescrowley321/descope-saas-starter/issues/32) | Enhanced health checks (Descope API, database) | Small | — |
| T69 | descope-saas-starter | [#33](https://github.com/jamescrowley321/descope-saas-starter/issues/33) | Descope API retry logic with exponential backoff | Medium | — |
| T70 | descope-saas-starter | [#34](https://github.com/jamescrowley321/descope-saas-starter/issues/34) | E2E testing framework (Playwright) | Large | T14-T17 (basic features complete) |
| T71 | descope-saas-starter | [#35](https://github.com/jamescrowley321/descope-saas-starter/issues/35) | CI/CD pipeline with automated deployment | Medium | T70 |

---

## Dependency Graph

### Terraform Provider -> SaaS Starter (existing)

```
Tier 2 (TF Resources) ──────────────> Tier 3 (SaaS Starter)

T12 (FGA) [in_progress]
T6 (SSO app) [blocked: license] ────> T18 (SSO) ──> T21 (Step-Up), T22 (MFA)
T7 (JWT) [blocked] ─────────────────> T20 (JWT Templates)
T8 (Flow) [blocked: SDK bugs] ──────> T23 (Custom Flows) ──> T24 (Connectors)
T13 (project export) [pending]
                                       T19 (Access Keys) [done]
                                       T26 (Admin Portal) [pending]

Tier 6 (SaaS Starter Hardening) — no TF deps, can run in parallel
  T64 (#28 Security Headers) ──┐
  T65 (#29 Rate Limiting) ─────┤── Sprint G (Security)
  T67 (#30 Structured Logging) ┤
  T66 (#31 Audit Logging) ─────┘──> depends on T67

  T68 (#32 Health Checks) ─────┐
  T69 (#33 Retry Logic) ───────┤── Sprint H (Reliability)
  T70 (#34 E2E Testing) ───────┤
  T71 (#35 CI/CD Pipeline) ────┘──> depends on T70
```

### py-identity-model Internal Dependencies

```
Sprint A (Foundation) — no internal deps
  T33 (#117 DI) ─────────────────┐
  T34 (#93 Token Validation) ────┤
  T55 (#219 Discovery Cache) ────┤
  T46 (#109 DiscoveryPolicy) ────┘
                                  │
Sprint B (Base + Core)            v
  T35 (#88 Base Classes) ────────────> all Sprint C/D/E tasks
       │
       ├──> T39 (#19 Refresh) ──────> SaaS Starter session lifecycle
       ├──> T38 (#17 Revocation) ───> SaaS Starter logout
       └──> T56 (#214 Logout) ─────> SaaS Starter logout

Sprint C (Auth Flows)
  T36 (#90 Auth Code + PKCE) ───────> all provider examples (Sprint F)
  T57 (#213 JWT Client Auth) ──────> T45 (FAPI 2.0)
  T37 (#16 Introspection)
  T58 (#221 Issuer ID)

Sprint D (Advanced Grants) — all depend on T35, independent of each other
  T43 (#91 Device Auth)
  T44 (#92 Token Exchange)
  T59 (#217 CIBA)
  T60 (#220 RAR)
  T61 (#216 Dynamic Registration)

Sprint E (FAPI Track)
  T40 (#94 DPoP) ───────────────┐
  T41 (#95 PAR) ────────────────┤
  T62 (#215 mTLS) ─────────────┼──> T45 (#97 FAPI 2.0)
  T42 (#96 JAR, needs T41) ────┤
  T57 (#213 JWT Client Auth) ──┘
  T63 (#218 JARM)
```

### Cross-Repo: py-identity-model -> SaaS Starter

```
py-identity-model                      SaaS Starter impact
─────────────────                      ───────────────────
T34 (#93 Token Validation) ──────────> Step-up auth, custom claims, access keys
T55 (#219 Discovery Cache) ──────────> Production reliability
T33 (#117 DI) ───────────────────────> Better FastAPI middleware
T39 (#19 Refresh) ───────────────────> Session refresh without re-login
T38 (#17 Revocation) ────────────────> Proper logout (revoke tokens)
T56 (#214 Logout) ───────────────────> End IdP session on sign-out
T36 (#90 Auth Code + PKCE) ─────────> Server-side auth flows (future)
```

---

## Recommended Execution Order

### Immediate (parallel tracks)

| Track | Tasks | Notes |
|-------|-------|-------|
| **py-identity-model** | T37 (introspection, in progress) -> T38 (revocation) -> T39 (refresh) | Sprint C in progress |
| **SaaS Starter UI** | T80 -> T81 -> T82 -> T83 | shadcn/ui migration — no blockers, high visual impact |
| **SaaS Starter E2E** | T84 (Playwright Python) | Can start after T81 (app shell provides stable selectors) |
| **SaaS Starter Hardening** | T66 (audit logging), T68 (health checks) | Remaining hardening tasks |

### Next wave

1. **py-identity-model Sprint C remaining**: T57 (JWT client auth), T58 (issuer ID), T55 (discovery cache), T46 (discovery policy)
2. **SaaS Starter features**: T72 (ReBAC/FGA), T73 (RBAC hierarchy) — after UI migration
3. **SaaS Starter auth methods**: T74 (social login), T75 (passkeys), T76 (magic links)
4. **py-identity-model Sprint D**: T38 -> T39 -> T56 (revocation, refresh, logout)

### When TF blocks resolve

- **T6 unblocked** (enterprise license): -> T18 (SSO) -> T21 (Step-Up) -> T22 (MFA) -> T25 (OIDC/SAML)
- **T7 unblocked**: -> T20 (JWT Templates)
- **T8 unblocked** (Go SDK fix): -> T23 (Custom Flows) -> T24 (Connectors)

### Later sprints (py-identity-model)

- **Sprint D**: Advanced grants (device, token exchange, CIBA, RAR, dynamic registration)
- **Sprint E**: FAPI track (DPoP, PAR, mTLS, JAR, JARM, FAPI 2.0)
- **Sprint F**: Examples and documentation (after Sprint C provides auth code flow)

---

## Key Decision Points

1. **TF Provider blocks (T6/T7/T8):** These are external dependencies. If they remain blocked, the SaaS starter work stalls at Phase 3+. Consider: filing Descope support ticket for enterprise license, contributing Go SDK fix upstream, or finding JWT resource workaround.

2. **py-identity-model Sprint A vs B priority:** Sprint A can run fully parallel with TF work since it has zero cross-repo dependencies. Sprint B (base classes) is the critical path for all new protocol features.

3. **Provider examples timing:** All provider examples (#33-#39) depend on Auth Code + PKCE (#90) from Sprint C. Don't start examples until Sprint C is complete.

4. **FAPI 2.0 is a long pole:** Requires DPoP + PAR + JAR + mTLS + JWT client auth. Only pursue after Sprints A-C are done and if financial-grade compliance is a priority.
