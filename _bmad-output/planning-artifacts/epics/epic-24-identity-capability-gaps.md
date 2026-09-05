---
workflowType: 'epic'
project_name: 'identity-stack-planning'
epic_id: '24'
epic_title: 'Identity Capability Gaps — Protocol, Trust & Authorization Integrations'
date: '2026-09-05'
status: 'proposed'
dependencies:
  - docs/identity-capability-gap-analysis-2026-09-05.md
  - _bmad-output/planning-artifacts/architecture-open-identity.md
  - _bmad-output/planning-artifacts/prd-open-identity.md
  - _bmad-output/planning-artifacts/epics-open-identity.md
  - docs/idp-rbac-comparison.md
  - docs/system-architecture.md
---

# Epic 24: Identity Capability Gaps — Protocol, Trust & Authorization Integrations

## Overview

This epic identifies reusable gaps across `identity-model`, `py-identity-model`, and
`identity-stack`. It covers protocol parity, security-profile integration, canonical principal
resolution, protected-resource verification, trust registration, delegation and sender proof,
verifiable credential evidence, relationship authorization, tenant isolation, and identity-side
observability.

It does not define any consuming system's domain resources, federation protocol, consent, purpose,
provenance, retention, or final authorization policy. Those concerns remain outside this identity-layer
planning epic.

## Planning assumption

Consumers may plan against the named interfaces in this epic once each interface has an explicit
version and evidence status. That is a planning assumption, not a claim that implementation is shipped,
deployed, certified, or suitable for every deployment. Each story must distinguish `planned`,
`fixture-verified`, and `live-verified` evidence.

## Ownership split

| Surface | Owning boundary | Responsibility |
|---|---|---|
| Protocol behavior | `identity-model`, `py-identity-model` | OAuth/OIDC messages, token/proof primitives, discovery, keys, profiles, and conformance behavior. |
| Canonical identity | `identity-stack` | Users, tenants, memberships, provider links, provider configuration, and normalized principal resolution. |
| Resource-server integration | `identity-stack` | Invoke protocol verifiers, enforce configured resource/trust inputs, map outcomes, and fail closed. |
| Trust registration | `identity-stack` | Resource, issuer, audience, key/configuration, gateway, and lifecycle registration. |
| Credential evidence | `identity-stack` integration; external verifier dependency | Consume verified credentials/presentations and expose bounded evidence; do not turn evidence into permission. |
| Relationship authorization | `identity-stack` port plus external engine | Stable adapter request/result contract; an engine such as OpenFGA evaluates its configured model. |
| Domain policy | Consuming system | Resource/action vocabulary, relationship meaning, consent, purpose, provenance, retention, and final allow/deny composition. |

## Status rule

No story may use “supported” as a synonym for “planned.” The capability report must label each item
as one of:

- `implemented` — present in the current source;
- `fixture-verified` — exercised by a deterministic fixture or conformance test;
- `live-verified` — verified against a running dependency or deployment;
- `planned` — specified but not yet verified; or
- `unsupported` — intentionally outside the current scope.

## Story 24.0 — Reconcile the identity baseline

**Implementation targets:** `identity-stack`, `identity-model`, `py-identity-model`.

**Outcome:** a current, source-verified matrix of identity capabilities and gaps.

### Acceptance criteria

- [ ] **Given** architecture documents, parity reports, task queues, current sibling-repository source,
  and tests, **when** the baseline is reconciled, **then** every required capability has a status,
  evidence date, and exact locator.
- [ ] **Given** historical documents disagree with current source or tests, **when** the matrix is
  updated, **then** the discrepancy is recorded rather than silently overwritten.
- [ ] **Given** a capability is outside the identity layer, **when** the matrix is published, **then**
  it is recorded as an external dependency or non-goal rather than assigned an implementation story.

## Story 24.1 — Stabilize canonical identity resolution and principal shape

**Target repository:** `identity-stack`.

**Outcome:** every protected consumer receives the same canonical identity resolution and normalized
principal.

### Acceptance criteria

- [ ] **Given** a verified issuer and subject, **when** identity resolution runs, **then** it resolves
  through the canonical provider link and returns the canonical user with explicit tenant context.
- [ ] **Given** a subject is linked to multiple providers, **when** it authenticates through any
  configured provider, **then** it resolves to the same canonical user without provider-specific
  authorization branching.
- [ ] **Given** a valid principal, **when** it is returned to a consumer, **then** it includes issuer,
  subject, client/resource, tenant, authentication time, proof method, and correlation metadata.
- [ ] **Given** provider claims conflict with canonical identity or tenant membership, **when** context
  is resolved, **then** canonical identity and explicit policy inputs win.
- [ ] **Given** a route or service needs identity, **when** it is reviewed, **then** it uses the
  normalized principal contract rather than parsing provider-specific claims locally.

## Story 24.2 — Establish protocol and security-profile coverage

**Implementation targets:** `identity-model`, `py-identity-model`.

**Outcome:** protocol parity and security-profile support are explicit, versioned, and tested.

### Acceptance criteria

- [ ] **Given** a protocol feature or profile is listed as supported, **when** the parity matrix is
  reviewed, **then** both language implementations identify the public interface, normative source,
  conformance fixture, and unsupported edge cases.
- [ ] **Given** FAPI 2.0 is selected for a client or resource deployment, **when** configuration is
  loaded, **then** the selected profile, required checks, cryptographic requirements, sender-proof
  requirements, and failure behavior are explicit.
- [ ] **Given** a request is configured for a stronger security profile, **when** a weaker or ambiguous
  mode is requested, **then** the integration rejects the downgrade rather than silently relaxing
  requirements.
- [ ] **Given** a required protocol check, key, metadata value, or proof is absent or invalid, **when**
  conformance tests run, **then** the result is a deterministic failure with no fail-open path.
- [ ] **Given** the two language implementations process equivalent valid and invalid inputs, **when**
  parity fixtures run, **then** their outcomes and error classes are equivalent or the difference is
  explicitly documented.

## Story 24.3 — Establish resource-server verification integration

**Implementation targets:** `identity-stack`, `identity-model`, `py-identity-model`.

**Outcome:** standalone resource-server verification delegates protocol work to the owning libraries
and emits a stable identity-side result.

### Acceptance criteria

- [ ] **Given** a protected request, **when** standalone verification runs, **then** identity-stack
  invokes the configured protocol-library verifier for issuer, audience/resource, expiry, signature,
  token type, and proof requirements.
- [ ] **Given** verification succeeds, **when** the request enters application code, **then** the
  normalized principal and explicit tenant context are available through the documented boundary.
- [ ] **Given** a token is invalid, the issuer/resource is untrusted, or key/metadata resolution is
  unavailable, **when** verification runs, **then** the result is classified distinctly and protected
  application code is not reached.
- [ ] **Given** verification errors are logged or returned, **when** they cross the boundary, **then**
  access tokens, client secrets, private keys, and protected-resource content are redacted.

## Story 24.4 — Add generic resource and trust registration

**Target repository:** `identity-stack`.

**Outcome:** protected resources can register and lifecycle-manage the authority and configuration they
accept.

### Acceptance criteria

- [ ] **Given** a protected resource, **when** it is registered, **then** the registration binds its
  resource identifier/audience, accepted issuer(s), tenant/deployment context, key/config source, and
  lifecycle state.
- [ ] **Given** a registration is absent, disabled, expired, ambiguous, or outside the allowlist,
  **when** verification begins, **then** the request fails closed before resource lookup.
- [ ] **Given** signing keys or provider metadata rotate, **when** registration refreshes, **then** the
  update is bounded, observable, and cannot broaden issuer or resource trust.
- [ ] **Given** gateway mode is enabled, **when** a trusted gateway identity envelope is received,
  **then** its trust root, freshness, audience, and tenant context are validated explicitly.
- [ ] **Given** untrusted forwarded identity headers are supplied, **when** a request is processed,
  **then** they cannot override the verified principal or tenant context.

## Story 24.5 — Integrate delegation and sender proof

**Implementation targets:** `identity-model`, `py-identity-model`, `identity-stack`.

**Outcome:** sender and delegation evidence is verified by the protocol layer and exposed without
  confusing actor identity with authorization.

### Acceptance criteria

- [ ] **Given** a sender-constrained request, **when** verification succeeds, **then** the normalized
  principal records the verified proof method and binding reference without exposing private key
  material.
- [ ] **Given** a request contains an actor, delegated subject, or token-exchange context, **when** it
  is normalized, **then** subject, actor, client, and delegation chain are represented distinctly.
- [ ] **Given** sender proof or delegation evidence is missing, expired, mismatched, or unverifiable,
  **when** a protected request is evaluated, **then** it fails closed with a stable error class.
- [ ] **Given** downstream policy consumes delegation evidence, **when** the evidence is passed onward,
  **then** the identity layer does not make the consuming system's policy decision.

## Story 24.6 — Integrate verifiable credential evidence

**Target repository:** `identity-stack`.

**Outcome:** identity-stack has an explicit privacy boundary and bounded result contract for consuming
credential and presentation verification from an external dependency or a supported identity-library
interface.

### Acceptance criteria

- [ ] **Given** a VC or VP verification capability is required, **when** the design is approved, **then**
  identity-stack names the selected external verifier dependency or supported identity-library interface,
  defines its adapter boundary, records the normative W3C VC Data Model 2.0 source, and adds no fourth
  target repository to this epic.
- [ ] **Given** a credential or presentation is verified, **when** the result crosses into identity-stack,
  **then** it contains only the bounded evidence required by policy, including issuer, subject/holder,
  proof method, validity window, status, verification outcome, and correlation metadata as applicable.
- [ ] **Given** issuer trust, proof, expiry, status, schema, or holder binding is invalid or unknown,
  **when** verification runs, **then** the result is distinguishable from a valid verification and
  cannot become an implicit allow.
- [ ] **Given** raw credentials or presentations are handled, **when** they are logged, cached, or
  persisted, **then** the default behavior is redaction or non-persistence with an explicit retention
  decision for any exception.
- [ ] **Given** a consumer receives verified credential evidence, **when** it evaluates access, **then**
  resource, tenant, relationship, and policy checks remain separate inputs.

## Story 24.7 — Add the provider-neutral relationship authorization adapter

**Target repository:** `identity-stack`.

**Dependency:** an external relationship authorization engine such as OpenFGA.

**Outcome:** identity-stack offers a stable adapter port that can bind to OpenFGA or another compatible
relationship engine without owning application-specific relation semantics.

### Acceptance criteria

- [ ] **Given** an application asks for a relationship decision, **when** the adapter is called, **then**
  it receives canonical principal, explicit tenant/resource context, relation/action input,
  model/version metadata, consistency preference, and correlation ID.
- [ ] **Given** the configured engine returns allow, deny, unavailable, stale/unknown, or malformed
  output, **when** the adapter maps the result, **then** the result class is stable and ambiguous or
  erroneous outcomes fail closed.
- [ ] **Given** a provider or engine changes, **when** its adapter binding changes, **then** routes,
  protocol parsing, and canonical identity data remain unchanged.
- [ ] **Given** an external system supplies relation semantics, **when** identity-stack passes the
  request to the adapter, **then** it does not define, persist, or reinterpret that relation vocabulary.
- [ ] **Given** the relationship engine is unavailable, **when** a protected operation depends on its
  result, **then** identity-stack returns an explicit unavailable result rather than an allow.

## Story 24.8 — Prove isolation, redaction, and capability handoff

**Implementation targets:** `identity-stack`, `identity-model`, `py-identity-model`.

**Outcome:** identity-side boundaries are negative-tested and the open-source capability report is
published with evidence.

### Acceptance criteria

- [ ] **Given** a principal has access in tenant A, **when** it addresses an equivalent resource,
  registration, relationship input, cache key, or audit context in tenant B, **then** the identity layer
  denies or returns no cross-tenant data.
- [ ] **Given** issuer, subject, tenant, resource, gateway, or relationship inputs are missing,
  mismatched, or ambiguous, **when** identity resolution runs, **then** it fails closed before the
  protected resource is reached.
- [ ] **Given** a key endpoint, provider registry, gateway, or relationship engine is unavailable,
  **when** a protected request arrives, **then** the failure is observable and cannot become an allow.
- [ ] **Given** caches or retries are used, **when** identities or trust registrations rotate, **then**
  cache keys remain tenant/resource scoped and invalidation cannot leak a prior decision.
- [ ] **Given** authentication, resolution, verification, trust, gateway, or adapter activity occurs,
  **when** an identity event is emitted, **then** it includes correlation ID, outcome class,
  authority/resource reference, tenant context, and contract versions without secrets or raw credentials.
- [ ] **Given** the capability report is published, **when** a reader checks each interface, **then**
  its status, evidence locator, unsupported edges, and owning project are clear.

## Dependency order

`24.0 → 24.1 → 24.2 → 24.3 → 24.4 → 24.5 → 24.6 → 24.7 → 24.8`

Stories 24.3 and 24.4 may proceed in parallel after the principal and protocol/security-profile
boundaries are stable. Story 24.7 depends on the generic adapter shape, not on an application-specific
relation model.

## Normative references

- [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-security-profile-2_0.html)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts)
- [`docs/identity-capability-gap-analysis-2026-09-05.md`](../../../docs/identity-capability-gap-analysis-2026-09-05.md)
