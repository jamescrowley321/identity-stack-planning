You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/py-identity-model` (`jamescrowley321/identity-model`).

This loop closes the **Go and Rust capability gap against Python**. Python is the reference implementation and is OpenID-certified; Go and Rust trail it. The work is tracked by [#573](https://github.com/jamescrowley321/identity-model/issues/573) (cross-language parity epic) and the audit [#639](https://github.com/jamescrowley321/identity-model/issues/639).

**Supersedes `identity-model-rust-extended.md`**, which asserted that `rust/src/introspection` did not exist. It does now — that prompt's state description went stale. Do not run both.

**DO NOT launch this loop while any other identity-model loop is running** — one ralph workstream per repo at a time. That includes `pim-conformance-evidence.md`, which targets the same repo. Wait for the other loop's LOOP_COMPLETE.

### Verified state (read from source on 2026-09-15 — not from `spec/capabilities.md`)

`spec/capabilities.md` carries its own warning that it is hand-maintained and has drifted before. It was **measured against source** for this prompt:

| Capability | Python | Go | Rust |
|---|---|---|---|
| discovery · JWKS · JWT · id_token · token · userinfo · introspection | yes | yes | **yes** |
| Token Revocation (RFC 7009) | yes | yes | **no** |
| Token Exchange (RFC 8693) | yes | yes | **no** |
| DPoP (RFC 9449) | yes | yes | **no** |
| `private_key_jwt` / `client_secret_jwt` (RFC 7523) | yes | **no** | **no** |
| PAR (RFC 9126) | yes | **no** | **no** |
| FAPI 2.0 request/config validators | yes | **no** | **no** |

Two traps this loop must not fall into:

- **`rust/src/token/mod.rs::exchange_code` is NOT RFC 8693.** It is the authorization-code exchange (RFC 6749 §4.1). Rust has no token-exchange grant. Grepping for "exchange" will mislead you.
- **`rust/src/introspection/` already exists and is implemented.** Do not rebuild it.

Layout: `py/src/py_identity_model/` (reference), `go/pkg/<capability>/`, `rust/src/<capability>/`. The consolidation is done — Python lives in `py/`, not in a separate repo.

### Toolchain facts (do NOT re-derive these wrong)

- **Rust:** `edition = "2024"`, MSRV `rust-version = "1.96"`, both pinned in `rust/Cargo.toml`. Never downgrade. `reqwest` 0.12 rustls-only (`default-features = false`, features `rustls-tls`, `json`), `tokio`, `thiserror` 2 (`IdentityError`), `serde`/`serde_json`, `jsonwebtoken` 11 with the `rust_crypto` backend (pure-Rust, no C toolchain). Add deps with `cargo add`; commit **both** `Cargo.toml` and `Cargo.lock`.
- **Go:** Go 1.26. Mirror the existing `go/pkg/*` package shape.
- Never `git add .` — add specific files.

## Task Queue

Work top to bottom. Each task is one PR. Mark `done` here as you complete it.

| # | Task | Lang | Reference impl | Issue | Base branch | Status |
|---|---|---|---|---|---|---|
| 1 | Token Revocation (RFC 7009) | Rust | `go/pkg/revocation` | #573 | — | **done** — merged, identity-model#671 |
| 2 | Token Exchange (RFC 8693) | Rust | `go/pkg/token` | #573 | — | **done** — merged, identity-model#673 |
| 3 | DPoP (RFC 9449) | Rust | `go/pkg/dpop` | #573 | `main` | **in review** — identity-model#675, open |
| 4 | Duplicate-`kid` try-all on verify failure | all three | — | [#575](https://github.com/jamescrowley321/identity-model/issues/575) | task 3's branch | pending |
| 5 | ID-token vs access-token discrimination in shared validators | all three | Python F-07 work | [#576](https://github.com/jamescrowley321/identity-model/issues/576) | task 4's branch | pending |
| 6 | Widen Rust JWT algs (ES512, EdDSA) + discovery single-flight | Rust | Python/Go | [#579](https://github.com/jamescrowley321/identity-model/issues/579) | task 5's branch | pending |
| 7 | `private_key_jwt` + `client_secret_jwt` client auth (RFC 7523) | Go | `py/.../core` client auth | #573 | task 6's branch | pending |
| 8 | PAR (RFC 9126) | Go | `py/.../core/par_logic.py` | #573 | task 7's branch | pending |
| 9 | Operational parity — Cache-Control TTL, HTTP retry/backoff, SSL-CA env, cache metrics | Go + Rust | Python | [#578](https://github.com/jamescrowley321/identity-model/issues/578) | task 8's branch | pending |
| 10 | Three inversions where Go/Rust beat Python — `client_secret_post`, base `expected_nonce`, RFC 8414 issuer match | Python | Go/Rust | [#574](https://github.com/jamescrowley321/identity-model/issues/574) | task 9's branch | pending |

Tasks 4–6 are correctness fixes that touch all languages. Tasks 7–8 are the Go advanced tier. Task 10 fixes the embarrassment of the reference implementation trailing its own ports.

### One task per run

**Complete exactly ONE task, then write `LOOP_COMPLETE` and stop.** Do not start the next one.

The owner reviews the pull request, merges it, and relaunches the loop for the task after it. That
is the intended pace: small reviewable units with a human between each. A run that opens two PRs has
gone wrong even if both are good — task 3 landed at +3,144 lines across ten files, which is past the
size a person can review carefully, and that is the pattern this pacing exists to stop.

If a task is genuinely two separable pieces (a capability and its conformance wiring, say), open the
first and stop. Note the remainder in the PR body so the split is visible.

### Stacked pull requests

Each task's branch is based on the **previous task's branch**, not on `main`, so the queue reads as a
stack on GitHub and each PR's diff shows only its own change.

At `setup`, pick the base:

```bash
# The most recent task branch that is still open; main if none is.
gh pr list --repo jamescrowley321/identity-model --state open \
  --json number,headRefName,baseRefName --jq '.[] | select(.headRefName|startswith("feat/")) | .headRefName'
```

Take the branch named in this queue's **Base branch** column. If that task's PR has already merged,
`main` is the base instead — GitHub retargets the rest of the stack automatically on merge. Record
the choice in `.claude/task-state.md` under `base_branch:` and pass it to `gh pr create --base`.

**When the owner merges a stack, merge bottom-up and do not delete the base branch in the same
command.** Deleting a branch that another open PR is based on closes that PR outright — it happened
to identity-stack-planning#114 during this workstream and the PR had to be recreated.

**Out of scope:** FAPI 2.0 for Go/Rust, mTLS, JAR, JARM, RAR, CIBA. Do not start them. If tasks 1–10 finish, write LOOP_COMPLETE and stop.

## Conformance contract

`spec/vectors/` holds the machine-readable cross-language behavior contracts, including `revocation.json`, `token-exchange.json`, and `dpop.json`. **Do NOT author new conformance vectors for tasks 1–3** — they already exist and Go already satisfies them. Your job is to make Rust satisfy the same IDs.

For tasks 4–5 the issues explicitly ask for a **new** `spec/` vector. Write it there, and make all three languages pass it.

The `spec-vector-coverage` CI gate fails closed when a capability has executable vectors but no runner for some language. Wire the runner in the same PR as the implementation.

As each capability goes green, flip its column in `spec/capabilities.md` from `planned` to `implemented`. That file is hand-maintained and drifts — only flip a cell you have personally seen pass.

## Running

Run from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/py-identity-model` — the owner works in that checkout by hand.

```bash
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/im-parity-orch -b ralph/go-rust-parity origin/main

cd /tmp/im-parity-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-go-rust-parity.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-parity-orch`. Keep the prompt copied in as `PROMPT.md` for the whole run — ralph re-reads it from CWD each iteration. The planning-repo copy is the source of truth; edit there and re-`cp` if the workstream changes mid-run. Per-task implementation happens in its own `/tmp/im-parity-<n>` worktree created by `setup`.

`/tmp` is wiped on reboot. If the worktree vanishes mid-run: `git worktree prune`, recreate, and re-mark completed tasks `done` in the fresh `PROMPT.md` before resuming.

When the loop finishes: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/im-parity-orch`.

## Phases

Feature pipeline: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

Phase instructions are in `phases/*.md` alongside this prompt. Read only the phase you are executing. Review spawns lenses per `review-agents/`; a change touching JWT validation, client auth, or DPoP is security-sensitive and gets all of them.

## Rules

- **Never merge your own pull request.** Open it, link its issue, and stop. Do not run `gh pr merge`,
  do not pass `--auto` or `--admin`, do not use a merge queue, and do not change branch-protection or
  repository settings to make a merge possible. The owner reviews and merges every PR. This holds even
  when CI is fully green and the change looks trivial — an unreviewed merge is the failure, not a
  failing check.
- Feature branches only, never commit to `main`. Conventional commits (Angular) — semantic-release is active.
- Integration tests are mandatory for library changes, not just unit tests.
- Mirror the reference implementation's **behavior**, not its file layout. Idiomatic Go and idiomatic Rust are the goal; Python's module shape is not.
- Every capability PR must cite the conformance vector IDs it satisfies.
- **Identifiers are GitHub issue numbers.** Do not invent private code schemes (`P0-3`, `RT5-F18`, `D-1`) — #574 was explicitly rescoped to remove exactly that, because the codes were opaque and collided across repos. An epic gets a name; a story gets an issue number.
- **Retire legacy codes in files you are already editing.** Some documents still carry the old private
  identifier families (`TH-1.5`, `T300`, `FR-PIM-2`, `RT5-F18`, `TFCENV-7`); `docs/glossary.md` in the
  planning repo decodes them. When a task has you editing such a file, replace the codes **in the parts you
  are already changing** with the GitHub issue number or plain words. Do not open a separate de-coding
  sweep, do not touch sections your task does not concern, and never rewrite this prompt's own task queue
  mid-run. Externally meaningful identifiers stay: RFC numbers, CVE/PYSEC ids, OIDF profile names, and
  `spec/` conformance vector ids such as `REV-001`.
- Never mark a capability `implemented` in `spec/capabilities.md` on the strength of a grep. Run it.
