Self-referential loop. ONE phase of ONE task per iteration, then end. Fresh context each iteration — persist all state to files.

**Epic:** py-identity-model #462 — *E2E Token-Blaster Harness*, sub-epic **TH-4 Capacity & Breakpoint** (extends the already-landed TH-1.5 Locust harness — PR #524).
**Design (source of truth):** `identity-stack-planning` → `_bmad-output/planning-artifacts/architecture-token-harness-load-soak.md` (§4 scenarios, §5 SLOs, **§10 Capacity & Breakpoint Methodology**) and the epic `epics-token-harness.md` (**Epic TH-4**).

## Running

Run from a **dedicated py-identity-model worktree**, never the primary `~/repos/auth/py-identity-model` checkout — keeps `PROMPT.md`/`.claude/task-state.md` out of it and `main` pristine.

```bash
# One-time: orchestrator worktree off main
cd ~/repos/auth/py-identity-model
git fetch origin
git worktree add /tmp/pim-capacity-ralph -b ralph/capacity origin/main

cd /tmp/pim-capacity-ralph
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/pim-capacity-breakpoint.md PROMPT.md
ralph run --idle-timeout 0        # 0 = don't SIGTERM long-quiet phases (uvicorn boots / Locust ramps / soaks go quiet for minutes)
```

`ORCH_WORKTREE` = `/tmp/pim-capacity-ralph`. The prompt must live there as `PROMPT.md` for the whole run (ralph re-reads it each iteration); the planning-repo copy is source of truth — edit there and re-`cp` to change the workstream mid-run. Per-task work happens in its own `/tmp/pim-T3XX` worktree created by `setup`. When done: `cd ~/repos/auth/py-identity-model && git worktree remove /tmp/pim-capacity-ralph`.

**ONE PIM loop at a time.** Do NOT run concurrently with `token-harness.md`, `pim-fapi2-hardening.md`, or `pim-shipped-audit.md` — they share `py-identity-model` and would collide. Remove stale orchestrator worktrees first (`git worktree list`).

## Reconcile before you start (the queue and local checkouts drift)

TH-4 **builds on already-merged work**. Before picking a task: `git fetch origin` and `gh pr list --repo jamescrowley321/py-identity-model --state merged --limit 40`. **TH-1.1/1.2/1.3/1.5 + T299 are MERGED (PRs #520–#524) and on `origin/main`** — the `src/tests/load/` Locust suite (`runner.py`, `scenarios.py`, `locustfile.py`, `pool.py`), the `src/tests/harness/` RS boot + mock OP + `TokenSource`, the T299 cache-hit counters (`core/cache_metrics.py`), and the CI/nightly load jobs (`ci.yml` `load-smoke`, `nightly.yml` `load-soak`) all EXIST. **Build ON them; do NOT rebuild.** If any row below contradicts merged reality on `origin/main`, trust `origin/main`.

## Task Queue

One story = one PR off `main`, owner-merged. Base-chain where a later task edits a file an earlier one changed (`runner.py`, `scenarios.py`, `nightly.yml`).

| Task | Issue · Story | Description | Status |
|------|---------------|-------------|--------|
| T312 | TH-4.1 | Ramp + open-model + worker knobs — add a Locust `LoadTestShape` (stepped) + a constant-arrival (open-model) mode; decouple spawn-rate from users; parameterize RS `workers=N`. Thread through `Scenario`, `_run_locust`, `_scenario_stack` (which today calls `boot_rs` with no `workers`). | pending |
| T313 | TH-4.2 | RSS/FD instrumentation + long-soak token refresh — sample the RS subprocess RSS/FD (`psutil` on the `boot_rs` PID) into `LoadResult`; make S11 assert a bounded RSS/FD trend (real leak gate). Wire `LoadPool.refresh()` into the subprocess path so soaks >300s don't replay expired tokens. | pending |
| T314 | TH-4.3 | Baseline + SLO-gate calibration — run the P3 baseline (design §8) on the target runner; set the dormant `GATES` thresholds (`max_p99_ms`/`min_rps`/`max_error_rate`/`min_cache_hit_rate`) from baseline + headroom; write the calibrated table into `src/tests/load/README.md`; reconcile `docs/performance.md`. Activates the §5 gates the design owes. | pending |
| T315 | TH-4.4 | Capacity/breakpoint scenarios + `Profile.CAPACITY` — warm ramp-to-SLO-breach, cold ramp, and a cross-worker scaling sweep (workers 1→cores, prove ≥0.8× linear per §5/S1). Implement max-sustainable-load detection (ramp until a gate trips; record the knee: RPS, users, p99, worker count). Emit a capacity curve/report. | pending |
| T316 | TH-4.5 | Larger-runner nightly full sweep + report artifact + regression gate — point the nightly load job at a larger GitHub runner; run the full breakpoint sweep; allocate cores (RS `workers≈cores−2`, lean gen + mock OP); upload the capacity report artifact; add a perf-regression gate on p99/RPS/error deltas vs the T314 baseline. `nightly.yml` + `Makefile` `test-harness-load-nightly` + `test_load_nightly.py`. | pending |

**Sequencing:** T312 → (T313, T314 in parallel) → T315 → T316.

## Design decisions already made (do NOT re-litigate — read design §10)

- **Infra: bigger CI runner only, co-located.** No deployed target / distributed generator (out of scope, owner decision). Generator + in-process mock OP + RS share one (larger) GitHub runner, so numbers are **directional** — the co-located knee + a solid nightly regression signal, **not** the RS's absolute isolated ceiling. Make RS crypto the bottleneck: lean replay generator (no crypto client-side), minimal mock-OP hits (pre-minted pool + single-flight caches), RS `workers ≈ cores−2`.
- **Breakpoint method: open-model ramp-to-SLO-breach.** The current closed-loop `ReplayUser` (no `wait_time`) self-throttles as latency rises and **hides the knee** — add a stepped `LoadTestShape` + a constant-arrival option. Ramp until a gate trips (p99 > ceiling, error > budget, or throughput plateaus); record the knee.
- **Cadence: full ramp-to-breakpoint sweep runs nightly** (accept the longer/costlier nightly). The CI-short PR gate (`CI_SHORT` profile) stays fast and unchanged; add a **new `Profile.CAPACITY`** for the sweep rather than bloating `CI_SHORT`.
- **Larger-runner label is an OWNER prerequisite** (paid GitHub-hosted feature, enabled in repo/org runner settings). Implement T316's job with the larger-runner label (e.g. `ubuntu-latest-8-cores`) **and** document the `ubuntu-latest` (2-vCPU) fallback + that the sweep is capacity-capped until it's provisioned. Do not block the loop on it.

## Routing

Repo: `~/repos/auth/py-identity-model` (loop CWD = `ORCH_WORKTREE` = `/tmp/pim-capacity-ralph`).

Read `ORCH_WORKTREE/.claude/task-state.md`:
- **Does not exist** → pick first `pending` task, create state, execute `setup`.
- **phase is `complete`** → set status `done` in this file, clean up the task worktree, delete state, pick next.
- **Any other phase** → read the phase file and execute it.

Phase pipeline: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`.
- **`test` phase = a REAL ramp/sweep run producing a capacity curve** — a green unit run is NOT proof (same bar as TH-1.5). Show the ramp tripping a gate at a recorded knee (T315), the calibrated `GATES` firing on an injected regression (T314), or the RSS/FD leak gate tripping on a synthetic leak (T313). Run it locally (`make test-harness-load-nightly` / the new capacity target) before `pr`.
- **`docs` phase =** the calibrated SLO table + capacity-report format in `src/tests/load/README.md`, and the `docs/performance.md` reconcile (T314).

## New Task Setup

Create `ORCH_WORKTREE/.claude/task-state.md`:
```
task_id: T3XX
branch: <type>/<short-desc>   # e.g. test/load-ramp-shape, ci/capacity-nightly
worktree: /tmp/pim-T3XX
phase: setup
```
`setup` creates the task worktree: `git worktree add /tmp/pim-T3XX -b <branch> origin/main` (from `ORCH_WORKTREE`). If all done: `<promise>LOOP_COMPLETE</promise>`.

## Phase Instructions

Read the current phase file: `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`. All work after `setup` happens in the task worktree — `cd /tmp/pim-T3XX` first.

## Task-Specific Analysis Guidance

Read design `architecture-token-harness-load-soak.md` §4/§5/§10 for every task.

- **T312 (ramp/open-model/workers):** `_run_locust` (`src/tests/load/runner.py`) pins `-r == -u` ("ramp all users in one second") — instant constant-load. Add a `LoadTestShape` subclass in `locustfile.py` with stepped stages and thread stage config through the subprocess (env/pool-file), and add a constant-arrival mode (`constant_throughput`/`constant_pacing` `wait_time`, or a target-RPS shape) so offered load doesn't self-throttle. Add `workers`, `shape`, and open/closed knobs to the `Scenario` dataclass (`scenarios.py`); `_scenario_stack` (`runner.py`) must pass `workers=` to `boot_rs` (`src/tests/harness/rs_server.py`, already supports `workers>=2`). Per-worker `/metrics` counters (`rs_app.py`) must be aggregated across workers. DoD: a real short ramp run whose per-stage RPS/latency is captured.
- **T313 (RSS/FD + refresh):** No memory/FD is measured today (S11 is titled for it but nothing samples it — the only leak signal is 5xx). Sample the RS subprocess (`psutil.Process(pid).memory_info().rss` / `.num_fds()`) on a timer during the run; add fields to `LoadResult` (`runner.py`); make S11 assert a **bounded** RSS/FD trend and add a `evaluate_gates` leak check. The pool is frozen at subprocess start — `LoadPool.refresh()` (`pool.py`) is never called; wire a re-mint cadence into the replay path (or classify post-expiry 401s as expected, per design §1) so soaks >300s don't 401 on expired `valid` tokens. If T313 touches a gated `core/` module, honor the mutation `security-gate`.
- **T314 (baseline + gate calibration):** `GATES = {"warm": Gate(), "cold": Gate()}` are all-`None` (dormant); only `server_errors==0` + status-correctness fire. Run the design §8 P3 baseline, then set `max_p99_ms`/`min_rps`/`max_error_rate`/`min_cache_hit_rate` from baseline + headroom (design §5 starting bars: warm p99 ≤~low-ms, ≥800 RPS/worker, ≤0.1% error, ≥99% cache-hit — calibrate, don't hardcode). Write the calibrated table into `src/tests/load/README.md`; correct `docs/performance.md`. DoD (test phase): the calibrated gates must FIRE on an injected regression — a self-asserted green is not proof.
- **T315 (breakpoint scenarios + CAPACITY profile):** Add `Profile.CAPACITY` and scenarios that RAMP (built on T312's shape): warm ramp-to-SLO-breach, cold ramp, and a cross-worker scaling sweep (workers 1→physical cores; prove ≥0.8× linear per §5/S1 — S1 already asks to "find the RPS where p99 knees, then prove near-linear scaling across `--workers N`"). Implement **max-sustainable-load detection**: ramp arrival rate until a `GATES` bar trips, record the knee (RPS, users, p99, worker count). Emit a capacity curve/report (per-worker max-sustainable RPS + knee). Connects to design §9 **#516** (thread-pool offload vs worker-count guidance — the S1/S2 numbers decide it): surface the data, don't implement #516 here.
- **T316 (larger-runner nightly + report + gate):** Point the nightly load job at a larger GitHub runner label; run the full `CAPACITY` sweep + `NIGHTLY` soak there; allocate cores (RS `workers≈cores−2`); upload the capacity report as an artifact (`actions/upload-artifact`); add a perf-regression gate that fails on p99/RPS/error deltas vs the T314 baseline. Edit `.github/workflows/nightly.yml`, `Makefile` (`test-harness-load-nightly`), `test_load_nightly.py`. Document the `ubuntu-latest` fallback + that the larger-runner label is an owner prerequisite.

## Rules

- ONE phase per iteration, then end.
- Run from `ORCH_WORKTREE` (`/tmp/pim-capacity-ralph`), never the main checkout. Never commit to `main` — task work happens in `/tmp/pim-T3XX` worktree branches.
- Run `make lint` as a single command before every commit; no `--no-verify`.
- **The deliverable IS the proof** — a **real ramp/sweep run** (capacity curve, gate tripping at a recorded knee), not a green unit run. Run the load target locally before `pr`.
- All unit AND integration tests must pass. Never rationalize a red test as pre-existing, environmental, or out-of-scope.
- **Reconcile the queue against merged reality first** (`gh pr list --state merged`, `origin/main`) — TH-1.x is DONE; build on the landed `src/tests/load/` + `src/tests/harness/`, do not rebuild.
- Conventional-commit PRs against `main`, one story per PR, each linking epic #462 and its TH-4 story. **Never auto-merge** — the owner reviews and merges every PR (no `gh pr merge`, `--auto`, or merge-queue).
- The mutation `security-gate` runs on any PR touching a gated `core/` module (T313 may touch `core/cache_metrics.py`): kill or exact-name-waive its in-scope mutants (`tools/mutation_security.py`); function-scoped.
- Numbers are **directional** (co-located, bigger-runner-only) — state cache-state + algorithm + worker-count + runner on every capacity figure; do not claim absolute isolated ceilings.
- If stuck 3+ iterations on one task: set it `blocked`, clean up the worktree, move on.
- If all done: `<promise>LOOP_COMPLETE</promise>`
