# Archive Index

Everything listed here has been **removed from the working tree and compressed into this
index**. Nothing is lost: every file is intact in git history, and each row below names the
exact command that prints it back.

Recover any single file:

```bash
git show ee2923df8d28356fa0e7732abdb06d204b6fbcd7:<path>          # print it
git checkout ee2923df8d28356fa0e7732abdb06d204b6fbcd7 -- <path>   # restore it
```

`ee2923d` is the last commit that contained all of them (`docs: identity-model
cross-language parity audit 2026-09-05 (IM.P2) (#104)`).

## Why these are gone rather than kept

A planning repo is read by agents with finite context. Spent artifacts — loop prompts for
merged epics, issue drafts for issues that now exist on GitHub, point-in-time snapshots of
third-party products — cost context on every read and, worse, *contradict* the live state.
They earned their retirement by being superseded, not by being wrong at the time.

The rule going forward: an artifact stays in the working tree while it is either (a) the
current statement of intent, or (b) a decision record nothing else captures. Once its
content lives somewhere authoritative — a GitHub issue, a live doc, shipped code — it moves
to this index.

---

## Discovery & ideation (2026-03)

Three BMAD brainstorming sessions. Each was fully consumed by the PRDs it produced; the PRDs
are the live statement, these are the raw working sessions.

| File | Session topic | Consumed by |
|---|---|---|
| `_archive/brainstorming/brainstorming-session-2026-03-28-01.md` | Descope feature completion, RBAC/ReBAC API exposure, path to a provider-agnostic platform | `planning-artifacts/prd-canonical-identity.md`, `docs/idp-rbac-comparison.md` |
| `_archive/brainstorming/brainstorming-session-2026-03-29-01.md` | Infra toolchain, API gateway, pluggable IdPs, repo rename | `planning-artifacts/prd-infrastructure-secrets.md`, `prd-api-gateway.md`, `prd-multi-provider-test.md` |
| `_archive/brainstorming/brainstorming-session-2026-03-29-02.md` | Canonical identity domain model in Postgres | `planning-artifacts/prd-canonical-identity.md`, `architecture-canonical-identity.md` |

## Third-party product research (2026-03)

Point-in-time snapshots of external products — versions, pricing tiers, and feature matrices
that were accurate in March 2026 and are the **most perishable** thing in this repo. Read the
vendor's current docs instead; these are kept only for "why did we pick this".

| File | Subject | Current status of the decision |
|---|---|---|
| `_archive/brainstorming/research/hcp-terraform-research.md` | HCP Terraform backends, workspaces, variable sets | Adopted. Live work: identity-stack#411 (TFC dev+prod environments) |
| `_archive/brainstorming/research/infisical-research.md` | Infisical self-hosted vs cloud | **Rejected.** The HCP Vault successor was abandoned too (Vault Secrets EOL 2026-07-01; Vault Dedicated ~$1,152/mo). Secrets are HCP Terraform variable sets |
| `_archive/brainstorming/research/node-oidc-provider-research.md` | `panva/node-oidc-provider` as a test OP | Adopted. Now a live integration fixture in identity-model |
| `_archive/brainstorming/research/tyk-gateway-research.md` | Tyk OSS gateway tiers and JWT handling | Adopted and shipped. identity-stack#161–#177 all closed |

## Completed loop prompts and planning sessions

Ralph loop routers and session prompts whose epics are merged. A loop prompt is a *runtime*
artifact — an embedded task queue that mutates as the loop runs — so a finished one is a log,
not a plan.

| File | What it drove | Outcome |
|---|---|---|
| `_archive/ralph-planning/completed-epics/api-gateway.md` | Tyk gateway epics | identity-stack#161–#177 closed |
| `_archive/ralph-planning/completed-epics/canonical-identity.md` | Canonical identity Epic 2 | identity-stack#144–#148 closed |
| `_archive/ralph-planning/completed-epics/epic2-rbac-admin.md` | RBAC admin epic | identity-stack#101–#104 closed |
| `_archive/ralph-planning/completed-epics/planning-session-2026-04-13.md` | Workspace state snapshot, 2026-04-13 | Superseded by every later reconciliation |
| `_archive/ralph-planning/completed-epics/repository-base-refactor.md` | Repository base-class refactor | Shipped |
| `_archive/ralph-planning/orchestrator-comparison.md` | Orchestrator tool selection | **Decided: ralph-orchestrator.** Live docs: `docs/ralph-loop-process.md` |
| `_archive/ralph-planning/pim-security-conformance-stack.md` | PIM security + conformance stack | Superseded by OIDF certification, identity-model#242 |
| `_archive/ralph-planning/ralph-bmad-integration-plan.md` | Wiring ralph into BMAD | Implemented. Live docs: `docs/ralph-loop-process.md`, `implementation-artifacts/ralph-runner-guide.md` |

## Completed reviews and analyses

| File | What it was | Superseded by |
|---|---|---|
| `_archive/competitive-analysis-identity-model.md` | Epic 12 competitive analysis, 2026-04-05 | `planning-artifacts/identity-model-parity-report-2026-09-05.md` |
| `_archive/review-findings-identity-stack.md` | Adversarial review of 10 identity-stack PRs, 2026-03-27 | All reviewed PRs merged; findings resolved |

---

## Retired 2026-09-05 from the working tree

These were still in `_bmad-output/` and were retired in the same pass, for the reason given.

### GitHub issue drafts — the issues now exist

`_bmad-output/implementation-artifacts/gh-issue-drafts/` (17 files). Each was a body drafted
before filing. GitHub holds the filed version, which is the one that gets edited.

| Drafts | Filed as |
|---|---|
| `00-meta-consolidation.md`, `01-cons1.md`, `02-cons2.md`, `03-cons3.md` | identity-model#535, #536, #537 — all closed |
| `10-th4-correct-course.md`, `11-lp1-deflake.md`, `12-lp2-invariant-gates.md`, `13-lp3-s10.md`, `14-lp4-docs.md` | TH-4 load-suite correct-course; shipped via identity-model PRs #543–#546 |
| `30-tfcenv-epic.md` … `37-tfcenv-7-varsets-rotation.md` | identity-stack#411 (epic) and #412–#418 (stories) — open |

### Status trackers — GitHub is the source of truth

| File | Why |
|---|---|
| `_bmad-output/implementation-artifacts/task-queue.md` | 396-line cross-repo tracker, last reconciled 2026-07-23. Duplicated GitHub issue state and drifted from it continuously — 16 rows marked `pending` pointed at closed issues. Replaced by `implementation-artifacts/status.md` |
| `_bmad-output/implementation-artifacts/sprint-plan.md` | "Current status as of 2026-05-21"; 18 stale references. Same duplication problem |
| `_bmad-output/implementation-artifacts/sprint-plan-open-identity.md` | 504-line sprint plan for the open-identity rebrand investigation; the initiative's live statement is `planning-artifacts/prd-open-identity.md` + `epics-open-identity.md` |

### Loop routers that were already broken

Both read a `"Review Fix Tasks"` section of `task-queue.md`. That section was removed at some
earlier reconciliation and never restored, so each prompt has been pointing at nothing —
discovered while retiring the tracker.

| File | Why |
|---|---|
| `_bmad-output/implementation-artifacts/ralph-prompts/fix-review-findings.md` | Generic review-fix router; its queue section no longer existed |
| `_bmad-output/implementation-artifacts/ralph-prompts/pim-fix-review-chain.md` | identity-model chained-PR fix router; same missing section |
| `_bmad-output/implementation-artifacts/ralph-prompts/audit-overnight-loops-review.md` | Review checklist for the 2026-09-02 overnight loops; its companion plan is retired above and both loops' work has merged |

### Closed-out plans

| File | Why |
|---|---|
| `_bmad-output/implementation-artifacts/security-fix-plan.md` | Its own header: "COMPLETE — retained for provenance". Live security-control status is `identity-model/py/docs/security/control-matrix.md` |
| `_bmad-output/implementation-artifacts/audit-overnight-loops-2026-09-03.md` | A one-shot audit plan for two overnight loops, explicitly "point-in-time — RE-VERIFY". Both loops' work has since merged |
| `_bmad-output/planning-artifacts/identity-model-feature-parity-report-2026-08-29.md` | Superseded by `identity-model-parity-report-2026-09-05.md`, which re-measured every row |
| `_bmad-output/planning-artifacts/identity-model-parity-reconciliation-plan.md` | Its §3 sign-off gate (the four inversions) was overtaken: two inversions were closed by the id-token stack and the decision record was dropped. Live plan: the 2026-09-05 report's sequencing section |

---

## Retired 2026-09-15 — the open-identity set

Seven planning documents plus one shelved loop prompt, ~38,200 words, condensed into a
single idea record at [`docs/idea-open-identity.md`](../docs/idea-open-identity.md).

open-identity was planned thoroughly in September 2026 and never started. It is an idea for
later, not scheduled work, so it does not need a brief, a PRD, an architecture, and an epic
breakdown standing separately in the working tree. The condensed record keeps what stays
useful: the thesis, the ten locked decisions, the two research corrections, the naming and
trademark position, the epic shape, and the readiness-audit lesson.

Recover any of them with:

```bash
git show 9919887:<path>          # print it
git checkout 9919887 -- <path>   # restore it
```

| File | What it was |
|---|---|
| `_bmad-output/planning-artifacts/product-brief-open-identity-2026-09-02.md` | BMAD product brief — the three pillars and MVP scope |
| `_bmad-output/planning-artifacts/prd-open-identity.md` | PRD with the ten decisions locked 2026-09-02, five user journeys, phased scope |
| `_bmad-output/planning-artifacts/architecture-open-identity.md` | Architecture: ADR-OI-1 through ADR-OI-10, the versioned adapter contract, conformance spec design |
| `_bmad-output/planning-artifacts/epics-open-identity.md` | Epics A–D, 32 stories, FR coverage map |
| `_bmad-output/planning-artifacts/research/market-open-identity-research-2026-09-02.md` | Market research returning a conditional go; source-cited with confidence tiers |
| `_bmad-output/planning-artifacts/research/brand-trademark-diligence-open-identity-2026-09-02.md` | Name availability and US trademark diligence |
| `_bmad-output/brainstorming/brainstorming-open-identity-naming-2026-09-02.md` | Naming and tagline session |
| `_bmad-output/implementation-artifacts/ralph-prompts/open-identity-epic-a.md` | Epic A loop prompt — shelved 2026-09-03 because the merged Ory feeder epics had already delivered most of its stories |

## Retired 2026-09-15 — superseded loop prompt

| File | Why |
|---|---|
| `_bmad-output/implementation-artifacts/ralph-prompts/identity-model-rust-extended.md` | Its "current implementation state" block asserted there was no `rust/src/introspection` — that capability has since shipped, so the prompt would have sent a loop to rebuild working code. Superseded by `identity-model-go-rust-parity.md`, which re-measures Go and Rust against source and covers the Go advanced tier as well. `git show 9919887:<path>` to read it back |

Two rows in `ralph-runner-guide.md` were also removed: `fix-review-findings.md` and
`pim-fix-review-chain.md`, both retired on 2026-09-05 (see above) but still listed as
available. The guide was not updated in that pass.

---

## Retired 2026-09-15 — the PRD program

The six numbered PRDs are retired and replaced by four independent tracks
(see [`docs/roadmap.md`](../docs/roadmap.md)). Some were **delivered**, some were
**superseded by evidence**, and some described a product this workspace decided not to
build. In every case the working tree kept carrying them as if they were live.

**80 files, ~167,000 words.** Recover any of them with:

```bash
git show 9919887:<path>          # print it
git checkout 9919887 -- <path>   # restore it
```

| Group | Files | Why retired |
|---|---:|---|
| **PRD 1 — infrastructure secrets** | 5 | Dead twice over. Infisical was rejected; its HCP Vault successor is worse — Vault Secrets reached EOL 2026-07-01 and Vault Dedicated costs ~$1,152/month against a free-only constraint. What actually runs is HCP Terraform variable sets in `oss-admin` |
| **PRD 2 — API gateway (Tyk)** | 3 | Delivered. `identity-stack/tyk/` exists; issues #161–#177 closed |
| **PRD 3 — multi-provider test** | 3 | Absorbed. node-oidc-provider and IdentityServer live in `identity-model/infra/` |
| **PRD 4 — multi-IdP capstone** | 3 | The capstone demo is retired. identity-stack is a proving ground and a Descope/Tyk sandbox, not a product |
| **PRD 5 — canonical identity** | 2 | Delivered. Eight repositories, sync adapters, inbound sync, migrations — verified in source |
| **PRD 5b — design system** | 5 | 31 stories of product polish for something that is not a product. 3 of 8 components existed, 0 of 5 admin pages, and no GitHub issue ever tracked it |
| **Main PRD** | 3 | Superseded by the four-track map. Its FR taxonomy (`FR-PIM-*`, `FR-SSS-*`, `FR-CROSS-*`) was also a large part of the private identifier scheme now retired |
| **PRD 6 epics 0a–15** | 24 | Shipped. The library consolidated and ships as `py-v3.18.1` |
| **Consolidation epics** | 3 | Done — `identity-model#535`, `#536`, `#537` all closed; `py/ go/ rust/` are all present |
| **Superseded records** | 10 | Three sprint-change proposals, the security-findings triage, two OSS-tooling docs, the monorepo product brief, the 2026-09-05 GitHub reconciliation, the 2026-08-12 identity-model reconciliation, and `scripts/audit-history.sh` (a one-shot pre-publication audit; the repo is public) |
| **Ralph prompts for merged loops** | 19 | A finished loop prompt is a log, not a plan. Several had also gone stale in a way that would actively mislead — `pim-conformance-finish.md` still referenced pre-consolidation `src/py_identity_model/` paths and marked every phase COMPLETE |

### What survives, and why

The live prompts are `run-next-task.md`, `planning-reality-audit.md`, `RED-BLUE-GATE.md`,
`ory-frontend-logout.md`, `token-harness.md`, `pim-capacity-breakpoint.md`,
`pim-fapi2-hardening.md`, the two new identity-model loops, plus the shared `phases/` and
`review-agents/` files that every loop reads.

Four of those were nearly retired in this pass and were pulled back after checking their
issues: `ory-frontend-logout.md` drives the open Ory work (`identity-stack#377`, `#378`),
`token-harness.md` backs the open `identity-model#462` epic and its twelve stories,
`pim-capacity-breakpoint.md` backs `#474`, and `pim-fapi2-hardening.md` backs `#476`. A loop
prompt is only spent when the issues behind it are closed — age alone is not evidence. The live planning artifacts are the config-API set, the token harness, the
2026-09-05 parity report, epics 16–24, the Ory and TFC work, and the domain knowledge in
`docs/`.
