#!/usr/bin/env bash
# Launch a ralph loop with zero manual setup.
#   Usage: run.sh <loop-name> [repo] [base]   (repo defaults to py-identity-model, base to main)
#   e.g.:  run.sh pim-consolidation
#          run.sh identity-model-stack identity-model release/v5
# Creates a dedicated /tmp/<loop>-ralph worktree off origin/<base>, drops the
# prompt in as PROMPT.md, and runs ralph. If hats/<loop>.yml exists it is loaded
# as the hat collection. Relaunching reuses an existing worktree. One loop per repo at a time.
set -euo pipefail
loop="${1:?usage: run.sh <loop-name> [repo] [base]}"
repo="${2:-py-identity-model}"
base="${3:-main}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prompt="${here}/${loop}.md"
hats="${here}/hats/${loop}.yml"
[[ -f "$prompt" ]] || { echo "no such prompt: $prompt" >&2; exit 1; }
wt="/tmp/${loop}-ralph"
cd ~/repos/auth/"$repo"
git fetch origin
if [[ -d "$wt" ]]; then
  # Relaunch: keep the worktree and its .ralph/ state (e.g. a stack ledger).
  echo "reusing existing worktree $wt"
else
  git worktree add "$wt" -b "ralph/${loop}" "origin/${base}"
fi
cp "$prompt" "$wt/PROMPT.md"
cd "$wt"
if [[ -f "$hats" ]]; then
  exec ralph run -c ralph.yml -H "$hats" --idle-timeout 0
fi
exec ralph run --idle-timeout 0
