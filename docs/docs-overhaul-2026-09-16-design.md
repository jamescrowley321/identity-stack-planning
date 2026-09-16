---
title: "Overhauling the documentation — design"
sidebar_label: "Docs overhaul (2026-09-16)"
description: "The design for the documentation overhaul: the front door, a published site, and a machine-readable layer for agents."
status: adopted
last_verified: 2026-09-15
---

# Overhauling the documentation — design

**Date:** 2026-09-16 · **Status:** proposed, awaiting review

The [re-grounding](reground-2026-09-15-design.md) fixed what the planning documents *say*.
It did not touch how anyone — person or agent — *arrives*. This document is the design for
that second half: the front door, a published site, and a machine-readable layer.

Three audiences land on this repo and none of them are served today:

| Audience | Arrives at | Gets |
|---|---|---|
| A person browsing github.com | `README.md` | 362 lines describing a program that was retired on 2026-09-15 |
| A person who wants to read the material | nothing | 300 KB of markdown, no published rendering |
| An agent with no prior context | `CLAUDE.md` | Claude-only instructions; every other tool reads nothing |

---

## 1. What is actually true

Verified against the tree and the GitHub API on 2026-09-16, not against another planning
document.

### 1.1 `docs/` is correct. `README.md` contradicts it.

`docs/` was re-grounded on 2026-09-15 and is coherent. `README.md` was not part of that
change and still sells the program the re-grounding retired.

| `README.md` says | Actual |
|---|---|
| "Six PRDs define the platform evolution"; PRD 5/5b/6 active; PRD 4 capstone | PRD program retired; `docs/roadmap.md` is four tracks that do not gate each other |
| py-identity-model "**Status:** v3.11.3 published" | the same file's own intro says `py-v3.18.1` |
| terraform-provider-descope "v1.2.1" (§ The Repositories) | "v1.2.2" (§ Project Status), same file |
| "147+ tasks tracked across 4 repos", "A single task queue" | `task-queue.md` retired 2026-09-05, never to return |
| Quick Start: `cp .../ralph-prompts/canonical-identity.md PROMPT.md` | that file does not exist |
| `py-identity-model` and `identity-model` as two separate repositories | one repo; consolidated and renamed |
| `.claude/skills/` — "45 BMAD skills + ralph-status" | `bmad-*` skills are installer-generated and untracked since #111 |
| identity-stack — "Full-stack SaaS starter" | `docs/roadmap.md`: "**This is not a product**" — an expertise vehicle, POC-grade by design |

The cause is structural, not clerical. `README.md` **restates** four repositories' worth of
detail that each repository already owns, so it drifts every time any of them ships.

### 1.2 The public surface is unfinished

The repository is public. Its GitHub description reads *"BMAD-METHOD planning repo for auth
workspace (py-identity-model, terraform-provider-descope, descope-saas-starter)"* — naming a
repository that no longer exists and two under their former names. No topics. No homepage.

It is also the only repository of the four with no `CONTRIBUTING.md`, no `SECURITY.md`, and
no `.github/` directory at all.

`oss-admin` holds a Terraform root per administered repository — `identity-model`,
`identity-stack`, `terraform-provider-descope`. **This repository is not among them**, so its
settings are unmanaged. Adding that root is out of scope here; it is recorded in §6.

### 1.3 The machine-readable surface is empty

No `AGENTS.md`, no `llms.txt`, no manifest, no front-matter. An agent that opens this
repository cold must read ~300 KB of prose to learn what `docs/index.md` states in one
screen. `CLAUDE.md` carries the rules that matter — status lives in GitHub, no invented code
families, which sibling repository is authoritative — and every tool that is not Claude Code
reads none of it.

The local-directory-to-GitHub-name mismatch is the sharpest instance: the directory
`~/repos/auth/py-identity-model/` is the GitHub repository `identity-model`, and
`identity-model-legacy` is an archived trap whose capability matrix is stale. That fact is
prose in one Claude-only file.

### 1.4 The corpus is MDX-hostile

Measured in `docs/`: six files contain `{identifier}` sequences — `{project_id}`, `{dsl}`,
`{pid}`, `{AccessKeySecret}` — and there are 35 unclosed `<br>` tags. Under MDX v3, which
Docusaurus 3 applies to `.md` by default, each of those is a JSX expression or an unclosed
element and fails the build. This is a configuration decision, not a rewriting job — see §4.2.

---

## 2. The plan: three surfaces

**One governing rule, from which the rest follows:**

> The README states no fact that can go stale silently. Anything versioned is a badge or a
> link; anything with a status lives in a GitHub issue; anything detailed lives in `docs/`
> and is linked, not restated.

That rule alone retires every row in §1.1 — the version contradictions, the retired PRD
program, and the dead task queue were all restatements of facts owned elsewhere.

**Surface 1 — the front door (github.com).** `README.md` becomes an orientation page of
roughly 130 lines: what this is, the four tracks and their diagram, where things live, a link
to the site, status→GitHub, license. Community health files in the substantive tone the
sibling repositories already use.

**Surface 2 — the published site.** Docusaurus 3 on the current Node release, matching the
`personal-blog` stack, at `https://jamescrowley321.github.io/identity-stack-planning/`.

**Surface 3 — the machine layer.** `AGENTS.md` as the cross-tool entry point, `CLAUDE.md`
reduced to an import of it plus Claude-specific notes, `llms.txt` as the curated index, and
`workspace.yml` as the manifest of facts that drift.

---

## 3. Disposition

### 3.1 Rewrite

| File | Becomes |
|---|---|
| `README.md` | ~130-line front door. Badges replace typed versions. Drops the PRD section, the per-repository feature matrices (each repository's own README owns those), the duplicated architecture sections (`docs/system-architecture.md` owns those), and the dead Quick Start |
| `CLAUDE.md` | `@AGENTS.md` import plus Claude-specific content only (skills, `/bmad-*`, worktree convention) |
| `docs/index.md` | A landing page — four track cards and orientation. Its link-list role passes to the site sidebar |

### 3.2 Add — repository surface

`CONTRIBUTING.md` (how to propose a change to a *plan*: issue-first, the no-invented-codes
rule, conventional commits, feature branch), `SECURITY.md` (no code here — routes to the
sibling repositories' advisory pages), `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/` and
`.github/PULL_REQUEST_TEMPLATE.md`.

GitHub metadata corrected with `gh repo edit`: description, topics, homepage.

### 3.3 Add — machine layer

| File | Holds |
|---|---|
| `AGENTS.md` | Authority rules (GitHub issues are status; never a markdown tracker), naming rules (`repo#N`, no invented code families), where to ground, what not to touch (`_bmad/` is vendored, `bmad-*` skills are generated, ralph prompts may be mid-run) |
| `static/llms.txt` | llmstxt.org format, served at the site root |
| `static/workspace.yml` | Local directory ↔ GitHub name mapping, package identities, track → repository → tracking issue |
| front-matter | `title`, `description`, `status`, `last_verified` on every doc — four keys, kept minimal because GitHub renders front-matter as a table above the content |

The manifest is a **mirror, not a source**. Rendering prose from it needs template syntax in
the markdown, which shows raw on github.com — half the audience. Prose stays authoritative;
the manifest carries its own verification date.

### 3.4 Move

`_bmad-output/planning-artifacts/research/` → `docs/research/` — seven governed-brain research
documents, the most publication-worthy material in the repository, currently outside the
publishable tree. Five referring files are updated.

**Not moved:** `_bmad-output/implementation-artifacts/status.md`. Ten files reference it,
including `.claude/skills/ralph-status/SKILL.md` and `run-next-task.md`, which open PR #118 is
editing. The remaining 21 cross-tree links become absolute GitHub URLs, which resolve
identically on github.com and on the site.

---

## 4. The site

### 4.1 Stack

Docusaurus 3.10.2 with `preset-classic`, TypeScript config, React 19, Node 26, deployed by a
Pages workflow — the same stack and deployment shape as `personal-blog`, so the two read as
siblings. `blog: false`; this is a documentation site.

Template cruft present in `personal-blog` is not copied: no `editUrl` pointing at
`facebook/docusaurus`, no placeholder social card.

### 4.2 Required configuration

| Setting | Why |
|---|---|
| `markdown: { format: 'detect' }` | `.md` parses as CommonMark, `.mdx` as MDX. Without it the six brace-carrying files and 35 `<br>` tags in §1.4 fail the build |
| `markdown: { mermaid: true }` + `@docusaurus/theme-mermaid` | 13 diagrams across 5 documents currently render as code blocks |
| `onBrokenLinks: 'throw'` | Build-time link checking. This is the publish step failing loudly, not a separate gate — it is what would have caught the dead `canonical-identity.md` reference |

### 4.3 Sidebar

Explicit, not autogenerated — it mirrors how `docs/index.md` already groups the material:
**Program · How work gets done · Identity domain · Governed brain · Parked ideas**.

### 4.4 Appearance

A distinct palette from `identity-model`'s indigo docs: the deep green already used in the
roadmap diagram (`#2d6a4f`) as primary, so the family reads as related rather than cloned.
Inter for text, JetBrains Mono for code. Light and dark with `respectPrefersColorScheme`. A
landing page with a card per track, and a per-page "last verified" stamp rendered from
front-matter.

---

## 5. Delivery

Three stacked pull requests, merged bottom-up. None of them touch
`_bmad-output/implementation-artifacts/ralph-prompts/`, where PRs #118, #119 and #120 are
open.

| # | Branch | Contents |
|---|---|---|
| 1 | `docs/front-door-and-agent-instructions` | This design document, `README.md`, `AGENTS.md`, `CLAUDE.md`, community health files, `.github/` templates, repository metadata |
| 2 | `docs/docusaurus-site` | `package.json`, `docusaurus.config.ts`, `sidebars.ts`, `src/`, `static/`, deploy workflow, front-matter, link fixes, the `research/` move, `.gitignore` |
| 3 | `docs/machine-readable-layer` | `llms.txt`, `workspace.yml`, and their wiring into README, AGENTS and the site |

---

## 6. Scope boundaries

- **No CI gate.** A `deploy.yml` publishes the site; nothing lints, blocks, or scores a pull
  request. `onBrokenLinks: 'throw'` fails the publish, not the merge.
- **`ralph-prompts/` is untouched**, and so is `status.md`.
- **`_bmad/` is vendored** and not edited.
- **Content is not rewritten.** The 23 documents in `docs/` were re-grounded the day before;
  this change adds front-matter and fixes links, and does not re-argue their substance.
- **`oss-admin` is not modified.** That this repository has no Terraform root is a real gap in
  the governance story, recorded here and left for its own change.

---

## 7. How this gets verified

1. `npm run build` succeeds with `onBrokenLinks: 'throw'` — every internal link resolves and
   every document parses.
2. All 13 Mermaid diagrams render as diagrams; spot-checked in `npm run serve`.
3. Every `docs/**/*.md` file has the four front-matter keys.
4. No file under `_bmad-output/implementation-artifacts/ralph-prompts/` appears in any diff.
5. `README.md` contains no version string and no PRD reference.
6. `gh repo view` shows the corrected description, topics, and homepage.
