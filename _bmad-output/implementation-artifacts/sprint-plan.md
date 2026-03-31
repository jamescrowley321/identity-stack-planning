# Auth Workspace Sprint Plan

## Overview

This sprint plan prioritizes work across three repos. The **terraform-provider-descope** remains the primary project for infrastructure, with **py-identity-model** elevated to active sprint planning now that its issue backlog is comprehensive and spec-referenced.

**Execution method:** Ralph loops — one task at a time through: analysis -> plan -> execute -> test -> code review.

**py-identity-model requirement:** Every feature task MUST include integration tests (in `src/tests/integration/`) and usage examples (in `examples/`). Unit tests alone are not sufficient.

**identity-stack requirement:** Every feature task MUST include Playwright E2E tests (in `backend/tests/e2e/`) covering the feature's happy path and auth enforcement. Existing E2E tests MUST pass as regression. Unit tests alone are not sufficient. See PR #94 for test patterns (3-tier auth: unauthenticated, OIDC client credentials, admin session token).

---

## Current Status (as of 2026-03-31)

**Project renamed:** `descope-saas-starter` → `identity-stack` (GitHub repo, local directory, all references updated).

**Issue cleanup (2026-03-31):** Closed 34 stale/completed/superseded issues. Only PRD 5 stories (#138-#156) remain open. All old phase-based issues, multi-provider brainstorming issues (#74-#81), and completed Epic 2/3 issues (#112-#118) closed.

### terraform-provider-descope
- **Done:** T1-T5, T9-T13, T29-T31 (all resources except blocked/wontfix, CI tasks, registry published), T80 (list resource), T81 (model docs)
- **Wontfix:** T7 (JWT — dual-ownership risk with project resource), T8 (Flow — visual artifacts, SDK format bugs)
- **Blocked:** T6 (SSO app — enterprise license)
- **Review fixes:** T85-T89, T99-T100 — ALL done
- **Releases:** v1.1.0-v1.1.4 published to Terraform Registry

### identity-stack (formerly descope-saas-starter)
- **All prior work complete:** Phase 1 features, Epic 2 (RBAC Admin), Epic 3 (FGA/ReBAC), ad-hoc fixes, review fixes — all merged to main.
- **Next: Canonical Identity Domain Model (PRD 5)** — Postgres-backed identity layer beneath existing API. IdentityService seam (D21) filled with real implementations. DescopeManagementClient becomes sync adapter. 4 epics, 19 stories (issues #138-#156). Ralph prompt at `ralph-prompts/canonical-identity.md`.
- **Closed (superseded by PRD 5):** All old phase-based issues (#7-#17, #35, #42-#45), multi-provider issues (#74-#81), completed feature issues (#38-#41, #47, #112-#118).

### py-identity-model
- **Done:** T32-T47 (ALL feature tasks complete — Sprint A through Sprint F benchmarks)
- **Done:** T101-T116 (ALL review fixes complete — all 16 feature PRs #211-#237 merged to main 2026-03-30)
- **In progress:** T121 (core flow integration tests — PR #281 open, CI failing), T122 (token mgmt integration tests — review done, PR phase)
- **Done (integration chain):** T120 (node-oidc-provider fixture — PR #274 merged)
- **Pending:** T123-T128 (remaining integration tests, docs, cleanup), T48-T63 (docs, examples, advanced protocol features)

---

## Review Fix Chains (Active Work)

All three repos have completed code review on feature PRs. All review fix chains are complete.

### py-identity-model Review Fixes (COMPLETE — all PRs merged 2026-03-30)

Sequential chain — each fix task depends on the previous (PRs stack on each other). All 16 PRs merged.

| Task | Status | PR | Description |
|------|--------|----|-------------|
| T101 | done | #211 | OAuth Callback State — TypeError on None state/URL |
| T102 | done | #222 | HTTP Client DI — use-after-close, ignored params |
| T103 | done | #223 | Enhanced Token Validation — leeway dropped, empty issuer fails open |
| T104 | done | #224 | Base Request/Response — use-after-close, error leaks, CI overlap |
| T105 | done | #225 | Auth Code PKCE — param injection, empty callback success |
| T106 | done | #226 | Introspection — missing __all__ exports, no async tests |
| T107 | done | #227 | Revocation — missing __all__, dead try/except, no async tests |
| T108 | done | #228 | Refresh — no async tests, weak test assertions |
| T109 | done | #229 | DPoP — htu query/fragment violation RFC 9449, no sig verify tests |
| T110 | done | #230 | PAR — client_id double-sent, missing required field validation |
| T111 | done | #232 | JAR — extra_claims override, missing kid header |
| T112 | done | #233 | Device Auth — no async tests, missing required field validation |
| T113 | done | #234 | Token Exchange — client_id double-sent, actor_token_type validation |
| T114 | done | #235 | FAPI 2.0 — crash on failed discovery, empty code_challenge bypass |
| T115 | done | #236 | Policy Config — unenforced policy flags, no URL scheme pre-flight |
| T116 | done | #237 | Perf Benchmarks — expiring fixture, wrong benchmark layer, no assertions |

### identity-stack Review Fixes (COMPLETE)

#### Phased PRs (re-reviewed 2026-03-27)

| Task | Status | PR | Description |
|------|--------|----|-------------|
| T90 | done | #24 | Tenant Mgmt — unauth'd creation, empty mgmt key, bare except |
| T91 | done | #25 | RBAC — admin role escalation, leaked API errors |
| T92 | done | #26 | Custom Attrs — no tenant attr allowlist, silent error swallowing |
| T93 | done | #27 | Access Keys — TOCTOU, no name validation, negative expire_time |
| T94 | done | #36 | Admin Portal — cross-tenant IDOR, admin-to-owner escalation |

#### Standalone PRs

| Task | Status | PR | Description |
|------|--------|----|-------------|
| T95 | done | #82 | Security Headers — case-sensitive env check, CSP bypass via env var |

#### Cross-Cutting PRs (re-reviewed 2026-03-27)

| Task | Status | PR | Description |
|------|--------|----|-------------|
| T96 | done | #56 | Rate Limiting — proxy IP keying, middleware ordering |
| T97 | done | #57 | Structured Logging — health check info leak, stale degraded cache |
| T98 | done | #58 | Audit Logging — X-Forwarded-For spoofing, no failure audit, PII |
| T117 | done | #59 | Health Checks — SSRF via DESCOPE_BASE_URL, cache race condition |
| T118 | done | #60 | Retry Logic — httpx per retry attempt, non-idempotent retries |
| T119 | done | #61 | FGA/ReBAC — orphaned FGA relation, cross-tenant FGA bypass |

### terraform-provider-descope Review Fixes (COMPLETE)

| Task | Status | PR | Description |
|------|--------|----|-------------|
| T85 | done | #80 | SSO Application — silent no-op in Update, no oidc/saml mutual exclusivity |
| T86 | done | #86 | Third-party Application — orphaned resource on Create |
| T87 | done | #88 | Project Export — nil pointer dereference, Sensitive flag |
| T88 | done | #90 | Snyk CI — unsupported flag, unpinned npm install |
| T89 | done | #89 | SonarCloud config — tools/ source scope |
| T99 | done | #87 | FGA resources — Delete docs lie, schema drift, nil pointer |
| T100 | done | #94 | List resource — silent data drop, missing Update/Import tests |

---

## Priority Tiers

### Tier 1: Stabilize Terraform Provider (COMPLETE)

| Task | Status | Issue | Description |
|------|--------|-------|-------------|
| T1 | done | [#74](https://github.com/jamescrowley321/terraform-provider-descope/issues/74) | Fix flaky TestProjectAuthorization |
| T2 | done | [#73](https://github.com/jamescrowley321/terraform-provider-descope/issues/73) | Fix flaky TestProjectSettings |
| T3 | done | [#72](https://github.com/jamescrowley321/terraform-provider-descope/issues/72) | Fix flaky TestDescoperTagRoles |

### Tier 2: Core Terraform Resources (COMPLETE — except blocked/wontfix)

| Task | Status | Issue | Description | Complexity | Enables |
|------|--------|-------|-------------|------------|---------|
| T4 | done | [#18](https://github.com/jamescrowley321/terraform-provider-descope/issues/18) | descope_permission and descope_role | Large | SaaS Starter RBAC |
| T5 | done | [#16](https://github.com/jamescrowley321/terraform-provider-descope/issues/16) | descope_sso resource | Large | SaaS Starter SSO |
| T6 | blocked | [#8](https://github.com/jamescrowley321/terraform-provider-descope/issues/8) | descope_sso_application — **requires enterprise license (E074106)** | Large | SaaS Starter SSO |
| T7 | wontfix | [#17](https://github.com/jamescrowley321/terraform-provider-descope/issues/17) | descope_jwt — **dual-ownership risk with project resource** | Medium | — |
| T8 | wontfix | [#19](https://github.com/jamescrowley321/terraform-provider-descope/issues/19) | descope_flow — **visual artifacts, SDK format bugs** | Medium | — |
| T9 | done | [#15](https://github.com/jamescrowley321/terraform-provider-descope/issues/15) | descope_password_settings | Medium | Auth hardening |
| T10 | done | [#13](https://github.com/jamescrowley321/terraform-provider-descope/issues/13) | descope_outbound_application | Medium | App integrations |
| T11 | done | [#12](https://github.com/jamescrowley321/terraform-provider-descope/issues/12) | descope_third_party_application | Medium | App integrations |
| T12 | done | [#11](https://github.com/jamescrowley321/terraform-provider-descope/issues/11) | descope_fga resources (Fine-Grained Authorization) | Large | Future ReBAC |
| T13 | done | [#20](https://github.com/jamescrowley321/terraform-provider-descope/issues/20) | descope_project_export data source | Medium | Environment replication |
| T80 | done | [#92](https://github.com/jamescrowley321/terraform-provider-descope/issues/92) | descope_list resource for IP/text allow/deny lists | Medium | Security policies |
| T81 | done | [#93](https://github.com/jamescrowley321/terraform-provider-descope/issues/93) | Descope model docs — OAuth2/OIDC spec mapping | Large | Developer understanding |

### Tier 3: SaaS Starter Phases (Test Provider Features)

| Task | Status | Issue | Description | Complexity | Depends On |
|------|--------|-------|-------------|------------|------------|
| T14 | done | [#3](https://github.com/jamescrowley321/identity-stack/issues/3) | Phase 1c: Session Management | Medium | — |
| T15 | done | [#4](https://github.com/jamescrowley321/identity-stack/issues/4) | Phase 2a: Tenant Management | Medium | T14 |
| T16 | done | [#5](https://github.com/jamescrowley321/identity-stack/issues/5) | Phase 2b: Roles & Permissions (RBAC) | Medium | T4, T15 |
| T17 | done | [#6](https://github.com/jamescrowley321/identity-stack/issues/6) | Phase 2c: Custom Attributes | Medium | T15, T16 |
| T18-T25 | closed | — | Phases 3-5 (SSO, MFA, JWT, Flows, Connectors, OIDC/SAML) | — | Issues closed 2026-03-31 (superseded by PRD 5) |
| T26 | done | [#14](https://github.com/jamescrowley321/identity-stack/issues/14) | Phase 5c: Admin Portal & User Management | Large | T16 |
| T27-T28 | closed | — | TF Config + Docs | — | Issues closed 2026-03-31 (superseded by PRD 5) |

### Tier 4: Terraform CI/Infrastructure

| Task | Status | Issue | Description | Complexity | Depends On |
|------|--------|-------|-------------|------------|------------|
| T29 | done | [#26](https://github.com/jamescrowley321/terraform-provider-descope/issues/26) | Resolve pre-existing SonarCloud findings | Medium | After Tier 1 |
| T30 | done | [#24](https://github.com/jamescrowley321/terraform-provider-descope/issues/24) | Add Snyk CLI workflow job | Small | — |
| T31 | done | [#22](https://github.com/jamescrowley321/terraform-provider-descope/issues/22) | Publish fork to Terraform Registry — issue #22 closed, v1.1.0-v1.1.4 released | Medium | After several resources shipped |

### Tier 5: py-identity-model (Sprint-Based) — ALL FEATURE TASKS COMPLETE

Organized into sprints by dependency order. All feature implementation tasks (T32-T47) are complete. Remaining work is review fixes (T110-T116), then docs/examples/advanced features (T48-T63).

#### Sprint A: Foundation & SaaS Starter Immediate Value (COMPLETE)

| Task | Issue | Description | Status |
|------|-------|-------------|--------|
| T33 | [#117](https://github.com/jamescrowley321/py-identity-model/issues/117) | DI for HTTP Client | done |
| T34 | [#93](https://github.com/jamescrowley321/py-identity-model/issues/93) | Enhanced Token Validation | done |
| T55 | [#219](https://github.com/jamescrowley321/py-identity-model/issues/219) | Discovery Cache with TTL | pending |
| T46 | [#109](https://github.com/jamescrowley321/py-identity-model/issues/109) | DiscoveryPolicy & Architecture | done |

#### Sprint B: Base Classes & Core Protocol Endpoints (COMPLETE)

| Task | Issue | Description | Status | Depends On |
|------|-------|-------------|--------|------------|
| T35 | [#88](https://github.com/jamescrowley321/py-identity-model/issues/88) | Base Request/Response Classes | done | — |
| T36 | [#90](https://github.com/jamescrowley321/py-identity-model/issues/90) | Auth Code Grant + PKCE | done | T35 |
| T39 | [#19](https://github.com/jamescrowley321/py-identity-model/issues/19) | Refresh Token Grant **[SaaS]** | done | T35 |
| T38 | [#17](https://github.com/jamescrowley321/py-identity-model/issues/17) | Token Revocation **[SaaS]** | done | T35 |
| T56 | [#214](https://github.com/jamescrowley321/py-identity-model/issues/214) | RP-Initiated Logout **[SaaS]** | pending | T35 |

#### Sprint C: Protocol Endpoints & Client Auth (COMPLETE)

| Task | Issue | Description | Status | Depends On |
|------|-------|-------------|--------|------------|
| T37 | [#16](https://github.com/jamescrowley321/py-identity-model/issues/16) | Token Introspection | done | T35 |
| T57 | [#213](https://github.com/jamescrowley321/py-identity-model/issues/213) | JWT Client Authentication (private_key_jwt) | pending | T35 |
| T58 | [#221](https://github.com/jamescrowley321/py-identity-model/issues/221) | AS Issuer Identification (RFC 9207) | pending | T32 (#116) |

#### Sprint D: Advanced Grants (COMPLETE)

Independent grant types that expand protocol coverage.

| Task | Issue | Description | Status | Depends On |
|------|-------|-------------|--------|------------|
| T43 | [#91](https://github.com/jamescrowley321/py-identity-model/issues/91) | Device Authorization Grant (RFC 8628) | done | T35 |
| T44 | [#92](https://github.com/jamescrowley321/py-identity-model/issues/92) | Token Exchange (RFC 8693) | done | T35 |
| T59 | [#217](https://github.com/jamescrowley321/py-identity-model/issues/217) | CIBA (Backchannel Authentication) | pending | T35 |
| T60 | [#220](https://github.com/jamescrowley321/py-identity-model/issues/220) | Rich Authorization Requests (RFC 9396) | pending | T35 |
| T61 | [#216](https://github.com/jamescrowley321/py-identity-model/issues/216) | Dynamic Client Registration (RFC 7591) | pending | T35 |

#### Sprint E: Modern Security — FAPI Track (COMPLETE)

| Task | Issue | Description | Status | Depends On |
|------|-------|-------------|--------|------------|
| T40 | [#94](https://github.com/jamescrowley321/py-identity-model/issues/94) | DPoP (RFC 9449) | done | T35 |
| T41 | [#95](https://github.com/jamescrowley321/py-identity-model/issues/95) | PAR (RFC 9126) | done | T35 |
| T62 | [#215](https://github.com/jamescrowley321/py-identity-model/issues/215) | mTLS Client Auth (RFC 8705) | pending | T35 |
| T42 | [#96](https://github.com/jamescrowley321/py-identity-model/issues/96) | JAR (RFC 9101) | done | T35, T41 |
| T63 | [#218](https://github.com/jamescrowley321/py-identity-model/issues/218) | JARM (Authorization Response Mode) | pending | T32 (#116) |
| T45 | [#97](https://github.com/jamescrowley321/py-identity-model/issues/97) | FAPI 2.0 Compliance | done | T40, T41, T42, T57, T62 |

#### Sprint F: Examples, Docs & Benchmarks

Cross-cutting work best done after core features stabilize.

| Task | Issue | Description | Complexity | Status | Depends On |
|------|-------|-------------|------------|--------|------------|
| T47 | [#112](https://github.com/jamescrowley321/py-identity-model/issues/112) | Performance Benchmarks | Medium | done | Sprint A complete |
| T48 | [#83](https://github.com/jamescrowley321/py-identity-model/issues/83) | Comprehensive API Documentation | Large | pending | Sprint B+ complete |
| T50 | [#38](https://github.com/jamescrowley321/py-identity-model/issues/38) | Auth0 Example | Small | pending | T36 (auth code + PKCE) |
| T49 | [#39](https://github.com/jamescrowley321/py-identity-model/issues/39) | Okta Example | Small | pending | T36 |
| T53 | [#35](https://github.com/jamescrowley321/py-identity-model/issues/35) | Azure AD Example | Small | pending | T36 |
| T52 | [#36](https://github.com/jamescrowley321/py-identity-model/issues/36) | Google Example | Small | pending | T36 |
| T51 | [#37](https://github.com/jamescrowley321/py-identity-model/issues/37) | Cognito Example | Small | pending | T36 |
| T54 | [#33](https://github.com/jamescrowley321/py-identity-model/issues/33) | Flask Middleware Example | Small | pending | T36 |

### Tier 6: Identity Stack — UI Framework & E2E Testing (COMPLETE)

#### Phase 0: shadcn/ui + Tailwind Migration (COMPLETE)

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T80 | identity-stack | [#51](https://github.com/jamescrowley321/identity-stack/issues/51) | Tailwind CSS v4 + shadcn/ui foundation | Medium | done | — |
| T81 | identity-stack | [#52](https://github.com/jamescrowley321/identity-stack/issues/52) | App shell — sidebar, header, navigation, dark mode | Medium | done | T80 |
| T82 | identity-stack | [#53](https://github.com/jamescrowley321/identity-stack/issues/53) | Migrate Dashboard page (establishes pattern) | Medium | done | T81 |
| T83 | identity-stack | [#54](https://github.com/jamescrowley321/identity-stack/issues/54) | Migrate remaining pages (Members, Roles, Keys, Profile, Settings, Login) | Large | done | T82 |
| T84 | identity-stack | [#55](https://github.com/jamescrowley321/identity-stack/issues/55) | Playwright E2E tests (Python) for UI and API — PR #94 merged, PR #122 fixed session bugs | Large | done | T81 |

### Tier 7: Identity Stack — Descope Feature Showcase (COMPLETE)

All feature showcase work complete. Issues #38-#45 closed 2026-03-31 (completed or superseded by PRD 5).

| Task | Description | Status |
|------|-------------|--------|
| T72 | Document-Level Authorization with FGA (ReBAC) | done |
| T73 | RBAC Enhancement — Hierarchical Roles and Permission Inheritance | done |
| T74 | Social Login Integration (Google, GitHub) | done |
| T75 | Passkey / WebAuthn Authentication | done |
| T76-T79 | Magic Links, Step-Up, Audit Trail, JWT Templates | closed (superseded by PRD 5) |

### Tier 8: Identity Stack — Canonical Identity Domain Model (PRD 5)

Run via `ralph-prompts/canonical-identity.md`. 4 epics, 19 stories, chained PRs with inline review cycle.

#### Epic 1: Canonical Identity Foundation (6 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 1.1 | [#138](https://github.com/jamescrowley321/identity-stack/issues/138) | Docker Compose + Postgres Async Engine | pending | — |
| 1.2 | [#139](https://github.com/jamescrowley321/identity-stack/issues/139) | Alembic Setup + Canonical Schema Migration | pending | 1.1 |
| 1.3 | [#140](https://github.com/jamescrowley321/identity-stack/issues/140) | Error Model, Result Types + RFC 9457 | pending | 1.2 |
| 1.4 | [#141](https://github.com/jamescrowley321/identity-stack/issues/141) | OTel Instrumentation + Aspire Dashboard | pending | 1.3 |
| 1.5 | [#142](https://github.com/jamescrowley321/identity-stack/issues/142) | Service Interfaces + Test Infrastructure | pending | 1.4 |
| 1.6 | [#143](https://github.com/jamescrowley321/identity-stack/issues/143) | Seed Migration from Descope | pending | 1.5 |

#### Epic 2: Identity & Access Administration (5 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 2.1 | [#144](https://github.com/jamescrowley321/identity-stack/issues/144) | User Service + Descope Sync Adapter | pending | 1.6 |
| 2.2 | [#145](https://github.com/jamescrowley321/identity-stack/issues/145) | Role, Permission + Tenant Service | pending | 2.1 |
| 2.3 | [#146](https://github.com/jamescrowley321/identity-stack/issues/146) | Router Rewire — Identity Routers | pending | 2.2 |
| 2.4 | [#147](https://github.com/jamescrowley321/identity-stack/issues/147) | Unit + Integration Tests | pending | 2.3 |
| 2.5 | [#148](https://github.com/jamescrowley321/identity-stack/issues/148) | E2E Tests + Regression | pending | 2.4 |

#### Epic 3: Inbound Sync & Reconciliation (4 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 3.1 | [#149](https://github.com/jamescrowley321/identity-stack/issues/149) | Flow HTTP Connector + Webhook Handler | pending | 2.5 |
| 3.2 | [#150](https://github.com/jamescrowley321/identity-stack/issues/150) | Periodic Reconciliation Job | pending | 3.1 |
| 3.3 | [#151](https://github.com/jamescrowley321/identity-stack/issues/151) | Redis Pub/Sub + Cache Invalidation | pending | 3.2 |
| 3.4 | [#152](https://github.com/jamescrowley321/identity-stack/issues/152) | Inbound Sync Tests | pending | 3.3 |

#### Epic 4: Multi-IdP Identity Linking (4 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 4.1 | [#153](https://github.com/jamescrowley321/identity-stack/issues/153) | IdP Link + Provider Config Service | pending | 3.4 |
| 4.2 | [#154](https://github.com/jamescrowley321/identity-stack/issues/154) | Link Management + Provider Config Routers | pending | 4.1 |
| 4.3 | [#155](https://github.com/jamescrowley321/identity-stack/issues/155) | Internal Identity Resolution API + Redis Cache | pending | 4.2 |
| 4.4 | [#156](https://github.com/jamescrowley321/identity-stack/issues/156) | Multi-IdP Tests | pending | 4.3 |

### Tier 9: SaaS Starter Hardening (COMPLETE)

#### Sprint G: Security Hardening (COMPLETE)

| Task | Repo | Issue | Description | Complexity | Status |
|------|------|-------|-------------|------------|--------|
| T64 | identity-stack | [#28](https://github.com/jamescrowley321/identity-stack/issues/28) | Security headers middleware | Small | done |
| T65 | identity-stack | [#29](https://github.com/jamescrowley321/identity-stack/issues/29) | Rate limiting middleware | Medium | done |
| T67 | identity-stack | [#30](https://github.com/jamescrowley321/identity-stack/issues/30) | Structured logging with correlation IDs | Medium | done |
| T66 | identity-stack | [#31](https://github.com/jamescrowley321/identity-stack/issues/31) | Auth audit logging | Medium | done |

#### Sprint H: Reliability & Testing (PARTIAL)

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T68 | identity-stack | [#32](https://github.com/jamescrowley321/identity-stack/issues/32) | Enhanced health checks (Descope API, database) | Small | done | — |
| T69 | identity-stack | [#33](https://github.com/jamescrowley321/identity-stack/issues/33) | Descope API retry logic with exponential backoff | Medium | done | — |
| T70 | identity-stack | [#34](https://github.com/jamescrowley321/identity-stack/issues/34) | E2E testing framework (Playwright) — **superseded by T84** | Large | blocked | — |
| T71 | identity-stack | [#35](https://github.com/jamescrowley321/identity-stack/issues/35) | CI/CD pipeline with automated deployment | Medium | pending | T84 |

---

## Dependency Graph

### Terraform Provider -> SaaS Starter (existing)

```
Tier 2 (TF Resources) ──────────────> Tier 3 (SaaS Starter)

T6 (SSO app) [blocked: license] ────> T18 (SSO) ──> T21 (Step-Up), T22 (MFA)
T7 (JWT) [wontfix] ────────────────> T20 (JWT Templates) — needs rethink
T8 (Flow) [wontfix] ──────────────> T23 (Custom Flows) ──> T24 (Connectors) — needs rethink
                                      T25 (OIDC/SAML Apps) [blocked: T6]
                                      T19 (Access Keys) [done]
                                      T26 (Admin Portal) [done]

Tier 6 (SaaS Starter Hardening) — ALL DONE
  T64 (#28 Security Headers) ──┐
  T65 (#29 Rate Limiting) ─────┤── Sprint G (COMPLETE)
  T67 (#30 Structured Logging) ┤
  T66 (#31 Audit Logging) ─────┘

  T68 (#32 Health Checks) [done] ──┐
  T69 (#33 Retry Logic) [done] ────┤── Sprint H (partial)
  T70 (#34 E2E Testing) [blocked — superseded by T84] ─┤
  T71 (#35 CI/CD Pipeline) ────────┘──> depends on T84 [done]
```

### py-identity-model Internal Dependencies

```
Sprint A (Foundation) — COMPLETE
  T33 (#117 DI) [done]
  T34 (#93 Token Validation) [done]
  T46 (#109 DiscoveryPolicy) [done]

Sprint B (Base + Core) — COMPLETE (feature tasks)
  T35 (#88 Base Classes) [done] ────> all Sprint C/D/E tasks
       ├──> T39 (#19 Refresh) [done]
       ├──> T38 (#17 Revocation) [done]
       └──> T56 (#214 Logout) [pending — not yet assigned]

Sprint C (Auth Flows) — COMPLETE
  T37 (#16 Introspection) [done]
  T36 (#90 Auth Code + PKCE) [done] ──> all provider examples (Sprint F)

Sprint D (Advanced Grants) — COMPLETE (assigned tasks)
  T43 (#91 Device Auth) [done]
  T44 (#92 Token Exchange) [done]

Sprint E (FAPI Track) — COMPLETE (assigned tasks)
  T40 (#94 DPoP) [done]
  T41 (#95 PAR) [done]
  T42 (#96 JAR) [done]
  T45 (#97 FAPI 2.0) [done]

Sprint F (Benchmarks) — PARTIAL
  T47 (#112 Performance Benchmarks) [done]
  T48-T54 (docs, examples) [pending]

Review Fix Chain (COMPLETE — all PRs merged 2026-03-30)
  T101-T116 [done] — all 16 PRs #211-#237 merged

Integration Test Chain (ACTIVE)
  T120 [done] → T121 [in_progress] → T122 [in_progress] → T123-T125 [pending] → T126,T128 [pending] → T127 [pending]
```

### Cross-Repo: py-identity-model -> SaaS Starter

```
py-identity-model                      SaaS Starter impact
─────────────────                      ───────────────────
T34 (#93 Token Validation) [done] ──> Step-up auth, custom claims, access keys
T33 (#117 DI) [done] ──────────────> Better FastAPI middleware
T39 (#19 Refresh) [done] ──────────> Session refresh without re-login
T38 (#17 Revocation) [done] ───────> Proper logout (revoke tokens)
T36 (#90 Auth Code + PKCE) [done] ─> Server-side auth flows (future)
T56 (#214 Logout) [pending] ───────> End IdP session on sign-out
T55 (#219 Discovery Cache) [pending]> Production reliability
```

---

## Recommended Execution Order

### Immediate (active work)

| Track | Tasks | Notes |
|-------|-------|-------|
| **saas-starter PRD 5 (Canonical Identity)** | Stories 1.1-1.6 (Epic 1 Foundation) → 2.1-2.5 (Epic 2 Service Layer) → 3.1-3.4 (Epic 3 Inbound Sync) → 4.1-4.4 (Epic 4 Multi-IdP) | 19 stories, issues #138-#156, ralph prompt ready at `canonical-identity.md` |
| **py-identity-model integration tests** | T121 (CI-fix), T122 (PR phase) → T123-T125 → T126 → T128 → T127 | Node-oidc fixture merged. Core flows PR #281 has CI failures. Token mgmt reviewed, ready for PR. |

### Next wave (after integration tests complete)

1. **Merge Epic 3 PR chain** — PRs #121-#125 (Stories 3.1-3.4) + remaining stories
2. **py-identity-model remaining protocol features**: T55 (discovery cache), T56 (logout), T57 (JWT client auth), T58 (issuer ID)
3. **py-identity-model Sprint F**: T48 (API docs), T49-T54 (provider examples) — feature code on main
4. **Toolchain expansion** — Multi-provider test infrastructure, multi-IdP gateway demo, etc.
5. **SaaS Starter remaining features (deprioritized)**: T76-T79 — lower priority than bigger-picture items

### When TF blocks resolve

- **T6 unblocked** (enterprise license): -> T18 (SSO) -> T21 (Step-Up) -> T22 (MFA) -> T25 (OIDC/SAML)
- **T7/T8 are wontfix** — T20 (JWT Templates) and T23/T24 (Custom Flows/Connectors) need alternative approaches or may be descoped

### Later sprints (py-identity-model)

- **Remaining Sprint D**: T59 (CIBA), T60 (RAR), T61 (Dynamic Registration) — pending, not yet assigned
- **Remaining Sprint E**: T62 (mTLS), T63 (JARM) — pending, not yet assigned
- **Sprint F**: T48 (API docs), T49-T54 (provider examples) — after review fixes land

---

## Upcoming: Toolchain Expansion

Four new PRDs are being created to expand beyond Descope-only functionality. These initiatives come AFTER current Descope feature completion (review fix chains, remaining SaaS starter features):

1. **Infrastructure Secrets Pipeline** — Secrets management for the workspace
2. **API Gateway** — Gateway layer for the SaaS starter backend
3. **Multi-Provider Test Infrastructure** — Test harness supporting multiple IdPs
4. **Multi-IdP Gateway Demo** — SaaS starter extension demonstrating multi-provider authentication

These represent the next major phase of workspace evolution, moving from single-provider (Descope) to multi-provider architecture.

---

## Key Decision Points

1. **TF Provider blocks (T6):** SSO application requires enterprise license. This blocks T18/T21/T22/T25 in the SaaS starter. Consider filing Descope support ticket for enterprise license.

2. **T7/T8 wontfix impact:** JWT templates (T20) and Custom Flows (T23/T24) in the SaaS starter depended on these TF resources. These SaaS starter tasks need to be either descoped or re-approached without TF provider support.

3. **py-identity-model review fix chain:** COMPLETE. All 16 PRs (#211-#237) merged to main on 2026-03-30.

4. **Integration test chain (T120-T128):** T120 merged (fixture on main). T121 has CI failures to investigate. T122 through review, ready for PR. T123-T128 pending — no blockers since all feature code is on main.

5. **Provider examples timing:** All provider examples (#33-#39, tasks T49-T54) depend on Auth Code + PKCE (#90) which is on main. Examples can start now.

6. **FAPI 2.0 completeness:** Core FAPI tasks (DPoP, PAR, JAR) are done, but mTLS (T62) and JWT client auth (T57) remain pending. Full FAPI 2.0 compliance will require these.

7. **Toolchain expansion timing:** Four new PRDs are in planning. These should not start until integration test chain is complete.
