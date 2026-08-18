#!/usr/bin/env bash
# Launch a ralph loop with zero manual setup.
#   Usage: run.sh <loop-name> [repo]        (repo defaults to py-identity-model)
#   e.g.:  run.sh pim-consolidation
# Creates a dedicated /tmp/<loop>-ralph worktree off origin/main, drops the
# prompt in as PROMPT.md, and runs ralph. One loop per repo at a time.
set -euo pipefail
loop="${1:?usage: run.sh <loop-name> [repo]}"
repo="${2:-py-identity-model}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prompt="${here}/${loop}.md"
[[ -f "$prompt" ]] || { echo "no such prompt: $prompt" >&2; exit 1; }
wt="/tmp/${loop}-ralph"
cd ~/repos/auth/"$repo"
git fetch origin
git worktree add "$wt" -b "ralph/${loop}" origin/main
cp "$prompt" "$wt/PROMPT.md"
cd "$wt"
exec ralph run --idle-timeout 0
