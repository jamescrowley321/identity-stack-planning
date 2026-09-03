# Auth Workspace Sprint Plan

## Overview

Sprint plan across three repos. **Execution method:** Ralph loops — one task at a time through: analysis -> plan -> execute -> test -> code review.

**py-identity-model:** Every feature task MUST include integration tests and usage examples. Unit tests alone are not sufficient.

**identity-stack:** Every feature task MUST include Playwright E2E tests covering happy path and auth enforcement. See PR #94 for test patterns.

---

## Current Status (as of 2026-05-21)

> **Update 2026-08-22 — reconciled to reality (housekeeping):**
> - **identity-stack is active again.** The *Ory as a Configurable SSO Provider* initiative shipped Epics 1–3: Epic 1 (Ory Network IaC, **applied live** — project `identity-stack-dev`, issuer `inspiring-nash-yli2uiwmcw`, PR #370), Epic 2 (provider-driven backend token validation + Ory as a configured OIDC provider, PR #371), Epic 3 (canonical wiring + JIT provisioning + `GET /api/identity`, PR #372). Epics 4 (provider-agnostic frontend) and 5 (provider-aware logout + end-to-end Ory test) are next. The "identity-stack — DEFERRED" line below is superseded — see the new **Ory SSO Provider** tier. Feeder doc `docs/ory-sso-provider-context.md`; epics `_bmad-output/planning-artifacts/epics-ory-sso-provider.md`; IaC plan `docs/ory-iac-automation-plan.md`.
> - **Consolidation correction:** CONS-1.4 **merged** (PR #548, 2026-08-21). CONS-1.5 (PR #549) was **closed unmerged** — the `/spec` Python/Rust executor + cross-language coverage gate is **not yet landed** and needs a fresh PR.
> - **Certification framing:** **py-identity-model is the OpenID Certified® Relying Party the rest of the family (Go, Rust) is built to match.** Conformance is an ongoing program (next profiles: Dynamic RP #216, RP-Initiated Logout #214, Back-Channel Logout #442), not a one-time milestone.

> **Update 2026-07-08:** py-identity-model is now **OpenID Certified** (3.1.0 — Basic + Config + Form Post Basic RP, 2 Jul 2026), so the conformance milestone has **closed**. Corrections to the 2026-05-21 snapshot below: T164/#331 (cert + fee waiver) is **done**; T147 is **`wontfix`** (Implicit/Hybrid dropped, #415); the security tail T205/T206 is **done**. Next cert round: Dynamic RP (#216), RP-Initiated Logout (#214), Back-Channel Logout (#442). The rest of this snapshot is historical.

**Workspace focus narrowed 2026-05-21:** conformance and testing only. Other workstreams (Design System, monorepo restructure, cloud-provider integration epic) were deferred until the conformance milestone closed (now closed).

### terraform-provider-descope — COMPLETE
All tasks done. T6 (SSO app) blocked on enterprise license. T7/T8 wontfix. Releases v1.1.0-v1.1.4 published to Terraform Registry. All review fixes (T85-T89, T99-T100) done.

### identity-stack — ACTIVE (Ory SSO provider)
Canonical work complete (Phases 1-5, Epics 2-3, UI migration, E2E tests, all review fixes). PRD 5 (Canonical Identity Domain Model) **shipped 2026-04-09** — all 19 stories merged. PRD 2 (API Gateway) **shipped 2026-04-12**. **Now active:** *Ory as a Configurable SSO Provider* — Epics 1–3 merged (PRs #370/#371/#372; Epic 1 applied live), Epics 4–5 next. See the **Ory SSO Provider** tier below. Design System Integration (5 epics, 31 stories) remains partially done and outside the current Ory focus — status unconfirmed against the identity-stack GitHub tracker; epic file `epics-design-system.md`.

### py-identity-model — ✅ OpenID Certified® RP (the reference the family matches) + jwks-cache hardened to v3.0.0
All feature tasks (T32-T47) done. All review fixes (T101-T116) done. Integration test chain (T120-T125) done. OIDC conformance: **certified 2 Jul 2026 (v3.1.0)** — Basic RP (13/13), Config RP (5/5), Form Post RP (13/13). T140-T146 done, T164 (fee waiver/submission) done. T147 (Implicit/Hybrid) **wontfix** — dropped as OAuth 2.1-deprecated (#415). Security re-audit Phase 2: 8/8 done (T200-T207 shipped via PRs #383-#387; T205/#380 + T206/#381 done).

**jwks-cache hardening rounds done (PRs #394, #395, #406, #407, #408, #409)** — major bump to v3.0.0 published 2026-05-21 (async `clear_*_cache` helpers became async; monotonic clock + request_time inside fetch lock). Residual testing/tech-debt items #398, #399, #403 tracked in task-queue.

**Certified 2 Jul 2026 (T164 done).** Next cert round: Dynamic RP (#216), RP-Initiated Logout (#214), Back-Channel Logout (#442). Products: T170+T172 (monorepo layout + fastapi-identity-model package) in review via PR #434, with the OIDF conformance regression stage (T173/#437) stacked on top; T171 (CLI, #333 — now includes device flow in v1) remains pending.

> **Update 2026-08-17 — Polyglot Consolidation ACTIVATED (correct-course):** The deferred monorepo consolidation is now active, with **direction reversed** — `identity-model` (Go/Rust) merges **into** py-identity-model (which survives w/ history + cert + PyPI), orchestrated by **`moon`** (superseding the T170 root `uv` workspace; per-package uv retained under `/py`), layout `/py /go /rust` (+ reserved `/node`), rename **last**. See `sprint-change-proposal-2026-08-17.md`; epics **CONS-1/2/3** (`epics/epic-cons{1,2,3}-*.md`); `epic-0a` superseded. Design of record: py-identity-model PR #533. Execution = stacked in-session PRs, owner-reviewed (not a loop).

### Tier: py-identity-model — Polyglot Consolidation (CONS-1/2/3) — ALL DONE EXCEPT LEGACY-REPO ARCHIVE

Merge identity-model into the surviving repo; kill duplicated conformance/fixture infra; moon orchestration; independent per-language release tags. Stacked PRs, merge bottom-up.

> **Reconciled 2026-08-19 against py-identity-model `origin/main`:** CONS-1.1/1.2/1.3 merged (PRs #538/#541/#540). CONS-1.4 + CONS-1.5 **executed in-session as a stacked pair, PRs open awaiting owner bottom-up merge** — CONS-1.4 = py-identity-model **#548** (CI green; one `/infra`, root `test-fixtures/` removed, first Go/Rust CI jobs, headless authz-code+PKCE e2e in all three languages, `TEST_REQUIRE_LIVE` mechanical gate), CONS-1.5 = **#549** (stacked on #548; Python + new Rust `/spec` vector runners + `spec-vector-coverage` cross-language gate, 12/12/12). Both carried 2-reviewer adversarial evidence in the PR. **Correction (2026-08-22):** CONS-1.4 (#548) **merged 2026-08-21**; **CONS-1.5 (#549) was closed unmerged** — the `/spec` Python/Rust executor + `spec-vector-coverage` gate is **not yet landed** and must be re-opened as a fresh PR. Detail in `epics/epic-cons1-im-merge-testinfra.md`.

> **Update 2026-08-28 — consolidation is code-complete; only owner-gated actions remain.** CONS-1 and CONS-2 are **done** (spec-vector coverage gate + Go/Rust runners, moon, both release pipelines, publish-parity gate — all merged and required in CI). CONS-3 is done except archiving the legacy repo. CONS-1.5 **did land** on `origin/main` (the earlier "closed unmerged, needs a fresh PR" note is obsolete). **The only remaining work:** (1) **cut the first Go + Rust releases** — push `go/vX.Y.Z` and `rust-vX.Y.Z` tags; Rust is blocked until `CARGO_REGISTRY_TOKEN` is set on the repo, and both need a version decision (owner, irreversible public publish); (2) **archive `jamescrowley321/identity-model-legacy`** (owner; safe — its cache-bound fixes were re-implemented natively on the survivor). Epics #534–537 remain open as umbrellas but their sub-work is merged.

> **Update 2026-08-29 — Go + Rust releases fully automated AND cut.** py-identity-model **#570** added `release-go-version`/`release-rust-version` PSR jobs (mirroring `release-fastapi-version`): merging a `feat(go)`/`feat(rust)` commit now auto-tags + publishes with zero manual tagging, same UX as the Python auto-release. `CARGO_REGISTRY_TOKEN` is set. First releases cut on merge and **all three languages are live**: `go/v0.1.0` (Go proxy), `rust-v0.0.1` → crates.io `rs-identity-model`, `py-identity-model 3.11.4` (PyPI). **The ONLY remaining consolidation item is archiving `identity-model-legacy` (owner-gated).** Once archived, close CONS-3 (#537) and the meta epic (#534). See py-identity-model memory `project_identity_model_go_rust_release_automation`.

> **Update 2026-09-02 — consolidation DONE.** `identity-model-legacy` is confirmed archived on GitHub (read-only), and its local checkout was renamed `~/repos/auth/identity-model` → `~/repos/auth/identity-model-legacy` so it stops masquerading as the live monorepo. CONS-3.1 is now done → CONS-3 (#537) and the meta epic (#534) are closeable. Note: the **live** monorepo (GitHub `identity-model`) is still checked out locally at the dir `~/repos/auth/py-identity-model/`.

| Story | Epic | Description | Status | Depends On |
|-------|------|-------------|--------|------------|
| CONS-1.1 | CONS-1 | Import identity-model Go → `/go` | **done** (PR #538) | — |
| CONS-1.2 | CONS-1 | Import identity-model Rust → `/rust` | **done** (PR #541) | — |
| CONS-1.3 | CONS-1 | Import neutral conformance `/spec` | **done** (PR #540) | 1.1, 1.2 |
| CONS-1.4 | CONS-1 | Consolidate IdP fixtures → one `/infra` | **done** (PR #548, merged 2026-08-21) | 1.1, 1.2 |
| CONS-1.5 | CONS-1 | Python/Rust `/spec` executors + coverage gate | **done** — `spec-vector-coverage` gate + Go/Rust runners landed, required in CI | 1.3, 1.4 |
| CONS-2.1 | CONS-2 | Relocate Python core → `/py` (drop root uv workspace) | **done** (PR #550) | CONS-1 |
| CONS-2.2 | CONS-2 | semantic-release → `/py`; tag `py-v{ver}` | **done** (PR #553; latest `py-v3.11.3`) | 2.1 |
| CONS-2.3 | CONS-2 | moon workspace + tasks; reserve `/node` scaffold | **done** (PR #554) | 2.1 |
| CONS-2.4 | CONS-2 | Go (`go/vX.Y.Z`) + Rust (`rust-vX.Y.Z`) release + CI | **done** — pipelines (#556) + full auto-tagging (py-identity-model #570); first releases `go/v0.1.0` + `rust-v0.0.1` published (crates.io `rs-identity-model` / Go proxy, 2026-08-29) | 2.3 |
| CONS-2.5 | CONS-2 | Publishing-parity dry-run gate | **done** (PR #557; required in CI) | 2.2, 2.4 |
| CONS-3.1 | CONS-3 | Archive old repo (now `identity-model-legacy`) | **done** (2026-09-02) — GitHub repo archived (read-only); local checkout renamed `identity-model` → `identity-model-legacy` | CONS-1 |
| CONS-3.2 | CONS-3 | Rename survivor repo → `identity-model` | **done** | 3.1, CONS-2 |
| CONS-3.3 | CONS-3 | PyPI Trusted Publishing | **done** — core publishes via OIDC Trusted Publishing | 3.2 |
| CONS-3.4 | CONS-3 | Fix references (urls/badges/go-module/crates) | **done** | 3.2 |
| CONS-3.5 | CONS-3 | Reconcile stale planning artifacts | **done** (PR #90 + this update) | 3.2 |

---

## Tier: Identity Stack — Ory as a Configurable SSO Provider — IN PROGRESS

Make identity-stack's IdP *configurable* so an Ory Network provider can be configured and run — **not** a Descope swap-out. Descope stays a configured provider; every change is backward-compatible provider-agnostic wiring. JWT access tokens validated via py-identity-model (standard OIDC; FAPI 2.0 not a target). Default tenancy is canonical-side. Feeder doc `docs/ory-sso-provider-context.md`; epics/stories `_bmad-output/planning-artifacts/epics-ory-sso-provider.md`; IaC plan `docs/ory-iac-automation-plan.md`.

| Epic | Description | FRs | Status |
|------|-------------|-----|--------|
| Epic 1 | Ory Network provisioning (IaC) — `infra/ory` `ory/ory` Terraform: project JWT strategy, public SPA client (auth_code + PKCE), identity schema, flag-gated Organizations | FR-18/19/20 | **done — applied live** (PR #370; project `identity-stack-dev`, issuer `inspiring-nash-yli2uiwmcw`) |
| Epic 2 | Config-driven backend token validation — generalize the Descope-hardcoded issuer allow-list/discovery/audience; add Ory as a configured OIDC provider; `ory` provider row | FR-1/2/3/4/5/6 | **done** (PR #371) |
| Epic 3 | Canonical resolution, JIT provisioning & Ory adapter — `tenants.external_org_id` migration, `seed_ory`, `OrySyncAdapter`, JIT write-path, `GET /api/identity` | FR-7/8/9/10/11/12/13 (+ FR-14 shipped early) | **done** (PR #372) |
| Epic 4 | Provider-agnostic frontend & canonical claims — `VITE_OIDC_*` provider-driven `oidcConfig`; `useRBAC`/`useTenants` consume canonical `/api/identity` instead of Descope token claims | FR-9/14/15/16 | **pending** — the FR-14 endpoint already shipped in Epic 3; remaining work is the frontend rewire |
| Epic 5 | Provider-aware logout & end-to-end Ory validation — Ory RP-initiated logout (Descope Management logout retained) + E2E test reusing the py-identity-model / OIDC conformance path | FR-17/21 | **pending** |

**Open follow-ups (identity-stack GitHub issues):** rotate `ORY_WORKSPACE_API_KEY` (generated in-session — see #370), migrate Terraform state local → HCP (`terraform init -migrate-state`), Epic 4 (frontend), Epic 5 (logout + E2E).

---

## Active Work (conformance + testing focus)

| Track | Tasks | Notes |
|-------|-------|-------|
| **py-identity-model certification** | ✅ done (T164/#331) | **Certified 2 Jul 2026** — Basic + Config + Form Post Basic RP (v3.1.0). Next round: #216/#214/#442 |
| **py-identity-model security tail** | T205 (#380), T206 (#381) | JWKS URL scheme validation + harness XSS escaping — small PR cluster |
| **py-identity-model testing residue** | T233 (#398), T234 (#399), T235 (#403) | jwks-cache flake + event-loop lock binding + empty-keys edge — emerged from review rounds |
| **py-identity-model testing hygiene** | T230 (#275), T231 (#276), T232 (#280) | Test directory reorg + key/cert centralization + token fixture |
| **py-identity-model IdentityServer fixture** | T130 (#412), T131 (#413), T132 (#414) | Introspection/revocation + PKCE + multi-provider matrix expansion |
| **py-identity-model conformance breadth** | T147 (#415) — wontfix | Implicit + Hybrid RP dropped (OAuth 2.1-deprecated). Next-round profiles instead: Dynamic RP (#216), RP-Initiated Logout (#214), Back-Channel Logout (#442) |
| **fastapi-identity-model package + regression** | T172 (#334, PR #434), T173 (#437) | Package (middleware + RP router) in review; OIDF conformance regression drives the real router through all 3 local plans (regression stage, not a second cert). Ralph prompt: `pim-fastapi-conformance-regression.md` |

### Deferred (still valid, revisit after current focus)

| Track | Tasks | Notes |
|-------|-------|-------|
| Cloud provider integration tests | T133–T137 (#267–#271) | GitHub Epic 11 — cassettes + Auth0/Cognito/Entra + nightly CI. Labeled `deferred` 2026-05-21. Blocked on Cognito/Entra account setup. |
| identity-stack Design System | DS-1.1 through DS-5.4 (31 stories) | Out of conformance/testing focus; needs reconciliation against current identity-stack GitHub state. |
| py-identity-model products | T170 (#332), T171 (#333) | Monorepo restructure delivered by PR #434 (in review); CLI still pending. T172/T173 promoted to Active Work above. |

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
3. **py-identity-model is the OpenID Certified® Relying Party the family matches.** Certified 2 Jul 2026 (Basic + Config + Form Post Basic RP, v3.1.0; T164); the Go and Rust cores in the consolidation are built to match its behavior. Conformance is an ongoing program — next round: Dynamic RP (#216), RP-Initiated Logout (#214), Back-Channel Logout (#442)
4. **Design system is top priority** for identity-stack — runs parallel with py-identity-model certification
5. **Toolchain expansion**: Four PRDs planned. Should not start until design system + conformance are stable
