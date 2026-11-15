You are the identity-model v5 conformance loop. Hats (`hats/identity-model-v5-conformance.yml`)
split the work: Stacker → Builder → Critic → Shipper. Each activation starts with a fresh
context, so everything you need next time goes in files: `.ralph/stack-ledger.md` and
`.ralph/specs/<issue>/`.

One ralph workstream per repo: don't run another identity-model loop alongside this one.

## Context

- Repo: `jamescrowley321/identity-model`. Python is in `py/`, the fastapi package in
  `py/packages/fastapi-identity-model/`, and the OIDF harness in `conformance/` (`app.py`,
  `run_tests.py`, `configs/`, `expected_modules.json`, `tests/`). Python is the canonical,
  OpenID-certified implementation. Go and Rust are out of scope for this loop.
- The loop runs in its own worktree, `/tmp/identity-model-v5-conformance-ralph`. Never touch
  `~/repos/auth/identity-model`, `main`, `release/v5` itself, or another session's branches.
  Other sessions work in this repo, so fetch before every branch operation.
- **Stack root: `release/v5`.** py 5.0.0 collects there, and identity-model#915 (`release/v5` →
  `main`) ships it. The loop never merges. The owner merges each PR bottom-up into
  `release/v5` with a merge commit. Never push to `main` or `release/v5`.
- **Why this loop exists:** "Tests must come prior to v5" (James, 2026-11-15). CI runs 6 of
  about 32 applicable OIDF RP plans, and some runs can pass for the wrong reason.
  - Rationale: `identity-stack-planning/_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-15.md`.
  - Stories with Given/When/Then: `.../planning-artifacts/epics/epic-identity-model-v5-conformance.md`.
  - Status lives in the issues, under epic identity-model#904.
- Suite: `release-v5.3.4` (pinned by #1130). Plan and module sources are at
  gitlab.com/openid/conformance-suite, tag `release-v5.3.4`, under
  `src/main/java/net/openid/conformance/` (`openid/client/`, `openid/client/logout/plan/`,
  `fapi2spfinal/`). Read the plan class before writing a config or manifest. Never guess
  variant keys.
- Specs: OIDC Core 1.0 (incl. §3.1.3.7, §3.2/§3.3 hybrid/implicit, §12.2), OIDC Discovery,
  Dynamic Client Registration, RP-Initiated Logout 1.0, Back-Channel Logout 1.0, Form Post
  Response Mode, FAPI 2.0 Security Profile and Message Signing (Final), RFC 9126, RFC 9449,
  RFC 8705, RFC 9207. Cite section numbers in code, tests and docs.

## Precondition

The loop builds on top of these fix PRs. They all target `release/v5`, and most edit
`conformance/`. Stacker refuses to start until every one is MERGED:

#1121, #1124, #1126, #1128, #1129, #1130, #1132, #1136

## Queue

Work top to bottom, one story per PR, each PR stacked on the previous one. The issue holds the
acceptance criteria, and the issue wins over this table and the epic doc.

| # | Issue | Story (epic doc) | Branch type |
|---|---|---|---|
| 1 | #1138 | D3.1 harness passes `nonce=`; `nonce` reason required | `test(conformance)` |
| 2 | #1131 (Python part only) | D3.2 typed `TokenValidationException` kind; manifests require it; fastapi discovery kind | `feat(py)` + `test(conformance)` |
| 3 | #1139 | D3.3 dynamic + logout plans pass on 5.3.4; `no-state` fix; drop stale evidence | `test(conformance)` |
| 4 | #607 + #473 | D3.4 make targets + blocking CI for dynamic + logout | `ci(conformance)` |
| 5 | #1082 | D3.5 one owner per evidence file | `ci(conformance)` |
| 6 | #1141 | D3.6 Config per client auth method + Comprehensive plan | `test(conformance)` |
| 7 | #1142 | D3.7 remaining FAPI 2.0 variants | `test(conformance)` |
| 8 | #1143 | D3.8 hybrid + implicit plans | `test(conformance)` |
| 9 | #1144 | D3.9 refreshed ID token continuity (§12.2) + refresh-token plan | `feat(py)` + `test(conformance)` |
| 10 | #880 | D3.10 verify invalid-alternate-alg rejects with the alg kind; close with evidence | `test(conformance)` |

Notes:
- #607 is "Part of" Epic 23. Its FAPI2 scope already shipped via #906; only dynamic and logout remain.
- #1131's Go/Rust shared-`kid` item and its Out-of-scope list belong to others (parity #1145,
  owner #1140). Don't build them here.
- A run that exposes a real library bug: fix it in-story if it's small and inside the story's
  spec area (a `fix(py)` commit, with a test that fails first). Otherwise file an issue under
  #904 and publish `build.blocked` naming it.
- When row 10 ships, the queue is empty and Stacker publishes `LOOP_COMPLETE`.

Out of scope: Go/Rust (#1145, Epic 26), branch protection and required checks (#1140, owner),
FAPI1, certification publishing, Gate B items not listed above. A story that turns out to
need one of them: `build.blocked`. A large story may be split into consecutive PRs on the stack.
File the extra pieces as sub-issues of the story's issue, and record each piece as its own
ledger row.

Certification rules: never press "Publish for certification", and never run the hosted
workflow with `publish` set to anything but `none`. You may run
`gh workflow run conformance-hosted.yml --ref <branch> -f publish=none` to collect evidence.

## Stacking

- Every story's branch is cut from the previous story's branch. Each PR's base is that parent
  branch; the first PR's base is `release/v5`. Every PR runs the full CI suite, whatever its base.
- **Parent** = the branch of the newest `shipped` ledger row, else `release/v5`. If that
  branch no longer exists on origin (the owner merged it mid-run), use `origin/release/v5`.
- Don't rebase, retarget or force-push shipped branches. If the owner changes the stack
  mid-run, build on the ledger's newest shipped branch and record it.
- Record each branch's tip SHA in the ledger when Shipper pushes.

## Rules

- Conventional commits; the issue title's type/scope is the default. A library change and its
  conformance wiring are separate commits (`feat(py)` / `fix(py)` / `fix(fastapi)`, then
  `test(conformance)` / `ci(conformance)`) so release routing sees the library change.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage explicit paths. Never `git add -A` / `git add .`.
- Errors are typed (enums/variants), never magic strings. Manifest reasons map to typed kinds.
  No inline `# noqa`; no CVE ignores.
- Spec MUSTs are unconditional, with no option to turn them off. Hardening beyond the spec is
  opt-in and off by default.
- The harness never re-implements a check the library offers; it calls the library.
- A negative module passes only on its specific expected reason. Never widen a manifest entry,
  add an allowlist entry or mark a module `accept` to get green. A justified allowlist entry
  cites the suite source line that makes the module untestable.
- A plan that can't run (missing key, suite feature absent) fails loudly. It never skips silently.
- Test assertions: deep equality and id-keyed lookups, no positional indexing or magic numbers.
- Spec vectors under `spec/` are normative. A library behavior change updates the vector and
  the Python runner in the same story. Go/Rust runners for a new vector: file under #1145 and
  mark them as a known gap the way existing vectors do.
- Test resources come from docker-compose fixtures, never testcontainers. Required credentials
  fail via fixture, with no env flags to skip suites.
- A breaking library change adds its entry to `docs/upgrade-v5.md`.
- Minimal fix, no scope creep. Out-of-scope findings become follow-up issues.
- Docs and PR text describe the library and its use, not the loop's process.
- Never mention private downstream users by name in commits, PRs, issues or docs.
- Issue/PR body edits go through `--body-file` plus a non-empty check.
- Never merge, never auto-merge, never touch branch protection.

## Gates

Run in the worktree, with `PATH="$HOME/go/bin:$PATH"` (actionlint) and `GOTOOLCHAIN=go1.26.10`.
Heavy docker targets share compose projects with other sessions: wrap them in
`flock /tmp/identity-model-integration.lock`.

| Touched | Before commit | Before PR (Critic) |
|---|---|---|
| any | `make lint` (pre-commit: lint + unit tests, all languages) | same |
| `conformance/` | `make conformance-test-harness` | `make conformance-test` + `make conformance-test-fastapi` + every plan the story adds or changes, run locally on the 5.3.4 suite |
| `.github/workflows/` | `make lint` (actionlint) | the PR's own CI run shows the new step executed and blocking |
| `py/` behavior | `make test-unit` | `make test-integration-node-oidc` and `make test-integration-keycloak` |
| fastapi package | `make test-fastapi` | same + `make conformance-test-fastapi` |
| security-control code | — | CI runs the mutation gate; check the job after push |

Integration red is a hard block; never rationalize a failure. Known flakes get one rerun each:
- `test_cache_stampede` kid-miss under full-suite load (#650).
- Load-smoke S2 `valid_es256` 500s (#797).
- About 22 integration failures from a stale `/tmp/pytest-of-$USER` cache: delete
  `node-oidc_*.json` there, then rerun.
- A Docker Hub pull TLS timeout: retry the pull.

## PR body template

Follow the repo's `.github/pull_request_template.md`:

```
## Summary
- <what changed and why, with spec section / suite plan name>
- <plans and modules now covered; the reason each negative module requires>

Part of #<issue>
Stacked on #<parent PR>    (omit when base = release/v5)

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `identity-model-v5-conformance` (hats: Stacker, Builder, Critic, Shipper)
- Model(s): Claude Opus 5.5 (claude-opus-5-5); blind-peer-review lenses as run (see comments)

## Checklist
- [ ] CI is green
- [x] Tests added/updated where appropriate (make lint, <conformance and integration targets run>)
- [x] Docs updated if behavior changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Ledger template (`.ralph/stack-ledger.md`)

```
| # | issue | status | branch | parent | parent tip | tip | PR | note |
|---|---|---|---|---|---|---|---|---|
```
Status: `in_progress` → `shipped` | `blocked` | `skipped`.
