---
workflowType: 'epic'
project_name: 'identity-model'
epic_id: '8'
status: 'draft'
date: '2026-04-04'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-identity-model-monorepo.md
---

# Epic 8: Security Pipeline & Scanning

**Goal:** Establish automated security scanning, dependency auditing, and vulnerability management across all four language ports. Identity libraries handle cryptographic material and authentication tokens — security must be CI-enforced, not optional.

## Overview

An identity library is a high-value attack surface. Algorithm confusion, timing attacks, dependency vulnerabilities, and secret leakage are all real risks. This epic ensures every PR and release is gated on automated security checks across all languages.

---

### Story 8.1: Cross-Language Security Policy & Scanning Spec

As a **project maintainer**,
I want a shared security policy and scanning specification,
So that all language ports enforce consistent security standards.

**Scope:**

- `SECURITY.md` at repo root — vulnerability disclosure policy, supported versions, reporting process
- `spec/security.md` — cross-language security requirements:
  - Dependency scanning frequency and severity thresholds
  - Static analysis rules specific to identity/crypto code
  - Secret detection patterns (tokens, keys, credentials in code/tests)
  - Supply chain security (signed commits, provenance, SBOM)
  - Minimum TLS version enforcement (TLS 1.2+)
  - Banned patterns: `alg=none` acceptance, hard-coded secrets, disabled certificate verification, use of `eval`/`exec` with token data

**Acceptance Criteria:**

**Given** a new contributor reading SECURITY.md
**When** they discover a vulnerability in any language port
**Then** they have clear instructions for responsible disclosure

**Given** spec/security.md
**When** a port maintainer sets up CI for a new language
**Then** they know exactly which scanners, rules, and thresholds to configure

- [ ] **Unit test:** Linter validates SECURITY.md has required sections (disclosure, scope, SLA)
- [ ] **Integration test:** CI job validates all language ports have matching scanner configurations
- [ ] **Example:** Sample vulnerability report and response timeline

---

### Story 8.2: Python Security Pipeline

As a **Python port maintainer**,
I want automated security scanning in CI,
So that vulnerabilities in dependencies and code are caught before merge.

**Scope:**

- **Dependency scanning:** `pip-audit` or `safety` in CI — fail on HIGH/CRITICAL CVEs
- **Static analysis:** `bandit` (via ruff S rules) for security anti-patterns:
  - S101: assert usage (already configured)
  - S105-S107: hard-coded passwords/tokens
  - S501: requests with `verify=False`
  - S603-S607: subprocess injection
  - Custom rules for identity-specific patterns (reject `algorithms=["none"]` in PyJWT calls)
- **Secret detection:** `trufflehog` or `gitleaks` pre-commit hook + CI
- **SBOM generation:** `cyclonedx-bom` on release
- **Signed releases:** PyPI trusted publishing via GitHub Actions OIDC

**Acceptance Criteria:**

**Given** a PR that adds a dependency with a known HIGH CVE
**When** CI runs
**Then** the pipeline fails with a clear message identifying the CVE and affected package

**Given** code that calls `jwt.decode()` with `algorithms=["none"]`
**When** the linter runs
**Then** it flags the line as a security violation

**Given** a PR that contains a hard-coded API key or token string
**When** secret detection runs
**Then** the PR is blocked with the offending line identified

- [ ] **Unit test:** Verify ruff S rules catch all banned patterns (test with intentionally bad code samples)
- [ ] **Integration test:** Full CI run with a PR containing a vulnerable dependency — confirm pipeline blocks
- [ ] **Example:** `.github/workflows/security-python.yml` reference workflow

---

### Story 8.3: Node/TypeScript Security Pipeline

As a **Node port maintainer**,
I want automated security scanning in CI,
So that npm supply chain risks and code vulnerabilities are caught.

**Scope:**

- **Dependency scanning:** `npm audit --audit-level=high` in CI — fail on HIGH/CRITICAL
- **Static analysis:** `eslint-plugin-security` for Node-specific patterns:
  - detect-non-literal-regexp (ReDoS risk in claim parsing)
  - detect-object-injection
  - detect-possible-timing-attacks (critical for token comparison)
  - Custom rule: reject `algorithms: ["none"]` in jose verify calls
- **Supply chain:** `socket.dev` or `snyk` for dependency reputation scoring
- **Secret detection:** `gitleaks` pre-commit + CI
- **Lock file integrity:** `npm ci` only (no `npm install` in CI), lockfile-lint to enforce registry
- **SBOM generation:** `@cyclonedx/cyclonedx-npm` on release
- **Provenance:** npm publish with `--provenance` (SLSA Build L3)

**Acceptance Criteria:**

**Given** a PR that adds an npm package with a known vulnerability
**When** CI runs `npm audit`
**Then** the pipeline fails with advisory details

**Given** code that compares tokens using `===` instead of timing-safe comparison
**When** eslint-plugin-security runs
**Then** it flags the timing attack risk

**Given** a release workflow
**When** the package is published to npm
**Then** it includes SLSA provenance attestation

- [ ] **Unit test:** ESLint security rules catch all banned patterns
- [ ] **Integration test:** CI run with vulnerable dependency — confirm block
- [ ] **Example:** `.github/workflows/security-node.yml` reference workflow

---

### Story 8.4: Go Security Pipeline

As a **Go port maintainer**,
I want automated security scanning in CI,
So that vulnerabilities are caught with Go-native tooling.

**Scope:**

- **Dependency scanning:** `govulncheck` (official Go vulnerability scanner) in CI
- **Static analysis:** `gosec` for security-specific patterns:
  - G401: Use of weak cryptographic primitive
  - G402: TLS InsecureSkipVerify
  - G501: Importing blocklisted package (crypto/md5, crypto/sha1 for HMAC)
  - G601: Implicit memory aliasing in for loop
  - Custom: reject HMAC-SHA1 for token operations, enforce minimum key sizes
- **Fuzzing:** `go test -fuzz` on JWT parsing and token validation entry points
- **Secret detection:** `gitleaks` pre-commit + CI
- **SBOM generation:** `cyclonedx-gomod` on release
- **Signed releases:** cosign + sigstore on release binaries

**Acceptance Criteria:**

**Given** a dependency with a known Go vulnerability (via govulncheck database)
**When** CI runs `govulncheck ./...`
**Then** the pipeline fails identifying the vulnerable call path

**Given** code that sets `InsecureSkipVerify: true` on a TLS config
**When** `gosec` runs
**Then** it flags the line as G402

**Given** malformed JWT input
**When** the fuzzer runs against the validation entry point
**Then** no panics or memory safety violations occur

- [ ] **Unit test:** gosec rules catch all banned patterns
- [ ] **Integration test:** CI run with vulnerable dependency — confirm govulncheck blocks
- [ ] **Integration test:** Fuzz test runs for minimum 30 seconds with no crashes
- [ ] **Example:** `.github/workflows/security-go.yml` reference workflow

---

### Story 8.5: Rust Security Pipeline

As a **Rust port maintainer**,
I want automated security scanning in CI,
So that memory safety and dependency vulnerabilities are enforced.

**Scope:**

- **Dependency scanning:** `cargo-audit` against RustSec advisory database
- **Static analysis:** `clippy` with security-relevant lints:
  - `clippy::unwrap_used` — enforce proper error handling (critical for crypto code)
  - `clippy::expect_used` — same
  - `clippy::panic` — no panics in library code
  - `clippy::indexing_slicing` — bounds-checked access only
  - `unsafe` blocks — deny by default, require `// SAFETY:` justification
- **Fuzzing:** `cargo-fuzz` with `libFuzzer` on JWT parsing and validation
- **Unsafe audit:** `cargo-geiger` to track unsafe usage in dependency tree
- **Secret detection:** `gitleaks` pre-commit + CI
- **SBOM generation:** `cargo-cyclonedx` on release
- **Supply chain:** `cargo-vet` for dependency review

**Acceptance Criteria:**

**Given** a dependency with a RustSec advisory
**When** CI runs `cargo audit`
**Then** the pipeline fails with advisory ID and affected version

**Given** library code that uses `unwrap()` on a Result from cryptographic operations
**When** clippy runs with `clippy::unwrap_used` denied
**Then** it fails the lint check

**Given** malformed JWT input
**When** the fuzzer runs against token parsing
**Then** no panics, no undefined behavior, no memory safety violations

**Given** the dependency tree
**When** `cargo-geiger` runs
**Then** a report shows unsafe usage count; zero unsafe in first-party code

- [ ] **Unit test:** Clippy catches all banned patterns
- [ ] **Integration test:** CI run with advisory-flagged dependency — confirm cargo-audit blocks
- [ ] **Integration test:** Fuzz test runs for minimum 60 seconds with no crashes
- [ ] **Example:** `.github/workflows/security-rust.yml` reference workflow

---

### Story 8.6: Cross-Language Dependency Update Automation

As a **project maintainer**,
I want automated dependency updates across all 4 languages,
So that security patches are applied promptly without manual tracking.

**Scope:**

- **Dependabot** or **Renovate** configured for all 4 languages in one config
- Grouping: security updates auto-merged after CI passes; feature updates require review
- Update frequency: security — immediate; non-security — weekly
- Auto-merge policy: patch updates with passing CI auto-merge; minor/major require approval
- Dashboard: single view of dependency health across all ports

**Acceptance Criteria:**

**Given** a new CVE published affecting an npm dependency
**When** Dependabot/Renovate detects it
**Then** a PR is automatically created within 24 hours targeting the node/ directory

**Given** a security patch PR with all CI checks passing
**When** auto-merge rules evaluate
**Then** the PR is merged automatically

**Given** the project dashboard
**When** a maintainer checks dependency status
**Then** they see a unified view across Python, Node, Go, and Rust

- [ ] **Unit test:** Renovate/Dependabot config validates (dry-run)
- [ ] **Integration test:** Simulate a dependency update PR, verify CI runs correct language jobs
- [ ] **Example:** `renovate.json` or `.github/dependabot.yml` with all 4 language configs

---

## Dependencies

| Story | Depends On |
|-------|-----------|
| 8.1 (Security Spec) | Epic 0 (monorepo setup) |
| 8.2 (Python) | 8.1, Epic 1 (Python core) |
| 8.3 (Node) | 8.1, Epic 2 (Node core) |
| 8.4 (Go) | 8.1, Epic 3 (Go core) |
| 8.5 (Rust) | 8.1, Epic 4 (Rust core) |
| 8.6 (Dep Updates) | 8.1, Epic 0a (monorepo CI) |

## Security Principles

1. **Fail closed** — If a scanner can't run, the pipeline fails (not skips)
2. **No exceptions without justification** — Every suppressed finding requires a comment explaining why
3. **Defense in depth** — Multiple scanners per language (deps + static + secrets + fuzzing)
4. **Shift left** — Pre-commit hooks catch issues before they reach CI
5. **Zero PII in telemetry** — Security scans must also verify that OTel spans (Epic 7) never leak tokens or credentials
