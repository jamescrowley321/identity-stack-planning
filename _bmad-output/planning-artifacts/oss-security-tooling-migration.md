# OSS Security & Quality Tooling Migration

**Status:** planned · **Created:** 2026-07-21 · **Owner:** James

Replace the proprietary, token-gated tools (Snyk, SonarCloud) with open-source
equivalents standardized across all four active repos. Goal: **zero paid tokens,
no coverage regression, one shared `security.yml` pattern.**

## Motivation

- **Snyk** (tpd only) requires a paid `SNYK_TOKEN`. On `main` its steps are gated
  `if: SNYK_TOKEN != ''` so they silently skip — dead weight that keeps generating
  dependabot action-bumps and failed hardening attempts (see closed PR #169).
- **SonarCloud** (py-identity-model) requires `SONAR_TOKEN`. The Sonar project was
  deleted on the SonarCloud side (2026-07-21), so `sonarcloud.yml` — which runs on
  **every push to main and every PR** — will now fail CI. Removal is time-sensitive.
- Snyk/Sonar coverage is almost entirely **redundant** with OSS tools the repos
  already run (CodeQL, govulncheck, gitleaks, Semgrep, pip-audit, npm audit, ruff,
  golangci-lint).

## Decisions (locked 2026-07-21)

| Concern | Drop | OSS replacement |
|---|---|---|
| Dependency vulns (SCA) | Snyk Open Source | **OSV-Scanner** (unified, Google, no token) + native `govulncheck`/`pip-audit`/`npm audit`/`cargo-audit` + Dependabot alerts |
| SAST | Snyk Code | **CodeQL** (public repos, free) + **Semgrep OSS** (baseline, works everywhere incl. private) |
| Secrets | — | **gitleaks** |
| Code quality / smells | SonarCloud | **native linters** — `golangci-lint` (enable `goconst`,`dupl`,`gocyclo`,`gocritic`), `ruff`, `eslint`, `clippy`. No dashboard. |
| Coverage | SonarCloud | existing CI gates — `pytest-cov` (80% in py-identity-model), `go test -cover`. Codecov optional. |
| Continuous monitoring | Snyk Monitor | **Dependabot** (already on all repos) + **scheduled OSV-Scanner** (daily cron) |

**Related decision:** `identity-model` will be **made public** (owner approved
2026-07-21). Once public, CodeQL is free there too, so CodeQL + Semgrep can be the
uniform SAST baseline across all four repos with no public/private split.

## Current-state inventory

| Repo | Visibility | Proprietary (remove) | OSS already present | Gaps to fill |
|---|---|---|---|---|
| **terraform-provider-descope** | public (fork) | Snyk job (security.yml L64–94); orphan `sonar-project.properties` | CodeQL, govulncheck, gitleaks, Scorecard, golangci-lint | OSV-Scanner; enable golangci smell linters |
| **py-identity-model** | public | `sonarcloud.yml`, `sonar-project.properties` | CodeQL, Dependabot, ruff, pytest-cov 80% | OSV-Scanner, gitleaks, Semgrep (opt) |
| **identity-stack** | public | none | Semgrep, pip-audit, npm audit, gitleaks, ruff, eslint | OSV-Scanner (unify SCA) — optional |
| **identity-model** | private → **public** | none | golangci-lint, clippy/cargo (ci.yml) | govulncheck, cargo-audit/deny, OSV-Scanner, Semgrep, gitleaks, CodeQL (after public) |

**Key finding:** removing Snyk from tpd and Sonar from py-identity-model causes **no
coverage loss** — every function they served is covered by an OSS tool already in the
repo or added below.

## Per-repo work

### 1. py-identity-model — **urgent** (broken Sonar)
- **Remove:** `.github/workflows/sonarcloud.yml`, `sonar-project.properties`.
- **Add:** OSV-Scanner (reusable workflow, PR + daily cron); gitleaks job; (optional) Semgrep OSS.
- **Keep:** CodeQL, Dependabot, ruff, pytest-cov 80% gate.
- **Verify:** CI green with no `SONAR_TOKEN`; SCA now actively scanning Python deps (was Dependabot-only).

### 2. terraform-provider-descope — cleanup
- **Remove:** Snyk job (security.yml L64–94) + `SNYK_TOKEN` env; delete orphan `sonar-project.properties`.
- **Add:** OSV-Scanner job; enable `goconst`,`dupl`,`gocyclo`,`gocritic` in `.golangci.yml`.
- **Keep:** CodeQL, govulncheck, gitleaks, Scorecard.
- **Note:** stack on top of / after #181 (the consolidated dep + govulncheck fix) to avoid conflicts.

### 3. identity-model — bring to baseline + open-source
- **Pre-flight (before making public):** scan full git history for secrets
  (`gitleaks detect --log-opts="--all"`); confirm LICENSE + README are publish-ready.
- **Make public.**
- **Add:** govulncheck (Go), cargo-audit or cargo-deny (Rust), OSV-Scanner (unified),
  Semgrep + CodeQL (SAST), gitleaks (secrets), enable golangci smell linters + clippy.
- **Keep:** golangci-lint, existing ci.yml.
- Largest lift — currently thinnest security posture.

### 4. identity-stack — standardize (lowest priority)
- **Remove:** nothing.
- **Add:** OSV-Scanner to unify backend+frontend SCA under one report (can later retire
  standalone pip-audit/npm audit steps, or keep as defense-in-depth).
- **Keep:** Semgrep, gitleaks, ruff, eslint.

## Shared `security.yml` template (target pattern)

Every repo converges on a `security.yml` with these OSS jobs (language-appropriate subset):

```yaml
name: Security
on:
  push: { branches: [main] }
  pull_request:
  schedule: [{ cron: '0 6 * * *' }]   # daily monitor (replaces Snyk Monitor)
permissions:
  contents: read
  security-events: write              # for CodeQL/SARIF upload (public repos)
jobs:
  osv-scanner:        # SCA — replaces Snyk Open Source (no token)
    uses: google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml@<pinned-sha>
  semgrep:            # SAST baseline — works on public + private, no token
    # returncode-gated on high severity
  gitleaks:           # secrets
  codeql:             # SAST (public repos only; free)
  # native linters (govulncheck / golangci-lint / ruff / eslint / clippy) stay in
  # their existing lint/CI workflows or move here per repo convention
```

Accepted findings are suppressed via a checked-in `osv-scanner.toml` (with justification
+ expiry), not by disabling the scan.

## Rollout order (one PR per repo)

1. **py-identity-model** — remove Sonar (urgent, unblocks CI) + add OSV-Scanner/gitleaks.
2. **terraform-provider-descope** — remove Snyk + orphan Sonar config, add OSV-Scanner (after #181).
3. **identity-model** — secret-history pre-check → make public → add full OSS baseline.
4. **identity-stack** — add OSV-Scanner to standardize (optional / last).

## Per-PR verification checklist

- [ ] All jobs green with **no** repository secrets/tokens required.
- [ ] Each removed Snyk/Sonar check maps to a named OSS replacement (no silent coverage drop).
- [ ] OSV-Scanner findings triaged; accepted ones in `osv-scanner.toml` with justification.
- [ ] gitleaks baseline established for any pre-existing false positives.
- [ ] No new required status check references a deleted token.

## Risks & notes

- **OSV-Scanner may surface findings native tools missed** → triage on first run; use
  severity threshold + `osv-scanner.toml` ignores for accepted risk.
- **CodeQL is free only on public repos.** Semgrep OSS is the portable baseline; keep
  CodeQL where free. identity-model gets CodeQL only after it's public.
- **Making identity-model public is irreversible-ish** (history is exposed) — the
  gitleaks full-history scan is a hard gate before flipping visibility.
- **Dependabot already enabled** on all repos — no change needed for it.
