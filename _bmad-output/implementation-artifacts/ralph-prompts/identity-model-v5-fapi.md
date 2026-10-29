You are the identity-model v5 FAPI loop. Hats (`hats/identity-model-v5-fapi.yml`) split the
work: Stacker → Builder → Critic → Shipper. Each activation starts with a fresh context, so
everything you need next time goes in files: `.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

One ralph workstream per repo: don't run `identity-model-stack` alongside this loop.

## Context

- Repo: `jamescrowley321/identity-model` (Python in `py/`, Go in `go/`, Rust in `rust/`,
  shared contracts in `spec/`). Python is the canonical, OpenID-certified implementation;
  Go and Rust are pre-release (pre-1.0) and match it.
- The loop runs in its own worktree `/tmp/identity-model-v5-fapi-ralph`. Never touch
  `~/repos/auth/identity-model`, `main`, `release/v5` itself, or another session's branches.
  Other sessions work in this repo; fetch before every branch operation.
- **Stack root: `release/v5`.** py 5.0.0 collects there; identity-model#915 (`release/v5` →
  `main`) ships it. The loop never merges. The owner merges each PR bottom-up into
  `release/v5` with a merge commit. Never push to `main` or `release/v5`.
- **Why this loop exists:** the 2026-10-16 review sweep found FAPI 2.0 unmet and cache state
  on HTTP clients unsafe. Rationale, findings and decisions: Phase D2 of
  `identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-identity-model-v5-release.md`.
  Status lives in the issues (epic identity-model#904; FAPI completeness identity-model#954).
- **Owner decisions (2026-10-16), recorded on the issues:**
  - Everything in the queue ships in py 5.0.0.
  - **2026-10-27:** 5.0.0 ships without Go/Rust FAPI parity. #958 and #959, and the Go/Rust
    parts of #957, move to a separate parity loop after the release. Python-only from here.
  - `private_key_jwt` assertion `aud` defaults to the issuer whenever it is known; an explicit
    `audience` still wins (#950).
  - Python gets a default asymmetric algorithm allowlist matching Go and Rust, including
    EdDSA. This is a deliberate exception to the opt-in hardening rule (#952).
  - The transport/state cache split in #953 is approved as written.
  - `use: enc` keys are never used for signature verification, as a hard filter in all
    three languages, on both the kid and kid-less paths (#888).
  - `validate_azp=True` without a `client_id` is a configuration error (#930).
  - `ClientAuthMethod.requires_secret` is deleted with no deprecation (#934).
- Specs: FAPI 2.0 Security Profile (Final), FAPI 2.0 Message Signing (Final), RFC 9126 (PAR),
  RFC 9449 (DPoP), RFC 8705 (mTLS), RFC 9207, RFC 9701, RFC 7517, RFC 7518, RFC 8725.
  Cite section numbers in code, tests and docs.

## Queue

Work top to bottom, one story per PR, each PR stacked on the previous one. Breaking stories
(marked `!`) need `!` in the commit type and a `BREAKING CHANGE:` footer. The issue holds the
acceptance criteria; the issue wins over this table.

Already shipped (open PRs awaiting owner merge; do not rebuild):

| # | Issue | Branch | PR |
|---|---|---|---|
| 1 | #934 `!` | `refactor/934-remove-requires-secret` | #960 |
| 2 | #930 `!` | `fix/930-azp-requires-client-id` | #962 |
| 3 | #888 `!` | `fix/888-enc-keys-never-verify` | #964 |
| 4 | #953 `!` | `refactor/953-split-transport-cache-state` | #969 |
| 5 | #952 `!` | `fix/952-key-strength-alg-defaults` | #970 |
| 6 | #949 `!` | `fix/949-fapi-discovery-absent-metadata` | #971 |
| 7 | #950 `!` | `fix/950-assertion-aud-issuer` | #972 |
| 8 | #906 | `ci/906-fapi2-conformance-plans` | #973 |
| 9 | #951 `!` | `feat/951-fapi-client-profile` | #976 |
| 10 | #975 | `fix/975-fapi-profile-edge-cases` | #1015 |
| 11 | #955 | `feat/955-par-front-channel-signed-request` | #1017 |
| 12 | #956 | `feat/956-sender-constraint-completeness` | #1020 |
| 13 | #478 (core + `validate_token`) | `feat/478-rs-dpop-verification` | #1027 |

**Resume:** if `.ralph/stack-ledger.md` is missing, Stacker seeds it with rows 1–13 as
`shipped` (branch, PR, and `tip` = `git rev-parse origin/<branch>`) before picking work.

Remaining:

| # | Issue | Story |
|---|---|---|
| 14 | #1021 | FastAPI middleware: `DPoP` auth scheme, `TokenPresentation` wiring, fail-closed `WWW-Authenticate: DPoP` (rest of #478; `feat(fastapi)`) |
| 15 | #957 | Signed introspection responses, RFC 9701 — **py only**: client, discovery field, shared `spec/vectors` case with the py runner. Go/Rust runners: file a sub-issue for the parity loop and mark the vector case skipped for go/rust with that issue number |

Deferred to the post-5.0 parity loop: #958 (Go FAPI parity), #959 (Rust FAPI parity).
When row 15 ships, the queue is empty: Stacker publishes `LOOP_COMPLETE`.

Out of scope: #958, #959, the quick review follow-ups #921–#948 (except those in the queue), #842,
Cognito (#843). A story that turns out to need one of them: `build.blocked`. A large story
may be split into consecutive PRs on the stack. File the extra pieces as sub-issues of the
story's issue, and record each piece as its own ledger row.

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
- Every breaking story adds its entry to `docs/upgrade-v5.md`.
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
Stacked on #<parent PR>    (omit when base = release/v5)

## Breaking change         (only for `!` stories)
<what callers must change; matches the docs/upgrade-v5.md entry>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `identity-model-v5-fapi` (hats: Stacker, Builder, Critic, Shipper)
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
