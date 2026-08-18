<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: epic, consolidation, build, release
-->
# Title
CONS-2: Reorg to /py|/go|/rust, moon orchestration & keep publishing green

# Body
**Epic CONS-2 — step 2.** Relocate the Python core into `/py`, drop the root `uv` workspace, add `moon` orchestration, change the tag scheme, and add Go/Rust release pipelines — proving Python publishes **exactly as today** before the rename.

- Epic doc: `identity-stack-planning` → `_bmad-output/planning-artifacts/epics/epic-cons2-reorg-publishing.md`
- moon validated by spike (moon 2.5.1: caching + selective re-run + `moon ci` affected-detection).
- Parent: #<meta> · depends on #<cons1>

## Stories
- [ ] **CONS-2.1** Relocate Python core → `/py` via `git mv` (history preserved); remove root uv workspace
- [ ] **CONS-2.2** Re-point `python-semantic-release` at `/py`; `tag_format` → `py-v{version}`; **seed `py-v3.10.0`**; path-guard releases
- [ ] **CONS-2.3** Add `moon` workspace + per-project tasks (gitignore `.moon/cache`, tighten Python inputs); **reserve `/node` scaffold** (no code)
- [ ] **CONS-2.4** Go (GoReleaser, `go/vX.Y.Z`) + Rust (cargo-release, `rust-vX.Y.Z`) release pipelines + change-detected CI
- [ ] **CONS-2.5** Publishing-parity gate — dry-run proves artifacts == today; OIDF workflows unaffected

## Definition of done
- `moon run :test` orchestrates py/go/rust; `moon ci` runs affected-only; caches on re-run.
- A `go/**`/`rust/**`/`spec/**`/`infra/**` commit never cuts a PyPI release; `(fastapi)` sub-package unaffected.
- Dry-run Python release from `/py` matches current `py-identity-model` + `fastapi-identity-model` (only version/tag prefix differ).
- `/node` is a reserved scaffold only.

## Dependencies
Depends on CONS-1. Blocks CONS-3. External: moon, GoReleaser, cargo-release/crates.io token.
