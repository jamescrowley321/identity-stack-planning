# Phase: pr

Push branch and create PR.

`cd <worktree or repo root>`

1. **Integration test gate.** Verify feature work has integration/e2e coverage before pushing.

   The source and test paths below are **per language and post-consolidation**. An earlier version of
   this gate matched `^(backend/app/|src/py_identity_model/|internal/)` — paths from before the
   monorepo consolidation, with `rust/` and `go/` absent entirely. The result was that every Rust and
   Go pull request produced an empty `CODE` and the gate **passed silently**; identity-model#671
   merged with no integration test and nothing objected. A gate that cannot fire is worse than no
   gate, because it reads as a passed check.

   ```bash
   BASE=$(grep '^base_branch:' .claude/task-state.md 2>/dev/null | awk '{print $2}')
   BASE=${BASE:-main}
   DIFF=$(git diff --name-only "origin/$BASE...HEAD")

   # Source that requires proof it works against a real provider or server.
   SRC='^(py/src/py_identity_model/|py/packages/[^/]+/[^/]+/|go/pkg/|go/internal/|rust/src/|backend/app/|frontend/src/)'
   # Integration/e2e coverage, per language.
   ITEST='(py/src/tests/integration/|py/.*/tests/integration/|backend/tests/(integration|e2e)/|frontend/(e2e|tests/e2e)/|_test\.go$|^rust/tests/|\.spec\.ts$)'

   CODE=$(echo "$DIFF" | grep -E "$SRC" | grep -vE "($ITEST|/tests?/)" | head -1)
   TESTS=$(echo "$DIFF" | grep -E "$ITEST" | head -1)

   if [ -n "$CODE" ] && [ -z "$TESTS" ]; then
     if ! git log "origin/$BASE..HEAD" --format=%B | grep -q '\[skip-integration-tests:'; then
       echo "GATE FAIL: source changed ($CODE) but no integration/e2e test did."
       echo "Add coverage under the path for this language:"
       echo "  python  py/src/tests/integration/"
       echo "  go      *_test.go behind the integration build tag"
       echo "  rust    rust/tests/"
       echo "  backend backend/tests/integration/ or tests/e2e/"
       echo "  frontend frontend/e2e/ or *.spec.ts"
       echo "Override (rare): include [skip-integration-tests: <reason>] in a commit body."
       exit 1
     fi
   fi

   # Fail closed on a diff this gate does not understand. If source-looking files
   # changed but SRC matched none of them, the patterns have drifted from the repo
   # layout again -- report it rather than passing by default.
   UNKNOWN=$(echo "$DIFF" | grep -E '\.(py|go|rs|ts|tsx)$' | grep -vE "$SRC" | grep -vE "($ITEST|/tests?/|examples/|conformance/|tools/)" | head -1)
   if [ -n "$UNKNOWN" ]; then
     echo "GATE UNCERTAIN: $UNKNOWN is source but matches no known SRC path."
     echo "Either add it to SRC in phases/pr.md, or justify it in the PR body. Do not ignore this."
   fi
   ```
   If the gate fails, **return to the test phase** — do not push, do not skip. Re-running this phase
   without adding tests is a hard error. Unit tests alone never satisfy it: a unit test proves the
   function, an integration test proves the wire.

1b. **Mechanical security gate.** A filename check is NOT a gate (an empty test file passes it). If the diff touches security-control code, run the deterministic gate — mutation testing on the changed security modules (a surviving mutant = a control whose removal no test catches, the exact FAPI2 failure), the custom Semgrep ruleset, the stranded-control reachability check, and the conformance evidence-integrity check:
   ```bash
   BASE=$(grep '^base_branch:' .claude/task-state.md 2>/dev/null | awk '{print $2}'); BASE=${BASE:-main}
   DIFF=$(git diff --name-only "origin/$BASE...HEAD")
   if echo "$DIFF" | grep -qE 'token_validation|parsers|jwt_helpers|mtls|dpop|jarm|client_auth|jwks|par|fapi|conformance'; then
     make security-gate BASE="origin/$BASE" || {
       echo "SECURITY GATE FAILED — do not push. Fix surviving mutants / Semgrep findings / stranded controls / evidence gaps."
       echo "See RED-BLUE-GATE.md and Epic 19 (Mechanical Security Gates)."
       exit 1
     }
   fi
   ```
   `make security-gate` is delivered by **Epic 19 (Mechanical Security Gates)**; until it exists, a security-control PR MUST NOT advance on a filename/self-attestation check — treat a missing gate as a hard block, not a pass. If it fails, **return to the test phase**.

1c. **Review-evidence gate (hard) — confirmation the reviews took place.** A PR MUST carry independent-reviewer evidence, or it is not created:
   ```bash
   FILES=$(ls .claude/review-*.md 2>/dev/null)
   SKIP=$(grep -Ei '## Review (Summary|Gate):.*(empty diff|skipped|docs/config only)' .claude/task-state.md 2>/dev/null)
   if [ -z "$FILES" ] && [ -z "$SKIP" ]; then
     echo "REVIEW GATE FAIL: no .claude/review-*.md and no recorded skip — the review phase did not run. Return to the review phase; do NOT push or open a PR."
     exit 1
   fi
   ```
   If the gate fails, **return to the review phase**. Never self-attest "reviewed" without reviewer files.

2. Push: `git push -u origin <branch>`

3. Create PR — base is `main` unless the router prompt specifies chained PRs (use `base_branch` from task-state):
   ```
   gh pr create --base <base> --head <branch> \
     --title "<type>: <description>" \
     --body "$(cat <<'EOF'
   ## Summary
   <bullet points of what was implemented>

   Refs #<issue>

   ## Review Findings Addressed
   <summarize review finding counts and resolutions>

   ## Test plan
   - [x] Unit tests pass
   - [x] Integration tests pass (or `[skip-integration-tests: <reason>]` justified below)
   - [x] E2E tests pass (identity-stack only, when applicable)
   - [x] Lint passes
   - [x] Independent review agents ran (findings posted as PR comments below)
   - [ ] CI passes

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )" --repo jamescrowley321/<repo>
   ```

4. **Post the review evidence (mandatory).** Post EVERY `.claude/review-*.md` as a PR comment (`gh pr comment <pr> -R jamescrowley321/<repo> --body-file <file>`), and edit the PR body's "## Review Findings Addressed" to name **which reviewer personas ran** (blind / edge-case / acceptance / sentinel / viper) with per-persona finding counts. If a docs/config-only skip was recorded, state that instead. A feature PR with no reviewer comments is invalid — if you reach here without them, return to the review phase.
5. Record PR number in task-state under `## PR`
6. **Do not merge it.** Opening the PR is the deliverable. Never run `gh pr merge`, never pass
   `--auto` or `--admin`, never use a merge queue, and never alter branch protection or repository
   settings to make a merge possible. The owner reviews and merges every PR.
7. **Advance to the next phase. End your response.**
