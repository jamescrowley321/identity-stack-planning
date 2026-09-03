---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-open-identity-2026-09-02.md
  - _bmad-output/planning-artifacts/research/market-open-identity-research-2026-09-02.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/architecture-canonical-identity.md
  - docs/idp-rbac-comparison.md
  - docs/system-architecture.md
  - identity-stack/backend/app/services/adapters/base.py (read-only)
  - identity-stack/backend/app/services/identity.py (read-only)
  - identity-stack/backend/app/services/provider.py (read-only)
  - identity-stack/backend/app/models/identity/provider.py (read-only)
  - identity-stack/backend/app/repositories/idp_link.py (read-only)
  - identity-stack/backend/app/middleware/claims.py (read-only)
  - identity-model/spec/capabilities.md (read-only)
  - identity-model/spec/conformance/*.json (read-only)
workflowType: 'architecture'
project_name: 'open-identity'
user_name: 'James'
date: '2026-09-02'
status: 'decisions-locked'
decisions_locked_date: '2026-09-02'
adr_prefix: 'ADR-OI'
---

# Architecture Decision Document — open-identity (Canonical Model · Adapter/Registry Contract · Conformance Spec / "the brain")

> **Execution note (HEADLESS draft; decisions since LOCKED).** This document was produced by the
> `bmad-create-architecture` workflow run non-interactively (no user available, no A/P/C menus). It
> follows the workflow's section structure (context → baseline → decisions/ADRs → patterns → structure →
> validation → handoff) and originally recorded collaboration forks instead of blocking on them. Those
> forks (OD-1…OD-9) were subsequently **resolved and locked with the human on 2026-09-02** — see
> **Resolved Decisions (locked 2026-09-02)** below; the ADRs and framing throughout have been reconciled
> to those rulings and the prior `[ASSUMPTION: OD-n]` hedges removed. It is a planning artifact and a
> recommendation, not an execution authorization. No sibling repos, packages, or certifications were
> modified.

> **Scope & relationship to existing architecture.** This is a **NEW** document that *formalizes and
> versions* an architecture that already exists in code. It **builds on and does not replace**:
> `architecture.md` (ADR-1…ADR-6, the three-tier abstraction model), `architecture-canonical-identity.md`
> (the Postgres canonical model, onion layers, `IdentityService`/`IdentityProviderAdapter` ABCs), and
> `docs/system-architecture.md` (consolidated ADR index, two-layer authorization). New decisions here
> use the **`ADR-OI-*`** prefix, mirroring the established convention for sub-architectures
> (`ADR-GW-*` for the gateway, `ADR-IS-*` for infra/secrets). Where this document and an existing ADR
> touch the same concern, this document is *additive*: it promotes an existing pattern to a versioned,
> conformance-verifiable contract. It never contradicts a locked base ADR.

---

## Resolved Decisions (locked 2026-09-02)

The forks surfaced during the headless run were resolved with the human in the main session on
**2026-09-02**. Each ruling below is now binding on the ADRs and framing that follow; the prior
`[ASSUMPTION: OD-n]` hedges have been replaced inline with these rulings. No decision fork remains open.

| # | Decision | Resolution (LOCKED 2026-09-02) | Rationale |
|---|----------|--------------------------------|-----------|
| **OD-1** | **Source-of-truth direction.** | **CANONICAL-AUTHORITATIVE.** The Postgres canonical store is the RBAC system-of-record; providers are **projections** reached through adapters; a swap **re-projects** onto the target provider and asserts **zero canonical-RBAC-row diff**. Provider-authoritative deployments are an **explicitly-rejected alternative**. | It is *why* RBAC survives a swap: a single authoritative direction keeps the zero-migration invariant provable and is consistent with the existing Ory epics' "no data migration" stance. Provider-authoritative was rejected because it reintroduces the migration/lock-in this design exists to eliminate. |
| **OD-2** | **Contract versioning.** | **Two independent semver lines** — protocol plane (`pp-<semver>`) vs management plane (`mp-<semver>`) — with a published **compatibility matrix**; each adapter declares both versions it targets. | The protocol plane is commodity and moves with RFCs; the management plane is the moat and moves with our model — they must version independently. |
| **OD-3** | **Contract authority format.** | **Prose + JSON conformance vectors** (status-quo `identity-model` style, Python reference) for now, with a `canonical-model.schema.json` seed. **IDL/codegen is a future option — noted, not adopted.** | Stays consistent with the shipped conformance model; full IDL-codegen is a large, mostly-irreversible tooling bet, deferred. |
| **OD-4** | **RBAC-portability boundary.** | The **flat role/permission floor is the guaranteed-portable contract**. Hierarchy / composite roles and resource-scoped permissions are **optional, conformance-gated capabilities** (providers that cannot express them declare `n/a`). | The flat floor is lossless across the widest provider set and sets the exact meaning of the swap demo's "roles intact." |
| **OD-5** | **AuthZEN.** | **TRACK ONLY.** Keep an internal `check()` seam/boundary so a future AuthZEN binding is possible; do **not** adopt AuthZEN now. | Ride the standard without betting the contract on a still-maturing spec. |
| **OD-6** | **Conformance execution target.** | **Fixtures PR-gating (secret-free) + a nightly live matrix** for the runnable subset (Descope test project / Ory / node-oidc-provider). | Descope has no self-host: fixtures gate every PR fast and secret-free, and the nightly live matrix proves the fixtures still match reality. |
| **OD-7** | **Agent/MCP identity.** | A **protocol-plane PROFILE** over existing token-exchange + DPoP. **Not** a new first-class canonical non-human principal in the domain model — that is future growth, sketched only. | The MVP is a polyglot OAuth 2.1 / MCP *client*; the wedge maps onto capabilities the protocol plane already specifies. |
| **OD-8** | **"The brain" home & rename staging.** | **Co-locate the spec in the identity-model monorepo at `spec/management/`;** the planning repo publishes/indexes the human-readable capability matrix. The irreversible standalone-repo / package / cert **rename is deferred behind the author's discretion (solo project) + technical-readiness checks — NOT a formal external-validation metric.** | Co-location keeps the spec next to the working protocol spec + CI; the rename is a one-way door held until the author judges technical readiness, not gated on an external proof metric. |
| **OD-9** | **PRD / MVP scope.** | **CONFIRMED and settled.** MVP = live Descope⇄Ory swap demo + polyglot MCP client (Python certified + Go core-flow; Rust stretch) + "brain v1" (published capability matrix + management-plane conformance spec). **No** SCIM/provisioning, **no** hosted control plane, **no** built ReBAC (observe only). | Matches the brief; the parallel-PRD hedge is removed now that scope is settled. |

---

## 1. Project Context Analysis

### 1.1 Requirements Overview

**Source requirements** are the product brief (`product-brief-open-identity-2026-09-02.md`) and the
market research (`market-open-identity-research-2026-09-02.md`). The open-identity MVP scope is
**settled** (OD-9, locked 2026-09-02): the live Descope⇄Ory swap demo, the polyglot MCP client, and
"brain v1" — with **no** SCIM/provisioning, **no** hosted control plane, and **no** built ReBAC. The
pre-existing `prd-canonical-identity.md` (PRD 5) supplies the already-implemented canonical model FRs that
this contract formalizes.

**Functional intent (from the brief's MVP + differentiators):**

- **FR-OI-A — Provider portability (axis b).** Swap or add an identity provider by implementing **one
  adapter**, not by rewriting the application. (Brief §Key Differentiators; research §4.1.)
- **FR-OI-B — Zero-RBAC-migration swap.** The reference app swaps **Descope ⇄ Ory** with users, roles,
  permissions, and tenants intact and **no application-code rewrite**, green in CI. (Brief MVP #2.)
- **FR-OI-C — Management/RBAC-plane normalization (the moat).** A canonical users/orgs/roles/
  permissions/tenants model with per-provider adapters and cross-provider **claim normalization**.
  (Brief §Proposed Solution; research §4.3.)
- **FR-OI-D — Verifiable portability ("the brain").** A **public, versioned provider capability matrix +
  cross-language conformance spec** that turns "we support many providers" into a *testable* claim.
  (Brief MVP #4; research §6.3.)
- **FR-OI-E — Polyglot OIDC/OAuth client with first-class agent/MCP OAuth 2.1.** One SDK surface across
  Python/Go/Rust; MCP OAuth 2.1 example per language; Python is the certified reference. (Brief MVP #3.)
- **FR-OI-F — Contract versioning.** The adapter interface, provider registry, canonical model, and claim
  normalization are a **versioned contract** with an explicit compatibility/deprecation policy.

**Non-Functional Requirements shaping the architecture:**

- **Portability must be *verifiable*, not asserted.** The conformance spec + capability matrix are the
  NFR that turns the differentiator into a credibility asset (research §6.3, §9). A provider claiming a
  capability MUST pass its conformance tests in CI before the matrix shows `implemented`.
- **Cross-language behavioral parity.** Python/Go/Rust bindings of the contract MUST produce identical,
  language-neutral outcomes against the shared conformance vectors (inherits `identity-model` model).
- **No IdP credentials in the canonical store** (inherited NFR5): `providers.config_ref` points at a
  secret manager (Infisical); config_ref is stripped from all API responses (verified in
  `ProviderService.list_providers`).
- **The provider swap must not require RBAC data migration** — the canonical store is the RBAC system of
  record (ADR-OI-1); the swap re-points sync, it does not move authorization data.
- **Standards-based login stays commodity/portable.** The OIDC/OAuth login+token flow is already portable
  by standard (research §5); we do not re-abstract it — we *conform* to it and invest up-stack.
- **Backwards compatibility of the contract.** Consumers pin a contract version; new capabilities are
  additive; breaking changes are gated by semver + deprecation window (ADR-OI-3, OD-2).
- **Observability & error contract** inherited from `architecture-canonical-identity.md`: OTel spans on
  service methods, `Result[T, E]` at boundaries, RFC 9457 Problem Details at the HTTP surface.

### 1.2 Scale & Complexity

- **Primary domain:** a *contract + specification* effort across a polyglot library layer and a
  brownfield FastAPI control plane — not a green-field application. The code already embodies the thesis
  (adapter ABCs, provider registry with an `ory` type, canonical 8-table model, `idp_links`, claim
  normalization via `to_principal`, OpenID-certified `py-identity-model`, multi-provider CI).
- **Complexity level:** **High on the *contract/parity* axis** (three languages, multiple providers, a
  verifiable conformance bar, an irreversible rename downstream), **Medium on the *code* axis** (the
  runtime pieces largely exist and are well-factored).
- **Cross-cutting concerns:** contract versioning; capability negotiation; claim normalization fidelity;
  conformance execution against a managed provider (Descope); the source-of-truth direction (OD-1, locked
  canonical-authoritative); the rename blast-radius (research §7) which keeps artifact naming behind the
  author's readiness gate (OD-8).

### 1.3 Technical Constraints & Dependencies (grounded in real code)

| Constraint | Where it lives today | Implication for the contract |
|---|---|---|
| Outbound-sync adapter ABC exists | `services/adapters/base.py` — `IdentityProviderAdapter` with `sync_user/role/permission/tenant/role_assignment` + `delete_*`, all `Result[None, SyncError]`, keyword-only, `data: dict` payloads | The **canonical→provider** half of the contract is real. The **provider→canonical** (import/reconcile) half is only partially present (seed migration) and must be named in the versioned contract (ADR-OI-3). |
| Canonical domain service ABC exists | `services/identity.py` — `IdentityService` with full user/role/permission/tenant CRUD + assignment + permission mapping, `Result[T, IdentityError]` | This is the **app-facing** contract. It is provider-agnostic already; the swap must leave it untouched (FR-OI-B). |
| Provider registry exists | `services/provider.py` + `models/identity/provider.py` — `Provider(name, type∈{descope,ory,entra,cognito,oidc}, issuer_url, base_url, capabilities:list[str], config_ref, active)`; `ProviderService.register/list/deactivate/get_capabilities` | `capabilities: list[str]` is a **flat string list today** → must be promoted to a **governed capability namespace** tied to conformance profiles (ADR-OI-4). |
| Claim normalization seam exists | `middleware/claims.py` calls `py_identity_model.to_principal(claims, "Descope")`; two Descope issuer formats handled; `tenants`/`dct` claim logic | `to_principal(claims, provider)` is the **normalization contract**: provider-specific claim shape → canonical `ClaimsPrincipal`. Must become a versioned, conformance-tested capability with per-provider profiles (Descope/Ory/GenericOIDC) (ADR-OI-5). |
| Multi-IdP linking exists | `repositories/idp_link.py` — resolve canonical user by `(provider, external_sub)`; `idp_links(user_id, provider_id, external_sub, metadata)` | Identity resolution across providers is the mechanism that lets one canonical user be backed by many providers — the backbone of an *incremental* swap. |
| Cross-language conformance spec exists (protocol plane) | `identity-model/spec/` — `capabilities.md` (tiers + per-language status), `conformance/*.json` (given/when/then + language-neutral vectors + canonical error codes), `test-fixtures/`, per-language runner, CI gate | This is **"the brain" for the commodity plane**. The management/RBAC plane must extend the *same* pattern up-stack (ADR-OI-6). |
| Base three-tier model is locked | `architecture.md` ADR-3 | Tier 1 abstract (User CRUD, authz check, SSO, M2M, session), Tier 2 translate (RBAC roles/perms, password policy), Tier 3 provider-specific (multi-tenancy shape, flows, connectors, JWT claim structure). The capability namespace inherits these tiers. |

### 1.4 Cross-Cutting Concerns

- **Verifiability everywhere.** No capability is "supported" until a conformance profile passes in CI.
- **Two planes, one narrative.** Protocol/client plane (commodity, already specced) and management/RBAC
  plane (moat, new spec) share the *conformance machinery* but are versioned per OD-2.
- **Provider capability asymmetry is the norm** (idp-rbac-comparison: 5 of 9 providers do no real RBAC;
  only Descope has native tenant-scoped roles-in-token). The canonical store therefore *owns* RBAC and
  providers declare what they can mirror — capability negotiation, not lowest-common-denominator.
- **Rename discipline.** Artifact names (packages, cert, standalone spec repo) stay behind the author's
  readiness gate — author's discretion (solo project) + technical-readiness checks, **not** a formal
  external-validation metric (research §7; OD-8, locked). The *architecture* commits now; the
  *irreversible names* do not.

---

## 2. Existing-Architecture Baseline (in lieu of a starter template)

This is a **brownfield** effort; no starter template applies (consistent with
`architecture-canonical-identity.md`). The "starter" is the existing, working stack, which this contract
formalizes rather than replaces.

**Established, unchanged stack:**

- **Control plane (identity-stack backend):** Python 3.12+, FastAPI, SQLModel + Alembic (async-only),
  PostgreSQL 16, `httpx`, `expression` (`Result[T, E]`), OpenTelemetry, onion architecture
  (repositories → domain services → adapters), RFC 9457 error contract.
- **Client/protocol plane (identity-model):** Go (Core + Extended tiers), Rust (Core tier), Python
  reference (`py-identity-model`, OpenID-certified, merges into `python/` later). Shared `spec/` +
  `infra/` (node-oidc-provider + Duende IdentityServer) + multi-provider CI matrix (local + Ory +
  Descope).
- **Infra plane:** terraform-provider-descope (Go); Infisical for secrets (`config_ref`); HCP Terraform
  state; Tyk gateway profile (ADR-GW-*).

**What already exists that this document promotes to a *versioned contract*:**

1. `IdentityProviderAdapter` ABC (outbound sync).
2. `IdentityService` ABC (app-facing canonical operations).
3. `Provider` registry + `ProviderService` (capability list, config_ref, active flag).
4. `to_principal(claims, provider)` claim normalization.
5. Canonical 8-table domain model.
6. `identity-model/spec/` conformance machinery.

**Additions required (all additive, no rewrite):** a governed capability namespace, contract version
declaration per adapter, an inbound import/reconcile capability group, and a management-plane conformance
suite mirroring `identity-model/spec/`.

---

## 3. Core Architectural Decisions (ADR-OI-*)

ADRs continue the workspace convention. Base ADR-1…ADR-6 and prefixed ADR-GW-*/ADR-IS-* remain in force.
The `ADR-OI-*` series below is additive. Every ADR is now **Locked**: the forks (OD-1…OD-9) that some of
these decisions previously depended on were resolved on 2026-09-02 (see **Resolved Decisions** above), so
the earlier "Proposed" statuses and `[ASSUMPTION: OD-n]` hedges have been replaced with the locked rulings.

---

### ADR-OI-1 — The canonical store is the RBAC system of record (the moat)

**Status:** Locked (management/RBAC-plane abstraction is THE moat).
**Source-of-truth direction: CANONICAL-AUTHORITATIVE (OD-1, locked 2026-09-02).** The canonical Postgres
store is the RBAC system-of-record; providers are projections reached through adapters. **Provider-
authoritative deployments are an explicitly-rejected alternative** — they reintroduce the very
migration/lock-in this design eliminates.

**Context.** Standards make *login* portable; everything above it (user store, roles/permissions/tenant
model, admin APIs, claim formats) is proprietary and is where all lock-in and every migration horror
story live (research §3, §4.3; idp-rbac-comparison §"IdP-Delegated Authorization"). Only Descope has
native tenant-scoped roles-in-token; 5 of 9 surveyed providers do no real application RBAC at all.

**Decision.** The canonical Postgres model (`users`, `tenants`, `roles`, `permissions`,
`role_permissions`, `user_tenant_roles`, `idp_links`, `providers`) is the **authoritative system of
record for identity + RBAC state**. Providers are **projections/mirrors** of that state, reached through
adapters. The application enforces `require_role()`/`require_permission()` against the canonical store,
never against provider-specific claims. ReBAC/FGA remains **proxied** to Zanzibar-style engines and is
**observed, not built** (ADR-2, ADR-3; locked directive).

**Consequences.**
- **Zero-RBAC-migration becomes structurally possible** (ADR-OI-7): a swap re-points *sync*, it does not
  move authorization data, because the data never lived in the provider authoritatively.
- Providers with weak RBAC (Ory, Okta, Cognito) are first-class: the canonical store supplies what they
  lack; the adapter mirrors only what the provider can hold.
- The JWT proves *identity*; the app resolves *authorization* from its own store → no token bloat, no
  per-provider claim parsing in business logic.
- Inbound sync (G2) exists to *seed / re-project* a swapped-in provider from the canonical store — never
  to make the provider authoritative for RBAC (OD-1 canonical-authoritative; provider-authoritative
  rejected).

---

### ADR-OI-2 — Two-plane contract: commodity Protocol plane vs. moat Management plane

**Status:** Locked (OIDC login flow is commodity/portable; invest up-stack).

**Context.** A bare OIDC SDK is commoditized; the defensible value is the management/RBAC plane
(research §6, §Executive Summary). The workspace already ships a protocol-plane conformance spec
(`identity-model/spec/`).

**Decision.** Model the contract as **two planes** sharing one conformance machinery:

| Plane | Owns | Artifact today | Portability status | Investment |
|---|---|---|---|---|
| **Protocol / Client plane** | OIDC discovery, JWKS, JWT validation, client-credentials, auth-code+PKCE, UserInfo, introspection, revocation, **token-exchange, DPoP** (agent/MCP) | `identity-model` (Go+Rust+Py), `spec/capabilities.md` | *Already portable by standard*; we **conform**, not abstract | Maintain parity; lead agent/MCP (ADR-OI-9) |
| **Management / RBAC plane** | users, orgs/tenants, roles, permissions, assignments, idp-links, **claim normalization**, RBAC-state sync/migration | `identity-stack` adapter/registry/canonical model | *Not standardized* — the moat | **Primary** — normalize + verify + migrate |

**Consequences.** The two planes are **versioned independently** — two semver lines (`pp-`/`mp-`) plus a
compatibility matrix (OD-2, locked). The management plane reuses the
protocol plane's conformance format, fixtures convention, and CI-gate discipline but has its own
capability namespace and providers-as-columns matrix. We do not rebrand for a bare SDK (research §8
"commodity trap").

---

### ADR-OI-3 — The adapter + registry + canonical model is a *versioned contract*; adapters declare conformance

**Status:** Locked (OD-2 and OD-3 resolved 2026-09-02).

**Context.** FR-OI-F and the "verifiable openness" differentiator require the contract to be a stable,
versioned surface that consumers pin and providers declare against. Today `capabilities` is a free-form
`list[str]` and there is no declared contract version.

**Decision.** Define the **open-identity Management-Plane Contract** as a versioned artifact with three
parts — **canonical model schema**, **adapter interface (capability groups)**, **provider registry +
capability namespace** — plus the **claim-normalization contract** (ADR-OI-5). Versioning rules:

- The contract carries a **semver** (`management-plane` line, independent of the protocol-plane spec
  version — OD-2 locks two independent semver lines with a compatibility matrix).
- **Every adapter declares** `{contract_version, capability_profile}` — the contract version it targets
  and the set of capability identifiers it claims. This declaration is the input to the capability matrix
  and is validated by conformance (ADR-OI-6).
- **Additive-only within a major:** new capabilities and new optional fields are minor bumps; removing or
  changing the shape of a capability is a major bump with a deprecation window.
- **Consumers pin a major** and negotiate optional capabilities at runtime via
  `registry.active_adapter().supports(capability_id)`.

**Adapter interface — capability groups** (formalizing/extending `services/adapters/base.py`):

| Group | Direction | Methods (canonical, keyword-only, `Result`-returning) | Status in code |
|---|---|---|---|
| **G1 · Outbound sync** | canonical → provider | `sync_user`, `sync_role`, `sync_permission`, `sync_tenant`, `sync_role_assignment`, `delete_role_assignment`, `delete_user/role/permission/tenant` | **Implemented** (`base.py`) |
| **G2 · Inbound import** | provider → canonical | `import_users`, `import_roles`, `import_permissions`, `import_tenants`, `import_assignments` (paged, idempotent) | **Partial** — exists as "seed migration"; must be named in the contract (needed to seed / re-project a swapped-in provider; canonical stays authoritative — OD-1) |
| **G3 · Reconcile** | bidirectional diff | `reconcile(scope) -> Result[ReconcilePlan, …]`, `apply(plan)` | **Planned** (deferred FR26-28 in PRD 5) |
| **G4 · Capability discovery** | — | `supports(capability_id) -> bool`, `declared_profile() -> CapabilityProfile` | **Planned** (registry holds `capabilities` list today) |
| **G5 · Claim normalization** | provider token → canonical principal | `to_principal(claims) -> ClaimsPrincipal` (per-provider profile) | **Implemented** via `py_identity_model.to_principal(claims, provider)` (ADR-OI-5) |
| **G6 · Proxied passthrough** | app → provider engine | ReBAC check/relations, access keys, auth/logout — *not* normalized, Tier 3 | **Implemented** (`DescopeManagementClient` direct) |

**Consequences.** The swap and the matrix both become mechanical: a provider is "swappable for RBAC" iff
its adapter declares + passes G1 (and G2 for swap-in). G6 is explicitly *not* portable and is documented
as such. Per OD-2/OD-3 (locked): the version namespace is **two independent semver lines** (`mp-`/`pp-`)
with a compatibility matrix, and the contract is **prose-normative + JSON vectors** (IDL-codegen is a
future option, not adopted).

---

### ADR-OI-4 — Provider capability matrix is a first-class, governed namespace (not a free string list)

**Status:** Locked (governed capability namespace; the OD-4 portability boundary it encodes is resolved).

**Context.** `Provider.capabilities: list[str]` is currently free-form. FR-OI-D requires a *governed,
verifiable* matrix. The protocol plane already governs its capabilities in `spec/capabilities.md`.

**Decision.** Introduce a **governed capability namespace** for the management plane, dotted and tiered
to the base three-tier model (ADR-3):

```
users.crud            (Tier 1)   roles.crud            (Tier 2)
users.search          (Tier 1)   roles.assign          (Tier 2)
tenants.crud          (Tier 3*)  permissions.crud      (Tier 2)
tenants.domains       (Tier 3*)  permissions.map       (Tier 2)
idp.link              (Tier 1)   claims.normalize      (Tier 1)
authz.check           (Tier 1)   sync.outbound         (G1)
sso.configure         (Tier 1)   sync.inbound          (G2)
m2m.exchange          (Tier 1)   sync.reconcile        (G3)
                                  roles.hierarchy       (optional, conformance-gated — OD-4)
```
`*` Tenant *shape* is Tier 3 (Descope tenants ≠ Ory orgs ≠ realms), so `tenants.*` is portable at the
canonical level but its provider projection is provider-specific — the adapter declares how it maps.

Each capability identifier maps to: a **spec section** (prose-normative), a **conformance file**
(`spec/conformance/management/<capability>.json`), and a **per-provider × per-language status** cell
(`implemented` / `in-progress` / `planned` / `n/a`). The matrix is generated from adapter
declarations + CI conformance results — never hand-edited to green.

**Consequences.** `Provider.capabilities` becomes a validated set drawn from the namespace (a migration
of the free-string field). "We support Ory" becomes "Ory adapter: `users.crud=implemented`,
`roles.crud=implemented`, `authz.check=implemented (via Keto)`, `roles.hierarchy=n/a`, …" — the exact
verifiable claim the brief wants.

---

### ADR-OI-5 — Claim normalization is a versioned, per-provider, conformance-tested capability

**Status:** Locked (claim normalization is core to the moat; per-provider profile format locked).

**Context.** There is no OIDC standard for authorization claims (idp-rbac-comparison §"No standard claim
format"): Descope uses `tenants.{id}.roles` + `dct`; Keycloak `realm_access`/`resource_access`; Entra
`roles`/`groups` (with 200-group overage → Graph call); Cognito `cognito:groups`; Auth0 `permissions`;
Okta `groups`. The workspace already normalizes via `to_principal(claims, provider)`.

**Decision.** Define the **claim-normalization contract** (`claims.normalize` capability): a
provider-specific token payload → a canonical `ClaimsPrincipal` (`sub`, `iss`, `aud`, current tenant,
tenant memberships, roles, permissions), with a **named profile per provider** (`Descope`, `Ory`,
`GenericOIDC`, extensible). Each profile is specified in prose + exercised by
`spec/conformance/management/claims-normalize.json` using **language-neutral input claim fixtures →
expected canonical principal**. Behavior currently in `middleware/claims.py` is normative reference:
two Descope issuer formats; single-tenant `dct` inference for access-key tokens; `exp`/`iss`/`aud`
defense-in-depth. **Normalization is read-only and never authoritative for authorization** — it feeds
principal construction; RBAC decisions still resolve against the canonical store (ADR-OI-1).

**Consequences.** Adding a provider's claim profile is a conformance-verified unit of work. The
gateway-mode vs standalone-mode split (`GatewayClaimsMiddleware`) is preserved: in gateway mode the JWT
signature is validated upstream (Tyk), normalization runs on the pre-validated payload with
defense-in-depth `exp`/`iss`/`aud` checks.

**Placement (locked 2026-09-02):** the multi-provider claim-normalization abstraction + Ory/GenericOIDC
profiles live app-side in `identity-stack` for MVP; the library keeps its existing Descope `to_principal`
primitive. Promote to the library post-MVP if it stabilizes.

---

### ADR-OI-6 — Management-plane conformance spec extends the identity-model machinery ("the brain" up-stack)

**Status:** Locked (FR-OI-D; execution target and home resolved per OD-6 and OD-8, 2026-09-02).

**Context.** `identity-model/spec/` already proves cross-language parity for the *protocol* plane:
`capabilities.md` (matrix), `conformance/*.json` (given/when/then + vectors + canonical error codes),
`test-fixtures/`, a per-language runner, and a CI gate that forbids claiming a capability without passing
its tests. The management plane needs the same rigor.

**Decision.** Create a **management-plane conformance suite** mirroring the protocol-plane layout, sharing
its conventions (language-neutral vectors, canonical error codes, RFC-2119 keywords, status legend):

```
spec/                              # co-located with the protocol spec (OD-8 locked: spec/management/)
├── capabilities.md                # protocol-plane matrix (exists)
├── conformance/                   # protocol-plane vectors (exists)
├── management/
│   ├── capabilities.md            # NEW — management-plane capability matrix (providers × languages)
│   ├── canonical-model.schema.json# NEW — versioned canonical model (JSON Schema; seed for a future IDL-codegen option, OD-3)
│   ├── capability-namespace.yaml  # NEW — governed capability ids + tier + spec/conformance refs
│   ├── conformance/               # NEW — given/when/then + fixtures per capability
│   │   ├── users-crud.json
│   │   ├── roles-crud.json
│   │   ├── roles-assign.json
│   │   ├── permissions-map.json
│   │   ├── claims-normalize.json
│   │   ├── sync-outbound.json
│   │   ├── sync-inbound.json
│   │   └── swap-invariants.json   # the zero-RBAC-migration invariants (ADR-OI-7)
│   └── fixtures/                  # provider claim payloads, canonical seed states, role maps
└── test-fixtures/                 # protocol-plane fixtures (exists)
```

**Conformance definition shape** (identical grammar to the protocol plane — see the worked example in
§5): each test is `{id, title, given, when, then, references[], vectors[]}`; vectors carry inputs +
`options` + `expect.{outcome, error|state}`; `error` values are **canonical codes** each language maps to
its own error type. Management-plane vectors additionally carry **canonical state assertions** (e.g. "after
`sync_role`, the provider projection contains a role whose normalized name == canonical name").

**Two conformance modes** (OD-6, locked; Ory-infra target re-resolved 2026-09-02):
1. **Contract/fixture mode** (gates every PR, secret-free): adapters run against recorded provider
   contracts / fakes; asserts request shapes + normalized outcomes. For the second-provider path,
   **`node-oidc-provider` is the secret-free PR-gate stand-in** — it exercises the adapter-selection
   registry, claim-normalization, and the zero-RBAC-migration invariant without live Ory.
2. **Live-matrix / local mode** (nightly / protected-branch + local, gated): the runnable subset — the
   **existing cloud Ory Network (managed, via secret)**, Descope (managed test project via secret), and
   node-oidc-provider. The **real Descope⇄Ory swap runs here** (where the Ory Network secret is available),
   not on fork PRs, and proves the fixtures still match reality. **Self-hosted Ory (docker-compose
   Kratos/Hydra/Keto) is deferred/optional** — revisit only if secret-free full-swap-on-PRs later becomes a
   requirement.

**CI gate.** A capability shows `implemented` in the matrix **only if** its conformance file passes for
that provider×language. The matrix is generated, not asserted.

**Consequences.** "The brain" becomes a real, hard-to-copy asset spanning *both* planes (research §9 —
whoever owns the conformance/capability spec has a durable moat). OD-6 (execution target) and OD-8 (home)
are locked: fixtures PR-gate every commit + a nightly live matrix, with the spec co-located at
`spec/management/` and the planning repo publishing the human-readable matrix.

---

### ADR-OI-7 — Descope ⇄ Ory swap = re-point the active adapter + reconcile; canonical RBAC never migrates

**Status:** Locked (RBAC-state migration is the moat; zero-RBAC-migration is the headline "aha").
**Source-of-truth: CANONICAL-AUTHORITATIVE (OD-1, locked 2026-09-02).** The swap sequence below is
definitively canonical-authoritative; there is **no** provider-authoritative variant.

**Context.** FR-OI-B. The swap must leave application code, `IdentityService`, and RBAC data untouched
and be green in CI. Ory has *no* native RBAC (delegates to Keto); Descope has first-class tenant-scoped
roles (idp-rbac-comparison). The asymmetry is handled by ADR-OI-1: the canonical store owns RBAC, so a
provider that lacks RBAC simply mirrors less.

**Decision — end-to-end swap sequence:**

1. **Register** the target provider in the registry (`ProviderService.register_provider`) with its
   `config_ref` (Infisical) and declared capability profile. `active=false` initially.
2. **Seed / import (G2)** the target provider from the canonical store: `Ory` adapter creates the
   users/tenants(orgs) it needs and establishes login (Kratos identities); roles/permissions/assignments
   are **not** pushed to Ory as authorization (Ory has none) — they *stay canonical*; only what Ory can
   hold (identity + org membership + optional Keto tuples for authz.check) is mirrored.
3. **Link (idp_links)** each canonical user to the target provider's `external_sub` (users can be linked
   to both providers simultaneously — enables incremental cutover, not just big-bang).
4. **Flip claim normalization profile** for the cutover cohort: tokens now arrive in Ory's shape;
   `to_principal(claims, "Ory")` (ADR-OI-5) produces the *same* canonical principal shape. RBAC checks are
   unchanged because they hit the canonical store, not the token.
5. **Activate** the target adapter in the registry (`active=true`); outbound sync (G1) now targets Ory.
   Deactivate Descope (or keep both during dual-run).
6. **Verify invariants** (`swap-invariants.json`, ADR-OI-6): for every canonical user, the set of
   `(tenant, roles, permissions)` resolved *before* and *after* the swap is identical; no row in
   `roles`/`permissions`/`role_permissions`/`user_tenant_roles` changed; application E2E RBAC tests pass
   against both providers. **Zero rows migrated in the RBAC tables is the assertion.**

**What moves vs. what stays:**

| Data | Descope (before) | Canonical store | Ory (after) | Migrated? |
|---|---|---|---|---|
| Credentials / MFA / sessions | authoritative | not stored | authoritative | Re-established at provider (login), **not** RBAC migration |
| Users (identity) | mirror | **authoritative** | mirror | Re-projected via G2 |
| Tenants/orgs | mirror (Descope tenant) | **authoritative** | mirror (Ory org) | Re-projected; shape mapping is Tier 3 |
| Roles / permissions / assignments | mirror (or none) | **authoritative** | **none — stays canonical** | **No migration** |
| ReBAC tuples | Descope FGA | proxied (not owned) | Ory Keto | Re-created in target engine (G6, out of RBAC-swap scope) |
| Claim shape | `tenants.{id}.roles`+`dct` | canonical principal | Ory/webhook shape | Normalized, not migrated (ADR-OI-5) |

**Consequences.** The demo's promise is exactly the assertion the conformance suite checks. Password
re-hash pain (research §3.1) is scoped *out* of the RBAC claim: credentials are a provider concern
(re-established at login), and the value proposition is explicitly "roles/tenants intact," not "passwords
teleported." Big-bang vs incremental cutover is enabled by step 3 (dual linking). There is no
provider-authoritative variant of this sequence (OD-1, locked): the canonical store is always the RBAC
system of record, so a swap **re-projects** rather than migrates.

---

### ADR-OI-8 — RBAC-portability boundary: flat floor guaranteed, richer models are optional capabilities

**Status:** Locked (OD-4 resolved: flat floor guaranteed-portable; richer models optional + conformance-gated).

**Context.** Provider RBAC models are wildly asymmetric (idp-rbac-comparison): Descope flat first-class
roles; Auth0 API-scoped permissions, no hierarchy; Keycloak composite roles + realm/client split; Entra
app-roles per-tenant; Okta/Cognito groups-only; Ory none. A single normalized model cannot be lossless
for all.

**Decision.** Define a **portability floor** that is lossless across the widest provider set, plus
**optional capabilities** declared per adapter and verified by conformance:

- **Floor (guaranteed portable):** flat `roles`, flat `permissions`, many-to-many `role_permissions`,
  tenant-scoped `user_tenant_roles` assignments with audit (`assigned_by`, `assigned_at`). This is the
  current canonical model and maps cleanly to Descope and to canonical-owned RBAC over Ory/Okta/Cognito.
- **Optional capabilities (declared + conformance-gated):** `roles.hierarchy` (composite roles),
  `permissions.resource_scoped` (Auth0 per-API), `tenants.hierarchy`. Providers that cannot express them
  declare `n/a`; the canonical store may still hold them and enforce in-app, but they are **not promised
  portable** unless conformance passes.
- **Explicitly proxied / non-portable (Tier 3, documented):** ReBAC/FGA engines (Descope FGA, Ory Keto,
  OpenFGA — observe, don't build), provider auth flows, connectors, native tenant *shape*.
- **Future authz-portability standards:** **track only** — **AuthZEN** (authz decision API) and **Shared
  Signals/CAEP** are the standards creeping into the authz-query side; keep the moat in role/permission
  *modeling + migration*, which stays vendor-specific longer (research §4.3, §9). Per OD-5 (locked): keep
  an internal `check()` seam so a future AuthZEN binding is possible, but do **not** adopt AuthZEN now.

**Consequences.** The matrix tells the truth about *degree* of portability per provider rather than
over-promising a universal model. Sets the exact meaning of the swap demo's "roles intact."

---

### ADR-OI-9 — Agent/MCP OAuth 2.1 is a first-class protocol-plane capability

**Status:** Locked (agent/MCP OAuth 2.1 is first-class).
**Scope: protocol-plane PROFILE only (OD-7, locked 2026-09-02).** Agent/MCP identity is a profile over
existing token-exchange + DPoP — **not** a new first-class canonical non-human principal in the domain
model (that remains future growth, sketched only).

**Context.** MCP standardized on OAuth 2.1 (Mar 2025; tightened Nov 2025 with proof-of-possession);
non-human identity is the fastest-growing, least-consolidated segment and the strongest near-term hook
(research §2.2, §9). Capability state verified against live repo source 2026-09-02 (not the drifting status
matrix): the protocol plane already ships **auth-code+PKCE**, **token-exchange (RFC 8693)**, and **DPoP
(RFC 9449)** in **both Python and Go** (`go/pkg/token/pkce.go`, `go/pkg/token/token.go`,
`go/pkg/dpop/verify.go`; `py-identity-model` is the most complete impl overall). **Rust** already has
auth-code+PKCE (`rust/src/token/pkce.rs`) but **not** token-exchange or DPoP — the only genuine
protocol-plane gaps, and only if the Rust stretch is pursued.

**Decision.** Treat MCP OAuth 2.1 as a **named client-plane capability profile** composed of existing
Core+Extended capabilities: auth-code+PKCE, discovery/JWKS/validation, **token-exchange** (delegated
agent tokens, `act` claim), and **DPoP** (sender-constrained tokens / proof-of-possession). Ship a
**per-language MCP OAuth 2.1 example** (Python certified reference; Go core-flow parity; Rust stretch),
each gated by the relevant `spec/conformance/*.json`. Agent identity is *not* added to the canonical
model (OD-7, locked); the growth path (agents as canonical non-human principals reusing the RBAC moat) is
**sketched only and deferred** — reuse `users` with a `principal_type` if/when it is pulled forward.

**Consequences.** The agent/MCP wedge maps entirely onto capabilities **already implemented in both Python
and Go** — so there is **no from-scratch flow build**. The net-new work is the **MCP OAuth 2.1 example**
(assembly on the existing primitives); the only remaining Extended-tier parity gap is **Rust
(token-exchange + DPoP)**, which is stretch. This is the fastest credibility win and the strongest external
story for `open-identity-model`.

---

### ADR-OI-10 — Language bindings: one language-neutral contract, Python reference, Go/Rust bound; parity is proven, not asserted

**Status:** Locked (OD-3 resolved: prose + JSON vectors, Python reference; IDL-codegen deferred).

**Context.** Cross-language parity is the moat's credibility (research §6, §10). The protocol plane already
does prose+vectors with a Python certified reference and Go/Rust runners.

**Decision.** The management-plane contract is **defined once, language-neutrally** (prose-normative +
JSON conformance vectors + a `canonical-model.schema.json`), with **Python (identity-stack) as the
executable reference implementation**. Go/Rust bindings of the *management* plane are **planned** and
gated by the same conformance suite; the matrix shows their status honestly (`planned` until they pass).
Per OD-3 (locked): **prose + JSON vectors now**, with a `canonical-model.schema.json` seed; the JSON
Schema seeds a possible future IDL-codegen path but codegen is a **future option, not adopted** for MVP.

**Consequences.** MVP management-plane parity may be Python-only-`implemented` with Go/Rust `planned` —
and that is *honest and fine*, because the matrix says so. The protocol plane already carries the
"polyglot" claim (Go Core+Extended, Rust Core). Avoids over-committing to IDL tooling (OD-3, locked:
prose+vectors now, IDL a future option only).

---

## 4. Implementation Patterns & Consistency Rules

These extend (do not replace) the patterns in `architecture-canonical-identity.md` (Result types, onion
layers, OTel spans, tenant_id explicit params, Alembic-only, RFC 9457). New rules govern the *contract*
and *conformance* surfaces so AI agents implement them consistently.

### 4.1 Naming & identifiers

- **Capability identifiers:** dotted lowercase, noun.verb or noun.qualifier — `users.crud`,
  `roles.assign`, `claims.normalize`, `sync.outbound`. Drawn only from
  `spec/management/capability-namespace.yaml`. Never a free string.
- **Provider type:** the `ProviderType` enum (`descope`, `ory`, `entra`, `cognito`, `oidc`) is the
  closed set; adding a provider adds an enum member + an adapter + a claim profile + conformance results.
- **Claim profile names:** PascalCase matching the `to_principal` provider arg (`Descope`, `Ory`,
  `GenericOIDC`).
- **Contract version:** `mp-<semver>` for the management plane (e.g. `mp-1.0.0`), `pp-<semver>` for the
  protocol plane; adapters declare both they target (OD-2).
- **Conformance test ids:** `<CAP>-NNN` (e.g. `SYNC-001`, `CLAIM-003`, `SWAP-002`), mirroring the
  protocol plane's `JWT-001`/`DISC-002`.
- **Canonical error codes** (language-neutral, mapped per language): reuse the model — management-plane
  codes include `not_found`, `conflict`, `validation`, `sync_failed`, `provider_error`,
  `capability_unsupported`, `normalization_failed`.

### 4.2 Adapter authoring rules (all agents MUST)

1. Return `Result[…, SyncError|IdentityError]` — never raise for domain/sync errors (matches `base.py`).
2. Keyword-only method signatures; `data: dict` payloads for sync methods (matches `base.py`).
3. Declare `{contract_version, capability_profile}` — the profile MUST only contain namespaced ids the
   adapter actually passes conformance for (CI cross-checks declaration vs. results).
4. Wrap every provider HTTP call in an OTel span; map both HTTP and network errors to the canonical code.
5. Never store provider credentials in Postgres — resolve from `config_ref` at composition time; strip
   `config_ref` from any output (matches `ProviderService`).
6. Claim normalization MUST be pure (payload → principal), read-only, and MUST NOT be the source of an
   authorization decision (ADR-OI-1/OI-5).
7. A capability the adapter cannot support MUST be declared `n/a` and MUST return
   `capability_unsupported` if called — never silently no-op (except `NoOpSyncAdapter`, whose entire
   profile is test-only).

### 4.3 Conformance authoring rules

- Every capability id in the namespace has exactly one `spec/management/conformance/<cap>.json`.
- Tests use the `{given, when, then, references[], vectors[]}` grammar; vectors are **language-neutral**
  (durations relative to `options.now`, fixture references, canonical error codes) — copy the protocol
  plane's conventions verbatim.
- A provider/language cell MUST NOT be marked `implemented` by hand; it is produced by the CI generator
  from passing runs. Hand-edits to the matrix are a review-blocking anti-pattern.
- Swap invariants (`swap-invariants.json`) assert **RBAC-table row-diff == ∅** across a swap, plus
  before/after principal equality per user — the machine form of "zero RBAC migration."

### 4.4 Anti-patterns

| Don't | Do instead |
|---|---|
| Add a capability to `Provider.capabilities` as a free string | Add a namespaced id from `capability-namespace.yaml` + a conformance file |
| Parse provider-specific claims (`realm_access`, `cognito:groups`) in business logic | Normalize once via `to_principal(claims, profile)`; resolve RBAC from canonical store |
| Push canonical roles into Ory/Okta as the authorization source | Keep RBAC canonical; mirror only what the provider can hold (ADR-OI-1) |
| Mark a matrix cell green because the code "looks done" | Let CI conformance generate the cell |
| Migrate RBAC rows during a provider swap | Re-point the adapter + reconcile; assert zero RBAC row-diff (ADR-OI-7) |
| Build a ReBAC engine | Proxy to Descope FGA / Ory Keto / OpenFGA; observe AuthZEN (ADR-OI-8) |
| Rename packages/cert/spec repo to "prove" the brand | Keep artifact names behind the author's readiness gate (discretion + technical-readiness, not an external metric); commit the architecture, not the one-way doors |

---

## 5. The Versioned Contract (concrete shapes)

Language-neutral, prose-normative, Python-reference (ADR-OI-10). Illustrative signatures use the existing
Python ABCs as the normative reference.

### 5.1 Canonical domain model (versioned; `canonical-model.schema.json`)

The 8 aggregates from `architecture-canonical-identity.md` are the versioned canonical schema. Summary
(full field lists in that document; unchanged here):

`users` · `tenants` · `roles` (tenant_id NULL = global) · `permissions` · `role_permissions` ·
`user_tenant_roles` (with `assigned_by`/`assigned_at` audit) · `idp_links` (user↔provider,
`external_sub`, `metadata` JSONB) · `providers` (registry: `type`, `issuer_url`, `base_url`,
`capabilities`, `config_ref`, `active`).

Explicitly **not** canonical (stays with provider / proxied): passwords, MFA, sessions, ReBAC tuples,
access keys, JWT claim *structure*.

### 5.2 Adapter interface (capability groups G1–G6; ADR-OI-3)

Normative reference = `services/adapters/base.py` (G1) + the additions below. All methods keyword-only,
`Result`-returning. G2/G3/G4 are the additive surface:

```python
class IdentityProviderAdapter(ABC):
    # G4 — capability discovery (additive)
    def declared_profile(self) -> CapabilityProfile: ...          # {contract_version, capabilities: set[str]}
    def supports(self, capability_id: str) -> bool: ...

    # G1 — outbound sync (EXISTS today)
    async def sync_user(self, *, user_id, data: dict) -> Result[None, SyncError]: ...
    async def sync_role(self, *, role_id, data: dict) -> Result[None, SyncError]: ...
    # … sync_permission / sync_tenant / sync_role_assignment / delete_* (as in base.py)

    # G2 — inbound import (additive; formalizes "seed migration")
    async def import_users(self, *, cursor: str | None = None) -> Result[Page[ExternalUser], SyncError]: ...
    async def import_tenants(self, *, cursor: str | None = None) -> Result[Page[ExternalTenant], SyncError]: ...
    # … import_roles / import_permissions / import_assignments

    # G3 — reconcile (additive; deferred FR26-28)
    async def reconcile(self, *, scope: ReconcileScope) -> Result[ReconcilePlan, SyncError]: ...
    async def apply(self, *, plan: ReconcilePlan) -> Result[ReconcileReport, SyncError]: ...

    # G5 — claim normalization (EXISTS via py_identity_model.to_principal)
    def to_principal(self, *, claims: dict) -> Result[ClaimsPrincipal, IdentityError]: ...
```

### 5.3 Provider registry contract (ADR-OI-4)

Normative reference = `services/provider.py`. Additive: `active_adapter()` resolution and profile
validation.

```python
class ProviderRegistry:                    # promotes ProviderService semantics
    async def register(self, *, name, type: ProviderType, issuer_url, base_url,
                       capabilities: set[str], config_ref) -> Result[dict, IdentityError]: ...  # validates ids against namespace
    async def list(self) -> Result[list[dict], IdentityError]: ...                              # config_ref stripped
    async def deactivate(self, *, provider_id) -> Result[dict, IdentityError]: ...              # idempotent
    async def capabilities(self, *, provider_id) -> Result[set[str], IdentityError]: ...
    async def active_adapter(self) -> Result[IdentityProviderAdapter, IdentityError]: ...        # the swap pivot
```

### 5.4 Claim-normalization contract (ADR-OI-5)

`to_principal(claims, profile) -> ClaimsPrincipal` where `ClaimsPrincipal = {sub, iss, aud,
current_tenant, tenants: {tenant_id: {roles[], permissions[]}}, ...}`. Profiles: `Descope` (normative
reference in `middleware/claims.py`), `Ory`, `GenericOIDC`. Read-only; not authoritative for authz.

### 5.5 Contract version declaration

Each adapter ships `declared_profile() -> {contract_version: "mp-1.0.0", capabilities: {"users.crud",
"roles.crud", "roles.assign", "claims.normalize", "sync.outbound", "authz.check", ...}}`. CI validates the
declaration against conformance results; the matrix is generated from the union across providers×languages.

---

## 6. Conformance Spec Design ("the brain") — summary

(Full layout in ADR-OI-6.) Two suites sharing one machinery:

- **Protocol plane** (`spec/`, exists): discovery, jwks, validation, client-credentials,
  authorization-code, userinfo, introspection, revocation, token-exchange, dpop. Matrix: Python
  (reference), Go (Core+Extended), Rust (Core).
- **Management plane** (`spec/management/`, new): users-crud, roles-crud, roles-assign, permissions-map,
  claims-normalize, sync-outbound, sync-inbound, swap-invariants. Matrix: providers (Descope, Ory, …) ×
  languages (Python reference; Go/Rust planned).

**Worked conformance grammar** (management plane mirrors the protocol plane's `validation.json` shape):

```json
{
  "capability": "sync.outbound",
  "spec": "open-identity Management-Plane Contract mp-1.0.0 §G1",
  "notes": "Vectors are language-neutral; error values are canonical codes (sync_failed, provider_error, capability_unsupported). State assertions compare the provider projection to the canonical input after sync.",
  "tests": [
    {
      "id": "SYNC-001",
      "title": "sync_role creates a matching role projection at the provider",
      "given": "A canonical role {name, description} and an adapter declaring sync.outbound",
      "when": "sync_role is invoked with the canonical role payload",
      "then": "The provider projection contains a role whose normalized name equals the canonical name; result is Ok(None)",
      "references": ["mp-1.0.0 §G1"],
      "vectors": [
        { "input": {"role": {"name": "admin", "description": "Tenant admin"}},
          "expect": {"outcome": "accept", "state": {"provider.role.name": "admin"}} }
      ]
    }
  ]
}
```

CI gate: a `providers × languages × capabilities` cell is `implemented` **iff** its conformance file
passes in that combination. The published matrix (in "the brain"/planning repo, OD-8) is generated from
CI, never hand-curated.

---

## 7. Project Structure & Boundaries

Where the contract and spec live across the workspace (no sibling repos modified by this planning
artifact; this is the target layout).

```
identity-model/                         # protocol plane + shared conformance machinery
├── spec/
│   ├── capabilities.md                 # protocol-plane matrix (EXISTS)
│   ├── conformance/*.json              # protocol-plane vectors (EXISTS)
│   ├── test-fixtures/                  # (EXISTS)
│   └── management/                     # NEW — management-plane spec (ADR-OI-6, OD-8 locked here)
│       ├── capabilities.md             # providers × languages matrix
│       ├── canonical-model.schema.json # versioned canonical model
│       ├── capability-namespace.yaml   # governed capability ids + tiers + refs
│       ├── conformance/*.json          # given/when/then + vectors (incl. swap-invariants.json)
│       └── fixtures/                   # provider claim payloads, canonical seed states
├── go/  rust/                          # protocol-plane bindings (management-plane bindings: planned)
└── conformance/ infra/                 # OIDF RP harness + shared providers (EXISTS)

identity-stack/backend/app/             # management plane — Python reference implementation
├── services/
│   ├── identity.py                     # IdentityService ABC (app-facing; unchanged by swap) EXISTS
│   ├── provider.py                     # ProviderService → ProviderRegistry (adds active_adapter) EXISTS/EXT
│   └── adapters/
│       ├── base.py                     # IdentityProviderAdapter ABC (adds G2/G3/G4/G5) EXISTS/EXT
│       ├── descope.py                  # DescopeAdapter EXISTS
│       ├── ory.py                      # OryAdapter (Kratos/Hydra/Keto) — target of the swap
│       └── noop.py                     # test-only EXISTS
├── models/identity/                    # canonical 8-table model EXISTS
├── middleware/claims.py                # claim normalization (normative ref for Descope profile) EXISTS
└── repositories/idp_link.py            # multi-IdP resolution EXISTS

identity-stack-planning/  ("the brain")
├── docs/                               # published human-readable capability matrix + narrative
└── _bmad-output/planning-artifacts/architecture-open-identity.md  # THIS document
```

**Boundaries.**
- **App-facing boundary:** routers → `IdentityService` (canonical, provider-agnostic). The swap MUST NOT
  cross this boundary (FR-OI-B).
- **Provider boundary:** `IdentityProviderAdapter` (G1–G5) + proxied `DescopeManagementClient`/Ory (G6).
  Everything provider-specific is behind here.
- **Spec boundary:** the language-neutral contract in `spec/management/` is the single source of truth;
  Python/Go/Rust bindings conform to it, they do not define it.

---

## 8. Architecture Validation

### 8.1 Requirements coverage

| Requirement | Covered by | Status |
|---|---|---|
| FR-OI-A one-adapter portability | ADR-OI-3 (capability groups), ADR-OI-4 (namespace) | Contract defined; Ory adapter is the proof |
| FR-OI-B zero-RBAC-migration swap | ADR-OI-1 (canonical SoR), ADR-OI-7 (swap sequence + invariants) | Design complete; `swap-invariants.json` is the CI proof |
| FR-OI-C management-plane normalization | ADR-OI-2, ADR-OI-5 (claims), canonical model §5.1 | Largely implemented; namespace + profiles to formalize |
| FR-OI-D verifiable "brain" | ADR-OI-6 (management conformance), ADR-OI-4 (matrix) | New suite mirrors the existing, proven protocol suite |
| FR-OI-E polyglot + agent/MCP | ADR-OI-9 (MCP profile), ADR-OI-10 (bindings) | Protocol plane real in **both Python and Go** (auth-code+PKCE, token-exchange, DPoP shipped — verified in live source 2026-09-02); net-new = the MCP OAuth 2.1 example; only **Rust** Extended-tier (token-exchange + DPoP) remains (stretch) |
| FR-OI-F versioned contract | ADR-OI-3 (semver + declaration), §5.5 | Scheme locked (OD-2: two independent semver lines `pp-`/`mp-` + compatibility matrix) |

### 8.2 Coherence checks

- **No contradiction with base ADRs.** ADR-OI-1 restates and versions ADR-2/ADR-3's "RBAC canonical,
  ReBAC proxied, don't over-abstract Tier 3." ADR-OI-9 reuses the Extended-tier capabilities already in
  `identity-model`. Claim normalization (ADR-OI-5) formalizes existing `to_principal` behavior.
- **Data flow is clean:** router → `IdentityService` (Result) → repositories (Postgres, canonical SoR) +
  `active_adapter` (G1 sync) ; token → `to_principal` (G5) → canonical principal → RBAC resolved from
  store. The swap changes only `active_adapter` + the claim profile.
- **Verifiability is structural:** every portability claim has a conformance file and a generated matrix
  cell; the swap promise is a machine assertion (zero RBAC row-diff).

### 8.3 Known risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Commodity trap (ships as another OIDC SDK) | High | Two-plane split (ADR-OI-2); invest management plane + conformance; agent/MCP lead |
| Cross-language parity is the hard part (research §8) | High | Honest matrix (ADR-OI-10): Py reference `implemented`, Go/Rust `planned` until they pass — parity is disclosed, not faked |
| Descope not self-hostable → conformance in CI | Med | Fixture/contract mode gates PRs; nightly live matrix over the runnable subset (OD-6, locked) |
| Source-of-truth direction | Resolved | OD-1 locked **canonical-authoritative**: canonical store is the RBAC system-of-record, providers are projections, swap re-projects (zero RBAC row-diff). Provider-authoritative rejected — no ambiguity remains |
| RBAC-portability over-promise | Med | Portability floor + optional/conformance-gated capabilities, matrix tells the truth (ADR-OI-8; OD-4 locked) |
| Rename irreversibility | Med–High | Spec co-located now (`spec/management/`, OD-8 locked); standalone spec repo + package/cert rename stay behind the author's readiness gate — discretion + technical-readiness, not an external metric (research §7) |
| Moat erosion by AuthZEN/Shared-Signals | Low–Med (slow) | Moat is role/permission modeling + migration (stays proprietary longer); track standards, keep an internal `check()` seam for a future AuthZEN binding (OD-5 locked: track only) |

### 8.4 Readiness

**Status:** Ready to drive PRD + epics for the management-plane contract, the Ory adapter, and the
management conformance suite. The Open Decisions are **resolved and locked (2026-09-02)** — see **Resolved
Decisions** — so no decision fork blocks the PRD's FR shape or the CI design. The protocol plane and
canonical model are already implemented; the net-new work is additive (G2/G3/G4 adapter surface,
capability namespace, `spec/management/`).

---

## 9. Handoff & Next Steps

1. **Open Decisions are resolved and locked (2026-09-02)** — see **Resolved Decisions**. Carry the
   rulings (canonical-authoritative SoR; two semver lines; prose+vectors; flat portability floor; AuthZEN
   track-only; fixtures+nightly-live conformance; MCP as a protocol-plane profile; `spec/management/`
   home; MVP scope) into the PRD and CI design as fixed inputs.
2. **Draft/complete the open-identity PRD** against this contract (OD-9 locked the MVP scope). Fold the
   two-plane framing and the capability namespace into FRs.
3. **Epics implied (additive, no rewrite):** (a) capability namespace + `Provider.capabilities`
   migration; (b) adapter G2 inbound import + G4 discovery; (c) Ory adapter to conformance-`implemented`
   for the floor capabilities; (d) `spec/management/` suite + CI generator + published matrix; (e)
   Py/Rust Extended-tier parity for the MCP OAuth 2.1 profile; (f) the `swap-invariants` E2E in CI.
4. **Keep the irreversible names behind the author's readiness gate** (packages, cert, standalone spec
   repo) — author's discretion + technical-readiness checks, not an external-validation metric (OD-8;
   brief's rename staging; research §7).

_This is a planning artifact and a recommendation, not an execution authorization. No sibling repos,
packages, or certifications were modified._
