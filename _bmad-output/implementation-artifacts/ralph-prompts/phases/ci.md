# Phase: ci

Monitor CI checks and fix failures.

`cd <worktree or repo root>`

1. Find PR: `gh pr list --head <branch> --repo jamescrowley321/<repo>`
2. Wait: `gh pr checks <pr> --repo jamescrowley321/<repo> --watch --fail-fast`
3. **All pass** → advance to `complete`. End your response.
4. **Fail** → diagnose:
   - `gh run list --branch <branch> --repo jamescrowley321/<repo> --limit 1`
   - `gh run view <run_id> --repo jamescrowley321/<repo> --log-failed`
   - Fix the issue locally, run lint + tests, commit, `git push`
   - Set phase back to `ci` (re-monitor next iteration). End your response.
5. **No CI** (no checks appear after 60s) → advance to `complete`. End your response.
