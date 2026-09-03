You are in a self-referential implementation loop. Each iteration you execute ONE phase of ONE task, then end your response. The loop gives you a fresh context each iteration — persist all state to files.

## Context

Target repo: `identity-model` at `~/repos/auth/identity-model` (private, `jamescrowley321/identity-model`).

This loop implements the **Go Extended Tier** — Epic 5 stories 5.1–5.4 in their Go decomposition (5.1-go … 5.4-go): Token Introspection (RFC 7662), Token Revocation (RFC 7009), Token Exchange (RFC 8693), and DPoP (RFC 9449). The Go Core Tier (Epic 3, `go/pkg/{discovery,jwks,jwt,token,userinfo}`) is merged to `main` — read those packages for the established patterns (functional options, error types, singleflight, TEST_* integration convention).

**None of the four extended conformance files exist yet** (`spec/conformance/` has only the six core files). Each task therefore FIRST authors its capability's spec per the matching Epic 0F story (capabilities.md section + `spec/conformance/*.json` + `spec/test-fixtures/`), THEN implements Go against it — the same spec-inside-the-story pattern the Go core loop used for jwt/token/userinfo.

Epic sources of truth:
- `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-5-extended-tier.md` (implementation ACs)
- `~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics/epic-0f-spec-extended-tier.md` (spec deliverables: stories S.7, S.8, S.12, S.13 — ignore S.14 PAR and S.15 RAR, they are Advanced tier)

Cross-language contract: `spec/capabilities.md` + `spec/conformance/*.json` (read from the per-task worktree).

## Running

**DO NOT launch this loop while the Rust core loop (`identity-model-rust-core.md`) is still running — one ralph workstream per repo at a time.** Wait for its LOOP_COMPLETE.

Run the loop from a **dedicated orchestrator worktree in `/tmp`**, never from `~/repos/auth/identity-model` — the owner works in that checkout by hand. `PROMPT.md` and `.claude/task-state.md` live in the orchestrator worktree for the whole run. Note `/tmp` is wiped on reboot: if the worktree vanishes mid-run, `git worktree prune` then recreate with the recipe below and re-mark completed tasks `done` in the fresh PROMPT.md before resuming.

```bash
# One-time: create the orchestrator worktree off main.
cd ~/repos/auth/identity-model
git fetch origin
git worktree add /tmp/im-goext-orch -b ralph/go-extended origin/main

# Run the loop from inside that worktree
cd /tmp/im-goext-orch
cp ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/identity-model-go-extended.md PROMPT.md
ralph run
```

`ORCH_WORKTREE` = `/tmp/im-goext-orch`. The prompt must remain copied in as `PROMPT.md` for the whole run; the planning-repo copy is the source of truth. Per-task implementation happens in its own `/tmp/im-goext-5X` worktree (created by `setup`) off the task's base branch. When the loop finishes: `cd ~/repos/auth/identity-model && git worktree remove /tmp/im-goext-orch`.

## CRITICAL: No Auto-Merge

**DO NOT merge any PR.** The owner manually reviews and merges every PR this loop creates. The `complete` phase must NOT call `gh pr merge` — no `--auto`, no merge queue. Only mark the task done, clean up, and move on.

## Dependency Model — Base-Branch Chaining

The four capabilities are functionally independent, but every task edits shared files (`spec/capabilities.md`, `spec/conformance/`, `infra/` provider config), so each task branches off the **previous task's branch** and opens its PR with `--base <previous_branch>`. This produces a clean conflict-free stack the owner merges bottom-up. G5.1 bases off `main`. Per the Step 3 rule, once a base branch has been merged to `main`, later tasks MAY base off `main` instead — this self-corrects as the owner lands the stack.

## Task Queue

| Task | Story | Branch | Base branch | Description | Status |
|------|-------|--------|-------------|-------------|--------|
| G5.1 | 5.1-go + S.7 | feat/go-introspection | main | Spec S.7 (`introspection.json` INTR-001…006 + fixtures + capabilities §) then Go `pkg/introspection` client | pending |
| G5.2 | 5.2-go + S.8 | feat/go-revocation | feat/go-introspection | Spec S.8 (`revocation.json` REV-001…005 + fixtures + capabilities §) then Go `pkg/revocation` client | pending |
| G5.3 | 5.3-go + S.12 | feat/go-token-exchange | feat/go-revocation | Spec S.12 (`token-exchange.json` EXCH-001…006 + fixtures + capabilities §) then RFC 8693 exchange grant in `pkg/token` | pending |
| G5.4 | 5.4-go + S.13 | feat/go-dpop | feat/go-token-exchange | Spec S.13 (`dpop.json` DPOP-001…008 + fixtures + capabilities §) then Go `pkg/dpop` (proof JWTs, keygen, nonce retry) | pending |

## Step 1: Determine Context

1. Read `~/repos/auth/CLAUDE.md` for workspace commands and git conventions.
2. Read `~/repos/auth/py-identity-model/CONTRIBUTING.md` for repo workflow (branching, conventional commits, conformance loop).
3. Read the matching story in `epic-5-extended-tier.md` AND the matching spec story in `epic-0f-spec-extended-tier.md` (G5.1→S.7, G5.2→S.8, G5.3→S.12, G5.4→S.13).

## Step 2: Determine What To Do

Read `ORCH_WORKTREE/.claude/task-state.md` (i.e. `/tmp/im-goext-orch/.claude/task-state.md`).

- **Does not exist** → Pick up next task (Step 3).
- **phase is `complete`** → Mark the task `done` in the queue in THIS file, clean up the worktree, delete task-state.md, pick up next task (Step 3).
- **Any other phase** → Execute that one phase (Step 4).

## Step 3: Pick Up Next Task

Find the first `pending` row in the Task Queue.

- If none remain → output: <promise>LOOP_COMPLETE</promise>
- Otherwise:
  1. Determine the base branch from the queue's "Base branch" column. If that base branch's PR has already been merged to `main`, you MAY base off `main` instead (cleaner). Otherwise base off the branch as listed.
  2. Create `ORCH_WORKTREE/.claude/task-state.md` (`/tmp/im-goext-orch/.claude/task-state.md`):
     ```
     task_id: G5.X
     story: 5.X-go
     repo: identity-model
     branch: <branch from queue>
     base_branch: <base branch from queue>
     worktree: /tmp/im-goext-5X
     phase: setup
     ```
  3. Execute the `setup` phase, then end your response.

## Step 4: Execute ONE Phase

Read `phase` from task-state.md. Execute ONLY that phase. When done, update the `phase` field to the next phase and end your response.

**All work after `setup` happens in the worktree** — `cd` to the `worktree:` path first.

Phase order: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`

Read the shared phase file for each phase from:
`~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md`

### Phase overrides

**setup** — Follow `phases/setup.md`. Repo root `~/repos/auth/identity-model`. Create the worktree off `base_branch`: `git worktree add -b <branch> <worktree> <base_branch>` (fetch first). Work happens in `<worktree>/spec`, `<worktree>/go`, and (where needed) `<worktree>/infra`.

**analyze** — Follow `phases/analyze.md`, plus:
1. Read the Epic 0F story for this capability — its deliverables (capabilities.md section, conformance JSON with the exact test-case IDs, fixture files) are requirements, as are the Epic 5 story ACs for the Go implementation. `spec/conformance/schema.json` referenced by 0F does NOT exist — derive the JSON shape from the existing core conformance files (e.g. `spec/conformance/discovery.json`) and keep it identical; do not invent a schema file unless G5.1 chooses to author one for all files.
2. Read the completed core packages (`go/pkg/token` especially — introspection/revocation/exchange reuse its client-auth and error-parsing patterns) and the existing conformance files as format templates.
3. Provider support plan: node-oidc-provider (in `infra/node-oidc-provider`) supports introspection, revocation, and DPoP via feature flags — enable the flag this task needs in its config as part of the story (keep existing core integration jobs green). **node-oidc-provider does NOT support RFC 8693 token exchange** — G5.3 integration tests run against a Go `httptest` mock implementing the fixture responses (Epic 0F explicitly permits mock-endpoint integration tests). Any Descope token-exchange test MUST gate on the token endpoint's actual response, not discovery — Descope discovery over-advertises token-exchange grants its endpoint rejects (E011003).
4. Plan must list: exact spec files to create, exact Go files to create/modify, the functional-options API surface, unit test cases (map each to Epic 5 ACs + conformance IDs), and the `integration`-tagged tests.

**implement** — Follow `phases/implement.md`, plus:
- Author the spec artifacts FIRST (capabilities.md section with RFC-section references, conformance JSON with the story's exact IDs, `spec/test-fixtures/<capability>/` files), then implement Go to satisfy them.
- Idiomatic Go matching the core packages: `net/http` stdlib, functional options, `golang.org/x/sync/singleflight` where caching applies, JOSE via the library the core `jwt`/`jwks` packages already use (DPoP proof signing + RFC 7638 thumbprints + ES256/RS256 keygen via stdlib `crypto` + that JOSE lib).
- Token exchange lives in `go/pkg/token` (it is a token-endpoint grant); introspection, revocation, and dpop are new packages under `go/pkg/`.
- Flip the capability's **Go** cell `planned` → `implemented` in `<worktree>/spec/capabilities.md` once conformance passes. **G5.1 also corrects the stale core rows**: the Go column for Discovery, JWKS, JWT Validation, and Client Credentials still reads `planned` on `main` although Epic 3 is merged — fix them to `implemented` (and Authorization Code + PKCE per actual state of `pkg/token`).
- `cd <worktree>/go && go build ./... && go vet ./... && gofmt -l .` clean before every commit. Never `git add .` — add specific files.
- Conventional commits: `feat(go): <description>` / `feat(spec): <description>` where a commit is spec-only.

**test** — Follow `phases/test.md`, plus:
- Unit tests cover every Epic 5 AC and reference the conformance IDs in a comment (e.g. `// INTR-003`). Mock HTTP with `httptest`; fixtures load from `spec/test-fixtures/` the same way the core packages do. DPoP: verify `ath` and RFC 7638 thumbprint computation against the deterministic fixture pairs (`dpop-ath-pairs.json`, `dpop-thumbprint-pairs.json`).
- Integration tests behind `//go:build integration`, reusing the `TEST_*` env convention (`go/internal/integrationtest`, profiles in repo-root `.env.node-oidc` etc.). Introspection/revocation/DPoP run against the local node-oidc-provider with the feature flag enabled; token exchange uses the `httptest` mock (see analyze). Skip gracefully when `TEST_DISCO_ADDRESS` is unset.
- Run locally: `make infra-up` then `make test-integration-node-oidc`; `make infra-down` after. `go test ./...` (unit) must pass before pushing.

**review** — Follow `phases/review.md`. Reviewers: **Blind Hunter + Edge Case Hunter + Acceptance Auditor** (templates in `ralph-prompts/review-agents/`). Acceptance Auditor must verify every Epic 5 AC, every Epic 0F deliverable, and every conformance ID is covered.

**review-fix** — Follow `phases/review-fix.md`. No overrides.

**pr** — Follow `phases/pr.md`, plus:
- Repo `jamescrowley321/identity-model`. **Open with `--base <base_branch>`** (the chained parent, not main, unless the parent is already merged).
- Title: `feat(go): <description>`. Body lists the Epic 5 story, the Epic 0F spec story, ACs covered, conformance IDs, and review summary.
- **No auto-merge flags.**

**ci** — Follow `phases/ci.md`. Repo `jamescrowley321/identity-model`. Max 3 CI fix attempts. Gates: the **`go`** job (build/vet/test/golangci-lint), the **`go-integration`** compose job (node-oidc + IdentityServer — your infra feature-flag changes must not break the core suites), and the **`conformance`** aggregation gate. CI runs on every PR regardless of base branch; the `changes` paths-filter triggers the Go jobs since your PRs touch `go/` and `spec/`. Note the CI stable toolchains move ahead of local ones — if a lint fires in CI that doesn't reproduce locally, install the CI's toolchain version locally to reproduce rather than guessing.

**complete** — **OVERRIDE: do NOT merge the PR.**
1. Mark the task `done` in the queue in THIS file.
2. `cd ~/repos/auth/identity-model && git worktree remove <worktree> --force`
3. Delete `.claude/task-state.md`.
4. Output: <promise>TASK COMPLETE</promise>

## Rules

- Execute ONE phase per iteration, then end — fresh context prevents drift.
- NEVER commit to `main`; always feature branches in worktrees.
- All work after setup happens in the worktree.
- Spec first: each task's conformance JSON + fixtures are authored per the Epic 0F story before the Go implementation, and the implementation must satisfy the conformance IDs, not just compile.
- Idiomatic Go per the core packages: stdlib `net/http`, functional options, singleflight, the existing JOSE dependency. No new heavyweight deps without need.
- Conventional commits (`feat(go):` / `test(go):` / `fix(go):` / `feat(spec):`).
- Run `go build ./... && go vet ./... && gofmt -l .` before committing, `go test ./...` before pushing.
- If stuck 3+ iterations on the same phase: set task to `blocked`, clean up the worktree, delete task-state.md, move on.
- **NEVER merge PRs — the owner reviews and merges manually.**
- **One workstream per repo: this loop must not run concurrently with any other identity-model loop.**
