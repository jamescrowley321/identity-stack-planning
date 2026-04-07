# Phase: pr

Push branch and create PR.

`cd <worktree or repo root>`

1. Push: `git push -u origin <branch>`

2. Create PR — base is `main` unless the router prompt specifies chained PRs (use `base_branch` from task-state):
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
   - [x] Lint passes
   - [x] Independent review agents passed
   - [ ] CI passes

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )" --repo jamescrowley321/<repo>
   ```

3. If review files exist (`.claude/review-*.md`), post each as a PR comment.
4. Record PR number in task-state under `## PR`
5. **Advance to the next phase. End your response.**
