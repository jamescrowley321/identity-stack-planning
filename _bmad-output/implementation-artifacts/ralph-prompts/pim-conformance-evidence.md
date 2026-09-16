You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/py-identity-model` (`jamescrowley321/identity-model`). The Python library lives in `py/`; the conformance harness in `conformance/`.

This loop **finishes the OIDF conformance work that was started and left hanging**. The harness is built and the library passes. What is missing is CI wiring and certification-grade evidence.

**DO NOT launch this loop while any other identity-model loop is running** — one ralph workstream per repo at a time. That includes `identity-model-go-rust-parity.md`, which targets the same repo. Wait for the other loop's LOOP_COMPLETE.

### Verified state (measured 2026-09-15 — workflows, run history, and result files)

**Certified today:** Basic RP + Config RP + Form Post Basic RP, certified 2 July 2026 against **`py-identity-model` 3.1.0** ([#242](https://github.com/jamescrowley321/identity-model/issues/242)).

**Twelve plan configs exist in `conformance/configs/`. All twelve pass locally.** Coverage splits three ways:

| Plan | In `conformance.yml` (local, nightly + PR) | In `conformance-hosted.yml` (evidence) | Local result last refreshed |
|---|---|---|---|
| `basic-rp`, `config-rp`, `form-post-basic-rp` | yes | **yes** | 2026-09-13 |
| `fastapi-basic-rp`, `fastapi-config-rp`, `fastapi-form-post-basic-rp` | yes | no | 2026-08-02 |
| `dynamic-rp`, `rpinitiated-logout-rp`, `backchannel-logout-rp` | **no** | **no** | 2026-08-02 |
| `fapi2-rp`, `fapi2-mtls-rp`, `fapi2-message-signing-rp` | **no** | **no** | 2026-08-02 |

So six plans have passing results that were produced **by hand, once, six weeks ago**, and no workflow runs them. That is the gap [#607](https://github.com/jamescrowley321/identity-model/issues/607) describes. Note #607's wording says "configured-but-unrun" — they *were* run, manually; its real claim, that no workflow runs them, is correct.

**`conformance-hosted.yml` is `workflow_dispatch` only and last ran 2026-07-02** — that run produced the certification. It covers only the three already-certified plans.

**The implementation for the next certification round is already done.** RP-Initiated Logout ([#214](https://github.com/jamescrowley321/identity-model/issues/214)), Dynamic Client Registration ([#216](https://github.com/jamescrowley321/identity-model/issues/216)), and Back-Channel Logout ([#442](https://github.com/jamescrowley321/identity-model/issues/442)) all closed 2026-07-22, and their plans pass locally. Only hosted evidence and submission remain. #242 still describes this round as "active" — that text is stale.

**Version drift worth surfacing:** the certification names 3.1.0; the library ships **3.18.1**. Seventeen minor versions of certified-library drift. Establishing whether the listing should be refreshed is task 7.

### Local vs hosted — the distinction this whole loop turns on

- **Local** (`https://localhost.emobix.co.uk:8443`, Docker, `make conformance-up`) — a regression gate. Free, fast, no secrets. Every existing result file was produced here.
- **Hosted** (`https://www.certification.openid.net`, needs the `CONFORMANCE_TOKEN` secret) — the only runs OIDF accepts as certification evidence. Produces the export zip plus RP logs that a submission attaches.

A passing local run is **not** evidence. Never describe one as such.

## Task Queue

Work top to bottom. Each task is one PR. Mark `done` here as you complete it.

| # | Task | Issue | Status |
|---|---|---|---|
| 1 | Wire the six orphaned plans into `conformance.yml` — nightly, report-and-upload, artifacts retained | [#607](https://github.com/jamescrowley321/identity-model/issues/607) | pending |
| 2 | Feature → OIDF profile coverage matrix; link it from `docs/oidc-certification-analysis.md` | [#471](https://github.com/jamescrowley321/identity-model/issues/471) | pending |
| 3 | Make the fastapi RP conformance run a required gate on validation/middleware PRs, reproducible via one make target | [#472](https://github.com/jamescrowley321/identity-model/issues/472) | pending |
| 4 | Logout conformance evidence — RP-initiated + back-channel against the Keycloak fixture | [#473](https://github.com/jamescrowley321/identity-model/issues/473) | pending |
| 5 | Extend `conformance-hosted.yml` to `dynamic-rp`, `rpinitiated-logout-rp`, `backchannel-logout-rp`; export evidence zips | [#242](https://github.com/jamescrowley321/identity-model/issues/242) | pending |
| 6 | Add `fapi2-rp` to the hosted workflow; reconcile the pinned variant against the live suite's plan metadata | [#475](https://github.com/jamescrowley321/identity-model/issues/475), epic [#476](https://github.com/jamescrowley321/identity-model/issues/476) | pending |
| 7 | Write up the 3.1.0-vs-3.18.1 certification drift: what OIDF requires for a version refresh, and a recommendation | [#242](https://github.com/jamescrowley321/identity-model/issues/242) | pending |

Task 1 first — it is the cheapest and it stops the six plans silently rotting. Tasks 5 and 6 depend on 1 proving the plans still pass.

**Out of scope:** mTLS certification (`fapi2-mtls-rp`) as a *submission* target — wire it into nightly under task 1, but FAPI2 certifies on DPoP per `conformance/README.md`, and mTLS is a separate future path. Do not pursue it.

## The submission boundary — read before task 5

**This loop prepares evidence. It never submits a certification.**

Submitting to the OpenID Foundation is an outward-facing, name-attached act with a fee policy and a legal declaration. When a hosted run produces a complete evidence package:

1. Write the export zip and RP logs to `conformance/results/hosted/`.
2. Open a PR with the evidence and a summary of what passed.
3. Comment on #242 with the plan, the version, and the artifact paths.
4. **Stop. Tell the owner it is ready to submit.** Do not fill in OIDF forms, do not email the Foundation, do not edit any public certification listing.

Likewise, do not run the hosted workflow speculatively — it consumes a shared external service under the owner's token. Run it when a task calls for it, once, deliberately.

## Running

Run from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/py-identity-model` — the owner works in that checkout by hand.

```bash
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/im-conf-orch -b ralph/conformance-evidence origin/main

cd /tmp/im-conf-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-conformance-evidence.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-conf-orch`. Keep the prompt copied in as `PROMPT.md` for the whole run — ralph re-reads it from CWD each iteration. The planning-repo copy is the source of truth; edit there and re-`cp` if the workstream changes mid-run. Per-task work happens in its own `/tmp/im-conf-<n>` worktree created by `setup`.

`/tmp` is wiped on reboot. If the worktree vanishes mid-run: `git worktree prune`, recreate, and re-mark completed tasks `done` in the fresh `PROMPT.md` before resuming.

When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/im-conf-orch`.

### Running a plan by hand

```bash
make conformance-up                      # brings up the OIDF suite + RP harnesses
cd conformance && python run_tests.py --plan dynamic-rp
make conformance-down
```

Hosted (only when a task calls for it, and `CONFORMANCE_TOKEN` is set):

```bash
python run_tests.py --plan dynamic-rp \
  --suite-url https://www.certification.openid.net \
  --export-zip results/hosted/dynamic-rp-export.zip \
  --rp-logs-zip results/hosted/dynamic-rp-rp-logs.zip
```

## Phases

Feature pipeline: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

Phase instructions are in `phases/*.md` alongside this prompt. Read only the phase you are executing. Most tasks here are CI and documentation rather than library code; scope the review lenses accordingly, but treat any change to `conformance/app.py` or `app_fastapi.py` as security-sensitive — those are the RP under test.

## Rules

- Feature branches only, never commit to `main`. Conventional commits (Angular) — semantic-release is active.
- **A skipped profile must be skipped loudly** — log the reason (missing secret, hosted-only, mTLS keys absent). Never let a skip read as a pass. #607 calls this out explicitly.
- Never present a local run as certification evidence.
- Do not change variant parameters in `conformance/configs/*.json` to make a plan go green. Those values are cert-grade and deliberately chosen; `conformance/README.md` records why. If a variant looks wrong, the live suite's plan metadata is the source of truth — reconcile against it and say so in the PR.
- **Identifiers are GitHub issue numbers.** Do not invent private code schemes. The old `TH-3.1` / `T308` style still appears in some issue titles; when you touch one, refer to it by its issue number.
- Do not re-run all twelve plans every iteration. Run what the task needs.
