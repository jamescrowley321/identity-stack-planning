<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: load-testing, test-architecture, enhancement
-->
# Title
LP-2 (TH-4.3a / T314a): activate machine-independent invariant gates + prove they fire

# Body
Today `evaluate_gates` (`runner.py:369-411`) only fails on 5xx or steady-state status divergence — every perf threshold is `None`. Add the gates that are **machine-independent** (safe on shared CI) and prove they FIRE. Absolute p99/RPS thresholds are **out of scope** (Track C / TH-4.5).

## Change
- **S2 alg-cost ratio band gate.** `alg_cost_ratio("valid_es256","valid")` currently asserted only `> 0` (`test_load_ci_short.py:68-81`). Add a **wide band** (e.g. `0.2 ≤ ratio ≤ 5.0`) — a *ratio* is machine-stable, so this catches an order-of-magnitude alg-cost regression without flaking on runner noise. Band bounds documented as "wide by design, not an SLO."
- **Per-warm-scenario cache-hit-by-count invariant** folded into `evaluate_gates` (warm scenarios: measured-window misses stay at the cold-start bound; hits > 0), reusing the request-count-independent form from #539.
- **Injected-regression test:** a unit test that constructs a `LoadResult` with a blown ratio / injected cache miss and asserts `evaluate_gates` returns a violation — a self-asserted green is not proof.

## Definition of done
- New gates live in `evaluate_gates`; CI-short suite still green on a real run.
- Injected-regression test proves each new gate fails on a bad result.
- No absolute `max_p99_ms`/`min_rps` set on shared CI.

## Files
`src/tests/load/runner.py`, `src/tests/load/test_load_ci_short.py` (+ a focused unit test). Branch: off LP-1.
