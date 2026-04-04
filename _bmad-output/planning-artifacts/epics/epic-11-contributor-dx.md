---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '11'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 11: Contributor Developer Experience

**Goal:** Make the identity-model monorepo effortless to contribute to across all four language ports (Python, Node, Go, Rust) by providing a one-click dev environment, unified build orchestration, clear contribution guidelines, and automated code quality gates.

## Overview

A multi-language monorepo is only as healthy as its contributor onboarding. New contributors should go from zero to running all tests in under five minutes, with guardrails that prevent common mistakes before they reach review. This epic covers dev containers, build orchestration, documentation, and pre-commit hooks — the foundational DX layer that every other epic depends on.

---

### Story 11.1: Dev Container / Codespaces Configuration

As a **new contributor**,
I want to open the repo in GitHub Codespaces or VS Code Dev Containers and have all four language toolchains ready,
So that I can build, test, and debug any language port without manual environment setup.

**Scope:**

- `.devcontainer/devcontainer.json` with a multi-stage Dockerfile or features-based config:
  - Python 3.12+ with `pip`, `uv`, and `ruff`
  - Node 20+ with `npm` and `corepack` (for pnpm/yarn if needed)
  - Go 1.22+ with `golangci-lint`
  - Rust stable with `clippy` and `rustfmt`
- Docker-in-Docker feature enabled for test infrastructure (mock OIDC servers, integration containers)
- Pre-installed VS Code extensions: Python, ESLint, Go, rust-analyzer, EditorConfig, GitLens
- `postCreateCommand` runs `make setup` to bootstrap all language dependencies
- `.devcontainer/` includes `.env.example` for any required test configuration
- Codespace resource recommendation: 4-core minimum documented in devcontainer.json

**Acceptance Criteria:**

**Given** a contributor clicking "Open in Codespaces" on the repo
**When** the container finishes building
**Then** `make test` passes for all four languages without additional manual steps

**Given** a contributor opening the repo in VS Code with Dev Containers extension
**When** they select "Reopen in Container"
**Then** the container builds successfully and all recommended extensions are installed

**Given** the dev container environment
**When** a contributor runs integration tests requiring Docker (e.g., mock OIDC server)
**Then** Docker-in-Docker is available and containers can be started from within the Codespace

- [ ] **Unit test:** CI job builds the dev container image and asserts all four toolchains are at required versions (`python --version`, `node --version`, `go version`, `rustc --version`)
- [ ] **Integration test:** CI job launches the dev container, runs `make setup && make test`, and verifies exit code 0
- [ ] **Example:** `docs/dev-container-quickstart.md` — screenshot walkthrough of Codespaces launch to first passing test run

---

### Story 11.2: Makefile / Taskfile Orchestration

As a **contributor working across multiple language ports**,
I want a single set of root-level commands that build, test, and lint all languages uniformly,
So that I don't need to remember per-language tooling incantations.

**Scope:**

Root-level `Makefile` (or `Taskfile.yml` if the team prefers `task`) with these targets:

| Command | Behavior |
|---------|----------|
| `make setup` | Bootstrap all languages — install deps, build tools, generate code |
| `make test` | Run all language test suites in parallel; fail if any fail |
| `make test-python` | Run Python tests only (pytest) |
| `make test-node` | Run Node tests only (vitest/jest) |
| `make test-go` | Run Go tests only (go test) |
| `make test-rust` | Run Rust tests only (cargo test) |
| `make lint` | Run all linters in parallel (ruff, eslint, golangci-lint, clippy) |
| `make conformance` | Run cross-language conformance test suite |
| `make docs` | Build unified documentation site |
| `make clean` | Remove all build artifacts and caches |
| `make ci` | Full CI pipeline: lint + test + conformance (used by GitHub Actions) |

- Each language target delegates to the port's own build system (`pyproject.toml`, `package.json`, `go.mod`, `Cargo.toml`)
- Parallel execution where possible (GNU Make `-j` or Taskfile parallel groups)
- Colored output with clear per-language section headers
- Exit codes propagate correctly — any language failure fails the top-level target

**Acceptance Criteria:**

**Given** a fresh clone with all toolchains installed
**When** I run `make setup && make test`
**Then** all four language test suites run and report results

**Given** a Python test failure
**When** I run `make test`
**Then** the command exits non-zero and the output clearly identifies the failing language and test

**Given** I only changed Go code
**When** I run `make test-go`
**Then** only Go tests run, completing in seconds rather than running all languages

- [ ] **Unit test:** CI job runs each `make` target in isolation and verifies expected exit codes (pass and fail scenarios)
- [ ] **Integration test:** `make ci` runs the full pipeline on a commit touching all four languages and produces correct aggregate results
- [ ] **Example:** `make help` target that prints all available commands with one-line descriptions

---

### Story 11.3: CONTRIBUTING.md and Development Guide

As a **contributor adding a new capability to identity-model**,
I want clear documentation on the end-to-end process for multi-language changes,
So that I can ship a complete, spec-conformant feature across all ports without missing steps.

**Scope:**

- `CONTRIBUTING.md` at repo root covering:
  - Quick start (point to dev container or manual setup)
  - Repo structure overview (spec/, ports/, conformance/, examples/)
  - Step-by-step workflow for adding a new capability:
    1. Update or add conformance spec in `spec/`
    2. Write conformance test fixtures
    3. Implement in each language port
    4. Add per-language unit and integration tests
    5. Add usage examples in `examples/<language>/`
    6. Update docs
  - PR template (`.github/pull_request_template.md`) with checklist:
    - [ ] Spec updated
    - [ ] Conformance tests pass
    - [ ] All four language ports updated (or N/A justification)
    - [ ] Examples added/updated
    - [ ] No secrets or credentials in diff
  - Code review guidelines for security-sensitive identity code:
    - Cryptographic operations require two reviewers
    - No `alg=none` acceptance
    - Token parsing must reject ambiguous inputs
    - Timing-safe comparison for signature verification
    - Dependency additions require security justification
- `docs/development-guide.md` — deeper reference for architecture decisions, cross-language patterns, and conformance testing details

**Acceptance Criteria:**

**Given** a new contributor who has never worked on the repo
**When** they read CONTRIBUTING.md
**Then** they can identify the exact steps to add a new claim validation rule across all four languages

**Given** a contributor opening a pull request
**When** the PR template loads
**Then** it contains the full checklist with security-relevant items pre-populated

**Given** a PR that modifies JWT signature verification code
**When** a reviewer checks the code review guidelines
**Then** the guidelines specify two-reviewer requirement and timing-safe comparison enforcement

- [ ] **Unit test:** Linter validates CONTRIBUTING.md has all required sections (quick start, workflow, security guidelines); validates PR template contains required checklist items
- [ ] **Integration test:** CI job verifies PR template is correctly loaded by GitHub (`.github/pull_request_template.md` exists and is valid markdown)
- [ ] **Example:** Sample PR description showing a completed checklist for a feature that adds token introspection across all four languages

---

### Story 11.4: Pre-commit Hooks

As a **contributor committing code**,
I want automated pre-commit checks that catch linting errors, secrets, and spec violations before push,
So that CI feedback is instant and I don't waste review cycles on mechanical issues.

**Scope:**

- `.pre-commit-config.yaml` using the [pre-commit](https://pre-commit.com/) framework:
  - **Python:** `ruff check` and `ruff format --check`
  - **Node:** `eslint` via local hook
  - **Go:** `golangci-lint run` via local hook
  - **Rust:** `cargo clippy -- -D warnings` and `cargo fmt --check` via local hook
  - **Secret detection:** `gitleaks` hook — block commits containing tokens, private keys, or credentials
  - **Conventional commits:** `commitlint` or equivalent hook enforcing Angular convention (`feat:`, `fix:`, `docs:`, etc.)
  - **Conformance spec validation:** Custom hook that validates any changes to `spec/` YAML/JSON files against the spec schema
  - **Trailing whitespace / EOF fixer** and **large file check** (block files > 1 MB)
- Language-specific hooks only run on changed files in that language's directory (use `files:` filter)
- `make setup` installs pre-commit hooks automatically (`pre-commit install`)
- Hooks must complete in under 10 seconds for a typical single-language commit
- Escape hatch documented: `git commit --no-verify` for emergency use (with warning in CONTRIBUTING.md)

**Acceptance Criteria:**

**Given** a contributor who has run `make setup`
**When** they commit Python code with a ruff violation
**Then** the pre-commit hook blocks the commit and displays the ruff error with file and line number

**Given** a commit that contains a string matching a private key pattern
**When** the pre-commit hook runs gitleaks
**Then** the commit is blocked with a clear message identifying the secret and file location

**Given** a commit message "updated stuff"
**When** the conventional commit hook runs
**Then** the commit is rejected with guidance on the required format (e.g., `feat: add token introspection`)

**Given** a change to `spec/jwt-validation.yaml`
**When** the pre-commit hook runs the spec validator
**Then** the spec file is validated against the schema and any structural errors are reported

- [ ] **Unit test:** Each hook type is tested in isolation — pass a clean file and a dirty file, assert correct exit codes
- [ ] **Integration test:** End-to-end test: stage files with known violations across multiple languages, run `pre-commit run --all-files`, verify all expected hooks fire and report correctly
- [ ] **Example:** `.pre-commit-config.yaml` includes inline comments explaining each hook's purpose and configuration rationale
