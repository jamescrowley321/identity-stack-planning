# Documentation Index

Start with the **[Roadmap](roadmap.md)** to understand the 6 PRDs and their sequencing, then explore by topic.

## Getting Oriented

These documents provide the high-level picture:

- **[Roadmap](roadmap.md)** — All 6 PRDs with sequencing, dependencies, MVP/Growth boundaries, and cross-PRD functional requirement mapping. **Read this first.**
- **[System Architecture](system-architecture.md)** — C4 context diagram, component architecture for each repo, canonical identity ER diagram, full request lifecycle, deployment topologies, secrets pipeline flow, and consolidated ADR index across all architecture docs.
- **[Glossary](glossary.md)** — Definitions for every specialized term used across planning documents (canonical identity, write-through sync, provider abstraction tiers, review personas, etc.).

## How Work Gets Done

These documents explain the autonomous development and review pipeline:

- **[Ralph Loop Process](ralph-loop-process.md)** — How stories go from PRD to merged PR: the phase pipeline, task-state persistence, worktree isolation, available prompts, monitoring, and configuration.
- **[Review Process](review-process.md)** — Why independent review contexts matter, the 5 reviewer personas (Blind Hunter, Edge Case Hunter, Acceptance Auditor, Sentinel, Viper), the review gate flow, finding triage priority, and manual adversarial review instructions.

## Identity & Auth Domain Knowledge

Reference material for understanding the identity provider landscape:

- **[Descope Data Model](descope-data-model.md)** — How Descope maps to OAuth 2.0/OIDC specifications: endpoints, JWT claim structure (including `dct` and `tenants`), grant types, session management, and cross-repo resource mapping.
- **[OIDC Certification Analysis](oidc-certification-analysis.md)** — OpenID Foundation certification readiness assessment for py-identity-model. Current coverage, critical gaps, conformance test harness proposal, and phased certification plan.

## Tooling & Infrastructure Research

Evaluation reports informing architectural decisions:

- **[Orchestrator Comparison](ralph-planning/orchestrator-comparison.md)** — Chief Wiggum vs Ralph Orchestrator: architecture (pipeline vs pub/sub), security enforcement, community, and fit for the auth domain.
- **[BMAD Integration Plan](ralph-planning/ralph-bmad-integration-plan.md)** — Proposal for 3 security-focused BMAD agents (Sentinel, Viper, Cipher), 4 new skills, and Ralph hat topology mapping personas to pub/sub flows.
- **[HCP Terraform Research](../_bmad-output/brainstorming/research/hcp-terraform-research.md)** — Setup, migration, state management, variable sets, CI/CD patterns, and Infisical integration for remote Terraform state.
- **[Infisical Research](../_bmad-output/brainstorming/research/infisical-research.md)** — Secrets management evaluation: self-hosted vs cloud, Terraform integration, FastAPI/React consumption patterns, and migration path.
- **[node-oidc-provider Research](../_bmad-output/brainstorming/research/node-oidc-provider-research.md)** — OIDC provider evaluation for integration testing: feature coverage, Docker setup, claim customization, conformance certification, and advantages over .NET IdentityServer.
- **[Tyk Gateway Research](../_bmad-output/brainstorming/research/tyk-gateway-research.md)** — API gateway evaluation: JWT validation, rate limiting, plugin system, Docker Compose setup, and the authentication/authorization boundary design.

## Planning Artifacts

The raw planning documents that drive implementation:

- **[Main PRD](../_bmad-output/planning-artifacts/prd.md)** — Unified platform vision: 22 functional requirements across py-identity-model, terraform-provider-descope, and identity-stack.
- **[PRD 1: Secrets Pipeline](../_bmad-output/planning-artifacts/prd-infrastructure-secrets.md)** — HCP Terraform + Infisical pipeline reducing N secrets to 2 bootstrap credentials.
- **[PRD 2: API Gateway](../_bmad-output/planning-artifacts/prd-api-gateway.md)** — Tyk OSS integration with dual deployment modes (standalone/gateway).
- **[PRD 3: Multi-Provider Test](../_bmad-output/planning-artifacts/prd-multi-provider-test.md)** — node-oidc-provider test fixture for provider-agnostic validation.
- **[PRD 4: Multi-IdP Demo](../_bmad-output/planning-artifacts/prd-multi-idp-demo.md)** — Capstone: Descope + Ory + cloud IdPs with claim normalization.
- **[PRD 5: Canonical Identity](../_bmad-output/planning-artifacts/prd-canonical-identity.md)** — Postgres-backed domain model inverting the Descope-first architecture.
- **[Architecture docs](../_bmad-output/planning-artifacts/)** — Per-PRD architecture decisions (`architecture-*.md`).
- **[Epic breakdowns](../_bmad-output/planning-artifacts/)** — Per-PRD story decompositions (`epics-*.md`).

## Implementation Tracking

- **[Task Queue](../_bmad-output/implementation-artifacts/task-queue.md)** — Cross-repo task tracker: 147+ tasks with status, dependencies, and iteration counts.
- **[Sprint Plan](../_bmad-output/implementation-artifacts/sprint-plan.md)** — Prioritized tiers across all repos with dependency graph.
- **[Review Findings: identity-stack](../_bmad-output/implementation-artifacts/review-findings-identity-stack.md)** — Adversarial code review findings: 44 MUST FIX, 85 SHOULD FIX, 51 DEFER across 12 PRs (all resolved).
- **[Ralph Runner Guide](../_bmad-output/implementation-artifacts/ralph-runner-guide.md)** — Quick-reference commands for running and monitoring ralph loops.
