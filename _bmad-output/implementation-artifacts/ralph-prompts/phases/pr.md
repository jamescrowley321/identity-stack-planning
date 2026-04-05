# Phase: pr

`cd <worktree>`

1. Push: `git push -u origin <branch>`
2. Create PR (chained base — story 1.1 uses `main`, others use previous story's branch):
   ```
   gh pr create \
     --base <base_branch> \
     --head <branch> \
     --title "feat: <Story title>" \
     --body "$(cat <<'PREOF'
   ## Summary
   <bullet points>

   ## Story
   Refs #<issue>
   Part of PRD 5: Canonical Identity Domain Model

   ## Chained PR
   <Based on #<previous PR number> — merge first>

   ## Review Findings Addressed
   - Security: <count> BLOCK, <count> WARN — all resolved
   - Blind Hunter: <count> MUST FIX, <count> SHOULD FIX, <count> NITPICK — all resolved
   - Edge Cases: <count> paths — all resolved
   - Acceptance: <count> PASS, <count> FAIL, <count> PARTIAL — all non-PASS resolved
   - Red Team: <count> findings — all resolved / skipped

   ## Test plan
   - [x] Unit tests pass (`make test-unit`)
   - [x] E2E tests pass (`make test-e2e`)
   - [x] Lint passes (`make lint`)
   - [x] Independent review agents passed
   - [ ] CI passes

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   PREOF
   )" \
     --repo jamescrowley321/identity-stack
   ```
3. Post all review findings as PR comments:
   ```bash
   for f in .claude/review-blind.md .claude/review-edge.md .claude/review-acceptance.md .claude/review-security.md .claude/review-redteam.md; do
     [ -f "$f" ] && gh pr comment <pr_number> --repo jamescrowley321/identity-stack --body "$(cat "$f")"
   done
   ```
4. Record PR number in task-state.md under `## PR`
5. **Set phase to `ci`. End your response.**
