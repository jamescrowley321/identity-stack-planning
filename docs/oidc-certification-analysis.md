# OIDC/OAuth 2.0 Certification Analysis for py-identity-model

**Date:** 2026-03-26
**Status:** Research Complete — Planning Required

## 1. Certification Program Overview

The **OpenID Foundation** runs a self-certification program for OpenID Connect and FAPI implementations. The process:

1. Run conformance tests against the official suite at `https://www.certification.openid.net/`
2. Collect evidence (logs/screenshots showing correct RP behavior)
3. Submit results, sign Declaration of Conformance, pay fee
4. Implementation listed on the [certified implementations page](https://openid.net/developers/certified-openid-connect-implementations/)

### Fees

| Certification Type | Member | Non-Member |
|-------------------|--------|------------|
| OpenID Connect | $700/deployment/year | $3,500/deployment/year |
| FAPI 2.0 | $1,000/deployment/year | $5,000/deployment/year |

One payment covers all profiles within a certification type for a calendar year (e.g., Basic RP + Config RP + Implicit RP all for $700 as a member).

### Market Position

Only **two Python RP libraries** are currently certified (both by Roland Hedberg):
- `pyoidc 0.9.4` — Basic, Implicit, Hybrid, Config, Dynamic RP
- `oidcrp/OidcRP 2.1.0` — Basic, Implicit, Hybrid, Config, Dynamic, Form Post RP

Getting py-identity-model certified would make it one of very few certified Python OIDC RP libraries.

---

## 2. Relevant Certification Profiles

For py-identity-model as an RP/client library:

| Profile | Test Plan | Priority | Current State |
|---------|-----------|----------|---------------|
| **Basic RP** | `oidcc-client-basic-certification-test-plan` | Must-have | Mostly covered — auth code + PKCE in open PRs |
| **Config RP** | `oidcc-client-config-certification-test-plan` | Must-have | **Already implemented** — discovery + JWKS + issuer validation |
| **Implicit RP** | `oidcc-client-implicit-certification-test-plan` | Nice-to-have | Partial — token validation works, flow not fully exercised |
| **Hybrid RP** | `oidcc-client-hybrid-certification-test-plan` | Nice-to-have | Partial — at_hash/c_hash supported via PyJWT |
| **Dynamic RP** | `oidcc-client-dynamic-certification-test-plan` | Stretch | **Missing** — Dynamic Client Registration (issue #216, no PR) |
| **Form Post RP** | `oidcc-client-formpost-*-certification-test-plan` | Optional | Not addressed |

---

## 3. Conformance Test Matrix

### 3.1 Basic RP Profile Tests (`response_type=code`)

| Test ID | What It Validates | py-identity-model Status | Action Needed |
|---------|-------------------|-------------------------|---------------|
| `rp-response_type-code` | Can perform auth code flow | PR #225 (auth-code-pkce) | Merge PR |
| `rp-id_token-issuer-mismatch` | Rejects ID token with wrong `iss` | **Implemented** | Verify with harness |
| `rp-id_token-sub` | Rejects ID token missing `sub` | **Implemented** (PR #223 adds explicit) | Merge PR |
| `rp-id_token-aud` | Rejects ID token with wrong `aud` | **Implemented** | Verify with harness |
| `rp-id_token-iat` | Rejects ID token missing `iat` | **Implemented** | Verify with harness |
| `rp-id_token-kid-absent-single-jwks` | Handles missing `kid` with single key | **Needs verification** | Test + fix if needed |
| `rp-id_token-kid-absent-multiple-jwks` | Handles missing `kid` with multiple keys | **Needs verification** | Test + fix if needed |
| `rp-id_token-sig-rs256` | Validates RS256 signature | **Implemented** | Verify with harness |
| `rp-id_token-sig-none` | Handles `alg=none` | **Implemented** (via PyJWT) | Verify with harness |
| `rp-id_token-bad-sig-rs256` | Rejects invalid RS256 signature | **Implemented** | Verify with harness |
| `rp-userinfo-bad-sub-claim` | Rejects UserInfo with mismatched `sub` | **Gap** — no explicit check | Implement sub comparison |
| `rp-nonce-invalid` | Rejects mismatched nonce | **Needs verification** | Test end-to-end |
| `rp-scope-userinfo-claims` | Requests standard scopes | **Implemented** | Verify with harness |
| `rp-token_endpoint-client_secret_basic` | Uses `client_secret_basic` auth | **Implemented** | Verify with harness |

### 3.2 Config RP Profile Tests

| Test ID | What It Validates | Status | Action Needed |
|---------|-------------------|--------|---------------|
| `rp-discovery-openid-configuration` | Retrieves discovery document | **Implemented** + compliance tests | Verify with harness |
| `rp-discovery-jwks_uri-keys` | Retrieves keys from `jwks_uri` | **Implemented** | Verify with harness |
| `rp-discovery-issuer-not-matching-config` | Detects issuer mismatch in discovery | **Implemented** (PR #236 DiscoveryPolicy) | Merge PR |
| `rp-id_token-sig-none` | Handles unsigned ID tokens | **Implemented** | Verify with harness |
| `rp-key-rotation-op-sign-key-native` | Key rotation (immediate) | **Gap** — cache doesn't support forced refresh | Implement cache TTL (#219) |
| `rp-key-rotation-op-sign-key` | Key rotation (standard) | **Gap** — same as above | Implement cache TTL (#219) |

### 3.3 Implicit RP Profile (additional tests)

| Test ID | What It Validates | Status |
|---------|-------------------|--------|
| `rp-id_token-bad-at_hash` | Rejects bad at_hash | Supported via PyJWT `verify_at_hash` |
| `rp-id_token-missing-at_hash` | Detects missing at_hash | Needs verification |
| `rp-nonce-unless-code-flow` | Nonce required in implicit/hybrid | Needs enforcement |

### 3.4 Hybrid RP Profile (additional tests)

| Test ID | What It Validates | Status |
|---------|-------------------|--------|
| `rp-id_token-bad-c_hash` | Rejects bad c_hash | Needs implementation |
| `rp-id_token-missing-c_hash` | Detects missing c_hash | Needs implementation |
| Additional signature tests (ES256, HS256) | Multi-algorithm support | Supported via PyJWT |

### 3.5 Dynamic RP Profile (additional tests)

| Test ID | What It Validates | Status |
|---------|-------------------|--------|
| `rp-discovery-webfinger-acct` | WebFinger via acct: URI | **Not implemented** |
| `rp-discovery-webfinger-url` | WebFinger via URL | **Not implemented** |
| `rp-registration-dynamic` | Dynamic Client Registration | **Not implemented** (issue #216) |
| `rp-request_uri-sig` | Signed request_uri (RS256) | Partial (JAR PR #232) |
| `rp-request_uri-unsigned` | Unsigned request_uri | Partial |
| `rp-userinfo-sig` | Signed UserInfo response | **Not implemented** |

---

## 4. Critical Gaps Summary

### Must Fix for Basic + Config RP Certification

1. **Missing `kid` handling** — Verify behavior when JWT has no `kid` and JWKS has 1 vs. multiple keys. May need fallback logic to try all matching keys.
2. **UserInfo `sub` mismatch validation** — Need explicit check that UserInfo `sub` matches ID token `sub`. Currently not enforced.
3. **Nonce validation in auth flow** — Claim type exists but end-to-end validation through the authorization flow needs verification.
4. **JWKS cache refresh / key rotation** — Issue #219 (configurable TTL cache) has no PR. Conformance tests check that the RP can handle key rotation by re-fetching JWKS when signature verification fails with cached keys.

### Required PR Merges

These open PRs contain features needed for certification:

| PR | Branch | What It Adds | Closes |
|----|--------|-------------|--------|
| #224 | `feat/base-request-response` | Foundation classes | #88 |
| #222 | `feat/http-client-di` | HTTP client DI | #117 |
| #223 | `feat/enhanced-token-validation` | Leeway, multi-issuer, sub validation | #93 |
| #225 | `feat/auth-code-pkce` | Auth code grant + PKCE | #90 |
| #211 | `feat/oauth-callback-state` | Callback state validation | #116 |
| #236 | `feat/policy-config` | DiscoveryPolicy validation | #109 |

### Not Yet Tracked (New Issues Needed)

- UserInfo `sub` vs. ID token `sub` comparison
- JWKS fallback when `kid` is absent
- Conformance test harness infrastructure
- c_hash validation (for Hybrid RP profile)
- Signed UserInfo response handling (for Dynamic RP profile)
- WebFinger discovery (for Dynamic RP profile)

---

## 5. Conformance Test Harness

### Architecture

The OpenID Foundation Conformance Suite (`gitlab.com/openid/conformance-suite`) acts as a **mock OP**. For RP testing:

- The suite exposes standard OIDC endpoints (discovery, authorize, token, userinfo, jwks)
- Per-test, it deliberately manipulates responses (wrong issuer, bad signature, missing claims, etc.)
- The RP must correctly handle or reject these manipulated responses
- Tests transition: `CONFIGURED` → `WAITING` → `FINISHED` (PASSED/FAILED/WARNING/REVIEW)

### The Library Challenge

py-identity-model is a **library**, not a web application. RP conformance tests expect a full RP with browser redirect handling. The solution is a **thin test harness** — a small FastAPI app that:

- Uses py-identity-model for discovery, JWKS, token validation, UserInfo
- Handles the HTTP redirect dance (authorize → callback → token exchange)
- Points at the conformance suite's mock OP

Reference implementations:
- `erlef/oidcc_conformance` (Elixir) — best-documented RP conformance harness
- `panva/openid-client-conformance-tests` (Node.js, archived)

### Local Development Setup

```bash
git clone https://gitlab.com/openid/conformance-suite.git
cd conformance-suite
docker-compose -f docker-compose-dev.yml up
# Available at https://localhost.emobix.co.uk:8443/
```

### API-Driven Testing

The suite has a REST API for CI automation:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/plan` | POST | Create a test plan |
| `/api/runner` | POST | Create a test instance |
| `/api/runner/{id}` | POST | Start a test module |
| `/api/info/{id}` | GET | Get test status |
| `/api/log/{id}` | GET | Get detailed test log |

Ships with `scripts/run-test-plan.py` for automated test execution.

### Proposed Harness Structure

```
py-identity-model/
└── conformance/
    ├── docker-compose.yml          # Extends conformance suite + adds our RP app
    ├── app.py                      # Thin FastAPI RP using py-identity-model
    ├── run_tests.py                # Test automation script
    ├── configs/
    │   ├── basic-rp.json           # Test plan config for Basic RP
    │   └── config-rp.json          # Test plan config for Config RP
    └── README.md                   # Setup and run instructions
```

---

## 6. Recommended Phased Plan

### Phase 1 — Merge Foundations & Close Gaps
- Review and merge PRs #224, #222, #223, #225, #211, #236
- Verify/fix missing `kid` handling in JWKS lookup
- Add explicit UserInfo `sub` vs. ID token `sub` mismatch check
- Implement JWKS cache TTL/forced refresh (issue #219)

### Phase 2 — Build Conformance Test Harness
- Create `conformance/` directory in py-identity-model
- Build thin FastAPI app as RP glue layer
- Wire to local conformance suite via Docker Compose
- Automate with the suite's `run-test-plan.py` approach
- Target: **Basic RP** + **Config RP** profiles first

### Phase 3 — Run & Certify
- Run all tests locally, fix failures iteratively
- Run on `certification.openid.net` for official results
- Collect evidence (RP logs showing rejection of bad tokens)
- Submit for certification ($700 as member / $3,500 as non-member)

### Phase 4 — Expand Profiles
- Implicit RP, Hybrid RP (at_hash/c_hash already partially supported)
- Dynamic RP (requires Dynamic Client Registration — issue #216)
- FAPI 2.0 (PR #235 exists, plus DPoP #229, PAR #230)

---

## 7. Key References

- [OpenID Foundation Certification Program](https://openid.net/certification/)
- [How to Certify Your Implementation](https://openid.net/how-to-certify-your-implementation/)
- [RP Conformance Testing](https://openid.net/certification/connect_rp_testing/)
- [Conformance Suite (GitLab)](https://gitlab.com/openid/conformance-suite)
- [Conformance Suite (GitHub mirror)](https://github.com/openid-certification/conformance-suite)
- [Certified Implementations](https://openid.net/developers/certified-openid-connect-implementations/)
- [Certification Fee Schedule](https://openid.net/certification/fees/)
- [erlef/oidcc_conformance (reference RP harness)](https://github.com/erlef/oidcc_conformance)
- [Conformance Profiles v3.0 (PDF)](https://openid.net/wordpress-content/uploads/2018/06/OpenID-Connect-Conformance-Profiles.pdf)
