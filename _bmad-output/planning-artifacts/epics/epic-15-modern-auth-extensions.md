---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '15'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-14-improvements-spike.md
---

# Epic 15: Modern Auth Protocol Extensions

**Goal:** Extend identity-model beyond core OIDC/OAuth2 to cover the modern auth protocol surface that developers actually need — informed by gaps identified in GoTrue, Supabase Auth, and market demand.

## Overview

Core OIDC/OAuth2 (Epics 1-6) covers the foundation. But real-world auth clients need more: refresh token management, device flows for CLI/IoT, Ed25519 signatures, and emerging standards like passkeys. This epic adds the protocol extensions that differentiate a complete library from a spec-compliant but incomplete one.

These capabilities were identified by analyzing Supabase Auth, Netlify GoTrue, and community demand signals across the identity ecosystem.

---

### Story 15.1: Refresh Token Management

As a **developer building an app with identity-model**,
I want built-in refresh token handling,
So that I can maintain user sessions without writing token lifecycle code myself.

**Scope:**

- Automatic token refresh before expiration (configurable threshold)
- Refresh token rotation support — handle new refresh token in response ([RFC 6749 §6](https://www.rfc-editor.org/rfc/rfc6749#section-6))
- Reuse detection — detect and handle `invalid_grant` when a rotated refresh token is replayed (indicates token theft)
- Silent refresh — background refresh without interrupting user flow
- Token storage abstraction — pluggable interface for where tokens are stored (memory, secure storage, custom)
- Refresh lock — prevent concurrent refresh requests (thundering herd on multi-tab apps)
- Event callbacks — `onTokenRefreshed`, `onRefreshFailed`, `onSessionExpired`

**RFC References:**
- [RFC 6749 §6 — Refreshing an Access Token](https://www.rfc-editor.org/rfc/rfc6749#section-6)
- [RFC 6749 §5.1 — Successful Response (refresh_token field)](https://www.rfc-editor.org/rfc/rfc6749#section-5.1)
- [OAuth Security BCP §4.14 — Refresh Token Protection](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.14)

**Acceptance Criteria:**

**Given** an access token that expires in 30 seconds and a refresh threshold of 60 seconds
**When** identity-model checks token freshness
**Then** it automatically refreshes using the refresh token before the access token expires

**Given** a refresh response that includes a new refresh_token (rotation)
**When** the refresh completes
**Then** the old refresh token is discarded and the new one is stored

**Given** a refresh attempt that returns `invalid_grant` (reuse detection)
**When** the refresh fails
**Then** the `onSessionExpired` callback fires and the app can redirect to login

- [ ] **Unit test:** Mock token endpoint, verify refresh triggers at correct threshold
- [ ] **Unit test:** Verify rotation — old token replaced with new
- [ ] **Unit test:** Verify reuse detection — invalid_grant triggers session expiry callback
- [ ] **Unit test:** Verify refresh lock — concurrent refresh calls result in single request
- [ ] **Integration test:** Full refresh cycle against node-oidc-provider
- [ ] **Example:** Per-language example showing automatic refresh in a long-lived API client

---

### Story 15.2: Device Authorization Grant (RFC 8628)

As a **developer building a CLI tool or IoT device**,
I want device authorization flow support,
So that users can authenticate on a separate device (phone/browser) without typing credentials on a limited-input device.

**Scope:**

- Device Authorization Request — POST to device_authorization_endpoint with client_id and scope ([RFC 8628 §3.1](https://www.rfc-editor.org/rfc/rfc8628#section-3.1))
- Device Authorization Response — device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval ([RFC 8628 §3.2](https://www.rfc-editor.org/rfc/rfc8628#section-3.2))
- Token polling — POST to token endpoint with grant_type=urn:ietf:params:oauth:grant-type:device_code, poll at specified interval ([RFC 8628 §3.4](https://www.rfc-editor.org/rfc/rfc8628#section-3.4))
- Handle polling errors: authorization_pending, slow_down (increase interval), expired_token, access_denied ([RFC 8628 §3.5](https://www.rfc-editor.org/rfc/rfc8628#section-3.5))
- device_authorization_endpoint from discovery document

**RFC References:**
- [RFC 8628 — OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628) (all sections)

**Acceptance Criteria:**

**Given** a device client calling the device authorization endpoint
**When** the response includes device_code, user_code, and verification_uri
**Then** the library returns a structured DeviceAuthorizationResponse with all fields

**Given** an active device authorization
**When** the library polls the token endpoint and receives `authorization_pending`
**Then** it waits the specified interval and retries

**Given** polling that receives `slow_down`
**When** the next poll occurs
**Then** the interval is increased by 5 seconds per RFC 8628 §3.5

**Given** the user completes authorization on their browser
**When** the next poll occurs
**Then** the library returns the access token response

- [ ] **Unit test:** Parse device authorization response, validate all fields
- [ ] **Unit test:** Polling state machine — pending, slow_down, expired, denied, success
- [ ] **Unit test:** Interval backoff on slow_down
- [ ] **Integration test:** Full device flow against node-oidc-provider (if supported) or mock
- [ ] **Example:** CLI tool that displays user_code and verification_uri, polls until authenticated

---

### Story 15.3: Ed25519 Signature Support

As a **developer validating tokens from modern IdPs**,
I want Ed25519 (EdDSA) signature verification,
So that identity-model works with providers using next-gen signing algorithms.

**Scope:**

- Support `EdDSA` algorithm in JWT validation (Ed25519 curve specifically)
- Support `OKP` key type in JWKS parsing ([RFC 8037 §2](https://www.rfc-editor.org/rfc/rfc8037#section-2))
- JWK parameters for OKP: kty="OKP", crv="Ed25519", x (public key) ([RFC 8037 §2](https://www.rfc-editor.org/rfc/rfc8037#section-2))
- Add to supported algorithms list alongside RS256/ES256/PS256 families
- Supabase Auth already supports Ed25519 — validate interop

**RFC References:**
- [RFC 8037 — CFRG Elliptic Curves for JOSE](https://www.rfc-editor.org/rfc/rfc8037) §2 OKP Key Type, §3.1 EdDSA
- [RFC 8032 — Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)

**Acceptance Criteria:**

**Given** a JWT signed with Ed25519 and a JWKS containing an OKP key with crv=Ed25519
**When** identity-model validates the token
**Then** validation succeeds with the correct signature verification

**Given** a JWKS with kty="OKP" and crv="Ed25519"
**When** parsing the JWK set
**Then** the key is correctly parsed and usable for verification

**Given** a JWT with alg="EdDSA" but the JWKS key has kty="RSA"
**When** validation is attempted
**Then** it fails with an algorithm/key type mismatch error

- [ ] **Unit test:** Parse OKP JWK, verify key parameters
- [ ] **Unit test:** Validate Ed25519-signed JWT
- [ ] **Unit test:** Reject alg/kty mismatch (EdDSA with RSA key)
- [ ] **Integration test:** Validate token from Supabase Auth configured with Ed25519
- [ ] **Example:** Per-language example validating an Ed25519-signed token
- [ ] **Test fixture:** Add Ed25519 JWK and signed JWT to spec/test-fixtures/

---

### Story 15.4: Spike — Passkeys / WebAuthn Client Support

As a **project maintainer**,
I want to evaluate what passkey/WebAuthn support means for a protocol client library,
So that we can decide whether to add it and at what scope.

**Scope:**

Research and evaluate:

- **What's in scope for a client library?** WebAuthn is primarily a browser API + server ceremony. But the client library could handle:
  - WebAuthn assertion/attestation transport to relying party endpoints
  - Integration with OIDC providers that support passkey-based auth (e.g., conditional UI)
  - Token validation for sessions initiated via passkey
- **Market demand:** Supabase Auth #92 is their most-requested feature. Passkeys are the future of consumer auth.
- **Spec landscape:** [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/), [FIDO2 CTAP](https://fidoalliance.org/specifications/), [Passkey specs](https://passkeys.dev/)
- **What do competitors offer?** Does Duende IdentityModel handle any WebAuthn? Do any OIDC client libraries?
- **Scope decision:** Full WebAuthn RP library? Thin integration helpers? Just ensure token validation works for passkey-initiated sessions?

**Acceptance Criteria:**

**Given** the research spike
**When** reviewed
**Then** there's a clear "do it / defer it / skip it" recommendation with scope definition

- [ ] **Deliverable:** Research report with scope recommendation
- [ ] **Deliverable:** Competitive analysis of passkey support in identity client libraries
- [ ] **Recommendation:** If "do it", rough story breakdown and effort estimate

---

### Story 15.5: Spike — MFA Client Flow Support

As a **project maintainer**,
I want to evaluate what MFA support means for a protocol client library,
So that we can decide whether to add TOTP/SMS challenge-response helpers.

**Scope:**

Research and evaluate:

- **What's in scope?** MFA is server-orchestrated, but client libraries can help with:
  - Handling `mfa_required` error responses from token endpoint
  - TOTP code submission as part of step-up authentication
  - MFA challenge-response flows (Supabase pattern: `challenges` → `verify`)
  - [RFC 9470 — OAuth Step-Up Authentication Challenge](https://www.rfc-editor.org/rfc/rfc9470) support
- **Supabase pattern:** `auth.mfa.enroll()` → `auth.mfa.challenge()` → `auth.mfa.verify()` — is this a library concern or app concern?
- **OIDC ACR/AMR claims:** Validate `acr` (authentication context class) and `amr` (authentication methods) claims in ID tokens to determine MFA status

**RFC References:**
- [RFC 9470 — Step-Up Authentication Challenge Protocol](https://www.rfc-editor.org/rfc/rfc9470)
- OIDC Core 1.0 §2 — `acr_values` request parameter, §5.1 — `acr` and `amr` claims

**Acceptance Criteria:**

**Given** the research spike
**When** reviewed
**Then** there's a clear recommendation on MFA scope for a client library

- [ ] **Deliverable:** Research report with scope recommendation
- [ ] **Deliverable:** Analysis of RFC 9470 step-up auth relevance
- [ ] **Recommendation:** If "do it", story breakdown focusing on acr/amr validation + step-up challenge handling

---

### Story 15.6: Spike — Anonymous-to-Authenticated Upgrade Flow

As a **project maintainer**,
I want to evaluate anonymous auth session upgrade patterns,
So that we can decide if the client library should support this increasingly common flow.

**Scope:**

Research and evaluate:

- **Pattern:** User starts anonymous (no credentials), app issues a temporary token, user later signs up/links an identity, anonymous session is upgraded to authenticated
- **Supabase demand:** One of their most-requested features (anonymous auth → account linking)
- **Client library role:** Is this a token exchange pattern (RFC 8693)? A session upgrade? A provider-specific flow?
- **Standards mapping:** Does this map to any existing RFC or OIDC flow, or is it purely provider-specific?
- **Scope decision:** Should identity-model provide helpers for this, or is it out of scope?

**Acceptance Criteria:**

**Given** the research spike
**When** reviewed
**Then** there's a clear recommendation on whether this is a library concern

- [ ] **Deliverable:** Research report analyzing the pattern across providers
- [ ] **Recommendation:** Do it / defer / skip with rationale

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 15.1 (Refresh Tokens) | Epic 1-4 Core Tier (token client exists) |
| 15.2 (Device Flow) | Epic 1-4 Core Tier (token endpoint client exists) |
| 15.3 (Ed25519) | Epic 0 spec, Epic 1-4 (JWKS/JWT validation exists) |
| 15.4 (Passkeys Spike) | None — research only |
| 15.5 (MFA Spike) | None — research only |
| 15.6 (Anonymous Spike) | None — research only |

## Priority

- **15.1 (Refresh Tokens):** High — every production app needs this
- **15.2 (Device Flow):** Medium — growing CLI/IoT market
- **15.3 (Ed25519):** Medium — future-proofing, Supabase interop
- **15.4-15.6 (Spikes):** Low-medium — research before committing

## Competitive Context

| Capability | Supabase Auth | GoTrue | Duende | identity-model (planned) |
|------------|--------------|--------|--------|--------------------------|
| Refresh rotation | Yes | No | Yes | Story 15.1 |
| Device flow | No | No | Yes | Story 15.2 |
| Ed25519 | Yes | No | No | Story 15.3 |
| Passkeys | Planned (#92) | No | No | Story 15.4 (spike) |
| MFA client | Yes | No | Partial | Story 15.5 (spike) |
| Anonymous upgrade | Requested | No | No | Story 15.6 (spike) |
