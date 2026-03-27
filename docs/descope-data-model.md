# Descope Data Model: OAuth 2.0 / OpenID Connect Mapping

This document maps Descope platform concepts to standard OAuth 2.0 and OpenID Connect specifications. It serves as a reference for developers working across the auth workspace repos.

## Core Architecture

Descope is a CIAM (Customer Identity and Access Management) platform that implements OAuth 2.0 and OpenID Connect with B2B multi-tenancy extensions. One Descope **Project** equals one **OIDC Provider**.

```
Descope Project (= OIDC Provider / Authorization Server)
  |
  +-- Users (= OIDC End-Users / Resource Owners)
  +-- Tenants (= B2B Organizations, no direct OIDC equivalent)
  |     +-- SSO Config (= OIDC/SAML Federation per tenant)
  |     +-- Roles (= tenant-scoped authorization)
  +-- Roles & Permissions (= project-scoped authorization, delivered as JWT claims)
  +-- Authentication Methods (= how users prove identity before token issuance)
  +-- Applications
  |     +-- Inbound Apps (= OAuth2 Clients / Relying Parties authenticating through Descope)
  |     +-- Federated Apps (= Descope acting as OIDC/SAML IdP to external services)
  +-- Access Keys (= OAuth2 Client Credentials for M2M)
  +-- Management Keys (= Admin API credentials)
  +-- Flows (= visual auth orchestration at the authorization endpoint)
  +-- Connectors (= external service integrations)
  +-- JWT Templates (= token claim customization)
  +-- FGA Schema (= Fine-Grained Authorization model)
```

---

## Project = OIDC Provider

| Descope | OAuth 2.0 / OIDC | Notes |
|---------|-------------------|-------|
| Project ID | `issuer`, `aud` claim, `client_id` (for federated apps) | The Project ID is the OIDC issuer identifier |
| Discovery endpoint | `/.well-known/openid-configuration` | `https://api.descope.com/{ProjectID}/.well-known/openid-configuration` |
| JWKS endpoint | RFC 7517 JWKS | `https://api.descope.com/{ProjectID}/.well-known/jwks.json` |
| Authorization endpoint | OAuth 2.1 Authorization Endpoint | `/oauth2/v1/authorize` (federated) or `/oauth2/v1/apps/authorize` (inbound apps) |
| Token endpoint | OAuth 2.1 Token Endpoint | `/oauth2/v1/token` or `/oauth2/v1/apps/token` |
| UserInfo endpoint | OIDC Core 5.3 | `/oauth2/v1/userinfo` |
| End Session endpoint | OIDC RP-Initiated Logout | `/oauth2/v1/logout` |
| Revocation endpoint | RFC 7009 | `/oauth2/v1/revoke` |
| Registration endpoint | RFC 7591 Dynamic Client Registration | Available when DCR is enabled |

**Key distinction:** Descope has two sets of OAuth2 endpoints:
- **Project-level** (`/oauth2/v1/*`) — Descope as IdP (federated apps)
- **Inbound App-level** (`/oauth2/v1/apps/*`) — registered third-party OAuth2 clients

### Supported Grant Types

| Grant Type | Spec | Descope Support |
|------------|------|-----------------|
| Authorization Code + PKCE | OAuth 2.1 Section 4.1, RFC 7636 | Primary grant type; PKCE mandatory for public clients |
| Client Credentials | OAuth 2.1 Section 4.2 | Via Access Keys at `/v1/access-keys/exchange` or `/oauth2/v1/apps/token` |
| Refresh Token | OAuth 2.1 Section 4.3 | `grant_type=refresh_token`; rotation enabled by default |
| JWT Bearer | RFC 7523 | Beta — exchange external OIDC tokens for Descope tokens |
| Implicit | OAuth 2.0 (removed in 2.1) | Only for custom OAuth providers as client; not recommended |

---

## Users = OIDC End-Users

| Descope | OIDC Claim | Spec Reference |
|---------|-----------|----------------|
| User ID (`userId`) | `sub` | OIDC Core Section 2 (ID Token required claim) |
| Display Name | `name` | OIDC Core Section 5.1 |
| Email | `email` | OIDC Core Section 5.1, requires `email` scope |
| Email Verified | `email_verified` | OIDC Core Section 5.1 |
| Phone | `phone_number` | OIDC Core Section 5.1, requires `phone` scope |
| Phone Verified | `phone_number_verified` | OIDC Core Section 5.1 |
| Login IDs | `preferred_username` (partially) | Users can have multiple login IDs (email, phone, username) |
| Custom Attributes | Custom claims (via JWT templates) | Not standard; Descope-specific |

---

## Tenants = B2B Organizations (Descope-Specific)

Tenants are Descope's multi-tenancy primitive. **There is no direct OIDC equivalent.** They are encoded as custom JWT claims.

| Descope | JWT Claim | Description |
|---------|-----------|-------------|
| Current Tenant | `dct` | The user's currently active tenant ID |
| All Tenants | `tenants` | Map of `{tenant_id: {roles: [...], permissions: [...]}}` |
| Tenant Roles | `tenants.{id}.roles` | Array of role names for this tenant |
| Tenant Permissions | `tenants.{id}.permissions` | Array of permission names for this tenant |

**Tenant properties:**
- `id` — Immutable identifier
- `name` — Mutable display name
- `selfProvisioningDomains` — Email domains for auto-assignment
- Custom attributes (text, numeric, boolean, single/multi select, date)
- Per-tenant SSO configuration (OIDC or SAML)
- Optional parent-child hierarchy
- Role inheritance from parent tenant

### Tenant Context Switching

The active tenant is set during authentication via the `tenant` query parameter in the authorization request. Switching tenants requires re-authentication (the frontend redirects through the OIDC authorize endpoint with a different `tenant` value).

---

## Roles & Permissions = Authorization Claims

Descope uses RBAC delivered as JWT claims, not OAuth2 scopes.

| Descope | Closest Standard | Spec Reference |
|---------|-----------------|----------------|
| Permission | OAuth2 scope (conceptually) | RFC 6749 Section 3.3 |
| Role | Collection of permissions | No direct standard |
| Project-level roles | Root `roles` claim in JWT | Descope-specific |
| Tenant-level roles | Nested `tenants.{id}.roles` | Descope-specific |

**JWT Claims Structure:**
```json
{
  "sub": "USER_ID",
  "iss": "https://api.descope.com/PROJECT_ID",
  "aud": ["PROJECT_ID"],
  "roles": ["global-admin"],
  "permissions": ["global:read"],
  "dct": "tenant-a",
  "tenants": {
    "tenant-a": {
      "roles": ["admin", "editor"],
      "permissions": ["read", "write", "delete"]
    },
    "tenant-b": {
      "roles": ["viewer"],
      "permissions": ["read"]
    }
  }
}
```

---

## Access Keys = OAuth2 Client Credentials

| Descope | OAuth2 | Spec Reference |
|---------|--------|----------------|
| Access Key ID | `client_id` | RFC 6749 Section 2.3 |
| Access Key Secret | `client_secret` | RFC 6749 Section 2.3 |
| Key Exchange | Client Credentials Grant | OAuth 2.1 Section 4.2 |
| Resulting JWT | Access Token | Short-lived JWT with roles and custom claims |
| Key Tenants | Token audience scoping | Key can be scoped to specific tenants |
| Permitted IPs | No standard | IP allowlisting for key usage |

**Exchange flow:**
1. Client sends `Authorization: Bearer {ProjectID}:{AccessKeySecret}` to `/v1/access-keys/exchange`
2. Descope returns a short-lived session JWT (configurable, default 3 minutes)
3. JWT includes the key's configured roles, permissions, and custom claims

---

## Authentication Methods = Pre-Token Authentication

Authentication methods are how users prove identity *before* tokens are issued. They run at the authorization endpoint, orchestrated by Descope Flows.

| Descope Method | Standard | `amr` Claim Value | Notes |
|----------------|----------|-------------------|-------|
| Password | Standard password auth | `pwd` | Configurable policy (length, complexity, lockout, expiration) |
| OTP (Email) | Proprietary | `email` | One-time password via email |
| OTP (SMS) | Proprietary | `sms` | One-time password via SMS |
| OTP (WhatsApp) | Proprietary | `whatsapp` | One-time password via WhatsApp |
| Magic Link | Proprietary | `email` or `sms` | Passwordless one-click link |
| Enchanted Link | Proprietary | `email` | Numbered verification (pick the right number) |
| Embedded Link | Proprietary | — | Direct link embedding |
| Passkeys | WebAuthn / FIDO2 | `webauthn` | W3C Web Authentication standard |
| TOTP | RFC 6238 | `totp` | Authenticator app (Google Auth, Authy, etc.) |
| Social Login (OAuth) | OAuth 2.0 | `oauth` | Google, GitHub, Apple, Microsoft, etc. |
| SSO (SAML) | SAML 2.0 | `fed` | Enterprise IdP federation |
| SSO (OIDC) | OpenID Connect | `fed` | Enterprise IdP federation |
| MFA (composite) | — | `mfa` | Indicates multi-factor was completed |

**Social OAuth Providers (built-in):** Apple, Discord, Facebook, GitHub, GitLab, Google, LinkedIn, Microsoft, Slack. Custom OIDC providers also supported.

---

## Applications

### Inbound Apps = OAuth2 Clients (Descope as Authorization Server)

Third-party applications that authenticate users through Descope.

| Descope | OAuth2 | Spec Reference |
|---------|--------|----------------|
| Inbound App | Registered OAuth2 Client | RFC 6749 Section 2 |
| Confidential Client | OAuth2 Confidential Client | RFC 6749 Section 2.1 |
| Non-Confidential Client | OAuth2 Public Client | RFC 6749 Section 2.1; must use PKCE |
| Client ID | `client_id` | System-generated |
| Client Secret | `client_secret` | System-generated; required for confidential clients |
| Approved Callback URLs | `redirect_uris` | RFC 6749 Section 3.1.2 |
| Permission Scopes | OAuth2 scopes | Action-based permissions |
| User Information Scopes | OIDC scopes | Which user attributes the app can access |
| Dynamic Client Registration | RFC 7591 | Self-registration at `/register` endpoint |

### Federated Apps = Descope as IdP (Outbound OIDC/SAML)

| Descope | Standard | Notes |
|---------|----------|-------|
| OIDC Federated App | Descope as OIDC Provider | External apps authenticate via standard OIDC against Descope |
| SAML Federated App | Descope as SAML IdP | External apps receive SAML assertions from Descope |

---

## SSO = OIDC/SAML Federation (Inbound)

SSO allows tenants to delegate authentication to their own enterprise IdP.

| Descope | Standard | Spec Reference |
|---------|----------|----------------|
| OIDC SSO | OIDC RP (Descope as Relying Party) | OIDC Core Section 3.1 |
| SAML SSO | SAML 2.0 SP (Descope as Service Provider) | SAML 2.0 Core |
| SSO per tenant | Per-tenant IdP configuration | Descope-specific; each tenant gets its own IdP |
| SSO domains | Email-domain-based IdP routing | Users routed to correct IdP by email domain |
| Attribute mapping | Claim/assertion mapping | Map IdP attributes to Descope user fields |
| SCIM | SCIM 2.0 (RFC 7644) | Automated user provisioning from external IdPs |

---

## Flows = Auth Orchestration

Descope Flows are a visual, no-code workflow builder for authentication journeys. They have **no direct OAuth2/OIDC equivalent** — they are the implementation of what happens at the authorization endpoint before tokens are issued.

| Descope | Closest Standard Concept | Notes |
|---------|--------------------------|-------|
| Flow | The user-interaction portion of the Authorization Code grant | Handles screens, actions, conditions, MFA, SSO routing |
| Flow completion | Authorization Code issuance | Successful flow results in token issuance |
| Flow actions | — | Building blocks: auth steps, user creation, custom claims, MFA |
| Flow conditions | — | Branching on user attributes, device, auth state |
| Flow connectors | — | HTTP integrations during authentication |

---

## JWT Templates = Token Customization

| Descope | Standard | Notes |
|---------|----------|-------|
| User JWT Template | ID Token / Access Token claim customization | Defines which claims appear in user tokens |
| Access Key JWT Template | M2M token claim customization | Defines claims in access key exchange tokens |
| Authorization Claims Schema | — | Three modes: Default (tenant-nested), Current Tenant (flat), No Descope Claims |
| Custom claims via Flow | — | Flow actions can add/override claims at runtime |

**Constraints:** Max 60 chars per key, 500 chars per value, 100 keys per JWT.

---

## Session Management

| Descope | OAuth2 / OIDC | Spec Reference |
|---------|---------------|----------------|
| Session Token | Access Token (short-lived JWT) | OAuth 2.1 Section 1.4 |
| Refresh Token | OAuth2 Refresh Token | OAuth 2.1 Section 4.3 |
| Token Refresh | `grant_type=refresh_token` | OAuth 2.1 Section 4.3.1 |
| Refresh Token Rotation | OAuth 2.1 recommendation | OAuth 2.1 Section 4.3.3; enabled by default |
| Session Inactivity Timeout | No direct standard | Descope-specific; configurable per project or tenant |
| Logout (single session) | RP-Initiated Logout | OIDC RP-Initiated Logout Section 2 |
| Logout (all sessions) | — | Descope-specific; invalidates all refresh tokens |
| End Session | OIDC End Session endpoint | `/oauth2/v1/logout` |
| Token Revocation | RFC 7009 | `/oauth2/v1/revoke` |
| Step-up Token | — | Separate short-lived token for elevated auth |
| Trusted Device Token | — | Device trust with configurable timeout |

**Default Token Lifetimes:**
- Session token: 10 minutes (min 3 minutes)
- Refresh token: 4 weeks (min 3 minutes)
- Step-up token: 10 minutes
- Trusted device token: 365 days
- Access key session: 3 minutes

---

## Descope-Specific JWT Claims

These claims extend standard JWT/OIDC claims:

| Claim | Description | Standard? |
|-------|-------------|-----------|
| `sub` | User ID | Yes — OIDC Core Section 2 |
| `iss` | Issuer (`https://api.descope.com/{ProjectID}`) | Yes — RFC 7519 Section 4.1.1 |
| `aud` | Audience (Project ID) | Yes — RFC 7519 Section 4.1.3 |
| `exp`, `iat` | Expiration, Issued At | Yes — RFC 7519 Sections 4.1.4, 4.1.6 |
| `amr` | Authentication Methods References | Yes — RFC 8176 |
| `azp` | Authorized Party | Yes — OIDC Core Section 2 |
| `drn` | **Descope Resource Name** — token storage location (`ds`=session, `dr`=refresh) | No — Descope-specific |
| `dct` | **Descope Current Tenant** — active tenant ID | No — Descope-specific |
| `tenants` | **Tenant map** — `{tenant_id: {roles, permissions}}` | No — Descope-specific |
| `roles` | **Project-level roles** — array of role names | No — Descope-specific |
| `permissions` | **Project-level permissions** — array of permission names | No — Descope-specific |
| `nsec` | **Non-secure claims** — client-specified claims (untrusted) | No — Descope-specific |

---

## Connectors = External Integrations

Connectors enable integrations with external services during authentication flows. Categories:

| Category | Examples | Use Case |
|----------|----------|----------|
| Communication | SendGrid, Twilio, SMTP, SES | OTP/magic link delivery |
| Analytics | Amplitude, Mixpanel, Segment | Authentication event tracking |
| Fraud/Risk | reCAPTCHA, hCaptcha, Arkose, Forter | Bot protection, risk scoring |
| Identity | LDAP, Ping Directory | Enterprise directory integration |
| Observability | Datadog, Splunk, New Relic | Auth event logging |
| Storage | AWS S3, Supabase, SQL | Custom data storage |
| HTTP | Generic webhook | Custom integrations |

---

## Fine-Grained Authorization (FGA)

Descope FGA extends beyond standard OAuth2/OIDC authorization:

| Descope | Model | Notes |
|---------|-------|-------|
| FGA Schema | ReBAC (Relationship-Based Access Control) | OpenFGA-compatible DSL |
| FGA Check | Authorization decision query | Real-time permission checking |
| Relations | Subject-Object relationships | e.g., "user X is editor of document Y" |

This has **no OAuth2/OIDC equivalent** — it is an authorization model that complements token-based access control.

---

## Cross-Repo Reference

| Concept | TF Provider Resource | SaaS Starter Usage | py-identity-model Feature |
|---------|---------------------|--------------------|-----------------------|
| OIDC Discovery | `descope_project` (settings) | `TokenValidationConfig` with discovery | `get_discovery_document()` |
| Token Validation | `descope_project` (JWT settings) | `validate_token()` middleware | `validate_token()` sync/async |
| Multi-Tenancy | `descope_tenant` | `dct` claim extraction | `ClaimsPrincipal` |
| RBAC | `descope_permission`, `descope_role` | `require_role()` dependency | `to_principal()` |
| Access Keys | `descope_accesskey` | CRUD via Management API | Client credentials token request |
| SSO | `descope_sso` | Planned (Phase 3a) | OIDC federation support |
| OAuth Apps | `descope_inboundapp` | Frontend OIDC config | Auth code + PKCE (#90) |
| Session Config | `descope_project` (settings) | Token lifetimes | Discovery cache (#219) |
| Password Policy | `descope_passwordsettings` | — | — |
| FGA | `descope_fga_schema` | — | — |
