You are the identity-stack Zitadel loop. Hats
(`hats/keycloak-zitadel.yml`) split the work: Stacker → Builder → Critic → Shipper. Each
activation starts with a fresh context, so everything you need next time goes in files:
`.ralph/stack-ledger.md` and `.ralph/specs/<issue>/`.

Two loops share this repo: this one and `keycloak-zitadel` (the Keycloak stories and, last, #587 and #588), each in its own worktree. `main` moves under you when the other loop's PR merges: Shipper rebases as "Branching and merging" says, and a conflict with the other loop's merged work is resolved by keeping both. Never touch the other loop's branches or worktree.

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
- Already on `main` (2026-11-16: provider registration and tenant resolution #566, the Keycloak backend #557 and #559, the Keycloak Terraform root #554, the py-identity-model 5 pre-release #584), and earlier: local Keycloak compose (#553), Keycloak token config and logout (#556),
  local Zitadel compose with recorded fixtures (#564), `docs/zitadel.md`, the Access domain
  (#513), the Descope management adapter (#519).
- The loop runs in its own worktree `~/repos/auth/identity-stack-worktrees/zitadel-ralph`.
  It must stay under `$HOME`: the Docker host cannot bind-mount `/tmp`. Never touch
  `~/repos/auth/identity-stack`, `main` or another session's branches. Fetch before every
  branch operation.
- The loop never merges. The operator merges each PR once it is green and reviewed clean, and
  the next story starts from the new `main`.

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
- **py-identity-model 5 pre-release.** The backend moves to the v5 pre-release now, ahead of
  5.0.0 final. v5 pre-releases are GitHub release assets of `jamescrowley321/identity-model`,
  not on PyPI, and each one is deleted when the next is cut, so a release URL cannot be
  pinned. Pin a commit instead:
  `py-identity-model @ git+https://github.com/jamescrowley321/identity-model@<full sha>#subdirectory=py`,
  with the sha named in the newest `UNBLOCKED:` comment on identity-stack#584.
  identity-stack#584 stays open after the story for the move to 5.0.0 final.

A question none of these settles: choose the fail-closed option, record the choice and the
alternative in the PR body under `## Decisions taken`, and continue. Publish `build.blocked`
only when no safe default exists.

## Queue

Work top to bottom, one row per PR. Each story starts from `main` after the previous PR merged. `Tier` picks the
Builder: `deep` for auth-path and cross-provider design work, `std` for the rest.

| # | Issue | Story | Tier | Notes |
|---|---|---|---|---|
| 8 | #565 | `infra/zitadel/` Terraform root and the canonical tenant seed | std | Local state; 15-minute access tokens |
| 9 | #567 | Zitadel provider, token binding, organization-mapped provisioning, canonical roles | deep | Zitadel JWT access tokens carry no `scope` and no `azp`; use the recorded fixtures in `backend/tests/fixtures/zitadel/` |
| 10 | #568 | Frontend against Zitadel: log in, refresh, log out, switch tenant | std | |
| 11 | #569 | Zitadel admin adapter for organizations and users | std | |
| 12 | #570 | End-to-end proof against local Zitadel | std | The planning-repo PR it asks for: open it against `identity-stack-planning` from a `/tmp` worktree and link it; never merge it |

Out of scope: hosted deployments, Cloudflare Access (#531–#535), the remaining refactor stories
(#515–#518), any code change in identity-model. A story that needs one
of them: `build.blocked`.

A blocked story stops the queue, because later rows build on it, unless its row says
**Parkable**. Stacker ends the loop with the reason; the operator fixes it and relaunches.

## Branching and merging

- Every story's branch is cut from `origin/main`, and every PR's base is `main`, so each PR
  runs the full CI set (including CodeQL and OSV-Scanner) and the automatic `@claude` review.
- When a PR is green and reviewed clean, Shipper marks it `clean` and waits for the operator to
  merge it. The next story is not started until the PR is MERGED.
- identity-stack merges by rebase with a strict up-to-date rule. If `main` moved under an
  unmerged PR, Shipper rebases the branch on `origin/main`, pushes with `--force-with-lease`,
  and re-runs CI and the review for the new head.
- Never run `gh pr merge` yourself.

## Rules

- Conventional commits. Every commit ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
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
- **No tooling around the tests.** A story does not add lock helpers, container-lifecycle
  management, retry wrappers or portability shims to scripts and Makefile targets. A check
  script requires the instance it needs to be up and healthy and fails clearly when it is not;
  it never starts, stops, removes or locks a container. The shared `flock` in "Gates" is how
  this machine's sessions share Docker: it is typed by whoever runs the command and is not
  built into the repo. Linux and CI only. A review finding about such machinery is closed by
  deleting the machinery, not by hardening it.
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

**Every MUST FIX is fixed**, in both reviews, at its cause, however many rounds it takes (ten
`@claude` rounds with one still open: `build.blocked`).

**SHOULD FIX findings are fixed for two rounds, then filed.** In the first two `@claude` rounds
on a PR, every SHOULD FIX is fixed like a MUST FIX. From the third round on, Shipper files each
remaining SHOULD FIX as its own follow-up issue, links the issues in a PR comment, and the PR
counts as clean once no MUST FIX is open. The local Critic does the same after its second round
(carryover). This overrides the repo's three-round stop.

The only other way to close a finding is a reply on the PR that quotes the code showing it is a
false positive. NITPICKs are optional. Do not answer a finding by adding machinery (see "No
tooling around the tests"): the smallest change that removes the problem, or the follow-up
issue.

## PR body template

Follow `.github/pull_request_template.md`:

```
## Summary
- <what changed and why>

## Plan
<the plan, written by hand>

Closes #<issue>          (`Part of #<issue>` where the queue says so)

## Done when
<the issue's list, each item ticked with the test or command that proves it>

## Decisions taken
<only if a question was settled by default; else omit>

## Checks run
<each gate command and its result; CI job links for e2e>

## AI provenance
- [x] This PR was AI-assisted
- Harness/agent: Claude Code, ralph-orchestrator loop `zitadel` (hats: Stacker, Builder, Critic, Shipper)
- Model(s): claude-opus-5-5 (all hats)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Ledger template (`.ralph/stack-ledger.md`)

```
| # | issue | tier | status | branch | tip | PR | review rounds | note |
|---|---|---|---|---|---|---|---|---|
```
Status: `in_progress` → `clean` → `shipped` (merged) | `blocked` | `skipped`.
