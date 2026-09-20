You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/py-identity-model` (`jamescrowley321/identity-model`). The Python library lives in `py/`; the conformance harness in `conformance/`.

This loop **finishes the OIDF conformance work that was started and left hanging**, and moves it onto the hosted suite.

**Standing decision (2026-09-15): the hosted OIDF suite is the conformance standard.** `https://www.certification.openid.net` is what CI runs against. The local Docker suite stays available for offline work and fast local iteration, but it is no longer the gate of record. This is the direction the Foundation itself recommends — it ships a Python runner library specifically so implementers can wire the suite into a development pipeline, and `run_tests.py` already drives it through the REST API rather than Selenium.

**DO NOT launch this loop while any other identity-model loop is running** — one ralph workstream per repo at a time. That includes `identity-model-go-rust-parity.md`, which targets the same repo. Wait for the other loop's LOOP_COMPLETE.

### Verified state (measured 2026-09-15 — workflows, run history, and result files)

**Certified today:** Basic RP + Config RP + Form Post Basic RP, certified 2 July 2026 against **`py-identity-model` 3.1.0** ([#242](https://github.com/jamescrowley321/identity-model/issues/242)).

**Twelve plan configs exist in `conformance/configs/`. All twelve pass.** Coverage splits three ways:

| Plan | `conformance.yml` (local, nightly + PR) | `conformance-hosted.yml` (dispatch-only) | Result last refreshed |
|---|---|---|---|
| `basic-rp`, `config-rp`, `form-post-basic-rp` | yes | yes | 2026-09-13 |
| `fastapi-basic-rp`, `fastapi-config-rp`, `fastapi-form-post-basic-rp` | yes | no | 2026-08-02 |
| `dynamic-rp`, `rpinitiated-logout-rp`, `backchannel-logout-rp` | **no** | **no** | 2026-08-02 |
| `fapi2-rp`, `fapi2-mtls-rp`, `fapi2-message-signing-rp` | **no** | **no** | 2026-08-02 |

Six plans are in **no workflow at all** — run by hand once, six weeks ago, and rotting since. That is [#607](https://github.com/jamescrowley321/identity-model/issues/607). Note #607 says "configured-but-unrun"; they *were* run manually. Its real claim — that no workflow runs them — is correct.

**`conformance-hosted.yml` is `workflow_dispatch` only and last ran 2026-07-02** — the run that produced the certification. It covers only the three already-certified plans. It already exposes a `publish` input (`none` / `summary` / `everything`) controlling whether a run appears on the public certification list.

**The implementation for the next certification round is already done.** RP-Initiated Logout ([#214](https://github.com/jamescrowley321/identity-model/issues/214)), Dynamic Client Registration ([#216](https://github.com/jamescrowley321/identity-model/issues/216)), and Back-Channel Logout ([#442](https://github.com/jamescrowley321/identity-model/issues/442)) all closed 2026-07-22, and their plans pass. Only hosted runs and submission remain. #242 still describes this round as "active" — that text is stale.

**Version drift:** the certification names 3.1.0; the library ships **3.18.1**. Seventeen minor versions of certified-library drift. Task 7.

### Running hosted is not the same as publishing

Three distinct things. Keep them separate in every PR description:

1. **A hosted run** — CI against `certification.openid.net` with `CONFORMANCE_TOKEN`, `publish: none`. Routine. This is the new standard.
2. **An evidence package** — a hosted run exported as a zip plus RP logs, retained as an artifact. Produced deliberately, for a profile being certified.
3. **A submission** — filing with the OpenID Foundation and appearing on the public list. **Never done by this loop.** See the boundary section.

## Prerequisite — the CI token is stale, and it will not look stale

**On 2026-09-15 the API token was deleted at the OpenID Foundation end**, on the suspicion it had been compromised. The GitHub Actions secret was **not** touched — `gh secret list` still shows `CONFORMANCE_TOKEN`, last updated `2026-07-02`, the date of the certification run.

So the repository holds a value that the suite no longer honours. **Every hosted call will return 401 while the secret still appears healthy.** Do not let that read as a conformance failure, and do not let `gh secret list` reassure you: existence is not validity, and GitHub secrets cannot be read back to check.

**Replacing it is the owner's job, not this loop's.** The repo ships `conformance/scripts/rotate_conformance_token.py`, which mints a fresh token and writes it straight into the Actions secret. It cannot be automated here — the first step is an **interactive OIDC sign-in (Google or GitLab) in a headful browser**. A loop cannot complete it and should not try.

```bash
cd ~/repos/auth/py-identity-model
uv run conformance/scripts/rotate_conformance_token.py              # first run: browser opens, sign in
uv run conformance/scripts/rotate_conformance_token.py --headless   # later runs reuse the profile
uv run conformance/scripts/rotate_conformance_token.py --dry-run    # check the session, mint nothing
```

It targets `jamescrowley321/identity-model` / `CONFORMANCE_TOKEN` by default, and needs `gh` authenticated as a repo admin plus the Playwright Chromium binary. The token is never printed and never written to disk.

**Before starting task 1, probe the token — do not just check it exists.** An authenticated call against the suite is the only real test:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $CONFORMANCE_TOKEN" \
  https://www.certification.openid.net/api/plan
```

`200` means live. `401`/`403` means the secret holds a dead token — **stop and tell the owner to run the rotation script.**

Do not work around it: do not fall back to the local Docker suite and call the gate done, do not mark hosted plans skipped to get a green check, and do not write a token into a file. Tasks 2, 3, 4 and 7 involve no hosted run and can proceed meanwhile.

## Task Queue

Work top to bottom. Each task is one PR. Mark `done` here as you complete it.

**Everything green first; evidence and submission last.** Tasks 1–7 are engineering. Task 8 gathers evidence, and only then does the owner submit. This ordering is not a preference — a certification package must reflect the final state of the thing being certified. Evidence exported at task 5 and then invalidated by a code change at task 6 is worse than no evidence, because it looks valid.

| # | Task | Issue | Status |
|---|---|---|---|
| 1 | Make `conformance-hosted.yml` the standard gate: all twelve plans, `schedule` nightly + `pull_request` on the RP/validation surface, `workflow_dispatch` retained, `publish` defaulting to `none` | [#607](https://github.com/jamescrowley321/identity-model/issues/607) | pending |
| 2 | Re-scope `conformance.yml` (local Docker) to an offline/local path — keep `make conformance-up` working and keep it dispatchable, but it is no longer the gate of record | [#607](https://github.com/jamescrowley321/identity-model/issues/607) | pending |
| 3 | Feature → OIDF profile coverage matrix; link it from `docs/oidc-certification-analysis.md` | [#471](https://github.com/jamescrowley321/identity-model/issues/471) | pending |
| 4 | Make the fastapi RP conformance run a required gate on validation/middleware PRs, reproducible via one make target | [#472](https://github.com/jamescrowley321/identity-model/issues/472) | pending |
| 5 | Bring the logout plans under the standard gate — `rpinitiated-logout-rp` + `backchannel-logout-rp` green and gating, including against the Keycloak fixture | [#473](https://github.com/jamescrowley321/identity-model/issues/473) | pending |
| 6 | FAPI 2.0 — reconcile the pinned variant in `configs/fapi2-rp.json` against the live suite's plan metadata and get it green under the standard gate | [#475](https://github.com/jamescrowley321/identity-model/issues/475), epic [#476](https://github.com/jamescrowley321/identity-model/issues/476) | pending |
| 7 | Write up the 3.1.0-vs-3.18.1 certification drift: what OIDF requires to refresh a listing for a new version, and a recommendation | [#242](https://github.com/jamescrowley321/identity-model/issues/242) | pending |
| 8 | **Last.** Evidence pass — once 1–7 are merged and the nightly gate has been green across a full run, export packages for every profile being certified: `dynamic-rp`, `rpinitiated-logout-rp`, `backchannel-logout-rp`, `fapi2-rp`. Then hand off | [#242](https://github.com/jamescrowley321/identity-model/issues/242) | pending |

Task 1 first — it is what makes hosted the standard and stops the six plans rotting.

**Do not export an evidence package before task 8.** Routine hosted runs in tasks 1–7 use `publish: none` and no `--export-zip`. If a task tempts you to capture evidence early, it is the wrong task.

### One task per run

**Complete exactly ONE task, then write `LOOP_COMPLETE` and stop.** The owner reviews the pull
request, merges it, and relaunches for the next. Small reviewable units with a human between each.

### Stacked pull requests

Base each task's branch on the **previous task's branch** rather than `main`, so the queue reads as a
stack on GitHub and every PR's diff shows only its own change. Record the choice in
`.claude/task-state.md` under `base_branch:` and pass it to `gh pr create --base`. If the previous
task has already merged, base on `main` — GitHub retargets the rest of the stack automatically.

**Merging a stack is bottom-up, and the base branch must not be deleted in the same command** —
deleting a branch another open PR is based on closes that PR outright.

**Out of scope:** mTLS certification (`fapi2-mtls-rp`) as a *submission* target. Wire it into the standard run under task 1, but `conformance/README.md` records that FAPI2 certifies on DPoP and mTLS is a separate future path. Do not pursue it.

### Task 1 design constraints

- **`CONFORMANCE_TOKEN` is required, and it has three distinct failure modes.** CI must report each differently, because they need different fixes: **secret absent** (repo misconfigured), **401/403** (the token was revoked at the OIDF end — rotate it; this is the state as of 2026-09-15), and **conformance failure** (the library actually regressed). Collapsing these into one red check makes the gate untrustworthy. None may skip quietly into green.
- **The suite is an external dependency.** When `certification.openid.net` is unreachable or returns 5xx, the run must fail with a message that names the outage as the cause and distinguishes it from a conformance failure. An implementer reading a red check must be able to tell "the library regressed" from "the Foundation's service was down" without opening logs.
- **`publish` defaults to `none`.** Scheduled and PR-triggered runs never publish. Publishing stays a deliberate `workflow_dispatch` choice.
- **Do not export evidence from scheduled runs.** Retain the plain run logs so a failure is diagnosable, but export zips and RP-log bundles belong to task 8 only — evidence must name one settled version, and `main` moves.
- Consider `staging.certification.openid.net` (tracks the suite's master branch) if a plan needs a fix that has landed upstream but is not yet in production. Do not make staging the default — it moves under you.
- Keep the PR trigger scoped to paths that can actually change RP behaviour (`py/`, `conformance/`), not every docs commit.

## The submission boundary — read before task 8

**This loop prepares evidence. It never submits a certification.** And it prepares that evidence exactly once, at the end.

Preconditions before task 8 starts. If any is false, task 8 is not ready:

- Tasks 1–7 are merged to `main`.
- The nightly hosted gate has run green on `main` at least once *after* the last of them merged.
- The version the evidence will name is settled — see task 7. Certification is version-specific, and `main` moves.

Then, in one pass:

1. Run each profile being certified against the hosted suite with `--export-zip` and `--rp-logs-zip`, writing to `conformance/results/hosted/`.
2. Open a single PR with all the evidence and a summary table: profile, result, library version, run date.
3. Comment on #242 with that table and the artifact paths.
4. **Stop. Tell the owner the package is complete and ready to submit.**

Never run a workflow with `publish: summary` or `publish: everything`. Never fill in OIDF forms, email the Foundation, or edit a public certification listing. Submitting is name-attached, carries a fee policy and a legal declaration, and is the owner's alone.

If a conformance failure appears during task 8, do not patch around it to preserve the package. Stop, report it, and let it become ordinary work — a green package built on a worked-around failure is the one outcome worse than a late one.

## Running

Run from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/py-identity-model` — the owner works in that checkout by hand.

```bash
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/im-conf-orch -b ralph/conformance-hosted origin/main

cd /tmp/im-conf-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-conformance-evidence.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-conf-orch`. Keep the prompt copied in as `PROMPT.md` for the whole run — ralph re-reads it from CWD each iteration. The planning-repo copy is the source of truth; edit there and re-`cp` if the workstream changes mid-run. Per-task work happens in its own `/tmp/im-conf-<n>` worktree created by `setup`.

`/tmp` is wiped on reboot. If the worktree vanishes mid-run: `git worktree prune`, recreate, and re-mark completed tasks `done` in the fresh `PROMPT.md` before resuming.

When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/im-conf-orch`.

### Running a plan by hand

Hosted — the standard. Needs `CONFORMANCE_TOKEN` in the environment:

```bash
cd conformance
python run_tests.py --plan dynamic-rp --suite-url https://www.certification.openid.net
```

With an evidence package:

```bash
python run_tests.py --plan dynamic-rp \
  --suite-url https://www.certification.openid.net \
  --export-zip results/hosted/dynamic-rp-export.zip \
  --rp-logs-zip results/hosted/dynamic-rp-rp-logs.zip
```

Local Docker — offline fallback only:

```bash
make conformance-up
cd conformance && python run_tests.py --plan dynamic-rp
make conformance-down
```

## Phases

Feature pipeline: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

Phase instructions are in `phases/*.md` alongside this prompt. Read only the phase you are executing. Most tasks here are CI and documentation rather than library code; scope the review lenses accordingly, but treat any change to `conformance/app.py` or `app_fastapi.py` as security-sensitive — those are the RP under test.

## Rules

- **Never merge your own pull request.** Open it, link its issue, and stop. Do not run `gh pr merge`,
  do not pass `--auto` or `--admin`, do not use a merge queue, and do not change branch-protection or
  repository settings to make a merge possible. The owner reviews and merges every PR. This holds even
  when CI is fully green and the change looks trivial — an unreviewed merge is the failure, not a
  failing check.
- Feature branches only, never commit to `main`. Conventional commits (Angular) — semantic-release is active.
- **A skipped profile must be skipped loudly** — log the reason. Never let a skip read as a pass. #607 calls this out explicitly, and it matters more now that the gate depends on an external service.
- Do not change variant parameters in `conformance/configs/*.json` to make a plan go green. Those values are cert-grade and deliberately chosen; `conformance/README.md` records why. If a variant looks wrong, the live suite's plan metadata is the source of truth — reconcile against it and say so in the PR.
- **Identifiers are GitHub issue numbers.** Do not invent private code schemes. The old `TH-3.1` / `T308` style still appears in some issue titles; when you touch one, refer to it by its issue number.
- **Retire legacy codes in files you are already editing.** Some documents still carry the old private
  identifier families (`TH-1.5`, `T300`, `FR-PIM-2`, `RT5-F18`, `TFCENV-7`); `docs/glossary.md` in the
  planning repo decodes them. When a task has you editing such a file, replace the codes **in the parts you
  are already changing** with the GitHub issue number or plain words. Do not open a separate de-coding
  sweep, do not touch sections your task does not concern, and never rewrite this prompt's own task queue
  mid-run. Externally meaningful identifiers stay: RFC numbers, CVE/PYSEC ids, OIDF profile names, and
  `spec/` conformance vector ids such as `REV-001`.
- Do not re-run all twelve plans every iteration. Run what the task needs.
