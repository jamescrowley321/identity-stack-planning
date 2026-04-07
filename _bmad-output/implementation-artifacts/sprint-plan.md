# Auth Workspace Sprint Plan

## Overview

Sprint plan across three repos. **Execution method:** Ralph loops — one task at a time through: analysis -> plan -> execute -> test -> code review.

**py-identity-model:** Every feature task MUST include integration tests and usage examples. Unit tests alone are not sufficient.

**identity-stack:** Every feature task MUST include Playwright E2E tests covering happy path and auth enforcement. See PR #94 for test patterns.

---

## Current Status (as of 2026-04-06)

### terraform-provider-descope — COMPLETE
All tasks done. T6 (SSO app) blocked on enterprise license. T7/T8 wontfix. Releases v1.1.0-v1.1.4 published to Terraform Registry. All review fixes (T85-T89, T99-T100) done.

### identity-stack — PRD 5 ACTIVE
All prior work complete (Phases 1-5, Epics 2-3, UI migration, E2E tests, all review fixes). Next: Canonical Identity Domain Model (PRD 5) — 4 epics, 19 stories (issues #138-#156). Ralph prompt at `ralph-prompts/canonical-identity.md`.

### py-identity-model — INTEGRATION TESTS ACTIVE
All feature tasks (T32-T47) done. All review fixes (T101-T116) done — all 16 PRs merged 2026-03-30. Integration test chain active: T120 merged, T121 in progress (CI failures), T122 in progress, T123-T126 pending.

---

## Active Work

| Track | Tasks | Notes |
|-------|-------|-------|
| **identity-stack PRD 5** | Stories 1.1-4.4 (19 stories, issues #138-#156) | Ralph prompt ready. Sprint change proposal (2026-04-05) requires onion architecture. |
| **py-identity-model integration tests** | T121 (CI fix), T122 (PR phase) → T123-T125 → T126 | Node-oidc fixture merged. |

---

## Tier 8: Identity Stack — Canonical Identity Domain Model (PRD 5)

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

---

## Next Wave (after integration tests + PRD 5 stabilize)

1. **py-identity-model remaining protocol features**: T55 (discovery cache), T56 (logout), T57 (JWT client auth), T58 (issuer ID)
2. **py-identity-model Sprint F**: T48 (API docs), T49-T54 (provider examples)
3. **Toolchain expansion** — PRDs 1-4: Infrastructure Secrets, API Gateway, Multi-Provider Test, Multi-IdP Demo

## Key Decisions

1. **T6 blocked** (enterprise license E074106): Cascades to T18 (SSO), T21 (Step-Up), T22 (MFA), T25 (OIDC/SAML)
2. **T7/T8 wontfix**: JWT Templates (T20) and Custom Flows (T23/T24) need alternative approaches or descoping
3. **Toolchain expansion**: Four PRDs planned. Should not start until integration test chain complete
