---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '9'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
  - _bmad-output/planning-artifacts/epics/epic-5-extended-tier.md  # Story 6.3
  - _bmad-output/planning-artifacts/epics/epic-0b-spec-discovery-jwks.md  # spec/capabilities.md structure
  - _bmad-output/planning-artifacts/epics/epic-0c-spec-jwt-validation.md
  - _bmad-output/planning-artifacts/epics/epic-0d-spec-token-flows.md
---

# Epic 9: Documentation Site

**Goal:** Ship a production-quality Docusaurus documentation site for the identity-model monorepo that serves as the canonical reference for all four language SDKs, RFC compliance status, API surface, and migration paths from competing libraries.

## Overview

Story 6.3 (Epic 6) identified the need for a cross-language documentation site. This epic expands that brief story into five implementable stories covering site scaffolding, per-language quick-start guides, an auto-generated RFC coverage matrix, API reference generation from source, and migration guides from incumbent libraries.

The documentation site is a first-class product artifact — it is the primary surface through which developers evaluate identity-model and decide whether to adopt it. It must be accurate, searchable, and kept in sync with the codebase through CI-enforced checks.

**Framework:** [Docusaurus](https://docusaurus.io/) (React-based, MDX support, versioning, Algolia DocSearch integration, dark mode built-in).

**Deployment:** GitHub Pages (primary) or Vercel (alternative). CI builds on every push to `main`; preview deploys on PRs.

---

### Story 9.1: Docusaurus Site Initialization and Deployment

**As a** project maintainer,
**I want** a Docusaurus site scaffolded in `docs-site/` with CI-driven deployment and a well-defined navigation structure,
**So that** the team has a working documentation platform to build on and contributors can preview changes before merge.

**Scope:**

- Initialize Docusaurus 3.x in `docs-site/` at the monorepo root
- Configure sidebar navigation:
  - **Getting Started** — project overview, installation matrix, first token validation
  - **Languages** — top-level category with sub-pages: Python, Node/TypeScript, Go, Rust
  - **RFC Coverage** — interactive coverage matrix (Story 9.3)
  - **API Reference** — per-language generated docs (Story 9.4)
  - **Examples** — runnable example projects per language
  - **Migration** — guides from competing libraries (Story 9.5)
- Enable dark mode (Docusaurus `colorMode` config)
- Configure Algolia DocSearch (application submitted, placeholder config until approved)
- Local search fallback via `@easyops-cn/docusaurus-search-local` until Algolia is live
- GitHub Pages deployment via GitHub Actions (`docusaurus deploy`)
- PR preview deploys (Vercel preview or GitHub Pages preview action)
- `package.json` scripts: `start`, `build`, `serve`, `clear`, `deploy`
- Broken link checker enabled in Docusaurus config (`onBrokenLinks: 'throw'`)
- MDX support for interactive components (coverage matrix, code tabs)

**Acceptance Criteria:**

**Given** a fresh clone of the monorepo,
**When** a developer runs `cd docs-site && npm install && npm start`,
**Then** the Docusaurus dev server starts and serves the site at `localhost:3000` with all navigation sections visible, dark mode toggle functional, and search bar present.

**Given** a PR that modifies any file under `docs-site/`,
**When** CI runs,
**Then** the site builds successfully (`npm run build` exits 0), the broken link checker passes, and a preview deployment URL is posted as a PR comment.

**Given** a merge to `main` that includes `docs-site/` changes,
**When** the deploy workflow triggers,
**Then** the production site at `https://<org>.github.io/identity-model/` is updated within 5 minutes.

- [ ] **Unit test:** `npm run build` succeeds with zero warnings; broken link checker catches intentionally broken links in a test fixture
- [ ] **Integration test:** Playwright smoke test — load production URL, verify navigation renders all 6 top-level sections, dark mode toggle works, search input is present
- [ ] **Example:** `docs-site/docs/intro.md` — landing page with project overview, language badges, and links to all sections

---

### Story 9.2: Per-Language Getting Started Guides

**As a** developer adopting identity-model in Python, Node, Go, or Rust,
**I want** a dedicated quick-start guide for my language that gets me from install to validated token in under 10 lines of code,
**So that** I can evaluate the library in minutes without reading the full API reference.

**Scope:**

Four guides, one per language, each following an identical structure:

1. **Install** — single command (`pip install`, `npm install`, `go get`, `cargo add`)
2. **Configure** — set issuer URL and audience (2-3 lines)
3. **Validate a token** — complete working example in under 10 lines
4. **Next steps** — links to API reference, advanced features, examples

Each guide must include:

- Copy-pasteable code blocks with language tabs (Docusaurus `Tabs` + `TabItem` components)
- Code blocks tested in CI (extracted and executed as part of doc-tests)
- A "Try it" section pointing to a runnable example in `examples/`
- Environment setup notes (Python venv, Node version, Go module init, Rust edition)
- Common pitfalls section (e.g., clock skew, self-signed certs in dev, audience mismatch)

**Acceptance Criteria:**

**Given** the Python getting started guide,
**When** a developer copies the code blocks into a new Python file with a valid OIDC issuer and token,
**Then** the code runs without modification and prints the validated token claims.

**Given** the Node/TypeScript getting started guide,
**When** a developer copies the code blocks into a new TypeScript file,
**Then** the code compiles with `tsc --strict` and runs successfully.

**Given** the Go getting started guide,
**When** a developer copies the code blocks into a new `main.go`,
**Then** `go run main.go` succeeds with a valid token.

**Given** the Rust getting started guide,
**When** a developer copies the code into a new Cargo project,
**Then** `cargo run` succeeds with a valid token.

**Given** any getting started guide,
**When** the code examples are extracted and tested in CI,
**Then** all examples pass against a local OIDC provider (node-oidc-provider or similar test fixture).

- [ ] **Unit test:** Markdown linter validates all four guides have the required sections (Install, Configure, Validate, Next Steps, Common Pitfalls)
- [ ] **Integration test:** CI job extracts code blocks from each guide, runs them against a Dockerized OIDC provider, and asserts exit code 0
- [ ] **Example:** `docs-site/docs/languages/python/getting-started.mdx` — complete Python quick-start with `Tabs` component showing sync and async variants

---

### Story 9.3: RFC Coverage Matrix

**As a** developer evaluating identity-model,
**I want** an interactive table showing which RFC sections each language implements, with links to the spec and the library's API docs,
**So that** I can immediately see what is supported in my language and what is planned.

**Scope:**

- Auto-generated from `spec/capabilities.md` — a script parses the capability spec and emits a JSON data file consumed by a Docusaurus MDX component
- Generator script: `docs-site/scripts/generate-coverage-matrix.ts`
  - Reads `spec/capabilities.md` (structured with normative MUST/SHOULD/MAY statements per capability per language)
  - Emits `docs-site/src/data/coverage-matrix.json` with schema:
    ```json
    {
      "capabilities": [
        {
          "id": "discovery",
          "name": "OIDC Discovery",
          "spec": "OpenID Connect Discovery 1.0",
          "specUrl": "https://openid.net/specs/openid-connect-discovery-1_0.html",
          "languages": {
            "python": { "status": "complete", "apiDocUrl": "/api/python#discovery" },
            "node": { "status": "complete", "apiDocUrl": "/api/node#discovery" },
            "go": { "status": "in-progress", "apiDocUrl": null },
            "rust": { "status": "planned", "apiDocUrl": null }
          }
        }
      ]
    }
    ```
- React component: `docs-site/src/components/CoverageMatrix.tsx`
  - Renders a table with rows = capabilities, columns = languages
  - Status indicators: green check (complete), yellow clock (in-progress), blue calendar (planned), gray dash (not applicable)
  - Each cell links to the language-specific API doc page when available
  - Each row links to the RFC/spec section
  - Filterable by status and language
  - Responsive — collapses gracefully on mobile
- Embedded in `docs-site/docs/rfc-coverage.mdx` via MDX import
- CI check: `generate-coverage-matrix.ts` runs in CI and fails if the generated JSON differs from the committed version (ensures docs stay in sync with spec)

**Acceptance Criteria:**

**Given** `spec/capabilities.md` is updated to mark Go Discovery as "complete",
**When** the generator script runs,
**Then** `coverage-matrix.json` is updated and the site renders Go Discovery with a green check.

**Given** the coverage matrix page,
**When** a developer clicks on an RFC link in the "Spec" column,
**Then** the browser navigates to the official RFC/spec section URL.

**Given** the coverage matrix page,
**When** a developer clicks on a green-check cell for Python Discovery,
**Then** the browser navigates to the Python API reference page for the discovery module.

**Given** a PR that modifies `spec/capabilities.md`,
**When** CI runs,
**Then** the pipeline fails if `coverage-matrix.json` was not regenerated to match.

- [ ] **Unit test:** Generator script tested with a fixture `capabilities.md` — asserts correct JSON output for known capabilities and statuses
- [ ] **Integration test:** Playwright test loads the coverage matrix page, verifies all rows render, filters by "complete" status, and clicks through to an API doc page
- [ ] **Example:** `docs-site/src/data/coverage-matrix.json` — generated data file with all capabilities from spec/capabilities.md

---

### Story 9.4: API Reference Generation

**As a** developer using identity-model,
**I want** auto-generated API reference documentation from source code,
**So that** I can browse every public type, function, and method with accurate signatures and doc comments — without the docs drifting from the code.

**Scope:**

Per-language API doc generation integrated into the Docusaurus build:

| Language | Tool | Output | Integration |
|----------|------|--------|-------------|
| Python | `pdoc` (preferred) or Sphinx + `sphinx-apidoc` | HTML | Embedded via Docusaurus iframe or static HTML copy into `docs-site/static/api/python/` |
| Node/TS | `typedoc` | HTML or Markdown | Markdown output via `typedoc-plugin-markdown` directly into `docs-site/docs/api/node/` for native Docusaurus rendering |
| Go | `gomarkdoc` (Markdown output from godoc comments) | Markdown | Directly into `docs-site/docs/api/go/` |
| Rust | `rustdoc` | HTML | Embedded via Docusaurus iframe or linked externally to `docs.rs/identity-model` |

Build pipeline:

- `docs-site/scripts/generate-api-docs.sh` — orchestrates all four generators
- Runs as a pre-build step: `npm run generate-api-docs && docusaurus build`
- CI verifies generated API docs are up-to-date (diff check against committed output)
- Each language's API docs are navigable from the sidebar under **API Reference > [Language]**
- Cross-links from getting started guides and RFC coverage matrix link into the generated API docs

**Acceptance Criteria:**

**Given** a new public function is added to the Python SDK with a docstring,
**When** the API docs are regenerated,
**Then** the function appears in the Python API reference with its signature, docstring, parameter types, and return type.

**Given** a TypeScript interface is updated in the Node SDK,
**When** `typedoc` runs,
**Then** the generated Markdown reflects the updated interface with all properties and JSDoc comments.

**Given** the Go SDK adds a new exported type,
**When** `gomarkdoc` runs,
**Then** the type appears in the Go API reference with its godoc comment.

**Given** the Rust SDK modifies a public struct's documentation,
**When** `rustdoc` runs,
**Then** the updated documentation is reflected in the Rust API reference.

**Given** a PR that changes a public API in any language SDK but does not regenerate API docs,
**When** CI runs,
**Then** the pipeline fails with a message indicating which language's API docs are stale.

- [ ] **Unit test:** Each generator script tested in isolation — given a fixture source file with known public API, assert the output contains expected function/type names and signatures
- [ ] **Integration test:** Full `generate-api-docs.sh` runs against the actual monorepo source, `docusaurus build` succeeds, and a Playwright test navigates to each language's API reference and verifies at least one page loads with content
- [ ] **Example:** `docs-site/docs/api/node/discovery.md` — generated TypeDoc Markdown for the Node discovery module showing exported functions, types, and JSDoc descriptions

---

### Story 9.5: Migration Guides

**As a** developer currently using an existing OIDC/OAuth2 library,
**I want** a step-by-step migration guide showing how to replace my current library with identity-model,
**So that** I can switch with confidence, understanding the exact API mapping and any behavioral differences.

**Scope:**

Four migration guides, one per language, covering the most popular incumbent library:

| Language | Migrating From | Migrating To |
|----------|---------------|--------------|
| Python | `authlib` | `identity-model` (Python SDK) |
| Node/TS | `openid-client` (panva) | `@identity-model/node` |
| Go | `coreos/go-oidc` + `golang.org/x/oauth2` | `identity-model` (Go module) |
| Rust | `openidconnect-rs` | `identity-model` (Rust crate) |

Each guide must include:

1. **Why migrate** — brief comparison table (feature coverage, maintenance status, RFC compliance breadth)
2. **Feature mapping table** — two-column table mapping incumbent API concepts to identity-model equivalents (e.g., `authlib.integrations.httpx_client.AsyncOAuth2Client` maps to `identity_model.aio.TokenClient`)
3. **Side-by-side code comparisons** — for the 3 most common operations:
   - OIDC Discovery
   - Token validation (JWT)
   - Client credentials token request
4. **Behavioral differences** — any changes in defaults, error handling, or configuration that could surprise migrators (e.g., different default clock skew tolerance, different exception hierarchy)
5. **Step-by-step migration checklist** — ordered list of changes to make, with dependency swap as step 1
6. **Gotchas** — known incompatibilities, removed features, or patterns that do not have a 1:1 mapping

**Acceptance Criteria:**

**Given** the Python migration guide (authlib to identity-model),
**When** a developer follows the feature mapping table,
**Then** every public API entry point in authlib's OIDC client surface has a documented equivalent (or explicit "not supported" note) in identity-model.

**Given** a side-by-side code comparison in any migration guide,
**When** the "before" code (incumbent library) and "after" code (identity-model) are both executed with the same OIDC provider and credentials,
**Then** both produce equivalent results (same claims, same token, same discovery document).

**Given** the migration checklist in any guide,
**When** a developer follows all steps in order on a project using the incumbent library,
**Then** the project's tests pass after completing the migration (assuming test coverage of OIDC operations).

**Given** any migration guide,
**When** the side-by-side code examples are extracted and tested in CI,
**Then** both the "before" and "after" examples compile/run successfully against a Dockerized OIDC provider.

- [ ] **Unit test:** Markdown linter validates each guide has all required sections (Why Migrate, Feature Mapping, Side-by-Side Code, Behavioral Differences, Checklist, Gotchas)
- [ ] **Integration test:** CI job extracts "before" and "after" code blocks from each guide, runs both against node-oidc-provider, and asserts both produce equivalent output
- [ ] **Example:** `docs-site/docs/migration/python-from-authlib.mdx` — complete migration guide with tabbed code comparisons showing authlib vs identity-model for discovery, token validation, and client credentials

---

## Dependency Graph

```
Story 9.1 (Docusaurus setup)
  ├── Story 9.2 (Getting started guides)  — needs site scaffold
  ├── Story 9.3 (RFC coverage matrix)     — needs MDX component infrastructure
  ├── Story 9.4 (API reference generation) — needs site build pipeline
  └── Story 9.5 (Migration guides)        — needs site scaffold
```

Story 9.1 is the prerequisite for all others. Stories 9.2-9.5 can be developed in parallel once 9.1 is complete.

## Definition of Done

- All five stories merged to `main`
- Production site deployed and accessible
- All CI checks passing (build, broken links, doc-tests, API doc freshness, coverage matrix sync)
- Algolia DocSearch applied for (or local search confirmed working)
- At least one complete getting started guide per language
- RFC coverage matrix auto-generated from `spec/capabilities.md`
- API reference generated from source for all implemented languages
- At least one migration guide fully written and CI-tested
