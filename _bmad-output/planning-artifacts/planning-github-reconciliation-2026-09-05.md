---
workflowType: 'reconciliation'
project_name: 'identity-stack-planning'
date: '2026-09-05'
status: 'done'
---

# Planning ⇄ GitHub Reconciliation — 2026-09-05

What this repo asserted about the state of the work, measured against what GitHub actually
says, and what was changed as a result.

## Method

Every `#N`, `repo#N` and `github.com/jamescrowley321/<repo>/issues|pull/N` reference in every
non-vendored markdown file was extracted with its surrounding line and section heading, then
resolved against a full snapshot of all issues and pull requests in the four repos
(`identity-model` 225 issues / 423 PRs, `identity-stack` 161 / 262,
`terraform-provider-descope` 57 / 146, `identity-stack-planning` 3 / 101). Bare `#N` was
attributed to a repo by the document's `project_name` frontmatter, falling back to the nearest
repo-named heading.

A reference counts as **stale** when the surrounding text treats the work as outstanding
("pending", "open", "blocked", "next", "active") while GitHub reports it closed or merged.

## What was found

| Class | Before | After |
|---|---|---|
| Resolvable references | 723 | 439 |
| Stale — doc says open, GitHub says closed | **89** | **11** |
| Epic docs carrying a GitHub tracking link | **3 of 49** | 13 of 49 (+ an explicit "no issue, and why" list covering the rest) |
| Open issues with no mention anywhere in planning | 32 | 18 |
| Broken relative markdown links | 3 | 0 |

### 1. The markdown trackers were the drift

`task-queue.md` (396 lines, "reconciled 2026-07-23") and `sprint-plan.md` ("current status as
of 2026-05-21") between them carried **34 of the 89 stale references** — rows marked `pending`
against issues that were closed weeks earlier. `task-queue.md`'s own header already conceded
it was not authoritative: *"the per-workstream ralph prompts are the authoritative live status
… reconcile against the prompt + GitHub before assuming a task is open."*

A tracker that has to be hand-reconciled against a system that updates itself will always
lose. Both are retired; `implementation-artifacts/status.md` replaces them with a map that
contains identifiers only and therefore cannot go stale from work progressing.

### 2. Two loop routers had already broken

`ralph-prompts/fix-review-findings.md` and `ralph-prompts/pim-fix-review-chain.md` both
instruct the loop to read a **"Review Fix Tasks"** section of `task-queue.md` and take the
first `pending` row. That section does not exist in `task-queue.md` and has not for some time
— an earlier reconciliation removed it without updating its consumers. Either loop, if
launched, would have found no queue at all. Both are retired.

This is the strongest argument against the markdown-tracker pattern: the coupling was silent.
Nothing failed loudly, so nobody noticed.

### 3. Planning and GitHub were barely joined

Only **3 of 49** epic documents named the GitHub issue tracking them. The consequence shows up
in both directions: 32 open issues had no planning mention, and a reader of any epic doc had
no way to reach current status without guessing at a search.

Tracking blocks were added to the ten epics whose issues could be verified. The rest are
listed explicitly in `status.md` under "planning artifacts with no tracking issue", each with
the reason — `proposed` and not yet accepted, filed ad hoc, or a decision record for work that
shipped under a different umbrella. Naming the gap is the point; a silent absence reads
identically to an oversight.

### 4. Stale facts in the entry points

`README.md`'s status table still described `py-identity-model` and `identity-model` as two
separate repos with the pre-consolidation framing, pinned a version from several releases ago,
and linked to `github.com/jamescrowley321/py-identity-model` — a slug that no longer resolves.
Rewritten to the four repos as they exist.

## What did not change

Eleven stale references survive, deliberately:

- **Six are dated snapshots** — `docs/identity-model-reconciliation-2026-08-12.md`, the
  narrative context block in `ralph-prompts/identity-model-priorities-planning.md`, and a
  delivered story's *Given* clause in `epics.md`. Each is explicitly a record of a moment.
  Rewriting them to today's state would destroy the thing that makes them useful.
- **Five are false positives of the scan** — `epic-15`'s competitor comparison table cites
  *another* library's issue numbers; `epic-19`'s "already planned (planning#49)" correctly
  refers to a merged planning PR; `epics-token-harness`'s "#461 remains on `main` pending
  TH-2.1" accurately describes a merged PR whose disposition is still open.

Eighteen open issues remain unmentioned in planning. They are standalone backlog items —
`Azure AD Example`, `chore: centralize key/cert generation`, `Deferred: bump frontend
TypeScript to 7.x` — filed straight to GitHub and needing no decomposition. Under the rule
above that is the correct state, not a gap. The three exceptions worth noting are
`identity-stack-planning#61`, `#66` and `#94`, which are epic-shaped and have no planning
artifact at all.

## The rule going forward

Status lives in GitHub. Planning artifacts hold rationale and decomposition, and link to the
issue that tracks them. See `implementation-artifacts/status.md`.

Re-run this reconciliation with `ralph-prompts/planning-reality-audit.md`.
