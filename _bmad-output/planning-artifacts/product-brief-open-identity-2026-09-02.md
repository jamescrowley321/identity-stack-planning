---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/planning-artifacts/research/market-open-identity-research-2026-09-02.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - docs/roadmap.md
  - docs/idp-rbac-comparison.md
date: 2026-09-02
author: James
project: open-identity
---

# Product Brief: open-identity

> **Status:** Draft for review — decision-support artifact following the market research report
> (`research/market-open-identity-research-2026-09-02.md`). Recommends a *Conditional GO*
> on the rebrand. No repositories, packages, or certifications have been renamed. Session mode: local only.

---

## Executive Summary

**open-identity** is a provider-agnostic identity platform that lets developers **swap or add an identity provider by implementing one adapter — not by rewriting the application** — with *zero RBAC migration*. It is a rebrand and repositioning of an existing, working auth workspace whose architecture already embodies the thesis: adapter interfaces, a provider registry, a canonical identity model, cross-provider claim normalization, an OpenID-certified token-validation library, and multi-provider CI.

The product ships as two brand pillars plus a knowledge core:

- **open-identity-model** — a polyglot, OpenID-certified **client-library layer** (one SDK surface across Python, Go, and Rust that speaks OIDC/OAuth2 to any provider), with `py-identity-model` folding in as the certified Python reference. Its leading-edge use case is **OIDC/OAuth for AI agents and MCP**.
- **open-identity** — a full-stack **reference implementation / control plane** that demonstrates **live provider-swapping** (e.g. Descope ⇄ Ory) with portable users, roles, and tenants.
- **"The brain"** — the planning repo, elevated to the canonical **provider capability matrix + cross-language conformance spec** that everything else is generated against and validated by.

Market research validates the opportunity with two disciplines baked in from the start: **(1)** position as a **portability + federation control plane ("identity fabric for developers")** — identity is stateful and single-homed, so the emphasis is portability rather than real-time provider arbitrage; and **(2)** anchor differentiation on the **management/RBAC plane** (which standards leave proprietary and where all lock-in lives), not on a bare OIDC SDK (commoditized). The rename is **staged** — brand cheaply at the repo/org layer now, defer the irreversible package/certification renames behind a proof-of-positioning gate.

---

## Core Vision

### Problem Statement

Adopting a commercial identity provider (Auth0, Descope, Clerk, WorkOS, Stytch…) means building your application *around that vendor's proprietary shape*: its user store, its roles/permissions/tenant model, its admin and provisioning APIs, its claim formats, its extensibility pipeline. The login/token flow is standardized (OIDC/OAuth2), but **everything above it is not**. The result: **switching or running multiple providers is a full re-modeling project, not a configuration change.** When a vendor triples its price at renewal, deprecates an extensibility model, or gets acquired, teams face a multi-month migration — password-hash re-hashing, RBAC re-modeling, integration re-testing — with no clean exit.

### Problem Impact

- **Pricing shocks with no escape hatch.** Auth0's post-Okta changes (per-MAU roughly doubled, overage +300%, B2B moved to sales-only, Rules→Actions EOL Nov 2026) produced documented migrations — e.g. a team leaving Auth0 at 350k MAU reported ~$200k/yr saved. The "SSO tax" (markups of 500%–5,000% to enable SAML) compounds the resentment.
- **Migration is genuinely painful.** Password hashes are one-way (lazy re-hash stretched over *months*; ~20k/hour; some vendors gate hash export behind enterprise tiers), RBAC models are non-portable across vendors, and one Fortune-500 migration reportedly locked out 40% of its workforce.
- **Lock-in is structural, not contractual.** Self-serve CIAM is month-to-month, so the trap isn't the contract — it's the engineering cost of leaving, which every incumbent has an incentive to keep high.

### Why Existing Solutions Fall Short

The market conflates two different meanings of "multiple providers" and only serves one:

- **Axis (a) — inbound B2B SSO federation** ("connect *your app* to *your customers'* many IdPs"): **crowded and well-capitalized** — WorkOS ($2B), Scalekit, SSOJet, SSOReady, plus every CIAM vendor. Not our problem.
- **Axis (b) — outbound vendor portability** ("let *you* swap *your own* auth vendor with one adapter"): **essentially unserved** at the developer/CIAM layer.

Adjacent efforts miss the target: open-source platforms (Keycloak, Ory, Zitadel, SuperTokens, Authentik) give you *"leave the host,"* not *"swap vendor A for B"* — two open-source providers are no more mutually swappable than two closed ones, because each ships its own idiosyncratic management model. Auth libraries (Auth.js 80+ providers, Passport 500+ strategies) abstract *login sources*, not *swappable vendors*, and cover login/session only — no management plane. The one real occupant of the portability axis, **identity orchestration / "identity fabric" (Strata Maverics)**, targets **enterprise IT / workforce-IdP** modernization (e.g. Kroger migrating 300+ apps off SiteMinder), not **SaaS developers** and their CIAM vendors — a different buyer at a different altitude. And the whole field's 2025–26 energy is racing into **AI-agent identity**, a *new* lock-in surface, leaving the portability lane open.

### Proposed Solution

A developer-facing **portability + federation layer** over the identity management plane, delivered as:

1. **open-identity-model** — one client-library surface across languages (OIDC/OAuth discovery, JWT/JWKS validation, token exchange, PKCE, proof-of-possession) that trusts *any* compliant provider, with **first-class support for AI-agent / MCP OAuth 2.1** — the fastest-growing, least-consolidated frontier and the strongest near-term hook.
2. **open-identity (reference/control plane)** — a canonical users/orgs/roles/tenants model with **per-provider adapters** (Descope and Ory today; the registry is extensible), cross-provider claim normalization, and a **live provider-swap demo** proving *zero RBAC migration*.
3. **"The brain"** — a public, versioned **provider capability matrix + cross-language conformance spec** that turns "we support many providers" into a *verifiable, testable* claim.

### Key Differentiators

- **Provider portability, not just federation.** The only developer-altitude play on the open axis (b).
- **Management/RBAC-plane abstraction — the real moat.** We normalize the exact layer standards leave proprietary (users, orgs, roles, permissions, tenants, claims) and offer RBAC-state migration — where every migration horror story lives, and where incumbents structurally *won't* compete because it dissolves their lock-in.
- **Verifiable openness.** OpenID-certified reference + a public conformance spec across languages — a credibility asset competitors won't replicate.
- **Right-timed agent/MCP wedge.** A polyglot OIDC/OAuth client maps directly onto MCP's OAuth 2.1 baseline and the exploding non-human-identity segment.
- **It already exists.** The adapters, registry, canonical model, claim normalization, certified validation, and multi-provider CI are built — this is a naming + positioning + finishing effort, not a green-field bet.

---

## Target Users

### Primary Users

**1. The Burned Migrator (highest-intensity pain — lead here).**
*Persona: "Priya," staff engineer at a Series-B B2B SaaS.* Got a 3× Auth0 renewal quote and a Rules→Actions deprecation notice in the same quarter. She doesn't want to marry another vendor blind. Today she's hand-rolling an anti-lock-in wrapper ("routes call `getUser`, not the vendor SDK") and dreading the password-hash migration. **Success = provider optionality as insurance**: she can re-quote her CIAM at renewal without a multi-month rewrite.

**2. The Structurally Multi-IdP Org.**
*Persona: "Marcus," platform lead at a company post-acquisition.* Runs two directories from an M&A, plus region-specific providers for data-sovereignty. Needs one app-facing interface over several backends, and a migration path to consolidate — without freezing feature work. **Success = run multiple providers behind one model and migrate incrementally.**

**3. The Agent/MCP Builder.**
*Persona: "Dana," building an agent platform.* Needs OIDC/OAuth clients (token acquisition, validation, discovery, PKCE, proof-of-possession) across Python, Go, and Rust runtimes, aligned to MCP's OAuth 2.1 baseline. Underserved and growing fastest. **Success = drop-in, certified, polyglot agent-auth that isn't tied to one vendor's agent product.**

### Secondary Users

- **Anti-lock-in-by-principle developers** — the OSS audience who already believe in the pattern and will adopt/contribute to a provider-agnostic, certified library.
- **Adopting decision-makers** (eng managers/architects) who evaluate the *conformance matrix* as due-diligence before betting on a provider.
- **James (portfolio/consulting owner)** — a tertiary but real stakeholder: the project doubles as a credibility and consulting asset; "the brain" is the demonstrable expertise artifact.

### User Journey

1. **Discovery** — Priya hits an Auth0 renewal wall, searches "avoid auth vendor lock-in / migrate off Auth0," and finds open-identity framed as *migration insurance* + a public provider capability matrix.
2. **Onboarding** — she pulls `open-identity-model` for her language, points it at her existing provider (works immediately — it's standards-based), and reads the conformance matrix to see what portability guarantees hold.
3. **Aha moment** — she runs the open-identity reference and watches a **live Descope→Ory swap with roles/tenants intact and zero RBAC migration.** The thing she feared is a config change.
4. **Core usage** — she adopts the canonical model + an adapter, keeping users/roles in her own system; agent/MCP auth comes from the same library.
5. **Long-term** — at the next renewal she re-quotes providers as a negotiation lever; she contributes an adapter for a provider she uses; the conformance matrix is her ongoing reference.

---

## Success Metrics

### User Success

- **Time-to-first-token** against an arbitrary OIDC provider with `open-identity-model` < 30 min (proves standards-based portability is real).
- **Provider swap in the reference app** (Descope ⇄ Ory) completed with **zero RBAC/role/tenant data migration** and no application-code rewrite — the headline "aha."
- **Agent/MCP auth**: a working MCP OAuth 2.1 client example per language, adopted by ≥1 external agent project.

### Business Objectives (portfolio / OSS / optionality — not VC-revenue framing)

- **3-month:** brand adopted at repo/org/marketing layer; conformance matrix + reframed positioning published; the live provider-swap demo works end-to-end.
- **12-month:** cross-language parity at a defined conformance bar across ≥3 languages; ≥3 provider adapters; measurable OSS traction; the positioning has drawn external validation (inbound interest, references, or consulting leads) sufficient to justify executing the staged package rename.
- **Strategic:** own the *verifiable* provider-portability position at the developer altitude before an incumbent or a fast-follower names it; keep a credible optional path to a hosted control-plane / commercial offering.

### Key Performance Indicators

- **Conformance coverage:** # providers × # languages passing the shared conformance spec (the core credibility metric).
- **Portability proof:** provider-swap demo green in CI (automated, not manual).
- **Adoption:** GitHub stars / package downloads for `open-identity-model`; # external adapters contributed; # agent/MCP integrations.
- **Positioning traction:** inbound references, mentions, or consulting/inbound leads attributable to the repositioning (the gate signal for the irreversible rename).
- **Certification:** OpenID certification maintained through the rebrand (or a confirmed re-cert path).

---

## MVP Scope

### Core Features

1. **Brand + narrative at the cheap layer** — adopt `open-identity` / `open-identity-model` on GitHub org/repos (auto-redirect), rewrite positioning around portability / "identity fabric for developers." *Reserve* new PyPI/crate names defensively. **No irreversible renames yet.**
2. **The live provider-swap demo** — `open-identity` reference app swaps Descope ⇄ Ory with users/roles/tenants intact and **zero RBAC migration**, built on the existing adapter ABCs + provider registry + `ClaimMapper` normalization. Green in CI.
3. **open-identity-model agent/MCP client** — polyglot OIDC/OAuth client with an MCP OAuth 2.1 example in Python (certified) plus Go/Rust at parity for the core flows.
4. **"The brain" v1** — publish the **provider capability matrix + cross-language conformance spec** as the canonical, versioned artifact.

### Out of Scope for MVP

- **The irreversible renames** — PyPI/crate name changes, the Go module-path change, and OpenID re-certification are **deferred behind the proof-of-positioning gate** (they permanently consume names and break importers; see research §7).
- **SCIM / provisioning abstraction** — a separate protocol/data-sync problem; not the OIDC-client wedge.
- **Full provider breadth** — start with Descope + Ory (already in flight); more adapters are post-MVP.
- **A hosted SaaS / commercial control plane** — kept as future optionality, not MVP.
- **Fine-grained-authz (ReBAC) engine** — integrate/observe (OpenFGA/SpiceDB/AuthZEN), don't build.

### MVP Success Criteria (the rename gate)

Execute the staged, irreversible rename **only if** all hold: (a) the provider-swap demo is green in CI; (b) conformance parity is met across the target languages; (c) the OpenID cert re-path is confirmed with the Foundation; and (d) the repositioning has produced at least early external validation. Otherwise, keep the brand at the product/marketing layer and *do not* spend the one-way doors.

### Future Vision

- **RBAC-state migration tooling** — turn "zero RBAC migration" from a demo into a product feature across more provider pairs.
- **AuthZEN / Shared-Signals awareness** — ride standards creeping into the authz plane; keep the moat in role/permission *modeling + migration*.
- **Broader polyglot coverage** (Node/TS, JVM) and more provider adapters via community contribution.
- **Optional hosted control plane** — a commercial path if OSS traction warrants, without compromising the open, verifiable core.
- **The brain as a category reference** — the public capability matrix + conformance spec becomes the neutral reference for identity-provider portability.

---

## Workflow Completion & Next Steps

**Product Brief complete (draft for review).** It captures: a reframed, evidence-backed vision; the problem and its documented impact; why existing solutions miss axis (b); prioritized personas and journey; portfolio-appropriate metrics with an explicit rename gate; and a focused MVP that proves the thesis cheaply while protecting the irreversible steps.

**Recommended next workflows:**
1. **`/bmad-create-prd`** — turn this brief into a PRD for the MVP (the swap demo, the agent/MCP client, the conformance "brain"), *or* **`/bmad-correct-course`** to fold the reframed positioning into the existing 6 PRDs as a sprint-change-proposal.
2. **`/bmad-brainstorming`** — external taglines/naming for the portability / "identity fabric" positioning.
3. **`/bmad-create-architecture`** — formalize the canonical model + adapter/registry contract as the versioned spec ("the brain").

_This brief is a planning artifact and a recommendation, not an execution authorization. No renames or destructive changes have been made._
