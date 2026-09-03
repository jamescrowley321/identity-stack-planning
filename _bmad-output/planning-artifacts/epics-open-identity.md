---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd-open-identity.md
  - _bmad-output/planning-artifacts/architecture-open-identity.md
  - _bmad-output/planning-artifacts/epics-ory-sso-provider.md
  - docs/idp-rbac-comparison.md
  - identity-stack/backend/app/services/adapters/base.py (read-only)
  - identity-stack/backend/app/dependencies/identity.py (read-only)
  - identity-stack/backend/app/middleware/claims.py (read-only)
  - identity-stack/backend/app/middleware/auth.py (read-only)
  - identity-stack/backend/app/models/identity/provider.py (read-only)
  - identity-stack/backend/app/services/provider.py (read-only)
  - identity-stack/backend/app/repositories/idp_link.py (read-only)
  - identity-model/spec/capabilities.md (read-only)
workflowType: 'create-epics-and-stories'
executionMode: 'headless-autonomous'
project: open-identity
project_name: open-identity
author: James
date: 2026-09-02
status: 'headless-draft-decisions-locked-upstream'
---

# open-identity MVP — Epic Breakdown

> **Execution note (HEADLESS full run; no user available).** This document was produced by the
> `bmad-create-epics-and-stories` workflow run non-interactively. The workflow's four steps were executed
> end-to-end without halting at the A/P/C menus (AUTO-Continue); sub-skills (advanced-elicitation, party-mode)
> were not invoked. All grounding inputs (PRD 7 and the ADR-OI architecture) were treated as **LOCKED fixed
> inputs** — their Resolved Decisions were not re-opened. Genuine decision forks that surfaced during
> decomposition and are **not** settled by the locked inputs are collected in **Open Decisions for Main
> Session** at the end of this document. This is a planning artifact, not an execution authorization; no
> sibling repos, packages, or certifications were modified.

## Overview

This document provides the complete epic and story breakdown for the **open-identity MVP (PRD 7)**,
decomposing the functional requirements from `prd-open-identity.md` and the ADR-OI-1…10 architectural
contract in `architecture-open-identity.md` into implementable stories with acceptance criteria,
dependencies, and enough context for an autonomous (Ralph-loop) implementation session.

**Epic identifiers are preserved from the PRD as letters (A/B/C/D)** rather than renumbered to 1/2/3/4,
because the PRD, the ADR-OI contract, and the MVP Success Gates all cross-reference the epics by letter —
renumbering would break traceability. **FR identifiers are likewise preserved from the PRD** (`FR-A1`,
`FR-B3`, …) as the authoritative capability contract.

**No starter template applies.** Per architecture §2 this is a **brownfield** effort; the "starter" is the
existing, working stack (canonical Postgres model, outbound-sync adapter ABC, provider registry, certified
`py-identity-model`, protocol-plane conformance spec). Epic A Story A.1 is therefore *Ory provider
infrastructure*, not "set up project from a starter template."

### Repo Targeting Legend

| Tag | Repo | Role in the MVP |
|---|---|---|
| `[IS]` | `identity-stack` | Reference app — the management plane / provider-swap demo (Epic A) |
| `[OIM]` | `open-identity-model` = `identity-model` (Go/Rust + shared `spec/`) + `py-identity-model` (Python) | Polyglot OIDC/OAuth client + conformance machinery (Epics B, C) |
| `[BRAIN]` | `identity-stack-planning` (this repo) | Publishes/indexes the capability matrix + positioning + name reservation (Epics C, D) |

### Deliverable Format Note

Following the `bmad-create-epics-and-stories` convention, this is a **single epic document**. Per-story
context files are a downstream `bmad-sprint-planning` concern and are not produced here. This file does
**not** overwrite the existing `epics.md` or any `epics-*.md` / `epics/` artifacts.

---

## Requirements Inventory

### Functional Requirements

Grouped by MVP epic (identifiers preserved from PRD 7). Full acceptance criteria live on the stories below.

**Epic A — Descope⇄Ory Provider-Swap Demo (zero RBAC migration) `[IS]`**

- **FR-A1:** An Operator can select the active authentication provider (Descope or Ory) via configuration, with **no application code change** (introduces an adapter-selection registry replacing the hardcoded `DescopeSyncAdapter` in `dependencies/identity.py`).
- **FR-A2:** The backend validates JWTs from **both** Descope (dual-issuer; `dct`/`tenants`-aware) and Ory (standard OIDC) via `py-identity-model`, selected by provider config; issuer allow-list / JWKS / audience become provider-config-driven.
- **FR-A3:** Provider-specific claims are normalized to a **canonical identity shape via a new claim-normalization abstraction** (Descope / Ory / generic-OIDC); downstream authorization reads canonical fields only.
- **FR-A4:** Users, roles, permissions, and tenant memberships persist in the canonical Postgres store and are **not** re-created, moved, or migrated when the active provider changes (the zero-migration invariant: 0 rows migrated).
- **FR-A5:** A single canonical user can be linked to identities in more than one provider via `idp_links` (`unique(provider_id, external_sub)`), resolving to one canonical user with one RBAC state.
- **FR-A6:** The frontend obtains identity, roles, and tenant memberships from a **canonical `/me` endpoint** rather than decoding provider-specific token claims.
- **FR-A7:** The reference app exposes a **visible, reproducible swap flow** demonstrating the same user's roles and tenant memberships intact before and after switching the active provider.
- **FR-A8:** RP-initiated logout works for the active provider (Descope Management logout; Ory RP-initiated logout), config-selected.
- **FR-A9:** The provider-swap invariant runs as an **automated end-to-end CI check**, not a manual demo.

**Epic B — open-identity-model: Agent/MCP OAuth 2.1 Client (polyglot) `[OIM]`**

- **FR-B1:** A Developer can acquire and validate OAuth2/OIDC tokens against **any** compliant provider using `open-identity-model` in **Python** (certified reference) and, at the MVP conformance bar, **Go**. (Rust = stated target/stretch, descoped from MVP.)
- **FR-B2:** The library provides the **core agent/MCP client flows** aligned to MCP's OAuth 2.1 baseline: discovery, JWKS, JWT validation, auth-code+PKCE, token exchange, and proof-of-possession (DPoP). Server-side resource protection, DCR (RFC 7591), and PRM (RFC 9728) are out of MVP scope.
- **FR-B3:** A Developer can run a **working MCP OAuth 2.1 client example in Python** demonstrating an agent obtaining and using a token to call an MCP server / protected resource.
- **FR-B4:** Go reaches **parity with the Python reference on the defined agent/MCP core-flow subset** (the Epic C conformance bar); the Rust gap is tracked, not hidden or gating.
- **FR-B5:** The Python reference **maintains its OpenID certification** through the MVP under the current package name (no speculative re-cert).
- **FR-B6:** The agent/MCP client surface is documented with per-language quickstarts targeting **< 30 min time-to-first-token**.
- **FR-B7:** The library honors the **normative security behaviors** required of a conformant client (RFC 9207 `iss`, discovery endpoint-authority binding, bounded JWKS/discovery caches, redirect-downgrade defense, `azp`/clock-skew, secret redaction).

**Epic C — "The Brain": Provider Capability Matrix + Cross-Language Conformance Spec `[BRAIN]` / `[OIM]`**

- **FR-C1:** A Developer/Architect can read a **public, versioned provider capability matrix** documenting how each supported provider models the management/RBAC plane (target: 9 providers, source-cited).
- **FR-C2:** A **cross-language conformance spec** living in `identity-model` `spec/` (incl. `spec/management/`) defines a shared, executable set of conformance test definitions each language implementation must pass.
- **FR-C3:** Conformance results are published as a **reproducible, versioned coverage report**: `(# providers × # languages)` passing.
- **FR-C4:** The capability matrix **explicitly labels** which capabilities are portable (standardized) vs. provider-proprietary (the moat surface).
- **FR-C5:** The spec is **versioned** (`mp-<semver>`) and consumable by both humans and downstream validation; the library CI pins a spec version.
- **FR-C6:** A Maintainer can add a new provider or language to the matrix/spec via a **documented, contribution-friendly process**.
- **FR-C7:** Each matrix cell is clearly marked **"documented"** vs **"conformance-verified"** (live-run).

**Epic D — Brand at the Cheap Layer + Name Reservation (renames OUT of MVP, gated) `[BRAIN]` / all repos**

- **FR-D1:** The GitHub org/repos adopt the `open-identity` / `open-identity-model` brand with **auto-redirects preserved**; Pages/Actions references are fixed.
- **FR-D2:** Public positioning and READMEs are rewritten so **portability / "identity fabric for developers"** is the lead narrative; no routing/arbitrage analogy anywhere.
- **FR-D3:** The new package names (PyPI, crates.io) and GitHub identifiers are **defensively reserved** without publishing renamed releases.
- **FR-D4:** The OpenID certification rename/re-cert **path is investigated and its answer recorded** as a gate input — not an action taken.
- **FR-D5:** **No irreversible rename is executed in MVP** (0 package renames of shipping packages, 0 Go module-path changes, 0 OpenID re-cert submissions).

### NonFunctional Requirements

- **NFR1 (Security — token validation):** Token validation is correct and safe across both providers (signature, `exp`/`nbf`, issuer, audience, `azp`, clock-skew, redirect-downgrade defense). No secrets in logs or errors (secret redaction).
- **NFR2 (Security — server-side RBAC):** RBAC is enforced server-side against the canonical store (`require_role()`/`require_permission()`); provider claims are never trusted directly for authorization.
- **NFR3 (Security — additive neutralization):** Provider-neutralization is strictly additive — the Descope validation path (dual-issuer + `dct` single-tenant inference) is preserved unchanged; the Ory path treats tokens as standard OIDC and must not require or infer `dct`/`tenants` (their absence is not an error).
- **NFR4 (Reliability — deterministic swap CI):** The swap-invariant CI check is deterministic (no flakiness): a green result reliably means the zero-migration invariant held.
- **NFR5 (Reliability — reproducible conformance):** Conformance results are reproducible: a third party running the pinned spec version obtains the same pass/fail matrix.
- **NFR6 (Performance — onboarding):** Time-to-first-token < 30 min (developer onboarding, not runtime latency).
- **NFR7 (Performance — CI budget & bounded caches):** Conformance and swap CI jobs complete within the repos' normal CI budget; JWKS/discovery caches are bounded (also a security requirement).
- **NFR8 (Compatibility — no breaking package changes):** No breaking changes to published packages during MVP (names and module paths unchanged; the rename is gated).
- **NFR9 (Compatibility — idiomatic, standards-based library):** The client library remains idiomatic per language and standards-based (works against any compliant provider, not just Descope/Ory).
- **NFR10 (Compatibility — reference/parity roles):** Python remains the feature source-of-truth and certified reference; Go mirrors it at the defined core-flow bar (Rust = stretch).
- **NFR11 (Maintainability — governed spec):** "The brain" is versioned with a documented change process; the library CI pins a spec version.
- **NFR12 (Maintainability — contribution flow):** Adding a provider or language is a documented contribution flow.
- **NFR13 (Governance — no credentials in canonical store):** No IdP credentials in Postgres; `providers.config_ref` points at Infisical and is stripped from every API response.

### Additional Requirements

Technical/architectural requirements from `architecture-open-identity.md` (ADR-OI-1…10, Resolved Decisions OD-1…9) that shape stories:

- **AR1 (Canonical-authoritative SoR — ADR-OI-1/OD-1):** The canonical Postgres store is the RBAC system-of-record; providers are **projections** reached through adapters; a swap **re-projects** onto the target provider. Provider-authoritative deployments are an explicitly-rejected alternative.
- **AR2 (Two-plane contract — ADR-OI-2):** Protocol/client plane (commodity, already specced) vs management/RBAC plane (moat, new spec) share one conformance machinery but version independently.
- **AR3 (Two independent semver lines — ADR-OI-3/OD-2):** `pp-<semver>` (protocol) and `mp-<semver>` (management) with a published compatibility matrix; each adapter declares both versions it targets.
- **AR4 (Adapter capability groups — ADR-OI-3):** G1 outbound sync (**exists** in `base.py`), G2 inbound import (formalize "seed migration"), G3 reconcile (deferred), G4 capability discovery (`supports`/`declared_profile`), G5 claim normalization (exists via `to_principal`), G6 proxied passthrough (ReBAC/auth — not portable).
- **AR5 (Governed capability namespace — ADR-OI-4):** `Provider.capabilities` moves from a free-form `list[str]` to a validated set drawn from `spec/management/capability-namespace.yaml` (dotted ids, tiered to the base three-tier model); matrix cells are **generated** from conformance results, never hand-edited.
- **AR6 (Claim-normalization contract — ADR-OI-5):** Per-provider named profiles (`Descope` = normative ref in `middleware/claims.py`; `Ory`; `GenericOIDC`) map a provider token payload → canonical `ClaimsPrincipal`; read-only, never authoritative for authz; gateway-mode vs standalone-mode split preserved.
- **AR7 (RBAC portability floor — ADR-OI-8/OD-4):** Flat `roles`/`permissions`/`role_permissions`/tenant-scoped `user_tenant_roles` is the guaranteed-portable floor; `roles.hierarchy`, `permissions.resource_scoped`, `tenants.hierarchy` are optional, conformance-gated capabilities (providers declare `n/a`).
- **AR8 (Conformance execution modes — ADR-OI-6/OD-6):** Fixtures/contract mode gates every PR (secret-free); a nightly live matrix runs the runnable subset (Descope test project, Ory, node-oidc-provider).
- **AR9 (Contract authority format — ADR-OI-3/OD-3/ADR-OI-10):** Prose-normative + JSON conformance vectors, Python reference implementation, with a `canonical-model.schema.json` seed; IDL/codegen is a future option, not adopted.
- **AR10 (MCP as protocol-plane profile — ADR-OI-9/OD-7):** MCP OAuth 2.1 is a **named client-plane capability profile** composed of auth-code+PKCE + discovery/JWKS/validation + token-exchange + DPoP; **not** a new canonical non-human principal (growth-only, sketched).
- **AR11 (Adapter authoring rules — §4.2):** Return `Result[…, SyncError|IdentityError]` (never raise for domain errors); keyword-only signatures; OTel span per provider HTTP call; resolve credentials from `config_ref` and strip it from output; a capability the adapter cannot support is declared `n/a` and returns `capability_unsupported` (never a silent no-op).
- **AR12 (AuthZEN track-only — ADR-OI-8/OD-5):** Keep an internal `check()` seam so a future AuthZEN binding is possible; do not adopt AuthZEN now. ReBAC/FGA is observed, not built.
- **AR13 (Ory feeder substrate — PRD §Relationship, `epics-ory-sso-provider.md`):** The Ory-SSO feeder epics (Epics 1–5, Stories 1.1–5.2) are the direct substrate for Epic A. Epic A **composes** them and adds the swap narrative + zero-migration CI assertion. Where a feeder story already specifies underlying wiring, the Epic A story references it rather than re-specifying it.

### UX Design Requirements

**Not applicable as a standalone input.** No dedicated UX Design specification was provided for the
open-identity MVP, so no `UX-DR` items are extracted here. The UI-visible requirements the MVP does carry —
a provider-neutral `/me`-driven RBAC UI, a provider-driven frontend OIDC config, and a visible/reproducible
swap flow — are captured as **functional stories in Epic A (A.8 and A.10)**, drawing on the admin surfaces
provided by PRD 5b (Design System & Admin Frontend). If a UX spec is later authored, its requirements
should be folded into Epic A or a dedicated UX-polish epic per the skill's UX-DR convention.

### FR Coverage Map

| FR | Epic | Story/Stories | Notes |
|---|---|---|---|
| FR-A1 | A | A.3 (registry), A.2 (register Ory) | Adapter-selection registry — **net-new** (Descope hardcoded today) |
| FR-A2 | A | A.4 | Config-driven issuer/JWKS/aud + Ory OIDC branch; Descope path unchanged |
| FR-A3 | A | A.5 | Claim-normalization abstraction — **net-new** (`to_principal(claims,"Descope")` hardcoded today) |
| FR-A4 | A | A.11 | Zero-migration invariant (0-row diff) |
| FR-A5 | A | A.7 | Multi-provider `idp_links` linking + resolution/JIT |
| FR-A6 | A | A.8 | Canonical `/me` + provider-neutral frontend |
| FR-A7 | A | A.10 | Visible, reproducible swap flow |
| FR-A8 | A | A.9 | Provider-aware RP-initiated logout |
| FR-A9 | A | A.12 | Automated E2E swap CI check |
| FR-B1 | B | B.1 (Python auth-code+PKCE), B.6 (Go) | Auth-code+PKCE already **shipped** in Python **and** Go → conformance-**verify**, not build |
| FR-B2 | B | B.1, B.2 (token-exchange), B.3 (DPoP) | Token-exchange + DPoP already **shipped** in Python **and** Go → conformance-**verify**, not build |
| FR-B3 | B | B.5 | Runnable MCP OAuth 2.1 example (Python) |
| FR-B4 | B | B.6 | Go parity at core-flow bar (Go already `implemented`) |
| FR-B5 | B | B.8 | Maintain OpenID cert; no regression |
| FR-B6 | B | B.7 | Per-language quickstarts, < 30 min TTFT |
| FR-B7 | B | B.4 | Normative client security behaviors |
| FR-C1 | C | C.6 | Public 9-provider capability matrix ([BRAIN]) |
| FR-C2 | C | C.1 (namespace/schema), C.2 (conformance defs), C.3 (runner) | `spec/management/` is empty today → **net-new** |
| FR-C3 | C | C.5 | Generated coverage report |
| FR-C4 | C | C.6 | Portable vs proprietary labels |
| FR-C5 | C | C.1, C.7 | `mp-<semver>` + change process + pinned version |
| FR-C6 | C | C.7 | Contribution process |
| FR-C7 | C | C.4 (live), C.5, C.6 | documented vs conformance-verified labeling |
| FR-D1 | D | D.2 | Brand adoption + redirects |
| FR-D2 | D | D.3 | Positioning/README rewrite |
| FR-D3 | D | D.1 | Reserve package/org names |
| FR-D4 | D | D.4 | OpenID re-cert path recorded |
| FR-D5 | D | D.5 | Rename-safety gate record |

All 28 FRs are covered by at least one story.

---

## Epic List

### Epic A: Descope⇄Ory Provider-Swap Demo (zero RBAC migration) `[IS]`
Prove — green in CI — that switching the active authentication provider (Descope⇄Ory) leaves users, roles,
permissions, and tenants intact, because RBAC lives canonically in Postgres and the swap **re-projects**
rather than migrates. Net-new build on solid scaffolding: an adapter-selection registry, an Ory adapter +
Ory inbound validation, a provider-neutral claim-normalization abstraction, and the zero-migration CI
assertion.
**FRs covered:** FR-A1, FR-A2, FR-A3, FR-A4, FR-A5, FR-A6, FR-A7, FR-A8, FR-A9

### Epic B: open-identity-model — Agent/MCP OAuth 2.1 Client (polyglot) `[OIM]`
Ship the polyglot OIDC/OAuth client with first-class agent/MCP OAuth 2.1 support: the certified Python
reference plus Go at the core-flow bar, and one runnable MCP OAuth 2.1 example. The MCP surface is a
protocol-plane profile of the client, not a new canonical principal.
**FRs covered:** FR-B1, FR-B2, FR-B3, FR-B4, FR-B5, FR-B6, FR-B7

### Epic C: "The Brain" — Provider Capability Matrix + Cross-Language Conformance Spec `[BRAIN]` / `[OIM]`
Turn "we support many providers" into a verifiable claim: a public versioned capability matrix (9 providers)
plus a cross-language management-plane conformance spec in `identity-model` `spec/management/`, run in CI as
fixtures-PR-gating + nightly-live, with a reproducible coverage report.
**FRs covered:** FR-C1, FR-C2, FR-C3, FR-C4, FR-C5, FR-C6, FR-C7

### Epic D: Brand at the Cheap Layer + Name Reservation (renames OUT of MVP, gated) `[BRAIN]` / all repos
Adopt the open-identity brand at the repo/org/marketing layer and reserve package names defensively, while
deferring every irreversible rename behind the Rename Gate. Positioning is rewritten around
portability/fabric; zero one-way doors spent.
**FRs covered:** FR-D1, FR-D2, FR-D3, FR-D4, FR-D5

**Epic dependency shape (high level):** Epic A is the dominant critical path (external Ory provisioning is
the long pole). Epic B runs largely in parallel (its net-new work is the MCP OAuth 2.1 example; the
auth-code+PKCE / token-exchange / DPoP primitives it composes are already shipped in both Python and Go). Epic C's *live* conformance sequences **behind** Epic A's Python management-plane
implementation (A.5 claim-normalization, A.11 swap-invariant); its spec-authoring (C.1/C.2) is independent.
Epic D's D.1–D.4 are independent; D.5 (and the Rename Gate) aggregate A.12 + Epic C parity + D.4.

---

## Epic A: Descope⇄Ory Provider-Swap Demo (zero RBAC migration) `[IS]`

Prove — green in CI — that switching the active authentication provider leaves users, roles, permissions,
and tenants intact. **Canonical-authoritative framing (ADR-OI-1/OD-1):** the Postgres canonical store is the
RBAC system-of-record; providers are projections; a swap re-projects and asserts a **0 canonical-RBAC-row
diff**. It does **not** migrate Descope-FGA → Ory-Keto authorization data. Every `identity-stack` change is
**additive** — the Descope path is never removed. **Composes** the Ory-SSO feeder epics
(`epics-ory-sso-provider.md`, AR13) and adds the swap narrative + zero-migration CI assertion.

**Grounded reality (read-only audit):** shipped today = canonical 8-table Postgres model, `idp_links`
(`unique(provider_id, external_sub)`), outbound-sync `IdentityProviderAdapter` ABC (`services/adapters/base.py`),
`DescopeSyncAdapter`, `Provider` registry + `ProviderService`, `IdentityResolutionService` (with a
`{user, roles, tenant_memberships, linked_idps}` payload), and multi-provider CI. **Net-new** = the
adapter-*selection* registry (Descope is hardcoded in `dependencies/identity.py`, 5 call-sites), the
claim-normalization abstraction (`to_principal(claims,"Descope")` hardcoded in `middleware/auth.py` +
`middleware/claims.py`), and the entire Ory adapter (client, adapter impl, Terraform/compose, inbound
validation, CI). `ProviderType.ory` exists as an enum value only.

### Story A.1: Ory provider infrastructure (Terraform + compose + SPA client + identity schema)

As an Operator,
I want a provisioned, reproducible Ory environment (dev and CI) that issues JWT access tokens and supports auth-code+PKCE,
So that the reference app has a real second provider to authenticate against and swap to.

**Acceptance Criteria:**

**Given** the `identity-stack` infra tracks and no Ory environment
**When** the Ory infrastructure story is implemented (composes feeder Stories 1.1–1.3)
**Then** an Ory project/stack is provisioned as code (Terraform track and/or docker-compose) configured to issue **JWT** access tokens (not opaque)
**And** a public SPA OAuth2 client exists with authorization-code + PKCE and the app's redirect URIs registered
**And** an Ory identity schema is defined (with Organizations flag-gated per feeder Story 1.3) and its issuer URL + JWKS endpoint are discoverable
**And** all Ory credentials/secrets are stored in Infisical and referenced by `config_ref` (never committed; NFR13)
**And** the environment is bootstrappable in both local dev and CI (see Open Decision #4 re: managed Ory Network vs self-hosted Kratos/Hydra/Keto for the CI live-matrix)

*Dependencies:* none (foundational). *Repo:* `identity-stack` (infra) + Ory IaC. *FR:* enables FR-A1/A2.

### Story A.2: Register the `ory` provider in the canonical registry

As an Operator,
I want Ory registered as a canonical provider with its issuer URL, capability profile, and secret reference,
So that the app can resolve Ory configuration (issuer, JWKS, capabilities) from the registry, not from hardcoded constants.

**Acceptance Criteria:**

**Given** the Ory environment from A.1 and the existing `Provider`/`ProviderService` registry
**When** the `ory` provider is registered (composes feeder Story 2.1) via `POST /providers`
**Then** a `Provider` row exists with `type=ory`, its `issuer_url`, `base_url`, a declared `capabilities` set, and a `config_ref` pointing to Infisical
**And** `config_ref` is stripped from every API response (verified against `ProviderService.list_providers`; NFR13)
**And** registering a duplicate provider name returns a conflict, not a second row
**And** the declared capabilities use identifiers consistent with the governed namespace direction (see Open Decision #3 — free-string now vs. block on Epic C's `capability-namespace.yaml`)

*Dependencies:* A.1. *Repo:* `identity-stack`. *FR:* FR-A1.

### Story A.3: Adapter-selection registry (config-driven active provider)

As an Operator,
I want the active provider's sync adapter to be resolved from a registry keyed by provider type,
So that switching the active provider is a config/env change with no application code change.

**Acceptance Criteria:**

**Given** `DescopeSyncAdapter` is currently hardcoded in `dependencies/identity.py` (5 call-sites) and `DEPLOYMENT_MODE` only swaps the middleware stack, not the IdP
**When** an adapter-selection registry is introduced that maps `ProviderType` → adapter factory and resolves the **active** provider from configuration/registry
**Then** the `get_*_service()` dependency factories obtain their adapter from the registry rather than constructing `DescopeSyncAdapter` directly
**And** with the active provider set to `descope`, the app boots and serves auth exactly as before (no behavior change; NFR3)
**And** the registry cleanly supports registering additional adapters (Ory is plugged in by A.6) without further changes to the selection mechanism
**And** selecting a provider that has no registered adapter fails fast at startup with a clear error (never a silent no-op; AR11)
**And** the selection mechanism is documented and reproducible

*Dependencies:* A.2. *Repo:* `identity-stack`. *FR:* FR-A1. *Note:* built with Descope only to avoid a forward dependency on the Ory adapter; A.6 registers Ory into this registry.

### Story A.4: Config-driven inbound token validation + Ory OIDC branch

As a Developer,
I want JWT validation to be driven by the active provider's config and to accept standard-OIDC Ory tokens,
So that both Descope and Ory tokens validate correctly without hardcoding Descope's issuer formats.

**Acceptance Criteria:**

**Given** `TokenValidationMiddleware` and `GatewayClaimsMiddleware` hardcode Descope's two issuer formats and `dct`/`tenants` logic
**When** validation is made provider-config-driven (composes feeder Stories 2.2–2.4)
**Then** the issuer allow-list, JWKS/discovery address, and audience are resolved from the active provider's registry config
**And** a **Descope**-issued token still validates via the dual-issuer path with `dct` single-tenant inference **unchanged** (NFR3; regression-tested)
**And** an **Ory**-issued token validates as standard OIDC and does **not** require or infer `dct`/`tenants`; their absence is **not** an error
**And** JWKS/discovery caches remain bounded (NFR1/NFR7)
**And** no secret or token material leaks into logs or error responses (NFR1)

*Dependencies:* A.2. *Repo:* `identity-stack`. *FR:* FR-A2.

### Story A.5: Provider-neutral claim-normalization abstraction (ClaimMapper)

As a Developer,
I want provider token claims normalized to a single canonical principal shape via a per-provider profile,
So that all downstream authorization code is provider-agnostic and reads canonical fields only.

**Acceptance Criteria:**

**Given** normalization is a hardcoded `to_principal(claims, "Descope")` and today's "canonical" shape is Descope's native `dct`/`tenants`
**When** a claim-normalization abstraction (the `claims.normalize` capability, ADR-OI-5) is introduced with named profiles `Descope`, `Ory`, `GenericOIDC`
**Then** both a Descope token and an Ory token produce the **same** canonical principal shape (canonical user id, email, current tenant, tenant memberships, roles) — read-only and never authoritative for authz (NFR2)
**And** the `Descope` profile reproduces current `middleware/claims.py` behavior exactly (dual-issuer, `dct` inference) as the normative reference
**And** downstream `require_role`/`require_permission` resolve authorization from the **canonical store**, reading canonical fields only (NFR2)
**And** the gateway-mode vs standalone-mode split is preserved (normalization runs on the pre-validated payload in gateway mode with defense-in-depth `exp`/`iss`/`aud`)
**And** the seam is unit-tested with language-neutral claim fixtures per profile (feeds Epic C's `claims-normalize.json`)

*Dependencies:* A.4. *Repo:* `identity-stack` (Resolved 2026-09-02: claim-normalization abstraction + Ory/GenericOIDC profiles + fixtures stay app-side in identity-stack `[IS]`; not promoted to `py_identity_model` for MVP). *FR:* FR-A3.

### Story A.6: OrySyncAdapter (outbound sync, G1) + Ory management client

As an Operator,
I want an Ory adapter that mirrors canonical identity/tenant state to Ory and keeps roles/permissions canonical,
So that Ory can be the active provider while RBAC stays in Postgres (canonical-authoritative).

**Acceptance Criteria:**

**Given** the adapter-selection registry (A.3) and `ProviderType.ory`
**When** `OrySyncAdapter` implements the G1 outbound-sync surface of `IdentityProviderAdapter` (composes feeder Stories 3.3–3.5) and is registered in the registry
**Then** `sync_user` mirrors canonical users to Ory (Kratos identities); tenant sync maps canonical tenants ↔ Ory Organizations (Tier-3 shape mapping, flag-gated per feeder 3.5)
**And** roles/permissions/assignments are **not** pushed to Ory as authorization (Ory has none) — they stay canonical (ADR-OI-1/AR1); the adapter declares `roles.*` it cannot hold as `n/a` and returns `capability_unsupported` if called (AR11)
**And** all methods return `Result[None, SyncError]`, are keyword-only, wrap each Ory HTTP call in an OTel span, and resolve credentials from `config_ref` (never Postgres) (AR11/NFR13)
**And** setting the active provider to `ory` boots the app and serves auth via Ory with **no application code change** (FR-A1)

*Dependencies:* A.3, A.1. *Repo:* `identity-stack`. *FR:* FR-A1, FR-A3.

### Story A.7: Cross-provider identity resolution + JIT provisioning via `idp_links`

As a Developer,
I want an Ory `sub` to resolve to a canonical user (JIT-provisioned on first login) and one canonical user to be linkable to both Descope and Ory,
So that the same person resolves to one canonical user with one RBAC state regardless of active provider.

**Acceptance Criteria:**

**Given** `idp_links` enforces `unique(provider_id, external_sub)` and `IdentityResolutionService` resolves inbound tokens
**When** Ory resolution + JIT provisioning is implemented (composes feeder Stories 3.1–3.2)
**Then** an existing Ory link resolves to the correct canonical user; an unknown Ory `sub` JIT-provisions a canonical user and creates the `idp_links` row
**And** linking a second provider identity (Ory) to an existing canonical user (already linked to Descope) succeeds and does **not** duplicate the user (FR-A5)
**And** authenticating via **either** provider resolves the **same** canonical user id and the same roles/tenant memberships
**And** resolution is covered by unit/integration tests for both providers

*Dependencies:* A.4, A.2. *Repo:* `identity-stack`. *FR:* FR-A5.

### Story A.8: Canonical `/me` endpoint + provider-neutral frontend

As a frontend Developer,
I want a canonical `/me` endpoint and a provider-driven OIDC config,
So that the UI renders identical RBAC/tenant views regardless of which provider is active, without decoding provider claims.

**Acceptance Criteria:**

**Given** there is no `/me` route today and the frontend `oidcConfig` is hardcoded to `VITE_DESCOPE_*` (`main.tsx`)
**When** the canonical `/me` endpoint and provider-neutral frontend are implemented (composes feeder Stories 4.1–4.3)
**Then** `GET /me` returns the canonical identity payload (`{user, roles, tenant_memberships, linked_idps}` — the `IdentityResolutionService._build_identity_payload` shape)
**And** `useRBAC`/`useTenants` consume `/me` and render identical RBAC UI regardless of active provider; the frontend no longer decodes Descope `dct`/`tenants` claims directly (FR-A6)
**And** the frontend OIDC client config (authority/issuer/client-id) is provider-driven, not `VITE_DESCOPE_*`-only
**And** `/me` requires a valid session/token and returns 401 otherwise

*Dependencies:* A.5, A.7. *Repo:* `identity-stack` (backend + frontend). *FR:* FR-A6.

### Story A.9: Provider-aware RP-initiated logout

As an Operator,
I want logout to use the active provider's mechanism,
So that ending a session works correctly for whichever provider is active.

**Acceptance Criteria:**

**Given** the active provider is config-selected (A.3)
**When** provider-aware logout is implemented (composes feeder Story 5.1)
**Then** logout under Descope terminates the session via Descope Management logout
**And** logout under Ory terminates the session via Ory RP-initiated logout (end-session endpoint)
**And** the logout mechanism is selected by provider config with no application code change
**And** post-logout the session is invalidated and protected routes return 401

*Dependencies:* A.3, A.4. *Repo:* `identity-stack`. *FR:* FR-A8.

### Story A.10: Visible, reproducible swap flow (demo path)

As an Evaluator,
I want a documented, reproducible flow that shows the same user's roles and tenants before and after switching the active provider,
So that the "provider swap with RBAC intact" claim is demonstrable in a live walkthrough.

**Acceptance Criteria:**

**Given** the app can serve auth under either provider (A.3, A.6) and expose canonical identity (A.8)
**When** a visible swap flow is provided (scripted and/or via the admin UI, drawing on PRD 5b surfaces)
**Then** the flow shows the demo user's roles and tenant memberships **before** the swap, performs the config-only provider switch, and shows the **same** roles and tenant memberships **after**
**And** the flow keeps the demo user's RBAC within the guaranteed-portable flat floor (AR7; see Open Decision #6)
**And** the flow is documented step-by-step and reproducible by a reviewer without code changes

*Dependencies:* A.3, A.5, A.7, A.8. *Repo:* `identity-stack`. *FR:* FR-A7.

### Story A.11: Zero-RBAC-migration invariant assertion + `swap-invariants` fixtures

As a Maintainer,
I want a programmatic assertion that no canonical RBAC row changes across a provider swap,
So that "zero RBAC migration" is a machine-checked invariant, not a narrated claim.

**Acceptance Criteria:**

**Given** a demo user with roles, permissions, and tenant memberships in the canonical store
**When** a Descope⇄Ory swap is performed and the invariant assertion runs
**Then** the row counts and role/permission/tenant assignments in `roles`, `permissions`, `role_permissions`, and `user_tenant_roles` are **byte-identical** pre/post swap for the demo user (**0 rows migrated**; FR-A4)
**And** the canonical principal resolved before and after the swap is equal per user (before/after principal equality)
**And** the assertion is expressed as reusable, language-neutral `swap-invariants` fixtures (feeds Epic C `spec/management/conformance/swap-invariants.json`)
**And** the assertion is deterministic — a green result reliably means the invariant held (NFR4)

*Dependencies:* A.5, A.7 (and A.6 for the Ory side of the swap). *Repo:* `identity-stack` (+ fixtures consumed by `[OIM]`). *FR:* FR-A4.

### Story A.12: Automated end-to-end provider-swap CI check

As a Maintainer,
I want the swap invariant to run as an automated E2E CI job,
So that the headline claim is continuously verified green/red, not demonstrated manually.

**Acceptance Criteria:**

**Given** the invariant assertion (A.11) and a CI-reachable Ory environment (A.1)
**When** an E2E CI job runs
**Then** the job authenticates via **each** provider, exercises the swap, and asserts A.11's zero-migration invariant
**And** the job result is green/red, deterministic (no flakiness; NFR4), and reproducible by a third party
**And** the job completes within the repo's normal CI budget (NFR7)
**And** a red result blocks merge; the assertion output identifies which table/row diverged

*Dependencies:* A.11, A.1. *Repo:* `identity-stack` CI. *FR:* FR-A9.

**Epic A summary:** 12 stories covering FR-A1…FR-A9. Critical path: A.1 → A.2 → A.3/A.4 → A.5/A.6/A.7 → A.8/A.9 → A.10 → A.11 → A.12. A.1 (external Ory provisioning) is the long pole.

---

## Epic B: open-identity-model — Agent/MCP OAuth 2.1 Client (polyglot) `[OIM]`

Ship the polyglot OIDC/OAuth client with first-class agent/MCP OAuth 2.1 support. **In-scope languages =
Python + Go** (Rust = stated target/stretch, descoped). The agent surface is a **protocol-plane profile**
(AR10), not a new canonical principal.

**Grounded reality (capability state verified against live repo source 2026-09-02 — not the drifting status
matrix):** in **Python**, `Authorization Code + PKCE`, `Token Exchange`, and `DPoP` are all **already
implemented** (Python is the most complete impl overall — also PAR, FAPI, JAR, mTLS, DCR); in **Go** they
are **also implemented** (`go/pkg/token/pkce.go`, `go/pkg/token/token.go`, `go/pkg/dpop/verify.go`). The
core agent/MCP primitives therefore already exist in both in-scope languages. Epic B's real net-new MVP work
is (a) the **MCP OAuth 2.1 client example** (net-new, but *assembly on top of* those existing primitives),
(b) **maintaining Python's OpenID certification** (no regression), and (c) **confirming Go core-flow
parity** (verification, not build). Rust already has auth-code+PKCE (`rust/src/token/pkce.rs`); its genuine
remaining gaps are **token-exchange + DPoP** — relevant only if the Rust stretch is pursued. **Epic B is
therefore smaller than a from-scratch flow build.**

### Story B.1: Python authorization-code + PKCE — confirm conformance (already implemented)

As a Developer,
I want the Python reference's existing authorization-code + PKCE flow confirmed against any compliant provider,
So that the foundational MCP OAuth 2.1 flow is conformance-verified in the certified reference language.

**Acceptance Criteria:**

**Given** Python `Authorization Code + PKCE` is **already implemented** in `py-identity-model` (verified in live source; Go is implemented too) — this is a **verification / conformance-run, not a flow build**
**When** the existing flow is exercised against the conformance vectors (RFC 6749 §4.1, RFC 7636)
**Then** authorization-code + PKCE token acquisition works against an arbitrary compliant provider (Ory / node-oidc-provider fixtures)
**And** the capability passes `spec/conformance/authorization-code.json` and its matrix cell for Python is **confirmed** `implemented` **via CI**, not by hand-edit (AR5)
**And** discovery + JWKS + JWT validation continue to pass (no regression; NFR8/NFR9)

*Dependencies:* none. *Repo:* `py-identity-model`. *FR:* FR-B1, FR-B2. *Note:* capability state verified against live repo source 2026-09-02 (not the drifting status matrix).

### Story B.2: Python token-exchange (RFC 8693) — confirm conformance (already implemented)

As an Agent builder,
I want the Python reference's existing delegated token-exchange confirmed,
So that an agent can obtain a delegated token (`act` claim) as part of the MCP OAuth 2.1 profile.

**Acceptance Criteria:**

**Given** Python `Token Exchange` is **already implemented** in `py-identity-model` (verified in live source; Go is implemented too) — verification, not a build
**When** the existing token-exchange path is exercised against the conformance vectors (RFC 8693)
**Then** a delegated agent token can be obtained, carrying the `act` claim, against a test authorization server
**And** the capability passes `spec/conformance/token-exchange.json` and its Python matrix cell is **confirmed** `implemented` via CI
**And** secret material is redacted from logs/errors (NFR1)

*Dependencies:* B.1. *Repo:* `py-identity-model`. *FR:* FR-B2.

### Story B.3: Python DPoP (RFC 9449) proof-of-possession — confirm conformance (already implemented)

As an Agent builder,
I want the Python reference's existing sender-constrained (DPoP) support confirmed,
So that the MCP OAuth 2.1 example can demonstrate proof-of-possession per MCP's Nov-2025 tightening.

**Acceptance Criteria:**

**Given** Python `DPoP` is **already implemented** in `py-identity-model` (verified in live source; Go is implemented too) — verification, not a build; DPoP is a **parity-target, not an MVP gate** (Resolved Decision #6)
**When** the existing DPoP path is exercised against the conformance vectors (RFC 9449)
**Then** the client can create a DPoP proof and obtain/use a sender-constrained token against a test AS
**And** the capability passes `spec/conformance/dpop.json` and its Python matrix cell is **confirmed** `implemented` via CI
**And** the DPoP proof key handling redacts secrets and is bounded/rotated safely (NFR1)

*Dependencies:* B.1. *Repo:* `py-identity-model`. *FR:* FR-B2.

### Story B.4: Normative client security behaviors (in-scope languages)

As a security-conscious Developer,
I want the client to honor the normative security behaviors of a conformant OIDC/OAuth client,
So that the library is safe to build agents on and closes the identified reconciliation gaps.

**Acceptance Criteria:**

**Given** the reconciliation-identified gaps (RFC 9207 `iss`, discovery endpoint-authority binding, bounded caches, redirect-downgrade, `azp`/skew, secret redaction)
**When** these behaviors are implemented/verified for the in-scope languages (Python + Go)
**Then** RFC 9207 `iss` in the authorization response is validated; the discovery document's endpoints are authority-bound to the issuer
**And** JWKS/discovery caches are bounded (NFR1/NFR7); redirect-downgrade is defended; `azp` and clock-skew are enforced
**And** no secret leaks into logs or error output (NFR1)
**And** each behavior is covered by a conformance/unit test

*Dependencies:* B.1 (validation/discovery surface). *Repo:* `py-identity-model`, `identity-model/go`. *FR:* FR-B7.

### Story B.5: Runnable MCP OAuth 2.1 client example (Python)

As an Agent/MCP builder,
I want a runnable Python example where an agent obtains and uses a token to call an MCP server,
So that I can adopt certified, vendor-neutral agent auth in under 30 minutes.

**Acceptance Criteria:**

**Given** the Python auth-code+PKCE, token-exchange, and DPoP flows already exist (confirmed in B.1–B.3) — this MCP example is Epic B's genuinely **net-new** deliverable, assembling those existing primitives
**When** an MCP OAuth 2.1 client example is provided
**Then** the example exercises the OAuth 2.1 flow end-to-end against a test MCP/OAuth server (an agent obtains a token and calls a protected MCP resource)
**And** the example demonstrates proof-of-possession (DPoP) as available (parity-target, not gating — see Open Decision #5)
**And** it ships with a documented quickstart runnable by a new developer
**And** the example names the **MCP OAuth 2.1 profile** as the composed subset (auth-code+PKCE + discovery/JWKS/validation + token-exchange + DPoP; AR10) for reuse by B.6

*Dependencies:* B.1, B.2, B.3. *Repo:* `py-identity-model` (examples). *FR:* FR-B3.

### Story B.6: Go core-flow parity verification against the MCP profile

As a Developer,
I want Go verified at parity with the Python reference on the agent/MCP core-flow subset,
So that the polyglot claim is conformance-backed, not asserted.

**Acceptance Criteria:**

**Given** Go already has auth-code+PKCE, token-exchange, and DPoP `implemented`
**When** the MCP OAuth 2.1 profile subset (named in B.5) is run for Go
**Then** Go passes the named core-flow conformance subset (`authorization-code.json`, `token-exchange.json`, `dpop.json`, plus discovery/jwks/validation) via CI
**And** the Rust status is shown honestly in the matrix — Rust already has auth-code+PKCE (`rust/src/token/pkce.rs`); its remaining gaps are **token-exchange + DPoP** (`planned`), tracked and not hidden or gating (FR-B4)
**And** the profile-run wiring is reusable by the coverage report (Epic C, C.5)

*Dependencies:* B.5 (profile definition), B.1–B.3 (flows). *Repo:* `identity-model/go`. *FR:* FR-B4.

### Story B.7: Per-language quickstarts, < 30 min time-to-first-token

As a new Developer,
I want a quickstart per in-scope language,
So that I can acquire and validate a token against an arbitrary provider in under 30 minutes.

**Acceptance Criteria:**

**Given** Python (B.1) and Go (B.6) at the core-flow bar
**When** per-language quickstarts are written for Python and Go
**Then** each quickstart walks a new developer from install to first validated token against an arbitrary compliant provider
**And** a timed walkthrough confirms **< 30 min** time-to-first-token (NFR6)
**And** the quickstarts target the agent/MCP client surface and link to the MCP example (B.5)

*Dependencies:* B.1, B.6. *Repo:* `[OIM]` docs. *FR:* FR-B6.

### Story B.8: Maintain Python OpenID certification (no regression)

As a Maintainer,
I want the Python reference to keep its OpenID certification under its current package name,
So that verifiable openness is preserved and no one-way door is spent during MVP.

**Acceptance Criteria:**

**Given** `py-identity-model` is OpenID RP certified under its current name
**When** the Epic B work lands (the MCP example B.5, the B.1–B.4 conformance verification, and any security hardening)
**Then** the certification is **not** regressed; certified conformance profiles still pass
**And** certification status is documented
**And** **no** speculative re-cert is submitted under a new name (defers to Epic D / the Rename Gate; FR-D5)

*Dependencies:* B.1, B.2, B.3, B.4. *Repo:* `py-identity-model`. *FR:* FR-B5.

**Epic B summary:** 8 stories covering FR-B1…FR-B7 — but **smaller than originally sized**. The auth-code+PKCE / token-exchange / DPoP primitives are already shipped in **both** Python and Go, so B.1/B.2/B.3 are conformance-**verification** (not flow builds) and B.6 is Go parity **confirmation**. The only genuinely net-new deliverable is the **MCP OAuth 2.1 example (B.5)**, plus **maintaining Python's OpenID certification (B.8)**. Rust's remaining gaps (token-exchange + DPoP) are stretch-only. Capability state verified against live repo source 2026-09-02 (not the drifting status matrix).

---

## Epic C: "The Brain" — Provider Capability Matrix + Cross-Language Conformance Spec `[BRAIN]` / `[OIM]`

Make portability verifiable. The executable conformance spec lives in the `identity-model` monorepo
(`spec/management/`, **empty today**); the planning repo `[BRAIN]` publishes/indexes the human-readable
capability matrix. Matrix v1 = the 9-provider **documented** matrix + **live conformance** only for the
runnable subset (Descope, Ory, node-oidc-provider). Every cell is labeled **documented** vs
**conformance-verified**.

### Story C.1: Governed capability namespace + versioned canonical-model schema

As a Maintainer,
I want a governed capability namespace and a versioned canonical-model schema,
So that provider capabilities are validated identifiers (not free strings) and the contract has a semver line.

**Acceptance Criteria:**

**Given** `Provider.capabilities` is a free-form `list[str]` and `spec/management/` is empty
**When** the namespace and schema are authored
**Then** `spec/management/capability-namespace.yaml` enumerates dotted capability ids (e.g. `users.crud`, `roles.crud`, `roles.assign`, `permissions.map`, `claims.normalize`, `sync.outbound`, `sync.inbound`), each tagged with its tier and spec/conformance refs (AR5)
**And** `spec/management/canonical-model.schema.json` versions the canonical 8-aggregate model as JSON Schema (AR9)
**And** the management-plane semver line `mp-<semver>` is established (starting `mp-1.0.0`), independent of the protocol-plane `pp-` line (AR3)
**And** the flat RBAC portability floor is distinguished from optional/conformance-gated capabilities (`roles.hierarchy`, `permissions.resource_scoped`, `tenants.hierarchy`) (AR7)

*Dependencies:* none. *Repo:* `identity-model` (`spec/management/`). *FR:* FR-C2, FR-C5.

### Story C.2: Management-plane conformance definitions + fixtures

As a Maintainer,
I want executable conformance definitions for the management-plane capabilities,
So that each portability claim is a machine-checkable test with language-neutral vectors.

**Acceptance Criteria:**

**Given** the namespace + schema from C.1 and the protocol-plane conformance grammar (`{given, when, then, references[], vectors[]}`)
**When** management-plane conformance files are authored
**Then** `spec/management/conformance/` contains `users-crud.json`, `roles-crud.json`, `roles-assign.json`, `permissions-map.json`, `claims-normalize.json`, `sync-outbound.json`, `sync-inbound.json`, and `swap-invariants.json`
**And** each test uses language-neutral vectors + canonical error codes (`not_found`, `conflict`, `validation`, `sync_failed`, `provider_error`, `capability_unsupported`, `normalization_failed`) and copies the protocol-plane conventions verbatim (AR8/AR9)
**And** `spec/management/fixtures/` holds provider claim payloads (Descope/Ory/GenericOIDC — reusing A.5 fixtures), canonical seed states, and role maps
**And** `swap-invariants.json` encodes the RBAC-table row-diff == ∅ + before/after principal equality assertion (reusing A.11)

*Dependencies:* C.1, A.5 (claim fixtures), A.11 (swap-invariant fixtures). *Repo:* `identity-model`. *FR:* FR-C2.

### Story C.3: Python reference conformance runner (fixtures mode, PR-gating, secret-free)

As a Maintainer,
I want the management-plane conformance to run against the Python reference in fixtures mode on every PR,
So that a capability is only ever marked `implemented` by a passing, secret-free CI run.

**Acceptance Criteria:**

**Given** the conformance definitions (C.2) and the Python management-plane implementation (`identity-stack` Epic A)
**When** a fixtures/contract-mode runner is wired into CI
**Then** the runner executes the management-plane conformance against the Python reference using recorded provider contracts/fakes — **no secrets required** (AR8)
**And** the run **gates every PR** and is fast within CI budget (NFR7)
**And** a capability×provider×language cell is marked `implemented` **only** when its conformance file passes (no hand-edits; AR5)
**And** results are emitted in a machine-readable form for the coverage report (C.5)

*Dependencies:* C.2. *Repo:* `identity-model` + `identity-stack`. *FR:* FR-C2.

### Story C.4: Nightly live conformance matrix over the runnable subset

As a Maintainer,
I want a nightly live conformance run against real providers,
So that the fixtures are proven to still match reality.

**Acceptance Criteria:**

**Given** the fixtures runner (C.3) and CI-reachable providers
**When** a nightly live-matrix job runs against the runnable subset (Descope test project via secret, Ory, node-oidc-provider)
**Then** the live run executes the same conformance definitions against real providers and reports pass/fail per cell (AR8)
**And** live-run failures are surfaced (they indicate fixtures drift) without blocking unrelated PRs
**And** the nightly job is reproducible and completes within budget (NFR5/NFR7)
**And** provider secrets are resolved from the secret manager, never committed (NFR13; see Open Decision #4 re: Ory target)

*Dependencies:* C.3, A.1/A.6 (Ory reachable). *Repo:* `identity-model` CI. *FR:* FR-C7.

### Story C.5: Generated, reproducible coverage report (providers × languages × capabilities)

As an adopting Architect,
I want a versioned coverage report generated from CI,
So that I can make a portability bet on evidence, with each cell stating pass/fail and spec version.

**Acceptance Criteria:**

**Given** fixtures results (C.3) and live results (C.4)
**When** a coverage-report generator runs
**Then** it emits a versioned `(# providers × # languages × capabilities)` report where each cell is `implemented`/`in-progress`/`planned`/`n/a`, generated from passing runs (never hand-edited; AR5)
**And** each cell records the spec version (`mp-<semver>`) and is labeled **documented** vs **conformance-verified** (FR-C7)
**And** the report is reproducible by a third party running the pinned spec version (NFR5)
**And** the report includes both protocol-plane (existing) and management-plane (new) results

*Dependencies:* C.3, C.4. *Repo:* `identity-model`. *FR:* FR-C3, FR-C7.

### Story C.6: Public versioned provider capability matrix (9 providers) `[BRAIN]`

As an Architect/Evaluator,
I want a public, versioned capability matrix that says what's portable vs proprietary per provider,
So that I can assess portability guarantees before adopting.

**Acceptance Criteria:**

**Given** `docs/idp-rbac-comparison.md` (9 providers) and the namespace (C.1)
**When** the public capability matrix is published/indexed in the planning repo `[BRAIN]`
**Then** the matrix is a canonical, versioned artifact covering the documented 9-provider set, source-cited (FR-C1)
**And** every capability row is labeled **portable (standardized)** vs **provider-proprietary (moat surface)** with rationale, capturing the "no OIDC standard for authorization claims" finding (FR-C4)
**And** each cell is marked **documented** vs **conformance-verified**, with providers lacking a live run labeled documented-only (FR-C7)
**And** the matrix links to (points at) the conformance coverage report (C.5) — two artifacts, one narrative (OD-8)

*Dependencies:* C.1 (namespace); references C.5. *Repo:* `identity-stack-planning` `[BRAIN]`. *FR:* FR-C1, FR-C4, FR-C7.

### Story C.7: Contribution process for new provider/language + spec-version pinning

As a Contributor/Maintainer,
I want a documented process to add a provider or language and a pinned spec version,
So that the ecosystem can extend the matrix and consumers get reproducible results.

**Acceptance Criteria:**

**Given** the spec (C.1/C.2) and coverage machinery (C.3/C.5)
**When** the contribution process is documented
**Then** a contributor guide describes how to add a provider adapter or a language implementation and get its conformance cell published (FR-C6)
**And** the library CI **pins** a spec version (`mp-<semver>`) and a documented change process governs spec bumps (NFR11)
**And** the guide states the additive-only-within-a-major rule and the deprecation-window policy (AR3)

*Dependencies:* C.2, C.5. *Repo:* `identity-model` (+ `[BRAIN]` index). *FR:* FR-C6, FR-C5.

**Epic C summary:** 7 stories covering FR-C1…FR-C7. Spec-authoring (C.1/C.2) is independent; **live** conformance (C.3/C.4) sequences behind Epic A's Python management-plane implementation (A.5, A.11) and Ory infra (A.1).

---

## Epic D: Brand at the Cheap Layer + Name Reservation (renames OUT of MVP, gated) `[BRAIN]` / all repos

Adopt the open-identity brand at the repo/org/marketing layer and reserve package names defensively, while
deferring every irreversible rename behind the Rename Gate. **No one-way door is spent in MVP.**

### Story D.1: Reserve new package + org names defensively

As a Maintainer,
I want the open-identity names reserved on GitHub, PyPI, and crates.io,
So that the brand is protected without renaming any shipping package.

**Acceptance Criteria:**

**Given** the shipping packages keep their current names
**When** the names are reserved
**Then** `open-identity` / `open-identity-model` are reserved on the GitHub org, PyPI, and crates.io (placeholder holds)
**And** **no** renamed release of any shipping package is published (FR-D3)
**And** the reservations are recorded as evidence for the gate (D.5)

*Dependencies:* none. *Repo:* all / `[BRAIN]` (record). *FR:* FR-D3.

### Story D.2: Adopt brand at the repo/org layer with redirects

As a Developer following existing links,
I want the org/repos rebranded with redirects preserved,
So that old URLs keep working and nothing breaks in Pages/Actions/badges.

**Acceptance Criteria:**

**Given** the names are reserved (D.1) and GitHub auto-redirects renamed repos
**When** the org/repos adopt the brand
**Then** renamed repos resolve old URLs via redirect (FR-D1)
**And** Pages/Actions/badge references (which do **not** auto-redirect) are fixed; no broken cross-repo links
**And** this touches repo/org/marketing layers only — **no** package name, Go module path, or cert change (NFR8/FR-D5)

*Dependencies:* D.1. *Repo:* all repos. *FR:* FR-D1.

### Story D.3: Rewrite external positioning + READMEs around portability/fabric

As an Evaluator,
I want every external artifact to lead with portability / "identity fabric for developers",
So that the product reads as a provider-agnostic identity layer, not a router.

**Acceptance Criteria:**

**Given** the locked positioning discipline (portability/fabric; no routing/arbitrage analogy)
**When** external positioning and READMEs are rewritten
**Then** the portability / "identity fabric for developers" narrative leads every external artifact (FR-D2)
**And** the product is described as a provider-agnostic identity layer
**And** **no** external artifact frames the product with a routing/arbitrage/"OpenRouter" analogy (verified by review)

*Dependencies:* none (parallelizable). *Repo:* all / `[BRAIN]`. *FR:* FR-D2.

### Story D.4: Investigate + record the OpenID cert rename/re-cert path

As a Maintainer,
I want a recorded answer on how certification transfers under a rename,
So that the Rename Gate has the input it needs — without submitting anything.

**Acceptance Criteria:**

**Given** the Python reference is currently certified under its existing name
**When** the certification rename/re-cert path is investigated with the OpenID Foundation
**Then** a documented answer records whether/how certification transfers under a rename (FR-D4)
**And** the answer is captured as a **Rename Gate criterion (G-R3)** — **no** submission is made
**And** the record is stored where the gate (D.5) can reference it

*Dependencies:* none. *Repo:* `[BRAIN]` (record) + `py-identity-model`. *FR:* FR-D4.

### Story D.5: Rename-safety gate record (no irreversible rename executed)

As a Maintainer,
I want a written record at MVP exit confirming no one-way door was spent,
So that the Delivery Gate's "0 irreversible renames" criterion (G-D4) is verifiably met.

**Acceptance Criteria:**

**Given** D.1–D.4 outputs (reservations, redirects, positioning, cert-path answer)
**When** the rename-safety record is compiled at MVP exit
**Then** it confirms **0** PyPI/crate name changes of shipping packages, **0** Go module-path changes, and **0** OpenID re-cert submissions (FR-D5)
**And** it confirms names reserved, brand adopted at the cheap layer, and positioning rewritten (G-D4)
**And** it aggregates the Rename Gate readiness checks (G-R1 swap green = A.12, G-R2 conformance parity = Epic C, G-R3 cert path = D.4) as **inputs** — noting the rename trigger remains the author's discretion, not this record

*Dependencies:* D.1, D.2, D.3, D.4 (and references A.12, Epic C). *Repo:* `[BRAIN]`. *FR:* FR-D5.

**Epic D summary:** 5 stories covering FR-D1…FR-D5. D.1–D.4 are largely independent; D.5 aggregates them plus cross-epic gate inputs.

---

## Critical Path & Dependency Notes

**Story counts:** Epic A = 12, Epic B = 8, Epic C = 7, Epic D = 5. **Total = 32 stories.**

**Dominant MVP critical path (Epic A):**
`A.1 (Ory infra)` → `A.2 (register)` → `A.3 (adapter-selection registry)` + `A.4 (config-driven validation)` →
`A.5 (claim normalization)` + `A.6 (OrySyncAdapter)` + `A.7 (resolution/JIT)` → `A.8 (/me + frontend)` +
`A.9 (logout)` → `A.10 (visible swap)` → `A.11 (invariant assertion)` → `A.12 (E2E swap CI)`.
`A.1` is the long pole (external Ory provisioning). `A.3` was deliberately scoped to build the selection
seam with **Descope only**, so it does not forward-depend on the Ory adapter (`A.6` plugs Ory in later).

**Epic B (parallel to A):** the auth-code+PKCE / token-exchange / DPoP primitives are **already shipped in
both Python and Go** (verified against live source 2026-09-02, not the drifting status matrix), so
`B.1`/`B.2`/`B.3` are conformance-**verification** and `B.6` (Go) is parity **confirmation** — not flow
builds. The only genuinely net-new deliverable is `B.5` (the MCP OAuth 2.1 example, assembling the existing
primitives); `B.8` (cert guard) trails it. **Epic B is smaller than originally sized.**

**Epic C (partly behind A):** spec-authoring `C.1 → C.2` is independent and can start immediately. **Live**
conformance `C.3 → C.4 → C.5` cross-repo-depends on Epic A's Python management-plane implementation
(`A.5` claim-normalization fixtures, `A.11` swap-invariant fixtures) and Ory infra (`A.1`). `C.6` (public
matrix, `[BRAIN]`) can proceed doc-first from `C.1` and later point at `C.5`. `B.6` reuses the **existing**
protocol-plane spec, not the new management-plane spec — no dependency on C.

**Epic D (mostly independent):** `D.1–D.4` have no dependency on A/B/C. `D.5` (and the **Rename Gate**)
aggregates `A.12` green (G-R1), Epic C parity (G-R2), and `D.4` (G-R3) as **inputs** — but the rename
trigger is the author's discretion, and **no irreversible rename is in MVP scope**.

**Delivery Gate mapping:** G-D1 = A.12/A.11; G-D2 = B.5/B.6 (+ B.8 cert); G-D3 = C.5/C.6 (+ C.1/C.2);
G-D4 = D.1/D.2/D.3/D.5.

**Cross-repo dependency callout:** `C.2`/`C.3` consume fixtures produced by `A.5` and `A.11` in
`identity-stack`. Sequence Epic A's A.5 and A.11 before wiring the Python management-plane conformance
runner so the cells have a real implementation to run against.

---

## Architecture Validation (Step 4)

- **FR coverage:** all 28 PRD FRs (FR-A1…A9, FR-B1…B7, FR-C1…C7, FR-D1…D5) map to at least one story (see FR Coverage Map). No FR is uncovered.
- **Starter template:** none — brownfield (architecture §2). Epic A Story A.1 is Ory infrastructure, not starter-template setup. Validated.
- **Database/entity creation:** no story creates tables upfront; the canonical 8-table model already exists. Net-new schema is scoped to the stories that need it (e.g., A.6's tenant↔Ory-Organization mapping is created within that story, per feeder Story 3.3).
- **Story sizing:** each story is scoped for a single dev-agent session with testable Given/When/Then AC. The largest epic (A) is intentionally 12 small stories rather than a few large ones, honoring the "Epic A is net-new build, not a config flip" correction.
- **Within-epic forward-dependency check:** none. Epic A's A.3 builds the registry with Descope-only to avoid depending on A.6; A.11's fixtures precede A.12's CI wiring. Epic B's B.1 precedes B.2/B.3/B.5. Epic C's C.1 precedes C.2/C.3. Epic D's D.5 only depends on earlier D stories. All within-epic dependencies point **backward**.
- **Epic independence:** Epic A delivers the complete swap demo standalone. Epic B delivers the client standalone. Epic C's spec-authoring is standalone; its live-conformance cross-repo-depends on A (documented above, not a hidden forward dep). Epic D is standalone except the aggregating D.5. This is an acceptable, explicitly-noted cross-epic sequencing, not a within-epic violation.
- **Canonical-authoritative invariant:** the zero-migration claim is a machine assertion (A.11) run in CI (A.12) and encoded as a shared fixture consumed by Epic C — consistent with ADR-OI-1/OI-7.
- **Positioning discipline:** no story or narrative references "OpenRouter" or a router/arbitrage metaphor; D.3 enforces this in external copy.

---

## Resolved Decisions (locked 2026-09-02)

**ALL RESOLVED (locked 2026-09-02)** — see `sprint-plan-open-identity.md` → Resolved Decisions and the locked facts. Summary: **#1** scope A.4 to standalone mode for MVP (defer gateway-mode / PRD-4 to a later `/bmad-correct-course` pass); **#2** claim-normalization stays **app-side** in `identity-stack` (detail below); **#3** A.2 uses aligned capability strings, C.1 tightens later; **#4** Ory CI = self-hosted Kratos/Hydra/Keto (secret-free PR-gate) + managed Ory nightly; **#5** DPoP is a parity-target, not an MVP gate; **#6** swap-demo uses the flat portable-role floor only. The per-item text below is retained for context.

1. **PRD 4 (inbound Tyk gateway) vs Epic A (outbound management plane) collision surface.** Resolved
   Decision #1 explicitly **defers** the PRD 4 ↔ Epic A reconciliation to a later `/bmad-correct-course`
   pass. Epic A Story **A.4** modifies `GatewayClaimsMiddleware` (gateway mode). Confirm that A.4's
   config-driven validation does not conflict with PRD 4's planned Go claim-mapper plugin at the gateway,
   or explicitly scope A.4 to standalone mode for MVP and leave gateway-mode Ory to the correct-course pass.

2. **RESOLVED 2026-09-02 — app-side:** the claim-normalization abstraction, the `Ory`/`GenericOIDC` profiles,
   and the `claims-normalize` conformance fixtures stay in `identity-stack` (`[IS]`). Do **not** extend
   `py_identity_model.to_principal` with Ory/GenericOIDC for MVP — the library keeps only its existing Descope
   `to_principal` primitive. Story **A.5** stays entirely `[IS]` (it does **not** split into an Epic B `[OIM]`
   story). Future option (post-MVP): promote the profiles into the library once stable. **Where the
   provider-neutral ClaimMapper lives.** ADR-OI-5 defines per-provider profiles
   (`Descope`/`Ory`/`GenericOIDC`), but today `to_principal(claims, provider)` lives in `py_identity_model`
   (`[OIM]`), while Story **A.5** places the abstraction in `identity-stack` (`[IS]`). Decide whether the
   `Ory`/`GenericOIDC` profiles are added to `py_identity_model.to_principal` (making part of A.5 an Epic B
   `[OIM]` story) or wrapped in an identity-stack abstraction that calls the library. Affects which repo
   owns the claim-normalization conformance fixtures.

3. **Governed-namespace ordering vs Ory registration.** Story **A.2** registers Ory with a `capabilities`
   list **before** Epic C's governed `capability-namespace.yaml` (Story **C.1**) exists. Assumption taken:
   A.2 uses capability strings aligned to the intended namespace and C tightens them to a validated set
   later (avoids a forward cross-epic dependency). Confirm, or decide to block A.2 on C.1.

4. **Ory deployment target for CI.** For the swap E2E (A.12) and the nightly live matrix (C.4): managed
   **Ory Network** (via Terraform, needs a secret — feeder Epic 1's approach) vs **self-hosted** Ory
   (Kratos/Hydra/Keto in docker-compose, secret-free — architecture ADR-OI-6 calls Ory "self-hostable in
   CI"). This affects whether the swap E2E can run secret-free on PRs or only nightly. Pick one for
   A.1/A.12/C.4.

5. **DPoP depth in the MCP example.** FR-B2 marks DPoP a **parity-target, not a gate**, yet MCP's Nov-2025
   tightening added proof-of-possession. Decide whether the runnable MCP example (**B.5**) must
   *demonstrate* DPoP end-to-end (Python) or may ship with DPoP available-but-not-exercised. Affects B.3/B.5
   scope.

6. **Demo RBAC dataset stays within the portable floor.** ADR-OI-8 guarantees only the **flat** RBAC floor
   as portable; `roles.hierarchy` etc. are optional and Ory declares them `n/a`. Confirm the swap-demo user
   (Stories **A.10/A.11**) uses only flat-floor roles/permissions so the 0-row-diff invariant is clean and
   not muddied by optional capabilities the target provider cannot hold.
