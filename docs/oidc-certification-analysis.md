# OIDC/OAuth 2.0 Certification Analysis for py-identity-model

**Date:** 2026-03-26 · **Updated:** 2026-07-07
**Status:** ✅ **Certified (Basic + Config + Form Post Basic RP)** — expanding to next profiles

> ## ✅ Certification achieved — 2 July 2026
>
> `py-identity-model 3.1.0` is **OpenID Certified** by the OpenID Foundation as a
> Relying Party for the **Basic RP**, **Config RP**, and **Form Post Basic RP**
> profiles, published to the
> [Certified OpenID Relying Parties](https://openid.net/certification/certified-openid-relying-parties-profiles/)
> and [Certified OpenID Connect Implementations](https://openid.net/certification/certified-openid-connect-implementations/)
> lists. This makes it one of only a handful of certified Python OIDC RP libraries
> (alongside Roland Hedberg's `pyoidc` / `oidcrp`).
>
> Phases 1–3 of the plan in §6 are **complete**. The fee-waiver step
> (py-identity-model #331) was resolved via the OIDF Open-Source Project
> Certification Policy. Current focus is **§6 Phase 4 — expand profiles**
> (see §8, added 2026-07-07). Tracking: py-identity-model #242.

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

Before py-identity-model, only **two Python RP libraries** were certified (both by Roland Hedberg):
- `pyoidc 0.9.4` — Basic, Implicit, Hybrid, Config, Dynamic RP
- `oidcrp/OidcRP 2.1.0` — Basic, Implicit, Hybrid, Config, Dynamic, Form Post RP

**py-identity-model 3.1.0 joined this list on 2 July 2026** (Basic + Config + Form Post Basic RP) — one of the very few certified Python OIDC RP libraries.

---

## 2. Relevant Certification Profiles

For py-identity-model as an RP/client library (state as of 2026-07-07):

| Profile | Test Plan | Current State |
|---------|-----------|---------------|
| **Basic RP** | `oidcc-client-basic-certification-test-plan` | ✅ **Certified** (2 Jul 2026, v3.1.0) |
| **Config RP** | `oidcc-client-config-certification-test-plan` | ✅ **Certified** (2 Jul 2026, v3.1.0) |
| **Form Post Basic RP** | `oidcc-client-formpost-basic-certification-test-plan` | ✅ **Certified** (2 Jul 2026, v3.1.0) |
| **Dynamic RP** | `oidcc-client-dynamic-certification-test-plan` | ⏳ Next — needs RFC 7591/7592 registration (#216) |
| **RP-Initiated Logout RP** | `oidcc-client-rp-initiated-logout-certification-test-plan` | ⏳ Next — `end_session` URL builder (#214) |
| **Back-Channel Logout RP** | `oidcc-client-backchannel-logout-certification-test-plan` | ⏳ Next — `validate_logout_token` (#442) |
| **Hybrid RP** | `oidcc-client-hybrid-certification-test-plan` | ❌ Dropped — deprecated in OAuth 2.1 |
| **Implicit RP** | `oidcc-client-implicit-certification-test-plan` | ❌ Dropped — deprecated in OAuth 2.1 |
| **Front-Channel Logout RP** | `oidcc-client-frontchannel-logout-certification-test-plan` | ❌ Dropped — browser-iframe; not applicable to a server-side library |
| **Session Management RP** | `oidcc-client-session-management-certification-test-plan` | ❌ Dropped — requires `check_session_iframe` + browser `postMessage` |

See **§8** for the detailed next-profiles plan, epic mapping, and the core-library / middleware split.

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

### Phase 1 — Merge Foundations & Close Gaps ✅ DONE
- Review and merge PRs #224, #222, #223, #225, #211, #236
- Verify/fix missing `kid` handling in JWKS lookup
- Add explicit UserInfo `sub` vs. ID token `sub` mismatch check
- Implement JWKS cache TTL/forced refresh (issue #219 — closed)

### Phase 2 — Build Conformance Test Harness ✅ DONE
- Create `conformance/` directory in py-identity-model
- Build thin FastAPI app as RP glue layer
- Wire to local conformance suite via Docker Compose
- Automate with the suite's `run-test-plan.py` approach
- Target: **Basic RP** + **Config RP** profiles first

### Phase 3 — Run & Certify ✅ DONE (2 Jul 2026)
- Ran all tests on `certification.openid.net`; collected RP-side evidence logs
- Submitted Basic + Config + Form Post Basic; fee waived via the OIDF
  Open-Source Project Certification Policy (#331)
- **Certified `py-identity-model 3.1.0`** — published to the OIDF RP lists

### Phase 4 — Expand Profiles ⏳ IN PROGRESS
Now the active phase. Full breakdown, epic mapping, and the core-library /
middleware split are in **§8** below. Summary: pursue **Dynamic RP** (#216),
**RP-Initiated Logout** (#214), and **Back-Channel Logout** (#442); keep
**Hybrid**, **Implicit**, **Front-Channel Logout**, and **Session Management**
dropped. FAPI 2.0 remains a separate track (its own certification type/fee).

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

---

## 8. Next Profiles Plan (Phase 4) — added 2026-07-07

With Basic + Config + Form Post Basic RP certified, the next expansion targets are
below. Each maps to an existing cross-language spec epic in this repo and to a
py-identity-model tracking issue. **Certification is version-pinned** — the current
listing is `3.1.0`; each new profile set requires a fresh hosted run + submission
against a new deployment name.

### 8.1 Core-library / middleware split

The logout profiles are **not** purely a token-library concern. We split them:

- **`py-identity-model` (core lib)** owns the protocol *primitives*: `validate_logout_token()`,
  `build_end_session_url()`, the RFC 7591/7592 dynamic-registration client, and the new
  discovery metadata fields.
- **`fastapi-identity-model` (middleware package)** owns the *HTTP surface & session lifecycle*:
  the `backchannel_logout_uri` POST receiver, the RP-initiated logout redirect, and
  session termination keyed by `sid`/`sub`. This package is on the open branch
  **`feat/fastapi-identity-model-package`** (`packages/fastapi-identity-model/`) — the
  logout endpoint work should land there, consuming the core-lib primitives.

The OIDF RP certification itself continues to be driven by the disposable `conformance/`
harness (it exercises whichever primitives a profile needs); the middleware package is a
downstream consumer, not the certified artifact.

### 8.2 Target profiles

| Profile | Epic (this repo) | Issue | Core-lib work | Middleware work |
|---|---|---|---|---|
| **Dynamic RP** | `epic-0e-spec-dynamic-registration.md` (S.9) | #216 | RFC 7591 register + RFC 7592 read/update; WebFinger discovery; `registration_endpoint` (already parsed) | — |
| **RP-Initiated Logout RP** | `epic-0e-spec-logout.md` (S.10a) | #214 | `end_session_endpoint` discovery field + `build_end_session_url()` + `state` round-trip | trigger logout redirect |
| **Back-Channel Logout RP** | `epic-0e-spec-logout.md` (S.10b) | #442 | `validate_logout_token()` (events/sid/sub/no-nonce/`typ`); `backchannel_logout_*` discovery fields | `backchannel_logout_uri` receiver + session kill by sid/sub |

### 8.3 Dropped (documented decisions)

- **Hybrid RP** — stays dropped (#242): deprecated in OAuth 2.1, not worth the investment;
  code + PKCE is the path forward. **Implicit RP** likewise dropped.
- **Front-Channel Logout RP** — stays dropped. It is a browser-iframe mechanism; only a
  thin `iss`/`sid` query-param validation helper is library-appropriate, and the actual
  logout is app/session-store level. Not worth a certification push.
- **Session Management RP** — stays dropped. Requires `check_session_iframe` and browser
  `postMessage` polling; a server-side Python library has no browser to run it in, so it
  is **not certifiable** here.

### 8.4 Spec readiness

`epic-0e-spec-logout.md` (S.10a/S.10b) and `epic-0e-spec-dynamic-registration.md` (S.9)
already define the cross-language spec + conformance tests for all three active profiles —
no new spec story is needed before implementation.

### 8.5 Suggested sequence

1. **Dynamic RP** (#216) and **Back-Channel Logout** (#442) — highest fit; both add
   genuinely useful capabilities beyond certification.
2. **RP-Initiated Logout** (#214) — small, complements Back-Channel for a full logout story.

### 8.6 Out of certification scope (not a cert profile)

- **Device flow (RFC 8628)** and the **CLI product** (py-identity-model #333) are **not**
  certification targets — the OIDF OIDC RP suite has no device-flow test module, and no
  vendor CLI is OIDF-certified as an RP. Device flow is already implemented in the library
  (#91); the CLI inherits credibility from the library cert, not its own. (CIBA, #217, is
  separate — it has FAPI-CIBA cert; RFC 8628 does not.)
