You are the identity-model Go certification loop. Hats (`hats/identity-model-cert-go.yml`) split the work:
Stacker → Builder → Critic → Shipper. Each activation starts with a fresh context, so everything
you need next time goes in files: `.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

## Goal

The Go library (`go/`) passes the OpenID Foundation RP certification plans **Basic RP, Config
RP and Form Post Basic RP**: green on the local suite in CI and green on the hosted suite
(certification.openid.net), with every negative module rejected for the reason the manifest
names. Target: submittable by Sunday 29 Nov 2026. Submission itself is the owner's job.

## Context

- Repo: `jamescrowley321/identity-model` (Python `py/`, Go `go/`, Rust `rust/`, shared
  contracts `spec/`, OIDF harnesses `conformance/`). Python is the certified reference; its
  harness is `conformance/app.py`.
- **Isolation.** The loop runs in its own clone `/tmp/identity-model-cert-go-clone` with the
  worktree `/tmp/identity-model-cert-go-ralph` (`RALPH_CLONE=1 run.sh …`). Never touch
  `~/repos/auth/identity-model`, `main` itself, or another session's branches. Fetch before
  every branch operation.
- **A sibling loop runs at the same time:** `identity-model-cert-rust`, owning `rust/` and
  `conformance/rust/`. The two loops never edit the same file. See "File ownership".
- **Priority: run this language against the official OIDF suite as early as possible.** The
  harness and a first hosted run come before any library fix; real suite verdicts decide what
  gets fixed.
- **Stack root: `origin/release/v5` while it exists, else `origin/main`.** py 5.0.0
  (identity-model#915) merges `release/v5` into `main` mid-run; after that, new stories root on
  `main` and open PRs stay where they are (the owner retargets). The loop never merges.
- **Gate (Stacker checks on `build.start`):** the root branch has the shared harness plumbing
  (identity-model#1198, PR #1200): `git show origin/<root>:conformance/run_tests.py | grep -q
  -- '--harness'`. Missing → `LOOP_COMPLETE` with "blocked: #1200 not merged".
- **Discovery semantics after identity-model#1197:** discovery takes the issuer and matches
  it exactly. The Go harness follows the same rule.

## What the library already does (verified 2026-11-25 against `release/v5` @ `bd3c5c5`)

Every module in the three plans already gets the right verdict from a typed Go error:

| Module(s) | Expected | Go path |
|---|---|---|
| client-test, idtoken-sig-rs256, scope-userinfo-claims, client-secret-basic | accept | `token.AuthorizationCode` (Basic auth default), `jwks.FetchKeySet`, `idtoken.ValidateIDToken`, `userinfo.Fetch` |
| invalid-iss / invalid-aud / missing-iat | reject `invalid_issuer` / `invalid_audience` / `invalid_issued_at` | `jwt.ClaimValidationError{Claim: "iss"/"aud"/"iat"}` |
| missing-sub, nonce-invalid | `invalid_subject`, `nonce_mismatch` | `idtoken.ProfileError` `ReasonMissingSub` / `ReasonNonceMismatch` (harness always passes `WithNonce`, `WithClientID`, `WithIssuer`) |
| idtoken-sig-none | `alg_none` (SKIPPED allowed) | `jwt.AlgNoneError` |
| invalid-sig-rs256 | `invalid_signature` | `jwt.SignatureError` |
| kid-absent-single-jwks / -multiple-jwks | accept / `key_selection` | `jwks.ResolveSigningKey` / `jwks.AmbiguousKeyError` |
| userinfo-invalid-sub | `userinfo_validation` | `userinfo.WithSubjectValidation` → `SubjectMismatchError` |
| Config: discovery-openid-config, jwks-uri-keys | accept | `discovery.FetchConfiguration`, `jwks.FetchKeySet` |
| Config: discovery-issuer-mismatch | `issuer_mismatch` | `discovery.IssuerMismatchError` (exact match) |
| Config: signing-key-rotation(-just-before-signing) | accept | unknown kid forces one refresh; `ClearCache` resets cooldown. **Unverified** if the suite rotates under the same kid. |

The hosted suite serves a junk `P-9999` key in its JWKS. Go skips unusable keys today; keep it
that way. So the work is the harness, then only what a real run proves is missing. Re-check
this table against the stack root before building; the code wins.

## Queue

| # | Issue | Story | Notes |
|---|---|---|---|
| G1 | #1145 | Go RP harness (`conformance/go/`), local suite green for all three plans in CI | Go half only. `Part of #1145`. |
| G2 | #1145 | Hosted run green for all three plans, rp-logs reasons checked | Evidence story: see "Exit criteria". No code unless the run finds a gap. |
| G3 | #998 | Go only: refetch JWKS once on signature failure | **Conditional:** only if a rotation module fails in G1/G2. Else `skipped` with the run link. |
| G4 | #1153 | Go only: same-`kid` keys of different `kty` → pick by `kty`/`alg`/`crv` | **Conditional:** only if a positive module fails on key choice. Else `skipped`. |

**The queue continues with "Phase 2" below (rows P1–P5, each a plan group): the loop is not done until phase 2 is.**

A G1/G2 failure that is not G3/G4: add a story row for the issue that covers it (search
`gh issue list -l parity`), or file one, and record why in the ledger note. Stay inside the
three plans.

Out of scope for phase 1 (phase 2 below takes the FAPI, Dynamic and logout issues): #1151, #1152, #1137, #1000, #1161, #1162, #992, #963, #1004
(the harness builds the authorization URL, state and nonce itself for now), #1001–#1014,
Dynamic/logout/FAPI plans, the FastAPI package, anything in `rust/`.

## G1: harness contract

Follow `conformance/adding-conformance-profiles.md` (the harness protocol #1198
documents) and `conformance/app.py` behavior. In short:

- **Interface fixed by #1198 (PR #1200):** port **8890**; each config is the Python config
  plus a required `"rp_url": "http://localhost:8890"` and alias `go-identity-model-*`. Verdicts come
  from the existing plan keys in `expected_modules.json`. The overlay mounts the `certs` volume
  read-only, bind-mounts `./results/hosted/rp-logs/go` as `RP_LOG_DIR`, and `depends_on`
  `cert-init`, `nginx`, `server` (as `rp-fastapi`). Hosted runs start the service with
  `--no-deps`: trust `/certs/nginx-selfsigned.crt` in addition to system roots and tolerate it
  being absent. `/results/{test_id}` returns 404 when nothing is recorded; record
  `{"status":"success"}` or `{"status":"error","error":"<reason_class>: …"}`. Runner:
  `run_tests.py --harness go`; make: `make conformance-test HARNESS=go [HOSTED=1]`.

- Separate Go module at `conformance/go/` with a `replace` to `../../go`, so the library's
  module and release are untouched. Image `conformance/Dockerfile.go`; compose overlay
  `conformance/docker-compose.go.yml` with service `rp-go`; configs
  `conformance/configs/go-{basic,config,form-post-basic}-rp.json` with aliases
  `go-identity-model-*`.
- Routes as the Python harness: `/health`, `/discover`, `/authorize`, `GET`+`POST /callback`
  (form_post via `r.ParseForm()`), `POST /clear-cache` (`discovery.ClearCache`,
  `jwks.ClearCache`), per-test rp-logs at `$RP_LOG_DIR/<profile>/<test>.log`.
- Status codes: 400 for a validation rejection, 502 for a deliberate refusal, never any
  other 5xx. One `classify(err) reason` using `errors.As` on the typed errors above, never
  message text. State compared in constant time; nonce always sent and checked.
- Keep the JWKS cache across the two logins of a rotation module (don't clear per request).
- Commit type `test(conformance)` for harness files: no Go release is cut.

## File ownership (two loops, one repo)

This loop may create/edit only: `go/**`, `conformance/go/**`, `conformance/Dockerfile.go`,
`conformance/docker-compose.go.yml`, `conformance/configs/go-*.json`. Everything else
(`spec/`, `conformance/run_tests.py`, `conformance/expected_modules.json`, `Makefile`,
`.github/workflows/`, `py/`, `rust/`) is read-only. If a fix needs a shared file, mark the story
`blocked` with what the change is; the owner lands it. Exception: shared vectors in
`spec/vectors/jwks.json` are owned by the Rust loop (its R3 adds the #1153 vector, with a
strict xfail in the Go runner; its R5 may add a rotated-key vector). G3/G4 remove that xfail and
make Go pass. If the Rust PR adding the vector is not on `main`, mark the story
`blocked: waiting on <Rust PR>`; never add the vector yourself.

## Phase 2: every other OIDF RP plan, OIDF-first

After phase 1 (Basic, Config, Form Post), take the Go library (`go/`) through every OIDF RP plan Python passes on the
local suite: FAPI 2.0 Security Profile, FAPI 2.0 Message Signing, FAPI 2.0 mTLS, Dynamic,
RP-Initiated Logout, Back-Channel Logout. The suite drives the work: run the plan first, then build
exactly what its failing modules need. Do not build features no module or spec MUST asks for.

**Gate (Stacker, before the first phase-2 row):** the shared plumbing that lets a harness run any
plan is merged into the stack root:
`gh pr list -R jamescrowley321/identity-model --state merged --head test/harness-all-oidf-plans --json number -q 'length'`
returns 1. Until then, after phase 1 is done, publish `LOOP_COMPLETE` with
"blocked: harness-all-oidf-plans PR not merged".

**Per plan group, in this order:**
1. **Baseline.** On a branch off the parent, add `conformance/configs/go-<plan>.json`
   **uncommitted** and run `make conformance-test HARNESS=go PLANS=<plan>` (local suite). Write
   every module's verdict and logged reason to `.ralph/specs/<plan>/baseline.md`. This decides
   which of the group's stories are needed and in what order; record the mapping module → story.
2. **Stories.** One PR per issue below (go half only: `Part of #N`), each adding the library
   feature plus the harness route it needs, and showing the modules it targets now pass locally
   (paste the verdicts in the PR). Stacked as usual.
3. **Wire it.** The group's last story commits `conformance/configs/go-<plan>.json`, which turns
   on the plan in the `conformance-harness (go)` CI leg. Every module must match
   `expected_modules.json` (same rp-logs reason rule as phase 1).
4. **Hosted evidence.** `gh workflow run conformance-hosted.yml -r <branch> -f harness=go
   -f plans=<plan> -f publish=none` (use the exact input names the plumbing PR defines; read
   `conformance/adding-conformance-profiles.md`). Dynamic and both logout plans need a public RP URL
   for the hosted OP to call back; if the workflow cannot provide one, record the local evidence,
   mark the hosted row `blocked: needs public RP URL (owner)`, and continue.

| # | Plan | Issues (go half) | Notes |
|---|---|---|---|
| P1 | `fapi2-rp` (Security Profile: PAR, `private_key_jwt`, DPoP) | #1000, #1005, #1003, #1012, #1013 | `!` where the issue says breaking |
| P2 | `fapi2-message-signing-rp` (JAR + JARM) | #1006, #1007 | |
| P3 | `fapi2-mtls-rp` | #1002 | |
| P4 | `dynamic-rp` (DCR + `request_uri`) | #1010 (JAR from P2) | hosted needs public URL |
| P5 | `rpinitiated-logout-rp`, `backchannel-logout-rp` | #1008 | hosted needs public URL |

**Foundations.** If a story needs a foundation that parity-2 owns (#994 injected Config, #995
retry, #996 caches, #993 Rust error taxonomy), build only the slice the story needs, say so on that
issue, and continue. Spec MUSTs are unconditional, and never scope out a MUST because the harness
happens to mask it.

**Spec vectors (two loops, one `spec/`).** Only the owning loop adds new vectors for an issue:
Go owns #1000, #1003, #1005, #1012, #1013; Rust owns #1002, #1006, #1007, #1008, #1010. The owner
adds strict xfails linked to the issue in the other two runners in the same commit set. The
non-owning loop's story does not add vectors; once the owner's PR is on the stack root it removes
its xfail in a follow-up row. Phase-2 file ownership adds `conformance/configs/go-*.json` for
every plan and, for owned issues only, appends to `spec/vectors/` plus strict xfails in the other
runners.

## Exit criteria

1. `conformance.yml` job `conformance-harness (go)` is **success** (not skipped) on the G1 PR, with every
   module's verdict matching `expected_modules.json`.
2. Hosted: `gh workflow run conformance-hosted.yml -r <branch> -f harness=go -f publish=none` is green for all three plans.
   Download the rp-logs artifact and confirm every negative module's log shows the expected
   reason, not some other failure (a green negative test proves only
   that *a* rejection happened). Record the run URL and per-module reasons in
   `.ralph/specs/1145/hosted.md` and in a PR comment.
3. If the hosted preflight fails with 401/302-to-login, `CONFORMANCE_TOKEN` expired: mark G2
   `blocked: CONFORMANCE_TOKEN expired` and stop; the owner rotates it.

Never press "Publish for certification" and never pass `publish` other than `none`.

## Stacking

- Every story's branch is cut from the previous story's branch. The first PR's base is the stack root.
- **Parent** = the branch of the newest `shipped` ledger row, else the stack root; the stack
  root if that branch no longer exists on origin.
- Don't rebase, retarget or force-push shipped branches. Record each tip SHA in the ledger.

## Rules

- Conventional commits; the issue title's type/scope is the default (`fix(go)`, `test(conformance)`).
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage explicit paths. Never `git add -A` / `git add .`.
- Errors are typed, never magic strings. No CVE ignores. No lint suppressions.
- Spec MUSTs are unconditional; hardening beyond the spec is opt-in.
- Test assertions: deep equality and id-keyed lookups, no positional indexing or magic numbers.
- Test resources come from docker-compose, never testcontainers. No env flags to skip suites.
- Minimal fix: no scope creep. Out-of-scope findings become follow-up issues.
- Docs and PR text describe the library and its use, not the loop's process.
- Never mention private downstream users by name.
- Issue/PR body edits go through `--body-file` plus a non-empty check.
- Never merge, never auto-merge, never touch branch protection.

## Gates

Run in the worktree with `GOTOOLCHAIN=go1.26.0 PATH="$HOME/go/bin:$PATH"` (system Go 1.27
panics golangci-lint; actionlint lives in `~/go/bin`).

| Touched | Before commit | Before PR (Critic) |
|---|---|---|
| any | `make lint` | same |
| `go/` | `make test-unit-go` | `make test-integration-go` |
| `conformance/go/` or a library change on the cert path | — | `make conformance-test HARNESS=go` (all three plans, manifest verdicts) |
| security-control code (`jwks`, `jwt`, `idtoken`) | — | CI mutation gate; check the job after push |

Integration red is a hard block. Known flake, one rerun: ~22 integration failures from a stale
`/tmp/pytest-of-$USER` cache (delete `node-oidc_*.json` there, then rerun).

## PR body template

```
## Summary
- <what changed and why, with spec section / OIDF module names>

Part of #<issue>
Stacked on #<parent PR>    (omit when base = the stack root)

## Conformance evidence    (G1/G2)
<plan → module verdict table, run links>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `identity-model-cert-go` (hats: Stacker, Builder, Critic, Shipper)
- Model(s): Claude Opus 5.5 (claude-opus-5-5)

## Checklist
- [ ] CI is green
- [x] Tests added/updated where appropriate (<gates run>)
- [x] Docs updated if behavior changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Ledger template (`.ralph/stack-ledger.md`)

```
| # | issue | status | branch | parent | parent tip | tip | PR | note |
|---|---|---|---|---|---|---|---|---|
```
Status: `in_progress` → `shipped` | `blocked` | `skipped`.
