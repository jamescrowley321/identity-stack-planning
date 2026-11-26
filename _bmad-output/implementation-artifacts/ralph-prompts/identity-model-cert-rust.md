You are the identity-model Rust certification loop. Hats (`hats/identity-model-cert-rust.yml`) split the work:
Stacker → Builder → Critic → Shipper. Each activation starts with a fresh context, so everything
you need next time goes in files: `.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

## Goal

The Rust crate (`rust/`, `rs-identity-model`) passes the OpenID Foundation RP certification
plans **Basic RP, Config RP and Form Post Basic RP**: green on the local suite in CI and green
on the hosted suite (certification.openid.net), with every negative module rejected for the
reason the manifest names. Target: submittable by Sunday 29 Nov 2026. Submission itself is the
owner's job.

## Context

- Repo: `jamescrowley321/identity-model` (Python `py/`, Go `go/`, Rust `rust/`, shared
  contracts `spec/`, OIDF harnesses `conformance/`). Python is the certified reference; its
  harness is `conformance/app.py`.
- **Isolation.** The loop runs in its own clone `/tmp/identity-model-cert-rust-clone` with the
  worktree `/tmp/identity-model-cert-rust-ralph` (`RALPH_CLONE=1 run.sh …`). Never touch
  `~/repos/auth/identity-model`, `main` itself, or another session's branches. Fetch before
  every branch operation.
- **A sibling loop runs at the same time:** `identity-model-cert-go`, owning `go/` and
  `conformance/go/`. The two loops never edit the same file. See "File ownership".
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
  it exactly. The Rust harness follows the same rule.
- Rust has no users: no legacy shims, typed error variants only.

## What the crate already does (verified 2026-11-25 against `release/v5` @ `bd3c5c5`)

Every module already gets the right accept/reject **if** the harness sets the base audience
(`client_id`), the profile nonce, the expected issuer, and calls `fetch_with_subject`. But
seven of the ten reject reasons are only distinguishable by message text:

| Module(s) | Expected | Rust path | Typed today? |
|---|---|---|---|
| client-test, idtoken-sig-rs256, scope-userinfo-claims, client-secret-basic | accept | `DiscoveryClient::discover`, `authorization_url`, `TokenClient::exchange_code` (`ClientSecretBasic` default), `validate_id_token`, `UserInfoClient::fetch_with_subject` | — |
| invalid-iss / invalid-aud / missing-iat | `invalid_issuer` / `invalid_audience` / `invalid_issued_at` | `jwt/claims.rs` `claim_err(...)` | no |
| missing-sub / nonce-invalid | `invalid_subject` / `nonce_mismatch` | `jwt/id_token.rs` profile checks | no |
| idtoken-sig-none | `alg_none` (SKIPPED allowed) | `jwt/mod.rs` `check_algorithm` | no |
| invalid-sig-rs256 | `invalid_signature` | `jwt/mod.rs` `map_verify_err` | no |
| kid-absent-single-jwks / -multiple-jwks | accept / `key_selection` | `jwks/key.rs` kid-less resolution / `AmbiguousKey` | yes |
| userinfo-invalid-sub | `userinfo_validation` | `fetch_with_subject` (classified by step, as Python does) | n/a |
| Config: discovery-openid-config, jwks-uri-keys | accept | `discover`, `JwksClient::fetch` | — |
| Config: discovery-issuer-mismatch | `issuer_mismatch` | `DiscoveryError::IssuerMismatch` (keep the `DiscoveryError`; converting to `IdentityError` loses the type) | yes |
| Config: signing-key-rotation(-just-before-signing) | accept | unknown kid → one refetch (5 s cooldown, first miss unthrottled). **Unverified** if the suite rotates under the same kid. | — |

Harness-side gaps the crate does not cover (fill them in the harness, not the crate):
`authorization_url` has no `nonce` parameter (append it); no state/nonce generator (use
`getrandom`); no callback/form_post parsing (axum `Query`/`Form`, constant-time state compare);
reqwest/rustls ignores `SSL_CERT_FILE`, so inject a client built with
`secure_client_builder().add_root_certificate(..)` for the local suite's self-signed cert.

The hosted suite serves a junk `P-9999` key. Rust skips unusable keys today; keep it that way.
Re-check this section against the stack root before building; the code wins.

## Queue

| # | Issue | Story | Notes |
|---|---|---|---|
| R1 | #1145 | Rust RP harness (`conformance/rust/`), local suite green for all three plans in CI | Rust half only. `Part of #1145`. |
| R1h | #1145 | First hosted run for all three plans on the R1 branch, rp-logs reasons recorded | Evidence story, right after R1: see "Exit criteria". Failures it shows are fixed by the rows below or new rows. |
| R2 | #993 | JWT/ID-token slice of the typed error taxonomy: variants for iss, aud, sub, iat/exp, nonce, signature, alg-none; `#[non_exhaustive]`; harness `classify()` switches to matching on them | `fix(rust)!`. `Part of #993` (the rest stays in parity-2 D1). |
| R2b | #1166 | ID Token profile requires `client_id ∈ aud` unconditionally (OIDC Core §3.1.3.7 step 3 MUST), with a new reject vector in `spec/vectors/id-token.json` (`aud:["other-client-9x"]`, `trusted_audiences:["other-client-9x"]`, `client_id:"s6BhdRkqt3"`); strict-xfail it in the Go and Python runners linked to #1166 | `fix(rust)!`. Must land before the hosted run: certifying with a missed MUST is weak evidence. |
| R3 | #1153 | Rust only: same-`kid` keys of different `kty` → pick by `kty`/`alg`/`crv`, adding the shared vector to `spec/vectors/jwks.json` | Insurance before the hosted run (suite ≥5.3.3 publishes an OKP decoy under a kid). This loop owns the vector; Go claims it later. |
| R4 | #1145 | Final hosted run green for all three plans on the newest shipped branch, rp-logs reasons checked | Evidence story: see "Exit criteria". |
| R5 | #998 | Rust only: refetch JWKS once on signature failure (+ rotated-key vector) | **Conditional:** only if a rotation module fails in R1/R4. Else `skipped` with the run link. |

A failure that fits none of these: add a story row for the issue that covers it (search
`gh issue list -l parity`), or file one, and record why in the ledger note. Stay inside the
three plans.

Out of scope (don't build): #1151, #1152, #1137, #1000, #1162, #1165, #992, #963, #1004
(RFC 9207 `iss`, shared authorize-callback vectors), #1001–#1014, Dynamic/logout/FAPI plans,
the FastAPI package, anything in `go/`.

## R1: harness contract

Follow `conformance/adding-conformance-profiles.md` (the harness protocol #1198
documents) and `conformance/app.py` behavior. In short:

- **Interface fixed by #1198 (PR #1200):** port **8891**; each config is the Python config
  plus a required `"rp_url": "http://localhost:8891"` and alias `rs-identity-model-*`. Verdicts come
  from the existing plan keys in `expected_modules.json`. The overlay mounts the `certs` volume
  read-only, bind-mounts `./results/hosted/rp-logs/rust` as `RP_LOG_DIR`, and `depends_on`
  `cert-init`, `nginx`, `server` (as `rp-fastapi`). Hosted runs start the service with
  `--no-deps`: trust `/certs/nginx-selfsigned.crt` in addition to system roots and tolerate it
  being absent. `/results/{test_id}` returns 404 when nothing is recorded; record
  `{"status":"success"}` or `{"status":"error","error":"<reason_class>: …"}`. Runner:
  `run_tests.py --harness rust`; make: `make conformance-test HARNESS=rust [HOSTED=1]`.

- Separate axum crate at `conformance/rust/` with a path dependency on `../../rust`, outside
  the published crate's package. Image `conformance/Dockerfile.rust`; compose overlay
  `conformance/docker-compose.rust.yml` with service `rp-rust`; configs
  `conformance/configs/rust-{basic,config,form-post-basic}-rp.json` with aliases
  `rs-identity-model-*`.
- Routes as the Python harness: `/health`, `/discover`, `/authorize`, `GET`+`POST /callback`,
  `POST /clear-cache` (build fresh clients), per-test rp-logs at
  `$RP_LOG_DIR/<profile>/<test>.log` (the hosted run fails if none are captured).
- Status codes: 400 for a validation rejection, 502 for a deliberate refusal, never any other
  5xx. One `classify()` mapping errors to reason codes. Until R2 lands it may match on the
  claim name the crate reports; never on message prose.
- Keep the JWKS client across the two logins of a rotation module.
- Commit type `test(conformance)` for harness files: no crate release is cut.

## File ownership (two loops, one repo)

This loop may create/edit only: `rust/**`, `conformance/rust/**`,
`conformance/Dockerfile.rust`, `conformance/docker-compose.rust.yml`,
`conformance/configs/rust-*.json`, and — for R2b/R3/R5 only — new vectors appended to
`spec/vectors/id-token.json` (R2b) or `spec/vectors/jwks.json` plus the Rust runner claiming them (Go and Python runners must then
claim or strict-xfail them; add strict xfails linked to the issue in those runners in the same
commit set, as `test(spec)`). Everything else (`conformance/run_tests.py`,
`conformance/expected_modules.json`, `Makefile`, `.github/workflows/`, `py/`, `go/`) is
read-only. If a fix needs one, mark the story `blocked` with what the change is.

## Exit criteria

1. `conformance.yml` job `conformance-harness (rust)` is **success** (not skipped) on the R1 PR, with every
   module's verdict matching `expected_modules.json`.
2. Hosted: `gh workflow run conformance-hosted.yml -r <branch> -f harness=rust -f publish=none` is green for all three plans, run
   on the newest shipped branch. Download the rp-logs artifact and confirm every negative
   module's log shows the expected reason, not some other failure (a green negative test proves
   only that *a* rejection happened). Record the run URL and per-module reasons in
   `.ralph/specs/1145/hosted.md` and in a PR comment.
3. If the hosted preflight fails with 401/302-to-login, `CONFORMANCE_TOKEN` expired: mark R4
   `blocked: CONFORMANCE_TOKEN expired` and stop; the owner rotates it.

Never press "Publish for certification" and never pass `publish` other than `none`.

## Stacking

- Every story's branch is cut from the previous story's branch. The first PR's base is the stack root.
- **Parent** = the branch of the newest `shipped` ledger row, else the stack root; the stack
  root if that branch no longer exists on origin.
- Don't rebase, retarget or force-push shipped branches. Record each tip SHA in the ledger.

## Rules

- Conventional commits; the issue title's type/scope is the default (`fix(rust)!`, `test(conformance)`).
  Breaking stories: `!` and a `BREAKING CHANGE:` footer; describe the change in the PR body (pre-1.0, no guide).
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage explicit paths. Never `git add -A` / `git add .`.
- Errors are typed variants, never magic strings. No CVE ignores. No lint suppressions.
- Spec MUSTs are unconditional; hardening beyond the spec is opt-in.
- Test assertions: deep equality and id-keyed lookups, no positional indexing or magic numbers.
- Test resources come from docker-compose, never testcontainers. No env flags to skip suites.
- Minimal fix: no scope creep. Out-of-scope findings become follow-up issues.
- Docs and PR text describe the library and its use, not the loop's process.
- Never mention private downstream users by name.
- Issue/PR body edits go through `--body-file` plus a non-empty check.
- Never merge, never auto-merge, never touch branch protection.

## Gates

Run in the worktree with `GOTOOLCHAIN=go1.26.0 PATH="$HOME/go/bin:$PATH"` (`make lint` runs
golangci-lint and actionlint for the whole repo).

| Touched | Before commit | Before PR (Critic) |
|---|---|---|
| any | `make lint` | same |
| `rust/` | `make test-unit-rust` | `make test-integration-rust` |
| `spec/vectors/` | `make test-unit` and `make test-unit-go` too (every runner claims or strict-xfails) | same |
| `conformance/rust/` or a crate change on the cert path | — | `make conformance-test HARNESS=rust` (all three plans, manifest verdicts) |
| security-control code (`jwks`, `jwt`) | — | CI mutation gate; check the job after push |

Integration red is a hard block. Known flake, one rerun: ~22 integration failures from a stale
`/tmp/pytest-of-$USER` cache (delete `node-oidc_*.json` there, then rerun).

## PR body template

```
## Summary
- <what changed and why, with spec section / OIDF module names>

Part of #<issue>
Stacked on #<parent PR>    (omit when base = the stack root)

## Breaking change         (only for `!` stories)
<what callers must change>

## Conformance evidence    (R1/R4)
<plan → module verdict table, run links>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `identity-model-cert-rust` (hats: Stacker, Builder, Critic, Shipper)
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
