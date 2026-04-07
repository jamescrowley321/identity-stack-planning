---
name: ralph-audit
description: Audit ralph loop infrastructure for token waste and efficiency regressions. Checks prompt sizes, phase files, CLAUDE.md bloat, ralph.yml configs, review agent overhead, and reports findings with estimated token impact. Use when the user says "audit ralph", "check loop efficiency", "ralph audit", or "token waste check".
allowed-tools: Bash, Read, Glob, Grep
---

# Ralph Loop Token Efficiency Audit

Audit the ralph loop infrastructure across the auth workspace for token waste vectors. Reference doc: `~/repos/auth/identity-stack-planning/docs/ralph-loop-efficiency.md`

## Step 1: Measure prompt sizes

Read all ralph prompt files and calculate word counts:

```bash
for f in ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/*.md; do
  echo "$(wc -w < "$f") words — $(basename "$f")"
done | sort -rn
```

**Flag:** Any prompt >800 words (except completed epics and one-shot prompts like `pim-adversarial-review.md`). Self-contained prompts (>1,000 words with inline phase instructions) should be converted to the router + phase file pattern.

**Check for inline phases:** For each prompt >800 words, grep for `### review-blind` or `### review-edge` or `### execute` — presence indicates inline phases that should be externalized.

## Step 2: Measure phase file sizes

```bash
for f in ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/*.md; do
  echo "$(wc -w < "$f") words — $(basename "$f")"
done | sort -rn
```

**Flag:** Any phase file >300 words. Phase files should be concise and generic.

**Check for persona file reads:** Grep phase files for `Read.*_bmad.*agents` — this pattern wastes tokens loading BMAD persona files (should be replaced with inline 1-sentence directives).

## Step 3: Measure CLAUDE.md sizes

```bash
wc -w ~/repos/auth/CLAUDE.md ~/repos/auth/py-identity-model/CLAUDE.md ~/repos/auth/identity-stack-planning/CLAUDE.md ~/repos/auth/terraform-provider-descope/CLAUDE.md 2>/dev/null
```

**Flag:** Workspace CLAUDE.md >800 words. Repo-specific CLAUDE.md >1,500 words. These are loaded into EVERY iteration of EVERY loop.

**Check for bloat patterns:** Grep CLAUDE.md files for large sections that loops don't need:
- Mermaid diagrams (loaded as text, never rendered)
- Detailed examples with code blocks (>10 lines)
- Tables with >5 rows

## Step 4: Check ralph.yml configs

Read ralph.yml from each application repo:

```bash
cat ~/repos/auth/identity-stack/ralph.yml
cat ~/repos/auth/py-identity-model/ralph.yml
cat ~/repos/auth/terraform-provider-descope/ralph.yml 2>/dev/null
```

**Flag:**
- `max_consecutive_failures` > 5 (wastes tokens on unrecoverable errors)
- `timeout` > 1200 (15 min should be sufficient)
- Missing `max_consecutive_failures` (uses permissive default)
- Missing `timeout` (no safety bound on iteration time)

## Step 5: Measure review agent templates

```bash
for f in ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/review-agents/*.md; do
  echo "$(wc -w < "$f") words — $(basename "$f")"
done | sort -rn
```

**Flag:** Any review agent >700 words. These are loaded by subagents (so not as critical), but still contribute to per-story cost.

## Step 6: Check review phase for conditional logic

Read `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/review.md`

**Flag:**
- No conditional reviewer selection (all reviewers always run)
- Missing diff-stat based scope detection
- Viper not conditional on auth changes

## Step 7: Check review-fix for delta re-review

Read `~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/review-fix.md`

**Flag:**
- Re-reviews use full PR diff instead of delta (fix commits only)
- Max iterations >3
- No `## Pre-Review SHA` tracking mentioned

## Step 8: Check for anchor phase (should not exist)

```bash
ls ~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/anchor.md 2>/dev/null && echo "WARN: anchor.md still exists — should be deleted (replaced by SHA check in implement)"
```

## Step 9: Estimate per-story token budget

Calculate estimated tokens per story for the most common loop type:

```
Iterations per story:
  setup(1) + analyze(1) + implement(1) + test(1) + review(1 + N subagents) + review-fix(1-3) + pr(1) + ci(1) + complete(1) = 9-12 iterations

Per iteration baseline:
  CLAUDE.md (workspace + repo): ~X tokens
  PROMPT.md (router): ~Y tokens
  Phase file: ~Z tokens
  task-state.md: ~200-2000 tokens
  = ~A tokens baseline

Review subagents (per agent):
  CLAUDE.md: ~X tokens
  Agent template: ~400-600 tokens
  Diff: ~1000-5000 tokens
  Codebase reads: ~3000-5000 tokens
  = ~B tokens per subagent
```

## Step 10: Produce the report

Format as a structured audit report:

```
## Ralph Loop Efficiency Audit

### Summary
- Total prompt words: X (target: <5,000 for active prompts)
- Total phase file words: X (target: <1,500)
- CLAUDE.md words: X workspace + X repo (target: <800 + <1,500)
- Estimated tokens per story: ~X (target: <120,000)

### Findings

#### WARN (should address)
- [file] description — estimated waste: X tokens/story

#### INFO (acceptable)
- [file] description — within bounds

### Token Budget Breakdown
| Component | Words | Tokens (est.) | Loaded |
|-----------|-------|--------------|--------|
| Workspace CLAUDE.md | X | X | Every iteration |
| Repo CLAUDE.md | X | X | Every iteration |
| Router prompt (avg) | X | X | Every iteration |
| Phase file (avg) | X | X | Every iteration |
| Review agents (4x) | X | X | Review phase |
| Architecture doc | X | X | Analyze phase |

### Recommendations
[If any WARN findings, list specific remediation steps]
```
