# Sprint Change Proposal — Conformance Coverage Before py 5.0.0

**Date:** 2026-11-15
**Trigger:** Owner (James) reviewing a conformance-coverage audit of `release/v5` (post-[identity-model#1130](https://github.com/jamescrowley321/identity-model/pull/1130)): "Tests must come prior to v5."
**Mode:** Batch
**Scope Classification:** Moderate — backlog reorganization. No goal changes; the release gains a test phase.
**Status:** Proposed

---

## 1. Issue Summary

The OIDF conformance suite (`release-v5.3.4`) has about 32 RP-side test plans. After #1130, CI runs 6 of them, each with one variant set. About 15 more apply to features py-identity-model ships and are never run. The runs that do happen still have ways to pass for the wrong reason.

| Area | Evidence |
|---|---|
| Nonce modules test harness code | `conformance/app.py` calls `validate_id_token` without `nonce=` and compares the nonce itself. A library nonce regression passes every nonce module. |
| Coarse rejection reasons | Every ID-token rejection is recorded as `id_token_validation`. Until #1130's key-selection fix, every FAPI2 negative module passed for the wrong reason (`Key type 'OKP' is incompatible`). |
| Dynamic / logout plans never run | Harness code and manifests exist. The committed `*-latest.json` evidence is from 2026-08-02, pre-5.0 API, pre-5.3.4. `rp-init-logout-no-state` can never run: the harness omits `state`, and the suite skips the module when `state` is absent. |
| Client auth | `client_secret_post`, `tls_client_auth` and `self_signed_tls_client_auth` ship but get no OIDC conformance. `private_key_jwt` and mTLS are only exercised through FAPI2. |
| Flows that ship but aren't tested | Hybrid and implicit (at_hash/c_hash); refresh (and the library lacks the OIDC Core §12.2 refreshed-ID-token continuity check); FAPI2 variants other than the three run. |
| Gating | The hosted suite has never run against `release/v5`. `conformance-fapi2` is not a required check on main. `release/v5` has no protection. |

The full audit with file:line citations is in the session record behind [identity-model#1131](https://github.com/jamescrowley321/identity-model/issues/1131) and the issues below.

## 2. Impact Analysis

### Epics and issues

| Item | Impact |
|---|---|
| [identity-model#904](https://github.com/jamescrowley321/identity-model/issues/904) (5.0.0 epic) | Gains Phase D3, a conformance-coverage phase. It blocks [#915](https://github.com/jamescrowley321/identity-model/pull/915). |
| [#1138](https://github.com/jamescrowley321/identity-model/issues/1138), [#1139](https://github.com/jamescrowley321/identity-model/issues/1139), [#1140](https://github.com/jamescrowley321/identity-model/issues/1140) | Already under #904. Unchanged. |
| [#1141](https://github.com/jamescrowley321/identity-model/issues/1141)–[#1144](https://github.com/jamescrowley321/identity-model/issues/1144) | Move from Epic 23 ([#614](https://github.com/jamescrowley321/identity-model/issues/614)) to #904. |
| [#607](https://github.com/jamescrowley321/identity-model/issues/607) (Story 23.1), [#473](https://github.com/jamescrowley321/identity-model/issues/473) | Dynamic + logout CI wiring becomes 5.0-blocking. They keep their parents and are cross-linked. The FAPI2 part of #607 shipped via #906. |
| [#1131](https://github.com/jamescrowley321/identity-model/issues/1131) | The Python parts (typed rejection reasons, fastapi discovery kind) become 5.0-blocking. The Go/Rust shared-`kid` part goes to parity ([#1145](https://github.com/jamescrowley321/identity-model/issues/1145)). |
| [#1082](https://github.com/jamescrowley321/identity-model/issues/1082) (Gate B) | Pulled into 5.0. Evidence ownership has to be settled once more plans write results. |
| [#880](https://github.com/jamescrowley321/identity-model/issues/880) | Probably fixed by #1130. Verify and close; no work planned. |
| [#1145](https://github.com/jamescrowley321/identity-model/issues/1145) Go/Rust harnesses | **Stays in parity Epic 26.** py 5.0.0 ships Python only; Go and Rust are pre-release. |
| Open fix PRs into `release/v5` (#1121, #1124, #1126, #1128, #1129, #1130, #1132, #1136) | Must merge first. #1126, #1129, #1130, #1132 and #1136 all edit `conformance/`, so building on top of them avoids a conflict cascade. |

### Artifact conflicts

| Artifact | Action |
|---|---|
| `epics/epic-identity-model-v5-release.md` (planning PR #138) | Add a Phase D3 pointer to this proposal. Phase E's first box becomes "Phase D3 done". |
| `epics/epic-23-test-hardening.md` | Story 23.1 notes that its dynamic and logout scope moved to 5.0. |
| `epics/epic-26-full-parity.md` (planning PR #140) | Add #1145 and the Go/Rust part of #1131 to Phase A (enforcement) or E. |

### Technical impact

- One library feature: #1144 adds the refreshed-ID-token continuity check (OIDC Core §12.2) as a `feat(py)`, additive.
- #1131's typed rejection reasons add a kind to `TokenValidationException`. This is additive in 5.0, since the exception taxonomy is already breaking there.
- Everything else is `conformance/`, `.github/workflows/`, the Makefile and plan configs.
- More CI minutes: each new plan adds a local-suite run. Hybrid/implicit and Comprehensive should run on PR plus nightly; heavy FAPI variants can run nightly plus at the release gate if PR time grows too much (decide in-story, report the timing).

## 3. Recommended Approach

**Direct adjustment.** Add Phase D3 to the 5.0.0 plan and run it as a stacked-PR ralph loop, `identity-model-v5-conformance`, rooted on `release/v5` after the eight open fix PRs merge.

- **Why a loop:** ten stories, mostly mechanical (config + manifest + harness), one PR each, same gates. This is the shape the `identity-model-v5-fapi` loop handled.
- **Why before 5.0:** a release whose conformance runs can pass falsely, or that skips the plans for features it ships, isn't evidence of anything. The certified profiles must have hosted evidence on 5.0 code.
- **Risk:** running dynamic, logout or hybrid plans may expose real library bugs. Those are fixed in-story when small, or filed and pulled into the queue as `blocked` → owner decision. The 5.0 date moves by however long the queue takes.
- **Effort:** roughly 10 PRs of S–M size. #1144 and the typed reasons carry the library work.

## 4. Detailed Change Proposals

### Stories — Phase D3 queue (one PR each, stacked, into `release/v5`)

| Order | Issue | Story | Size |
|---|---|---|---|
| 1 | #1138 | Harness passes `nonce=` to `validate_id_token`; a `nonce` reason class is required by the manifests | S |
| 2 | #1131 (py) | Typed `TokenValidationException` kind (iss / aud / exp / signature / key selection / nonce / alg); harness records it; manifests require a specific kind per negative module; fastapi router exposes the discovery failure kind | M |
| 3 | #1139 | Dynamic, RP-initiated logout and back-channel logout pass on 5.3.4 against the 5.0 API; fix `no-state`; real evidence for `dynamic-registration` / `request-uri-signed-none`; drop stale evidence | M |
| 4 | #607 + #473 | Make targets and blocking CI steps for dynamic and both logout plans (py; fastapi where the router supports the flow) | M |
| 5 | #1082 | One owner per committed evidence file; no job uploads another job's evidence | S |
| 6 | #1141 | Config plan with every shipped client auth method, plus the Comprehensive RP plan | M |
| 7 | #1142 | Remaining FAPI 2.0 client variants (SP pkjwt+mTLS-bound, mTLS+DPoP; MS JAR-only, JARM-only, mTLS-bound; plain_oauth; client_credentials_grant) | S each, one PR |
| 8 | #1143 | Hybrid, implicit, formpost-hybrid and formpost-implicit plans | M |
| 9 | #1144 | Refreshed ID token continuity check (OIDC Core §12.2) in the library, plus the refresh-token RP plan | M |
| 10 | #880 | Verify the FAPI2 invalid-alternate-alg module rejects for the right reason; close | XS |

### Owner tasks (not the loop)

| Task | Issue |
|---|---|
| Review and merge the eight fix PRs into `release/v5` (loop precondition) | — |
| Make `conformance-fapi2` and the new plan checks required on main; protect `release/v5` (oss-admin) | #1140 |
| Hosted Basic / Config / Form Post run on `release/v5` (`publish=none`) after the queue empties | #1140 |
| Re-certification decision | [#242](https://github.com/jamescrowley321/identity-model/issues/242) |

### Release plan (`epic-identity-model-v5-release.md`)

```
OLD (Phase E, first box):
- [ ] Open `release/v5` → `main` PR ...

NEW:
- [ ] Phase D3 (conformance coverage, sprint-change-proposal-2026-11-15.md) done: queue empty, hosted run green on release/v5, #1140 gating applied.
- [ ] Open `release/v5` → `main` PR ...
```

Rationale: "Tests must come prior to v5" (James, 2026-11-15).

## 5. Implementation Handoff

- **Scope:** Moderate.
- **Owner (James):** approve this proposal; merge the eight fix PRs; launch the loop from a terminal (agents never launch ralph); apply #1140 gating; merge the loop's PRs bottom-up into `release/v5` with merge commits.
- **Loop:** `ralph-prompts/identity-model-v5-conformance.md` + `hats/identity-model-v5-conformance.yml` (BMAD story context + superpowers TDD / debugging / verification / review; Stacker → Builder → Critic → Shipper; never merges).
- **Launch:** `<planning checkout>/_bmad-output/implementation-artifacts/ralph-prompts/run.sh identity-model-v5-conformance identity-model release/v5`. Until this proposal merges, `<planning checkout>` is `/tmp/isp-v5-conformance`; after that, `~/repos/auth/identity-stack-planning`. `run.sh` reads the prompt from its own directory.

**Success criteria:**
- Every applicable Python RP plan in suite 5.3.4 runs in CI, blocking.
- Each negative module requires a specific typed rejection reason.
- Nonce modules fail when the library's nonce check is removed.
- The hosted Basic / Config / Form Post run is green on `release/v5`.
- `conformance-fapi2` is required on main.
