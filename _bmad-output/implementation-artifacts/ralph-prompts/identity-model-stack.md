You are the identity-model stacked-PR loop. Hats (`hats/identity-model-stack.yml`) split the
work: Stacker → Builder → Critic → Shipper. Each activation starts with a fresh context, so
everything you need next time goes in files: `.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

**Supersedes** `pim-conformance-evidence.md` and tasks 9–10 of `identity-model-go-rust-parity.md`.
Don't run either alongside this loop. One ralph workstream per repo.

## Context

- Repo: `jamescrowley321/identity-model` (Python in `py/`, Go in `go/`, Rust in `rust/`,
  shared contracts in `spec/`). Python is the canonical, OpenID-certified implementation;
  Go and Rust are pre-release and match it.
- The loop runs in its own worktree `/tmp/identity-model-stack-ralph`. Never touch
  `~/repos/auth/identity-model`, `main`, or another session's branches. Other Claude/Codex
  sessions work in this repo; fetch before every branch operation.
- **Stack root: `main`.** The loop's job is to get the work done as one chain of PRs. It
  never merges. The owner handles merging, retargeting and release grouping (py 5.0.0 /
  `release/v5`) later, in a separate resolution session. Never push to `main` or `release/v5`.
- **Owner decisions (2026-10-10, recorded on #852):**
  - D1: azp becomes opt-in (`validate_azp`, default off), after CIT-5.
  - D2: `jwks_uri` is required unconditionally; `require_key_set=False` no longer skips it. Breaking, no deprecation cycle.
  - D3: at_hash/c_hash presence is required per bound value (access token, code), only when that value came back in the same response as the ID Token.
- Epic 25 design: `identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-25-injected-config.md`
  (ONE `cache_max_entries`, client-owned caches, Python entry points take `http_client=`).
  CIT design: `.../epics/epic-oidc-spec-citations.md` + `docs/oidc-citation-audit-2026-10-03/`.

## Queue

Work top to bottom, one story per PR, each PR stacked on the previous one. Breaking stories
(marked `!`) need `!` in the commit type and a `BREAKING CHANGE:` footer.

| # | Issue | Story |
|---|---|---|
| 0 | #869 | Rust mutation allowlist: waive mutant names containing spaces (unblocks the security gate) |
| **CIT** | #852 | **OIDC spec-citation correctness** |
| 1 | #853 | CIT-1 citations only, all languages + spec + docs + conformance |
| 2 | #854 | CIT-2 Back-Channel Logout requires `exp` |
| 3 | #855 | CIT-3 FAPI: missing REQUIRED discovery metadata is a violation |
| 4 | #856 | CIT-4 Rust base validation stops reading azp |
| 5 | #857 `!` | CIT-5 reject untrusted additional audiences |
| 6 | #774 | UserInfo `application/jwt` enforces expected sub |
| 7 | #773 | UserInfo with no `sub` is rejected |
| 8 | #858 `!` | CIT-6 azp opt-in (D1) |
| 9 | #859 | CIT-7 at_hash/c_hash presence per bound value (D3) |
| 10 | #860 | CIT-8 kid-less key selection parity (Go, Rust) |
| 11 | #771 `!` | Discovery §3 required fields + D2 |
| 12 | #861 | CIT-9 citation gate (last CIT story) |
| **CFG** | #751 | **Epic 25 injected config** |
| 13 | #752 | 25.1 plain typed `Config` |
| 14 | #759 | 25.1b optional helpers `config_from_env` / `config_from_mapping` |
| 15 | #753 `!` | 25.2 clients take `config=`; delete env readers |
| 16 | #755 | 25.4 one plain config spec page |
| 17 | #756 | 25.5 gate against env reads |
| 18 | #754 `!` | 25.3 fastapi `OIDCSettings.from_env` becomes a helper |
| 19 | #757 `!` | 25.6 Go matches Python settings |
| 20 | #758 `!` | 25.7 Rust matches Python settings |
| 21 | #867 `!` | Go + Rust block HTTP redirects like Python |
| **CERT** | #242 | **Next certification round: Dynamic RP, RP-Initiated Logout RP, Back-Channel Logout RP** |
| 22 | #607 | Hosted workflow runs every configured plan (dynamic, both logout `*-rp-basic`, fapi2) with evidence uploads |
| 23 | #473 | Logout plans green and gating |
| 24 | #471 | Feature → OIDF profile coverage matrix |
| 25 | #242 | Version-drift note + evidence export for the three profiles (owner submits) |
| **GAP** | | **KnownGap resolution** |
| 26 | #868 | Make the #791 KnownGaps conditional |
| 27 | #791 | Typed OAuth token-endpoint errors |
| 28 | #777 | Token-exchange keeps `error_uri` |
| 29 | #574 | Python `client_secret_post`, base `expected_nonce`, RFC 8414 issuer match |
| 30 | #783 | Typed token-response members |
| 31 | #772 | Typed introspection members |
| 32 | #768 | Typed UserInfo standard claims |
| 33 | #769 | UserInfo `WWW-Authenticate` challenge |
| 34 | #766 | `revocation_endpoint` in discovery |
| 35 | #782 | Introspection rejects missing/non-boolean `active` |
| 36 | #770 | Non-JSON JWKS body is a parse error |
| 37 | #778 | Client credentials extra form params |
| 38 | #784 | Cache DPoP-Nonce |
| 39 | #828 | Rust DPoP vector runners (incl. DPOP-004/008 HTTP transport) |
| 40 | #870 | Go DPoP parity with Rust |

Out of scope: FAPI 2.0 certification (#475) and its RS verifier (#478), #842 (held on COG-7),
Cognito (#843). A story that turns out to need one of them: `build.blocked`.

Certification rules: never press "Publish for certification" and never run the hosted workflow
with `publish` other than `none`. Publishing freezes the plan, and submission is the owner's job.
You may `gh workflow run conformance-hosted.yml --ref <branch> -f publish=none` to collect evidence.

## Stacking

- Every story's branch is cut from the previous story's branch. Each PR's base is that parent
  branch; the first PR's base is `main`. Every PR runs the full CI suite, whatever its base.
- **Parent** = branch of the newest `shipped` ledger row, else `main`. If that branch no longer
  exists on origin (the owner merged it mid-run), use `origin/main`.
- Don't rebase, retarget or force-push shipped branches. If the owner changes the stack
  mid-run, build on whatever the ledger's newest shipped branch is now and record it.
- Record each branch's tip SHA in the ledger when Shipper pushes; the resolution session uses it.

## Rules

- Conventional commits; the issue title's type/scope is the default. A cross-language change
  is one commit per language (`fix(py)`, `fix(go)`, `fix(rust)`, …) so release routing sees each.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage explicit paths. Never `git add -A` / `git add .`.
- Errors are typed (enums/variants), never magic strings. No inline `# noqa`; no CVE ignores.
- Spec MUSTs are unconditional; hardening beyond the spec is opt-in and default-off.
- Test assertions: deep equality and id-keyed lookups, no positional indexing or magic numbers.
- Test resources come from docker-compose fixtures, never testcontainers. Required credentials
  fail via fixture; no env flags to skip suites.
- Minimal fix: no scope creep. Out-of-scope findings become follow-up issues.
- Docs and PR text describe the library and its use, not the loop's process.
- Never mention private downstream users by name in commits, PRs, issues or docs.
- Issue/PR body edits go through `--body-file` plus a non-empty check.
- Never merge, never auto-merge, never touch branch protection.

## Gates

Run in the worktree, `PATH="$HOME/go/bin:$PATH"` (actionlint).

| Touched | Before commit | Before PR (Critic) |
|---|---|---|
| any | `make lint` (pre-commit: lint + unit tests, all languages) | same |
| `py/` behavior | `make test-unit` | `make test-integration-node-oidc` and `make test-integration-keycloak` |
| `go/` | `make test-unit-go` | `make test-integration-go` |
| `rust/` | `make test-unit-rust` | `make test-integration-rust` |
| security-control code | — | `make security-gate BASE=origin/<parent>` |
| `conformance/`, logout, discovery, token validation | — | `make conformance-test-fastapi` |

Integration red is a hard block; never rationalize a failure. Known flakes, one rerun each:
`test_cache_stampede` kid-miss under full-suite load (#650); load-smoke S2 `valid_es256` 500s
(#797); ~22 integration failures from a stale `/tmp/pytest-of-$USER` cache (delete
`node-oidc_*.json` there, then rerun). Local mutation gate: `rm -rf py/mutants/` after adding
tests, or survivors look unchanged.

Every PR, whatever its base, runs the full CI suite: build/ci, conformance, CodeQL, OSV.

## PR body template

Follow the repo's `.github/pull_request_template.md`:

```
## Summary
- <what changed and why, with spec section>

Closes #<issue>            (base = main)   |   Part of #<issue>   (stacked)
Stacked on #<parent PR>    (omit when base = main)

## Breaking change         (only for `!` stories)
<what callers must change>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `identity-model-stack` (hats: Stacker, Builder, Critic, Shipper)
- Model(s): Claude Opus 5.5 (claude-opus-5-5); blind-peer-review lenses as run (see comments)
- [ ] A human has reviewed this change and is accountable for it   ← leave unchecked; the owner (James Crowley) checks it at review

## Checklist
- [ ] CI is green
- [x] Tests added/updated where appropriate (make lint, <integration targets run>)
- [x] Docs updated if behavior changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Never check the human-accountability box yourself.

## Ledger template (`.ralph/stack-ledger.md`)

```
| # | issue | status | branch | parent | parent tip | tip | PR | note |
|---|---|---|---|---|---|---|---|---|
```
Status: `in_progress` → `shipped` | `blocked` | `skipped`.
