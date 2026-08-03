# OSS Security & Quality Tooling — Tier-2

**Status:** planned · **Created:** 2026-08-02 · **Owner:** James · **Tracks:** identity-model/identity-stack/py-identity-model/terraform-provider-descope · **Issue:** jamescrowley321/identity-stack-planning#61

Continues [`oss-security-tooling-migration.md`](./oss-security-tooling-migration.md) (the Snyk/Sonar → FOSS migration). That plan's baseline ("Tier-1") is now shipped or in review across all four active repos; this document captures the follow-on depth work ("Tier-2") plus a Tier-3 backlog.

## Tier-1 — shipped (baseline)

One PR per repo; all FOSS + GitHub-native; SHA-pinned Actions, CodeQL, OpenSSF Scorecard, Dependency Review, secret scanning, language SCA + security linting, `SECURITY.md`, and the free GitHub security toggles (Dependabot alerts / automated fixes / private vulnerability reporting).

| Repo | Tier-1 PR | Notes |
|---|---|---|
| identity-model | jamescrowley321/identity-model#45 | + `main` branch protection & auto-delete branches |
| identity-stack | jamescrowley321/identity-stack#339 | security toggles flipped on (were off) |
| py-identity-model | jamescrowley321/py-identity-model#484 | 62 action refs SHA-pinned across 9 workflows |
| terraform-provider-descope | jamescrowley321/terraform-provider-descope#184 | already hardened; only dependency-review was missing |

**Byproduct:** the audit surfaced a live advisory on tpd `main` — **GO-2026-6061** in `google.golang.org/grpc@v1.80.0` (reachable via `providerserver.Serve`), fixed by the bump in jamescrowley321/terraform-provider-descope#185.

**Reusable gotchas** (documented so the next repo doesn't rediscover them):
- CodeQL `build-mode: none` is **unsupported for Go** — use `build-mode: manual`; Rust preview works with `none`.
- For a Go module in a subdir, `actions/setup-go` must run **before** `codeql-action/init` (the tracer wraps the PATH `go` at init) or the build is untraced ("no source code seen").
- `dependency-review-action` needs the repo **Dependency graph** enabled or it errors "not supported on this repository".
- Once Actions are SHA-pinned, **re-enable** Semgrep's `github-actions-mutable-action-tag` rule (drop the exclusion) so regressions fail.

## Current-state inventory (Tier-2 relevant)

| Repo | Findings → Security tab | OSV-Scanner | SBOM | Build provenance | Trusted Publishing (OIDC) |
|---|---|---|---|---|---|
| **identity-model** (Go+Rust lib) | CodeQL + Scorecard ✅ (#45); rest log-only | ✗ | ✗ | ✗ (no release yet) | ✗ (crate `0.0.1`, unpublished) |
| **py-identity-model** (Py lib) | CodeQL + Scorecard ✅ (#484); rest log-only | ✗ | ✗ | ✗ | **PyPI ✅** (main + fastapi pkgs) |
| **identity-stack** (Py+JS app) | CodeQL + Scorecard ✅ (#339); rest log-only | ✗ | ✗ | ✗ | n/a (app, not published) |
| **terraform-provider-descope** (Go) | CodeQL SARIF ✅ | ✗ | ✗ | **`attest-build-provenance` ✅** | n/a (registry release) |

## Tier-2 workstreams

### 1. Route all scanner findings to the Security tab (SARIF / code scanning)
Today only CodeQL (+ Scorecard) reach the Security tab; other scanners just pass/fail in logs. Emit SARIF (`-format sarif` / `--sarif`) + `github/codeql-action/upload-sarif` so findings dedupe, annotate PRs, and get triage/dismiss.
- **identity-model** — govulncheck, Semgrep, gitleaks, cargo-audit
- **py-identity-model** — Semgrep/SAST, pip-audit, gitleaks
- **identity-stack** — Semgrep, gitleaks, pip-audit, npm audit
- **terraform-provider-descope** — govulncheck, gosec (CodeQL already SARIF)

### 2. OSV-Scanner (unified lockfile SCA → SARIF)
A migration-plan target still unshipped everywhere. Run scheduled (daily cron) + on PR, uploading SARIF. Complements the native SCA tools with one unified OSV-DB scan across every ecosystem (incl. Actions). **All four repos.**

### 3. SBOM generation + attestation on release
No repo emits an SBOM. Generate CycloneDX/SPDX and attach + attest on release.
- **identity-model** — defer to first release (no release pipeline yet)
- **py-identity-model** — CycloneDX SBOM for the wheel(s) + `attest-build-provenance` + `attest-sbom`
- **identity-stack** — `syft` SBOM of the Docker image + provenance (+ optional `cosign` signing)
- **terraform-provider-descope** — add `attest-sbom` (provenance already present)

### 4. Provenance (SLSA) + Trusted Publishing gaps
- **identity-model** — crates.io Trusted Publishing (+ provenance) when the Rust crate / Go module first publishes
- **identity-stack** — provenance on the container image
- (py-identity-model PyPI OIDC ✅, tpd provenance ✅ — provenance-attestation still owed by §3)

### 5. Rust supply-chain tightening (identity-model)
- `deny.toml` `[bans] multiple-versions` / `wildcards`: `warn` → `deny` once the tree is clean.

## Tier-3 backlog (deeper assurance — not scheduled here)

- **Fuzzing** the untrusted-input parsers (JWT / JWKS / discovery docs): Go native `go test -fuzz` + Rust `cargo-fuzz`; **OSS-Fuzz** candidacy for the OIDC libraries.
- `#![forbid(unsafe_code)]` on the identity-model Rust crate.
- **`zizmor`** — static analysis of the workflow files themselves.
- **`step-security/harden-runner`** — CI runner egress filtering / exfiltration detection.

## Rollout notes

- One PR per repo per workstream (or per repo bundling §1+§2, which are pure CI additions and low-risk), mirroring the Tier-1 rollout.
- §1 and §2 are safe, non-release CI changes and can land immediately. §3/§4 attach to each repo's release pipeline and should ride with a release change.
- Keep gates **mechanical** (SARIF thresholds, `fail-on-severity`, cron OSV) rather than advisory — consistent with epic-19 (mechanical security gates).
