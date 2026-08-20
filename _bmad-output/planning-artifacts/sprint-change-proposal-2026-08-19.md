# Sprint Change Proposal — Correct-Course Epic TH-4: Load Suite from Absolute-SLO Gate to Two-Tier Invariant Gate

**Date:** 2026-08-19
**Trigger:** Owner (James) flagged the load tests as "not done right." Post-crash re-diagnosis of the landed TH-1.5 + TH-4 suite (`py-identity-model` PRs #521–528) found the perf gates **vacuous** and the capacity assertions **structurally flaky** on the co-located free runner.
**Mode:** Batch
**Scope Classification:** Significant — reverses **TH-4.3 (T314)**'s core DoD (absolute-threshold calibration on shared CI, which is unachievable there) and de-flakes **TH-4.4 (T315)**. Converges on the same *catch-a-perf-regression* goal via a different, machine-independent mechanism.
**Status:** Proposed (pending owner review)

---

## 1. Issue Summary

The Locust harness that TH-1.5 + TH-4 landed is mechanically excellent — real Locust in a subprocess, a real uvicorn RS, single-flight proofs, RSS/FD sampling, artifacts on every run. But it was framed as an **SLO gate** and shipped as a **measurement harness**. Today it proves cache/correctness *invariants* (well) and **cannot catch a performance regression at all**.

| # | Defect | Evidence | Severity |
|---|---|---|---|
| 1 | **Perf gates are vacuous.** `GATES = {"warm": Gate(), "cold": Gate()}` — every threshold `None`, populated nowhere. `evaluate_gates()` only fails on 5xx or steady-state status divergence. A 10× latency blowup or throughput collapse passes green. | `runner.py:78-81`, `369-411`; vacuous assert at `test_load_ci_short.py:84-92` | **High** |
| 2 | **The calibration DoD is self-contradictory on shared CI.** TH-4.3 (T314) says "calibrate `max_p99_ms`/`min_rps` from a baseline **on the target runner** + headroom." The target runner is a **co-located** box (generator + mock OP + RS share cores) — absolute p99/RPS there are **contention noise**. Any absolute threshold is either too loose (useless) or too tight (flaky). This is *why* `GATES` is still empty. | epic §TH-4.3; arch §5/§10; `scenarios.py:24-27` | **High** (the plan, not just the code) |
| 3 | **Capacity C1/C2 are structurally flaky co-located.** `test_each_ramp_found_a_breakpoint` *requires* a breach in the 500→8000 ladder and asserts `max_sustainable_rps > 0`. On a noisy shared box, step-1 (500 rps) against one CPython worker can plateau below `sustain_ratio` → `max_sustainable_rps` stays 0 → **false fail**. And the knee is contention noise regardless. | `test_load_capacity.py:70-85`; `scenarios.py:395-416`; nightly-only | **Medium** |
| 4 | **S2 alg-cost ratio is reported, never gated.** The scenario exists to catch ES256/RS256 cost regressions; the test asserts only `ratio > 0`. A *ratio* is machine-stable — the one absolute-ish signal that *could* gate on shared CI, and doesn't. | `test_load_ci_short.py:68-81` | Medium |
| 5 | **S10 is an unimplemented scaffold inside the S1–S12 matrix.** Honestly flagged ("Do NOT treat as coverage"), but "S1–S12 coverage" is really 11 scenarios. | `scenarios.py:355-367` | Low |
| 6 | **Soak ceilings hardcoded + generous; `performance.md` quotes unsourced latencies** (1.5ms/1.8ms/3.7×) with no directional caveat. Tripwires, not calibrated gates. | `test_load_nightly.py:89-90`; `docs/performance.md` §Benchmarks | Low |

**Root cause.** The epic tried to make one gate do two incompatible jobs: (a) a *deterministic regression gate* that must never flake on shared CI, and (b) an *absolute capacity/SLO number* that only an isolated runner can produce honestly. Conflating them left the deterministic gate empty (to avoid flakes) and the capacity gate flaky (to force a number). Splitting them resolves both.

---

## 2. Impact Analysis

### Story Impact (Epic TH-4)

| Story | Task | Status | Impact |
|---|---|---|---|
| **TH-4.1** Ramp/worker knobs | T312 | done (#526) | Unaffected — the ramp machinery is correct; only its *assertions* change. |
| **TH-4.2** RSS/FD + refresh | T313 | done (#527/#528) | Unaffected — bounded-trend soak tripwire stays (Track A). |
| **TH-4.3** Baseline + SLO calibration | T314 | **not done → reframed** | **Split.** New **T314a** (ship machine-independent invariant gates on shared CI *now*, prove they fire on an injected regression) + **T314b** (absolute `max_p99_ms`/`min_rps` calibration **deferred** into TH-4.5, isolated-runner only). |
| **TH-4.4** Capacity scenarios + `CAPACITY` profile | T315 | landed-but-flaky → **amended** | De-flake: assert the *mechanism* (goodput plateau, no 5xx, curve renders), not "a breakpoint exists within a fixed ladder." Knee is **reported**, not asserted-present. |
| **TH-4.5** Larger-runner nightly + regression gate | T316 | not done | **Absorbs T314b** — the *only* honest home for absolute p99/RPS gates; owner-gated on provisioning the larger runner. |

### Also (TH-1.5 leftover)
| Item | Impact |
|---|---|
| **S10** blocking-validator scaffold | Formally **de-scoped** from the S1–S12 coverage matrix (relabel as tracked backlog), so coverage claims are honest. Implementing a blocking custom validator wired into the RS app is a separate feature, not TH-4. |

### Artifact Conflicts
| Artifact | Action |
|---|---|
| `runner.py` `GATES` + `Gate` docstrings (`:62-81`) | Rewrite: "invariant-based on shared CI; absolute SLO on isolated runner only." |
| `scenarios.py:24-27` (uncalibrated-gate note) | Rewrite to the two-tier framing. |
| `docs/performance.md` §Benchmarks | Label quoted latencies illustrative vs measured; add the directional caveat + link to the artifact reports. |
| `src/tests/load/README.md` | Add the "invariant gates (Track A) vs reported metrics (Track B) vs isolated-runner SLO (Track C)" table. |
| `epics-token-harness.md` TH-4.3/TH-4.4 | Amend in this pass (banner + reframed ACs). |

---

## 3. Recommended Approach

**Selected: Correct-course + amend TH-4 (BMAD-canonical for a change to an in-flight documented plan).**

Split the one conflated gate into three tiers by **what is mechanically stable on shared CI**:

- **Track A — Invariant gates (PR + nightly; must stay green; machine-independent).** Keep the correctness invariants (5xx=0, uniform 401, single-flight counts, warm miss≤1, bounded RSS/FD). **Add** the stable ones currently missing: a **wide-band S2 alg-cost ratio** gate (#4) and a per-warm-scenario **cache-hit-by-count** invariant. These fail only on real regressions, never on runner noise — the mechanical gate (mutation-style, not exhortation). **This is what T314 delivers on shared infra (→ T314a).**
- **Track B — Reported metrics (artifacts + trend; never a hard pass/fail on shared CI).** Absolute RPS / p99 / knee live here honestly. Smoke/capacity/soak reports already upload; add trend for *review*. **De-flake C1/C2** (#3): assert mechanism + no-5xx + curve-renders; the knee is reported, not asserted-present-in-a-fixed-ladder.
- **Track C — Absolute SLO gates (isolated runner; owner-gated).** The only honest home for calibrated p99/RPS thresholds (**T314b, folded into TH-4.5**). Blocked on provisioning `ubuntu-latest-8-cores` (or equivalent). Until it exists, ship **no** absolute gates.

**Execution: GH stacked PRs into `py-identity-model`** (each off the previous; owner merges bottom-up; never auto-merge). Not a ralph loop — bounded, well-scoped, touches the released repo (owner-in-the-loop per PR, per the in-session-work preference).

**Rationale:** the deterministic gate stops being empty and the capacity gate stops being flaky — both defects resolve from the same split. The *goal* (catch perf regressions between releases) is preserved; only the mechanism moves from "absolute thresholds everywhere" to "invariants on shared CI, absolutes on an isolated runner."
**Effort:** Medium — 4 small stacked PRs; the RS/harness machinery already exists.
**Risk:** Low — Track A additions are new *tightenings* proven to fire on an injected regression; Track B change only *loosens* a flaky nightly assert; no released library code changes.

---

## 4. Detailed Change Proposals (the code stack)

| PR | Maps to | Change |
|---|---|---|
| **LP-1** (off `main`) | TH-4.4 / #3 | De-flake C1/C2: drop the "must find a breakpoint in the 500→8000 ladder" + `max_sustainable_rps>0` hard asserts. Keep: monotonic offered rate, **zero 5xx under saturation**, goodput-plateau *when* a knee is found, and "capacity report renders." Ladder-exhausted-clean becomes a reported outcome, not a failure. |
| **LP-2** (off LP-1) | TH-4.3 → **T314a** / #4 | Activate the **machine-independent** gates: (a) S2 alg-cost ratio **wide-band** gate (e.g. `0.2 ≤ ES256/RS256 ≤ 5.0`, calibrated wide from a real run — catches an order-of-magnitude regression, not runner noise); (b) per-warm-scenario cache-hit-by-count invariant folded into `evaluate_gates`. Add an **injected-regression test** proving each new gate FIRES (self-asserted green is not proof). |
| **LP-3** (off LP-2) | TH-1.5 leftover / #5 | Resolve S10: de-scope from the S1–S12 coverage matrix (relabel "deferred backlog: blocking-validator RS app"); keep a tracked note so coverage claims are honest. |
| **LP-4** (off LP-3) | #2, #6 | Reframe docs: `runner.GATES`/`Gate` docstrings, `scenarios.py` gate note, `docs/performance.md` (illustrative-vs-measured + directional caveat), and a new `src/tests/load/README.md` Track A/B/C table. |

Absolute p99/RPS calibration is **not** in this stack — it moves to **TH-4.5 (T314b)** and waits on the isolated runner.

---

## 5. Implementation Handoff

**Scope:** Significant — story amendments (SM) + this proposal (Analyst) + execution as stacked PRs (Developer).

### New / amended artifacts (this pass)
- `planning-artifacts/sprint-change-proposal-2026-08-19.md` (this file)
- `planning-artifacts/epics-token-harness.md` — TH-4.3 split into T314a/T314b; TH-4.4 de-flake banner; TH-4.5 absorbs T314b; S10 de-scope note
- `implementation-artifacts/gh-issue-drafts/{10-th4-correct-course,11-lp1-deflake,12-lp2-invariant-gates,13-lp3-s10,14-lp4-docs}.md` (local drafts; unfiled)

### Execution sequence (GH stacked PRs into `py-identity-model`)
Branch each off the previous; owner merges bottom-up; never auto-merge.
1. **LP-1** (off `main`) — de-flake C1/C2 (nightly stops false-failing).
2. **LP-2** (off LP-1) — activate the S2-ratio + cache-hit invariant gates + injected-regression proof.
3. **LP-3** (off LP-2) — resolve S10 coverage honesty.
4. **LP-4** (off LP-3) — docs reframe.

### Success criteria
- [ ] `evaluate_gates` fails a deliberately injected latency-ratio / cache-miss regression (Track A gates prove they FIRE).
- [ ] The nightly `CAPACITY` job cannot false-fail on a noisy runner; it renders a knee curve as an artifact and only fails on 5xx / non-monotonic offered rate.
- [ ] `docs/performance.md` + `src/tests/load/README.md` state the Track A/B/C model; no unsourced absolute number is presented as a gate.
- [ ] S1–S12 coverage claims match what actually asserts (S10 de-scoped).
- [ ] **Deferred (TH-4.5 / T314b):** absolute `max_p99_ms`/`min_rps` calibration on the owner-provisioned isolated runner.
