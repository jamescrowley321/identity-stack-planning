# Claude Code Instructions — identity-stack-planning

The rules for working in this repository are tool-neutral and live in `AGENTS.md`. They are
imported here, so everything in that file applies:

@AGENTS.md

What follows is Claude Code specific.

## Skills

BMAD-METHOD v6.12.0 is installed at `_bmad/`, which is tracked. The `/bmad-*` skills under
`.claude/skills/` are **generated from it and not tracked** — in a fresh clone, run
`npx bmad-method install` once to materialize them.

| Skill | Use |
|---|---|
| `/bmad-help` | Contextual guidance on what to do next |
| `/bmad-product-brief` | Kick off a new initiative |
| `/bmad-prd` | Create a product requirements document |
| `/bmad-architecture` | Design system architecture |
| `/bmad-create-epics-and-stories` | Break work into implementable units |
| `/bmad-agent-pm`, `/bmad-agent-architect` | Engage a specific BMAD persona |
| `/ralph-status` | Real-time summary of active ralph loops across the workspace |

This repository's own skills — `ralph-audit` and `ralph-status` — are tracked. The `bmad-*`
ones are not.

## Worktrees

Work happens on a feature branch in a dedicated git worktree, never in the primary checkout.
Concurrent sessions switch branches underneath each other otherwise.

Create worktrees under `/tmp`, not inside the repository: a worktree in a git-ignored path
makes some lint and typecheck tooling silently skip the tree it is meant to be checking.

## Reading sibling repositories

You have full filesystem access to the sibling checkouts listed in `AGENTS.md`. Read them to
ground planning work — and read `~/repos/auth/CLAUDE.md` for the build, test and lint commands
of each. Never modify them from this context.
