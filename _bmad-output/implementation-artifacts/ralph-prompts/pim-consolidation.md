Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

**Epic:** py-identity-model — **Polyglot Consolidation**, epic **CONS-1** (*Merge identity-model in & Collapse Duplicated Test Infrastructure*). This loop delivers CONS-1 only. CONS-2 (reorg + moon + publishing) is a **follow-on loop**; CONS-3 (rename + PyPI + archive) is **owner-manual admin** — neither is in scope here.
**Design (source of truth):** `identity-stack-planning` → `_bmad-output/planning-artifacts/epics/epic-cons1-im-merge-testinfra.md` (the 5 stories + Given/When/Then ACs) and `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md` (the pivot). Full technical design: **py-identity-model PR #533** (`docs/polyglot-consolidation-plan.md`).
**Import source:** the `~/repos/auth/identity-model-legacy` checkout (its `go/`, `rust/`, `spec/`, `infra/`). Its git history is **expendable** (0 tags, never released) — bring trees in as ordinary new-file commits; do NOT `git filter-repo`/subtree.

## BASE MODEL — off-main (updated 2026-08-18) — SUPERSEDES all "stacked / base off previous branch" wording below

The owner reviews and **squash-merges each story's PR bottom-up as it passes** (CONS-1.1 already merged, #538). A squash makes a fresh commit, so basing a later story on an earlier story's *branch* breaks. Therefore:
- **Branch EVERY story off `origin/main`** (`git fetch` first). `origin/main` accumulates each merged story, so it already contains all prior merged work.
- **Open each PR with base `main`.** No stacked / base-off-previous PRs.
- **Reconcile against MERGED PRs** (`gh pr list --repo jamescrowley321/py-identity-model --state merged --search 'CONS-1'`) + `origin/main` content — NOT open branches.
- **Dependencies:** a story may start only once the stories it depends on are **merged into `origin/main`** (verify their content is on main — `/go`, `/rust`, `/spec`, `/infra`). If a dependency isn't merged yet, set the task `blocked` and end; wait for the owner to merge it. Order: 1.1 → 1.2, 1.3 (independent imports) → 1.4 (needs /go+/rust+/spec on main) → 1.5 (needs /spec+/infra on main).
- On `complete`: clean up the task worktree, delete task-state, pick the next story **whose dependencies are merged**.

Everywhere below that says "stacked", "base off the previous story's branch", or `--base consolidation/...`, read it as **base off `origin/main`**.

## Running

One command — `run.sh` (in this dir) does the worktree + prompt copy + launch. **One PIM loop at a time** (no other PIM loop running):

```bash
ralph-prompts/run.sh pim-consolidation
```

It creates `/tmp/pim-consolidation-ralph` off `origin/main`, copies this prompt to `PROMPT.md`, and runs `ralph run --idle-timeout 0`. Per-task work happens in its own `/tmp/pim-CONS-1x` worktree. Cleanup: `git -C ~/repos/auth/py-identity-model worktree remove /tmp/pim-consolidation-ralph`.

**ONE PIM loop at a time.** Do NOT run concurrently with `token-harness.md`, `pim-capacity-breakpoint.md`, `pim-fapi2-hardening.md`, or any other PIM loop — they share `py-identity-model` and would collide. Remove stale orchestrator worktrees first (`git worktree list`).

## Reconcile before you start (STACKED mode — do not trust "merged")

This loop builds a **stack of open PRs**, so progress is NOT visible via merged PRs. Reconcile against the **open stack + task-state**, not `origin/main`:
1. `git fetch origin` in `py-identity-model`.
2. `gh pr list --repo jamescrowley321/py-identity-model --state open --head 'consolidation/cons-1'` — the highest open `consolidation/cons-1.*` branch is the current **stack head**.
3. Read `ORCH_WORKTREE/.claude/task-state.md` for the in-flight task.
4. The next story branches **off the current stack head** (the previous story's branch), NOT `origin/main` — see Routing.

If a story's ACs already appear satisfied in an open stacked PR, mark it `done` here and advance.

## Task Queue

STACKED: story N branches off story N-1's branch. Keep all PRs **open**; the owner validates the **top-of-stack (CONS-1.5) branch end-to-end** (its CI runs 1.1–1.5 together) and merges **bottom-up**. **Never auto-merge.**

| Task | Story | Description | Status |
|------|-------|-------------|--------|
| CONS-1.1 | Import Go → `/go` | Copy `identity-model/go/` → `py-identity-model/go/`; module `github.com/jamescrowley321/py-identity-model/go` (interim until CONS-3 rename); `go build ./...` + `go test ./...` + `go vet` green; document module-path change in `go/README.md` + CHANGELOG. Python core at root UNTOUCHED. | pending |
| CONS-1.2 | Import Rust → `/rust` | Copy `identity-model/rust/` → `py-identity-model/rust/`; keep crate `rs-identity-model`; `cargo test` + `cargo build --release` + `cargo deny check` green. | pending |
| CONS-1.3 | Import `/spec` | Copy `identity-model/spec/` → `py-identity-model/spec/`; preserve neutral vectors keyed on canonical error codes; Go + Rust executors resolve against relocated `/spec` and pass the same vector set. | pending |
| CONS-1.4 | Consolidate `/infra` | Merge PIM `test-fixtures/{node-oidc-provider,keycloak}` + `identity-model/infra/{node-oidc-provider,identityserver}` → one `/infra` (single docker-compose, dedup provider configs, pre-registered clients, health checks, headless authz-code+PKCE). Point Python(root)+Go+Rust integration suites at `/infra`; remove duplicate stacks once parity proven. | pending |
| CONS-1.5 | Python executor + coverage gate | Thin Python executor (in `src/tests/`) mapping `/spec` vectors → PIM API + canonical error codes; CI **coverage gate** fails if any language omits any vector id. PIM external OIDF `conformance/` harness UNTOUCHED. | pending |

**Sequencing:** CONS-1.1 → CONS-1.2 → CONS-1.3 → CONS-1.4 → CONS-1.5 (strict chain; each branches off the previous).

## Design decisions already made (do NOT re-litigate)

- **PIM survives; IM merges into it.** `py-identity-model` is the base repo (keeps history, 329 tags, OIDF cert, PyPI). IM history is expendable → plain copy commits.
- **CONS-1 does NOT move Python.** Python core stays at root `src/`, `conformance/`, `test-fixtures/`→`/infra`; **PyPI publishing is untouched this epic.** The `/py` relocation + `moon` + tag-scheme change are CONS-2 (next loop).
- **Go module path is interim** `github.com/jamescrowley321/py-identity-model/go` — it changes again at the CONS-3 rename. Accepted (0 prod consumers).
- **Build conformance vectors ONCE:** one `/spec` (neutral) + one `/infra`; thin per-language executor; coverage gate. PIM's black-box OIDF `conformance/` harness is a *different* kind of testing — leave it alone.
- **No `moon` in this loop.** moon lands in CONS-2. Do not add `.moon/` here.

## Routing

Repo: `~/repos/auth/py-identity-model` (loop CWD = `ORCH_WORKTREE` = `/tmp/pim-consolidation-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md`:
- **Does not exist** → pick first `pending` task, create state, execute `setup`.
- **phase is `complete`** → set status `done` in this file, keep the task worktree/branch/PR **open** (stacked — do NOT delete), delete state, pick next.
- **Any other phase** → read the phase file and execute it.

Phase pipeline: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`.
- **`test` phase = REAL proof**, not a green unit run: CONS-1.1 → `go build/test/vet` actually pass in `/go`; CONS-1.2 → `cargo test` + `deny` pass; CONS-1.3 → Go+Rust executors run the imported vectors green; CONS-1.4 → `docker compose up` the merged `/infra`, then the Python(root)+Go+Rust integration suites pass against it and no duplicate fixture stack remains; CONS-1.5 → the coverage gate FIRES on a synthetic missing-vector and reports 100% when whole. Run locally before `pr`.

## New Task Setup (STACKED)

Create `ORCH_WORKTREE/.claude/task-state.md`:
```
task_id: CONS-1.x
branch: consolidation/cons-1.x-<short-desc>   # e.g. consolidation/cons-1.1-import-go
worktree: /tmp/pim-CONS-1x
base_branch: <previous story's branch, or origin/main for CONS-1.1>
phase: setup
```
`setup` creates the task worktree **off the previous story's branch** (stacked):
```bash
# from ORCH_WORKTREE; BASE = origin/main for CONS-1.1, else the prior story's branch (e.g. consolidation/cons-1.1-import-go)
git worktree add /tmp/pim-CONS-1x -b consolidation/cons-1.x-<desc> <BASE>
```
The `pr` phase opens the PR with **base = the previous story's branch** (`--base consolidation/cons-1.(x-1)-…`), not `main`. If all done: `<promise>LOOP_COMPLETE</promise>`.

## Phase Instructions

Read the current phase file: `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`. All work after `setup` happens in the task worktree — `cd /tmp/pim-CONS-1x` first.

## Task-Specific Guidance

- **CONS-1.1 (Go):** source = `~/repos/auth/identity-model-legacy/go/`. Copy the tree to `py-identity-model/go/`; rewrite the module path to `.../py-identity-model/go` in `go.mod` + all imports; `go mod tidy`; ensure `go build/test/vet ./...` green. Verify the root Python suites are unaffected (no CI trigger/path collision).
- **CONS-1.2 (Rust):** source = `~/repos/auth/identity-model-legacy/rust/`. Copy to `py-identity-model/rust/`; crate name stays `rs-identity-model`; `cargo test`, `cargo build --release`, `cargo clippy`, `cargo deny check` all clean (no new advisories).
- **CONS-1.3 (spec):** source = `~/repos/auth/identity-model-legacy/spec/` (+ any `spec/conformance` contract). Copy to `py-identity-model/spec/`; keep the vector schema (canonical error codes, not per-language types); point the Go/Rust executors from 1.1/1.2 at `/spec`; confirm the full imported vector set passes.
- **CONS-1.4 (infra):** merge PIM `test-fixtures/` (node-oidc-provider, keycloak, Descope/Ory profiles) + `identity-model/infra/` (node-oidc-provider, identityserver) into ONE `/infra` with a single `docker-compose.yml`. Pre-register client-credentials, authz-code+PKCE, and public+PKCE clients; configurable claims; health check gating CI. Wire headless authz-code+PKCE (carry epic-0a AC-0A.5). Repoint Python(root)+Go+Rust integration suites to `/infra`; delete the now-redundant duplicate fixture copies; `docker compose config` validates.
- **CONS-1.5 (executor + gate):** add a thin Python executor under `src/tests/` mapping each `/spec` vector to PIM's API + canonical outcome; add a CI coverage gate that fails naming any `(language, vector-id)` a language did not execute. Do NOT touch PIM's external OIDF `conformance/` harness.

## Rules

- ONE phase per iteration, then end.
- Run from `ORCH_WORKTREE` (`/tmp/pim-consolidation-ralph`), never the main checkout. Never commit to `main` — task work happens in `/tmp/pim-CONS-1x` worktree branches.
- Run `make lint` as a single command before every commit; no `--no-verify`.
- **The deliverable IS the proof** — a real `go build/test`, `cargo test`, vectors-green, merged-`/infra`-integration run, and the coverage gate firing — not a green unit run. Run it locally before `pr`.
- All unit AND integration tests must pass (Python at root stays green throughout; Go + Rust green in-repo). Never rationalize a red test as pre-existing, environmental, or out-of-scope.
- **STACKED:** branch each story off the previous story's branch; open each PR with `--base` the previous branch; keep the whole stack **open**. Conventional-commit PRs, one story per PR, each linking epic CONS-1 (`epic-cons1-im-merge-testinfra.md`) and its story id. **Never auto-merge** — the owner validates the top-of-stack (CONS-1.5) end-to-end and merges bottom-up (no `gh pr merge`, `--auto`, or merge-queue).
- CONS-1 should not touch PIM's gated `core/` Python modules; if a PR does, honor the mutation `security-gate` (`tools/mutation_security.py`), function-scoped.
- If stuck 3+ iterations on one task: set it `blocked`, leave the worktree/PR in place, move on.
- If all done: `<promise>LOOP_COMPLETE</promise>`

## Follow-on (NOT this loop)

- **CONS-2** (reorg → `/py`, moon, semantic-release re-point + `py-v` tags + seed `py-v3.10.0`, Go/Rust release CI, reserve `/node`, publishing-parity gate): stage `pim-consolidation-cons2.md` after the CONS-1 stack merges. Several sub-tasks are owner-gated (tag seeding, crates.io/PyPI secrets).
- **CONS-3** (archive old `identity-model`, rename repo, PyPI Trusted-Publishing re-config, fix refs, reconcile planning docs): **owner-manual** — GitHub/PyPI admin, run after CONS-2.
