# Auth Workspace Sprint Plan

## Overview

Sprint plan across three repos. **Execution method:** Ralph loops — one task at a time through: analysis -> plan -> execute -> test -> code review.

**py-identity-model:** Every feature task MUST include integration tests and usage examples. Unit tests alone are not sufficient.

**identity-stack:** Every feature task MUST include Playwright E2E tests covering happy path and auth enforcement. See PR #94 for test patterns.

---

## Current Status (as of 2026-04-19)

### terraform-provider-descope — COMPLETE
All tasks done. T6 (SSO app) blocked on enterprise license. T7/T8 wontfix. Releases v1.1.0-v1.1.4 published to Terraform Registry. All review fixes (T85-T89, T99-T100) done.

### identity-stack — DESIGN SYSTEM ACTIVE
All prior work complete (Phases 1-5, Epics 2-3, UI migration, E2E tests, all review fixes). PRD 5 (Canonical Identity Domain Model) **shipped 2026-04-09** — all 18 stories merged. PRD 2 (API Gateway) **shipped 2026-04-12**. Design System Integration — 5 epics, 31 stories. **6 done, 3 partial, 22 remaining.** Epic file: `epics-design-system.md`. Ralph prompt: `ralph-prompts/design-system.md`.

### py-identity-model — CERTIFICATION SUBMISSION READY
All feature tasks (T32-T47) done. All review fixes (T101-T116) done — 16 PRs merged. Integration test chain (T120-T125) done. OIDC conformance: **all 3 profiles passing** — Basic RP (13/13), Config RP (5/5), Form Post RP (13/13). T140-T146 done, T147 (Implicit/Hybrid) pending as nice-to-have. Security re-audit Phase 2: 6/8 done (T200-T204, T207 shipped via PRs #383-#387), T205-T206 pending. **Next action: T164 — apply for OIDF fee waiver and submit for certification.** Products: T170-T172 pending (monorepo, CLI, middleware).

---

## Active Work

| Track | Tasks | Notes |
|-------|-------|-------|
| **py-identity-model certification** | **T164** | **TOP PRIORITY — apply for OIDF fee waiver + submit (owner-driven)** |
| **py-identity-model security tail** | T205, T206 (2 remaining) | JWKS URL scheme validation + harness XSS escaping |
| **identity-stack Design System** | DS-1.1 through DS-5.4 (31 stories) | Purple brand, density, 8 new components, 5 new pages, responsive |

---

## Tier 8: Identity Stack — Canonical Identity Domain Model (PRD 5) — COMPLETE

Shipped 2026-04-09 via `ralph-prompts/canonical-identity.md`. 4 epics, 18 stories, all merged.

#### Epic 1: Canonical Identity Foundation (6 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 1.1 | [#138](https://github.com/jamescrowley321/identity-stack/issues/138) | Docker Compose + Postgres Async Engine | done | — |
| 1.2 | [#139](https://github.com/jamescrowley321/identity-stack/issues/139) | Alembic Setup + Canonical Schema Migration | done | 1.1 |
| 1.3 | [#140](https://github.com/jamescrowley321/identity-stack/issues/140) | Error Model, Result Types + RFC 9457 | done | 1.2 |
| 1.4 | [#141](https://github.com/jamescrowley321/identity-stack/issues/141) | OTel Instrumentation + Aspire Dashboard | done | 1.3 |
| 1.5 | [#142](https://github.com/jamescrowley321/identity-stack/issues/142) | Service Interfaces + Test Infrastructure | done | 1.4 |
| 1.6 | [#143](https://github.com/jamescrowley321/identity-stack/issues/143) | Seed Migration from Descope | done | 1.5 |

#### Epic 2: Identity & Access Administration (5 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 2.1 | [#144](https://github.com/jamescrowley321/identity-stack/issues/144) | User Service + Descope Sync Adapter | done | 1.6 |
| 2.2 | [#145](https://github.com/jamescrowley321/identity-stack/issues/145) | Role, Permission + Tenant Service | done | 2.1 |
| 2.3 | [#146](https://github.com/jamescrowley321/identity-stack/issues/146) | Router Rewire — Identity Routers | done | 2.2 |
| 2.4 | [#147](https://github.com/jamescrowley321/identity-stack/issues/147) | Unit + Integration Tests | done | 2.3 |
| 2.5 | [#148](https://github.com/jamescrowley321/identity-stack/issues/148) | E2E Tests + Regression | done | 2.4 |

#### Epic 3: Inbound Sync & Reconciliation (3 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 3.1 | [#149](https://github.com/jamescrowley321/identity-stack/issues/149) | Flow HTTP Connector + Webhook Handler | done | 2.5 |
| 3.2 | [#150](https://github.com/jamescrowley321/identity-stack/issues/150) | Periodic Reconciliation Job | done | 3.1 |
| 3.4 | [#152](https://github.com/jamescrowley321/identity-stack/issues/152) | Inbound Sync Tests | done | 3.2 |

#### Epic 4: Multi-IdP Identity Linking (4 stories)

| Story | Issue | Description | Status | Depends On |
|-------|-------|-------------|--------|------------|
| 4.1 | [#153](https://github.com/jamescrowley321/identity-stack/issues/153) | IdP Link + Provider Config Service | done | 3.4 |
| 4.2 | [#154](https://github.com/jamescrowley321/identity-stack/issues/154) | Link Management + Provider Config Routers | done | 4.1 |
| 4.3 | [#155](https://github.com/jamescrowley321/identity-stack/issues/155) | Internal Identity Resolution API | done | 4.2 |
| 4.4 | [#156](https://github.com/jamescrowley321/identity-stack/issues/156) | Multi-IdP Tests | done | 4.3 |

---

## Tier 9: Identity Stack — Design System Integration

Run via `ralph-prompts/design-system.md`. 5 epics, 31 stories. Full breakdown in `epics-design-system.md`.

#### Epic DS-1: Design Token Migration (4 stories)

| Story | Task ID | Description | Status | Depends On |
|-------|---------|-------------|--------|------------|
| DS-1.1 | T210 | Purple brand color scale + semantic tokens | done | — |
| DS-1.2 | T211 | Density increase — control heights + spacing | partial | DS-1.1 |
| DS-1.3 | T212 | Header + page layout density | partial | DS-1.2 |
| DS-1.4 | T213 | Typography scale + base styles | done | DS-1.1 |

#### Epic DS-2: Component & Layout Updates (4 stories)

| Story | Task ID | Description | Status | Depends On |
|-------|---------|-------------|--------|------------|
| DS-2.1 | T214 | Badge sync-state variants | done | DS-1.1 |
| DS-2.2 | T215 | Responsive breakpoints | done | DS-1.1 |
| DS-2.3 | T216 | Sidebar nav items for new pages | done | DS-1.1 |
| DS-2.4 | T217 | Update existing E2E tests for density | pending | DS-1.3 |

#### Epic DS-3: New Shared Components (8 stories)

| Story | Task ID | Description | Status | Depends On |
|-------|---------|-------------|--------|------------|
| DS-3.1 | T218 | KPI Strip component | done | DS-1.1 |
| DS-3.2 | T219 | Provider Glyph component | pending | DS-1.1 |
| DS-3.3 | T220 | Spark (inline sparkline) | pending | DS-1.1 |
| DS-3.4 | T221 | Stream Row component | pending | DS-1.1 |
| DS-3.5 | T222 | Sync Flow Diagram | pending | DS-3.2 |
| DS-3.6 | T223 | Matrix Grid component | pending | DS-1.1 |
| DS-3.7 | T224 | Audit Row component | pending | DS-1.1 |
| DS-3.8 | T225 | Confidence Score component | pending | DS-1.1 |

#### Epic DS-4: PRD 5 Admin Pages (11 stories)

| Story | Task ID | Description | Status | Depends On |
|-------|---------|-------------|--------|------------|
| DS-4.0 | T226 | Backend endpoints for admin pages | pending | — |
| DS-4.1 | T227 | Providers — list + KPI | pending | DS-3.1, DS-3.2, DS-4.0 |
| DS-4.2 | T228 | Providers — detail drill-down | pending | DS-4.1 |
| DS-4.3 | T229 | Sync Dashboard — flow + events | pending | DS-3.4, DS-3.5, DS-4.0 |
| DS-4.4 | T230 | Sync Dashboard — matrix + conflicts | pending | DS-4.3, DS-3.6 |
| DS-4.5 | T231 | Inbound Events — live tail | pending | DS-3.2, DS-3.4, DS-4.0 |
| DS-4.6 | T232 | Inbound Events — polling + detail | pending | DS-4.5 |
| DS-4.7 | T233 | Identity Correlation — canonical detail | pending | DS-3.2, DS-3.7 |
| DS-4.8 | T234 | Identity Correlation — conflict resolution | pending | DS-4.7 |
| DS-4.9 | T235 | Provisional Users — queue | pending | DS-3.1, DS-3.2, DS-3.8, DS-4.0 |
| DS-4.10 | T236 | Provisional Users — actions | pending | DS-4.9 |

#### Epic DS-5: Integration Testing (4 stories)

| Story | Task ID | Description | Status | Depends On |
|-------|---------|-------------|--------|------------|
| DS-5.1 | T237 | Unit tests for new components | pending | DS-3.* |
| DS-5.2 | T238 | E2E Playwright tests for new pages | pending | DS-4.* |
| DS-5.3 | T239 | Responsive E2E tests | pending | DS-2.2 |
| DS-5.4 | T240 | Visual regression baselines | pending | all |

---

## Next Wave (after Design System + py-identity-model stabilize)

1. **py-identity-model remaining protocol features**: T55 (discovery cache), T56 (logout), T57 (JWT client auth), T58 (issuer ID)
2. **py-identity-model Sprint F**: T48 (API docs), T49-T54 (provider examples)
3. **Toolchain expansion** — PRDs 1, 3, 4: Infrastructure Secrets, Multi-Provider Test, Multi-IdP Demo

## Key Decisions

1. **T6 blocked** (enterprise license E074106): Cascades to T18 (SSO), T21 (Step-Up), T22 (MFA), T25 (OIDC/SAML)
2. **T7/T8 wontfix**: JWT Templates (T20) and Custom Flows (T23/T24) need alternative approaches or descoping
3. **OIDF certification is top priority** for py-identity-model — all profiles passing, submit ASAP (T164)
4. **Design system is top priority** for identity-stack — runs parallel with py-identity-model certification
5. **Toolchain expansion**: Four PRDs planned. Should not start until design system + conformance are stable
