# AGENTS.md

Instructions for AI agents working in `identity-stack-planning`. Tool-neutral — Claude Code
reads this through an import in `CLAUDE.md`; every other harness reads it directly.

## What this repository is

The planning and orchestration hub for a multi-repo identity platform. It holds architecture
decisions, domain research, epics, and the prompts that drive autonomous execution across four
sibling repositories.

**It contains no application code.** Never add any. Code changes happen in the repository that
owns the code; this repository holds the reasoning behind them.

## Ground truth, in priority order

1. **Source and live APIs.** The planning documents are the thing most likely to be wrong.
   When a document and the tree disagree, the tree wins — and the document gets fixed.
2. **GitHub issues** for *status*. What is open, in progress, or done lives there and only
   there.
3. **[`docs/roadmap.md`](docs/roadmap.md)** for *what the work is and why*. Four independent
   tracks that do not gate each other.
4. Everything else in `docs/`, for depth on a specific subject.

### Never reintroduce a markdown status tracker

`task-queue.md` and `sprint-plan.md` were retired on 2026-09-05. At retirement, 16 rows in the
task queue were marked `pending` against closed issues, and the sprint plan carried 18 more. A
tracker that must be hand-reconciled will always lose to the system that updates itself.

- Adding work → file the GitHub issue, then link it from the planning document.
- Changing status → change it on GitHub. Never in a markdown table.
- A document that wants to say "this is done" says *which issue tracks it* instead.

The artifact → issue map is
[`status.md`](_bmad-output/implementation-artifacts/status.md). It deliberately contains no
status words, so it goes stale only when a new epic is written.

## Naming

**GitHub issue numbers are the only identifier for work.** An epic gets a name; a story gets
an issue number.

Write cross-repo references as `repo#N` — `identity-model#573` — never a bare `#N`. A bare
`#N` collides with ordinary prose numbering: a matcher once read "Resolved Decision #9" in a
document as `identity-model#9` and scored a live decision-locked document as fully spent.

**Do not invent a code family.** No `TH-1.5`, no `T300`, no `FR-PIM-2`, no `RT5-F18`. The
repository accumulated roughly 1,900 occurrences across 25 such families. They are a private
namespace competing with GitHub issue numbers, and they drift exactly the way the retired
trackers did — `D-1` once meant both an architecture decision and an unrelated sign-off item.

Identifiers that are *externally* meaningful are fine and expected: RFC numbers, CVE and PYSEC
ids, OIDF profile names (`oidcc-client-basic-certification-test-plan`), conformance vector ids
defined in `spec/` (`REV-001`), and provider claim names (`dct`, `tenants`). The test is
whether the identifier means the same thing outside this repository.

**Legacy codes: replace them in any file you are already editing.** Some documents still carry
the old families; [`docs/glossary.md`](docs/glossary.md) has the decoder. Swap them for issue
numbers or plain words as you go, only in the parts you are already changing. Do not open a
separate sweep, and do not rewrite a loop prompt's task queue mid-run.

If something genuinely has no issue and needs referring to, describe it in words. A decision
that lives in one document does not need an identifier.

## Machine-readable

Two files publish at the site root and are meant to be fetched rather than read:

- `https://jamescrowley321.github.io/identity-stack-planning/llms.txt` — curated index in
  llmstxt.org format: what to read, in what order.
- `https://jamescrowley321.github.io/identity-stack-planning/workspace.yml` — repository
  mapping, package identities, tracks, and the do-not-touch list, as structured data.

Both are mirrors of the prose, carrying their own verification date. Where one disagrees
with a document, the document wins — and the mirror is stale and should be fixed.

## Where to ground

Sibling repositories are checked out next to this one. Read them directly — their code, tests,
configs, and their own `CLAUDE.md`/`AGENTS.md` files.

> **The local directory names do not all match their GitHub remotes.** Check `git remote -v`
> before writing a repository name into a document.

| Local path | GitHub repository | Notes |
|---|---|---|
| `~/repos/auth/py-identity-model/` | **`identity-model`** | The live polyglot monorepo and the survivor of consolidation. Holds `py/` (PyPI package `py-identity-model`, OpenID Certified RP), `go/`, `rust/` (crate `rs-identity-model`), `spec/`. **Ground all library work here.** |
| `~/repos/auth/identity-stack/` | `identity-stack` | FastAPI + React + Terraform proving ground |
| `~/repos/auth/terraform-provider-descope/` | `terraform-provider-descope` | Fork of `descope/terraform-provider-descope`; pull requests go to the fork |
| `~/repos/auth/oss-admin/` | `oss-admin` *(private)* | Terraform roots administering the open-source repositories |
| `~/repos/auth/identity-model-legacy/` | `identity-model-legacy` | **ARCHIVED — do not ground on it.** Its capability matrix is stale; it marks Python `planned` for flows that already ship |

`~/repos/auth/CLAUDE.md` is the workspace-wide source of truth for build, test, and lint
commands across all of them.

**Never modify a sibling repository from this context.** Planning artifacts live here; code
changes happen in the target repository.

## Do not touch

| Path | Why |
|---|---|
| `_bmad/` | Vendored BMAD-METHOD install. Update it with `npx bmad-method install`, never by hand |
| `.claude/skills/bmad-*` | Generated by that installer and git-ignored. In a fresh clone they do not exist until you run it |
| `_bmad-output/implementation-artifacts/ralph-prompts/` | Loop prompts may be mid-run. Editing one changes the behaviour of a loop already executing against it |
| `_archive/` files | Only the index is tracked; the artifacts live in git history by design. Do not restore them |

## Common tasks

**Adding an epic.** File the GitHub issue in the repository that will do the work. Write the
epic under `_bmad-output/planning-artifacts/epics/` with rationale, decomposition and
acceptance criteria — no status. Add a row to `status.md` mapping artifact → issue.

**Recording a decision.** If it affects the program, it belongs in `docs/roadmap.md` or the
relevant `docs/` document. If it is a design worth preserving in full, write a dated design
document in `docs/` — see [`reground-2026-09-15-design.md`](docs/reground-2026-09-15-design.md)
for the house form: evidence first, then the plan, then explicit scope boundaries.

**Retiring an artifact.** Delete the file and add a row to `_archive/README.md` recording what
it was, what superseded it, and the `git show` command that prints it back.

**Adding a document to `docs/`.** Give it the four front-matter keys (`title`, `description`,
`status`, `last_verified`) and add it to `sidebars.ts` so it appears on the published site.

## Writing

Documents here are read by people and by agents, so they are written to be checkable. State
what was measured and when. Prefer a table of *claim versus actual* over prose assurance. Date
anything that will age. When you assert a fact about a sibling repository, verify it against
that repository first and say so.

## Git

- **Conventional commits**, Angular convention: `feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`, `ci:`, `build:`, `test:`, `style:`, `perf:`.
- **Always work on a feature branch.** Never commit to `main`.
- Branch names follow `<type>/<short-description>`.
- Every change lands through a pull request.
- Autonomous loops never merge their own pull requests.
