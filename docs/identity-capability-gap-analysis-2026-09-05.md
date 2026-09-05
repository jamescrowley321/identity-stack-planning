# Identity Capability Gap Analysis

Status: proposed planning baseline, 2026-09-05.

This document identifies reusable capability gaps across `identity-model`, `py-identity-model`, and
`identity-stack`. It is product-neutral: it defines the identity-layer contracts needed by
protected-resource consumers without defining any consumer's domain resources, federation protocol,
consent model, purpose model, or final authorization policy.

## Executive decision

The open-source identity work should converge on four explicit boundaries:

1. **Protocol boundary** — protocol libraries own token, proof, discovery, key, and conformance
   behavior. Integrators consume those capabilities through stable public interfaces.
2. **Principal boundary** — `identity-stack` resolves verified protocol input into a canonical,
   tenant-scoped principal. Provider claims are inputs to normalization, not authorization truth.
3. **Authorization-integration boundary** — `identity-stack` exposes a provider-neutral relationship
   authorization port. An external engine such as OpenFGA may implement that port; the identity
   projects do not own application-specific relation models or policy decisions.
4. **Trust and evidence boundary** — resource registrations, sender/delegation proof, and verified
   credential evidence are explicit inputs with bounded lifecycles. Evidence can inform policy but
   never becomes an implicit allow.

The work below is a gap backlog for the open-source projects. A status of `planned` or
`fixture-verified` is not a claim that a capability is shipped, deployed, certified, or suitable for
every consumer.

## Identity-project dependencies to verify

Existing architecture and reconciliation records indicate these useful identity-project capabilities,
but Story 24.0 must verify them against current source, tests, and conformance evidence:

- a canonical Postgres model for users, tenants, roles, permissions, memberships, provider links,
  and providers;
- provider-claim normalization rather than provider claims as canonical authorization truth;
- flat RBAC as a portable baseline;
- standalone and gateway deployment modes as explicit architectural concerns; and
- relationship authorization as an external/proxied capability rather than an engine implemented by
  `identity-stack`.

These are dependency hypotheses, not a source-verified implementation inventory. No consumer should
treat them as available until the capability report records their evidence status.

## Gap inventory

| Capability area | Planning foundation | Gap to close | Owning project or boundary |
|---|---|---|---|
| Current-state truth | Task queues, parity reports, and architecture documents exist. | Reconcile documents with current source and tests; label every capability with evidence and date. | Planning plus all three identity projects |
| Protocol parity | `identity-model` and `py-identity-model` expose protocol features at different maturity levels. | Define a versioned parity matrix and conformance fixtures for supported protocol behavior. | `identity-model`, `py-identity-model` |
| Security profiles | OAuth and OIDC extensions are tracked individually. | Define supported security profiles, mandatory checks, downgrade resistance, and negative-test coverage. | Protocol libraries plus `identity-stack` integration |
| FAPI profile integration | FAPI requirements are a security profile over OAuth/OIDC behavior. | Map FAPI requirements to library capabilities and resource/client configuration; prove no profile is silently weakened. | Protocol libraries plus integration |
| Resource-server boundary | Token verification belongs to protocol libraries. | Give resource services one fail-closed boundary for issuer, audience/resource, expiry, signature, token type, and proof checks. | `identity-stack` |
| Principal normalization | Canonical identity and claim mapping are architectural directions. | Standardize issuer, subject, client/resource, tenant, proof, authentication time, and correlation metadata. | `identity-stack` |
| Resource and trust registry | Provider registration is modeled. | Add generic protected-resource, issuer, audience, key/configuration, gateway, and lifecycle registration. | `identity-stack` |
| Delegation and sender proof | DPoP, mTLS, token exchange, and related extensions are separate protocol capabilities. | Define how verified sender/delegation evidence reaches the normalized principal and downstream policy boundary. | Protocol libraries plus `identity-stack` |
| Verifiable credential evidence | Credential formats and verification are outside the canonical identity tables. | Define the external-verifier dependency boundary and expose only a bounded, redacted verification result to consumers. | `identity-stack` integration; external verifier dependency |
| Relationship authorization | ReBAC/FGA is an external/proxied capability. | Define a provider-neutral port, typed request/result classes, model/version handling, and fail-closed adapter behavior. | `identity-stack` integration |
| Tenant isolation | Tenant-scoped RBAC and explicit tenant parameters are established patterns. | Prove isolation across resolution, registrations, gateways, adapters, caches, retries, and audit. | `identity-stack` |
| Deployment parity | Standalone and gateway modes are architectural concerns. | Make trusted-gateway input, forwarded-identity rules, errors, and normalized principal semantics equivalent. | `identity-stack` plus gateway boundary |
| Audit and observability | Correlation and OpenTelemetry patterns are documented. | Define redacted identity-side events for authentication, resolution, verification, trust, adapter calls, and failures. | `identity-stack` |
| Capability handoff | Planning distinguishes documented behavior from verified behavior. | Publish a versioned capability report with supported, planned, fixture-verified, live-verified, and unsupported edges. | Planning plus all three identity projects |

## Standards and integrations

These standards and systems are useful inputs to the gap work, but they do not collapse into one
authorization mechanism.

### FAPI 2.0 Security Profile

[FAPI (Financial-grade API) 2.0](https://openid.net/specs/fapi-security-profile-2_0.html) is a
security profile over OAuth 2.0 deployments. The gap work should identify which FAPI requirements are
implemented by the protocol libraries, which are enforced by client/resource configuration, and which
remain unsupported. The integration contract must include explicit profile selection, required
cryptographic and sender-verification checks, negative tests, and a no-downgrade rule.

FAPI does not define canonical users, relationship tuples, credential semantics, consent policy, or a
consumer's final allow/deny decision.

### W3C Verifiable Credentials and Presentations

[The W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model/) defines a
portable model for credentials and presentations. The gap work is to define how `identity-stack`
consumes verification from a selected external verifier dependency or an explicitly supported interface
in `identity-model` or `py-identity-model`. In all cases, the identity stack should consume a bounded
verification result containing only the evidence needed by the downstream policy boundary, such as
issuer, subject/holder, proof method, validity window, status, and verification outcome.

A verified credential or presentation is evidence, not permission. It must not implicitly grant access,
replace tenant/resource checks, or be copied into canonical identity records or logs as a raw credential.
Credential schemas, issuer trust policy, selective disclosure, revocation/status handling, and privacy
requirements need explicit ownership before implementation.

### OpenFGA and relationship authorization

[OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts) provide a useful
reference for relationship-based authorization and tuple/model evaluation. The identity stack should
define a provider-neutral adapter port that can bind to OpenFGA or another compatible engine. The port
should carry canonical principal, tenant, resource, relation/action, model/version, consistency, and
correlation context, and return stable allow/deny/unknown/unavailable/error classes.

OpenFGA is an implementation binding, not the owner of tokens, credentials, consent, purpose, or
application policy. The identity projects should not embed an application-specific relation model or
make a final domain authorization decision.

## Contract assumed by protected-resource consumers

The following interfaces are the intended planning outputs. They are not yet implementation claims.

| Identity output | Consumer may rely on | Identity projects must not infer |
|---|---|---|
| Canonical identity reference | Stable user, tenant, membership, and provider-link identifiers. | Domain ownership, consent, or business role meaning. |
| Normalized principal | Verified issuer, subject, client/resource, tenant, proof, authentication time, and correlation metadata. | A final permission to access a domain resource. |
| Resource/trust result | Whether configured issuer, audience/resource, key source, and gateway relationship are accepted. | Cross-authority federation semantics or domain trust policy. |
| Credential verification result | A bounded, redacted statement of what was verified and when. | An implicit authorization grant or canonical credential store. |
| Relationship adapter result | Stable decision class plus model/version, consistency, and correlation metadata. | The meaning of domain relations or final policy composition. |
| Identity-side audit event | Correlation to authentication, resolution, verification, trust, and adapter activity. | Sensitive tokens, raw credentials, domain data, or another system's decision record. |

## Work mapping

| Story | Outcome | Primary target | Depends on |
|---|---|---|---|
| 24.0 — Reconcile the identity baseline | Source-verified capability matrix with evidence status and gaps | `identity-stack`, `identity-model`, `py-identity-model` | None |
| 24.1 — Stabilize principal resolution | One canonical identity-resolution path and normalized principal | `identity-stack` | 24.0 |
| 24.2 — Establish protocol and security-profile coverage | Versioned parity/conformance matrix, including FAPI profile mapping | `identity-model`, `py-identity-model` | 24.0 |
| 24.3 — Establish resource-server verification | Stable standalone verification boundary delegated to protocol libraries | `identity-stack`, `identity-model`, `py-identity-model` | 24.1, 24.2 |
| 24.4 — Add resource and trust registration | Versioned issuer/resource/gateway/key lifecycle boundary | `identity-stack` | 24.1, 24.2 |
| 24.5 — Integrate delegation and sender proof | Bounded proof/delegation evidence in principal and audit contracts | `identity-model`, `py-identity-model`, `identity-stack` | 24.2, 24.3 |
| 24.6 — Integrate verifiable credential evidence | Bounded VC/VP verification result with explicit ownership and privacy rules | `identity-stack` | 24.2, 24.3 |
| 24.7 — Add relationship authorization adapter | Provider-neutral port with OpenFGA-compatible binding and fail-closed outcomes | `identity-stack` | 24.1, 24.4 |
| 24.8 — Prove isolation and publish capability report | Negative tests, redaction, deployment parity, and evidence-backed handoff | `identity-stack`, `identity-model`, `py-identity-model` | 24.1–24.7 |

## Boundary invariants

1. Provider claims are inputs to normalization, never canonical authorization truth.
2. Protocol libraries own protocol and cryptographic behavior; integrations do not reimplement it.
3. A normalized principal is identity context, not a final domain authorization decision.
4. Resource, issuer, audience, key, and gateway trust are explicit configuration, never ambient
   headers or inferred issuers.
5. Credential and presentation verification produces evidence; it does not produce an implicit allow.
6. Relationship authorization is an adapter boundary; application-specific relation models stay with
   the consuming system.
7. Tenant context is explicit across resolution, trust, adapters, caches, retries, and audit.
8. Missing, ambiguous, stale, malformed, or unavailable security inputs fail closed.
9. Logs and events contain correlation metadata and outcome classes, but no secrets, raw credentials,
   or protected-resource content.
10. “Available for planning” is always accompanied by an implementation status and evidence locator.

## Dependencies and evidence inputs

The following planning documents are dependencies/evidence inputs for this backlog, not implementation
targets:

- [`architecture-open-identity.md`](../_bmad-output/planning-artifacts/architecture-open-identity.md) —
  canonical identity, protocol/management planes, provider adapters, and relationship boundary.
- [`prd-open-identity.md`](../_bmad-output/planning-artifacts/prd-open-identity.md) — provider-swap,
  identity, and protocol requirements already planned in the workspace.
- [`epics-open-identity.md`](../_bmad-output/planning-artifacts/epics-open-identity.md) — existing
  identity-stack and identity-model story decomposition.
- [`idp-rbac-comparison.md`](idp-rbac-comparison.md) — canonical RBAC and proxied relationship
  authorization boundary.
- [`system-architecture.md`](system-architecture.md) — canonical identity tables, tenant isolation,
  gateway topology, and existing ADR index.
- [`glossary.md`](glossary.md) — acronym definitions and links to normative sources.
