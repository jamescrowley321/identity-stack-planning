---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'CONS-2'
epic_title: 'Reorg to /py|/go|/rust, moon Orchestration & Keep Publishing Green'
date: '2026-08-17'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md
  - _bmad-output/planning-artifacts/epics/epic-cons1-im-merge-testinfra.md
  - _bmad-output/planning-artifacts/epics/epic-13-naming-versioning-strategy.md
---

# Epic CONS-2: Reorg to `/py|/go|/rust`, moon Orchestration & Keep Publishing Green

> **Implementation reconcile 2026-08-19 (verified against py-identity-model `origin/main` after the CONS-1 stack).** Read before starting — these correct stale assumptions in the stories below and in the design-of-record:
>
> - **Seed tag is `py-v3.11.1`, NOT `py-v3.10.0`.** `pyproject.toml:project.version` is now **3.11.1** (the plan/handoff predates several releases). CONS-2.2 must seed `py-v3.11.1` at current HEAD, and its dry-run AC (2.2.1) computes from that.
> - **`tools/release_parsers.py` path gotcha.** BOTH semantic-release configs reference the parser by a **repo-root-relative** path: core `pyproject.toml` → `commit_parser = "tools/release_parsers.py:CoreCommitParser"`; `packages/fastapi-identity-model/pyproject.toml` → `"tools/release_parsers.py:FastapiCommitParser"`. `version_toml` is likewise root-relative (`"pyproject.toml:project.version"`, `"packages/fastapi-identity-model/pyproject.toml:project.version"`). When `pyproject.toml`/`packages/` move under `/py`, either move `tools/` under `/py` too, or update every parser + version_toml path. Getting this wrong silently breaks commit routing (the load-bearing `(fastapi)`-scope split).
> - **Movable Python tree (git mv → `/py`):** `src/`, `packages/`, `pyproject.toml`, `uv.lock`, and `tools/` (see above). **`examples/` is mixed** — `examples/fastapi` + `examples/descope` are uv-workspace members (Python) but `examples/` also holds the non-Python Duende IdentityServer example stack + `run-tests.sh` (driven by `make test-examples`, ports 5000/5001, separate from `/infra`). Decide per-subdir; do not blindly move all of `examples/`.
> - **Root uv workspace members** = `[".", "packages/fastapi-identity-model", "examples/fastapi", "examples/descope"]` → becomes `/py/pyproject.toml`-owned; member paths re-relative to `/py`.
> - **release.yml**: job `release` uses the `python-semantic-release@v10.6.1` action (root pyproject config) + a `uv lock` sync step + `publish-action`; job `release-fastapi-version` runs `uvx --from python-semantic-release==10.6.1 semantic-release -c packages/fastapi-identity-model/pyproject.toml version`. Both need `/py`-relative config paths after the move. `2` workflows key caches on `hashFiles('uv.lock')` → `hashFiles('py/uv.lock')`.
> - **CI already re-pointed by CONS-1.4**: `ci.yml` fixture jobs use `infra/docker-compose.yml`; the new `integration-tests-go`/`-rust` + `spec-vector-coverage` jobs exist. CONS-2.1 must keep those green from the new paths.
> - **conformance/** scripts use `uv run` (cwd-sensitive) and docs reference `src/py_identity_model/` — update after the move (AC-CONS-2.5.2 keeps the OIDF harness working).

## Overview

**Step 2** of the consolidation. With Go/Rust/spec/infra landed (CONS-1), this epic performs the **in-place reorg**: relocate the Python core into `/py`, drop the root `uv` workspace, introduce **`moon`** as the polyglot orchestrator, change the tag scheme, and add Go/Rust release pipelines — all while proving PIM **publishes exactly as it does today**.

**Non-negotiable:** at the end of this epic, a Python release from `/py` produces byte-for-byte the same `py-identity-model` + `fastapi-identity-model` artifacts as before, and the OIDF conformance workflows are unaffected. The repo rename is deferred to CONS-3.

`moon` was validated by a Py+Go+Rust spike (moon 2.5.1): `moon run :test` orchestrates all three, content-hash caching + selective re-run work, and `moon ci --base <ref>` does git-diff affected-detection. `moon` uses `toolchain: 'system'` tasks that shell out to `uv`/`go`/`cargo` — it orchestrates, it does not replace native publishing.

## Target state after this epic

```
py-identity-model/                # not yet renamed
├── py/       # Python core relocated from root; owns uv + semantic-release; NO root workspace
├── go/  rust/  spec/  infra/  conformance/
├── node/     # RESERVED scaffold (dir + stub + moon project), no code, not released
└── .moon/    # workspace + toolchain; moon.yml per project
```

## Stories

---

### Story CONS-2.1 — Relocate the Python core into `/py`

**User Story**

> As a maintainer,
> I want the Python implementation (src, tests, conformance, `packages/fastapi-identity-model`, `pyproject.toml`, `uv.lock`) moved into `/py` via `git mv` so history is preserved,
> so that Python is one peer of the polyglot layout with no root `uv` workspace.

**Description**

`git mv` the Python tree into `/py` (same-repo move → `git log --follow`/`blame` intact). Remove the root `uv` workspace `members` config; `/py/pyproject.toml` owns the workspace/packages locally. Update every internal path: CI working-dirs/trigger filters, `mkdocs`, `Makefile` targets, doc links, relative test paths. Relocate the Python conformance executor from CONS-1.5 alongside `/py`.

**Acceptance Criteria**

- **AC-CONS-2.1.1** Given the relocation, when `git log --follow py/src/py_identity_model/discovery.py` is run, then full history is preserved back to the original repo.
- **AC-CONS-2.1.2** Given `/py`, when `uv sync && uv run pytest` runs from `/py`, then the full unit+integration suite passes.
- **AC-CONS-2.1.3** Given the root, when reviewed, then no root-level `uv` workspace `members` remains; `/py/pyproject.toml` defines the Python package(s) and `packages/fastapi-identity-model` member.
- **AC-CONS-2.1.4** Given all CI/docs/Makefile references, when reviewed, then every path reflects the `/py` prefix (no stale root paths).

---

### Story CONS-2.2 — Re-point semantic-release at `/py` + change tag scheme (seed `py-v3.10.0`)

**User Story**

> As a release manager,
> I want `python-semantic-release` re-pointed at `/py`, its `tag_format` changed from bare `{version}` to `py-v{version}`, the current release seeded as `py-v3.10.0`, and releases path-guarded,
> so that Python keeps publishing exactly as today while Go/Rust commits never trigger a PyPI release.

**Description**

Update `python-semantic-release` config for the `/py` root and both members. Change `tag_format` to `py-v{version}`. **Manually seed a `py-v3.10.0` tag** at the current release commit so semantic-release finds its "last release" under the new format (owner has approved manual seeding). Add path-ignore guards to the release workflow so commits touching only `go/**`, `rust/**`, `spec/**`, `infra/**`, `node/**` do not cut a PyPI release (extending the existing `(fastapi)`-scope exclusion by path).

**Acceptance Criteria**

- **AC-CONS-2.2.1** Given the seeded `py-v3.10.0` tag and a `feat`/`fix` commit under `/py`, when semantic-release runs in dry-run, then it computes the correct next version (`py-v3.10.1`/`py-v3.11.0`) from the new tag format.
- **AC-CONS-2.2.2** Given a commit touching only `go/**` (or `rust/**`/`spec/**`/`infra/**`), when the Python release workflow evaluates, then no PyPI release is produced.
- **AC-CONS-2.2.3** Given the `(fastapi)`-scoped sub-package, when a `(fastapi)` commit lands, then it releases `fastapi-identity-model` via its own config exactly as before.
- **AC-CONS-2.2.4** Given a dry-run publish, when the built wheel/sdist are inspected, then the package names, metadata, and contents match the current `py-identity-model` release.

---

### Story CONS-2.3 — Introduce `moon` orchestration (+ reserve `/node` scaffold)

**User Story**

> As a contributor,
> I want a `moon` workspace with per-project tasks delegating to `uv`/`go`/`cargo`, plus a reserved `/node` scaffold,
> so that build/test/lint across languages is orchestrated with caching and affected-detection while native toolchains stay in charge.

**Description**

Add `.moon/workspace.yml` (project map `py/go/rust/node`), `.moon/toolchain.yml`, and a `moon.yml` per project with `toolchain: 'system'` tasks (`test`, `lint`, `build`) shelling out to native tools. Apply the two spike gotchas: **gitignore `.moon/cache/`** and **tighten Python task `inputs` to `src/**/*.py`** (+ gitignore `__pycache__`/`*.pyc`). Reserve `/node`: create the dir with a `package.json` stub (`@identity-model/node`), a `README.md` marking it planned, a `.gitkeep`, and a `moon.yml` project stub with no active tasks — **no code, not part of any release**.

**Acceptance Criteria**

- **AC-CONS-2.3.1** Given the workspace, when `moon run :test` is run, then py/go/rust test tasks execute in parallel and pass; `/node` has no active task.
- **AC-CONS-2.3.2** Given an unchanged tree, when `moon run :test` is re-run, then all tasks are served from cache.
- **AC-CONS-2.3.3** Given a change under `/rust` only, when `moon ci --base <ref>` runs, then only `rust:test` is reported affected and re-run.
- **AC-CONS-2.3.4** Given `.gitignore`, when reviewed, then `.moon/cache/` and Python `__pycache__`/`*.pyc` are ignored; Python task `inputs` are scoped to `src/**/*.py`.
- **AC-CONS-2.3.5** Given `/node`, when reviewed, then it contains only a scaffold (stub `package.json` `@identity-model/node`, README "planned", `.gitkeep`, `moon.yml` stub) and is excluded from all release workflows.

---

### Story CONS-2.4 — Go + Rust release pipelines & change-detected CI

**User Story**

> As a release manager,
> I want independent, path-filtered Go (GoReleaser, `go/vX.Y.Z`) and Rust (cargo-release, `rust-vX.Y.Z`) release pipelines and change-detected CI,
> so that each language versions and ships on its own cadence and CI only runs affected languages.

**Description**

Add a GoReleaser workflow tagging `go/vX.Y.Z` (subdir-module format is **required** for `go get`), path-filtered to `go/**`; add a cargo-release → crates.io workflow tagging `rust-vX.Y.Z`, path-filtered to `rust/**`. First versions are greenfield `0.0.x`. Drive CI change-detection via `moon ci --base` (or `dorny/paths-filter`), bringing the `/infra` IdP fixture matrix up once and sharing it across suites.

**Acceptance Criteria**

- **AC-CONS-2.4.1** Given a `go/**` change with a release trigger, when the Go pipeline runs, then it produces a `go/vX.Y.Z` tag and module consumers can `go get github.com/jamescrowley321/py-identity-model/go@go/vX.Y.Z`.
- **AC-CONS-2.4.2** Given a `rust/**` change with a release trigger, when the Rust pipeline runs, then it publishes `rs-identity-model` to crates.io and tags `rust-vX.Y.Z`.
- **AC-CONS-2.4.3** Given a push touching only one language, when CI evaluates, then only that language's suite runs; touching `spec/**` or `infra/**` runs all languages.
- **AC-CONS-2.4.4** Given the CI run, when the IdP fixture matrix is inspected, then it is started once and shared across language suites.

---

### Story CONS-2.5 — Publishing parity verification (gate)

**User Story**

> As the repo owner,
> I want a verification gate proving the reorg did not change Python publishing before CONS-3 begins,
> so that the rename proceeds only on a known-good release path.

**Description**

Run a full dry-run Python release from `/py` and compare the produced artifacts + metadata against the last real `py-identity-model` and `fastapi-identity-model` releases. Confirm the OIDF `conformance` and hosted-conformance workflows still run and are unaffected. Capture the evidence in the CONS-2 PR.

**Acceptance Criteria**

- **AC-CONS-2.5.1** Given a dry-run release, when artifacts are diffed against the current PyPI release, then package name/metadata/contents match (only the version + tag prefix differ).
- **AC-CONS-2.5.2** Given the OIDF `conformance` + `conformance-hosted` workflows, when triggered post-reorg, then they run unchanged.
- **AC-CONS-2.5.3** Given the CONS-2 PR, when reviewed, then it links the dry-run evidence and the `moon`/CI affected-detection output.

---

## Dependencies

| Story | Depends On |
|---|---|
| CONS-2.1 Relocate → /py | CONS-1 complete |
| CONS-2.2 semantic-release + tags | CONS-2.1 |
| CONS-2.3 moon + /node reserve | CONS-2.1 |
| CONS-2.4 Go/Rust release + CI | CONS-2.3 |
| CONS-2.5 Publishing parity gate | CONS-2.2, CONS-2.4 |

External: `moon` (`.moon/toolchain.yml` pins versions), GoReleaser, cargo-release/crates.io token, PyPI Trusted Publishing (unchanged this epic). Blocks CONS-3.
