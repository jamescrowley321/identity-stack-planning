<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: docs, load-testing
-->
# Title
LP-4 (TH-4 correct-course): reframe load docs — invariant gates vs reported metrics vs isolated-runner SLO

# Body
The docs still present the suite as an SLO gate with "calibration pending," and `docs/performance.md` quotes fixed latencies (1.5ms / 1.8ms / 3.7×) with no source and no directional caveat. Align the prose with the two-tier reality.

## Change
- **`runner.py` `Gate`/`GATES` docstrings** (`:62-81`): drop "the docs phase writes the calibrated numbers here"; state that shared CI carries **invariant** gates only, and absolute SLO thresholds live on the isolated runner (TH-4.5).
- **`scenarios.py:24-27`** gate note: rewrite to the Track A/B/C framing.
- **`docs/performance.md`** §Benchmarks: label quoted numbers **illustrative** (or source them); add the co-located **directional** caveat; link to the smoke/capacity/soak artifact reports.
- **`src/tests/load/README.md`**: add a Track A (invariant, gated) / Track B (reported) / Track C (isolated-runner SLO) table so a reader knows what actually fails a build.

## Definition of done
- No unsourced absolute number is presented as a gate anywhere in load docs.
- README states exactly which signals fail a shared-CI build vs which are reported.

## Files
`src/tests/load/runner.py`, `src/tests/load/scenarios.py`, `docs/performance.md`, `src/tests/load/README.md`. Branch: off LP-3.
