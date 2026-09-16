# Documentation Index

Start with the **[Roadmap](roadmap.md)** to understand the 6 PRDs, cross-cutting initiatives, and their sequencing, then explore by topic.

## Getting Oriented

- **[Roadmap](roadmap.md)** — All 6 PRDs with sequencing, dependencies, and cross-PRD mapping. **Read this first.**
- **[System Architecture](system-architecture.md)** — C4 context diagram, component architecture, canonical identity ER diagram, request lifecycle, deployment topologies, and ADR index.
- **[Glossary](glossary.md)** — Specialized term definitions used across planning documents.

## How Work Gets Done

- **[Ralph Loop Process](ralph-loop-process.md)** — How stories go from PRD to merged PR: phase pipeline, task-state persistence, worktree isolation, monitoring.
- **[Review Process](review-process.md)** — Reviewer personas (Cold Read, Edge Cases, Acceptance Criteria, Security Review, Red Team), review gate flow, triage priority.
- **[Ralph Loop Efficiency](ralph-loop-efficiency.md)** — Token waste audit guide, prompt sizing, phase file overhead.

## Identity & Auth Domain Knowledge

- **[IdP Authorization Comparison](idp-rbac-comparison.md)** — RBAC and ReBAC across 9 providers: why the reference architecture owns RBAC and proxies ReBAC.
- **[Identity Capability Gap Analysis](identity-capability-gap-analysis-2026-09-05.md)** — Reusable gaps across protocol, trust, resource-server, credential-evidence, relationship-authorization, and conformance layers.
- **[Descope Data Model](descope-data-model.md)** — Descope-to-OAuth2/OIDC mapping: JWT claims (`dct`, `tenants`), grant types, session management, cross-repo resources.
- **[OIDC Certification Analysis](oidc-certification-analysis.md)** — py-identity-model OpenID certification status (✅ certified 2 Jul 2026: Basic + Config + Form Post Basic RP) and next-profile expansion plan (§8).
- **[Ory as SSO Provider — Context](ory-sso-provider-context.md)** — Feeder doc: making identity-stack's IdP configurable so Ory Network can be configured and run (provider-agnostic wiring, not a Descope swap-out); locked scope, current-state facts, resolved decisions.
- **[Ory IaC & Automation Plan](ory-iac-automation-plan.md)** — Concrete `ory/ory` Terraform track (project JWT strategy, public SPA client, identity schema), credential model, secrets/state, and CI automation. Backs Epic 1 of `epics-ory-sso-provider.md`.

## Governed Brain

An initiative in this repository, at the planning stage. **Proposed · five documents · no code ·
four decisions open.**

**The problem.** An agent that holds knowledge on someone's behalf has to answer a question an
ordinary search system does not: *may **this actor**, acting for **this person**, obtain **this
kind of record**, for **this stated reason**, right now?* Retrieval answers what is similar; this
is an authorization question, and answering it needs the layers this workspace already builds —
issuer and token verification, canonical identity and tenancy, and a provider-neutral
relationship-authorization boundary. The initiative is an extension of what is here, not a
new direction.

**What is genuinely new.** Retrieval filtered by permissions — *this user, this document* — is
already a mature product category, and this work does not claim it. Two terms are unoccupied
everywhere we looked. The first is **acting for someone else**: the actor making a request, the
person it is made on behalf of, and the person the data describes are three different things,
and no shipped system or current specification keeps them apart. The second is **a stated
purpose**, which is absent from every token format in general use; where it does appear in
production it is an attestation a client makes about itself, backed by contract rather than
proof. So the claim is deliberately narrow and checkable: *permission-aware retrieval is solved
for identity × document; this is the portable contract for the rest of the decision.*

**Why it belongs in this repository rather than a product.** The contract is independent of any
database, cloud, authorization engine, model provider, or identity provider. Written that way,
a tool can be replaced by writing one adapter and re-running the same conformance vectors —
and the vendor evaluation gets a yardstick that existed before anyone was defending a choice.

**Where it stands.** Sixteen acceptance properties an implementation can be checked against; an
abstract architecture that names no product; the decision model for a single disclosure; a phased
plan whose tool choices are explicit gates rather than assumptions; and four independent research
passes that tested all of it against the current state of standards, the deployed
relationship-authorization field, the agent-memory market, and consent-receipt prior art. Those
passes produced 65 change requests — the corrections are applied, and the ones that are design
decisions are listed as open rather than quietly resolved.

**What has to be decided before anything is built.** Four calls, each blocking a phase: how the
candidate set gets narrowed before retrieval runs; what the relationship port promises about
freshness; what makes a receipt worth anything to someone other than its issuer; and when a
request needs fresh consent. Separately, no engine, store, or identity provider has been chosen —
those are six recorded gates, each settled by a spike that ran the negative test rather than by a
vendor's claim. The provider wired into an existing service today was familiarity, not a
commitment.

**What it is not.** Nothing here is implemented, deployed, certified, or compliant with anything.
Where a specific regulated domain would impose its own consent regime, that is an additional
boundary on top of this model and is explicitly out of scope.

- **[Where It Stands](governed-brain-where-it-stands.md)** — Plain-language entry point: the idea in a paragraph, what is genuinely new versus what already exists, and the four open decisions with a recommendation for each. Start here.
- **[Concepts and Requirements](governed-brain-concepts.md)** — What a governed brain must mean and do: brain, scope, authority, promotion, federation, grant, receipt, plus the BR-REQ-01..16 conformance requirements. Implementation-independent.
- **[Abstract Architecture](governed-brain-architecture.md)** — The technology-free layer: components as roles, ports with contracts and negative tests, the invariants any implementation must exhibit, and a substitution table giving selection criteria per port. Names no product, engine, provider, or repository.
- **[Authorization and Federation Model](governed-brain-authorization.md)** — How a disclosure decision composes: the security invariant, layer responsibilities, the relationship-authorization port, protocol profile, `brain_access` RAR detail, federation flow, and the threat table.
- **[Long-Term Implementation Plan](governed-brain-implementation-plan.md)** — Phases 0–7 derived from the architecture: what each phase realizes and must prove, the six tool-selection gates and what settles each, the known blockers, and the entry-point tasks. Where the code lives is marked an implementation decision, not an architectural one.
- **[Research Findings, 2026-09-15](../_bmad-output/planning-artifacts/research/governed-brain-research-2026-09-15.md)** — Four research passes against the three documents above: standards prior art, the relationship-authorization field, the agent-memory landscape, and receipt/audit prior art. Carries the verdicts, what to reuse instead of invent, what to stop claiming, and 65 change requests across the lane reports beside it.

## Planning Artifacts

- **[Main PRD](../_bmad-output/planning-artifacts/prd.md)** — Unified platform vision across all three repos.
- **[PRD 1: Secrets Pipeline](../_bmad-output/planning-artifacts/prd-infrastructure-secrets.md)** — HCP Terraform + Infisical.
- **[PRD 2: API Gateway](../_bmad-output/planning-artifacts/prd-api-gateway.md)** — Tyk OSS integration.
- **[PRD 3: Multi-Provider Test](../_bmad-output/planning-artifacts/prd-multi-provider-test.md)** — node-oidc-provider fixture.
- **[PRD 4: Multi-IdP Demo](../_bmad-output/planning-artifacts/prd-multi-idp-demo.md)** — Descope + Ory + cloud IdPs capstone.
- **[PRD 5: Canonical Identity](../_bmad-output/planning-artifacts/prd-canonical-identity.md)** — Postgres-backed domain model.
- **[PRD 5b: Design System & Admin Frontend](../_bmad-output/planning-artifacts/epics-design-system.md)** — Purple brand, density, 8 components, 5 admin pages, responsive. [Design system reference](../_bmad-output/planning-artifacts/design-system/).
- **[PRD 6: identity-model Monorepo (Brief)](../_bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md)** — Multi-language OIDC/OAuth2 library.
- **[Epic 24: Identity Capability Gaps](../_bmad-output/planning-artifacts/epics/epic-24-identity-capability-gaps.md)** — Actionable open-source identity work across protocol, trust, principal, credential, relationship, and conformance boundaries.
- **[identity-model Reconciliation & Sequenced Plan (2026-08-12)](identity-model-reconciliation-2026-08-12.md)** — Source-verified Go/Rust state, PIM parity matrix, normative-behavior audit, and the sequenced execution plan (loop-vs-in-session).
- **[Architecture docs](../_bmad-output/planning-artifacts/)** — Per-PRD architecture decisions (`architecture-*.md`).
- **[Epic breakdowns](../_bmad-output/planning-artifacts/)** — Per-PRD story decompositions (`epics-*.md`, `epics/epic-*.md`).

## Implementation Tracking

- **[Planning ⇄ GitHub Reconciliation (2026-09-05)](../_bmad-output/planning-artifacts/planning-github-reconciliation-2026-09-05.md)** — What the planning artifacts claimed vs what GitHub says, the drift that was fixed, and the residual gaps.
- **[Where Status Lives](../_bmad-output/implementation-artifacts/status.md)** — GitHub issues are the source of truth for status; this maps each planning artifact to its tracking issue. Replaces the retired `task-queue.md` and `sprint-plan.md`.
- **[Ralph Runner Guide](../_bmad-output/implementation-artifacts/ralph-runner-guide.md)** — Quick-reference commands for ralph loops.

## Parked Ideas

- **[open-identity](idea-open-identity.md)** — a rebrand around provider-portable identity, planned in September 2026 and never started. Thesis, ten locked decisions, market and trademark findings, and the readiness-audit lesson, condensed from seven retired documents.

## Archived

Historical research, brainstorming sessions, spent loop prompts and completed review findings are indexed in [`_archive/README.md`](../_archive/README.md), which records what each artifact was, what superseded it, and the exact `git show` command to read it back. The files themselves are removed from the working tree.
