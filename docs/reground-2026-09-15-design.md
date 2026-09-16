---
title: "Re-grounding the planning repo — design"
sidebar_label: "Re-grounding (2026-09-15)"
description: "What was measured against source, what changed as a result, and why the six-PRD program was retired in favour of four independent tracks."
status: adopted
last_verified: 2026-09-15
---

# Re-grounding the planning repo — design

**Date:** 2026-09-15 · **Status:** proposed, awaiting review

This repo holds 152 markdown files and ~315,000 words of planning. A large part of it
asserts things that are not true, and the program it describes is not the program being
worked on. This document is the design for correcting that: what is actually true, what
the plan becomes, and exactly which files change.

It replaces the PRD-numbered roadmap with four independent tracks, retires 86 files into
the existing archive index, and removes the private identifier scheme that competes with
GitHub issue numbers.

---

## 1. What is actually true

Every row below was verified against source or a live API, not against another planning
document. This matters because the planning documents are the thing under suspicion.

### 1.1 The library consolidated. The docs say it didn't.

`docs/roadmap.md` and `epics/epic-20-pim-parity.md` both state that the Python library
"stays its own repo" and that consolidation is "deferred until identity-model is more
mature".

The `identity-model` repo contains `py/ go/ rust/ node/ spec/ infra/ conformance/`.
Consolidation happened. The latest release tag is `py-v3.18.1`.

Knock-on corrections:

| Location | Says | Actual |
|---|---|---|
| `CLAUDE.md` | library is at `v3.11.x` | `py-v3.18.1` |
| `identity-stack/backend/pyproject.toml` | pins `py-identity-model>=3.8.5` | ten minor versions behind |
| `epics/epic-cons1..3` | consolidation epics, open work | shipped; `identity-model#535–#537` all closed |

### 1.2 The secrets plan is dead twice over

`Infisical` appears in 16 files including `README.md`'s architecture diagram,
`docs/index.md`, `docs/glossary.md`, `docs/system-architecture.md`, and all of PRD 1.
It was rejected. The archive index already records the rejection; the working tree never
caught up.

Its replacement is worse. The VAULT epic (`identity-stack#398–#405`, seven open issues,
written 2026-09-04) targets HCP Vault:

- **HCP Vault Secrets is discontinued.** End of sale 2025-06-30; **end of life
  2026-07-01**, which has already passed.
- **HCP Vault Dedicated** is ~$1,152/month for a production Essentials cluster plus
  $72.92 per client per month. The dev tier is ~$22/month.

Against the stated constraint — everything must be free — both options fail.

What actually runs is **HCP Terraform variable sets**: `oss-admin` supplies
`descope_management_key` from the org-wide `descope-company` variable set, with the
workspace in local execution mode. HCP Terraform's free tier survived the legacy-plan EOL
and covers 500 managed resources with 1 concurrent run. That is the answer, and it has
been the answer all along.

`identity-stack` has no Vault provider, no HVS, and no variable sets in Terraform. The
VAULT epic is entirely aspirational.

> **Leaked into sibling code.** `identity-stack/infra/ory/outputs.tf` carries two comments
> reading *"route to Infisical/HCP"*. Repo policy forbids modifying sibling repos from
> here, so this becomes a filed issue, not an edit.

### 1.3 Planning and GitHub are joined at 9% by volume

Of 152 markdown files, **136 contain no resolvable GitHub reference at all** — 285,592 of
314,672 words, or 91% by volume. Sixteen files link to GitHub in a checkable way.

The 2026-09-05 reconciliation added tracking blocks to ten epics and declared status to be
GitHub's job. By file count that was a real improvement. By volume it moved 9%.

A consequence worth stating: **issue state cannot drive disposition here.** There is not
enough linkage to compute what is spent. Disposition has to come from the track decisions
in §2 plus source verification.

### 1.4 The identifier scheme collides with issue numbers

There are ~1,900 occurrences of 25 private code families:

`T` (432) · `CONS` (270) · `TH` (237) · `DS` (204) · `K` (111) · `OI` (81) ·
`FR-SSS`/`FR-PIM`/`FR-A`/`FR-B`/`FR-C`/`FR-D`/`FR-CROSS`/`FR-TFP` (~360 combined) ·
`RT1-F`/`RT3-F`/`RT4-F`/`RT5-F` (~60) · `PRD` · `TFCENV` · `VAULT` · `CFG` · `LP` · `IM.P` · `SC`

They are not merely noise. While scoring artifacts for this design, a matcher resolving
bare `#N` references read *"Resolved Decision #9"* in `prd-open-identity.md` as
`identity-model#9` — a closed issue — and scored a live, decision-locked PRD as fully
spent. The private scheme actively corrupts automated reasoning about the corpus.

### 1.5 What shipped, verified in source

| Claim | Verification |
|---|---|
| PRD 2 (Tyk gateway) shipped | `identity-stack/tyk/` exists; `identity-stack#161–#177` closed |
| PRD 5 (canonical identity) shipped | 8 repositories (`user`, `role`, `permission`, `tenant`, `assignment`, `idp_link`, `provider`, `sync_event`), sync adapters, `inbound_sync`, `sync_status`, migrations |
| PRD 3 (multi-provider test) absorbed | node-oidc-provider + IdentityServer live in `identity-model/infra/` |
| PRD 5b (design system) barely started | 3 of 8 components (`kpi-strip`, `provider-glyph`, `stream-row`); **0 of 5 admin pages**; **no GitHub issue** |

### 1.6 Nothing is deployed

`identity-stack` is docker-compose only. `infra/` is Descope and Ory SaaS configuration,
not hosting. The free-tier constraint therefore breaks nothing today — it constrains
future choices only.

---

## 2. The plan: four tracks, not six PRDs

The roadmap's six numbered PRDs, phase sequencing, and dependency graph encode a single
narrative: *build a provider-independent platform, prove it with a second provider, ship a
multi-IdP capstone demo.* That narrative is retired. Tyk and Descope are deliberate
expertise vehicles — POC-grade by design — not deployment targets, which removes the
capstone's reason to exist.

The replacement is four tracks with **no dependency story between them**. The dependency
graph was the fiction; these repos do not gate each other.

### Track 1 — `identity-model` (the library)

**Goal:** a credible, certified, multi-language open-source identity library.
**Success test:** certification breadth grows and cross-language parity holds.
**Live:** 64 open issues — parity `#573`, test hardening `#614`, config API `#616`,
token harness `#462`, security gates, FAPI 2.0 `#476`, RP certification `#242`.
**Positioning:** the `open-identity` initiative (decisions locked 2026-09-02) is this
track's naming and positioning strategy, with the irreversible rename explicitly gated.

### Track 2 — `identity-stack` (proving ground and sandbox)

**Goal:** exercise the library against real providers; keep Descope and Tyk skills sharp.
**Success test:** the library is proven against Descope and Ory for real.
**Live:** Ory `#376–#378`, TFC environments `#411`, config API `#406–#407`, and the
FastAPI rate-limit pin `#324`.
**Not a product.** The 31-story design system and the multi-IdP capstone are retired.

### Track 3 — expertise (`terraform-provider-descope`, `oss-admin`)

**Goal:** stay fluent in Descope, Terraform, and repo governance.
**Success test:** the provider fork stays current; Terraform remains the source of truth
for deployment.
**Live:** `terraform-provider-descope#109`; the `oss-admin` Terraform roots.

### Track 4 — governed brain (research, gated)

**Goal:** test the thesis that agent memory is an authorization problem.
**Success test:** the four open decisions are settled so Phase 0 can start.
**Live:** nothing, by design. Four decisions and four blockers are unresolved, and the
plan says so plainly.

### Cross-track

`docs/ideas.md` — a new, explicitly non-committal file for the free-tier deployment
thinking: Supabase or Cloudflare, co-hosted alongside other projects. Recorded as ideas,
not planned as work. Two items worth keeping visible:

- A Docker gateway has no home on a free tier; Tyk becomes a Worker or stays local-only.
- Cloudflare Python Workers support FastAPI (Pyodide, uv-first), but the free tier allows
  **10ms CPU per invocation**. JWT signature verification under WASM against that ceiling
  is unmeasured and is the first thing to spike if this stops being an idea.

---

## 3. Disposition

### 3.1 Rules

An artifact stays in the working tree only if it is **(a)** the current statement of
intent for a live or gated track, **(b)** a decision record nothing else captures, or
**(c)** working tooling. Everything else moves to `_archive/README.md`, which records what
it was, what superseded it, and the `git show` command that prints it back. Nothing is
lost; the files remain in git history.

This is the rule the 2026-09-05 pass established. It works. This design applies it to the
PRD program itself, which that pass left alone.

### 3.2 Retire — 86 files, 181,388 words

| Group | Files | Words | Reason |
|---|---:|---:|---|
| PRD 1 — secrets | 5 | 10,758 | Dead: target product EOL'd, successor fails the cost constraint |
| PRD 2 — Tyk gateway | 3 | 9,542 | Done, verified in source |
| PRD 3 — multi-provider test | 3 | 8,918 | Absorbed into `identity-model/infra/` |
| PRD 4 — multi-IdP capstone | 3 | 9,657 | Dead: narrative retired |
| PRD 5 — canonical identity | 2 | 8,335 | Done, verified in source |
| PRD 5b — design system | 5 | 7,548 | Dead: `identity-stack` is a sandbox, not a product |
| Main PRD | 3 | 16,816 | Superseded by the track map |
| PRD 6 epics (0a–15) | 24 | 55,242 | Shipped |
| Consolidation epics | 3 | 4,285 | Done — `py/ go/ rust/` all present |
| Superseded records | 10 | 13,661 | Sprint-change proposals, security triage, OSS tooling, the 2026-08-12 reconciliation, the 2026-09-05 reconciliation, `scripts/audit-history.sh` (one-shot, repo is public) |
| Ralph prompts for merged loops | 25 | 36,626 | A finished loop prompt is a log, not a plan |

### 3.3 Keep — 67 files, 133,586 words

- **Track 1:** config API set (4), token harness (2), parity set (4), epics 16–24 (9),
  open-identity set (7: brief, PRD, architecture, epics, 2 research, 1 brainstorm)
- **Track 2:** Ory epics, Ory context and IaC docs, TFC environments
- **Track 3:** Descope data model, IdP RBAC comparison
- **Track 4:** the governed-brain documents (arriving via PR 4)
- **Tooling:** ralph `phases/` (10), `review-agents/` (6), runner guide,
  `planning-reality-audit.md`, `run-next-task.md`, `RED-BLUE-GATE.md`
- **Entry points:** `README.md`, `CLAUDE.md`, `docs/index.md`, `docs/glossary.md`,
  `docs/system-architecture.md`, `docs/roadmap.md`, process docs, `_archive/README.md`

### 3.4 Rewrite

| File | Change |
|---|---|
| `docs/roadmap.md` | Replaced by the four-track map. No PRD numbering, no phases, no dependency graph |
| `README.md` | Vision paragraph and Mermaid diagram both assert the capstone narrative and Infisical |
| `docs/index.md` | Re-indexed against what survives |
| `docs/system-architecture.md`, `docs/glossary.md` | Infisical removed; glossary absorbs the `decode-planning-codes` additions minus its decoder table |
| `_bmad-output/implementation-artifacts/status.md` | Extended from 8 identity-model rows to all four repos |
| `_archive/README.md` | Gains the 11 retirement groups above |
| `CLAUDE.md` | Version corrected to 3.18.1; track vocabulary replaces PRD vocabulary |

### 3.5 De-code

All 25 private families are removed from surviving documents. An epic gets a name; a story
gets a GitHub issue number. Retained because they are externally meaningful: RFC numbers,
CVE and PYSEC identifiers, OIDF profile names (`oidcc-client-basic-certification-test-plan`),
and Descope claim names (`dct`, `tenants`).

Bare `#N` is written as `repo#N` so it cannot be misread — the collision in §1.4 is the
reason.

### 3.6 Local cleanup

`.ralph/` holds three April log files and a stale `loop.lock`. It is gitignored, so this is
a local delete with no commit. The working tree is otherwise clean.

---

## 4. Delivery

Five pull requests, each from its own worktree branch, merged by the author.

| # | Branch | Contents | Depends on |
|---|---|---|---|
| 1 | `docs/ground-truth-corrections` | Infisical removed; consolidation corrected; versions fixed; VAULT epic's death recorded with the pricing evidence | — |
| 2 | `chore/compress-planning-artifacts` | The 86 retirements and the `_archive/README.md` entries | 1 |
| 3 | `chore/retire-planning-codes` | 25 code families → issue numbers; lands `decode-planning-codes`' glossary and architecture fixes, drops its decoder | 2 |
| 4 | `docs/governed-brain-concepts` | Design documents into `docs/`; 7 research passes compressed to a cited summary, raw archived | — |
| 5 | `docs/four-track-replan` | Track map replaces the roadmap; `status.md` extended to four repos; `README.md` rewritten; `docs/ideas.md` added | 1–4 |

PR 1 and PR 4 are independent and can land in either order.

---

## 5. Scope boundaries

**Not done here, deliberately:**

- **No GitHub issues are closed.** The seven VAULT issues (`identity-stack#398–#405`) are
  evidenced as dead in PR 1, but closing them is the author's call.
- **No sibling repository is modified.** The two `route to Infisical/HCP` comments in
  `identity-stack/infra/ory/outputs.tf` become a filed issue.
- **No deployment re-architecture.** Supabase and Cloudflare are recorded in
  `docs/ideas.md` as ideas. The 10ms CPU ceiling is named as the first thing to measure.
- **`_bmad/` is untouched.** It is installer-managed.

---

## 6. Open questions for review

1. **Does the open-identity set stay at full length?** Seven documents and ~31,000 words
   for an initiative that has not started is the largest single block in the keep list. It
   is live and decision-locked, so it is kept — but a second pass could condense brief +
   PRD + architecture + epics into one document. Deferred rather than decided.

2. **Do the 20,000 words of epics 16–24 survive intact?** Most map to open
   `identity-model` issues, so they are kept. They have not been individually audited
   against their issues' current state.

3. **Is `docs/oidc-certification-analysis.md` a record or a plan?** It is kept as a record
   of the July 2026 certification. Its §8 "next profile expansion" reads as a plan and may
   belong in Track 1's live set instead.

**Honest note on the target.** The working figure discussed was ~80,000 words. The
disposition above lands at ~134,000, and PR 4 adds the governed-brain design documents on
top. Getting to 80,000 would require condensing live material — the open-identity set and
epics 16–24 — which is question 1 above, not a mechanical retirement.

---

## 7. How this gets verified

- `grep -ri infisical` over the working tree returns nothing outside `_archive/README.md`.
- No surviving document claims consolidation is deferred or names a version below 3.18.1.
- Every retired file appears in `_archive/README.md` with a reason and a recovery command.
- Every relative markdown link resolves. One is currently broken:
  `docs/review-process.md` points at `ralph-prompts/pim-blind-peer-review.md`, which does
  not exist (fallout from the blind-peer-review rename in PR #107).
- `docs/roadmap.md` contains no PRD numbering and no dependency graph.
- Every surviving epic either names its tracking issue or appears in `status.md`'s
  explicit "no tracking issue, and why" list.
