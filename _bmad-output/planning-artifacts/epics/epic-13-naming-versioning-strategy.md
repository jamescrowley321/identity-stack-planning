---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '13'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 13: Naming, Versioning & Package Identity Strategy

**Goal:** Establish a cohesive naming convention, versioning strategy, and migration path from py-identity-model to the unified identity-model brand across all languages and package registries.

## Overview

The project currently exists as `py-identity-model` on PyPI (v2.17.1). As we expand to Node, Go, and Rust, we need to decide:
- Do all packages share the `identity-model` name?
- Is versioning unified or independent per language?
- How do we migrate the existing Python package without breaking production users?
- Should we fork the repo or rename in place?

These decisions affect registry names, import paths, git history, CI, documentation, and user trust. Get it wrong and we fragment the brand or break existing users.

---

### Story 13.1: Package Naming Research & Decision

As a **project maintainer**,
I want a clear naming strategy across all package registries,
So that the identity-model brand is consistent and discoverable.

**Scope:**

Research and decide on naming for each registry:

| Registry | Current | Option A (unified) | Option B (prefixed) | Option C (scoped) |
|----------|---------|--------------------|--------------------|-------------------|
| PyPI | `py-identity-model` | `identity-model` | `py-identity-model` (keep) | N/A |
| npm | — | `identity-model` | `node-identity-model` | `@identity-model/client` |
| Go modules | — | `github.com/.../identity-model/go` | `github.com/.../go-identity-model` | N/A |
| crates.io | — | `identity-model` | `rs-identity-model` | N/A |

Research:
- Name availability on all registries (PyPI, npm, crates.io)
- Trademark/squatting risks
- Discoverability (what developers search for)
- Convention in each ecosystem (Go prefers `go-*` prefix? Rust prefers no prefix?)
- Impact on import paths and documentation
- Whether `@identity-model` npm org scope is available and preferable

**Acceptance Criteria:**

**Given** the naming research report
**When** a developer searches "identity model" on any registry
**Then** our package appears with a clear, recognizable name

**Given** the decision
**When** applied across all registries
**Then** the brand is consistent enough that developers recognize the family

- [ ] **Research:** Check name availability on PyPI, npm, crates.io
- [ ] **Research:** Survey naming conventions per ecosystem
- [ ] **Deliverable:** Decision document with chosen names, rationale, and rejected alternatives

---

### Story 13.2: Versioning Strategy Decision

As a **project maintainer**,
I want a clear versioning strategy,
So that users understand compatibility and release cadence.

**Scope:**

Decide between:

**Option A: Unified versioning**
- All languages share the same version number (e.g., v3.0.0 at launch)
- A release increments all languages even if only one changed
- Pro: Simple, clear "identity-model v3.1.0 is the latest everywhere"
- Con: Unnecessary version bumps, language-specific bugfixes force global release

**Option B: Independent versioning**
- Each language has its own semver (Python v3.0.0, Node v1.0.0, Go v1.0.0, Rust v0.1.0)
- Spec version is separate (conformance spec v1.0)
- Pro: Natural for each ecosystem, no forced bumps
- Con: Confusing ("which version of Go matches which Python?")

**Option C: Spec-pinned versioning**
- Spec has a version (e.g., spec v1.0 = Core tier complete)
- Each language declares which spec version it conforms to
- Languages version independently but badge their spec conformance level
- Pro: Best of both — independent releases, clear compatibility via spec version
- Con: More complex to communicate

Research:
- How Duende versions IdentityModel vs IdentityServer
- How other multi-language projects version (protobuf, gRPC, OpenTelemetry)
- Ecosystem expectations (Go module versioning rules, crates.io semver, npm semver)

**Acceptance Criteria:**

**Given** the versioning decision
**When** a developer checks the Go module version
**Then** they can determine what capabilities and spec conformance it provides

**Given** a bugfix in only the Python port
**When** a release is cut
**Then** the versioning strategy handles it without confusing other language users

- [ ] **Research:** How OpenTelemetry, gRPC, and protobuf handle multi-language versioning
- [ ] **Research:** Duende's versioning approach
- [ ] **Deliverable:** Decision document with chosen strategy, version number scheme, and release process

---

### Story 13.3: PyPI Migration Path

As a **user of py-identity-model on PyPI**,
I want a smooth migration to the new package identity,
So that my production deployments are not disrupted.

**Scope:**

Decide and implement the Python package migration:

**Option A: Rename on PyPI**
- Publish `identity-model` as new package, `py-identity-model` becomes a thin redirect that depends on `identity-model`
- `pip install py-identity-model` still works, pulls in `identity-model`
- Deprecation warning in py-identity-model pointing to identity-model
- Timeline: overlap period (6-12 months) then archive

**Option B: Keep py-identity-model**
- Don't rename on PyPI — Python package stays `py-identity-model`
- Monorepo just changes the repo name, not the package name
- Least disruptive, but name doesn't match other languages

**Option C: Dual publish**
- Publish same code as both `py-identity-model` and `identity-model` on PyPI
- Eventually deprecate `py-identity-model`

Research:
- PyPI policies on package name transfers/redirects
- How other projects handled renames (e.g., `attrs` → `attrs`, `sklearn` → `scikit-learn`)
- Impact on downstream dependents (identity-stack, any external users)
- Whether `identity-model` is available on PyPI

**Acceptance Criteria:**

**Given** a production app using `py-identity-model==2.17.1`
**When** the migration is complete
**Then** `pip install py-identity-model` still works and the app runs unchanged

**Given** a new user finding identity-model docs
**When** they follow the Python getting-started guide
**Then** the install command uses the new canonical name

- [ ] **Research:** Check `identity-model` availability on PyPI
- [ ] **Research:** PyPI redirect/dependency mechanism
- [ ] **Deliverable:** Migration plan with timeline, communication, and rollback strategy

---

### Story 13.4: Repository Migration Strategy

As a **project maintainer**,
I want a clear plan for transforming the repo,
So that git history is preserved and the transition is clean.

**Scope:**

Decide between:

**Option A: Rename in place**
- Rename `py-identity-model` repo to `identity-model` on GitHub
- GitHub auto-redirects old URL
- Restructure directories internally (add python/, node/, go/, rust/)
- Pro: Preserves all git history, stars, issues, PRs
- Con: Go module path changes can be painful

**Option B: Fork + archive**
- Fork `py-identity-model` into new `identity-model` repo
- Move Python code into `python/` directory in the new repo
- Archive `py-identity-model` with pointer to new repo
- Pro: Clean start, old repo stays as-is for reference
- Con: Loses git history continuity, stars reset

**Option C: Monorepo via subtree**
- Create fresh `identity-model` repo
- `git subtree add` py-identity-model history into `python/` directory
- Pro: Clean repo with preserved Python history in subdirectory
- Con: Subtree merge history can be messy

Research:
- GitHub rename redirect durability (how long do redirects last?)
- Go module implications of repo rename
- Impact on existing CI, Dependabot, forks
- How to preserve PyPI publishing from new repo structure

**Acceptance Criteria:**

**Given** the migration is complete
**When** someone visits the old py-identity-model GitHub URL
**Then** they reach the new identity-model repo (or a clear pointer)

**Given** `git log python/` in the new repo
**When** reviewing history
**Then** the full commit history from py-identity-model is intact

- [ ] **Research:** GitHub rename behavior, Go module path implications
- [ ] **Research:** git-filter-repo vs subtree for history preservation
- [ ] **Deliverable:** Step-by-step migration runbook with rollback plan

---

### Story 13.5: Brand & Identity Guidelines

As a **project maintainer**,
I want consistent branding across all touchpoints,
So that identity-model is immediately recognizable as a cohesive project.

**Scope:**

- Project name: `identity-model` (confirm or revise)
- Logo / icon (optional — even a simple wordmark helps)
- README badge conventions: spec conformance version, language, build status, coverage
- Consistent descriptions across all registries:
  - Short: "RFC-compliant OIDC/OAuth2 client library for {language}"
  - Long: "Part of the identity-model family — cross-language OIDC/OAuth2 client libraries inspired by Duende's IdentityModel"
- GitHub topics/tags for discoverability
- Attribution line for Duende in all READMEs
- Social preview images for GitHub repo

**Acceptance Criteria:**

**Given** a developer finding identity-model on any registry
**When** they read the package description
**Then** they understand it's part of a multi-language family with consistent design

**Given** the brand guidelines
**When** a new language port README is created
**Then** it follows the established template with correct attribution

- [ ] **Deliverable:** Brand guide document with name, descriptions, badge templates, attribution text
- [ ] **Example:** README template that all language ports follow

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 13.1 (Naming) | None — can start immediately |
| 13.2 (Versioning) | 13.1 (names affect version communication) |
| 13.3 (PyPI Migration) | 13.1, 13.2 |
| 13.4 (Repo Migration) | 13.1 (name decision drives repo name) |
| 13.5 (Brand) | 13.1 (name decision) |

## Priority

**This epic should be resolved before Phase 0 (monorepo setup) begins.** The naming and repo migration decisions directly affect Epic 0a (monorepo setup), all package.json/go.mod/Cargo.toml files, CI configuration, and documentation. Getting this wrong means rework across every other epic.
