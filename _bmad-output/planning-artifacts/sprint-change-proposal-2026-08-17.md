# Sprint Change Proposal — Activate Polyglot Consolidation (identity-model → py-identity-model)

**Date:** 2026-08-17
**Trigger:** Owner decision (James) to activate the deferred monorepo consolidation now, with `py-identity-model` (PIM) as the surviving repo and `moon` as the build orchestrator.
**Mode:** Batch
**Scope Classification:** Significant — reverses the documented consolidation *direction*, *tooling*, and *timing* (end state largely converges).
**Status:** Proposed (pending owner review)

---

## 1. Issue Summary

The planning repo already documents a monorepo consolidation (`product-brief-identity-model-monorepo.md`, `epic-0a-monorepo-setup.md`, `docs/identity-model-reconciliation-2026-08-12.md` §6.1, `docs/roadmap.md` PRD 6). It is **deferred** and framed in the **opposite direction** from the owner's 2026-08-17 decision.

| Dimension | Documented plan | 2026-08-17 decision |
|---|---|---|
| **Timing** | Deferred — "until identity-model is more mature; until then PIM stays its own repo" | **Activate now** |
| **Base repo / history** | Rename `py-identity-model` → `identity-model`; relocate PIM into `python/` (0A.1 via `git filter-repo`) | **PIM is the surviving repo**; IM's Go/Rust move **into** it; PIM git history + 329 tags + OIDF cert + PyPI stay stationary |
| **Build tooling** | Root **`uv` workspace** (shipped: T170 / PR #434) | **`moon`** orchestration (no precedent in repo); **no root uv workspace** long-term |
| **Layout** | `python/ node/ go/ rust/ spec/ infra/` | **`/py /go /rust`** now; **`/node` reserved** (scaffold, no code); `/spec /infra` |
| **Rename** | First (gates on Epic 13) | **Last** (after publishing is proven green) |

**Why the reversal is sound (lower-risk).** The documented plan would relocate the **certified, PyPI-published, 329-tag** artifact (PIM) into a **0-tag** shell — disrupting exactly the cert lineage + release pipelines that reconciliation §6.1 flagged as the thing to protect. Keeping PIM stationary as the base makes **OIDF cert continuity a non-issue** and leaves both PyPI pipelines untouched. `identity-model`'s history is expendable (0 tags, never released), so its tree comes in as ordinary new-file commits — no `filter-repo` gymnastics.

**What is preserved from the documented plan:** the end state (one `identity-model`-named polyglot monorepo, per-language dirs, one shared conformance/fixtures layer, per-language independent tags), the "build conformance vectors once" constraint, and PIM-as-behavioral-source-of-truth (epic-20). This proposal changes the *path*, not the destination.

Full technical design of record: `py-identity-model` PR #533 (`docs/polyglot-consolidation-plan.md`), validated by a `moon` 2.5.1 Py+Go+Rust spike (caching + selective re-run + `moon ci` affected-detection confirmed).

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|---|---|---|
| **EPIC-0A Monorepo Setup** | draft | **Superseded** — direction (relocate PIM→`python/`) and tooling (uv workspace) inverted. Replaced by **CONS-1/2/3**. Reusable ACs (0A.3 CI, 0A.4 shared node-oidc infra, 0A.5 authz-code automation) carried forward. |
| **EPIC-13 Naming, Versioning & Package Identity** | draft | Still relevant — resolves final repo/package names + per-language tag scheme; CONS-3 depends on it. |
| **EPIC-20 PIM Parity** | draft | Unaffected behaviorally — PIM stays the behavioral source of truth; consolidation is structural. |
| **Spec epics 0B–0F** | mixed | Feed CONS-1.3 (`/spec` neutral vectors) + CONS-1.5 (per-language executor + coverage gate). |
| **Epics 2/2b (node)** | draft | Deferred, not cancelled — `/node` is reserved as a scaffold by CONS-2.3. |

### New Epics

| Epic | Title | Maps to |
|---|---|---|
| **CONS-1** | Merge identity-model in & collapse duplicated test infra | Owner step 1 |
| **CONS-2** | Reorg to `/py \| /go \| /rust`, moon orchestration, keep publishing green | Owner step 2 |
| **CONS-3** | Rename repo, fix references, retire identity-model, reconcile planning docs | Owner step 3 |

### Artifact Conflicts

| Artifact | Impact | Action |
|---|---|---|
| `epic-0a-monorepo-setup.md` | Significant | **Now:** mark `status: superseded` + pointer to this proposal + CONS-1/2/3. |
| `product-brief-identity-model-monorepo.md` | Moderate | Pointer now; full rewrite deferred to **CONS-3.5** (direction/tooling/naming). |
| `docs/roadmap.md` PRD 6 + Implementation Order | Moderate | Pointer now; rewrite in **CONS-3.5** (uv-workspace framing → moon; PIM-survives). |
| `docs/identity-model-reconciliation-2026-08-12.md` §6.1 | Moderate | Pointer now; rewrite in **CONS-3.5** (deferral → activated; direction). |
| `ralph-prompts/identity-model-publishing.md` | Moderate | Tag scheme aligns (`go/vX.Y.Z`, `rust/vX.Y.Z`) but assumes IM-repo base + uv; repoint in **CONS-3.5**. |
| `task-queue.md` T170 (uv workspace, done) | Low | Add note: root workspace superseded by `/py` + moon; per-package uv retained under `/py`. |
| `sprint-plan.md` | Low | Add "Polyglot Consolidation" tier referencing CONS-1/2/3. |

---

## 3. Recommended Approach

**Selected: Correct-course + supersede (BMAD-canonical for a change to an in-flight documented plan).**

- Author this proposal + three active epics **CONS-1/2/3** (Format A) in `planning-artifacts/epics/`.
- Mark `epic-0a` superseded **now**; leave roadmap/reconciliation/product-brief edits to **CONS-3.5** (pointers added now) so the review surface this pass stays bounded.
- **Execution: GH stacked PRs into PIM** — CONS-1 branches off `main`, CONS-2 off CONS-1's branch, CONS-3 off CONS-2's. **Keep the full stack open to validate the consolidation end-to-end as a set** — CI on the top-of-stack (CONS-3) branch exercises 1+2+3 together (moon orchestration, the publishing-parity dry-run, all languages green) — **then merge bottom-up** (never auto-merge). This proves the risky bits (CONS-2 reorg, CONS-3 rename) on top of CONS-1 before anything lands on `main`. Not a ralph loop — the work touches the certified repo, so owner-in-the-loop per-PR review is preferred (loops reserved for large epics). Owner may still loop CONS-1 alone.

**Rationale:** keeps the valuable artifact (PIM) stationary; the end state matches the documented monorepo vision; correct-course preserves a clean audit trail of the pivot.
**Effort:** Medium-Large — 15 stories across 3 epics; the real cost is re-homing `/spec` + `/infra` + CI into PIM and proving publishing unchanged.
**Risk:** Low-Medium — mitigated by keeping Python at root through CONS-1, path-guarding releases, a publishing dry-run gate (CONS-2.5), and renaming last (CONS-3).

---

## 4. Detailed Change Proposals

### 4.1 Layout — `python/` → `/py`, add moon, reserve `/node`

**OLD (epic-0a / product brief):**
```
identity-model/  (py-identity-model renamed first)
├── python/   node/   go/   rust/   spec/   infra/
   root uv workspace (members)
```
**NEW (this proposal):**
```
py-identity-model/            # survives; renamed LAST (CONS-3)
├── py/      # Python core relocated from root src/ ; owns uv + semantic-release (no root workspace)
├── go/      # from identity-model; module github.com/jamescrowley321/py-identity-model/go (→ .../identity-model/go at rename)
├── rust/    # from identity-model; crate rs-identity-model
├── node/    # RESERVED scaffold only (dir + stub + moon project), no code, not released
├── spec/    # neutral conformance vectors (single source)
├── infra/   # merged IdP fixtures (was PIM test-fixtures/ + IM infra/)
├── conformance/   # PIM OIDF-cert harness — unchanged
└── .moon/         # workspace + toolchain; moon.yml per project
```

### 4.2 Tag scheme (changes during CONS-2)

| Language | Tool | Tag format | Note |
|---|---|---|---|
| Python | python-semantic-release (kept) | `py-v{version}` | change `tag_format`; **seed `py-v3.10.0`** at current HEAD |
| Go | GoReleaser | `go/vX.Y.Z` | forced by Go subdir-module resolution |
| Rust | cargo-release → crates.io | `rust-vX.Y.Z` | |

Bare `{version}` tags (329 existing) are retained as history; new Python releases use the `py-v` prefix.

### 4.3 Edits applied in THIS pass (pointers only, per correct-course)

- `epic-0a-monorepo-setup.md`: `status: 'superseded'` + banner pointing here and to CONS-1/2/3.
- Roadmap PRD 6, reconciliation §6.1, product brief: **not rewritten now** — flagged for CONS-3.5. (Owner selected "correct-course + supersede", not "full rewrite".)

---

## 5. Implementation Handoff

**Scope:** Significant — new epics (SM) + design already captured (Architect, PR #533) + execution as stacked PRs (Developer).

### New Artifacts (this proposal)
- `epics/epic-cons1-im-merge-testinfra.md`
- `epics/epic-cons2-reorg-publishing.md`
- `epics/epic-cons3-rename-retire.md`
- `implementation-artifacts/gh-issue-drafts/{00-meta,01-cons1,02-cons2,03-cons3}.md` (local drafts; unfiled)

### Execution Sequence (GH stacked PRs into PIM)
Branch each off the previous; keep all three open as a stack; validate end-to-end on the top branch; merge bottom-up.
1. **CONS-1** (off `main`) — land `/go` `/rust` `/spec`, merge fixtures, one conformance source (Python at root, publishing untouched).
2. **CONS-2** (off CONS-1) — relocate Python → `/py`, moon, semantic-release re-point + tag scheme + `py-v3.10.0` seed, Go/Rust release CI, reserve `/node`; **publishing dry-run gate**.
3. **CONS-3** (off CONS-2) — archive old `identity-model`, rename PIM → `identity-model`, PyPI Trusted-Publishing re-config, fix all references, reconcile stale planning artifacts.

**End-to-end validation:** the CONS-3 branch contains 1+2+3, so its CI run is the full-set gate. Merge CONS-1 → CONS-2 → CONS-3 to `main` only once the top-of-stack is green; rebase the stack if an earlier PR changes.

### Success Criteria
- [ ] `moon run :test` orchestrates py/go/rust; `moon ci` runs affected-only.
- [ ] One shared `/spec` + `/infra`; every language executes every vector id (coverage gate).
- [ ] Python publishes byte-for-byte as today (`py-identity-model` + `fastapi-identity-model`); OIDF conformance workflows unaffected.
- [ ] Go (`go/vX.Y.Z`) + Rust (`rust-vX.Y.Z`) release independently, path-filtered.
- [ ] Rename completes with PyPI Trusted Publishing re-configured; old `identity-model` archived with pointer.
- [ ] Roadmap PRD 6, reconciliation §6.1, product brief reconciled (CONS-3.5).
