# Auth Workspace Sprint Plan

## Overview

This sprint plan prioritizes work across three repos. The **terraform-provider-descope** remains the primary project for infrastructure, with **py-identity-model** elevated to active sprint planning now that its issue backlog is comprehensive and spec-referenced.

**Execution method:** Ralph loops — one task at a time through: analysis -> plan -> execute -> test -> code review.

**py-identity-model requirement:** Every feature task MUST include integration tests (in `src/tests/integration/`) and usage examples (in `examples/`). Unit tests alone are not sufficient.

---

## Current Status (as of 2026-03-29)

### terraform-provider-descope
- **Done:** T1-T5, T9-T13, T29-T30 (all resources except blocked/wontfix, CI tasks), T80 (list resource), T81 (model docs)
- **Wontfix:** T7 (JWT — dual-ownership risk with project resource), T8 (Flow — visual artifacts, SDK format bugs)
- **Blocked:** T6 (SSO app — enterprise license), T31 (registry — manual setup needed)
- **Review fixes:** T85-T89, T99-T100 — ALL done

### descope-saas-starter
- **Done:** T14-T17, T19, T26 (core phases), T64-T69 (all hardening), T72-T75 (FGA/ReBAC, RBAC hierarchy, social login, passkeys), T80-T83 (shadcn/ui migration complete)
- **Blocked:** T18, T20-T25 (cascading blocks from TF provider), T70 (superseded by T84)
- **Pending:** T27-T28 (TF config, docs), T71 (CI/CD), T76-T79 (magic links, step-up, audit trail, JWT demo), T84 (Playwright E2E)
- **Review fixes:** T90-T98, T117-T119 — ALL done

### py-identity-model
- **Done:** T32-T47 (ALL feature tasks complete — Sprint A through Sprint F benchmarks)
- **In progress:** T110 (PR #230 review fix — PAR client_id double-sent, missing required field validation)
- **Pending:** T111-T116 (remaining review fixes), T48-T63 (docs, examples, advanced protocol features)
- **Review fixes:** T101-T109 done, T110 in_progress, T111-T116 pending

---

## Review Fix Chains (Active Work)

All three repos have completed code review on feature PRs. Ralph fix loops are processing review findings.

### py-identity-model Review Fixes

Sequential chain — each fix task depends on the previous (PRs stack on each other).

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
| T110 | in_progress | #230 | PAR — client_id double-sent, missing required field validation |
| T111 | pending | #232 | JAR — extra_claims override, missing kid header |
| T112 | pending | #233 | Device Auth — no async tests, missing required field validation |
| T113 | pending | #234 | Token Exchange — client_id double-sent, actor_token_type validation |
| T114 | pending | #235 | FAPI 2.0 — crash on failed discovery, empty code_challenge bypass |
| T115 | pending | #236 | Policy Config — unenforced policy flags, no URL scheme pre-flight |
| T116 | pending | #237 | Perf Benchmarks — expiring fixture, wrong benchmark layer, no assertions |

### descope-saas-starter Review Fixes (COMPLETE)

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

### Tier 6: SaaS Starter — UI Framework & E2E Testing (UI MIGRATION COMPLETE)

#### Phase 0: shadcn/ui + Tailwind Migration (COMPLETE)

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T80 | descope-saas-starter | [#51](https://github.com/jamescrowley321/descope-saas-starter/issues/51) | Tailwind CSS v4 + shadcn/ui foundation | Medium | done | — |
| T81 | descope-saas-starter | [#52](https://github.com/jamescrowley321/descope-saas-starter/issues/52) | App shell — sidebar, header, navigation, dark mode | Medium | done | T80 |
| T82 | descope-saas-starter | [#53](https://github.com/jamescrowley321/descope-saas-starter/issues/53) | Migrate Dashboard page (establishes pattern) | Medium | done | T81 |
| T83 | descope-saas-starter | [#54](https://github.com/jamescrowley321/descope-saas-starter/issues/54) | Migrate remaining pages (Members, Roles, Keys, Profile, Settings, Login) | Large | done | T82 |
| T84 | descope-saas-starter | [#55](https://github.com/jamescrowley321/descope-saas-starter/issues/55) | Playwright E2E tests (Python) for UI and API | Large | pending | T81 |

### Tier 7: SaaS Starter — Descope Feature Showcase (PARTIAL)

New phases demonstrating advanced Descope capabilities. Organized by theme.

#### Phase 8: Authorization Deep Dive (RBAC + ReBAC) — COMPLETE

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T72 | descope-saas-starter | [#38](https://github.com/jamescrowley321/descope-saas-starter/issues/38) | Document-Level Authorization with FGA (ReBAC) | Large | done | T12 (TF FGA resources), T16 (RBAC) |
| T73 | descope-saas-starter | [#39](https://github.com/jamescrowley321/descope-saas-starter/issues/39) | RBAC Enhancement — Hierarchical Roles and Permission Inheritance | Medium | done | T16 (RBAC) |

#### Phase 9: Authentication Methods (PARTIAL)

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T74 | descope-saas-starter | [#40](https://github.com/jamescrowley321/descope-saas-starter/issues/40) | Social Login Integration (Google, GitHub) | Medium | done | — |
| T75 | descope-saas-starter | [#41](https://github.com/jamescrowley321/descope-saas-starter/issues/41) | Passkey / WebAuthn Authentication | Medium | done | — |
| T76 | descope-saas-starter | [#42](https://github.com/jamescrowley321/descope-saas-starter/issues/42) | Magic Link Authentication for User Invitations | Medium | pending | — |

#### Phase 10: Advanced Features

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T77 | descope-saas-starter | [#43](https://github.com/jamescrowley321/descope-saas-starter/issues/43) | Step-Up Authentication for Sensitive Operations | Medium | pending | T34 (py-identity-model #93 enhanced validation) |
| T78 | descope-saas-starter | [#44](https://github.com/jamescrowley321/descope-saas-starter/issues/44) | Descope Audit Trail Integration | Medium | pending | T67 (structured logging) |
| T79 | descope-saas-starter | [#45](https://github.com/jamescrowley321/descope-saas-starter/issues/45) | JWT Template Customization Demo | Medium | pending | — |

### Tier 9: SaaS Starter Hardening (COMPLETE)

#### Sprint G: Security Hardening (COMPLETE)

| Task | Repo | Issue | Description | Complexity | Status |
|------|------|-------|-------------|------------|--------|
| T64 | descope-saas-starter | [#28](https://github.com/jamescrowley321/descope-saas-starter/issues/28) | Security headers middleware | Small | done |
| T65 | descope-saas-starter | [#29](https://github.com/jamescrowley321/descope-saas-starter/issues/29) | Rate limiting middleware | Medium | done |
| T67 | descope-saas-starter | [#30](https://github.com/jamescrowley321/descope-saas-starter/issues/30) | Structured logging with correlation IDs | Medium | done |
| T66 | descope-saas-starter | [#31](https://github.com/jamescrowley321/descope-saas-starter/issues/31) | Auth audit logging | Medium | done |

#### Sprint H: Reliability & Testing (PARTIAL)

| Task | Repo | Issue | Description | Complexity | Status | Depends On |
|------|------|-------|-------------|------------|--------|------------|
| T68 | descope-saas-starter | [#32](https://github.com/jamescrowley321/descope-saas-starter/issues/32) | Enhanced health checks (Descope API, database) | Small | done | — |
| T69 | descope-saas-starter | [#33](https://github.com/jamescrowley321/descope-saas-starter/issues/33) | Descope API retry logic with exponential backoff | Medium | done | — |
| T70 | descope-saas-starter | [#34](https://github.com/jamescrowley321/descope-saas-starter/issues/34) | E2E testing framework (Playwright) — **superseded by T84** | Large | blocked | — |
| T71 | descope-saas-starter | [#35](https://github.com/jamescrowley321/descope-saas-starter/issues/35) | CI/CD pipeline with automated deployment | Medium | pending | T70 |

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
  T70 (#34 E2E Testing) [blocked] ─┤
  T71 (#35 CI/CD Pipeline) ────────┘──> depends on T70
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

Review Fix Chain (ACTIVE)
  T101-T109 [done] → T110 [in_progress] → T111-T116 [pending]
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
| **py-identity-model review fixes** | T110 (in progress) -> T111 -> T112 -> T113 -> T114 -> T115 -> T116 | 7 review fix tasks remaining (1 active, 6 pending) |

### Next wave (after review fixes complete)

1. **Merge all py-identity-model PRs** — 16 feature PRs ready once review fixes land
2. **SaaS Starter remaining features**: T76 (magic links), T77 (step-up), T78 (audit trail), T79 (JWT demo)
3. **SaaS Starter E2E**: T84 (Playwright Python) — stable selectors now available from completed UI migration
4. **py-identity-model remaining protocol features**: T55 (discovery cache), T56 (logout), T57 (JWT client auth), T58 (issuer ID)

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

3. **py-identity-model review fix chain:** Sequential dependency chain T110-T116 is the critical path. Each fix depends on the previous PR being complete. Estimated 3-5 days to complete at current velocity.

4. **Provider examples timing:** All provider examples (#33-#39, tasks T49-T54) depend on Auth Code + PKCE (#90) which is now complete. Examples can start after review fixes land.

5. **FAPI 2.0 completeness:** Core FAPI tasks (DPoP, PAR, JAR) are done, but mTLS (T62) and JWT client auth (T57) remain pending. Full FAPI 2.0 compliance will require these plus the review fixes for T45.

6. **Toolchain expansion timing:** Four new PRDs are in planning. These should not start until the current review fix chains are complete and all feature PRs are merged.
