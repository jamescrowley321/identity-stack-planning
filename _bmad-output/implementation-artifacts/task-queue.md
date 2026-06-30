# Task Queue

Tasks are picked up in order. Update status as you go.
Statuses: pending | in_progress | done | blocked

## terraform-provider-descope

All tasks complete except blocked/wontfix. Releases v1.1.0-v1.1.4 published.

| ID | Issue | Status | Description |
|----|-------|--------|-------------|
| T6 | 8 | blocked | Add descope_sso_application resource — requires enterprise license (E074106) |

## identity-stack

All prior phases complete (T14-T26, T64-T75, T80-T84, T90-T98, T117-T119 — all done/merged). PRD 5 (Canonical Identity) shipped 2026-04-09 — all 19 stories merged. PRD 2 (API Gateway) shipped 2026-04-12.

### Design System Integration (TOP PRIORITY)

Full breakdown: `epics-design-system.md`. Ralph prompt: `ralph-prompts/design-system.md`.

#### Epic DS-1: Design Token Migration

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T210 | pending | Purple brand color scale + semantic tokens in index.css | small | — |
| T211 | pending | Density increase — control heights + button sizes | small | T210 |
| T212 | pending | Header + page layout density (60px header, 32px padding) | medium | T211 |
| T213 | pending | Typography scale + base styles (15px body, semantic h1-h4) | small | T210 |

#### Epic DS-2: Component & Layout Updates

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T214 | pending | Badge sync-state variants (success, warning) | small | T210 |
| T215 | pending | Responsive breakpoints (useBreakpoint hook, tablet 1024px) | medium | T210 |
| T216 | pending | Sidebar nav items for new pages (Platform group) | small | T210 |
| T217 | pending | Update existing E2E tests for density changes | small | T212 |

#### Epic DS-3: New Shared Components

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T218 | pending | KPI Strip component (4-col metric cards) | small | T210 |
| T219 | pending | Provider Glyph component (8 provider color schemes) | small | T210 |
| T220 | pending | Spark (inline sparkline bars) | small | T210 |
| T221 | pending | Stream Row (monospace event log entry) | small | T210 |
| T222 | pending | Sync Flow Diagram (3-col topology) | small | T219 |
| T223 | pending | Matrix Grid (role x permission checkboxes) | medium | T210 |
| T224 | pending | Audit Row (4-col log entry) | small | T210 |
| T225 | pending | Confidence Score (color-gradient percentage) | small | T210 |

#### Epic DS-4: PRD 5 Admin Pages

| ID | Status | Description | Size | Depends |
|----|--------|-------------|------|---------|
| T226 | pending | Backend endpoints (sync status, events, provisional users) | large | — |
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

All feature tasks (T32-T47) complete. All review fixes (T101-T116) complete — all 16 PRs #211-#237 merged 2026-03-30. Integration test chain (T120-T125) complete. OIDC conformance: Basic RP (13/13), Config RP (5/5), Form Post RP (13/13) all passing — certification submission is the top priority.

### OIDC Conformance Certification (TOP PRIORITY — SUBMIT)

Target: OpenID Foundation Basic RP + Config RP + Form Post RP certification. All test profiles passing. **Next step: submit for certification.**

See `docs/oidc-certification-analysis.md` for full gap analysis. Tracking issue: [#242](https://github.com/jamescrowley321/py-identity-model/issues/242).

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

### OIDC RP Certification Submission (ACTIVE — next actions)

Tracking issue: [#242](https://github.com/jamescrowley321/py-identity-model/issues/242). All 3 profiles passing — submit for OIDF certification.

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T160 | 326 | done | Switch conformance runner to certification.openid.net REST API — hosted workflow added, token auth, env var overrides | large |
| T161 | 327 | done | Fix JWKS cache bypass — http_client= removal, SSL cert sharing via cert-init, cache clearing between tests | medium |
| T162 | 329 | done | Document Config RP test count and variant config | small |
| T163 | 330 | done | Add Form Post RP profile — 13/13 PASS in CI. Parser, multi-value callback, unit tests | medium |
| **T164** | **331** | **pending** | **Apply for OIDF OSS certification fee waiver (owner-driven, manual) — NEXT ACTION** | **—** |
| T165 | 342 | done | Refactor Makefile — consolidated targets, help, HOSTED=1 support. PR #361 merged 2026-04-12 | small |

### FAPI 2.0 RP Hardening + jwks-cache LRU (ralph workstream — ACTIVE)

Ralph prompt: `ralph-prompts/pim-fapi2-hardening.md` (worktree-run — loop runs from `~/repos/auth/pim-fapi2-ralph`, not the main checkout). Single sequential workstream covering the items the 2026-06-29 issue audit prioritized. T57/T58 are the FAPI 2.0 RP gating pair; T236 is a multi-tenant security fix. Detailed per-task scope lives in the ralph prompt.

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T57 | 213 | pending | private_key_jwt client authentication — `core/client_assertion.py` (reuse jar.py signing), `PrivateKeyJwt` config, inject into core prepare_* across token/PAR/introspection/revocation | medium |
| T58 | 221 | pending | RFC 9207 issuer *validation* (parsing already done) — mix-up defense in `core/state_validation.py` | small |
| T236 | 397 | pending | jwks-cache FIFO→LRU — `move_to_end()` on read hits (`core/jwks_cache.py`, sync/aio token_validation) | small |

> Note: T57/T58/T236 also appear in their topical sections below (Remaining Feature Work, jwks-cache residue). This section is the canonical entry point for the active ralph loop.

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

GitHub Epic 11 (`epic-11` label, issues #267–#271). Deferred 2026-05-21 — labeled `deferred` on GitHub pending the conformance certification milestone (T164/#331). Still blocked on Cognito + Entra ID account setup as well. Revisit when current focus closes.

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
| T56 | 214 | pending | RP-Initiated Logout (End Session) | medium |
| T57 | 213 | pending | JWT Client Authentication (private_key_jwt / client_secret_jwt) | medium |
| T58 | 221 | pending | AS Issuer Identification (RFC 9207) — partial: response `iss` parsing done; remaining work is issuer *validation* (mix-up defense). Also a FAPI 2.0 RP gating item | small |
| T59 | 217 | pending | CIBA (Client-Initiated Backchannel Authentication) | large |
| T60 | 220 | pending | Rich Authorization Requests (RFC 9396) | medium |
| T61 | 216 | pending | Dynamic Client Registration (RFC 7591) — partial: discovery `registration_endpoint` parsed; remaining is the register-client request/response models + sync/aio functions | medium |
| T62 | 215 | pending | mTLS Client Auth and Certificate-Bound Tokens (RFC 8705) | large |
| T63 | 218 | pending | JARM (JWT Secured Authorization Response Mode) | medium |

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
| T170 | 332 | pending | Monorepo restructure — uv workspace with member packages | large | — |
| T171 | 333 | pending | py-identity-model-cli — RFC 8252 loopback CLI login tool | large | T170 |
| T172 | 334 | pending | fastapi-identity-model — FastAPI middleware for OIDC auth | large | T170 |
