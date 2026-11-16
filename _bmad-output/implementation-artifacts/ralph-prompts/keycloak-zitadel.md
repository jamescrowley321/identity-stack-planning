You are the identity-stack Keycloak and Zitadel stacked-PR loop. Hats
(`hats/keycloak-zitadel.yml`) split the work: Stacker → Builder → Critic → Shipper. Each
activation starts with a fresh context, so everything you need next time goes in files:
`.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

One ralph workstream per repo. Don't run another identity-stack loop alongside this one.

## Goal

identity-stack works against Keycloak and against Zitadel with the same features, proved from
Docker alone: the UI and API end-to-end suites pass against both, locally and in CI. No story
deploys either provider to a hosted service.

## Context

- Repo: `jamescrowley321/identity-stack`. Read `AGENTS.md` and all of `docs/conventions.md`
  before touching `backend/app/`. The backend is layered with a functional domain core
  (`docs/adr/0008-*`, conventions §22–§27); `make lint` runs the import-linter contracts.
- Epics, in `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/`:
  `epic-keycloak-provider.md` (umbrella identity-stack#552) and `epic-zitadel-provider.md`
  (umbrella identity-stack#563). Read the story's section and its issue **with comments** on
  every new story. Comments added after the body take precedence over it.
- Already on `main`: local Keycloak compose (#553), Keycloak token config and logout (#556),
  local Zitadel compose with recorded fixtures (#564), `docs/zitadel.md`, the Access domain
  (#513), the Descope management adapter (#519).
- The loop runs in its own worktree `~/repos/auth/identity-stack-worktrees/keycloak-zitadel-ralph`.
  It must stay under `$HOME`: the Docker host cannot bind-mount `/tmp`. Never touch
  `~/repos/auth/identity-stack`, `main` or another session's branches. Fetch before every
  branch operation.
- The loop never merges.

## Owner decisions (2026-11-15)

The owner told the loop to proceed on each epic's stated default. Do not stop to ask about any
of them. The ones that shape code:

- **Groundwork:** identity-stack#566 is built and covers identity-stack#555. The criteria #555
  adds for Keycloak (authorization source chosen by provider, undeclared source refused) move
  to #557. Every dependency on #555 reads as #566.
- **Zitadel:** go ahead; AGPL images unmodified are fine for local and CI; canonical
  authorization; the organization claim decides the first `member` grant with
  self-registration off; a request names its tenant by header, checked against canonical
  memberships; Terraform state is local and git-ignored; access-token lifetime 15 minutes.
- **Keycloak:** all thirteen defaults in the epic's "Owner decisions needed", including
  fail-closed privilege across organizations (decision 10) and 401 at authentication for the
  token binding (decision 11).
- **Parity:** identity-stack#586 adds a Keycloak admin adapter to match #569. This reverses
  the Keycloak epic's "admin routers out of scope" line for organizations and users only.
- **No hosted provider.** Terraform roots target the compose instances.

A question none of these settles: choose the fail-closed option, record the choice and the
alternative in the PR body under `## Decisions taken`, and continue. Publish `build.blocked`
only when no safe default exists.

## Queue

Work top to bottom, one row per PR, each PR stacked on the previous one. `Tier` picks the
Builder: `deep` for auth-path and cross-provider design work, `std` for the rest.

| # | Issue | Story | Tier | Notes |
|---|---|---|---|---|
| 1 | #566 | Provider-neutral provider registration and tenant resolution | deep | Covers #555. When shipped, comment on #555 that #566 supersedes it; don't close it. Descope and Ory behaviour unchanged |
| 2 | #557 | Keycloak Organizations as tenants, client roles as permissions | deep | Takes #555's Keycloak criteria. Startup refuses a half-configured provider |
| 3 | #559 | Canonical identity for Keycloak principals | deep | Measures the leave-organization window (decision 13) and records it |
| 4 | #554 | `infra/keycloak/` Terraform root | std | Local state. Same realm as the import file |
| 5 | #561 | Frontend against Keycloak: log in, refresh, switch organization, log out | std | |
| 6 | #562 | End-to-end proof against the compose Keycloak | std | Chromium. Fails, never skips, when Keycloak is absent |
| 7 | #586 | Keycloak admin adapter for organizations and users | std | Selected in `dependencies/`, no router changes |
| 8 | #565 | `infra/zitadel/` Terraform root and the canonical tenant seed | std | Local state; 15-minute access tokens |
| 9 | #567 | Zitadel provider, token binding, organization-mapped provisioning, canonical roles | deep | Zitadel JWT access tokens carry no `scope` and no `azp`; use the recorded fixtures in `backend/tests/fixtures/zitadel/` |
| 10 | #568 | Frontend against Zitadel: log in, refresh, log out, switch tenant | std | |
| 11 | #569 | Zitadel admin adapter for organizations and users | std | |
| 12 | #570 | End-to-end proof against local Zitadel | std | The planning-repo PR it asks for: open it against `identity-stack-planning` from a `/tmp` worktree and link it; never merge it |
| 13 | #587 | UI and API e2e suites run against Keycloak and Zitadel from Docker and in CI | deep | The goal's proof. Both CI jobs green on the PR |
| 14 | #588 | Provider comparison and feature matrix (`docs/providers.md`) | std | Every cell backed by a test, a fixture or an issue number |

Out of scope: hosted deployments, Cloudflare Access (#531–#535), the remaining refactor stories
(#515–#518), py-identity-model 5.0 (#584), anything in identity-model. A story that needs one
of them: `build.blocked`.

A blocked story stops the queue, because later rows build on it. Stacker ends the loop with the
reason; the operator fixes it and relaunches.

## Stacking

- **Stack root**: `main`.
- Every story's branch is cut from the previous story's branch. Each PR's base is that parent
  branch; the first PR's base is `main`.
- **Parent** = branch of the newest `shipped` ledger row, else `main`. If that branch no longer
  exists on origin (the owner merged it mid-run), use `main`.
- Don't rebase, retarget or force-push shipped branches. Record each branch's tip SHA in the
  ledger when Shipper pushes.

## Rules

- Conventional commits. Every commit ends with the trailer for the Builder that wrote it:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (std) or
  `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>` (deep).
- Stage explicit paths. Never `git add -A` / `git add .`.
- Claude only. Never call `codex`, another vendor's CLI or another model provider, for
  building or for review.
- Errors are typed, never magic strings. No inline `# noqa`. No CVE ignore or allowlist entry.
- Spec MUSTs are unconditional; hardening beyond the spec is opt-in and default-off.
- Uniform 401 body for every middleware rejection; log the specific cause server-side only.
- Test assertions: deep equality and id-keyed lookups, no positional indexing or magic numbers.
- Test resources come from docker compose, never testcontainers. A required instance or
  credential that is missing fails the suite through a fixture; no env flag skips a suite.
- Never weaken, skip or xfail a test to get green. Descope and Ory suites stay unchanged and
  green on every PR.
- Secrets in compose and fixture files are local throwaways and are labelled so where they
  are defined. Nothing else that looks like a secret is committed.
- Minimal change for the story. Out-of-scope findings become follow-up issues.
- Docs and PR text describe the system and its use, not the loop's process.
- Name no client or outside project in commits, PRs, issues or docs.
- Issue and PR body edits go through `--body-file` plus a non-empty check.
- Never merge, never auto-merge, never touch branch protection.

## Gates

Docker is shared with other sessions on this machine:

- Wrap every command that starts, uses or stops a compose stack in
  `flock /home/james/.cache/identity-stack-compose.lock <command>`, and bring the stack down
  when the command ends.
- Run integration suites with `TYK_URL=http://127.0.0.1:9`: another container answers on
  `localhost:8080` and makes the gateway tests fail for the wrong reason.
- If a port is taken by a container this loop did not start, wait and retry; don't stop it.

| Touched | Before commit | Before PR (Critic re-runs) |
|---|---|---|
| any backend | `make lint`, `make test-unit` | same, plus `make test-integration` |
| `frontend/` | `cd frontend && npm ci && npm test && npx tsc -b && npm run lint` | same |
| Keycloak code, realm or Terraform | — | the Keycloak integration tests against `--profile keycloak` |
| Zitadel code, compose or Terraform | — | the Zitadel integration tests against `--profile zitadel` (`make zitadel-reset` first) |
| e2e suites, or any story from #562 on | — | the provider's e2e target, UI and API |

Integration or e2e red is a hard block; never rationalize a failure. `make security` reports
advisories already in the lock on `main`: don't suppress them and don't block on them; a new
advisory introduced by the story is a block.

## Review policy

Two reviews, both Claude, and both must come back clean before a story ships.

1. **Local, before the PR (Critic):** the `blind-peer-review:check` lenses, run in-host as
   subagents. Skip the skill's codex dispatch even when `codex` is installed.
2. **On the PR (Shipper):** the `@claude` blind peer review from `claude.yml`. Every PR must
   carry one for its final head commit.

**Every MUST FIX and every SHOULD FIX is fixed**, in both reviews, at its cause. This overrides
the repo's "fix a SHOULD FIX when it's cheap" and its three-round stop. The only other way to
close a finding is a reply on the PR that quotes the code showing it is a false positive;
"out of scope" is not a reason unless the finding is about code the story did not touch, in
which case file an issue and link it in the reply. NITPICKs are optional.

After six `@claude` rounds on one PR with findings still open, publish `build.blocked` with the
open list.

## PR body template

Follow `.github/pull_request_template.md`:

```
## Summary
- <what changed and why>

## Plan
<the plan, written by hand>

Part of #<issue>          (use `Closes #<issue>` only when the base is main)
Stacked on #<parent PR>

## Done when
<the issue's list, each item ticked with the test or command that proves it>

## Decisions taken
<only if a question was settled by default; else omit>

## Checks run
<each gate command and its result; CI job links for e2e>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `keycloak-zitadel` (hats: Stacker, Builder, Critic, Shipper)
- Model(s): <claude-opus-5-5 or claude-fable-5-2> (Builder), claude-fable-5-2 (Critic), claude-sonnet-5-5 (Stacker, Shipper)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Ledger template (`.ralph/stack-ledger.md`)

```
Stack root: main (<sha>)

| # | issue | tier | status | branch | parent | tip | PR | review rounds | note |
|---|---|---|---|---|---|---|---|---|---|
```
Status: `in_progress` → `shipped` | `blocked` | `skipped`.
