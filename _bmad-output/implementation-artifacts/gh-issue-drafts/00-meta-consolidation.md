<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: epic, consolidation   (both need creating)
File with: gh issue create --repo jamescrowley321/py-identity-model --title "<title>" --body-file <this file, minus this comment> --label epic,consolidation
-->
# Title
[Meta] Polyglot consolidation — merge identity-model into py-identity-model

# Body
**Tracking issue for the polyglot consolidation.** Merges the `jamescrowley321/identity-model` Go/Rust implementation into this repo (which survives with its history, 329 tags, OIDF cert, and PyPI pipelines), orchestrated by `moon`, laid out as `/py /go /rust` (+ reserved `/node`).

- **Design of record:** `docs/polyglot-consolidation-plan.md` (PR #533)
- **Planning / correct-course:** `identity-stack-planning` → `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md`
- **Supersedes** the prior "PIM → identity-model monorepo (uv workspace)" direction (planning `epic-0a`, roadmap PRD 6, reconciliation §6.1).

## Epics (GH stacked PRs — validate end-to-end as a set, then merge bottom-up)
CONS-1 branches off `main`, CONS-2 off CONS-1, CONS-3 off CONS-2. Keep all three open; CI on the top-of-stack (CONS-3) branch exercises 1+2+3 together; merge bottom-up only when the full set is green.
- [ ] **CONS-1** — Merge identity-model in & collapse duplicated test infra  → #<cons1>
- [ ] **CONS-2** — Reorg to `/py|/go|/rust`, moon, keep publishing green  → #<cons2>
- [ ] **CONS-3** — Rename repo, fix references, retire identity-model, reconcile docs  → #<cons3>

## Guardrails
- Python core + PyPI publishing **untouched** through CONS-1; relocated to `/py` in CONS-2 with a **publishing-parity dry-run gate** before CONS-3.
- IM history is expendable (0 tags) → its tree comes in as ordinary commits (no filter-repo).
- Repo rename is **last**, only after publishing is proven green.

## Non-goals
- Node/TS implementation (only a reserved `/node` scaffold in CONS-2.3).
- Any change to PIM's behavioral contract (PIM remains the source of truth; ports mirror it).
