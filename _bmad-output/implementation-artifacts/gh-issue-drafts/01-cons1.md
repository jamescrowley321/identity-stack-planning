<!-- DRAFT GH ISSUE — local review only, DO NOT FILE until owner approves.
Target repo: jamescrowley321/py-identity-model
Suggested labels: epic, consolidation, test-architecture, integration-tests
-->
# Title
CONS-1: Merge identity-model in & collapse duplicated test infrastructure

# Body
**Epic CONS-1 — step 1 of the polyglot consolidation.** Bring `identity-model`'s Go + Rust + neutral `spec/` into this repo and collapse the two duplicated IdP-fixture/conformance stacks into one. **Python core + PyPI publishing stay untouched** (relocation is CONS-2).

- Epic doc: `identity-stack-planning` → `_bmad-output/planning-artifacts/epics/epic-cons1-im-merge-testinfra.md`
- Design: `docs/polyglot-consolidation-plan.md` (PR #533)
- Parent: #<meta>

## Stories
- [ ] **CONS-1.1** Import identity-model Go into `/go` (module `github.com/jamescrowley321/py-identity-model/go`; `go build/test` green)
- [ ] **CONS-1.2** Import identity-model Rust into `/rust` (crate `rs-identity-model`; `cargo test` green)
- [ ] **CONS-1.3** Import the neutral conformance `spec/` (vectors keyed on canonical error codes)
- [ ] **CONS-1.4** Consolidate PIM `test-fixtures/` + IM `infra/` into one shared `/infra` (single docker-compose; remove duplicates)
- [ ] **CONS-1.5** Bind Python executor to `/spec` + coverage gate (every language runs every vector id)

## Definition of done
- `go build/test` and `cargo test` green in-repo; imported vectors all pass.
- One shared `/infra`; no duplicated fixture stack remains; authz-code+PKCE runs headless in CI.
- Coverage gate reports 100% vector coverage per language; PIM OIDF `conformance/` harness unchanged.
- Python unit/integration suites + PyPI publishing unaffected.

## Dependencies
Internal ordering per epic doc (1.1/1.2 → 1.3/1.4 → 1.5). External: Docker, Go 1.26+, Rust 1.97+. Blocks CONS-2.
