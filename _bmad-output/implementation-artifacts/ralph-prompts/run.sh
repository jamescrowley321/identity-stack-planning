#!/usr/bin/env bash
# Launch a ralph loop with zero manual setup.
#   Usage: run.sh <loop-name> [repo] [base]   (repo defaults to py-identity-model, base to main)
#   e.g.:  run.sh pim-consolidation
#          run.sh identity-model-stack identity-model release/v5
# Creates a dedicated /tmp/<loop>-ralph worktree off origin/<base>, drops the
# prompt in as PROMPT.md, and runs ralph. If hats/<loop>.yml exists it is loaded
# as the hat collection. Relaunching reuses an existing worktree. One loop per repo at a time,
# unless RALPH_CLONE=1: then the loop gets its own clone /tmp/<loop>-clone and its worktree is
# cut from that, so loops sharing a repo never share a git dir (e.g. cert-go + cert-rust).
#          RALPH_CLONE=1 run.sh identity-model-cert-go identity-model main
set -euo pipefail
loop="${1:?usage: run.sh <loop-name> [repo] [base]}"
repo="${2:-py-identity-model}"
base="${3:-main}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prompt="${here}/${loop}.md"
hats="${here}/hats/${loop}.yml"
[[ -f "$prompt" ]] || { echo "no such prompt: $prompt" >&2; exit 1; }
wt="/tmp/${loop}-ralph"
src=~/repos/auth/"$repo"
if [[ "${RALPH_CLONE:-0}" == 1 ]]; then
  clone="/tmp/${loop}-clone"
  [[ -d "$clone" ]] || git clone --no-checkout "$(git -C "$src" remote get-url origin)" "$clone"
  src="$clone"
fi
cd "$src"
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
