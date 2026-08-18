---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'CONS-3'
epic_title: 'Rename Repo, Fix References, Retire identity-model & Reconcile Planning Docs'
date: '2026-08-17'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md
  - _bmad-output/planning-artifacts/epics/epic-cons2-reorg-publishing.md
  - _bmad-output/planning-artifacts/epics/epic-13-naming-versioning-strategy.md
  - docs/identity-model-reconciliation-2026-08-12.md
---

# Epic CONS-3: Rename Repo, Fix References, Retire identity-model & Reconcile Planning Docs

## Overview

**Step 3** — the finishing move, run only after CONS-2 proves publishing is green. Archive the now-empty `jamescrowley321/identity-model` repo (freeing the `identity-model` name), rename the surviving `py-identity-model` → `identity-model`, re-configure PyPI Trusted Publishing (OIDC is keyed to repo+workflow), fix every reference that hard-codes the old repo/module path, and reconcile the planning artifacts that still describe the pre-pivot direction.

**Key fact:** a GitHub repo rename does **not** change the PyPI *project* names (`py-identity-model`, `fastapi-identity-model`) — those are independent and stay. What the rename *does* require is re-configuring the **Trusted Publishing** publisher (it is keyed to the GitHub repo + workflow filename), plus updating URLs, badges, the Go module path, and crates metadata.

**Naming note:** final names are governed by `epic-13-naming-versioning-strategy.md`. This epic assumes the target repo name is `identity-model` (reusing the name freed by archiving the old Go/Rust repo) and package naming stays `{py,go,rs}-identity-model`.

## Stories

---

### Story CONS-3.1 — Archive `jamescrowley321/identity-model` (free the name)

**User Story**

> As the repo owner,
> I want the old Go/Rust `identity-model` repository archived read-only with a pointer to the surviving repo,
> so that its history is preserved, no one contributes to a dead repo, and the `identity-model` name is freed for the rename.

**Description**

Confirm all needed content is already merged (CONS-1). Add a final `README` to `identity-model` pointing to the surviving repo, then set the GitHub repo to **archived (read-only)**. This releases the `identity-model` name for reuse.

**Acceptance Criteria**

- **AC-CONS-3.1.1** Given CONS-1 merged, when `identity-model` is diffed against the imported `/go` `/rust` `/spec`, then no unmigrated content remains (or remaining items are explicitly listed as dropped).
- **AC-CONS-3.1.2** Given the old repo, when viewed, then its README points to the surviving repo and the repo is archived (read-only, no new issues/PRs).
- **AC-CONS-3.1.3** Given the archive, when checked, then the `identity-model` name is available for the rename in CONS-3.2.

---

### Story CONS-3.2 — Rename `py-identity-model` → `identity-model`

**User Story**

> As the repo owner,
> I want `jamescrowley321/py-identity-model` renamed to `identity-model`,
> so that the surviving monorepo carries the language-neutral name (GitHub auto-redirects the old URL).

**Description**

Rename the repo on GitHub (old URL 301-redirects). Update the repo description and any workspace docs / `gh repo set-default` references. Note the redirect in the top-level README for contributors with existing clones.

**Acceptance Criteria**

- **AC-CONS-3.2.1** Given the rename, when the old `.../py-identity-model` URL is visited, then GitHub redirects to `.../identity-model`.
- **AC-CONS-3.2.2** Given local clones, when a contributor follows the README, then remote-URL update guidance is provided.
- **AC-CONS-3.2.3** Given workspace tooling/docs, when reviewed, then references to the old repo name are updated (or intentionally left to the redirect with a note).

---

### Story CONS-3.3 — Re-configure PyPI Trusted Publishing

**User Story**

> As a release manager,
> I want PyPI Trusted Publishing re-configured for both projects after the rename,
> so that `py-identity-model` and `fastapi-identity-model` keep publishing via OIDC from the renamed repo.

**Description**

Update the Trusted Publisher config on PyPI for both `py-identity-model` and `fastapi-identity-model` to reference the renamed repo (`identity-model`) + the publishing workflow filename(s). PyPI *project names are unchanged*. Verify by publishing (or dry-running with a real OIDC exchange) after the rename.

**Acceptance Criteria**

- **AC-CONS-3.3.1** Given the renamed repo, when the Trusted Publisher settings for both projects are reviewed, then they reference `jamescrowley321/identity-model` + the correct workflow file(s).
- **AC-CONS-3.3.2** Given a post-rename release run, when it publishes via OIDC, then the token exchange succeeds and the artifact appears under the unchanged PyPI project names.
- **AC-CONS-3.3.3** Given the release, when inspected, then no manual/API-token fallback was required.

---

### Story CONS-3.4 — Fix all repo/module references

**User Story**

> As a maintainer,
> I want every hard-coded reference to the old repo name and Go module path updated,
> so that consumers, docs, and badges resolve correctly after the rename.

**Description**

Update: `project.urls` in `/py` pyproject(s); README badges/links; the Go module path `github.com/jamescrowley321/py-identity-model/go` → `github.com/jamescrowley321/identity-model/go` (and re-tag `go/vX.Y.Z` under the new path); Rust crate `repository`/metadata; mkdocs/site links; any CI references to the repo slug.

**Acceptance Criteria**

- **AC-CONS-3.4.1** Given `/go`, when the module path is updated to `.../identity-model/go` and re-tagged, then `go get github.com/jamescrowley321/identity-model/go@go/vX.Y.Z` resolves.
- **AC-CONS-3.4.2** Given `/rust/Cargo.toml`, when reviewed, then `repository`/homepage metadata point to the renamed repo.
- **AC-CONS-3.4.3** Given `/py` pyproject(s) + README, when reviewed, then `project.urls`, badges, and doc links resolve to the renamed repo.
- **AC-CONS-3.4.4** Given the repo, when grepped for the old module path / repo slug, then only intentional redirect notes remain.

---

### Story CONS-3.5 — Reconcile stale planning artifacts

**User Story**

> As the planning owner,
> I want the planning artifacts that still describe the pre-pivot direction updated to the delivered reality,
> so that the next session inherits an accurate plan (no contradictory documents).

**Description**

Rewrite to the delivered direction: `docs/roadmap.md` PRD 6 + Implementation Order (uv-workspace framing → moon; PIM-survives; rename-last), `docs/identity-model-reconciliation-2026-08-12.md` §6.1 (deferral → activated + direction), and `product-brief-identity-model-monorepo.md` (base repo, tooling, `/py` naming, `/node` reserved). Confirm `epic-0a` is superseded (done 2026-08-17). Repoint the ralph prompts (`identity-model-publishing.md`, root `PROMPT.md`) to the new paths/name. Update `task-queue.md` (T170 note) + `sprint-plan.md`.

**Acceptance Criteria**

- **AC-CONS-3.5.1** Given `roadmap.md`, `reconciliation §6.1`, and the product brief, when reviewed, then each describes the delivered direction (moon, PIM-survives, `/py /go /rust`, `/node` reserved, rename-last) with no residual "deferred / PIM→python/ / uv-workspace-at-root" framing.
- **AC-CONS-3.5.2** Given `ralph-prompts/identity-model-publishing.md` + `PROMPT.md`, when reviewed, then they reference the surviving repo, `/py|/go|/rust` paths, and the `py-v`/`go/v`/`rust-v` tag scheme.
- **AC-CONS-3.5.3** Given `task-queue.md` + `sprint-plan.md`, when reviewed, then CONS-1/2/3 are recorded complete and T170's root-workspace note reflects the moon supersession.
- **AC-CONS-3.5.4** Given a repo-wide search, when run, then no planning artifact still asserts the pre-pivot direction as current.

---

## Dependencies

| Story | Depends On |
|---|---|
| CONS-3.1 Archive old identity-model | CONS-1 complete |
| CONS-3.2 Rename repo | CONS-3.1, CONS-2 complete (publishing green) |
| CONS-3.3 PyPI Trusted Publishing | CONS-3.2 |
| CONS-3.4 Fix references | CONS-3.2 |
| CONS-3.5 Reconcile planning docs | CONS-3.2 |

External: GitHub repo admin (archive + rename), PyPI Trusted Publisher admin, `epic-13-naming-versioning-strategy.md` resolved. This epic runs last; nothing depends on it.
