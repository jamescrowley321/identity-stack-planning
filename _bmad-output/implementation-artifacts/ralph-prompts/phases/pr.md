# Phase: pr

Push branch and create PR.

`cd <worktree or repo root>`

1. **Integration test gate.** Verify feature work has integration/e2e coverage before pushing:
   ```bash
   BASE=$(jq -r '.base_branch // "main"' .ralph/task-state.json 2>/dev/null || echo main)
   DIFF=$(git diff --name-only "origin/$BASE...HEAD")
   CODE=$(echo "$DIFF" | grep -E '^(backend/app/|src/py_identity_model/|internal/)' | grep -vE '(_test\.go$|/tests/)' | head -1)
   TESTS=$(echo "$DIFF" | grep -E '(tests/integration/|tests/e2e/|_test\.go$)' | head -1)
   if [ -n "$CODE" ] && [ -z "$TESTS" ]; then
     if ! git log "origin/$BASE..HEAD" --format=%B | grep -q '\[skip-integration-tests:'; then
       echo "GATE FAIL: feature code changed but no integration/e2e tests touched."
       echo "Add tests under tests/integration/, tests/e2e/, or *_test.go."
       echo "Override (rare): include [skip-integration-tests: <reason>] in a commit body."
       exit 1
     fi
   fi
   ```
   If the gate fails, **return to the test phase** — do not push, do not skip. Re-running this phase without adding tests is a hard error.

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
   - [x] Independent review agents passed
   - [ ] CI passes

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )" --repo jamescrowley321/<repo>
   ```

4. If review files exist (`.claude/review-*.md`), post each as a PR comment.
5. Record PR number in task-state under `## PR`
6. **Advance to the next phase. End your response.**
