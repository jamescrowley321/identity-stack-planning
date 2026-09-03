Self-referential implementation loop. Execute ONE phase of ONE story per iteration, then end. Fresh context each iteration — persist all state to files.

Epic A of the open-identity plan: the identity-stack **Descope⇄Ory provider-swap demo** with zero RBAC migration. Full plan: `epics-open-identity.md` (Epic A), `architecture-open-identity.md` (ADR-OI-*), `sprint-plan-open-identity.md`.

## Task Queue

Independent PRs — each story branches from `main`, not from the previous story's branch. Where a story hard-depends on another's code, that dependency must be `done`/merged first (see Dependencies).

| Story | Branch | Status |
|-------|--------|--------|
| A.1 Connect + configure the existing **cloud Ory Network** (Terraform project + SPA client + identity schema) | swap/a1-ory-network | pending |
| A.2 Register the `ory` provider in the canonical registry | swap/a2-register-ory | pending |
| A.3 Adapter-selection registry (config-driven active provider) | swap/a3-adapter-registry | pending |
| A.4 Config-driven inbound token validation + Ory OIDC branch (standalone mode) | swap/a4-token-validation | pending |
| A.5 Provider-neutral claim-normalization abstraction (ClaimMapper, app-side) | swap/a5-claim-normalization | pending |
| A.6 OrySyncAdapter (outbound sync, G1) + Ory management client | swap/a6-ory-adapter | pending |
| A.7 Cross-provider identity resolution + JIT provisioning via `idp_links` | swap/a7-identity-resolution | pending |
| A.8 Canonical `/me` endpoint + provider-neutral frontend | swap/a8-canonical-me | pending |
| A.9 Provider-aware RP-initiated logout | swap/a9-logout | pending |
| A.10 Visible, reproducible swap flow (demo path) | swap/a10-swap-demo | pending |
| A.11 Zero-RBAC-migration invariant assertion + `swap-invariants` fixtures | swap/a11-invariant | pending |
| A.12 Automated end-to-end provider-swap CI check | swap/a12-e2e-ci | pending |

### Dependencies (enforce ordering)

- A.1 → A.2 (the registry needs the Ory environment)
- A.2 → A.3 (A.3 is built **with Descope only** to avoid a forward dep on the Ory adapter) and A.2 → A.4
- A.3, A.4 → A.5, A.6, A.7
- A.6 registers Ory **into** the A.3 selection registry
- A.5, A.7 (and A.6 for the Ory side) → A.11
- A.5, A.6, A.7 → A.8, A.9 → A.10 → A.11 → A.12
- A.11's `swap-invariant` fixtures are consumed later by Epic C `[OIM]` — do NOT block on Epic C.

### Execution Priority

Critical path (A.1, external Ory provisioning, is the long pole):
`A.1 → A.2 → A.4 → A.5 → A.11 → A.12`. Fill in A.3, A.6, A.7, A.8, A.9, A.10 as their deps clear. Parallelizable siblings (A.3/A.4; A.5/A.6/A.7; A.8/A.9) may be taken in any order once their deps are `done`.

## Routing

Read `~/repos/auth/identity-stack/.claude/task-state.md`.

- **Does not exist** → pick next `pending` story (respecting dependencies), create task-state.md with `phase: setup`, execute setup
- **phase is `complete`** → update this file (`pending` → `done`), clean up worktree, delete task-state.md, pick next story
- **Any other phase** → read the phase file and execute it

Phase order: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

## Phase Instructions

Read ONLY the current phase file — do not read other phase files:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

**All work after `setup` happens in the worktree** — `cd` to the path in `worktree:` first.

## New Story Setup

When picking up a new story, create `~/repos/auth/identity-stack/.claude/task-state.md`:
```
story: <A.N>
branch: <branch from queue>
base_branch: main
worktree: /tmp/is-swap-<story>
phase: setup
epic_ref: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics-open-identity.md
arch_ref: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/architecture-open-identity.md
sprint_ref: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/sprint-plan-open-identity.md
```

If all stories are `done`: output `<promise>LOOP_COMPLETE</promise>`

## Reference

- **Epic + full AC:** `epics-open-identity.md` → Epic A, Story A.N. Read your story's acceptance criteria before implementing.
- **Contract + ADRs:** `architecture-open-identity.md` — ADR-OI-1 (canonical-authoritative RBAC), OI-3 (adapter/registry contract), OI-5 (claim-normalization profiles), OI-7 (swap sequence).
- **Existing code to extend (read first, read-only):** `backend/app/services/adapters/base.py`, `services/identity.py`, `services/provider.py`, `dependencies/identity.py`, `middleware/claims.py`, `repositories/idp_link.py`, `models/identity/provider.py`.

## Domain Rules

- **IdentityService seam (D21):** every new/changed API route MUST inject `IdentityService`, never `DescopeManagementClient` directly.
- **Canonical-authoritative RBAC (ADR-OI-1):** Postgres is the RBAC system-of-record; a provider swap **re-projects** claims — it never migrates role/tenant rows. A.11/A.12 MUST assert a **zero-row diff** on the canonical RBAC tables across the swap.
- **Ory = the existing cloud Ory Network** (managed). A.1 connects/configures that project via Terraform and wires Ory Network credentials as env/secret — it does NOT stand up self-hosted containers.
- **CI split:** the full Descope⇄Ory swap E2E (A.12) runs against cloud Ory (needs the Ory Network secret) on **nightly/protected-branch + locally**, NOT on fork PRs. Secret-free PR-gating uses **`node-oidc-provider`** as the second-provider stand-in.
- **Claim normalization stays app-side** (identity-stack). Do NOT extend `py_identity_model.to_principal` with Ory/GenericOIDC — A.5 is entirely identity-stack.
- **Descope path unchanged:** the dual Descope issuer formats + `dct`/`tenants` logic stay as-is; Ory is standard OIDC — absence of `dct`/`tenants` is NOT an error.
- **A.4 standalone mode** for MVP; gateway-mode Ory + PRD-4 reconciliation are deferred to a later `/bmad-correct-course` pass.
- **Swap-demo dataset:** flat portable-role floor only (keeps the 0-row-diff invariant clean).
- Follow `~/repos/auth/CLAUDE.md` for identity-stack commands (`make lint`, `make test-unit`, `make test-integration`) and git conventions. Conventional commits (Angular). **Never push to main;** worktree-run, `--no-auto-merge` (owner reviews/merges). ONE story per iteration.
