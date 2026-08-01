# Task Queue

Tasks are picked up in order. Update status as you go.
Statuses: pending | in_progress | done | blocked

> **Reconciled 2026-07-23, loop-state updated 2026-07-27.** The Jul 21 feature batch and the FOSS security migration have landed; this file reflects `main`.
>
> **The per-workstream ralph prompts (`ralph-prompts/*.md`) are the authoritative live status** — each running loop updates its own embedded queue every iteration. These tables are a periodic snapshot; reconcile against the prompt + GitHub before assuming a task is open.
>
> **Loops are launched by the owner in a separate session, never from an agent session and never in the background.** The agent prepares prompts and hands over the launch recipe.
>
> **Loop state (2026-07-27):**
> - **identity-stack — design system** (`ralph-prompts/design-system.md`): **LIVE** — running in a separate session (orchestrator `/tmp/is-designsystem-orch`, branch `ralph/design-system`). Has shipped DS-3.1 and is working through DS-3.2 (provider glyph #330), DS-3.4 (StreamRow #332). **Do not relaunch or push competing PRs to identity-stack.**
> - **py-identity-model — FAPI2 remainder** (`ralph-prompts/pim-fapi2-hardening.md`): **PREPARED, not launched** — #221 RFC 9207, #397 jwks LRU, #431 repr guard. Ready for the owner to launch.
> - **identity-model — Rust hardening** (`ralph-prompts/identity-model-rust-hardening.md`): **PREPARED, not launched** — #24/#22/#23 hardening + #32 jsonwebtoken-10 migration (verified breaking). Ready for the owner to launch.
>
> Per workspace rule: **one ralph workstream per repo at a time**; loops run from `/tmp` worktrees, `--no-auto-merge` (owner reviews/merges).

## terraform-provider-descope

Feature-complete. Released through v1.2.1. Security tooling migrated to FOSS 2026-07-22 (Snyk job + orphan Sonar config removed in #181; govulncheck runs daily; CodeQL + gitleaks + Scorecard retained). Only the items below remain.

| ID | Issue | Status | Description |
|----|-------|--------|-------------|
| T6 | 8 | blocked | Add descope_sso_application resource — requires enterprise license (E074106) |
| T7 | 109 | pending | Standardize Go file naming to snake_case (mechanical rename sweep) | small |

## identity-stack

All prior phases complete (T14-T26, T64-T75, T80-T84, T90-T98, T117-T119 — all done/merged). PRD 5 (Canonical Identity) shipped 2026-04-09 — all 19 stories merged. PRD 2 (API Gateway) shipped 2026-04-12.

### Design System Integration (TOP PRIORITY)

Full breakdown: `epics-design-system.md`. Ralph prompt: `ralph-prompts/design-system.md`.

**Status (reconciled 2026-07-23):** DS-1 + DS-2 shipped (PRs #290–#294), T218 KPI Strip shipped (#295), DS-4 **backend** shipped (T226, #300 + integration backfill). **Remaining actionable frontend work = DS-3 components T219–T225, DS-4 pages T227–T236, DS-5 testing.** This is the largest greenfield backlog in the workspace and the natural next identity-stack loop.

#### Epic DS-1: Design Token Migration — DONE (PRs #290–#291)

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T210 | done | Purple brand color scale + semantic tokens in index.css | small | — |
| T211 | done | Density increase — control heights + button sizes | small | T210 |
| T212 | done | Header + page layout density (60px header, 32px padding) — #291 | medium | T211 |
| T213 | done | Typography scale + base styles (15px body, semantic h1-h4) — #290 | small | T210 |

#### Epic DS-2: Component & Layout Updates — DONE (PRs #292–#294)

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T214 | done | Badge sync-state variants (success, warning) — #292 | small | T210 |
| T215 | done | Responsive breakpoints (useBreakpoint hook, tablet 1024px) — #293 | medium | T210 |
| T216 | done | Sidebar nav items for new pages (Platform group) — #294 | small | T210 |
| T217 | pending | Update existing E2E tests for density changes (verify coverage) | small | T212 |

#### Epic DS-3: New Shared Components — T218 done, rest PENDING (next loop)

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T218 | done | KPI Strip component (4-col metric cards) — `ui/kpi-strip.tsx` (#295) | small | T210 |
| T219 | pending | Provider Glyph component (8 provider color schemes) | small | T210 |
| T220 | pending | Spark (inline sparkline bars) | small | T210 |
| T221 | pending | Stream Row (monospace event log entry) | small | T210 |
| T222 | pending | Sync Flow Diagram (3-col topology) | small | T219 |
| T223 | pending | Matrix Grid (role x permission checkboxes) | medium | T210 |
| T224 | pending | Audit Row (4-col log entry) | small | T210 |
| T225 | pending | Confidence Score (color-gradient percentage) | small | T210 |

#### Epic DS-4: PRD 5 Admin Pages — backend done, pages PENDING (next loop)

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T226 | done | Backend endpoints (sync status, events, provisional users) — #300 + integration backfill | large | — |
| T227 | pending | Providers page — list + KPI strip | medium | T218, T219, T226 |
| T228 | pending | Providers page — detail drill-down (tabs) | medium | T227 |
| T229 | pending | Sync Dashboard — flow variant + event stream | medium | T221, T222, T226 |
| T230 | pending | Sync Dashboard — matrix + conflict resolution | medium | T229, T223 |
| T231 | pending | Inbound Events — live tail | medium | T219, T221, T226 |
| T232 | pending | Inbound Events — polling + detail expansion | small | T231 |
| T233 | pending | Identity Correlation — canonical detail | medium | T219, T224 |
| T234 | pending | Identity Correlation — conflict resolution | medium | T233 |
| T235 | pending | Provisional Users — queue | medium | T218, T219, T225, T226 |
| T236 | pending | Provisional Users — merge/create/reject actions | medium | T235 |

#### Epic DS-5: Integration Testing

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T237 | pending | Unit tests for all DS-3 components (>80% coverage) | medium | T218-T225 |
| T238 | pending | E2E Playwright tests for 5 new pages | large | T226-T236 |
| T239 | pending | Responsive E2E tests (tablet + mobile viewports) | medium | T215 |
| T240 | pending | Visual regression baseline snapshots | medium | all |

### Pending Features

| ID | Issue | Status | Description | Depends On |
|----|-------|--------|-------------|------------|
| T71 | 35 | pending | CI/CD pipeline with automated deployment | T84 |
| T76 | 42 | pending | Magic Link Authentication for User Invitations | — |
| T77 | 43 | pending | Step-Up Authentication for Sensitive Operations | T34 |
| T78 | 44 | pending | Descope Audit Trail Integration | T67 |
| T79 | 45 | pending | JWT Template Customization Demo | — |

## py-identity-model

**Requirements:** Every feature task MUST include integration tests (in `src/tests/integration/`) and usage examples (in `examples/`). Unit tests alone are not sufficient.

All feature tasks (T32-T47) complete. All review fixes (T101-T116) complete — all 16 PRs #211-#237 merged 2026-03-30. Integration test chain (T120-T125) complete. OIDC conformance: Basic RP (13/13), Config RP (5/5), Form Post RP (13/13) all passing. **✅ Certified 2 Jul 2026** (py-identity-model 3.1.0: Basic + Config + Form Post Basic RP). Now at **v3.3.0**.

**Reconciled 2026-07-23:** the whole Phase-4 protocol batch **shipped 2026-07-21** — private_key_jwt (#213/#433), RP-Initiated Logout (#214/#451), Dynamic Client Registration (#216/#452), Back-Channel Logout (#442/#450). SonarCloud removed (#455); the monorepo restructure + `fastapi-identity-model` package are on main (#434). **Live remainder = #221 (RFC 9207 issuer validation), #397 (jwks-cache LRU), #431 (repr/eq guard), IdentityServer fixture #412–414, test hygiene #275/#276/#280, and the unstarted RFCs (CIBA #217, RAR #220, JARM #218, mTLS #215).**

### Token Validation Harness & Feature-Proof (TH — NEW, top priority)

Prompted by #461 (jwks-cache LRU) merging on unit-green with **no integration proof**. A prod FastAPI server on the `fastapi-identity-model` middleware, exercised by a **pytest correctness matrix** + a **Locust load/soak suite** across the wired IdP matrix (node-oidc, Keycloak, Ory, Descope multi-tenant), then every recent feature proven through it. **DoD per story: real-IdP integration test + conformance run where the change touches a certified/suite-backed profile.** Epics: `planning-artifacts/epics-token-harness.md`. Ralph prompt: `ralph-prompts/token-harness.md` (TBD). Tracking issue: [#462](https://github.com/jamescrowley321/py-identity-model/issues/462).

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T300 | 463 | pending | TH-1.1 Unified multi-provider `TokenSource` minter (node-oidc/Keycloak/Ory/Descope multi-tenant) | medium | — |
| T301 | 464 | pending | TH-1.2 Boot `fastapi-identity-model` middleware as a real resource server (uvicorn + httpx) | medium | — |
| T302 | 465 | pending | TH-1.3 Token correctness assertion matrix — pytest (valid/invalid → 200/401) | medium | T300, T301 |
| T303 | 466 | pending | TH-1.4 `make test-harness` + CI gating over both suites (local always, cloud on secrets; nightly #271 hook) | medium | T302, T311 |
| T311 | 474 | pending | TH-1.5 Load/soak suite — Locust (pre-minted token pool, throughput/soak, cache hit-rate) | medium | T300, T301 |
| T304 | 467 | pending | TH-2.1 **Prove multi-tenant LRU or revert #461** (must fail on the FIFO path). Ref #397/#461 | medium | T302 |
| T305 | 468 | pending | TH-2.2 Prove RFC 9207 issuer mix-up rejection. Ref #221/#457 | small | T300 |
| T306 | 469 | pending | TH-2.3 Prove private_key_jwt end-to-end via resource server. Ref #213/#433 | medium | T301 |
| T307 | 470 | pending | TH-2.4 Backfill integration coverage for the recent batch (#401, refresh-on-sig, DPoP/PAR/JAR, #459) | medium | T302 |
| T308 | 471 | pending | TH-3.1 Feature → OIDF conformance-profile coverage matrix | small | — |
| T309 | 472 | pending | TH-3.2 Make fastapi RP OIDF conformance a required regression gate. Ref #437 | large | T308 |
| T310 | 473 | pending | TH-3.3 RP-initiated + back-channel logout conformance (Keycloak). Ref #442/#214 | medium | T308 |

**Execution order:** T300 + T301 → T302 + T311 → **T304 (the #461 prove-or-revert gate)** → T303 → T305 / T306 / T307 → T308 → T309 / T310.

### OIDC Conformance Certification ✅ CERTIFIED (2 Jul 2026)

OpenID Foundation Basic RP + Config RP + Form Post Basic RP — **certified 2 Jul 2026** (py-identity-model 3.1.0). Fee waived via the OIDF OSS policy.

See `docs/oidc-certification-analysis.md` (§8 = next-profiles plan). Tracking issue: [#242](https://github.com/jamescrowley321/py-identity-model/issues/242).

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T140 | | done | Fix `kid` absent fallback — when JWT has no `kid` and JWKS has single key, use that key (OIDC Core §10.1). Implemented in `find_key_by_kid` | small | — |
| T141 | | done | Add UserInfo `sub` mismatch validation — `validate_userinfo_sub()` in `core/userinfo_logic.py` rejects mismatched sub | small | — |
| T142 | 219 | done | JWKS cache TTL with forced refresh on signature failure — TTL cache + `_retry_with_refreshed_jwks` in sync/async token_validation | medium | — |
| T143 | | done | Build conformance test harness — `conformance/app.py` RP + `run_tests.py` runner + Docker Compose + CI workflow | large | T140, T141, T142 |
| T144 | | done | Pass Basic RP conformance tests — 13/13 PASS. SSL cert sharing, cache clearing, UserInfo fatal error, claims display. PR #362 merged 2026-04-12 | medium | T143 |
| T145 | | done | Pass Config RP conformance tests — 5/5 PASS (signing-key-rotation now passes). All Config RP tests passing | medium | T143 |
| T146 | | done | Fix any conformance test failures from T144/T145 — all Basic RP (13/13) + Config RP (5/5) + Form Post RP (13/13) passing | medium | T144, T145 |
| T147 | 415 | wontfix | Expand to Implicit + Hybrid RP profiles — closed not-planned 2026-06-29: Implicit/Hybrid are OAuth 2.1-deprecated; code+PKCE already covered by Basic/Config/Form Post | medium | T146 |

### OIDC RP Certification Submission ✅ DONE (certified 2 Jul 2026)

Tracking issue: [#242](https://github.com/jamescrowley321/py-identity-model/issues/242). All 3 profiles certified 2 Jul 2026 (Basic + Config + Form Post Basic RP, v3.1.0).

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T160 | 326 | done | Switch conformance runner to certification.openid.net REST API — hosted workflow added, token auth, env var overrides | large |
| T161 | 327 | done | Fix JWKS cache bypass — http_client= removal, SSL cert sharing via cert-init, cache clearing between tests | medium |
| T162 | 329 | done | Document Config RP test count and variant config | small |
| T163 | 330 | done | Add Form Post RP profile — 13/13 PASS in CI. Parser, multi-value callback, unit tests | medium |
| T164 | 331 | done | OIDF OSS certification fee waiver — granted; certification approved & published 2 Jul 2026 (#331 closed) | — |
| T165 | 342 | done | Refactor Makefile — consolidated targets, help, HOSTED=1 support. PR #361 merged 2026-04-12 | small |

### OIDC RP Certification — Next Round (Phase 4)

Expand the cert to three more profiles. Primitives land in py-identity-model core; the logout HTTP endpoints land in the `fastapi-identity-model` package (branch `feat/fastapi-identity-model-package`). See `docs/oidc-certification-analysis.md` §8. (RP-Initiated Logout = T56/#214 and Dynamic RP = T61/#216, both listed under Remaining Feature Work below.)

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T251 | 442 | done | Back-Channel Logout RP — `validate_logout_token` (OIDC Back-Channel Logout 1.0 §2.4); `backchannel_logout_*` discovery fields. Shipped #450 (issue closed 2026-07-22) | medium |

### FAPI 2.0 RP Hardening + jwks-cache LRU (ralph workstream — NEXT LOOP)

Ralph prompt: `ralph-prompts/pim-fapi2-hardening.md` (worktree-run — loop runs from `/tmp/pim-fapi2-ralph`, not the main checkout). **Reconciled 2026-07-23:** T57 (private_key_jwt) shipped #433. Two items remain — the RFC 9207 issuer-validation gate and the jwks-cache LRU security fix — plus the repr/eq guard #431. This is a small, well-scoped security workstream and a good next py-identity-model loop.

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T57 | 213 | done | private_key_jwt client authentication — shipped #433 (`core/client_assertion.py`, `PrivateKeyJwt` config) | medium |
| T58 | 221 | pending | RFC 9207 issuer *validation* (parsing already done) — mix-up defense in `core/state_validation.py` | small |
| T236 | 397 | pending | jwks-cache FIFO→LRU — `move_to_end()` on read hits (`core/jwks_cache.py`, sync/aio token_validation) | small |
| T252 | 431 | pending | Add repr/eq guard to `RefreshTokenResponse` + `PushedAuthorizationResponse` (redact secrets in repr) — low-severity, split from #300 re-audit | small |

> Note: T58/T236/T252 also appear in their topical sections below. This section is the canonical entry point for the next security ralph loop.

### Security Re-Audit Fixes (Phase 2) — Nearly Complete

Re-audit on 2026-04-14 verified Phase 1 fixes (PRs #364-#372) and found 8 new findings. See `security-fix-plan.md` for batch grouping. All 8 shipped (PRs #383-#387 + T205/T206 closed 2026-05-24). Original adversarial-review tracking issue #300 (2 critical, 4 high, 5 medium) re-audited 2026-06-29 — all critical/high/medium resolved, closed; two low-severity repr-guard items split to #431.

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T200 | 375 | done | Deprecate `get_public_key_from_jwk` — stop mutating shared JWKS keys, add DeprecationWarning. PR #383 merged | small | — |
| T201 | 376 | done | Add JWKS response size limit — Content-Length check, max 512KB, max 100 keys. PR #384 merged | small | — |
| T202 | 377 | done | Fix dead `require_https` field — wired to DiscoveryPolicy with cache key tuple. PR #385 merged | small | — |
| T203 | 378 | done | Prevent cache stampede — single-flight refresh on TTL expiry. PR #386 merged | medium | — |
| T204 | 379 | done | Reject JWKS with missing Content-Type + guard `response_json["keys"]` KeyError. PR #387 merged | small | — |
| T205 | 380 | done | Add pre-flight URL scheme validation to `get_jwks()` — issue closed 2026-05-24 | small | — |
| T206 | 381 | done | Escape HTML in conformance harness error responses — issue closed 2026-05-24 | small | — |
| T207 | 382 | done | Fix async cleanup lock TOCTOU — eagerly initialize lock at module level | small | — |

### IdentityServer Fixture Expansion

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T130 | 412 | pending | Enable introspection + revocation in IdentityServer fixture | small | — |
| T131 | 413 | pending | Add public PKCE client + enforce PKCE in IdentityServer fixture | small | — |
| T132 | 414 | pending | Run existing integration tests against IdentityServer (expand provider matrix) | medium | T130, T131 |

### Testing Hygiene + jwks-cache Residue (GitHub-only, added to planning 2026-05-21)

Items previously tracked only on GitHub; surfaced here so planning reflects the full conformance/testing backlog. Each remains open after the conformance certification push.

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T230 | 275 | pending | Reorganize test infrastructure under consistent directory structure | small |
| T231 | 276 | pending | Centralize key/cert generation across test fixtures | small |
| T232 | 280 | pending | Replace local-exec expired-token generation with a test fixture | small |
| T233 | 398 | done | Fix `test_per_uri_locks.py` ~3% flake on randomized `PYTHONHASHSEED` (jwks-cache M-1) — issue closed 2026-05-23 | small |
| T234 | 399 | done | Address module-level `asyncio.Lock()` event-loop binding (jwks-cache M-3) — issue closed 2026-05-23 | medium |
| T235 | 403 | done | Fix empty-keys refresh that raises on caller despite retained cache (jwks-cache M-5) — issue closed 2026-05-23 | small |
| T236 | 397 | pending | jwks-cache H-3 — FIFO eviction is attacker-controllable (multi-tenant); switch to LRU via `move_to_end()` on read hits | small |
| T237 | 401 | pending | jwks-cache — document per-process single-flight/cooldown scope + prefork worker amplification (docstrings + docs/) | small |

### Cloud Provider Integration Tests (cassette-based) — DEFERRED 2026-05-21

GitHub Epic 11 (`epic-11` label, issues #267–#271). Deferred 2026-05-21 — labeled `deferred` on GitHub. The conformance-certification gate has since **closed (certified 2 Jul 2026)**, so the remaining blocker is just Cognito + Entra ID account setup.

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T133 | 267 | deferred | Cassette test infrastructure — pytest-recording for httpx, live/replay mode, per-provider env templates | medium | — |
| T134 | 268 | deferred | AWS Cognito integration tests — discovery, token validation, `cognito:groups` claims, non-standard discovery URL | medium | T133, Cognito account |
| T135 | 269 | deferred | Microsoft Entra ID integration tests — v2.0 discovery, multi-tenant, `tid`/`oid` claims | medium | T133, Entra ID account |
| T136 | 270 | deferred | Auth0 integration tests — discovery, token validation, `permissions`/`org_id` claims, custom domains | medium | T133, Auth0 account |
| T137 | 271 | deferred | Nightly CI workflow — scheduled run against live providers, auto-create issues on drift | small | T134, T135, T136 |

### Remaining Feature Work

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T48 | 83 | done | Create Comprehensive API Documentation — 21 reference pages under `docs/api/` via mkdocs-material + mkdocstrings; issue closed 2026-06-29 | large |
| T49 | 39 | pending | Okta Example | small |
| T50 | 38 | pending | Auth0 Example | small |
| T51 | 37 | pending | Cognito Example | small |
| T52 | 36 | pending | Google Example | small |
| T53 | 35 | pending | Azure AD Example | small |
| T54 | 33 | pending | Flask Middleware Example | small |
| T55 | 219 | done | Discovery Cache with Configurable TTL — TTL-based `DiscoCacheEntry` in `core/jwks_cache.py`; issue closed 2026-04-10 | medium |
| T56 | 214 | done | RP-Initiated Logout (End Session) — `build_end_session_url` + `state` round-trip. Shipped #451 | medium |
| T57 | 213 | done | JWT Client Authentication (private_key_jwt) — shipped #433 | medium |
| T58 | 221 | pending | AS Issuer Identification (RFC 9207) — partial: response `iss` parsing done; remaining work is issuer *validation* (mix-up defense). Also a FAPI 2.0 RP gating item | small |
| T59 | 217 | pending | CIBA (Client-Initiated Backchannel Authentication) | large |
| T60 | 220 | pending | Rich Authorization Requests (RFC 9396) | medium |
| T61 | 216 | done | Dynamic Client Registration (RFC 7591/7592) — register-client models + sync/aio functions. Shipped #452 | medium |
| T62 | 215 | pending | mTLS Client Auth and Certificate-Bound Tokens (RFC 8705) | large |
| T63 | 218 | pending | JARM (JWT Secured Authorization Response Mode) | medium |
| T250 | 436 | pending | Custom claims validation hook accepting a `ClaimsPrincipal` — add `principal_validator` to `TokenValidationConfig` (sync+async, mirrors `claims_validator`), invoked after standard validation via `to_principal()`; follow-up: expose principal-level hook in fastapi-identity-model middleware once PR #434 lands | medium |

### Infrastructure & Secrets Automation

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T176 | 343 | done | Share nginx self-signed cert with RP container — cert-init service, SSL_CERT_FILE env, cache clearing. Merged 2026-04-12 | medium | — |
| T177 | 346 | pending | Secrets rotation automation — GH secrets + HCP Vault Secrets sync, rotation scripts, scheduled reminders | large | HCP CLI install |
| T178 | 345 | done | Release workflow — use RELEASE_TOKEN PAT to bypass branch protection | small | — |

### Products (after monorepo restructure)

These are downstream of the OIDC certification work. They inherit credibility from py-identity-model's library cert. Each ships as a separate PyPI package inside a uv workspace monorepo.

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T170 | 332 | done | Monorepo restructure — uv workspace; `packages/fastapi-identity-model` member on main (PR #434 merged) | large | — |
| T171 | 333 | pending | py-identity-model-cli — RFC 8252 loopback CLI login tool. **Only unstarted product; candidate next loop after the monorepo landed** | large | T170 |
| T172 | 334 | done | fastapi-identity-model — FastAPI middleware + RP login router; package on main, released 0.1.0 (PR #434, issue closed 2026-07-22) | large | T170 |
| T173 | 437 | done | fastapi-identity-model OIDF conformance regression — form_post + fetch_userinfo + §4.3 issuer-mismatch harness + `make conformance-test-fastapi` + CI job. On main | medium | T172 |

## identity-model

Multi-language OIDC/OAuth2 client library (Go + Rust). Epic source: `planning-artifacts/epics/epic-3-core-go.md`.

**Reconciled 2026-07-23:** repo is now **public** (2026-07-22, secret-scanned clean). FOSS security baseline merged (#29 — govulncheck + cargo-audit/deny + gitleaks + semgrep, daily). Go core + Go **extended** + Rust core **all shipped**. Crate name kept as clean `identity-model` (Duende is .NET-only; the `-rs` idea was dropped, PR #30 closed). **Remaining actionable work = Rust hardening (#22/#23/#24), the jsonwebtoken 9→10 migration (#32, verified breaking), and Rust extended-tier parity with Go (introspection/revocation/exchange/DPoP).** Learning issues #8–#13 are intentional starter tasks, not loop work.

### Go Core Tier (Epic 3) — DONE (merged 2026-07-02)

Ralph prompt: `ralph-prompts/identity-model-go-core.md`. Foundation scaffold (PR #1) + all five core stories merged bottom-up to `main` 2026-07-02 (PRs #2–#7, incl. the multi-provider integration matrix). Main CI green.

| ID | Story | Status | Description |
|----|-------|--------|-------------|
| G3.2 | 3.2 | done | OIDC Discovery client — `pkg/discovery` (PR #2) |
| G3.3 | 3.3 | done | JWKS client + key resolution — `pkg/jwks` (PR #3) |
| G3.4 | 3.4 | done | JWT validation — `pkg/jwt` (PR #4) |
| G3.5 | 3.5 | done | Client credentials + auth code + PKCE — `pkg/token` (PR #5) |
| G3.6 | 3.6 | done | UserInfo endpoint — `pkg/userinfo` (PR #6) |

### Rust Core Tier (Epic 4) — DONE (merged 2026-07-21)

Ralph prompt: `ralph-prompts/identity-model-rust-core.md`. Stack R4.2–R4.6 completed and merged bottom-up to `main` 2026-07-21 after a fresh-context adversarial re-review (zero blockers). Main CI green. Non-blocking review nits tracked as identity-model issues #22 (redirect-downgrade hardening), #23 (`azp` + clock-skew), #24 (token Debug redaction).

| ID | Story | Status | Description |
|----|-------|--------|-------------|
| R4.2 | 4.2 | done | OIDC Discovery client — `rust/src/discovery` (PR #16) |
| R4.3 | 4.3 | done | JWKS client + key resolution — `rust/src/jwks` (PR #21, replaced #17) |
| R4.4 | 4.4 | done | JWT validation — `rust/src/jwt` (PR #18) |
| R4.5 | 4.5 | done | Token client (CC + auth code + PKCE) — `rust/src/token` (PR #19) |
| R4.6 | 4.6 | done | UserInfo endpoint — `rust/src/userinfo` (PR #20) |

### Go Extended Tier (Epic 5 + 0F spec) — DONE (merged 2026-07-21)

Ralph prompt: `ralph-prompts/identity-model-go-extended.md`. All four extended stories shipped bottom-up to `main` (PRs #25–#28), each with its Epic 0F spec story. Main CI green.

| ID | Story | Status | Description |
|----|-------|--------|-------------|
| G5.1 | 5.1-go | done | Token Introspection (RFC 7662) — `pkg/introspection` (#25) |
| G5.2 | 5.2-go | done | Token Revocation (RFC 7009) — `pkg/revocation` (#26) |
| G5.3 | 5.3-go | done | Token Exchange (RFC 8693) — extends `pkg/token` (#27) |
| G5.4 | 5.4-go | done | DPoP (RFC 9449) — `pkg/dpop` (#28) |

### Rust Hardening + Extended Tier — PENDING (next identity-model loop)

Reconciled 2026-07-23. Rust core is done; these are the remaining Rust items. The hardening trio are small non-blocking nits from the R4 fresh-review; the extended tier brings Rust to parity with Go's extended packages; the jsonwebtoken migration is a verified-breaking dependency bump (tracking PR #32).

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| R.H1 | 22 | pending | Forbid https→http redirect downgrade in discovery/jwks fetch | small |
| R.H2 | 23 | pending | Verify `azp` for multi-audience ID tokens + clock-skew (OIDC Core §3.1.3.7) | small |
| R.H3 | 24 | pending | Redact bearer tokens + client secrets from Debug/error output | small |
| R.M1 | 32 | pending | Migrate jsonwebtoken 9→10 — **verified breaking** (6 JWT-validation tests fail; v10 changed crypto/key handling). Needs `rust/src/jwt/mod.rs` rework, tests kept green | medium |
| R5.1 | — | pending | Rust extended tier — introspection/revocation/exchange/DPoP to parity with Go Epic 5 | large |
