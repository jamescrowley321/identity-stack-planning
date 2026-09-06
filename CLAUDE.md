# Claude Code Instructions — identity-stack-planning

## Purpose

This repo is the BMAD-METHOD planning hub for the auth workspace. It contains project planning artifacts, architecture documents, PRDs, epics, and stories that drive development across the sibling repos.

**This repo does NOT contain application code.** It is a planning-only repo that uses BMAD skills and agents to produce structured planning artifacts.

## Workspace Layout

This repo lives at `~/repos/auth/identity-stack-planning/` alongside these sibling repositories that form a pseudo-monorepo (⚠️ local dir names do not all match their GitHub remotes — check `git remote`):

| Repo | Path | Description |
|------|------|-------------|
| `identity-stack-planning` (this repo) | `~/repos/auth/identity-stack-planning/` | BMAD planning artifacts and project knowledge |
| `py-identity-model` *(dir)* = `identity-model` *(GitHub)* | `~/repos/auth/py-identity-model/` | **Live polyglot OIDC/OAuth2 client monorepo** (survivor). GitHub repo is `identity-model`; the local dir is still named `py-identity-model`. Holds `py/` = OpenID-certified PyPI package `py-identity-model` (v3.11.x — JWT/validation/discovery **plus** PKCE/auth-code/token-exchange/DPoP/PAR/FAPI…), `go/` = Go module, `rust/` = crate `rs-identity-model`, `spec/` = cross-language conformance (PRD 6). **Ground all library work here.** |
| `terraform-provider-descope` | `~/repos/auth/terraform-provider-descope/` | Terraform provider for Descope (Go). Fork of `descope/terraform-provider-descope` |
| `identity-stack` | `~/repos/auth/identity-stack/` | SaaS starter kit — FastAPI backend + Vite/React frontend + Terraform infra |
| `identity-model-legacy` | `~/repos/auth/identity-model-legacy/` | **ARCHIVED** old polyglot repo (GitHub `identity-model-legacy`, read-only). Superseded by the survivor monorepo above; its fixes were re-implemented natively there. **Do NOT use for grounding** — its capability matrix is stale (it marks Python `planned` for flows that already ship). |

### Cross-Repo Relationships

- `identity-stack/backend` depends on `py-identity-model` (>= 3.8.5) for token validation
- `terraform-provider-descope` manages Descope project infrastructure that the SaaS starter connects to
- `py-identity-model/examples/descope/` contains Descope-specific integration examples

## BMAD Method

This repo uses [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) v6 for AI-driven agile planning. BMAD is installed at `_bmad/` with Claude Code skills at `.claude/skills/`.

### Key Paths

- `_bmad/` — BMAD core + BMM module (agents, workflows, config)
- `_bmad-output/planning-artifacts/` — PRDs, architecture docs, product briefs
- `_bmad-output/implementation-artifacts/` — Epics, stories, sprint plans
- `docs/` — Project knowledge base (see `docs/index.md` for full index)
- `_archive/README.md` — Index of retired artifacts: what each was, what superseded it, and the `git show`
  command to read it back. The artifacts themselves live only in git history
- `_bmad-output/implementation-artifacts/status.md` — **GitHub issues are the source of truth for status.**
  Planning artifacts hold rationale and decomposition and link to their tracking issue; they never carry
  status. Never reintroduce a markdown status tracker
- `.claude/skills/` — BMAD skills invocable via `/bmad-*` commands

### Getting Started with BMAD

- Use `/bmad-help` to get contextual guidance on what to do next
- Use `/bmad-pm` to engage the Product Manager agent
- Use `/bmad-architect` to engage the Architect agent
- Use `/bmad-create-product-brief` to kick off a new initiative
- Use `/bmad-create-prd` to create a Product Requirements Document
- Use `/bmad-create-architecture` to design system architecture
- Use `/bmad-create-epics-and-stories` to break down work into implementable units

### Working Across Repos

When BMAD workflows reference implementation details, architecture, or existing code:

1. **Read sibling repos directly** — You have full access to `~/repos/auth/py-identity-model/` (the live polyglot monorepo — GitHub `identity-model`), `~/repos/auth/terraform-provider-descope/`, and `~/repos/auth/identity-stack/`. Read their code, tests, configs, and CLAUDE.md files to inform planning. (`~/repos/auth/identity-model-legacy/` is the archived old repo — do not ground on it.)
2. **Never modify sibling repos from this context** — Planning artifacts live here; code changes happen in the target repos.
3. **Reference by repo name** — In planning docs, refer to repos by name (e.g., "py-identity-model") rather than absolute paths.

## Ralph Orchestrator Integration

[Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) is used for autonomous task execution across the workspace. Each application repo has its own `ralph.yml` configuration.

## Workspace Root CLAUDE.md

The parent directory `~/repos/auth/CLAUDE.md` contains consolidated commands, git conventions, and cross-repo relationships for all four repos. Always reference it for build/test/lint commands and git workflows — it is the single source of truth for workspace-wide instructions.

## Writing Conventions

**Expand a short code the first time a document uses it.** Write `CONS-1 (the first polyglot-consolidation
epic)`, never a bare `CONS-1`. A reader should be able to parse any sentence without leaving the page. This
applies to requirement codes, decision codes, story codes and task IDs alike.

**One prefix, one meaning, repo-wide.** Before inventing a code family, check
[`docs/glossary.md` → Code index](docs/glossary.md) and add the new family there. `D-1` once meant both an
architecture decision in `system-architecture.md` and an unrelated sign-off item in a parity report — the
collision made both unreadable, and cleaning it up cost more than naming things properly would have.

**Prefer plain words to a code.** A code earns its place only when the thing is referenced from several
documents or tracked on GitHub. A decision that lives in one document does not need an identifier; describe
it. When work is tracked as a GitHub issue, the issue number is the identifier — do not mint a parallel one.

## Git Conventions

- **Conventional commits** (Angular convention) — commit messages must use prefixes like `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `ci:`, `build:`, `test:`, `style:`, `perf:`
- Planning artifacts are committed to this repo
- Always work on feature branches, never commit directly to `main`
- Branch names follow `<type>/<short-description>` format (e.g., `feat/ralph-status-skill`, `docs/update-architecture`)
- Each sibling repo has its own git history and remote — see `~/repos/auth/CLAUDE.md` for per-repo conventions
