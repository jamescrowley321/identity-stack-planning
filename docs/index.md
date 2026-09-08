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

## Archived

Historical research, brainstorming sessions, spent loop prompts and completed review findings are indexed in [`_archive/README.md`](../_archive/README.md), which records what each artifact was, what superseded it, and the exact `git show` command to read it back. The files themselves are removed from the working tree.
