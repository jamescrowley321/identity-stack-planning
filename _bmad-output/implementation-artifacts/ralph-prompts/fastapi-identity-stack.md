You are the fastapi-identity-model stacked-PR loop. Hats (`hats/fastapi-identity-stack.yml`) split
the work: Stacker → Builder → Critic → Shipper. Each activation starts with a fresh context, so
everything you need next time goes in files: `.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

One ralph workstream per repo. Don't run `identity-model-stack` or any other identity-model loop
alongside this one.

## Context

- Repo: `jamescrowley321/identity-model`. The work is in the `fastapi-identity-model` package
  (`py/packages/fastapi-identity-model/`), plus one Python core story (#942) in `py/src/`.
- Umbrella: [identity-stack-planning#147](https://github.com/jamescrowley321/identity-stack-planning/issues/147).
  It holds the target design, the order, and the spec basis for audience handling. Read it on
  every new story. Each story's issue **and its comments** hold the design; comments added after
  the body take precedence over it.
- The loop runs in its own worktree `/tmp/fastapi-identity-stack-ralph`. Never touch
  `~/repos/auth/identity-model`, `main`, `release/v5` or another session's branches. Other
  sessions work in this repo; fetch before every branch operation.
- The loop never merges. The owner reviews every PR and merges the stack bottom-up later.

## Owner decisions (2026-11-08)

- **D1, stack root:** build on top of the unmerged v5 stack, because it already rewrites
  `middleware.py` and `ws.py` (DPoP schemes, validation cache, `http_client`, `_rejection`).
  Never edit, rebase or push v5 stack branches.
- **D2, both token types:** the middleware and the WebSocket authenticator accept access tokens
  **and** ID tokens. ID tokens are for first-party UI-only clients: a SPA or mobile app calling
  its own backend, or a BFF passing the token on. Each type is validated under its own profile.
  Design: #1052 body plus its comment.
- **D3, audience rules:**
  - ID tokens: OIDC Core §3.1.3.7 step 3 (reject untrusted additional audiences) is a spec MUST,
    so it's unconditional, with no option to turn it off.
  - Access tokens: stricter audience rules are opt-in hardening, default off. They share one core
    mechanism: `audience: str | Collection[str]`, `trusted_audiences` (`()` = strict), and
    `single_audience` (#942 comment).
- **D4, status codes (RFC 6750 §3.1):** a token the middleware rejects gets 401
  (`invalid_token`, uniform body, no CWE-209 oracle). A route dependency that refuses the token's
  audience, type, role or organization gets 403.
- **D5, opt-in:** every new option defaults to today's behavior. Existing tests pass unmodified.

## Queue

Work top to bottom, one row per PR, each PR stacked on the previous one. None of these is a
breaking change. If a story turns out to need one, publish `build.blocked`; don't ship a `!` commit.

| # | Issue | Story | Notes |
|---|---|---|---|
| 1 | #1048 | Pluggable error responder | The responder may change the body only. Restore the default `WWW-Authenticate` (Bearer/DPoP challenge) on whatever it returns. If it raises or returns nothing, use the default response. Dependencies raise an `HTTPException` subclass, and `install_error_responder(app, fn)` registers the handler. A WebSocket rejection is a close code, so document the responder as HTTP-only there unless the v5 WS code exposes an HTTP rejection |
| 2 | #1049 + #513 | Pass `discovery_policy`, `algorithms`, `options` and `allowed_issuers` through | One PR, body says `Part of #1049` and `Part of #513`. Non-loopback HTTP issuer test: `DiscoveryPolicy` matches loopback by host string (`localhost`, `127.0.0.1`, `::1`), so `127.0.0.2` against the compose fixtures counts as non-loopback |
| 3 | #1052 | Middleware and WS accept ID tokens | The largest story. Type order: `scope`/`scp` → `nonce`/`at_hash`/`c_hash` → `aud` → reject. The ID path uses `aio.validate_id_token`. `audience` may overlap `id_token_client_ids`. ID tokens are refused when `required_binding` is set. `request.state.token_type` and `require_token_type`. Integration tests with real node-oidc and Keycloak ID tokens |
| 4 | #879 | Login router uses `validate_id_token` | Share #1052's ID-token helper. The nonce check stays here |
| 5 | #942 | Core access-token audience rule | Python core only (`py/src/`), supersedes #583. Spec vectors only if the shared rule changes. File one Go and one Rust parity follow-up issue and link them in the PR. When shipped, comment on #583 that #942 supersedes it; don't close it |
| 6 | #1050 | Multiple audiences, `single_audience`, `require_audience` | Exposes #942 on the middleware and WS. `require_audience` must handle ID tokens, whose `aud` is a client_id (see the #1050 comment) |
| 7 | #1051 | Keycloak claim helpers | Add a **separate** realm file (organizations on, confidential type clients, public app clients with full scope off, Audience Resolve). The existing realm and its tests stay untouched. Helpers must handle the token type (see the #1051 comment). Add the README section |

Out of scope: identity-stack (#94), Go/Rust implementations (file follow-ups only), and
anything in the v5 stack itself. A story that needs one of them: `build.blocked`.

## Stacking

- **Stack root**: the first of these branches that exists on origin:
  1. `feat/957-signed-introspection` (top of the v5 stack, PR #1031)
  2. `release/v5`
  3. `main`
- Every story's branch is cut from the previous story's branch. Each PR's base is that parent
  branch; the first PR's base is the stack root. Every PR runs the full CI suite, whatever its base.
- **Parent** = branch of the newest `shipped` ledger row, else the stack root. If that branch no
  longer exists on origin (the owner merged it mid-run), use the stack root.
- Don't rebase, retarget or force-push shipped branches. If the owner changes the stack mid-run,
  build on whatever the ledger's newest shipped branch is now and record it.
- Record each branch's tip SHA in the ledger when Shipper pushes.

## Rules

- Conventional commits with scope `fastapi` (`feat(fastapi): ...`) for package changes and `py`
  for the core story (#942). Core and package changes in one story are separate commits.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage explicit paths. Never `git add -A` / `git add .`.
- Errors are typed (enums/variants), never magic strings. No inline `# noqa`; no CVE ignores.
- Spec MUSTs are unconditional; hardening beyond the spec is opt-in and default-off.
- Uniform 401 body for every middleware rejection; log the specific cause server-side only.
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
| `py/packages/fastapi-identity-model/` | `make test-fastapi` | `make test-integration-node-oidc`, `make test-integration-keycloak` and `make conformance-test-fastapi` |
| `py/src/` | `make test-unit` | `make test-integration-node-oidc` and `make test-integration-keycloak` |
| security-control code (middleware, ws, token validation) | — | `make security-gate BASE=origin/<parent>` |
| `infra/keycloak/` | — | `make test-integration-keycloak` |

Integration red is a hard block; never rationalize a failure. Known flakes, one rerun each:
`test_cache_stampede` kid-miss under full-suite load (#650); load-smoke S2 `valid_es256` 500s
(#797); ~22 integration failures from a stale `/tmp/pytest-of-$USER` cache (delete
`node-oidc_*.json` there, then rerun). Local mutation gate: `rm -rf py/mutants/` after adding
tests, or survivors look unchanged.

Every PR runs Build, Conformance, CodeQL and OSV-Scanner whatever its base; Shipper checks all
four ran.

## PR body template

Follow the repo's `.github/pull_request_template.md`:

```
## Summary
- <what changed and why, with spec section>

Part of #<issue>
Stacked on #<parent PR>
Tracked by https://github.com/jamescrowley321/identity-stack-planning/issues/147

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `fastapi-identity-stack` (hats: Stacker, Builder, Critic, Shipper)
- Model(s): Claude Opus 5.5 (claude-opus-5-5); blind-peer-review lenses as run (see comments)

## Checklist
- [ ] CI is green
- [x] Tests added/updated where appropriate (make lint, <integration targets run>)
- [x] Docs updated if behavior changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Ledger template (`.ralph/stack-ledger.md`)

```
Stack root: <branch> (<sha>)

| # | issue | status | branch | parent | parent tip | tip | PR | note |
|---|---|---|---|---|---|---|---|---|
```
Status: `in_progress` → `shipped` | `blocked` | `skipped`.
