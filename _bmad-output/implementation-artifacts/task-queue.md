# Task Queue

Tasks are picked up in order. Update status as you go.
Statuses: pending | in_progress | done | blocked

## terraform-provider-descope

| ID | Issue | Status | Description | Branch | Iterations |
|----|-------|--------|-------------|--------|------------|
| T1 | 74 | done | Fix flaky TestProjectAuthorization — transient API errors on project creation | fix/flaky-test-project-auth | small |
| T2 | 73 | done | Fix flaky TestProjectSettings — transient API errors during destroy | fix/flaky-test-project-settings | small |
| T3 | 72 | done | Fix flaky TestDescoperTagRoles — transient API errors on descoper creation | fix/flaky-test-descoper-tag-roles | small |
| T4 | 18 | done | Add descope_permission and descope_role standalone resources | feat/permission-role-resources | large |
| T5 | 16 | done | Add descope_sso resource for SSO configuration management | feat/sso-resource | large |
| T6 | 8 | blocked | Add descope_sso_application resource — requires enterprise license (E074106) | feat/sso-application-resource | large |
| T7 | 17 | wontfix | Add descope_jwt resource — JWT templates already managed by project resource; standalone creates dual-ownership risk | feat/jwt-resource | medium |
| T8 | 19 | wontfix | Add descope_flow resource — flows are visual artifacts better managed via console/descopecli; SDK has format bugs | feat/flow-resource | medium |
| T9 | 15 | done | Add descope_password_settings resource | feat/password-settings-resource | medium |
| T10 | 13 | done | Add descope_outbound_application resource | feat/outbound-app-resource | medium |
| T11 | 12 | done | Add descope_third_party_application resource | feat/third-party-app-resource | medium |
| T12 | 11 | done | Add descope_fga resources (Fine-Grained Authorization) | feat/fga-resources | large |
| T13 | 20 | done | Add descope_project_export data source | feat/project-export-datasource | medium |
| T29 | 26 | done | Resolve pre-existing SonarCloud code quality findings | chore/sonarcloud-findings | medium |
| T30 | 24 | done | Add Snyk CLI workflow job | ci/snyk-workflow | small |
| T31 | 22 | done | Publish fork to Terraform Registry — issue #22 closed, v1.1.0-v1.1.4 released | feat/registry-publish | medium |
| T80 | 92 | done | Add descope_list resource for IP/text allow/deny lists | feat/list-resource | medium |
| T81 | 93 | done | Descope model docs — OAuth2/OIDC spec mapping and architecture diagrams | docs/descope-model | large |

### Review Fix Tasks

| ID | Issue | Status | Description | Branch | Iterations |
|----|-------|--------|-------------|--------|------------|
| T85 | 96 | done | Fix PR #80 review findings — SSO Application (silent no-op in Update, no oidc/saml mutual exclusivity, type switching) | feat/sso-application-resource | medium |
| T86 | 97 | done | Fix PR #86 review findings — Third-party Application (orphaned resource on Create, Update wipes unmanaged fields) | feat/third-party-app-resource | medium |
| T87 | 98 | done | Fix PR #88 review findings — Project Export (nil pointer dereference, Sensitive flag) | feat/project-export-datasource | small |
| T88 | 99 | done | Fix PR #90 review findings — Snyk CI (unsupported flag, unpinned npm install) | ci/snyk-workflow | small |
| T89 | 100 | done | Fix PR #89 review findings — SonarCloud config (tools/ source scope) | chore/sonarcloud-findings | small |
| T99 | 101 | done | Fix PR #87 review findings — FGA resources (Delete docs lie, schema drift, nil pointer) | feat/fga-resources | medium |
| T100 | 102 | done | Fix PR #94 review findings — List resource (silent data drop, missing Update/Import tests) | feat/list-resource | small |

## descope-saas-starter

**Requirements:** Every feature task MUST include Playwright E2E tests (in `backend/tests/e2e/`) covering the feature's happy path and auth enforcement. Existing E2E tests MUST pass as regression. Unit tests alone are not sufficient. See PR #94 for test patterns (3-tier auth: unauthenticated, OIDC client credentials, admin session token).

**Architectural constraint (D21 — IdentityService seam):** All new API routes MUST use `IdentityService` dependency injection, not `DescopeManagementClient` directly. `IdentityService` is a pass-through class in Phase 0 (Descope feature waves) that delegates to `DescopeManagementClient`. This creates the seam that PRD 5 (Canonical Identity Domain Model) will later fill with Postgres-backed implementations. Router layer and API contracts stay unchanged. Reference: Decision D21, brainstorming-session-2026-03-29-02.md.

| ID | Issue | Status | Description | Branch | Iterations | Depends On |
|----|-------|--------|-------------|--------|------------|------------|
| T14 | 3 | done | Phase 1c: Session Management — PR #22 merged | feat/session-management | medium | — |
| T15 | 4 | done | Phase 2a: Tenant Management — PR #24 | feat/tenant-management | medium | T14 |
| T16 | 5 | done | Phase 2b: Roles and Permissions (RBAC) — PR #25 | feat/rbac | medium | T4, T15 |
| T17 | 6 | done | Phase 2c: Custom Attributes — PR #26 | feat/custom-attributes | medium | T15, T16 |
| T18 | 7 | blocked | Phase 3a: SSO Configuration — depends on T6 (enterprise license) | feat/sso-config | large | T5, T6, T16 |
| T19 | 10 | done | Phase 4a: Access Key Management — PR #27 | feat/access-key-mgmt | medium | T16 |
| T20 | 11 | blocked | Phase 4b: JWT Templates and Custom Claims — depends on T7 (blocked) | feat/jwt-templates | medium | T7, T17, T19 |
| T21 | 8 | blocked | Phase 3b: Step-Up Authentication — depends on T18 (blocked) | feat/step-up-auth | medium | T18 |
| T22 | 9 | blocked | Phase 3c: MFA Enforcement — depends on T18 (blocked) | feat/mfa-enforcement | medium | T18 |
| T23 | 12 | blocked | Phase 5a: Custom Flows — depends on T8 (blocked) | feat/custom-flows | large | T8 |
| T24 | 13 | blocked | Phase 5b: Connector Integrations — depends on T23 (blocked) | feat/connectors | large | T23 |
| T25 | 15 | blocked | Phase 5d: OIDC/SAML Application Registration — depends on T6 (blocked) | feat/oidc-saml-apps | large | T6 |
| T26 | 14 | done | Phase 5c: Admin Portal and User Management — PR #36 | feat/admin-portal | large | T16 |
| T27 | 16 | pending | Phase 6: Full Terraform Configuration | feat/full-terraform | large | all TF resources |
| T28 | 17 | pending | Phase 7: Documentation and Developer Experience | feat/docs | medium | T27 |
| T64 | 28 | done | Security headers middleware (HSTS, X-Frame-Options, CSP) — PR #37 | feat/security-headers | small | — |
| T65 | 29 | done | Rate limiting middleware for API endpoints — PR #56 | feat/rate-limiting | medium | — |
| T66 | 31 | done | Auth audit logging for sensitive operations — PR #58 | feat/audit-logging | medium | T67 |
| T67 | 30 | done | Structured logging with request correlation IDs — PR #57 | feat/structured-logging | medium | — |
| T68 | 32 | done | Enhanced health checks (Descope API, database) — PR #59 | feat/health-checks | small | — |
| T69 | 33 | done | Descope API retry logic with exponential backoff — PR #60 | feat/retry-logic | medium | — |
| T70 | 34 | blocked | E2E testing framework (Playwright) — superseded by T84/issue #55 | test/e2e-framework | large | — |
| T71 | 35 | pending | CI/CD pipeline with automated deployment | ci/deployment-pipeline | medium | T84 |
| T72 | 38 | done | Document-Level Authorization with FGA (ReBAC) — PR #61 | feat/fga-rebac | large | T12, T16 |
| T73 | 39 | done | RBAC Enhancement — Hierarchical Roles and Permission Inheritance — PR #71 | feat/rbac-hierarchy | medium | T16 |
| T74 | 40 | done | Social Login Integration (Google, GitHub) — PR #72 | feat/social-login | medium | — |
| T75 | 41 | done | Passkey / WebAuthn Authentication — PR #73 | feat/passkeys | medium | — |
| T80 | 51 | done | Tailwind CSS v4 + shadcn/ui Foundation | feat/shadcn-ui | medium | — |
| T81 | 52 | done | App Shell — Sidebar, Header, Navigation, Dark Mode | feat/app-shell | medium | T80 |
| T82 | 53 | done | Migrate Dashboard Page to shadcn/ui | feat/migrate-dashboard | medium | T81 |
| T83 | 54 | done | Migrate Remaining Pages to shadcn/ui | feat/migrate-pages | large | T82 |
| T84 | 55 | done | Playwright E2E Tests (Python) for UI and API — PR #94 merged, PR #122 fixed session bugs | test/playwright-e2e | large | T81 |
| T76 | 42 | deprioritized | Magic Link Authentication for User Invitations | feat/magic-links | medium | — |
| T77 | 43 | deprioritized | Step-Up Authentication for Sensitive Operations | feat/step-up-auth | medium | T34 |
| T78 | 44 | deprioritized | Descope Audit Trail Integration | feat/audit-trail | medium | T67 |
| T79 | 45 | deprioritized | JWT Template Customization Demo | feat/jwt-templates | medium | — |

### Review Fix Tasks — Phased PRs (re-reviewed 2026-03-27)

| ID | Issue | Status | Description | Branch | PR | Iterations | Depends On |
|----|-------|--------|-------------|--------|----|------------|------------|
| T90 | | done | Fix PR #24 review findings — Tenant Mgmt (unauth'd creation, empty mgmt key, bare except, no tenant membership check, httpx per-call) | feat/tenant-management | 24 | medium | — |
| T91 | | done | Fix PR #25 review findings — RBAC (admin role escalation, leaked API errors, unvalidated role_names) | feat/rbac | 25 | medium | T90 |
| T92 | | done | Fix PR #26 review findings — Custom Attrs (no tenant attr allowlist, silent error swallowing, unhandled API errors, sub/loginId mapping) | feat/custom-attributes | 26 | medium | T91 |
| T93 | | done | Fix PR #27 review findings — Access Keys (TOCTOU, no name validation, negative expire_time, role escalation via keys, leaked API errors) | feat/access-key-mgmt | 27 | medium | T92 |
| T94 | | done | Fix PR #36 review findings — Admin Portal (cross-tenant IDOR on deactivate/remove, no email validation, admin→owner escalation, global delete_user) | feat/admin-portal | 36 | medium | T93 |

### Review Fix Tasks — Standalone PRs

| ID | Issue | Status | Description | Branch | PR | Iterations | Depends On |
|----|-------|--------|-------------|--------|----|------------|------------|
| T95 | | done | Fix PR #37 review findings — Security Headers (case-sensitive env check, CSP bypass via env var) | feat/security-headers | 82 | small | — |

### Review Fix Tasks — Cross-Cutting PRs (re-reviewed 2026-03-27)

| ID | Issue | Status | Description | Branch | PR | Iterations | Depends On |
|----|-------|--------|-------------|--------|----|------------|------------|
| T96 | | done | Fix PR #56 review findings — Rate Limiting (proxy IP keying, middleware ordering, hardcoded Retry-After) | feat/rate-limiting | 56 | medium | T94 |
| T97 | | done | Fix PR #57 review findings — Structured Logging (health check info leak, stale degraded cache, race condition, import-time env vars) | feat/structured-logging | 57 | medium | T96 |
| T98 | | done | Fix PR #58 review findings — Audit Logging (X-Forwarded-For spoofing, no failure audit, PII in logs) | feat/audit-logging | 58 | medium | T97 |
| T117 | | done | Fix PR #59 review findings — Health Checks (SSRF via DESCOPE_BASE_URL, cache race condition, degraded cache TTL) | feat/health-checks | 59 | medium | T97 |
| T118 | | done | Fix PR #60 review findings — Retry Logic (httpx per retry attempt, non-idempotent retries, env var crash) | feat/retry-logic | 60 | medium | T97 |
| T119 | | done | Fix PR #61 review findings — FGA/ReBAC (orphaned FGA relation, cross-tenant FGA bypass, partial cleanup failure, cross-tenant sharing) | feat/fga-rebac | 61 | medium | T118 |

## py-identity-model

**Requirements:** Every feature task MUST include integration tests (in `src/tests/integration/`) and usage examples (in `examples/`). Unit tests alone are not sufficient.

| ID | Issue | Status | Description | Branch | Iterations |
|----|-------|--------|-------------|--------|------------|
| T32 | 116 | done | Implement OAuth/OIDC authorization callback state validation | feat/oauth-callback-state | medium |
| T33 | 117 | done | Add Dependency Injection Support for HTTP Client Management | feat/http-client-di | medium |
| T34 | 93 | done | Enhanced Token Validation Features | feat/enhanced-token-validation | medium |
| T35 | 88 | done | Create Base Request/Response Classes | feat/base-request-response | large |
| T36 | 90 | done | Implement Authorization Code Grant with PKCE | feat/auth-code-pkce | large |
| T37 | 16 | done | Introspection | feat/introspection | medium |
| T38 | 17 | done | Revocation | feat/revocation | medium |
| T39 | 19 | done | Refresh | feat/refresh | medium |
| T40 | 94 | done | Implement DPoP (Demonstrating Proof of Possession) | feat/dpop | large |
| T41 | 95 | done | Implement Pushed Authorization Requests (PAR) | feat/par | large |
| T42 | 96 | done | Implement JWT Secured Authorization Request (JAR) | feat/jar | large |
| T43 | 91 | done | Implement Device Authorization Grant (RFC 8628) | feat/device-auth-grant | large |
| T44 | 92 | done | Implement Token Exchange (RFC 8693) | feat/token-exchange | large |
| T45 | 97 | done | FAPI 2.0 Security Profile Compliance | feat/fapi2 | large |
| T46 | 109 | done | Architecture Improvements: Policy-Based Config | feat/policy-config | large |
| T47 | 112 | done | Add Performance Benchmarking Tests | test/performance-benchmarks | medium |
### Review Fix Tasks

| ID | Issue | Status | Description | Branch | PR | Iterations | Depends On |
|----|-------|--------|-------------|--------|----|------------|------------|
| T101 | | done | Fix PR #211 review findings — OAuth Callback State (TypeError on None state/URL) | feat/oauth-callback-state | 211 | small | — |
| T102 | | done | Fix PR #222 review findings — HTTP Client DI (use-after-close, ignored params) | feat/http-client-di | 222 | small | T101 |
| T103 | | done | Fix PR #223 review findings — Enhanced Token Validation (leeway dropped, empty issuer fails open) | feat/enhanced-token-validation | 223 | medium | T102 |
| T104 | | done | Fix PR #224 review findings — Base Request/Response (use-after-close, error leaks, CI overlap) | feat/base-request-response | 224 | small | T103 |
| T105 | | done | Fix PR #225 review findings — Auth Code PKCE (param injection, empty callback success) | feat/auth-code-pkce | 225 | medium | T104 |
| T106 | | done | Fix PR #226 review findings — Introspection (missing __all__ exports, no async tests) | feat/introspection | 226 | small | T105 |
| T107 | | done | Fix PR #227 review findings — Revocation (missing __all__, dead try/except, no async tests) | feat/revocation | 227 | small | T106 |
| T108 | | done | Fix PR #228 review findings — Refresh (no async tests, weak test assertions) | feat/refresh | 228 | small | T107 |
| T109 | | done | Fix PR #229 review findings — DPoP (htu query/fragment violation RFC 9449, no sig verify tests) | feat/dpop | 229 | medium | T108 |
| T110 | | done | Fix PR #230 review findings — PAR (client_id double-sent, missing required field validation) | feat/par | 230 | medium | T109 |
| T111 | | done | Fix PR #232 review findings — JAR (extra_claims override, missing kid header) | feat/jar | 232 | medium | T110 |
| T112 | | done | Fix PR #233 review findings — Device Auth (no async tests, missing required field validation) | feat/device-auth-grant | 233 | small | T111 |
| T113 | | done | Fix PR #234 review findings — Token Exchange (client_id double-sent, actor_token_type validation) | feat/token-exchange | 234 | medium | T112 |
| T114 | | done | Fix PR #235 review findings — FAPI 2.0 (crash on failed discovery, empty code_challenge bypass) | feat/fapi2 | 235 | medium | T113 |
| T115 | | done | Fix PR #236 review findings — Policy Config (unenforced policy flags, no URL scheme pre-flight) | feat/policy-config | 236 | medium | T114 |
| T116 | | done | Fix PR #237 review findings — Perf Benchmarks (expiring fixture, wrong benchmark layer, no assertions) | test/performance-benchmarks | 237 | small | T115 |

### Quality Gates (code quality audit findings — no new features)

Chained PRs: each task branches from the previous task's branch. Run via `ralph-prompts/pim-quality-gates.md`.

| ID | Issue | Status | Description | Branch | Base Branch | Size |
|----|-------|--------|-------------|--------|-------------|------|
| Q1 | 289 | pending | Remove dead code: `_current_env_file` global, empty `setup_test_environment` fixture | chore/remove-dead-code | chore/code-quality-audit | trivial |
| Q2 | 285 | pending | Delete 10 redundant import smoke tests across 5 files | chore/delete-import-smoke-tests | chore/remove-dead-code | small |
| Q3 | 288 | pending | Extract `DEFAULT_OPTIONS` to shared frozen fixture, fix `cache_info[0]` → `.hits` | chore/fix-mutable-test-state | chore/delete-import-smoke-tests | small |
| Q4 | 287 | pending | Consolidate cross-file test duplicates (test_jwks → test_json_web_key, expired/benchmark dedup) | chore/consolidate-test-duplicates | chore/fix-mutable-test-state | small |
| Q5 | 284 | pending | Move ~30 constructor/model tests from integration to unit directory | refactor/reclassify-integration-tests | chore/consolidate-test-duplicates | medium |
| Q6 | 286 | pending | Fix 3 no-op claims validator tests to prove invocation | fix/noop-validator-tests | refactor/reclassify-integration-tests | small |
| Q7 | 290 | pending | Fix 3×3 retry cascade in integration conftest | fix/retry-cascade | fix/noop-validator-tests | small |
| Q8 | 291 | pending | Add config validation with clear missing .env error, create .env.example | chore/config-validation | fix/retry-cascade | small |
| Q9 | 292 | pending | Strengthen ~15 truthy-only assertions to check specific values | chore/strengthen-assertions | chore/config-validation | medium |
| Q10 | 293 | pending | Add async integration tests for aio discovery/JWKS, extract cleanup fixture | test/async-integration | chore/strengthen-assertions | medium |

### Integration Test Chain (proves RFC features work against live OIDC server)

All 16 feature PRs (#211-#237) merged to main 2026-03-30. Node-oidc-provider fixture merged (PR #274).

| ID | Issue | Status | Description | Branch | PR | Size | Depends |
|----|-------|--------|-------------|--------|-----|------|---------|
| T120 | | done | Build node-oidc-provider test fixture (provider.js, Dockerfile, docker-compose.test.yml, static clients, in-memory adapter, devInteractions, all RFC features enabled) | test/node-oidc-fixture | 274 | medium | T116 |
| T121 | | in_progress | Integration tests: Core flows (Auth Code + PKCE, Enhanced Token Validation, Refresh Token Grant) against node-oidc-provider | test/integration-core-flows-v2 | 281 | medium | T120 |
| T122 | | in_progress | Integration tests: Token management (Introspection RFC 7662, Revocation RFC 7009) against node-oidc-provider | test/integration-token-mgmt | | medium | T120 |
| T123 | | pending | Integration tests: Advanced request patterns (DPoP RFC 9449, PAR RFC 9126, JAR RFC 9101) against node-oidc-provider | test/integration-advanced-requests | | large | T120 |
| T124 | | pending | Integration tests: Alternative grants (Device Authorization RFC 8628, Token Exchange RFC 8693) against node-oidc-provider | test/integration-alt-grants | | medium | T120 |
| T125 | | pending | Integration tests: FAPI 2.0 Security Profile against node-oidc-provider | test/integration-fapi2 | | medium | T120 |
| T126 | | pending | Document Duende IdentityServer integration test gaps — which RFC features the existing .NET fixture cannot test, feature comparison matrix vs node-oidc-provider, migration/deprecation recommendation | docs/identityserver-gaps | | small | T120 |
| T128 | | pending | Wire existing integration tests to run against node-oidc-provider: create .env.node-oidc config file, add conftest parameterization (--provider=ory\|node-oidc\|local), update docker-compose.test.yml to include node-oidc-provider service, add Makefile target `test-integration-node-oidc`, verify all existing integration tests (discovery, JWKS, token_client, token_validation, userinfo) pass against the fixture | test/existing-integration-node-oidc | | medium | T120 |
| T127 | | pending | Codebase cleanup: eliminate TYPE_CHECKING guards (direct import DiscoveryPolicy — no circular dep), move lazy stdlib imports to top-level (Any in models.py:257, base64 in models.py:327, inspect in token_validation_logic.py:162, redact_token in token_validation_logic.py:191), fix inconsistent `from ..core.` imports in token_validation_logic.py, refactor validate_url_scheme cascade into single boolean, extract duplicate _log_retry/_get_retry_params from sync+async http_client to core/http_utils.py, replace fragile string-matching in handle_discovery_error with exception subclasses | refactor/codebase-cleanup | | medium | T126 |

| T48 | 83 | pending | Create Comprehensive API Documentation | docs/api-docs | large |
| T49 | 39 | pending | Okta Example | feat/okta-example | small |
| T50 | 38 | pending | Auth0 Example | feat/auth0-example | small |
| T51 | 37 | pending | Cognito Example | feat/cognito-example | small |
| T52 | 36 | pending | Google Example | feat/google-example | small |
| T53 | 35 | pending | Azure AD Example | feat/azure-ad-example | small |
| T54 | 33 | pending | Flask Middleware Example | feat/flask-middleware-example | small |
| T55 | 219 | pending | Discovery Cache with Configurable TTL | feat/discovery-cache-ttl | medium |
| T56 | 214 | pending | RP-Initiated Logout (End Session) | feat/rp-logout | medium |
| T57 | 213 | pending | JWT Client Authentication (private_key_jwt / client_secret_jwt) | feat/jwt-client-auth | medium |
| T58 | 221 | pending | AS Issuer Identification (RFC 9207) | feat/issuer-identification | small |
| T59 | 217 | pending | CIBA (Client-Initiated Backchannel Authentication) | feat/ciba | large |
| T60 | 220 | pending | Rich Authorization Requests (RFC 9396) | feat/rar | medium |
| T61 | 216 | pending | Dynamic Client Registration (RFC 7591) | feat/dynamic-registration | medium |
| T62 | 215 | pending | mTLS Client Auth and Certificate-Bound Tokens (RFC 8705) | feat/mtls | large |
| T63 | 218 | pending | JARM (JWT Secured Authorization Response Mode) | feat/jarm | medium |
