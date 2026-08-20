<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: load-testing, flaky-test, bug
-->
# Title
LP-1 (TH-4.4): de-flake capacity C1/C2 — knee is reported, not asserted-present

# Body
`test_load_capacity.py:70-85` asserts every ramp **must** breach inside the 500→8000 ladder (`found_breakpoint`) and `max_sustainable_rps > 0`. On a noisy co-located runner, step-1 (500 rps) against one CPython worker can plateau below `sustain_ratio` → `max_sustainable_rps` stays 0 → **false fail**. The knee is contention noise there regardless (`scenarios.py:395-416`, "directional not absolute").

## Change
- Drop the "must find a breakpoint within the ladder" + `max_sustainable_rps > 0` hard asserts.
- **Keep:** monotonic offered rate; **zero 5xx under saturation**; goodput-plateau reason recorded *when* a knee is found; capacity report renders each scenario + knee.
- Ladder-exhausted-clean becomes a **reported** outcome (render "NO breakpoint within ladder — raise stop_rps"), not a test failure.

## Definition of done
- Nightly `CAPACITY` job fails only on 5xx / non-monotonic offered rate / un-rendered report.
- A ladder that exhausts clean (fast runner) OR breaches at step-1 (slow runner) both pass; the curve is always emitted as an artifact.

## Files
`src/tests/load/test_load_capacity.py` (+ `runner.py` only if a helper is needed). Nightly-only; no PR-gate impact.
Branch: off `main`. Stacked base for LP-2.
