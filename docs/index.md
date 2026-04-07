# Documentation Index

Start with the **[Roadmap](roadmap.md)** to understand the 6 PRDs and their sequencing, then explore by topic.

## Getting Oriented

- **[Roadmap](roadmap.md)** — All 6 PRDs with sequencing, dependencies, and cross-PRD mapping. **Read this first.**
- **[System Architecture](system-architecture.md)** — C4 context diagram, component architecture, canonical identity ER diagram, request lifecycle, deployment topologies, and ADR index.
- **[Glossary](glossary.md)** — Specialized term definitions used across planning documents.

## How Work Gets Done

- **[Ralph Loop Process](ralph-loop-process.md)** — How stories go from PRD to merged PR: phase pipeline, task-state persistence, worktree isolation, monitoring.
- **[Review Process](review-process.md)** — Reviewer personas (Blind Hunter, Edge Case Hunter, Acceptance Auditor, Sentinel, Viper), review gate flow, triage priority.
- **[Ralph Loop Efficiency](ralph-loop-efficiency.md)** — Token waste audit guide, prompt sizing, phase file overhead.

## Identity & Auth Domain Knowledge

- **[Descope Data Model](descope-data-model.md)** — Descope-to-OAuth2/OIDC mapping: JWT claims (`dct`, `tenants`), grant types, session management, cross-repo resources.
- **[OIDC Certification Analysis](oidc-certification-analysis.md)** — py-identity-model OpenID certification readiness: coverage gaps, conformance harness, phased plan.

## Planning Artifacts

- **[Main PRD](../_bmad-output/planning-artifacts/prd.md)** — Unified platform vision across all three repos.
- **[PRD 1: Secrets Pipeline](../_bmad-output/planning-artifacts/prd-infrastructure-secrets.md)** — HCP Terraform + Infisical.
- **[PRD 2: API Gateway](../_bmad-output/planning-artifacts/prd-api-gateway.md)** — Tyk OSS integration.
- **[PRD 3: Multi-Provider Test](../_bmad-output/planning-artifacts/prd-multi-provider-test.md)** — node-oidc-provider fixture.
- **[PRD 4: Multi-IdP Demo](../_bmad-output/planning-artifacts/prd-multi-idp-demo.md)** — Descope + Ory + cloud IdPs capstone.
- **[PRD 5: Canonical Identity](../_bmad-output/planning-artifacts/prd-canonical-identity.md)** — Postgres-backed domain model.
- **[PRD 6: identity-model Monorepo (Brief)](../_bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md)** — Multi-language OIDC/OAuth2 library.
- **[Architecture docs](../_bmad-output/planning-artifacts/)** — Per-PRD architecture decisions (`architecture-*.md`).
- **[Epic breakdowns](../_bmad-output/planning-artifacts/)** — Per-PRD story decompositions (`epics-*.md`, `epics/epic-*.md`).

## Implementation Tracking

- **[Task Queue](../_bmad-output/implementation-artifacts/task-queue.md)** — Cross-repo task tracker with active/pending tasks.
- **[Sprint Plan](../_bmad-output/implementation-artifacts/sprint-plan.md)** — Prioritized tiers with active work and dependency graph.
- **[Ralph Runner Guide](../_bmad-output/implementation-artifacts/ralph-runner-guide.md)** — Quick-reference commands for ralph loops.

## Archived

Historical research, brainstorming sessions, and completed review findings are in `_archive/`.
