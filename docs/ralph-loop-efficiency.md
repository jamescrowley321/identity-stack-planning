# Ralph Loop Efficiency — Token Optimization

This document describes the token efficiency architecture for ralph loops, the optimizations applied, and how to audit for regressions.

## Architecture: Router + Shared Phase Files

All ralph prompts follow the **router + phase file** pattern to minimize tokens loaded per iteration:

```
PROMPT.md (router)          phases/<phase>.md (shared)
┌──────────────────┐        ┌──────────────────┐
│ Task queue        │   ──▶  │ Phase instructions │
│ Routing logic     │        │ (generic, ~100    │
│ Rules             │        │  words each)      │
│ ~300-650 words    │        └──────────────────┘
└──────────────────┘
```

- **Router prompt** contains: task queue, routing (check task-state → determine phase → read phase file), setup instructions, and domain-specific rules
- **Phase files** are shared across all loops — generic, parameterized, ~100-250 words each
- **Review agent templates** (`review-agents/*.md`) are loaded only by subagents, not every iteration

### Phase Pipeline

Feature tasks: `setup → analyze → implement → test → review → review-fix → pr → ci → complete`
Fix tasks: `setup → fix → test → review → review-fix → ci → complete` (or without setup if no worktree)

### What Was Removed

- **Anchor phase** — replaced by a SHA drift check in `implement` (saves ~9,000 tokens/story)
- **Separate plan phase** — merged into `analyze` (saves ~15,000 tokens/story)
- **Docs phase** — removed as separate phase; documentation updates happen during `implement`
- **BMAD persona file reads** — replaced with 1-sentence inline persona directives in each phase file (saves ~7,000-9,000 tokens/story)
- **Self-contained prompt bloat** — all prompts externalized to router pattern (saves 32,000-53,000 tokens/story)

## Token Waste Vectors (ranked by impact)

### 1. Review-fix re-review loop

**Risk:** Each re-review re-reads the full diff + codebase from scratch.
**Mitigation:** Delta-only re-review (fix diff only, not full PR diff). Max 3 iterations (was 5). Previous findings passed to re-review prompt for context.

### 2. Prompt size

**Risk:** Self-contained prompts load all phase instructions every iteration.
**Mitigation:** Router + phase file pattern. Only ~300-650 words loaded per iteration instead of 1,400-3,200.

### 3. Mandatory review agents

**Risk:** 4 reviewers run on every change regardless of scope.
**Mitigation:** Conditional reviewer selection based on `git diff --stat`:
- Auth/middleware/infra changes: all 5 reviewers
- Business logic: 4 reviewers (no Viper)
- Test-only changes: Blind Hunter + Acceptance
- Docs-only changes: Acceptance only

### 4. CLAUDE.md bloat

**Risk:** Every iteration loads workspace + repo CLAUDE.md content.
**Mitigation:** Trimmed workspace CLAUDE.md from 1,575 to 601 words (-62%). Trimmed PIM CLAUDE.md from 2,377 to 1,437 words (-40%). Detailed content moved to architecture docs.

### 5. Context reconstruction

**Risk:** Each iteration starts from zero context and must re-read files.
**Mitigation:** `task-state.md` carries forward plan, anchor SHA, and review findings. Phases reference only what they need. `arch_doc` and `arch_ref` fields allow analyze/implement to read architecture docs only when relevant.

## Configuration

### ralph.yml settings

| Setting | Recommended | Why |
|---------|------------|-----|
| `timeout` | 900 | 15 min per iteration is sufficient |
| `max_iterations` | 100 | Safety cap |
| `max_consecutive_failures` | 5 | 10 was too generous; 5 failures = unrecoverable |

### task-state.md fields

| Field | Required | Used by |
|-------|----------|---------|
| `branch` | Yes | All phases |
| `base_branch` | Yes | Review diff, PR creation |
| `worktree` | If worktree | All phases after setup |
| `issue` | If exists | Analyze, acceptance review |
| `phase` | Yes | Routing |
| `arch_doc` | Optional | Analyze (full architecture doc) |
| `arch_ref` | Optional | Implement (quick reference) |
| `## Plan` | Written by analyze | Implement, test |
| `## Anchor` | Written by analyze | Implement drift check |
| `## Pre-Review SHA` | Written by review | Review-fix delta calculation |

## Estimated Token Budget

| Story Type | Before | After | Savings |
|------------|--------|-------|---------|
| Feature (no review-fix) | ~160,000 | ~80,000 | 50% |
| Feature (1 review-fix) | ~220,000 | ~105,000 | 52% |
| Feature (3 review-fix) | ~380,000 | ~150,000 | 61% |
| Fix task | ~110,000 | ~60,000 | 45% |
| Docs task | ~160,000 | ~50,000 | 69% |

## Auditing

Run `/ralph-audit` to check for token waste regressions. The audit checks:
1. Prompt sizes (flag any >800 words)
2. Phase file sizes (flag any >300 words)
3. CLAUDE.md sizes (flag workspace >800 words, repo-specific >1,500 words)
4. ralph.yml settings (max_consecutive_failures, timeout)
5. Review agent template sizes
6. Self-contained prompts (any prompt with inline phase instructions)
