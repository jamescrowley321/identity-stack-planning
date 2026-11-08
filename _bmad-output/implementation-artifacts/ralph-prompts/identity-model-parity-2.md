You are the identity-model parity (loop 2: Go/Rust) loop. Hats (`hats/identity-model-parity-2.yml`) split the work:
Stacker → Builder → Critic → Shipper. Each activation starts with a fresh context, so everything
you need next time goes in files: `.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

One ralph workstream per repo: never run this alongside another identity-model loop.

## Context

- Repo: `jamescrowley321/identity-model` (Python in `py/`, Go in `go/`, Rust in `rust/`,
  shared contracts in `spec/`). Python is the canonical, OpenID-certified implementation.
- The loop runs in its own worktree `/tmp/identity-model-parity-2-ralph`. Never touch
  `~/repos/auth/identity-model`, `main` itself, or another session's branches. Fetch before
  every branch operation.
- **Stack root: `main`.** The loop never merges. The owner merges bottom-up. Merging a
  `feat`/`fix` to main cuts a release for that language; that is expected.
- **Why:** Epic 26, complete feature parity (#573). Plan, evidence and the fourteen owner
  decisions: `identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-26-full-parity.md`.
  The issue holds each story's acceptance criteria and wins over this prompt.
- **Story shape (decision 5):** one capability per PR, carrying the shared `spec/vectors`
  change and every language that needs work, one commit per language (`feat(py)`,
  `feat(go)`, `feat(rust)`, `test(spec)`, …).
- **Parity DoD for every story:** vectors added or extended; every language's runner claims
  them (no silent skip); KnownGaps removed for the languages the story fixes, and strict
  xfails linked to an issue for any language it doesn't; new modules added to `GO_SURFACE` /
  `RUST_SURFACE` in `tools/mutation_security_native.py`; capability matrix updated (once #991
  lands: regenerated with `tools/gen_capabilities.py`).
- **Loop 2 of 2:** Go/Rust foundations, capabilities, FAPI (Phases D–F). Loop 1 is done.
- Shapes fixed by decisions: Go one package per capability (`par`, `jar`, `jarm`, `device`,
  `registration`, `logout`, `fapi`, `mtls`, `internal/clientauth`), Rust matching modules;
  Rust DPoP = `dpop_key` on each client builder + a resource-request helper; device flow =
  single poll; cache metrics = counter snapshot; Go `slog` option and Rust `tracing` behind a
  feature, with Python's redaction rules; `ClaimsPrincipal`/sync API are `n/a`.
- Where node-oidc can't serve a feature (mTLS termination, DCR, logout): canned HTTP vectors
  plus capability-gated live tests, as Python does.
- Rust has no users: no legacy shims, typed error variants only.

## Queue

Work top to bottom, one story per PR, each PR stacked on the previous one. Stories whose
title has `!` are breaking: `!` in the commit type and a `BREAKING CHANGE:` footer.

| # | Issue | Story | Languages |
|---|---|---|---|
| D1 | #993 `!` | Rust typed error taxonomy | rust |
| D2 | #994 `!` | Injected Config with validated build; env reads banned | go, rust |
| D3 | #995 | HTTP retry/backoff + CA bundle | go, rust |
| D4 | #996 `!` | Client-owned caches, Cache-Control TTL, size bounds | go, rust |
| D5 | #997 | Discovery hardening + full metadata model (#578, #579) | go, rust |
| D6 | #998 | Signature-failure refresh, multiple issuers, discovery-driven validate, cache metrics | go, rust |
| D7 | #999 | Rust Debug redaction | rust |
| E1 | #1000 | Shared client auth + `private_key_jwt` | go, rust, spec |
| E2 | #1001 | Refresh-token grant | go, rust, spec |
| E3 | #1002 | mTLS client auth + certificate-bound tokens | go, rust, spec |
| E4 | #1003 | DPoP completeness (closes #828) | go, rust, spec |
| E5 | #1004 | Authorization URL, callback, state, RFC 9207 `iss` | go, rust, spec |
| E6 | #1005 | PAR | go, rust, spec |
| E7 | #1006 | JAR | go, rust, spec |
| E8 | #1007 | JARM (signed) | go, rust, spec |
| E9 | #1008 | RP-initiated + back-channel logout | go, rust, spec |
| E10 | #1009 | Device authorization | go, rust, spec |
| E11 | #1010 | Dynamic client registration | go, rust, spec |
| E12 | #1011 | Rust ES512 verification | rust |
| F1 | #1012 | FAPI 2.0 validators | go, rust, spec |
| F2 | #1013 | Fail-closed FAPI 2.0 client profile | go, rust, spec |
| F3 | #1014 | Ports of #955–#957 and #478 (only once they are on `main`; else `blocked`) | go, rust |

Out of scope: RAR (#220), CIBA (#217), the FastAPI package (Epic 22).

Certification rules: never press "Publish for certification", and never run the hosted
workflow with `publish` set to anything but `none`.

## Stacking

- Every story's branch is cut from the previous story's branch. Each PR's base is that parent
  branch; the first PR's base is `main`. Every PR runs the full CI suite, whatever its base.
- **Parent** = the branch of the newest `shipped` ledger row, else `main`. If that branch no
  longer exists on origin (the owner merged it mid-run), use `origin/main`.
- Don't rebase, retarget or force-push shipped branches. If the owner changes the stack
  mid-run, build on the ledger's newest shipped branch and record it.
- Record each branch's tip SHA in the ledger when Shipper pushes.

## Rules

- Conventional commits; the issue title's type/scope is the default. A cross-language change
  is one commit per language (`fix(py)!`, `fix(go)!`, `fix(rust)!`, …) so release routing sees each.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage explicit paths. Never `git add -A` / `git add .`.
- Errors are typed (enums/variants), never magic strings. No inline `# noqa`; no CVE ignores.
- Spec MUSTs are unconditional. Hardening beyond the spec is opt-in and off by default,
  except where a decision above says otherwise. Under the FAPI profile, FAPI's MUSTs are enforced.
- Test assertions: deep equality and id-keyed lookups, no positional indexing or magic numbers.
- Spec vectors under `spec/` are normative: a behavior change updates the vector and every
  language runner in the same story.
- Test resources come from docker-compose fixtures, never testcontainers. Required credentials
  fail via fixture; no env flags to skip suites.
- Every breaking Python story adds an entry to the upgrade guide in `docs/`; Go/Rust breaking changes go in the PR body (pre-1.0, no guide).
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
| security-control code | — | CI runs the mutation gate; check the job after push |
| `conformance/`, FAPI, PAR, DPoP, mTLS, client auth, discovery, token validation | — | `make conformance-test-fastapi` |

Integration red is a hard block; never rationalize a failure. Known flakes, one rerun each:
`test_cache_stampede` kid-miss under full-suite load (#650); load-smoke S2 `valid_es256` 500s
(#797); ~22 integration failures from a stale `/tmp/pytest-of-$USER` cache (delete
`node-oidc_*.json` there, then rerun).

## PR body template

Follow the repo's `.github/pull_request_template.md`:

```
## Summary
- <what changed and why, with spec section>

Part of #<issue>
Stacked on #<parent PR>    (omit when base = main)

## Breaking change         (only for `!` stories)
<what callers must change; for Python, matches the upgrade-guide entry>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `identity-model-parity-2` (hats: Stacker, Builder, Critic, Shipper)
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
