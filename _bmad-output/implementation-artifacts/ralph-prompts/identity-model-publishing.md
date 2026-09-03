You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/identity-model` (`jamescrowley321/identity-model`).

This loop builds the **release/publishing infrastructure** for the polyglot library so the Rust crate and Go module can be published from a tag, reproducibly and with provenance. It does **not** perform the first publish — see "No Auto-Publish" — it builds the machinery and gates; the owner pushes the first tag.

**DO NOT launch this loop while any other identity-model loop is running — one ralph workstream per repo at a time.** (Rust-extended, rust-hardening, conformance-harness loops all touch `rust/` / `.github/`; run sequentially, never concurrently.) Wait for the other loop's LOOP_COMPLETE.

### Current state (verified against merged PRs, not the drift-prone task queue)

- **Rust crate `rs-identity-model` v0.0.1 — NOT published.** Renamed from `identity-model` in PR #58 (merged). `rust/Cargo.toml` has good base metadata (`description`, `license = "Apache-2.0"`, `repository`, `keywords`, `categories`) but no `readme`/`documentation` fields and **no `[package.metadata.docs.rs]`**. No `[lib]` override → import path is `rs_identity_model`. There is **no `cargo publish` workflow** and no `rust/v*` tag.
- **Go module `github.com/jamescrowley321/identity-model/go` — NOT released.** It is a **subdirectory module**, so Go release tags MUST be prefixed `go/vX.Y.Z` (that is how `go get …/identity-model/go@go/v0.0.1` resolves). There is **no release workflow** and **no `go/v*` tag**.
- **No release automation of any kind.** `.github/workflows/` = `ci.yml`, `codeql.yml`, `dependency-review.yml`, `osv-scanner.yml`, `scorecard.yml`, `security.yml`. None publish.
- **Versioning:** pre-stable `0.0.x`, **independent per language** (Go and Rust advance separate lines, not lock-stepped), manual. Keep that policy.

### Naming decision — do NOT re-litigate

- **Rust publishes as `rs-identity-model`** (crates.io). `identity-model` is taken; the `{py,go,rs}-identity-model` convention is settled. Do not rename again.
- **Go ships under the current path `github.com/jamescrowley321/identity-model/go`** with `go/v*` tags. The `go-identity-model` prefix cannot apply to a subdirectory module without a repo split or an ugly nested path — that is a **separate future decision, explicitly OUT OF SCOPE for this loop and NOT a publishing blocker**. Ship under the current path now.

### Verified toolchain facts (do NOT re-derive wrong)

- Rust: edition `2024`, MSRV `1.96` (pinned in `rust/Cargo.toml`; do NOT downgrade). `reqwest` rustls-only, `jsonwebtoken` 11 `rust_crypto`. Add deps with `cargo add`; commit `Cargo.toml` AND `Cargo.lock`. Never `git add .`.
- Go: `go 1.26.0`; module lives in the `go/` subdirectory.
- Prefer **crates.io Trusted Publishing (GitHub OIDC)** for `cargo publish` — no long-lived `CARGO_REGISTRY_TOKEN`. This needs a **one-time owner step on crates.io** (register the repo + release workflow as a Trusted Publisher for `rs-identity-model`) — the loop CANNOT do this; document it as an owner prerequisite and make the workflow assume OIDC.

Epic/story source of truth: if a publishing epic/story exists under `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/`, read it; otherwise this prompt's Task Queue is authoritative.

## Running

Run the loop from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/identity-model` — the owner works in that checkout by hand. `PROMPT.md` and `.claude/task-state.md` live in the orchestrator worktree for the whole run. `/tmp` is wiped on reboot: if the worktree vanishes mid-run, `git worktree prune` then recreate and re-mark completed tasks `done` in the fresh `PROMPT.md` before resuming.

```bash
# One-time: create the orchestrator worktree off main.
cd ~/repos/auth/identity-model
git fetch origin
git worktree add /tmp/im-publish-orch -b ralph/publishing origin/main

# Run the loop from inside that worktree
cd /tmp/im-publish-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-publishing.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-publish-orch`. Keep the prompt copied in as `PROMPT.md` for the whole run (ralph re-reads it from CWD each iteration); the planning-repo copy is the source of truth — edit it there and re-`cp` if you change the workstream mid-run. Per-task work happens in its own `/tmp/im-publish-PUBX` worktree (created by `setup`) off the task's base branch. When the loop finishes: `cd ~/repos/auth/identity-model && git worktree remove /tmp/im-publish-orch`.

## CRITICAL: No Auto-Publish and No Auto-Merge

- **DO NOT merge any PR.** The owner reviews and merges every PR this loop creates. The `complete` phase must NOT call `gh pr merge`.
- **DO NOT publish, and DO NOT push release tags.** Publishing to crates.io is **irreversible**; a Go tag is a permanent public version. This loop builds workflows, dry-run gates, and docs ONLY. The **owner** pushes the first `rust/v0.0.1` / `go/v0.0.1` tag after reviewing the merged workflows. Any task that would trigger a real publish is a bug — the release workflows must run only on tags the owner pushes, and the loop never pushes those tags.

## Dependency Model — Base-Branch Chaining

Tasks touch shared files (`.github/workflows/`, `CONTRIBUTING.md`, both READMEs), so each task branches off the **previous task's branch** and opens its PR with `--base <previous_branch>` for a clean stack the owner merges bottom-up. PUB1 bases off `main`. Once a base branch is merged to `main`, later tasks MAY base off `main` instead.

## Task Queue

| Task | Branch | Base branch | Description | Status |
|------|--------|-------------|-------------|--------|
| PUB1 | ci/rust-publish-dryrun | main | **Rust packaging readiness + dry-run gate.** Complete `rust/Cargo.toml` publish metadata: `readme = "README.md"`, `documentation = "https://docs.rs/rs-identity-model"`, and `[package.metadata.docs.rs]` (`all-features = true`). Add a **`cargo publish --dry-run`** step + `cargo package --list` (assert README + license are packaged, tests/examples are not shipped as needed) to a `publish-dryrun` job wired into `ci.yml`, triggered on `rust/**` changes via the existing `changes` path-filter. No real publish. Verify locally: `cd rust && cargo publish --dry-run`. | pending |
| PUB2 | ci/rust-release-workflow | ci/rust-publish-dryrun | **Rust crates.io release workflow.** Add `.github/workflows/release-rust.yml`, triggered on tags matching `rust/v*`. Permissions `id-token: write` + `contents: read`. Steps: checkout, install the pinned Rust toolchain, re-run the dry-run gate, then `cargo publish` for the `rust/` crate via **crates.io Trusted Publishing (OIDC)** — no `CARGO_REGISTRY_TOKEN`. Assert the tag version equals `rust/Cargo.toml` `version` (fail otherwise). Document the one-time owner step (register `rs-identity-model` Trusted Publisher on crates.io for this repo + `release-rust.yml`) in `RELEASING.md` (created in PUB4) and the PR body. | pending |
| PUB3 | ci/go-release-workflow | main | **Go module release workflow + tag convention.** Add `.github/workflows/release-go.yml`, triggered on tags matching `go/v*`. Steps: checkout, setup Go 1.26, `cd go && go vet ./... && go test ./...`, create a GitHub Release for the tag, and warm the proxy (`GOPROXY=https://proxy.golang.org go list -m github.com/jamescrowley321/identity-model/go@<tag>` — strip the `go/` prefix to the module version). Document the subdirectory-tag convention (`go/vX.Y.Z`, because the module is in `go/`) in `go/README.md` and `CONTRIBUTING.md`. | pending |
| PUB4 | docs/releasing-guide | ci/go-release-workflow | **RELEASING.md + install/version docs.** Add `RELEASING.md`: the `0.0.x` pre-stable independent-per-language policy; cut-a-Rust-release steps (bump `rust/Cargo.toml` version → `git tag rust/vX.Y.Z` → `release-rust.yml` publishes) incl. the crates.io Trusted-Publisher owner prerequisite; cut-a-Go-release steps (`git tag go/vX.Y.Z` → `release-go.yml`). Update install lines: `rust/README.md` + root README → `cargo add rs-identity-model`; `go/README.md` → `go get github.com/jamescrowley321/identity-model/go@go/vX.Y.Z`; refresh the root README "Versioning" section to link `RELEASING.md`. Mark the crates.io/Go entries "available from the first tagged release" until the owner publishes. | pending |
| PUB5 | ci/release-provenance | docs/releasing-guide | **(stretch) Build provenance.** Add `actions/attest-build-provenance` to both release workflows — attest the packaged `.crate` in `release-rust.yml` and the Go release assets in `release-go.yml` — matching the workspace's provenance posture (TPD uses attest-build-provenance). Keep it non-blocking if attestation infra isn't ready; if it complicates the release path, set the task `blocked` and move on rather than risk the publish flow. | pending |

### Owner actions (NOT loop tasks — document, do not perform)

1. Register `rs-identity-model` as a **Trusted Publisher** on crates.io (repo `jamescrowley321/identity-model`, workflow `release-rust.yml`) — required before the first `cargo publish` OIDC run.
2. Push the first tags — `git tag rust/v0.0.1 && git push origin rust/v0.0.1`, `git tag go/v0.0.1 && git push origin go/v0.0.1` — after reviewing the merged workflows. These trigger the real first publishes; the loop never pushes them.

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for workspace commands and git conventions.
2. Read `~/repos/auth/py-identity-model/CONTRIBUTING.md` for repo workflow (branching, conventional commits, the monorepo CI path-filter table).
3. Read the current `rust/Cargo.toml`, `go/go.mod`, and `.github/workflows/ci.yml` in the per-task worktree to ground every change in the real files.

## Step 2: Determine What To Do

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/im-publish-orch/.claude/task-state.md`).

- **Does not exist** → Pick up next task (Step 3).
- **phase is `complete`** → Mark the task `done` in the queue in THIS file, clean up the worktree, delete task-state.md, pick up next task (Step 3).
- **Any other phase** → Execute that one phase (Step 4).

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue.

- If none remain → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Determine the base branch from the queue. If that base branch's PR has already merged to `main`, you MAY base off `main` instead.
  2. Create `ORCH_WORKTREE/.claude/task-state.md`:
     ```
     task_id: PUBX
     repo: identity-model
     branch: <branch from queue>
     base_branch: <base branch from queue>
     worktree: /tmp/im-publish-PUBX
     phase: setup
     ```
  3. Execute the `setup` phase, then end your response.

## Step 4: Execute ONE Phase

Read `phase` from task-state.md. Execute ONLY that phase. When done, update the `phase` field to the next phase and end your response.

**All work after `setup` happens in the worktree** — `cd` to the `worktree:` path first.

Phase order: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`

Read the shared phase file for each phase from `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`.

### Phase overrides

**setup** — Follow `phases/setup.md`. Repo root `~/repos/auth/identity-model`. Create the worktree off `base_branch`: `git worktree add -b <branch> <worktree> <base_branch>` (fetch first).

**analyze** — Follow `phases/analyze.md`, plus: read the existing `.github/workflows/ci.yml` (how the `changes` path-filter gates jobs, how the toolchain is pinned/cached), `rust/Cargo.toml`, `go/go.mod`, and both READMEs. For PUB2/PUB3 study a known-good Trusted-Publishing / subdir-module release pattern; do NOT invent registry auth. The plan must list exact files created/modified and the trigger + permissions of each new workflow.

**implement** — Follow `phases/implement.md`, plus:
- **Workflows must be least-privilege**: `release-rust.yml` gets `id-token: write` + `contents: read` (+ `attestations: write` only in PUB5); `release-go.yml` gets `contents: write` (for the Release) + whatever the proxy warm-up needs. Pin third-party actions by commit SHA (match the repo's existing pinning convention in `.github/workflows/`).
- **Tag→version guards**: `release-rust.yml` must fail if the `rust/v*` tag version ≠ `rust/Cargo.toml` version. `release-go.yml` reads the version from the `go/v*` tag.
- Rust changes: `cd <worktree>/rust && cargo build && cargo clippy --all-targets -- -D warnings && cargo fmt --check && cargo publish --dry-run` clean before committing.
- Conventional commits: `ci(rust):` / `ci(go):` / `docs:` as appropriate. Commit specific files (workflows, Cargo.toml+Cargo.lock, READMEs, RELEASING.md) — never `git add .`.

**test** — Follow `phases/test.md`, plus: there is no unit test for a workflow, so **validate by execution and inspection**: run `cargo publish --dry-run` (PUB1/PUB2) and `cd go && go vet ./... && go test ./...` (PUB3) locally and paste the output in the PR. Lint the workflow YAML (`actionlint` if available). Confirm the release workflows are **tag-only** (they must NOT trigger on push/PR) and that no step pushes a tag or publishes outside a tag event. **Prove the guardrails**: show that the tag→version mismatch check would fail on a wrong tag.

**review** — Follow `phases/review.md`. Reviewers: Blind Hunter + Edge Case Hunter + Acceptance Auditor (`ralph-prompts/review-agents/`). The Acceptance Auditor MUST verify: no real publish/tag-push happens in any PR; release workflows are tag-triggered only with least-privilege permissions; the tag↔version guard exists; Trusted Publishing (not a stored token) is used; the owner prerequisites are documented in `RELEASING.md`.

**review-fix** — Follow `phases/review-fix.md`. No overrides.

**pr** — Follow `phases/pr.md`, plus: repo `jamescrowley321/identity-model`. Open with `--base <base_branch>` (chained parent unless already merged). Title `ci(rust): …` / `ci(go): …` / `docs: …`. Body lists the task, files, the workflow trigger + permissions, the dry-run / `go test` output, and the review summary. **No auto-merge flags. No tag pushes.**

**ci** — Follow `phases/ci.md`. Repo `jamescrowley321/identity-model`. Max 3 fix attempts. The new release workflows won't run on the PR (they're tag-only) — that is correct; do not "fix" them into running on PRs. The gates that DO run are the standard `ci` jobs (incl. the `publish-dryrun` job from PUB1) + `conformance` + the security scanners. Don't proceed to `complete` on a red required check.

**complete** — **OVERRIDE: do NOT merge the PR, do NOT push any tag.**
1. Mark the task `done` in the queue in THIS file.
2. `cd ~/repos/auth/identity-model && git worktree remove <worktree> --force`
3. Delete `.claude/task-state.md`.
4. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — fresh context prevents drift.
- NEVER commit to `main`; always feature branches in worktrees.
- **NEVER publish and NEVER push a release tag** — the owner does the first publish. Release workflows are tag-triggered; the loop only authors them.
- **NEVER merge PRs — the owner reviews and merges manually.**
- Prefer **Trusted Publishing (OIDC)** over stored registry tokens; if a token is truly unavoidable, stop and set the task `blocked` with a note rather than commit token-based auth.
- Pin third-party GitHub Actions by SHA; least-privilege `permissions:` per workflow.
- Rust: `cargo build && cargo clippy --all-targets -- -D warnings && cargo fmt --check && cargo publish --dry-run` clean before committing; add deps with `cargo add`, commit `Cargo.toml` + `Cargo.lock`. Never `git add .`. Edition 2024 / MSRV 1.96 — do not downgrade.
- Conventional commits (`ci(rust):`, `ci(go):`, `docs:`). No `--no-verify`.
- Do NOT rename the Rust crate or the Go module — names are settled (`rs-identity-model`; Go stays `identity-model/go`). The `go-identity-model` question is out of scope.
- If stuck 3+ iterations on one phase: set the task `blocked`, clean up the worktree, delete task-state.md, move on.
- **One workstream per repo: this loop must not run concurrently with any other identity-model loop.**
