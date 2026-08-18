---
workflowType: 'epic'
project_name: 'py-identity-model'
epic_id: 'CONS-1'
epic_title: 'Merge identity-model in & Collapse Duplicated Test Infrastructure'
date: '2026-08-17'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-0a-monorepo-setup.md
  - docs/identity-model-reconciliation-2026-08-12.md
---

# Epic CONS-1: Merge identity-model in & Collapse Duplicated Test Infrastructure

## Overview

This is **step 1** of the polyglot consolidation (see `sprint-change-proposal-2026-08-17.md`). It brings the `jamescrowley321/identity-model` Go and Rust implementations, plus its neutral conformance `spec/`, **into** the surviving `py-identity-model` repository, and collapses the two duplicated test-harness/fixture stacks into one.

**Guardrail for this epic:** the Python implementation **stays where it is** (root `src/`, `conformance/`, `test-fixtures/`) and its PyPI publishing is **not touched**. The `/py` relocation and `moon` come in CONS-2. Landing Go/Rust/spec alongside the untouched Python core keeps each PR small and keeps the certified release path green throughout.

**Migration mechanic:** `identity-model` has 0 tags and was never released — its git history is expendable — so its tree is brought in as **ordinary new-file commits** (no `git filter-repo`/subtree). Reusable acceptance criteria from superseded `epic-0a` stories 0A.4 (shared node-oidc-provider infra) and 0A.5 (authz-code automation) are carried forward here.

## Target state after this epic

```
py-identity-model/
├── src/            # Python core — UNCHANGED (still publishes as today)
├── conformance/    # PIM OIDF-cert harness — UNCHANGED
├── go/             # NEW — from identity-model; module github.com/jamescrowley321/py-identity-model/go
├── rust/           # NEW — from identity-model; crate rs-identity-model
├── spec/           # NEW — neutral conformance vectors (single source of truth)
└── infra/          # NEW — merged IdP fixtures (was test-fixtures/ + identity-model/infra/)
```

## Stories

---

### Story CONS-1.1 — Import identity-model Go into `/go`

**User Story**

> As a maintainer of py-identity-model,
> I want the `identity-model` Go implementation brought into a top-level `/go` directory that builds and tests in place,
> so that the Go binding lives in the surviving repo without disturbing the Python core or its release path.

**Description**

Copy the `identity-model/go/` tree into `py-identity-model/go/` as a normal commit (IM history expendable). Set the module path to `github.com/jamescrowley321/py-identity-model/go` (the interim path until the CONS-3 rename). Update internal import paths, `go.mod`, and any relative references. Document the module-path change in `go/README.md` + `CHANGELOG`.

**Acceptance Criteria**

- **AC-CONS-1.1.1** Given the imported tree, when `go build ./...` is run in `/go`, then it compiles with no errors.
- **AC-CONS-1.1.2** Given the imported tree, when `go test ./...` is run in `/go`, then every test that passed in `identity-model` passes here.
- **AC-CONS-1.1.3** Given `go/go.mod`, when reviewed, then the module path is `github.com/jamescrowley321/py-identity-model/go` and `go vet ./...` is clean.
- **AC-CONS-1.1.4** Given the Python core at root, when its unit + integration suites run after the import, then they are unaffected (no path collisions, no CI trigger changes for Python).
- **AC-CONS-1.1.5** Given `go/README.md` + `CHANGELOG`, when reviewed, then the module-path change and its provenance (imported from `jamescrowley321/identity-model`) are documented.

---

### Story CONS-1.2 — Import identity-model Rust into `/rust`

**User Story**

> As a maintainer of py-identity-model,
> I want the `identity-model` Rust implementation brought into a top-level `/rust` directory that tests in place,
> so that the Rust binding lives in the surviving repo unchanged in behavior.

**Description**

Copy `identity-model/rust/` into `py-identity-model/rust/`, preserving the crate name `rs-identity-model` and its `Cargo.toml`/`deny.toml`. Update any workspace/path references. Rust crate identity is independent of repo path, so no rename is required at this step.

**Acceptance Criteria**

- **AC-CONS-1.2.1** Given the imported crate, when `cargo test` is run in `/rust`, then all tests pass.
- **AC-CONS-1.2.2** Given the imported crate, when `cargo build --release` is run, then it compiles clean; `cargo clippy` produces no new warnings beyond the source repo's baseline.
- **AC-CONS-1.2.3** Given `rust/Cargo.toml`, when reviewed, then the crate name remains `rs-identity-model` and `cargo deny check` passes.
- **AC-CONS-1.2.4** Given `cargo-audit`/`deny`, when run in CI for `/rust`, then no advisories are introduced by the import.

---

### Story CONS-1.3 — Import the neutral conformance `spec/`

**User Story**

> As a maintainer of the polyglot conformance suite,
> I want `identity-model`'s language-neutral conformance `spec/` (vectors + expected outcomes keyed on canonical error codes) brought into `/spec`,
> so that there is a single source of conformance truth all languages execute against.

**Description**

Import `identity-model/spec/` (and any `spec/conformance` contract) into `py-identity-model/spec/`. Preserve the vector schema: inputs + expected outcomes expressed with **canonical error codes**, not per-language type names. Confirm the Go/Rust executors imported in CONS-1.1/1.2 resolve against the relocated `/spec` paths.

**Acceptance Criteria**

- **AC-CONS-1.3.1** Given `/spec`, when its vector index is enumerated, then every vector id from `identity-model/spec` is present with unchanged expected outcomes.
- **AC-CONS-1.3.2** Given the Go and Rust executors, when they run against `/spec`, then they pass the same vector set they passed in `identity-model`.
- **AC-CONS-1.3.3** Given the vector schema, when reviewed, then outcomes are keyed on canonical error codes (language-neutral), enabling a Python executor to bind in CONS-1.5.

---

### Story CONS-1.4 — Consolidate duplicated IdP fixtures into one `/infra`

**User Story**

> As a developer running integration/conformance tests in any language,
> I want the two duplicated IdP fixture stacks (PIM `test-fixtures/` and `identity-model/infra/`) merged into a single shared `/infra` set,
> so that all languages test against the same providers and the duplication is eliminated.

**Description**

Merge PIM's `test-fixtures/{node-oidc-provider,keycloak}` (+ Descope/Ory profiles) and `identity-model/infra/{node-oidc-provider,identityserver}` into one `/infra` with a single `docker-compose.yml`, deduplicated provider configs, pre-registered clients (client-credentials, authz-code+PKCE, public+PKCE), configurable claims, and health checks. Carries forward `epic-0a` AC-0A.4.* and AC-0A.5.* (authz-code automation). Point both the Python (root) and Go/Rust integration suites at `/infra`. Remove the now-redundant fixture copies once parity is proven.

**Acceptance Criteria**

- **AC-CONS-1.4.1** Given `/infra/docker-compose.yml`, when `docker compose up` runs, then a node-oidc-provider answers discovery at its issuer within 30s and a health check gates test start.
- **AC-CONS-1.4.2** Given the merged provider config, when reviewed, then it pre-registers at least: a client-credentials client, an authz-code+PKCE client, and a public+PKCE client; and supports configurable custom claims.
- **AC-CONS-1.4.3** Given the Python integration suite, when run against `/infra` (instead of `test-fixtures/`), then it passes with no behavioral change.
- **AC-CONS-1.4.4** Given the Go and Rust integration suites, when run against `/infra`, then they pass.
- **AC-CONS-1.4.5** Given an authz-code+PKCE flow, when executed in CI with no browser interaction, then it completes end-to-end (carried from 0A.5) for every language runner.
- **AC-CONS-1.4.6** Given the merge is complete, when the repo is searched, then no duplicated fixture stack remains (old `test-fixtures/` + `identity-model/infra/` copies removed), and `docker compose config` validates.

---

### Story CONS-1.5 — Bind the Python executor to `/spec` + enforce the coverage gate

**User Story**

> As a maintainer of the conformance suite,
> I want PIM's Python conformance to execute the shared `/spec` vectors through a thin executor, gated so every language runs every vector id,
> so that the "build conformance vectors once" constraint holds and no language silently skips coverage.

**Description**

Add a thin Python executor (in `src/tests/` today; relocates with `/py` in CONS-2) that maps each `/spec` vector to PIM's API + canonical error codes. Add a **coverage gate**: CI fails if any language executor does not execute every vector id in `/spec`. This is distinct from PIM's external black-box OIDF-cert `conformance/` harness, which remains untouched.

**Acceptance Criteria**

- **AC-CONS-1.5.1** Given the Python executor, when it runs against `/spec`, then it executes every vector id and maps each to a canonical outcome.
- **AC-CONS-1.5.2** Given the coverage gate, when any language executor omits a vector id present in `/spec`, then CI fails with a report naming the missing (language, vector-id) pairs.
- **AC-CONS-1.5.3** Given all three executors green, when the gate runs, then it reports 100% vector coverage per language.
- **AC-CONS-1.5.4** Given PIM's OIDF-cert `conformance/` harness, when reviewed, then it is unchanged and still runs independently.

---

## Dependencies

| Story | Depends On |
|---|---|
| CONS-1.1 Import Go | — |
| CONS-1.2 Import Rust | — |
| CONS-1.3 Import spec | CONS-1.1, CONS-1.2 (executors resolve against `/spec`) |
| CONS-1.4 Consolidate fixtures | CONS-1.1, CONS-1.2 |
| CONS-1.5 Python executor + coverage gate | CONS-1.3, CONS-1.4 |

External: Docker + Docker Compose (CONS-1.4); Go 1.26+, Rust 1.97+ toolchains. No dependency on CONS-2/CONS-3. Python core + PyPI publishing remain untouched throughout this epic.
