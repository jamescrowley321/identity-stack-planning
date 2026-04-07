# Task Queue

Tasks are picked up in order. Update status as you go.
Statuses: pending | in_progress | done | blocked

## terraform-provider-descope

All tasks complete except blocked/wontfix. Releases v1.1.0-v1.1.4 published.

| ID | Issue | Status | Description |
|----|-------|--------|-------------|
| T6 | 8 | blocked | Add descope_sso_application resource — requires enterprise license (E074106) |

## identity-stack

All prior phases complete (T14-T26, T64-T75, T80-T84, T90-T98, T117-T119 — all done/merged).

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

All feature tasks (T32-T47) complete. All review fixes (T101-T116) complete — all 16 PRs #211-#237 merged 2026-03-30.

### Integration Test Chain (node-oidc-provider)

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T120 | | done | Build node-oidc-provider test fixture | medium | T116 |
| T121 | | done | Integration tests: Core flows (Auth Code + PKCE, Token Validation, Refresh) — PR #281 merged | medium | T120 |
| T122 | | done | Integration tests: Token management (Introspection, Revocation) — PR #299 merged | medium | T120 |
| T123 | | done | Integration tests: Advanced request patterns (DPoP, PAR, JAR) — test_dpop_par_jar.py exists | large | T120 |
| T124 | | done | Integration tests: Alternative grants (Device Auth, Token Exchange) — test_device_token_exchange.py exists | medium | T120 |
| T125 | | done | Integration tests: FAPI 2.0 Security Profile — test_fapi_compliance.py exists | medium | T120 |
| T126 | | in_progress | Integration test fixture gap analysis — PR #306 open | small | T120 |

### IdentityServer Fixture Expansion

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T130 | | pending | Enable introspection + revocation in IdentityServer fixture | small | T126 |
| T131 | | pending | Add public PKCE client + enforce PKCE in IdentityServer fixture | small | T126 |
| T132 | | pending | Run existing integration tests against IdentityServer (expand provider matrix) | medium | T130, T131 |

### Cloud Provider Integration Tests (cassette-based)

| ID | Issue | Status | Description | Size | Depends |
|----|-------|--------|-------------|------|---------|
| T133 | | pending | Cassette test infrastructure — pytest-recording for httpx, live/replay mode, per-provider env templates | medium | T126 |
| T134 | | pending | AWS Cognito integration tests — discovery, token validation, `cognito:groups` claims, non-standard discovery URL | medium | T133 |
| T135 | | pending | Microsoft Entra ID integration tests — v2.0 discovery, multi-tenant, `tid`/`oid` claims | medium | T133 |
| T136 | | pending | Auth0 integration tests — discovery, token validation, `permissions`/`org_id` claims, custom domains | medium | T133 |
| T137 | | pending | Nightly CI workflow — scheduled run against live providers, auto-create issues on drift | small | T134, T135, T136 |

### Remaining Feature Work

| ID | Issue | Status | Description | Size |
|----|-------|--------|-------------|------|
| T48 | 83 | pending | Create Comprehensive API Documentation | large |
| T49 | 39 | pending | Okta Example | small |
| T50 | 38 | pending | Auth0 Example | small |
| T51 | 37 | pending | Cognito Example | small |
| T52 | 36 | pending | Google Example | small |
| T53 | 35 | pending | Azure AD Example | small |
| T54 | 33 | pending | Flask Middleware Example | small |
| T55 | 219 | pending | Discovery Cache with Configurable TTL | medium |
| T56 | 214 | pending | RP-Initiated Logout (End Session) | medium |
| T57 | 213 | pending | JWT Client Authentication (private_key_jwt / client_secret_jwt) | medium |
| T58 | 221 | pending | AS Issuer Identification (RFC 9207) | small |
| T59 | 217 | pending | CIBA (Client-Initiated Backchannel Authentication) | large |
| T60 | 220 | pending | Rich Authorization Requests (RFC 9396) | medium |
| T61 | 216 | pending | Dynamic Client Registration (RFC 7591) | medium |
| T62 | 215 | pending | mTLS Client Auth and Certificate-Bound Tokens (RFC 8705) | large |
| T63 | 218 | pending | JARM (JWT Secured Authorization Response Mode) | medium |
