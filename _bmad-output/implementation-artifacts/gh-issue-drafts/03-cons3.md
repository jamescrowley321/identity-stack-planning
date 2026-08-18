<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: epic, consolidation, release
-->
# Title
CONS-3: Rename repo, fix references, retire identity-model & reconcile planning docs

# Body
**Epic CONS-3 — step 3, runs last.** Archive the old `identity-model` repo (freeing the name), rename `py-identity-model` → `identity-model`, re-configure PyPI Trusted Publishing, fix every hard-coded reference, and reconcile the stale planning artifacts.

- Epic doc: `identity-stack-planning` → `_bmad-output/planning-artifacts/epics/epic-cons3-rename-retire.md`
- Final names governed by `epic-13-naming-versioning-strategy.md`.
- Parent: #<meta> · depends on #<cons2> (publishing proven green)

## Stories
- [ ] **CONS-3.1** Archive `jamescrowley321/identity-model` read-only (pointer README); free the name
- [ ] **CONS-3.2** Rename `py-identity-model` → `identity-model` (GitHub 301 redirect)
- [ ] **CONS-3.3** Re-configure PyPI Trusted Publishing (OIDC keyed to repo+workflow) for both projects; verify publish
- [ ] **CONS-3.4** Fix references: `project.urls`, badges, Go module path (→ `.../identity-model/go`, re-tag), crates metadata
- [ ] **CONS-3.5** Reconcile stale planning artifacts (roadmap PRD 6, reconciliation §6.1, product brief, ralph prompts, task-queue/sprint-plan)

## Definition of done
- Old repo archived with pointer; new repo name live with redirect.
- PyPI project names unchanged; Trusted Publishing works from renamed repo with no token fallback.
- No stale module path / repo slug remains except intentional redirect notes.
- No planning artifact still asserts the pre-pivot direction as current.

## Dependencies
Depends on CONS-1 (archive) + CONS-2 (rename after publishing green). Runs last; nothing depends on it. External: GitHub admin, PyPI admin.
