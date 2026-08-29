# Planning ⇄ Reality ⇄ GitHub-Issues Audit

A **read-first reconciliation audit**. One-shot fan-out, not a fix loop. Goal:
find every place where the `identity-stack-planning` artifacts, the planned
repos' actual state, and their open GitHub issues **disagree**, and produce a
ranked report with a concrete recommended action per finding — then land the
safe planning-doc corrections as a single PR and hand the owner a decision list
for everything that changes a sibling repo.

The planning repo drifts constantly (a sprint table said every CONS story was
"planned" weeks after they all shipped; `pim-shipped-audit.md` still greps the
pre-rename slug `jamescrowley321/py-identity-model`). Treat **every status,
direction, slug, and cross-reference in the artifacts as suspect** and verify it
against ground truth.

## Scope

**The planner:** `~/repos/auth/identity-stack-planning` (this repo, BMAD v6,
no application code). Audit its `_bmad-output/` artifacts and `docs/`.

**The repos it plans for** (verify slugs — they drift; the local dir name does
NOT equal the GitHub slug):

| Local dir | GitHub slug | Notes |
|-----------|-------------|-------|
| `py-identity-model/` | `jamescrowley321/identity-model` | survivor of the consolidation; PyPI pkg is still `py-identity-model`. **Old slug `jamescrowley321/py-identity-model` is STALE — flag every occurrence.** |
| `identity-stack/` | `jamescrowley321/identity-stack` | FastAPI + React + Terraform |
| `terraform-provider-descope/` | `jamescrowley321/terraform-provider-descope` | fork (`gh repo set-default jamescrowley321/terraform-provider-descope` if needed) |
| — | `jamescrowley321/identity-model-legacy` | **archived read-only**; issues/PRs frozen; anything still pointing here as "active" is stale |

## Establish ground truth FIRST (do not trust the artifacts you are auditing)

For each planned repo, build a factual snapshot before reading any planning doc:

```bash
R=jamescrowley321/identity-model   # repeat per repo
git -C ~/repos/auth/<dir> fetch origin --tags --quiet
git -C ~/repos/auth/<dir> log --oneline -40 origin/main
git -C ~/repos/auth/<dir> tag | sort -V | tail -20
gh release list  -R $R --limit 15
gh issue list -R $R --state open  --limit 200 --json number,title,labels,updatedAt,milestone
gh issue list -R $R --state closed --limit 100 --json number,title,closedAt
gh pr    list -R $R --state merged --limit 60  --json number,title,mergedAt
gh pr    list -R $R --state open   --limit 60  --json number,title,headRefName
```

Also read `~/.claude/projects/-home-james-repos-auth/memory/MEMORY.md` for
project-state context — but the memory is point-in-time too; **verify any claim
it makes against the live snapshot before repeating it.** Published-artifact
truth: PyPI `/pypi/<pkg>/<ver>/json` (200 = live; top-level caches),
crates.io sparse index `https://index.crates.io/rs/-i/rs-identity-model`, Go
proxy `https://proxy.golang.org/github.com/jamescrowley321/identity-model/go/@v/list`.

## Drift failure modes to hunt (both directions)

**Planner → reality (stale/false planning):**
1. **Stale status** — an epic/story/sprint row marked `planned`/`in progress`/
   `blocked` for work that is merged, released, or closed. (Cross-check the
   sprint-plan, `task-queue.md`, and each `epics/epic-*.md` against merged PRs +
   tags + closed issues.)
2. **Superseded direction asserted as current** — artifacts describing a plan
   that a later `sprint-change-proposal-*.md` reversed (e.g. the pre-2026-08-17
   "PIM → monorepo / uv-workspace / node tier" direction; the consolidation is
   done and reversed). Roadmap/PRD/reconciliation/product-brief are prime
   suspects.
3. **Stale repo slugs / module paths / crate names** — `py-identity-model` the
   *slug* (vs the PyPI package name, which is legitimately still that), the old
   Go module path, `identity-model` (unprefixed) crate name, `identity-model`
   as the "polyglot monorepo" (that's now `identity-model-legacy`).
4. **Finished work still presented as launch-ready** — `ralph-prompts/*.md` and
   `gh-issue-drafts/*.md` whose queue/stories are already merged; repo-root
   `PROMPT.md`-style "cp + ralph run" recipes pointing at completed epics
   (per `feedback_verify_queue_before_launch` the task-queue drifts and shows
   finished work as open — verify each queue item against merged PRs).
5. **Broken internal references** — `[[wikilinks]]`, relative file links, or
   `epics/epic-*.md` ↔ sprint-plan ↔ gh-issue-draft cross-refs that point at
   moved/deleted/renamed files or issue numbers that don't exist.
6. **Duplicate / contradictory artifacts** — two docs asserting opposite current
   state; an `epic-0a` marked superseded in one place but cited as active in
   another.

**Reality → planner (uncovered or mis-tracked work):**
7. **Open GitHub issues that are actually done** — an open issue whose work
   shipped (merged PR / released / re-implemented elsewhere). Candidate to
   close. Also issues pointing at `identity-model-legacy` work already ported to
   the survivor.
8. **GH issues with no planning coverage, or planning epics/stories with no GH
   issue** — gaps in either direction; `gh-issue-drafts/*.md` never filed, or
   filed-and-diverged.
9. **Cross-repo claims that no longer hold** — e.g. a CLAUDE.md/PRD version
   floor (`identity-stack` depends on `py-identity-model>=X`), an integration
   assumption, or an issuer/format claim that the code has since changed.
10. **Mislabeled / milestone-orphaned issues** — open issues with no
    epic/milestone linkage, or labels that contradict their state.

## Method — parallel fan-out, then synthesize

Per `feedback_parallelize_research`, split the work across independent
subagents rather than one monolithic pass. A reasonable split:

- **N artifact readers** (one per cluster): `planning-artifacts/` PRDs+epics;
  `planning-artifacts/epics/epic-*.md`; `implementation-artifacts/`
  (sprint-plan + task-queue); `ralph-prompts/` + `gh-issue-drafts/`; `docs/`.
  Each returns a structured list of every status/direction/slug/reference claim
  and whether it matches the ground-truth snapshot.
- **1 issue auditor per repo** (4 total): reconcile that repo's open+recent-closed
  issues against merged PRs, releases, and the planning artifacts that mention
  them.
- **1 synthesizer**: dedupe across streams, resolve conflicts, rank.

**Adversarially verify before recommending a destructive action.** Any "close
this issue" or "this is superseded, delete it" recommendation must be checked by
a second, skeptical pass that tries to prove the work is NOT actually done
(look for the merged PR, the release, the re-implementation) before it enters
the report. Prefer false-negatives (leave it open) over closing live work.

## Output — one audit report + two action lists

Write `_bmad-output/planning-artifacts/planning-reality-audit-<YYYY-MM-DD>.md`
(pass the date in; do not call `date`). Structure:

1. **Summary** — counts by severity and by type; the top 5 things that most
   mislead a reader today.
2. **Findings table** — one row per finding:
   `id | type(1–10 above) | location (file:line / issue# / epic) | claim | reality | evidence (PR#, tag, release, file:line) | severity (high/med/low) | recommended action | auto-fixable? (planning-doc only Y/N)`.
3. **Action list A — planning-doc reconciliations (safe, auto-fixable):** the
   subset that only edits this repo's artifacts to match reality. These land as
   ONE PR (see below).
4. **Action list B — sibling-repo / GitHub-issue actions (owner decision):**
   proposed issue closes/relabels/milestone links, `gh-issue-drafts` to file,
   new issues to open for uncovered work. **Do not execute these** — present as
   a checklist with the exact `gh` command and one-line rationale each, for the
   owner to approve. (`feedback_no_auto_merge_loops`: the owner reviews and acts.)

Every finding cites evidence. "Looks stale" without a PR/tag/issue reference is
not a finding — verify or drop it.

## Guardrails

- **Never modify a sibling repo from the planning context** (planning
  `CLAUDE.md` rule). This audit only *reads* the sibling repos and their issues.
  It may *edit planning artifacts* and *propose* issue actions — never close/edit
  issues itself.
- **Planning edits go on a feature branch + PR** (never commit to `main`;
  conventional commits, Angular convention). Do the reconciliation in a
  dedicated worktree: `git worktree add /tmp/isp-reality-audit -b docs/planning-reality-audit origin/main`.
- **Split the report from the fix.** The audit report (action list A + B) is a
  standalone artifact even if no reconciliation PR follows. Land the
  action-list-A edits as `docs(planning): reconcile <area> to shipped reality`.
- **Verify before asserting.** Memories and artifacts are point-in-time; confirm
  file/issue/PR/tag existence against the live snapshot before citing it.
- Idempotent: safe to re-run; a clean run (no drift) should produce a report
  with zero high/med findings, not fabricate work.

## Definition of done

- A dated audit report exists with a complete, evidence-cited findings table and
  both action lists.
- Action list A (planning-doc reconciliations) is either applied as one PR or
  explicitly empty because nothing drifted.
- Action list B is a ready-to-approve `gh`-command checklist; nothing in it was
  executed.
- No sibling repo was modified; no GitHub issue was closed or edited by the audit.
