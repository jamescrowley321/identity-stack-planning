---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-open-identity-2026-09-02.md
  - _bmad-output/planning-artifacts/research/market-open-identity-research-2026-09-02.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-multi-idp-demo.md
  - _bmad-output/planning-artifacts/prd-canonical-identity.md
  - _bmad-output/planning-artifacts/epics-ory-sso-provider.md
  - docs/roadmap.md
  - docs/idp-rbac-comparison.md
workflowType: 'prd'
executionMode: 'headless-autonomous'
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 3
classification:
  projectType: 'open-source-developer-identity-platform (reference app + polyglot client library + conformance spec)'
  domain: 'identity-access-management'
  complexity: 'high'
  projectContext: 'brownfield'
  repoTagging: '[IS] identity-stack, [OIM] open-identity-model (identity-model + py-identity-model), [BRAIN] identity-stack-planning'
date: 2026-09-02
author: James
project: open-identity
decisionsStatus: 'resolved-locked-2026-09-02'
---

# Product Requirements Document — open-identity MVP

**Author:** James
**Date:** 2026-09-02
**Status:** Draft (headless autonomous run), with all prior open decisions now **reconciled and locked (2026-09-02)** — see **Resolved Decisions**. Turns the *product brief* (`product-brief-open-identity-2026-09-02.md`) and the *market research* (`research/market-open-identity-research-2026-09-02.md`) into an MVP specification. No repositories, packages, or certifications are renamed by this document — the irreversible rename is explicitly gated (see MVP Success Gates).

---

## Resolved Decisions (locked 2026-09-02)

> The forks encountered while writing this PRD headlessly are now **resolved and locked (2026-09-02)**. Each item records the decision that governs the rest of this document. Numbering is preserved from the earlier open-decisions list so existing cross-references stay valid.

1. **Relationship to existing PRDs / consolidation — RESOLVED: new PRD 7 that COMPOSES, does not rewrite.** open-identity is a **proposed PRD 7** that *composes* PRD 5 (canonical identity foundation), PRD 6 (library/spec substrate), and the Ory-SSO feeder epics. It does **not** rewrite, fold, or rename them; the "Relationship to Existing PRDs 1–6" table reflects **compose-not-replace**.
   - **Not resolved here — deferred to correct-course:** the **PRD 4 (inbound multi-provider claim normalization at the Tyk gateway) vs. this MVP (outbound vendor portability at the management plane, via Ory)** overlap. Same thesis, different axis and different second provider. These stay **parallel** for now and are reconciled later via a `/bmad-correct-course` pass — not in this document.

2. **"Swap" vs. "configurable provider" / what "zero RBAC migration" asserts — RESOLVED: CANONICAL-AUTHORITATIVE.** The Postgres canonical store is the **RBAC system-of-record**; providers (Descope, Ory) are **projections** of it. A provider swap **re-projects** claims/roles onto the newly-active provider; the canonical RBAC rows **never move** — CI asserts a **0-row diff** pre/post swap.
   - This makes the PRD explicitly consistent with the Ory epics' deliberate **"Descope stays configured; no data migration"** stance. The demo is a **reconfigure-and-prove-invariance** flow narrated as a swap; it **does NOT** migrate Descope-FGA → Ory-Keto authorization data.
   - All **provider-authoritative-migration framing is removed**. (Actual cross-provider RBAC/FGA migration tooling is explicitly Growth / post-MVP, not this MVP.)

3. **Conformance bar / definition of "parity" — RESOLVED.** **Python maintains its OpenID Foundation certification** (no regression). **Go passes the core-flow / basic-RP bar** (`oidcc-client-basic-certification`-class: discovery, JWKS, JWT validation, auth-code+PKCE, token). **Management-plane conformance runs as fixtures PR-gating + nightly live** against the runnable subset (Descope, Ory, node-oidc-provider). The **Rust extended tier is an acknowledged gap**, not an MVP blocker. Set the exact subset in architecture.

4. **Language scope for agent/MCP in MVP — RESOLVED: Python + Go.** MVP ships **Python (certified)** and **Go at the core-flow bar**. **Rust is a stated target / stretch, descoped from MVP** (its extended-tier gap is acknowledged, not gating). Throughout this PRD, **"in-scope languages" = Python + Go**.

5. **Package-name choice & module path — RESOLVED: reservation only.** Reserve `open-identity` / `open-identity-model` on the GitHub org + PyPI + crates.io; adopt the brand at the repo/org/marketing layer (with redirects). Do **not** publish renamed releases and do **not** change the Go module path in MVP. This is consistent with Epic D and the Rename Gate — the irreversible name changes stay behind the gate. (A Go vanity import path to insulate a future rename may be reserved but is not required for MVP.)

6. **Agent/MCP depth for MVP — RESOLVED: client-side flows + one MCP example.** MVP = **client-side OAuth 2.1 flows** (discovery, JWKS, JWT validation, auth-code+PKCE, token) **plus one runnable MCP OAuth 2.1 example** (Python). **DPoP is a parity-target, not a gate.** **Server-side resource protection, Dynamic Client Registration (RFC 7591), and Protected Resource Metadata (RFC 9728) are future / out-of-scope.** The agent remains a **protocol-plane profile** of the OIDC/OAuth client — **not** a new first-class canonical non-human principal in the identity model.

7. **Provider breadth for "the brain" v1 — RESOLVED.** Capability matrix v1 = the **9-provider documented matrix** (doc-level, source-cited) **plus live conformance only for the runnable subset** (Descope, Ory, node-oidc-provider). Every cell is clearly labeled **"documented"** vs. **"conformance-verified."**

8. **Where "the brain" physically lives — RESOLVED.** The versioned, executable **conformance `spec/` lives in the identity-model monorepo** (`spec/`, including `spec/management/`), where it runs in CI. The **planning repo (`[BRAIN]`) publishes and indexes** the public capability matrix plus a pointer to conformance results. Two artifacts, one narrative.

9. **"External validation" gate — RESOLVED: REMOVED (solo project).** This is a solo project for now, so the formal/soft **external-validation metric is deleted as a gate criterion**. The **Rename Gate is the author's discretion**, guarded only by **technical readiness checks** as sanity guards: swap green in CI, conformance parity at the defined bar, and the OpenID re-cert path confirmed with the Foundation. External adoption/traction may still be tracked as an **optional signal**, but it is **not** a gate and **not** the rename trigger — the author's judgment is.

10. **Readiness gap — RESOLVED: Epic A is real build on scaffolding (kept threaded).** A read-only code audit of `identity-stack` corrected the brief's/research's "it already exists" framing. Shipped: the canonical Postgres model, an **outbound-sync-only** `IdentityProviderAdapter` ABC (`sync_*`/`delete_*`, not get/create/list), DB-level provider *config* records, `idp_links`, and `IdentityResolutionService`. **Net-new for MVP:** the **adapter-selection registry** (Descope is hardcoded in `dependencies/identity.py`), the **claim-normalization abstraction** (normalization is a hardcoded `to_principal(claims, "Descope")`), and the **entire Ory adapter** (+ Ory inbound validation — Ory is an enum value only, with no adapter, client, claim mapping, CI, or compose). `DEPLOYMENT_MODE` swaps the middleware stack, not the IdP.
   - *Resolution:* Epic A is scoped as **net-new build on solid scaffolding**, not "flip a config." This is threaded throughout the PRD (Executive Summary, Project Classification, Epic A, PRD 5 row) and resets any Ralph-loop sizing before Epic A is cut. It does **not** invalidate the thesis — the canonical store + `idp_links` genuinely make zero-RBAC-migration achievable.

---

## Executive Summary

**open-identity** is a developer-facing **identity portability and federation layer** — an "identity fabric for developers" — that lets a team **swap or add an identity provider by implementing one adapter, not by rewriting the application**, with *zero RBAC/role/tenant migration*. It is not a green-field bet, but it is also **not merely "finishing" — a code audit corrected the brief's readiness claim (see Project Classification and Resolved Decision #10).** The *architectural foundation* is real and shipped: a canonical Postgres identity model, an outbound-sync adapter ABC, DB-level provider config, identity linking (`idp_links`), inbound identity resolution, an OpenID-certified token-validation library, and CI. What the swap demo still needs built is concrete: an **adapter-selection registry**, an **Ory adapter + Ory inbound validation**, and a **provider-neutral claim-normalization abstraction** (today's normalization is Descope-hardcoded). The thesis is embodied in the architecture; the MVP makes it *real, demonstrated, and verifiable*.

This PRD scopes the **MVP** — the smallest set of finished, verifiable work that proves the thesis while protecting the irreversible steps. It has four deliverables:

1. **The live Descope⇄Ory provider-swap demo** — the `identity-stack` reference app proves that switching the active authentication provider leaves users, roles, permissions, and tenants intact, because those live canonically in Postgres (PRD 5), not in the provider. Green in CI, not a manual demo.
2. **open-identity-model — the polyglot OIDC/OAuth client with first-class agent/MCP OAuth 2.1 support** — the certified Python reference (`py-identity-model`) plus Go at parity on the core agent/MCP flows (Rust is a stated target/stretch, descoped from MVP). The agent surface is a protocol-plane profile of the client, not a new canonical principal. This is the best-timed wedge: MCP standardized on OAuth 2.1, and non-human identity is the fastest-growing, least-consolidated segment.
3. **"The brain" v1** — a public, versioned **provider capability matrix** (which layer each provider leaves proprietary — the moat surface) **plus a cross-language conformance spec** that turns "we support many providers" into a *verifiable, testable* claim.
4. **Brand at the cheap layer + name reservation** — adopt the `open-identity` / `open-identity-model` brand at the GitHub/org/marketing layer, reserve the new package names defensively — while **explicitly deferring** every irreversible rename (PyPI/crate/Go-module/OpenID re-cert) behind a proof-of-positioning gate.

### What Makes This Special

The defensible value is **not** a bare OIDC SDK (commoditized — the login flow is already portable by standard). It is the combination of three things incumbents structurally **cannot** offer because it dissolves their lock-in:

- **Management/RBAC-plane portability, verified.** open-identity normalizes exactly the layer the standards leave proprietary — users, orgs, roles, permissions, tenants, claims — and *proves* portability by keeping RBAC state canonical while the provider changes underneath. Every migration horror story lives in this plane; no one serves it at the developer altitude (the one real occupant, Strata Maverics, targets enterprise-IT workforce IdPs, not SaaS-developer CIAM).
- **Right-timed agent/MCP wedge.** A polyglot OIDC/OAuth client maps directly onto MCP's OAuth 2.1 baseline — the exploding, least-consolidated frontier — and is the strongest near-term adoption hook for the library.
- **Verifiable openness as an asset.** An OpenID-certified reference plus a public conformance spec across languages is a credibility moat competitors won't replicate — and "the brain" makes it a category reference.

The core insight from the research is a discipline this PRD enforces: **frame externally as portability/fabric** (identity is stateful and single-homed, so no real-time-routing/arbitrage claims), and **anchor on the management plane + agent/MCP, not the SDK.**

## Project Classification

- **Project Type:** Open-source developer identity platform — a *multi-artifact* product spanning a reference application (`identity-stack`), a polyglot client library (`open-identity-model` = `identity-model` monorepo + `py-identity-model`), and a versioned conformance/capability spec ("the brain").
- **Domain:** Identity & Access Management — **high complexity** (OIDC/OAuth spec compliance, security-critical token handling, multi-tenant RBAC, ReBAC/FGA, formal conformance testing, multi-provider abstraction, agent/non-human identity).
- **Project Context:** **Brownfield — but Epic A is more "build on scaffolding" than "wiring."** Read-only ground truth in `identity-stack` (verified): the canonical Postgres store exists (`users`, `roles`, `permissions`, `role_permissions`, `tenants`, `user_tenant_roles`, `idp_links`, `providers`, `sync_events`); the **outbound-sync** adapter ABC `IdentityProviderAdapter` exists (`services/adapters/base.py`; methods are `sync_user/sync_role/sync_permission/sync_tenant/sync_role_assignment/delete_*` returning `Result[None, SyncError]` — **not** get/create/list); the DB-level provider **config** registry exists (`Provider` model, `services/provider.py`, `routers/providers.py` `GET/POST/PATCH /providers`); `IdPLink` enforces `unique(user_id, provider_id)` and `unique(provider_id, external_sub)`; and inbound token→canonical resolution exists via `IdentityResolutionService._build_identity_payload` (returns `{user, roles, tenant_memberships, linked_idps}`).
  - **Corrective ground truth (important — the brief/research over-stated readiness):** there is **(a) no adapter-selection registry** — `DescopeSyncAdapter` is hardcoded in `dependencies/identity.py`; **(b) no `ClaimMapper`/`GenericOIDC` claim-normalization abstraction** — normalization is a hardcoded `to_principal(claims, "Descope")` in `middleware/auth.py` and `middleware/claims.py`, and the "canonical" claim shape is *Descope's native `dct`/`tenants` shape*, not a vendor-neutral remap; **(c) Ory is an enum value only** (`ProviderType.ory`) with **no** adapter, client, claim mapping, CI, or compose. `DEPLOYMENT_MODE` swaps the middleware stack (standalone/gateway), **not** the IdP. So Epic A requires net-new components (adapter-selection registry, `OrySyncAdapter` + Ory inbound validation, claim-normalization abstraction) built on the existing canonical/linking scaffolding — see Resolved Decision #10.
- **Repo tagging:** `[IS]` identity-stack, `[OIM]` open-identity-model (identity-model + py-identity-model), `[BRAIN]` identity-stack-planning.

---

## Success Criteria

### User Success

- **Time-to-first-token < 30 min.** A developer can point `open-identity-model` (their language) at an arbitrary compliant OIDC provider and acquire+validate a token in under 30 minutes, proving standards-based portability is real, not aspirational.
- **The "aha": a live swap with RBAC intact.** A developer runs the reference app and watches the active provider change (Descope⇄Ory) with the same user's roles and tenant memberships intact and **zero RBAC/role/tenant data migrated** — the feared multi-month migration becomes a config change.
- **Agent-auth that isn't vendor-tied.** An agent/MCP builder drops in a certified, polyglot OAuth 2.1 client and gets a working MCP token flow without adopting one vendor's agent product. (External adoption is a welcome signal, not a gate — see Resolved Decision #9.)
- **Due-diligence artifact.** An adopting architect can read the public capability matrix + conformance results and make a portability bet on evidence, not marketing.

### Business Success (portfolio / OSS / optionality framing — not VC-revenue)

- **3-month:** brand adopted at the repo/org/marketing layer; capability matrix + reframed positioning published; the live provider-swap demo works end-to-end and green in CI.
- **12-month:** cross-language parity at the defined conformance bar across the in-scope languages (Python + Go); ≥3 provider adapters exist; measurable OSS traction; and the staged package rename executed **if and when the author elects to** — once the technical readiness checks are green (swap, conformance parity, cert path). The rename trigger is the author's judgment, not a metric (Resolved Decision #9).
- **Strategic:** own the *verifiable* provider-portability position at the developer altitude before an incumbent or fast-follower names it; keep a credible optional path to a hosted control plane without compromising the open, verifiable core.

### Technical Success

- The provider-swap demo is an **automated, deterministic CI check** (green/red), not a manual walkthrough.
- Provider-agnostic wiring is **backward compatible**: nothing is removed for Descope; the Descope path (dual-issuer, `dct`/`tenants`) is preserved unchanged while the Ory path (standard OIDC) is added.
- The Python reference **maintains its OpenID certification** through the MVP under the *current* package name (no cert regression, no speculative re-cert).
- Conformance results are **reproducible and versioned** — a third party can re-run them.

### Measurable Outcomes

- **Portability proof:** swap-demo E2E test green in CI; assertion that `roles`, `permissions`, `user_tenant_roles`, `idp_links` row counts and role assignments are byte-identical pre/post swap for the demo user (**0 rows migrated**).
- **Conformance coverage:** a published `(# providers × # languages)` matrix of passing conformance runs; MVP target = the agent/MCP core-flow subset green in all in-scope languages + Python certification maintained.
- **Agent/MCP:** ≥1 runnable MCP OAuth 2.1 client example (Python), with Go at the core-flow bar.
- **Positioning traction (optional signal, not a gate):** external validation is tracked if it occurs but is **not** a rename gate — the Rename Gate is the author's discretion guarded by technical readiness checks only (Resolved Decision #9).
- **Rename safety:** at MVP exit, **0 irreversible renames executed**; new names reserved; OpenID re-cert path answered.

---

## Product Scope

### MVP — Minimum Viable Product

The four deliverables in the Executive Summary, delivered to the acceptance criteria in **Functional Requirements** and gated by **MVP Success Gates**. The rename is **branding-only** in MVP.

### Growth Features (Post-MVP)

- **RBAC-state migration tooling** — turn "zero RBAC migration" from a demo invariant into an actual cross-provider migration product (e.g., Descope roles/FGA → Ory/Keto), across more provider pairs.
- **Broader agent/MCP surface** — MCP server-side resource protection, Dynamic Client Registration (RFC 7591), Protected Resource Metadata (RFC 9728), DPoP parity across all languages.
- **More provider adapters** (Auth0, Cognito, Entra, Keycloak, WorkOS) and **more languages** (Node/TS, JVM) via community contribution.
- **The staged irreversible rename** itself (post-gate).

### Vision (Future)

- **AuthZEN / Shared-Signals awareness** — ride standards creeping into the authz-query plane while keeping the moat in role/permission *modeling + migration*.
- **Optional hosted control plane** — a commercial path if OSS traction warrants.
- **"The brain" as a category reference** — the neutral, public capability matrix + conformance spec for identity-provider portability.

---

## User Journeys

### 1. Priya — the Burned Migrator (primary, success path)

Priya, a staff engineer at a Series-B B2B SaaS, gets a 3× Auth0 renewal quote and a Rules→Actions deprecation notice in the same quarter. She refuses to marry another vendor blind. She searches "avoid auth vendor lock-in," finds open-identity framed as *migration insurance*, and reads the public capability matrix to see which portability guarantees actually hold. She pulls `open-identity-model` for Python, points it at her *existing* provider — it works immediately, because it's standards-based (< 30 min). Then she runs the reference app and watches the **Descope→Ory swap with roles and tenants intact, zero RBAC migration**. The thing she feared is a config change. She adopts the canonical model + one adapter, keeps users/roles in her own system, and now re-quotes her CIAM at renewal as a negotiation lever. **Reveals:** provider-selectable auth, canonical RBAC ownership, claim normalization, a `/me` canonical endpoint, capability matrix, quickstart.

### 2. Marcus — the Structurally Multi-IdP Org (primary, edge case)

Marcus, a platform lead post-acquisition, runs two directories from an M&A plus a region-specific provider for data-sovereignty. He needs one app-facing interface over several backends and an incremental consolidation path that doesn't freeze feature work. He links a single canonical user to identities in **multiple providers** via `idp_links`, so the same person authenticating through Descope or Ory resolves to one canonical user with one RBAC state. He runs both providers behind one model and migrates incrementally. **Reveals:** multi-provider identity linking, one-canonical-user-many-identities correlation, running >1 provider concurrently, drift/reconciliation awareness.

### 3. Dana — the Agent/MCP Builder (primary, new-frontier path)

Dana is building an agent platform and needs OIDC/OAuth clients — token acquisition, validation, discovery, PKCE, proof-of-possession — across Python and Go runtimes (with Rust a stated target), aligned to MCP's OAuth 2.1 baseline. Existing options tie her to one vendor's agent product. She drops in `open-identity-model`, runs the **MCP OAuth 2.1 client example** (Python), and her agent obtains and uses a token against an MCP server. She checks the conformance matrix to confirm the same core-flow guarantees hold in Go. **Reveals:** polyglot agent/MCP client (Python + Go for MVP; Rust target), runnable MCP example, DPoP as a parity-target, conformance-verified core-flow parity. The agent is a protocol-plane profile of the client, not a separate canonical principal.

### 4. The Adopting Architect (secondary, due-diligence)

An engineering manager evaluating whether to bet on this pattern reads "the brain": the capability matrix (what's portable vs. proprietary per provider) and the conformance coverage report (which languages × providers actually pass). She makes an evidence-based decision. **Reveals:** public versioned matrix, reproducible conformance results, portable-vs-proprietary labeling.

### 5. The Contributor / Maintainer (secondary, operations)

A contributor adds an adapter for a provider they use, or a new language implementation. They follow the documented process, implement the shared conformance spec idiomatically, and see their `(provider × language)` cell go green. **Reveals:** documented adapter/contribution process, executable shared spec, CI-published results.

### Journey Requirements Summary

The journeys reveal five capability clusters that map to the four MVP epics: **provider-agnostic authentication + canonical RBAC ownership** (Epic A); **polyglot agent/MCP OAuth 2.1 client** (Epic B); **verifiable capability matrix + conformance spec** (Epic C); **brand/positioning + name reservation** (Epic D); and cross-cutting **multi-provider identity correlation** (Epic A) and **contribution/extensibility** (Epic C).

---

## Domain-Specific Requirements

Identity & Access Management is a high-complexity, security-critical domain. The following constraints shape every epic:

### Standards & Protocol Compliance

- OIDC / OAuth 2.0 / OAuth 2.1; JWT (RFC 7519), JWKS, discovery (RFC 8414), PKCE (RFC 7636), Token Exchange (RFC 8693), DPoP (RFC 9449). MCP remote-server authorization baseline = OAuth 2.1 (tightened Nov 2025 with proof-of-possession).
- RFC 9207 (`iss` in authorization response), discovery endpoint-authority binding, and bounded JWKS/discovery caches are **normative security behaviors** the client library must honor (identified as gaps to close in the identity-model reconciliation).

### Security Constraints (non-negotiable)

- Token validation must be correct and safe: signature, `exp`/`nbf`, issuer, audience, `azp`, clock-skew, redirect-downgrade defense, secret redaction. No secret leakage in logs or errors.
- Provider-neutralization must be **additive**: the Descope validation path (dual-issuer + `dct` single-tenant inference) is preserved unchanged; the Ory path treats tokens as standard OIDC and must not require or infer `dct`/`tenants` (their absence is not an error).
- RBAC is enforced **server-side against the canonical store** (`require_role()` / `require_permission()`), never trusted from raw provider claims. The JWT proves *identity*; the app resolves *authorization*.

### Authorization Architecture (from `idp-rbac-comparison.md`)

- **RBAC owned in Postgres** (roles, permissions, role_permissions, user_tenant_roles) — identity primitives that must survive provider swaps. **ReBAC/FGA proxied** to Zanzibar-style engines (Descope FGA, Ory Keto, OpenFGA) via an abstraction, not owned locally. This two-layer split is *why* zero-RBAC-migration is achievable.
- The capability matrix must record that **no OIDC standard exists for authorization claims** (Descope `tenants.{id}.roles`, Keycloak `realm_access.roles`, Entra `roles`, Cognito `cognito:groups`, Auth0 `permissions`, Okta `groups`) — this fragmentation is the moat surface.

### Compliance / Certification

- Maintain OpenID Foundation RP certification for the Python reference through MVP; do **not** submit a speculative re-cert under a new name (gated).

### Risk Mitigations

- **Overclaim / positioning drift** → portability / "identity fabric for developers" framing enforced in all external copy; no real-time-routing/arbitrage claims.
- **Commodity trap** → anchor on management-plane + agent/MCP + conformance, never a bare SDK.
- **Rename irreversibility** → stage the rename; reserve names; gate the one-way doors.

---

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Provider swap as a config change with a *proven* RBAC invariant.** The novel, demonstrable claim is not "we abstract login" (many do) but "the management/RBAC plane is *canonically owned*, so changing the authN provider is verifiably non-destructive." Turning that into a **green CI assertion** (0 rows migrated) is the differentiator.
- **Polyglot, conformance-verified OIDC/OAuth client aimed squarely at agent/MCP.** A cross-language client library whose parity is *testable against a shared spec* and *certified* in its reference language, positioned on the MCP OAuth 2.1 frontier.
- **"The brain" as a verifiable openness artifact.** A public, versioned capability matrix that explicitly labels portable-vs-proprietary per provider, paired with reproducible conformance results — a category reference competitors won't build.

### Market Context

The positioning lane (outbound vendor portability at the developer/CIAM altitude — "axis (b)") is essentially unserved; the naming is unclaimed; the pain is primary-source documented (Auth0 pricing, SSO tax, password-hash walls). The one real occupant (Strata) is at a different altitude (enterprise IT). See the market research report for the full two-axis map.

### Validation Approach

- Swap invariant → automated CI assertion (Epic A).
- Cross-language parity → shared executable conformance spec (Epic C).
- Positioning → validated by the author's judgment (this is a solo project); external validation is an optional signal, **not** a gate (Epic D / Resolved Decision #9).

### Risk Mitigation

- If the parity + conformance spec cannot be sustained, the pivot is cosmetic — so the conformance bar is deliberately scoped to a core subset (Python certified + Go core-flow; Rust descoped to a stretch target) for MVP (Resolved Decisions #3/#4) rather than full multi-language certification.

---

## Platform / Project-Type Specific Requirements

### Overview

Three cooperating artifacts, three quality tiers:

| Artifact | Repo | MVP quality tier | Audience |
|---|---|---|---|
| Provider-swap reference app | `identity-stack` `[IS]` | demo/POC (with correct, tested swap invariant) | consulting clients, portfolio, evaluators |
| Polyglot client library | `open-identity-model` `[OIM]` (`identity-model` + `py-identity-model`) | production-grade (Python certified; Go core-flow; Rust = stretch target) | OSS community, agent/MCP builders |
| Conformance spec (executable) | `identity-model/spec/` (incl. `spec/management/`) `[OIM]` | production-grade (versioned, reproducible) | architects, contributors |
| Capability matrix (published/indexed) | `identity-stack-planning` `[BRAIN]` | production-grade (versioned, source-cited) | architects, evaluators |

### Technical Architecture Considerations

- **Provider selection** must become configuration-driven via a **new adapter-selection registry** (`ProviderType` → adapter) replacing the hardcoded `DescopeSyncAdapter` in `dependencies/identity.py`. It reuses the existing DB-level `providers` config records and the outbound-sync `IdentityProviderAdapter` ABC. No application code changes to switch, once built.
- **Claim normalization** requires a **new provider-neutral abstraction** (Descope / Ory / generic-OIDC) producing a canonical shape — today it is a hardcoded `to_principal(claims, "Descope")`. The frontend then consumes a canonical `/me` endpoint rather than decoding provider claims.
- **Canonical store** (PRD 5) is the source of truth for users/roles/permissions/tenants; providers are outbound-sync/authN targets; `idp_links` correlates one canonical user to many provider identities; `IdentityResolutionService` resolves an inbound token to a canonical user.
- **Client library** ships idiomatically per language against a **shared conformance `spec/`** (which lives in the `identity-model` monorepo, incl. `spec/management/`) run in CI — fixtures PR-gating plus nightly live runs against the runnable subset; Python is the feature source-of-truth and certified reference, Go is at the core-flow bar, and Rust is a stretch target descoped from MVP. The planning repo `[BRAIN]` publishes/indexes the capability matrix and a pointer to conformance results.

### Implementation Considerations

- All `identity-stack` changes are **backward-compatible and additive** — the Descope path is never removed. (Confirmed neutralization points to generalize: `middleware/auth.py`, `middleware/claims.py`, `routers/auth.py`, `frontend/src/main.tsx` oidcConfig, `useRBAC.ts`/`useTenants.ts`, and `dependencies/identity.py` adapter wiring.)
- The Ory provider work in `epics-ory-sso-provider.md` is the substrate for Epic A; this PRD adds the **swap narrative + zero-migration CI assertion** on top (subject to Resolved Decision #2). Note that the Ory adapter, Ory inbound validation, and the claim-normalization abstraction are **net-new build**, not pre-existing (Resolved Decision #10).
- The rename is deliberately kept out of code: MVP touches brand/docs/reservations only.

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Problem-solving + platform MVP:** prove the thesis cheaply and verifiably (the swap invariant, the agent/MCP client, the conformance artifact) while spending **no** irreversible rename doors. The fastest path to validated learning is: make the swap green in CI, ship one MCP example, publish the matrix, adopt the brand at the cheap layer.

### MVP Feature Set (Phase 1)

- **Epic A** — Descope⇄Ory provider-swap demo with zero RBAC migration, green in CI.
- **Epic B** — `open-identity-model` agent/MCP OAuth 2.1 client: Python (certified) + Go at the core-flow bar (Rust = stated target/stretch, descoped from MVP); one runnable MCP OAuth 2.1 example (Python).
- **Epic C** — "the brain" v1: public capability matrix + cross-language conformance spec + reproducible coverage report.
- **Epic D** — brand at the cheap layer + name reservation; external positioning rewritten around portability/fabric; **no irreversible renames**.

### Post-MVP (Phase 2 / Growth) and Vision

See **Product Scope → Growth / Vision** above (RBAC migration tooling, deeper MCP surface, more adapters/languages, the gated rename itself; then AuthZEN/Shared-Signals, hosted control plane, brain-as-category-reference).

### Risk Mitigation Strategy

- **Technical:** cross-language parity is the hard part → scope the MVP conformance bar to a core subset (Python certified + Go core-flow); **Rust is descoped from MVP to a stated target/stretch** (Resolved Decision #4).
- **Market:** most teams never switch (YAGNI) → target burned/multi-IdP/agent segments; sell insurance, not ideology.
- **Resource / irreversibility:** stage the rename behind the gate; reserve names cheaply; never spend a one-way door on an unproven pivot.

---

## Functional Requirements

> FRs are the capability contract. They are grouped by the four MVP epics/feature areas. Each carries acceptance criteria (AC). Actors: **Developer/adopter**, **Operator** (runs the reference app), **Agent builder**, **Architect/evaluator**, **Maintainer**.

### Epic A — Descope⇄Ory Provider-Swap Demo (zero RBAC migration) `[IS]`

*Builds on PRD 5 (canonical Postgres model, `IdentityProviderAdapter` outbound-sync ABC, DB-level `providers` config, `idp_links`, `IdentityResolutionService`) and the `epics-ory-sso-provider.md` work. **Requires net-new components** (adapter-selection registry, Ory adapter + Ory inbound validation, claim-normalization abstraction) — see Project Classification corrective ground truth and Resolved Decisions #2 and #10.*

*Framing (Resolved Decision #2 — canonical-authoritative):* the **Postgres canonical store is the RBAC system-of-record**; providers are **projections**. A swap **re-projects** claims/roles onto the newly-active provider; canonical RBAC rows never move (0-row diff asserted in CI). The demo is a **reconfigure-and-prove-invariance** flow consistent with the Ory epics' "Descope stays configured; no data migration" stance — it **does NOT** migrate Descope-FGA → Ory-Keto authorization data.

- **FR-A1:** An Operator can select the active authentication provider (Descope or Ory) via configuration, with **no application code change**.
  - *AC:* an **adapter-selection registry** is introduced (replacing the hardcoded `DescopeSyncAdapter` in `dependencies/identity.py`) that maps `ProviderType` → adapter; switching the active provider is a config/env change only (no such selector exists today — `DEPLOYMENT_MODE` swaps the middleware stack, not the IdP); the app boots and serves auth for the selected provider; documented and reproducible.
- **FR-A2:** The backend validates JWTs from **both** Descope (dual-issuer formats; `dct`/`tenants` aware) and Ory (standard OIDC) via `py-identity-model`, selected by provider config.
  - *AC:* a Descope-issued token and an Ory-issued token each validate on their respective config; the issuer allow-list / JWKS / audience become **provider-config-driven** (today they are hardcoded to Descope's two issuer formats in `middleware/auth.py`/`claims.py`); the Descope path (incl. `dct` inference) is unchanged; the new Ory path does not require or infer `dct`/`tenants` and does not error on their absence.
- **FR-A3:** Provider-specific claims are normalized to a **canonical identity shape via a new claim-normalization abstraction** (Descope / Ory / generic-OIDC) so all downstream code is provider-agnostic.
  - *AC:* **this abstraction is net-new** — today normalization is a hardcoded `to_principal(claims, "Descope")` and the "canonical" shape is Descope's native `dct`/`tenants`; the MVP introduces a provider-neutral canonical shape (canonical user id, email, roles, tenant/tenants) produced from **both** providers' tokens; downstream authorization (`require_role`/`require_permission`) reads canonical fields only. (The DB-level `Provider.get_provider_capabilities` and `IdentityResolutionService` payload are the natural anchors for this canonical shape.)
- **FR-A4:** Users, roles, permissions, and tenant memberships persist in the canonical Postgres store and are **not** re-created, moved, or migrated when the active provider changes.
  - *AC:* the **zero-migration invariant** — after a Descope⇄Ory swap for the demo user, row counts and role/permission/tenant assignments in `roles`, `permissions`, `role_permissions`, `user_tenant_roles` are identical pre/post (**0 rows migrated**); this is asserted programmatically.
- **FR-A5:** A single canonical user can be linked to identities in more than one provider via `idp_links` (`unique(provider_id, external_sub)`), so the same person authenticating via Descope or Ory resolves to **one** canonical user with **one** RBAC state.
  - *AC:* linking a second provider identity to an existing canonical user succeeds and does not duplicate the user; authenticating via either provider resolves the same canonical user id and same roles/tenants.
- **FR-A6:** The frontend obtains identity, roles, and tenant memberships from a **canonical `/me` endpoint** rather than decoding provider-specific token claims.
  - *AC:* a canonical `/me` endpoint exposes the identity payload (the `IdentityResolutionService._build_identity_payload` `{user, roles, tenant_memberships, linked_idps}` shape is the natural basis); `useRBAC`/`useTenants` render identical RBAC UI regardless of active provider; the front-end no longer decodes Descope's `dct`/`tenants` claims directly; OIDC client config is provider-neutral (not `VITE_DESCOPE_*`-only).
- **FR-A7:** The reference app exposes a **visible, reproducible swap flow** that demonstrates the same user's roles and tenant memberships intact before and after switching the active provider.
  - *AC:* a documented demo path (UI and/or scripted) shows before/after state with RBAC preserved; suitable for a live walkthrough and for reviewers.
- **FR-A8:** RP-initiated logout works for the active provider (Descope Management logout; Ory RP-initiated logout), config-selected.
  - *AC:* logout on each provider terminates the session correctly via that provider's mechanism; selected by provider config.
- **FR-A9:** The provider-swap invariant runs as an **automated end-to-end CI check**, not a manual demo.
  - *AC:* a CI job authenticates via each provider, exercises the swap, and asserts FR-A4's zero-migration invariant; the job is green/red and reproducible.

### Epic B — open-identity-model: Agent/MCP OAuth 2.1 Client (polyglot) `[OIM]`

*Extends PRD 6 (identity-model monorepo) and the Main-PRD certification work. Governed by Resolved Decisions #3, #4, #6. In-scope languages = **Python + Go** (Rust = stated target/stretch, descoped from MVP). The agent surface is a **protocol-plane profile** of the OIDC/OAuth client — not a new first-class canonical non-human principal.*

*Capability baseline (verified against live repo source 2026-09-02 — not the drifting status matrix): the core agent/MCP primitives — auth-code+PKCE, token-exchange (RFC 8693), and DPoP (RFC 9449) — are **already shipped in both Python and Go** (`py-identity-model` is the most complete impl overall). Epic B is therefore **not** a from-scratch flow build; its net-new MVP work is the **runnable MCP OAuth 2.1 example** (assembly on the existing primitives), **maintaining Python's OpenID certification** (no regression), and **confirming Go core-flow parity** (verification). Rust already has auth-code+PKCE; its genuine remaining gaps are token-exchange + DPoP — relevant only if the Rust stretch is pursued.*

- **FR-B1:** A Developer can acquire and validate OAuth2/OIDC tokens against **any** compliant provider using `open-identity-model` in **Python** (certified reference) and, at the MVP conformance bar, **Go**. (**Rust** is a stated target/stretch, descoped from MVP.)
  - *AC:* discovery + JWKS + JWT validation + auth-code+PKCE + token acquisition work against an arbitrary compliant provider in each in-scope language (Python + Go).
- **FR-B2:** The library provides the **core agent/MCP client flows** aligned to MCP's OAuth 2.1 baseline: discovery, JWKS, JWT validation, authorization code + PKCE, token exchange, and proof-of-possession (DPoP). Server-side resource protection, DCR (RFC 7591), and PRM (RFC 9728) are out of MVP scope (Resolved Decision #6).
  - *AC:* each core flow is **already implemented** and unit/integration tested in **both** Python and Go (verified in live source 2026-09-02), including DPoP; DPoP remains a **parity-target (not an MVP gate)** per Resolved Decision #6. Epic B verifies these via conformance rather than building them.
- **FR-B3:** A Developer can run a **working MCP OAuth 2.1 client example in Python** demonstrating an agent obtaining and using a token to call an MCP server / protected resource.
  - *AC:* a runnable example exists with a documented quickstart; it exercises the OAuth 2.1 flow end-to-end against a test MCP/OAuth server.
- **FR-B4:** Go reaches **parity with the Python reference on the defined agent/MCP core-flow subset** (the Epic C conformance bar). **Rust is a stated target/stretch, descoped from MVP** (Resolved Decision #4).
  - *AC:* the named core-flow conformance subset passes in Go (and Python); the Rust gap is tracked and acknowledged, not hidden or gating.
- **FR-B5:** The Python reference **maintains its OpenID certification** through the MVP under the current package name.
  - *AC:* no certification regression; certification status is documented; **no** speculative re-cert submission under a new name.
- **FR-B6:** The agent/MCP client surface is documented with per-language quickstarts targeting **< 30 min time-to-first-token** against an arbitrary provider.
  - *AC:* a quickstart per in-scope language; a first-token walkthrough that a new developer can complete in under 30 minutes.
- **FR-B7:** The library honors the **normative security behaviors** required of a conformant client.
  - *AC:* RFC 9207 `iss` handling, discovery endpoint-authority binding, bounded JWKS/discovery caches, redirect-downgrade defense, `azp`/clock-skew, and secret redaction are implemented (closing the identified reconciliation gaps for in-scope languages).

### Epic C — "The Brain": Provider Capability Matrix + Cross-Language Conformance Spec `[BRAIN]` / `[OIM]`

*Elevates `idp-rbac-comparison.md` and PRD 6's shared `spec/`. Governed by Resolved Decisions #7, #8: the executable conformance `spec/` lives in the `identity-model` monorepo (incl. `spec/management/`) and runs in CI; the planning repo `[BRAIN]` publishes/indexes the public capability matrix. Matrix v1 = 9-provider documented matrix + live conformance for the runnable subset (Descope, Ory, node-oidc-provider) only.*

- **FR-C1:** A Developer/Architect can read a **public, versioned provider capability matrix** documenting how each supported provider models the management/RBAC plane (roles, permissions, tenants, claim formats, ReBAC/FGA).
  - *AC:* the matrix (derived from `idp-rbac-comparison.md`) is published as a canonical, versioned artifact covering the documented provider set (target: 9 providers), source-cited.
- **FR-C2:** A **cross-language conformance spec** (living in the `identity-model` monorepo `spec/`, incl. `spec/management/`) defines a shared, executable set of conformance test definitions each language implementation must pass.
  - *AC:* the shared `spec/` enumerates the MVP core-flow conformance subset; each in-scope language (Python + Go) implements it idiomatically and runs it in CI as **fixtures PR-gating + nightly live** against the runnable subset.
- **FR-C3:** Conformance results are published as a **reproducible, versioned coverage report**: `(# providers × # languages)` passing.
  - *AC:* a coverage report is generated from CI runs, versioned, and reproducible by a third party; each cell states pass/fail and the spec version.
- **FR-C4:** The capability matrix **explicitly labels** which capabilities are portable (standardized) vs. provider-proprietary (the moat surface).
  - *AC:* every capability row is tagged portable/proprietary with rationale; the "no OIDC standard for authorization claims" finding is captured.
- **FR-C5:** The spec is **versioned** and consumable by both humans and downstream validation/codegen (single source of truth — "the brain").
  - *AC:* semantic version on the spec; a documented change process; downstream (library CI) pins a spec version.
- **FR-C6:** A Maintainer can add a new provider or language to the matrix/spec via a **documented, contribution-friendly process**.
  - *AC:* a contributor guide describes how to add a provider adapter or a language implementation and get its conformance cell published.
- **FR-C7:** Each matrix cell is clearly marked **"documented"** vs **"conformance-verified"** (live-run).
  - *AC:* providers without a live conformance run (breadth) are labeled documented-only; runnable providers (Descope, Ory, node-oidc-provider) can be conformance-verified (per Resolved Decision #7).

### Epic D — Brand at the Cheap Layer + Name Reservation (renames OUT of MVP, gated) `[BRAIN]` / all repos

*Positioning + reservation only. Every irreversible rename is deferred behind the MVP Success Gate.*

- **FR-D1:** The GitHub org/repos adopt the `open-identity` / `open-identity-model` brand with **auto-redirects preserved**; Pages/Actions references (which do not auto-redirect) are fixed.
  - *AC:* renamed repos resolve old URLs via redirect; Pages/Actions/badges updated; no broken cross-repo links.
- **FR-D2:** Public positioning and READMEs are rewritten so **portability / "identity fabric for developers"** is the lead narrative and the product is described as a **provider-agnostic identity layer**.
  - *AC:* the portability/fabric narrative leads every external artifact; no external artifact frames the product with a routing/arbitrage analogy.
- **FR-D3:** The new package names (PyPI, crates.io) and GitHub identifiers are **defensively reserved** (placeholder holds) **without** publishing renamed releases.
  - *AC:* `open-identity` / `open-identity-model` reserved on GitHub org + PyPI + crates.io; no renamed release of a shipping package is published; the shipping packages keep their current names.
- **FR-D4:** The OpenID certification rename/re-cert **path is investigated and its answer recorded** (confirmed with the Foundation) as a gate input — not an action taken.
  - *AC:* a documented answer on whether/how certification transfers under a rename; captured as a gate criterion, no submission made.
- **FR-D5:** **No irreversible rename is executed in MVP.**
  - *AC:* at MVP exit — 0 PyPI/crate name changes of shipping packages, 0 Go module-path changes, 0 OpenID re-cert submissions; a written record confirms the one-way doors remain unspent.

---

## Non-Functional Requirements

### Security

- Token validation is correct and safe across both providers (signature, `exp`/`nbf`, issuer, audience, `azp`, clock-skew, redirect-downgrade defense). No secrets in logs/errors (secret redaction).
- RBAC enforced server-side against the canonical store; provider claims are never trusted directly for authorization.
- Provider-neutralization is strictly additive — the Descope path is preserved unchanged; adding Ory removes nothing.

### Reliability / Correctness

- The swap-invariant CI check is **deterministic** (no flakiness): a green result reliably means the zero-migration invariant held.
- Conformance results are **reproducible**: a third party running the pinned spec version obtains the same pass/fail matrix.

### Performance

- Time-to-first-token < 30 min (developer onboarding, not runtime latency).
- Conformance and swap CI jobs complete within the repos' normal CI budget (no unbounded runs); JWKS/discovery caches are bounded (also a security requirement).

### Compatibility / Portability

- No breaking changes to published packages during MVP (names and module paths unchanged; the rename is gated).
- The client library remains idiomatic per language and standards-based (works against any compliant provider, not just Descope/Ory).
- Python remains the feature source-of-truth and certified reference; Go mirrors it at the defined core-flow bar (Rust is a stated target/stretch, descoped from MVP).

### Maintainability / Governance

- "The brain" is versioned with a documented change process; the library CI pins a spec version.
- Adding a provider or language is a documented contribution flow (FR-C6).

---

## MVP Success Gates

There are **two** gates. The MVP is "done" when the **Delivery Gate** passes. The **irreversible rename** is authorized only when the **Rename Gate** passes — and never before.

### Delivery Gate (MVP complete)

- **G-D1:** Provider-swap demo works end-to-end **and is green in CI** with the zero-RBAC-migration invariant asserted (FR-A9 / FR-A4).
- **G-D2:** `open-identity-model` ships the agent/MCP OAuth 2.1 client — Python (certified) with a working MCP example, and **Go at the defined core-flow conformance bar** (Rust = stated target/stretch, **not** an MVP gate) (FR-B3/FR-B4).
- **G-D3:** "The brain" v1 is published — capability matrix + cross-language conformance spec + reproducible coverage report (FR-C1/FR-C2/FR-C3).
- **G-D4:** Brand adopted at the cheap layer, names reserved, external positioning rewritten around portability/fabric, **and 0 irreversible renames executed** (FR-D1/FR-D3/FR-D5).

### Rename Gate (authorizes the staged, irreversible rename)

This is a solo project. The trigger to spend the irreversible rename doors is the **author's judgment**, not a metric (Resolved Decision #9). The following are **technical readiness checks** — sanity guards that must all be green *before* the author exercises discretion; they do not by themselves mandate a rename:

- **G-R1:** the provider-swap demo is **green in CI** (= G-D1);
- **G-R2:** **conformance parity** is met at the defined bar for the in-scope languages — Python certified + Go core-flow (= G-D2 / Epic C);
- **G-R3:** the **OpenID cert re-path is confirmed** with the Foundation (FR-D4).

The former external-validation criterion (`G-R4`) is **removed** per Resolved Decision #9 — external validation is not a gate for a solo project.

If any readiness check is red, or the author simply elects not to proceed, **keep the brand at the product/marketing layer and do not spend the one-way doors** (no PyPI/crate rename of shipping packages, no Go module-path change, no OpenID re-cert). The rename is **not** part of MVP delivery.

---

## Relationship to Existing PRDs 1–6

open-identity is a **positioning + net-new-build layer over work already specced across the roadmap**, not a green-field program. Locked treatment (Resolved Decision #1): a **new PRD 7 — open-identity MVP** that **composes** PRD 5, PRD 6, and the Ory-SSO feeder epics — it does **not** rewrite, fold, or rename them (compose-not-replace).

| Existing PRD | Status | Relationship to open-identity MVP |
|---|---|---|
| **Main PRD** — Unified Identity Platform | ~80% / cert done | Supplies the **certified Python reference** (`py-identity-model`, OIDC RP certified Jul 2026) that becomes `open-identity-model`'s Python pillar (Epic B, FR-B5). open-identity **leads with the external portability/fabric narrative** (Epic D). |
| **PRD 1** — Infrastructure Secrets Pipeline | Planned | Not in MVP scope. Adjacent operational concern; the swap demo must not regress secret handling but does not depend on PRD 1. |
| **PRD 2** — API Gateway & Deployment Topology | Done | Not required for the *management-plane* swap demo (Epic A validates in-app, not at the gateway). Remains available; the gateway path is PRD 4's axis, not this MVP's. |
| **PRD 3** — Multi-Provider Test Infrastructure | Planned | Provides `node-oidc-provider` as a **runnable compliant provider** — useful as a third conformance target for "the brain" (Epic C, FR-C7) and as a generic OIDC fixture for Epic B. Not on the critical path for the Descope⇄Ory swap. |
| **PRD 4** — Multi-IdP Gateway Demo | Planned | **Closest overlap — reconcile LATER via correct-course, not resolved here (Resolved Decisions #1/#3).** PRD 4 proves *inbound* multi-provider claim normalization at the **Tyk gateway** with a Go claim-mapper plugin and `node-oidc-provider`. open-identity's Epic A proves *outbound vendor portability* at the **management plane** with **Ory** and the canonical store. Same thesis, different axis and second provider. They stay **parallel** for now; merge/stack decided later via a `/bmad-correct-course` pass. |
| **PRD 5** — Canonical Identity Domain Model | Done | **The foundation Epic A stands on (composed, not rewritten).** The canonical Postgres store, the outbound-sync `IdentityProviderAdapter` ABC, DB-level `providers` config, `IdPLink`/`IdentityResolutionService`, and `idp_links` are exactly what make "zero RBAC migration" *achievable* — the canonical store is the **RBAC system-of-record**; providers are **projections**. But PRD 5 did **not** ship an adapter-selection registry, a claim-normalization abstraction, or any Ory adapter (Resolved Decision #10) — open-identity builds those net-new and turns PRD 5's architecture into a **named, demonstrated, CI-verified** product claim. |
| **PRD 5b** — Design System & Admin Frontend | Active | Provides the admin UI surfaces (Providers, Identity Correlation, Provisional Users) that make the swap and multi-provider linking **visible** (FR-A6/FR-A7). Not gating, but strongly complementary to the demo's presentation. |
| **PRD 6** — identity-model Multi-Language Monorepo | Active | **The substrate for Epics B and C (composed, not rewritten).** Supplies the Go/Rust ports, the shared conformance `spec/` (which remains the home of "the brain," incl. `spec/management/`), and the multi-provider CI. open-identity adds **first-class agent/MCP OAuth 2.1** as a headline capability and **elevates the `spec/` + capability matrix into the public "brain"** (spec in-monorepo; matrix published/indexed by `[BRAIN]`). Rust is **descoped from MVP to a stated target/stretch**; its extended-tier gap is an acknowledged gap, not an MVP blocker (Resolved Decisions #3/#4). |
| **Ory-SSO-provider epics** (feeder, not a numbered PRD) | Epics 1–3 merged | **The direct substrate for Epic A (composed, not rewritten).** Provides configurable-provider wiring (config-driven issuer allow-list, Ory JWT validation, provider-neutral `/me`, Ory RP-initiated logout). open-identity adds the **swap narrative + zero-migration CI assertion** on top. **Reconciled (Resolved Decision #2):** the canonical-authoritative framing makes the "live swap" headline fully consistent with the feeder's deliberate "configurable, Descope stays configured, no data migration" stance — the swap re-projects onto a provider; the canonical RBAC rows never move. |

**Net:** open-identity introduces **no new architectural *pattern*** — it names, positions, and *verifies* the pattern PRDs 5, 6, and the Ory feeder established, composing rather than rewriting them. But it does require **real net-new implementation** for Epic A (adapter-selection registry, Ory adapter + inbound validation, claim-normalization abstraction — Resolved Decision #10), plus an agent/MCP client surface (Epic B) and a public conformance/matrix artifact (Epic C), and it stages a brand-only rename (Epic D). With decisions now locked, the only reconciliation deliberately **left open** is the **PRD 4 relationship** — deferred to a later `/bmad-correct-course` pass (Resolved Decision #1), not resolved here. The **"zero RBAC migration" framing** (Resolved Decision #2) and the **Epic A readiness/effort reset** (Resolved Decision #10) are now settled.

---

_This PRD is a planning artifact and a specification, not an execution authorization. No repositories, packages, or certifications have been renamed. The irreversible rename is explicitly gated (see MVP Success Gates → Rename Gate)._
