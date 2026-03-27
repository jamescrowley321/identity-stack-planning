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
| T31 | 22 | blocked | Publish fork to Terraform Registry — requires manual registry signup, GPG key setup, and secrets configuration | feat/registry-publish | medium |
| T80 | 92 | done | Add descope_list resource for IP/text allow/deny lists | feat/list-resource | medium |
| T81 | 93 | done | Descope model docs — OAuth2/OIDC spec mapping and architecture diagrams | docs/descope-model | large |

### Review Fix Tasks

| ID | Issue | Status | Description | Branch | Iterations |
|----|-------|--------|-------------|--------|------------|
| T85 | 96 | pending | Fix PR #80 review findings — SSO Application (silent no-op in Update, no oidc/saml mutual exclusivity, type switching) | feat/sso-application-resource | medium |
| T86 | 97 | pending | Fix PR #86 review findings — Third-party Application (orphaned resource on Create, Update wipes unmanaged fields) | feat/third-party-app-resource | medium |
| T87 | 98 | pending | Fix PR #88 review findings — Project Export (nil pointer dereference, Sensitive flag) | feat/project-export-datasource | small |
| T88 | 99 | pending | Fix PR #90 review findings — Snyk CI (unsupported flag, unpinned npm install) | ci/snyk-workflow | small |
| T89 | 100 | pending | Fix PR #89 review findings — SonarCloud config (tools/ source scope) | chore/sonarcloud-findings | small |

## descope-saas-starter

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
| T71 | 35 | pending | CI/CD pipeline with automated deployment | ci/deployment-pipeline | medium | T70 |
| T72 | 38 | done | Document-Level Authorization with FGA (ReBAC) — PR #61 | feat/fga-rebac | large | T12, T16 |
| T73 | 39 | in_progress | RBAC Enhancement — Hierarchical Roles and Permission Inheritance | feat/rbac-hierarchy | medium | T16 |
| T74 | 40 | pending | Social Login Integration (Google, GitHub) | feat/social-login | medium | — |
| T75 | 41 | pending | Passkey / WebAuthn Authentication | feat/passkeys | medium | — |
| T76 | 42 | pending | Magic Link Authentication for User Invitations | feat/magic-links | medium | — |
| T77 | 43 | pending | Step-Up Authentication for Sensitive Operations | feat/step-up-auth | medium | T34 |
| T78 | 44 | pending | Descope Audit Trail Integration | feat/audit-trail | medium | T67 |
| T79 | 45 | pending | JWT Template Customization Demo | feat/jwt-templates | medium | — |
| T80 | 51 | pending | Tailwind CSS v4 + shadcn/ui Foundation | feat/shadcn-ui | medium | — |
| T81 | 52 | pending | App Shell — Sidebar, Header, Navigation, Dark Mode | feat/app-shell | medium | T80 |
| T82 | 53 | pending | Migrate Dashboard Page to shadcn/ui | feat/migrate-dashboard | medium | T81 |
| T83 | 54 | pending | Migrate Remaining Pages to shadcn/ui | feat/migrate-pages | large | T82 |
| T84 | 55 | pending | Playwright E2E Tests (Python) for UI and API | test/playwright-e2e | large | T81 |

### Review Fix Tasks — Phased PRs

| ID | Issue | Status | Description | Branch | Iterations | Depends On |
|----|-------|--------|-------------|--------|------------|------------|
| T90 | 62 | pending | Fix PR #24 review findings — systemic issues (unauth'd tenant creation, httpx pooling, error swallowing, management key, orphaned tenants) | feat/tenant-management | medium | — |
| T91 | 63 | pending | Fix PR #25 review findings — RBAC (missing backend permission enforcement, role_names validation) | feat/rbac | medium | T90 |
| T92 | 64 | pending | Fix PR #26 review findings — Custom Attributes (tenant attribute allowlist) | feat/custom-attributes | small | T91 |
| T93 | 65 | pending | Fix PR #27 review findings — Access Keys (TOCTOU race, role validation, expire_time) | feat/access-key-mgmt | medium | T92 |
| T94 | 66 | pending | Fix PR #36 review findings — Admin Portal (cross-tenant member ops, tenant_id from JWT) | feat/admin-portal | medium | T91 |

### Review Fix Tasks — Cross-Cutting PRs

| ID | Issue | Status | Description | Branch | Iterations | Depends On |
|----|-------|--------|-------------|--------|------------|------------|
| T95 | 67 | pending | Fix middleware issues — rate limit ordering, health check cache, Retry-After | feat/rate-limiting | medium | T94 |
| T96 | 68 | pending | Fix PR #58 review findings — Audit Logging (audit on failure, X-Forwarded-For spoofing) | feat/audit-logging | medium | T95 |
| T97 | 69 | pending | Fix PR #60 review findings — Retry Logic (httpx per retry attempt, status validation) | feat/retry-logic | medium | T95 |
| T98 | 70 | pending | Fix PR #61 review findings — FGA/ReBAC (FGA relation orphan, revoke_share skips owner) | feat/fga-rebac | medium | T94 |

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
