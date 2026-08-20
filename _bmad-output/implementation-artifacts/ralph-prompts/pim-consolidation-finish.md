# Handoff prompt — finish the polyglot consolidation (in-session)

**What this is:** a self-contained prompt to hand a fresh Claude Code session so it
can re-orient planning and finish the identity-model → py-identity-model (PIM)
consolidation. This is the **in-session / owner-in-the-loop** handoff (stacked PRs,
per-PR review). It is distinct from `pim-consolidation.md`, which is the ralph-loop
prompt — only use that loop if the owner explicitly wants to loop it.

**Grounding snapshot (2026-08-19; verify against `origin/main` before acting):**
CONS-1.1 `/go` (#538), CONS-1.2 `/rust` (#541), CONS-1.3 `/spec` (#540) are merged into
PIM. CONS-1.4 unified `/infra` is **incomplete** — `/infra` holds only `descope/`, while
`keycloak/` + `node-oidc-provider/` still sit in root `/test-fixtures`. No `/py`, `/.moon`,
or `/node` exist yet (CONS-2 not started). No rename yet (CONS-3 not started).

---

```
ROLE: You are finishing the polyglot repo consolidation — merging the identity-model
Go/Rust bindings INTO py-identity-model (PIM), which is the SURVIVING repo. This is a
correct-course already decided and partly executed; do NOT re-litigate direction.

=== READ FIRST (authoritative, in order) ===
1. py-identity-model/docs/polyglot-consolidation-plan.md   (technical design of record, merged #533)
2. identity-stack-planning/_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-17.md
   (the correct-course: direction, layout, tag scheme, execution model)
3. identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-cons{1,2,3}-*.md
   (CONS-1 merge & test-infra, CONS-2 reorg+publishing, CONS-3 rename+retire)
Do NOT cp+run any repo-root PROMPT.md (stale). Ignore task-queue.md until reconciled (it drifts).

=== CURRENT MERGED STATE (verify against origin/main; do not trust from memory) ===
DONE (merged into PIM main): CONS-1.1 /go (#538), CONS-1.2 /rust (#541), CONS-1.3 /spec (#540).
PARTIAL/UNKNOWN — verify exactly: CONS-1.4 unified /infra is INCOMPLETE — /infra has only
  `descope/`; IM fixtures `keycloak/` + `node-oidc-provider/` are still in root /test-fixtures.
  CONS-1.5 (Python executor bound to /spec + per-language coverage gate) status unclear.
NOT STARTED: CONS-2 (Python root src/ → /py, moon orchestration, semantic-release re-point +
  py-v tag scheme, Go/Rust release CI, reserve /node scaffold, publishing dry-run gate) — no
  /py, /.moon, /node exist. CONS-3 (archive old identity-model, rename PIM → identity-model,
  PyPI trusted-publishing re-config, fix refs, reconcile stale planning docs) — not started.

=== STEP 0 — RECONCILE PLANNING (do this before any code) ===
- git fetch + inspect origin/main to establish the EXACT done/remaining status of CONS-1.4 and
  CONS-1.5. Update the CONS-1 epic + any sprint/task tracking to match merged reality (mark
  1.1/1.2/1.3 done; record 1.4/1.5 real status). Open ONE small planning PR for this reconcile.

=== REMAINING WORK (stacked GH PRs into PIM; owner merges bottom-up) ===
CONS-1 finish:
  1.4  Consolidate PIM test-fixtures/ + IM fixtures into ONE /infra (single docker-compose,
       remove the root /test-fixtures duplicates); authz-code+PKCE headless in CI.
  1.5  Bind the Python executor to /spec vectors + a coverage gate (every language runs every
       vector id; 100% per-language coverage reported).
CONS-2 (off CONS-1): relocate Python src/ → /py (owns uv + semantic-release; NO root uv
  workspace); add moon (.moon + moon.yml per project, `moon run :test` / `moon ci` affected-only);
  re-point python-semantic-release to `py-v{version}` and SEED `py-v<currentHEADversion>`;
  GoReleaser `go/vX.Y.Z` + cargo-release `rust-vX.Y.Z`; reserve /node as an empty scaffold (dir +
  stub + moon project, no code, not released); a PUBLISHING DRY-RUN GATE proving Python publishes
  byte-for-byte as today. PIM conformance/ (OIDF cert) harness stays UNCHANGED.
CONS-3 (off CONS-2, LAST): archive old identity-model repo (pointer), rename PIM →
  identity-model, PyPI Trusted-Publishing re-config, fix all references, reconcile roadmap /
  reconciliation / product-brief docs (CONS-3.5).

=== HARD CONSTRAINTS / GUARDRAILS ===
- PIM's git history, 329 tags, OIDF certification lineage, and BOTH PyPI pipelines
  (py-identity-model + fastapi-identity-model) must stay untouched. Rename is LAST (CONS-3).
- Naming stays {py,go,rs}-identity-model until the CONS-3 rename.
- Execution = GH stacked PRs (each branch off the previous), owner reviews & merges bottom-up.
  NEVER auto-merge. Independent-review evidence is hard-gated on EVERY PR (run fresh-context
  adversarial reviewers per PR and post findings+resolutions as a comment before requesting merge).
- This touches the CERTIFIED/PUBLISHED repo → owner-in-the-loop per-PR is preferred over a ralph
  loop. A loop prompt exists (ralph-prompts/pim-consolidation.md, off-main base per #82) but only
  use it if the owner explicitly wants to loop; otherwise do the work in-session as stacked PRs.
- Do ALL repo work in dedicated /tmp git worktrees on feature branches; never edit a primary
  checkout directly. Conventional commits (Angular). Run `make lint` before every commit. Run
  the local integration tests (`make test-integration-node-oidc`, etc.) before pushing any
  fixture/conftest/shared-test-util change — /infra work touches these.
- semantic-release routing: only `feat`/`fix` cut a PyPI release; `(fastapi)`-scoped commits route
  to the fastapi package. Keep consolidation commits `chore`/`build`/`ci`/`refactor`/`test`/`docs`
  so they DON'T cut a spurious core release. Watch the scope-routed parser (tools/release_parsers.py).
- STACKED-MERGE GOTCHA: do NOT merge a stacked PR with --delete-branch (deleting a child's base
  branch CLOSES the child). Merge without it; retarget + rebase each child onto main before
  merging it; each rebase force-push resets required CI (wait for green, don't --admin-bypass).

=== DEFINITION OF DONE ===
- `moon run :test` orchestrates py/go/rust; `moon ci` runs affected-only.
- One shared /spec + one /infra; no duplicated fixture stack; 100% vector coverage per language.
- Python publishes byte-for-byte as today; OIDF conformance workflows unaffected.
- Go (go/vX.Y.Z) + Rust (rust-vX.Y.Z) release independently, path-filtered.
- Rename completes (CONS-3) with PyPI Trusted Publishing re-configured; old identity-model archived.
- Roadmap / reconciliation / product-brief planning docs reconciled to the executed reality.

FIRST ACTION: read the three authoritative docs, then run STEP 0 reconcile and report the exact
CONS-1.4/1.5 status before touching code.
```
