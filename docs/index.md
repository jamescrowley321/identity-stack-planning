---
title: "Documentation Index"
sidebar_label: "Documentation index"
description: "Index of the planning knowledge base: the program map, how work gets done, identity-domain analysis, and the governed-brain research."
status: current
last_verified: 2026-09-15
---

# Documentation Index

This is the reasoning layer: the decisions behind a certified identity library, and the
evidence for each one. Documents here are checked against the source tree and live APIs
rather than against each other.

**Looking for the library itself?** Installation, the API reference and the capability
matrix live with it — [identity-model documentation](https://jamescrowley321.github.io/identity-model/)
and the [capability matrix](https://github.com/jamescrowley321/identity-model/blob/main/spec/capabilities.md).

Status is never in these pages. It lives in GitHub issues, and
[`status.md`](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_bmad-output/implementation-artifacts/status.md)
maps each planning artifact to the issue tracking it.

## Start here

- **[What you can build](what-you-can-build.md)** — the capabilities organised by the problem
  they solve, the RFC behind each, and where each one is available today. **Read this first.**
- **[Program map](roadmap.md)** — the four tracks, what each is for, and where its work is
  tracked.
- **[System architecture](system-architecture.md)** — C4 context, component architecture,
  canonical identity ER diagram, request lifecycle, ADR index.
- **[Glossary](glossary.md)** — terms used across these documents.

## How work gets done

- **[Ralph loop process](ralph-loop-process.md)** — how a story becomes a merged pull request:
  phase pipeline, task-state persistence, worktree isolation.
- **[Review process](review-process.md)** — the five review lenses, what each catches, and the
  triage order.
- **[Ralph loop efficiency](ralph-loop-efficiency.md)** — prompt sizing and token-waste audit.
- **[Ralph runner guide](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_bmad-output/implementation-artifacts/ralph-runner-guide.md)**
  — the available loop prompts and how to launch one.

## Identity and auth domain

- **[IdP authorization comparison](idp-rbac-comparison.md)** — RBAC and ReBAC across nine
  providers, and why the reference architecture owns RBAC and proxies ReBAC.
- **[Identity capability gap analysis](identity-capability-gap-analysis-2026-09-05.md)** —
  reusable gaps across protocol, trust, resource-server, credential, relationship, and
  conformance layers.
- **[OIDC certification analysis](oidc-certification-analysis.md)** — certification status, the
  standing decision that the hosted OIDF suite is the conformance standard, and the profile
  expansion plan.
- **[Descope data model](descope-data-model.md)** — how one provider maps onto OAuth 2.0 and
  OIDC: the `dct` and `tenants` claims, grant types, session management.
- **[Ory SSO provider context](ory-sso-provider-context.md)** and
  **[Ory IaC automation plan](ory-iac-automation-plan.md)** — the Ory track.

## Governed brain

Research, gated, nothing built. An agent that holds knowledge on someone's behalf has to
answer *may this actor, acting for this person, obtain this kind of record, for this stated
reason, right now* — an authorization question, not a retrieval one. The narrow, checkable
claim: permission-aware retrieval is already solved for identity × document; this is the
portable contract for the rest of the decision. **Four decisions are open.**

- **[Where it stands](governed-brain-where-it-stands.md)** — the idea, what is genuinely new
  versus what already exists, and the four open decisions with a recommendation for each.
  **Start here.**
- **[Concepts and requirements](governed-brain-concepts.md)** — brain, scope, authority, grant,
  receipt, plus sixteen acceptance properties any implementation can be checked against.
- **[Abstract architecture](governed-brain-architecture.md)** — components as roles, ports with
  contracts and negative tests, and a substitution table. Names no product or vendor.
- **[Authorization and federation model](governed-brain-authorization.md)** — how one
  disclosure decision composes: the security invariant, layer responsibilities, the
  relationship-authorization port, and the threat table.
- **[Long-term implementation plan](governed-brain-implementation-plan.md)** — phases 0–7, six
  tool-selection gates, and the known blockers.
- **[Research findings](research/governed-brain-research-2026-09-15.md)** — four independent
  passes against the documents above, with six lane reports beside it.

## Decisions and history

Kept because the reasoning is worth reading, not because it is current.

- **[Re-grounding design (2026-09-15)](reground-2026-09-15-design.md)** — what was measured
  against source, what changed, and why the PRD program was retired.
- **[Docs overhaul design (2026-09-16)](docs-overhaul-2026-09-16-design.md)** — the design for
  the published site and the machine-readable layer.
- **[open-identity](idea-open-identity.md)** — a rebrand around provider-portable identity,
  planned in September 2026 and never started.
- **[Deployment ideas](ideas.md)** — free-tier hosting on Supabase or Cloudflare, and the 10ms
  CPU ceiling that has to be measured first.
- **[Archive index](https://github.com/jamescrowley321/identity-stack-planning/blob/main/_archive/README.md)**
  — retired artifacts: what each was, why it went, and the `git show` that prints it back. The
  files themselves live only in git history.
