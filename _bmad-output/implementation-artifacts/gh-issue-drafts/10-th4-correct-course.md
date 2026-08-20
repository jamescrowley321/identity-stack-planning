<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: epic, load-testing, test-architecture, correct-course
-->
# Title
TH-4 correct-course: load suite from absolute-SLO gate → two-tier invariant gate

# Body
**Meta / parent for the TH-4 load-suite correct-course.** Post-crash re-diagnosis found the perf gates **vacuous** (`GATES` all-`None`, populated nowhere — `runner.py:78-81`) and the capacity assertions **structurally flaky** on the co-located runner (`test_load_capacity.py:70-85`). The suite proves cache/correctness *invariants* well but **cannot catch a perf regression**.

- Proposal: `identity-stack-planning` → `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-19.md`
- Epic: `epics-token-harness.md` → Epic TH-4 (TH-4.3 split into T314a/T314b; TH-4.4 de-flake; TH-4.5 absorbs T314b)

## The split (by what is mechanically stable on shared CI)
- **Track A — invariant gates** (PR + nightly, machine-independent, never flake): 5xx=0, uniform 401, single-flight counts, warm miss≤1, bounded RSS/FD, **+ new** S2 ratio band + cache-hit-by-count. → **LP-2 / T314a**
- **Track B — reported metrics** (artifacts + trend, never a shared-CI pass/fail): absolute RPS/p99/knee. De-flake C1/C2. → **LP-1**
- **Track C — absolute SLO gates** (isolated runner only, owner-gated): calibrated p99/RPS. → **T314b / TH-4.5**

## Child PRs (stacked; merge bottom-up)
- [ ] **LP-1** de-flake C1/C2 (#11)
- [ ] **LP-2** activate invariant gates + injected-regression proof (#12)
- [ ] **LP-3** resolve S10 coverage honesty (#13)
- [ ] **LP-4** docs reframe (#14)

## Definition of done
- Track-A gates FIRE on an injected regression; nightly capacity cannot false-fail on runner noise; docs state the A/B/C model; S1–S12 coverage claims match reality.
- Absolute-SLO calibration explicitly **deferred** to TH-4.5 (isolated runner).
