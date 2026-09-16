---
title: "Documentation Index"
sidebar_label: "Documentation index"
description: "Index of the planning knowledge base: the program map, how work gets done, identity-domain analysis, and the governed-brain research."
status: current
last_verified: 2026-09-15
---

# Documentation Index

Start with the **[Program map](roadmap.md)** — four tracks, what each is for, and where its
work is tracked.

## Getting oriented

- **[Program map](roadmap.md)** — the four tracks and their live work. **Read this first.**
- **[Where status lives](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_bmad-output/implementation-artifacts/status.md)** — GitHub is the
  source of truth for status; this maps each planning artifact to its tracking issue.
- **[System architecture](system-architecture.md)** — C4 context, component architecture,
  canonical identity ER diagram, request lifecycle, ADR index.
- **[Glossary](glossary.md)** — terms used across these documents.
- **[Re-grounding design (2026-09-15)](reground-2026-09-15-design.md)** — what was measured,
  what changed, and why the PRD program was retired.

## How work gets done

- **[Ralph loop process](ralph-loop-process.md)** — how a story becomes a merged PR: phase
  pipeline, task-state persistence, worktree isolation.
- **[Ralph runner guide](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_bmad-output/implementation-artifacts/ralph-runner-guide.md)** —
  the available loop prompts and how to launch one.
- **[Review process](review-process.md)** — the review lenses and the triage order.
- **[Ralph loop efficiency](ralph-loop-efficiency.md)** — prompt sizing and token-waste audit.

## Identity and auth domain knowledge

- **[IdP authorization comparison](idp-rbac-comparison.md)** — RBAC and ReBAC across nine
  providers, and why the reference architecture owns RBAC and proxies ReBAC.
- **[Identity capability gap analysis](identity-capability-gap-analysis-2026-09-05.md)** —
  reusable gaps across protocol, trust, resource-server, credential, relationship, and
  conformance layers.
- **[Descope data model](descope-data-model.md)** — Descope to OAuth2/OIDC mapping: `dct`
  and `tenants` claims, grant types, session management.
- **[OIDC certification analysis](oidc-certification-analysis.md)** — certification status,
  the standing decision that the hosted OIDF suite is the conformance standard, and the
  profile expansion plan.
- **[Ory SSO provider context](ory-sso-provider-context.md)** and
  **[Ory IaC automation plan](ory-iac-automation-plan.md)** — the Ory track.

## Governed brain — Track 4

Proposed. Six documents, no code, **four decisions open**. An agent that holds knowledge on
someone's behalf has to answer *may this actor, acting for this person, obtain this kind of
record, for this stated reason, right now* — an authorization question, not a retrieval one.
The narrow, checkable claim: permission-aware retrieval is already solved for identity ×
document; this is the portable contract for the rest of the decision.

- **[Where it stands](governed-brain-where-it-stands.md)** — plain-language entry point: the
  idea, what is genuinely new versus what already exists, and the four open decisions with a
  recommendation for each. **Start here.**
- **[Concepts and requirements](governed-brain-concepts.md)** — brain, scope, authority,
  grant, receipt, plus sixteen acceptance properties any implementation can be checked against.
- **[Abstract architecture](governed-brain-architecture.md)** — components as roles, ports
  with contracts and negative tests, and a substitution table. Names no product or vendor.
- **[Authorization and federation model](governed-brain-authorization.md)** — how one
  disclosure decision composes: the security invariant, layer responsibilities, the
  relationship-authorization port, and the threat table.
- **[Long-term implementation plan](governed-brain-implementation-plan.md)** — phases 0–7,
  six tool-selection gates, and the known blockers.
- **[Research findings](research/governed-brain-research-2026-09-15.md)**
  — four independent passes against the documents above, with six lane reports beside it.

## Parked ideas

- **[open-identity](idea-open-identity.md)** — a rebrand around provider-portable identity,
  planned in September 2026 and never started.
- **[Deployment ideas](ideas.md)** — free-tier hosting on Supabase or Cloudflare, and the
  10ms CPU ceiling that has to be measured first.

## Archived

Retired artifacts are indexed in [`_archive/README.md`](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_archive/README.md), which records
what each was, why it went, and the `git show` command that prints it back. The files
themselves live only in git history.
