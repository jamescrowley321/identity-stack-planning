# Security-Tab Findings — Cross-Repo Triage Plan

**Status:** planned · **Created:** 2026-08-03 · **Owner:** James · **Scope:** code-scanning (Security tab) alerts across all four active repos · **Follows:** [`oss-security-tooling-tier2.md`](./oss-security-tooling-tier2.md)

Once Tier-1/Tier-2 wiring merged, CodeQL + OpenSSF Scorecard + OSV-Scanner + Semgrep began publishing to each repo's Security tab. This plan triages the resulting **~189 open alerts** into fix / dismiss-with-reason / accept, prioritised so real vulnerabilities get attention and noise gets closed with a documented rationale.

> Note on API: dismissing a code-scanning alert takes `dismissed_reason` ∈ `{"false positive", "won't fix", "used in tests"}` (spaces, not underscores) via `PATCH /repos/{o}/{r}/code-scanning/alerts/{n}`.

## Inventory (open alerts, 2026-08-03)

| Repo | CodeQL | Semgrep | OSV-Scanner | Scorecard | Total |
|---|---:|---:|---:|---:|---:|
| identity-model | 4 | 0 | 53 | 14 | **71** |
| identity-stack | 2 | 2 | 45 | 22 | **71** |
| py-identity-model | 0 | 0 | 2 | 39 | **41** |
| terraform-provider-descope | 0 | 0 | 1 | 5 | **6** |
| **Total** | **6** | **2** | **101** | **80** | **189** |

*(OSV lists many advisories twice — once per lockfile/manifest location — so distinct-advisory counts are roughly half the OSV column.)*

## Triage buckets & dispositions

### Bucket A — Real dependency vulnerabilities → **FIX (bump)**  · Priority **P0**
Genuine advisories in shipped/runtime deps. **Dependabot already has bumps open**: identity-stack **7 PRs**, tpd **1**, identity-model **1** (pim 0).

- **identity-stack** (the auth app — highest exposure): runtime — `pyjwt@2.12.1` (5 CVEs: 48522–48526), `starlette@0.52.1` (5 CVEs: 48710/48817/48818/54282/54283), `cryptography@46.0.6` (CVE-2026-39892), `urllib3@2.6.3`, `mako@1.3.10`, `react-router@7.18.1`, `msgpack`, `click`, `idna`. Dev-only (lower priority): `pip`, `pytest`, `pygments`.
- **terraform-provider-descope**: `golang.org/x/crypto@0.53.0` (1 advisory).
- **identity-model / py-identity-model**: `idna@3.9.0` (CVE-2026-45409) in the **conformance harness** (`conformance/requirements.txt`) — not shipped library code; bump or accept.
- **Action:** review + **consolidate** the open Dependabot PRs (one per repo, per house rule) and merge, prioritising runtime deps (`pyjwt`, `starlette`, `cryptography`, `urllib3`, `x/crypto`) over dev-only. This also clears Scorecard's `Vulnerabilities` finding.

### Bucket B — Confirmed false positives / test-only → **DISMISS**  · Priority **P1**
- **identity-model** — 4× **CRITICAL** CodeQL `rust/hard-coded-cryptographic-value` @ `rust/src/jwt/{options,claims}.rs`. **FP:** every instance is `.expected_nonce("" | "n-123")` inside `#[test]` fns — the **OIDC protocol `nonce` claim** (anti-replay), not a cryptographic nonce/IV. → dismiss `used in tests`.
- **identity-model** — OSV `rsa@0.9.10` = **RUSTSEC-2023-0071** (Marvin side-channel), no fixed release; verification-only client never does the private-key op. Already accepted in `deny.toml`/`cargo-audit`. → dismiss `won't fix`.
- **identity-stack** — 2× CodeQL `py/incomplete-url-substring-sanitization` @ `backend/tests/e2e/test_authenticated_ui.py` (test assertions) → verify then dismiss `used in tests`.
- **identity-stack** — 2× Semgrep `detected-jwt-token` @ `scripts/test-*.sh` (test fixtures; gitleaks owns secrets). → dismiss `used in tests` **and** add the `detected-jwt-token` exclude for `scripts/` (identity-model already excludes this rule) to stop recurrence.

### Bucket C — OSV Go-stdlib-by-version noise → **FIX directive / ACCEPT**  · Priority **P2**
- **identity-model** — 50 OSV alerts are all `stdlib@1.26.0` CVEs, flagged purely by the `go 1.26.0` directive. **`govulncheck` (reachability-aware) is green**, so none are reachable; stdlib patching is the consumer's responsibility for a library.
- **Action (durable fix):** bump the `go` directive in `go/go.mod` and `conformance/rp-go/go.mod` to the latest 1.26.x patch (`go mod tidy`) — clears the advisories fixed in that patch; dismiss any residual as `won't fix` (not reachable per govulncheck). Prevents the flood recurring each scan.

### Bucket D — Scorecard posture (80 alerts) → **mixed**  · Priority **P3**
Not code vulnerabilities — repo-hardening metrics. Dominant checks:
- **PinnedDependencies** (medium; pim 29, identity-stack 13, identity-model 8, tpd 0): investigate — likely pip/Docker base-image pinning or a **stale scan** predating the Tier-1 action-SHA-pinning (tpd, already fully pinned, shows 0). Re-run Scorecard post-merge before acting.
- **TokenPermissions** (high; pim 6, identity-stack 3): **FIX** — add minimal `permissions:` blocks to the older release/publish workflows that lack them (cheap, safe).
- **Vulnerabilities** (high; im/is/tpd): resolves with **Bucket A**.
- **CodeReview** (high, all repos): **ACCEPT** — solo maintainer merges own PRs; can't satisfy without a second reviewer.
- **Fuzzing** (medium, all repos): **DEFER to Tier-3** (OSS-Fuzz / `cargo-fuzz` / `go test -fuzz`).
- **BranchProtection** (high; pim, tpd): partial **ACCEPT** — protection is set with 0 required approvals (solo); Scorecard wants ≥1.
- **SAST** (medium; im, is): likely stale (CodeQL+Semgrep are wired) — re-check post-merge.
- **CII-Best-Practices** (low, all) / **License** (low, is): **ACCEPT / optional** (OpenSSF badge, license-file placement).

## Prioritised worklist

1. **P0 — dep bumps:** consolidate + merge Dependabot PRs (identity-stack ×7, tpd ×1, identity-model ×1); prioritise runtime deps. Bump conformance `idna`. → also clears Scorecard `Vulnerabilities`.
2. **P1 — dismiss FPs** (8 alerts) with the documented reasons above; add identity-stack's `detected-jwt-token` scripts exclude.
3. **P2 — identity-model `go` directive bump** to clear the 50 stdlib advisories; dismiss residual as unreachable.
4. **P3 — Scorecard:** fix `TokenPermissions`; re-run Scorecard to clear stale `PinnedDependencies`/`SAST`; accept `CodeReview`/`Fuzzing`(→Tier-3)/`CII`/`BranchProtection`.

## Notes
- Re-running each repo's Scorecard + OSV after the P0/P2 merges will naturally clear a large fraction of D and A before any manual dismissal.
- Keep dismissals mechanical and reasoned (per epic-19): every dismissal carries a `dismissed_comment` explaining why, so the Security tab stays a live signal, not a graveyard.
