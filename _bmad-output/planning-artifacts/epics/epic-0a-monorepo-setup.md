---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: 'EPIC-0A'
epic_title: 'Monorepo Setup'
date: '2026-04-04'
status: 'draft'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 0A: Monorepo Setup

## Overview

This epic covers the infrastructure work required to transform the existing `py-identity-model` repository into the `identity-model` multi-language monorepo. It includes relocating the Python implementation while preserving full git history, scaffolding the directory structure for all target languages, establishing CI/CD pipelines that scale across languages, and setting up shared test infrastructure using node-oidc-provider.

These stories are prerequisites for all language-specific implementation epics (Epics 1-5). Nothing ships to end users from this epic — it creates the foundation that all subsequent work builds on.

## Target Repository Structure

```
identity-model/
├── python/               # py-identity-model (relocated, history preserved)
├── node/                 # Scaffolded
├── go/                   # Scaffolded
├── rust/                 # Scaffolded
├── spec/                 # Cross-language specification (Epic 0B output)
├── infra/                # Shared test infrastructure (docker-compose)
├── docs/                 # Cross-language documentation
├── .github/workflows/    # Monorepo CI matrix
└── README.md
```

## Stories

> **Note:** Package and repository names used throughout this epic (e.g., `identity-model`, `@identity-model/node`) are provisional. Final names depend on the outcome of [Epic 13 — Naming, Versioning & Package Identity Strategy](epic-13-naming-versioning-strategy.md), which must be resolved before this epic begins.

---

### Story 0A.1 — Restructure py-identity-model into identity-model/python/

**User Story**

> As a maintainer of the identity-model project,
> I want to relocate the existing py-identity-model codebase into the `python/` subdirectory of a new `identity-model` monorepo while preserving every commit in git history,
> so that the Python implementation has full provenance and `git log` / `git blame` continue to work for all relocated files.

**Description**

Use `git filter-repo` (preferred) or `git subtree` to move the entire py-identity-model repository contents into a `python/` subdirectory while rewriting history so that every historical commit reflects the new path. After relocation, update all internal references: `pyproject.toml` source paths, CI workflow paths, import paths in documentation, and any relative path references in tests or examples. Verify that the PyPI package (`py-identity-model`) still builds, installs, and passes its full test suite from the new `python/` location.

**Acceptance Criteria**

- **AC-0A.1.1** Given the restructured repository, when `git log --follow python/src/py_identity_model/discovery.py` is run, then the full commit history for that file is visible back to the original repository's first commit.
- **AC-0A.1.2** Given the restructured repository, when `git blame python/src/py_identity_model/token_validation.py` is run, then all blame annotations reference the correct original authors and commit hashes.
- **AC-0A.1.3** Given the relocated `pyproject.toml` at `python/pyproject.toml`, when `pip install -e python/` is run from the repository root, then the package installs successfully with all dependencies resolved.
- **AC-0A.1.4** Given the relocated project, when `pytest python/tests/` is run, then the entire existing test suite passes with no failures attributable to the relocation.
- **AC-0A.1.5** Given the relocated project, when `python -m build` is run from `python/`, then a valid sdist and wheel are produced that match the existing PyPI package name (`py-identity-model`) and can be installed from the built artifacts.
- **AC-0A.1.6** Given the relocated project, when all CI workflow file references are reviewed, then every path (trigger filters, working directories, artifact paths) has been updated to reflect the `python/` prefix.
- **AC-0A.1.7** Given the relocated project, when all relative path references in README, examples, and documentation are reviewed, then none point to stale pre-relocation paths.

**Unit Tests**

- Existing py-identity-model unit tests pass without modification to test logic (only path adjustments if needed).
- A smoke test script verifies that `from py_identity_model import discover` works after editable install from the new location.

**Integration Tests**

- The full existing integration test suite passes from the `python/` directory.
- `pip install` from the built wheel produces a working installation that passes import checks.

**Examples**

- All existing examples in `python/examples/` run successfully from the new location.
- A migration note is added to `python/README.md` documenting the relocation for contributors who may have local clones of the old repository.

---

### Story 0A.2 — Scaffold Language Directories

**User Story**

> As a contributor to the identity-model project,
> I want `node/`, `go/`, and `rust/` directories scaffolded with minimal but valid project files and consistent conventions,
> so that language-specific implementation work (Epics 2-4) can begin immediately with a standard project structure already in place.

**Description**

Create the directory structure for Node/TypeScript, Go, and Rust implementations. Each language directory must contain the minimal project files required to initialize a valid project in that ecosystem: dependency manifests, source and test directory stubs, and a README explaining the directory's purpose and planned scope. Establish naming conventions that are consistent across all languages (e.g., `src/`, `tests/` or language-idiomatic equivalents). Include `.gitkeep` files in empty directories to ensure they are tracked by git.

**Acceptance Criteria**

- **AC-0A.2.1** Given the `node/` directory, when reviewed, then it contains: `package.json` with name `@identity-model/node`, `tsconfig.json` with strict mode enabled, `src/` directory with a `.gitkeep`, `tests/` directory with a `.gitkeep`, and a `README.md` describing the planned Node/TypeScript implementation.
- **AC-0A.2.2** Given the `go/` directory, when reviewed, then it contains: `go.mod` with module path `github.com/jamescrowley321/identity-model/go`, `pkg/` directory with a `.gitkeep`, `internal/` directory with a `.gitkeep`, and a `README.md` describing the planned Go implementation.
- **AC-0A.2.3** Given the `rust/` directory, when reviewed, then it contains: `Cargo.toml` with package name `identity-model` and edition `2024`, `src/` directory containing a `lib.rs` stub, `tests/` directory with a `.gitkeep`, and a `README.md` describing the planned Rust implementation.
- **AC-0A.2.4** Given all scaffolded directories, when the project files are validated by their respective toolchains (`npm install` in `node/`, `go mod tidy` in `go/`, `cargo check` in `rust/`), then no errors are produced.
- **AC-0A.2.5** Given the scaffolded directories, when the directory structure is compared across languages, then the conventions are consistent: each language has a source directory, a test directory, a dependency manifest, and a README following the same template structure.
- **AC-0A.2.6** Given the repository root, when reviewed, then a top-level `README.md` exists with a language matrix table listing all four implementations, their package names, registries, and current status (Python: active, Node/Go/Rust: scaffolded).

**Unit Tests**

- A CI validation step runs each language's toolchain check (`npm install`, `go mod tidy`, `cargo check`) and confirms zero errors.
- A script or CI job verifies that all expected files and directories exist per the acceptance criteria.

**Integration Tests**

- Each scaffolded project can produce a minimal build artifact: `npm pack` produces a tarball, `go build ./...` succeeds, `cargo build` succeeds.

**Examples**

- Each language README includes a "Getting Started" section with the commands needed to set up a local development environment for that language.

---

### Story 0A.3 — Set Up Monorepo CI

**User Story**

> As a maintainer of the identity-model project,
> I want a GitHub Actions CI pipeline that runs language-specific test suites only when their respective directories change and enforces cross-language conformance after all language jobs pass,
> so that CI is fast for single-language changes yet guarantees cross-language consistency on every push.

**Description**

Create a GitHub Actions workflow configuration that uses a matrix strategy to run per-language CI jobs (pytest for Python, vitest for Node/TypeScript, go test for Go, cargo test for Rust). Each language job should only trigger when files in its directory change (using path filters). Add a cross-language conformance job that runs after all language-specific jobs pass, verifying that conformance test results are consistent across languages. Configure branch protection rules for the `main` branch requiring all CI checks to pass before merge.

**Acceptance Criteria**

- **AC-0A.3.1** Given a push that modifies only files in `python/`, when CI runs, then only the Python job executes (pytest) and the cross-language conformance job is skipped or succeeds vacuously.
- **AC-0A.3.2** Given a push that modifies only files in `node/`, when CI runs, then only the Node job executes (vitest) and other language jobs are skipped.
- **AC-0A.3.3** Given a push that modifies files in multiple language directories, when CI runs, then all affected language jobs execute in parallel and the cross-language conformance job runs after all language jobs complete.
- **AC-0A.3.4** Given the CI workflow, when the cross-language conformance job runs, then it collects conformance test results from all language jobs that ran and verifies that all shared conformance test IDs that were executed have consistent pass/fail status across languages.
- **AC-0A.3.5** Given a push that modifies files in `spec/` or `infra/`, when CI runs, then all language jobs execute (since shared infrastructure affects all languages).
- **AC-0A.3.6** Given the `main` branch, when branch protection rules are reviewed, then they require: all CI status checks to pass, at least one approving review, and no direct pushes (force push disabled).
- **AC-0A.3.7** Given the CI workflow, when reviewed, then each language job uses the correct minimum runtime version: Python 3.11+, Node 20+, Go 1.22+, Rust MSRV 1.75+.
- **AC-0A.3.8** Given the CI workflow, when reviewed, then it includes caching for each language's dependency manager (pip cache, npm cache, Go module cache, Cargo registry/target cache) to minimize CI run times.

**Unit Tests**

- The workflow YAML passes `actionlint` validation with no errors.
- A dry-run or act-based local test confirms that path filters correctly select language jobs.

**Integration Tests**

- A test PR modifying only `python/` triggers only the Python CI job and the conformance job (or skips conformance if only one language ran).
- A test PR modifying `spec/conformance/` triggers all language CI jobs.

**Examples**

- A `CONTRIBUTING.md` section is added at the repository root documenting: how CI works, which jobs run for which directories, how to read conformance results, and how to add a new language to the CI matrix.

---

### Story 0A.4 — Set Up Shared Test Infrastructure

**User Story**

> As a developer implementing identity-model in any language,
> I want a single, shared node-oidc-provider instance running via Docker Compose with pre-configured clients, claims, and PKCE support,
> so that all languages' integration tests run against the same OIDC provider and I do not need to set up language-specific test servers.

**Description**

Create `infra/docker-compose.yml` that runs [node-oidc-provider](https://github.com/panva/node-oidc-provider) as the shared conformance test target for all language implementations. The provider must be configured with multiple client registrations covering all OAuth2/OIDC flows the project supports (client credentials, authorization code + PKCE, token introspection, revocation). Claims must be configurable so that integration tests can request specific claim sets. The provider must support PKCE enforcement, multiple response types, and standard OIDC Discovery. Include a health check mechanism so that CI and local development can wait for the provider to be ready before running tests.

**Acceptance Criteria**

- **AC-0A.4.1** Given the `infra/docker-compose.yml`, when `docker compose up` is run, then a node-oidc-provider instance starts and responds to OIDC Discovery requests at `http://localhost:9000/.well-known/openid-configuration` within 30 seconds.
- **AC-0A.4.2** Given the running provider, when the discovery document is retrieved, then it advertises all required endpoints: authorization, token, userinfo, jwks_uri, introspection, and revocation.
- **AC-0A.4.3** Given the running provider, when client registrations are reviewed, then at least the following clients are pre-configured:
  - A `client_credentials` client with a client secret and configured scopes.
  - An `authorization_code` client with PKCE required, a redirect URI, and configured scopes.
  - A `public` client (no client secret) with PKCE required for testing public client flows.
- **AC-0A.4.4** Given the running provider, when a Client Credentials token request is made using the pre-configured client, then a valid access token is returned.
- **AC-0A.4.5** Given the running provider, when the JWKS endpoint is requested, then it returns a valid JWK Set containing at least one RSA signing key.
- **AC-0A.4.6** Given the running provider, when custom claims are configured for a test user, then token and userinfo responses include those claims.
- **AC-0A.4.7** Given the Docker Compose configuration, when reviewed, then it includes a health check that CI can use to gate test execution (e.g., `healthcheck` directive or a wait-for-it script).
- **AC-0A.4.8** Given the running provider, when an Authorization Code + PKCE flow is executed against the pre-configured authorization_code client, then the flow completes successfully and returns an ID token and access token.

**Unit Tests**

- The Docker Compose YAML passes `docker compose config` validation with no errors.
- The node-oidc-provider configuration file passes JSON/JS syntax validation.

**Integration Tests**

- A smoke test script (language-agnostic, e.g., `curl`-based) validates all acceptance criteria by exercising discovery, JWKS, client credentials, and health check endpoints against the running provider.
- The Python integration test suite (from Story 0A.1) runs successfully against the shared provider, confirming backward compatibility with existing tests.

**Examples**

- An `infra/README.md` documents: how to start the provider, the pre-configured clients and their credentials, how to add new clients or modify claims, and how to run the smoke test.
- A `.env.example` file in `infra/` documents all configurable environment variables (port, issuer URL, log level).

---

### Story 0A.5 — Authorization Code Flow Test Automation

**User Story**

> As a CI/CD pipeline maintainer,
> I want an automated mechanism to execute Authorization Code + PKCE flows in CI without browser interaction,
> so that integration tests for all four language implementations can verify the complete authentication flow end-to-end.

**Description**

The Authorization Code + PKCE flow requires a browser redirect (authorization endpoint → user agent → callback). In CI, this needs automation. Investigate and implement one of:
- A headless browser automation approach (Playwright/Puppeteer) that handles the login form on node-oidc-provider
- A test-mode endpoint on node-oidc-provider that auto-approves authorization requests
- A pre-seeded authorization code approach where the test harness generates codes directly

**Acceptance Criteria**

- **AC-0A.5.1** Given the CI environment, when an Authorization Code + PKCE integration test runs, then the full flow completes without human interaction: authorization request → code issuance → token exchange → token validation.
- **AC-0A.5.2** Given the automation mechanism, when reviewed, then it works identically across all four language test runners (Python pytest, Node vitest, Go testing, Rust cargo test).
- **AC-0A.5.3** Given the test infrastructure, when the automation approach is documented, then it includes setup instructions, known limitations, and guidance for adding new test scenarios.

**RFC References**

- [RFC 6749 §4.1 — Authorization Code Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)

---

## Dependencies

- **git filter-repo** must be available for Story 0A.1 (installable via `pip install git-filter-repo`).
- **Docker** and **Docker Compose** must be available for Story 0A.4.
- **Language toolchains** (Node 20+, Go 1.22+, Rust 1.75+) must be available for Story 0A.2 validation.
- No dependency on other epics — this epic is the foundation for all subsequent work.

## Story Sequencing

| Order | Story | Rationale |
|-------|-------|-----------|
| 1 | 0A.1 Restructure py-identity-model | Must happen first — establishes the monorepo and relocates the existing codebase |
| 2 | 0A.2 Scaffold language directories | Depends on 0A.1 — adds language stubs alongside the relocated Python code |
| 3 | 0A.3 Set up monorepo CI | Depends on 0A.1 and 0A.2 — needs all language directories present to configure path filters and matrix jobs |
| 4 | 0A.4 Set up shared test infrastructure | Can run in parallel with 0A.3 — independent of CI setup but benefits from having the repo structure finalized |
| 5 | 0A.5 Authorization Code flow test automation | Depends on 0A.4 — requires the shared test infrastructure (node-oidc-provider) to be running |

Stories 0A.3 and 0A.4 can run in parallel after 0A.2 completes. Story 0A.5 depends on 0A.4.
