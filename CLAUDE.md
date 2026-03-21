# Claude Code Instructions — auth-planning

## Purpose

This repo is the BMAD-METHOD planning hub for the auth workspace. It contains project planning artifacts, architecture documents, PRDs, epics, and stories that drive development across the sibling repos.

**This repo does NOT contain application code.** It is a planning-only repo that uses BMAD skills and agents to produce structured planning artifacts.

## Workspace Layout

This repo lives at `~/repos/auth/auth-planning/` alongside three sibling repositories that form a pseudo-monorepo:

| Repo | Path | Description |
|------|------|-------------|
| `auth-planning` (this repo) | `~/repos/auth/auth-planning/` | BMAD planning artifacts and project knowledge |
| `py-identity-model` | `~/repos/auth/py-identity-model/` | Production OIDC/OAuth2.0 Python library (JWT, token validation, discovery) |
| `terraform-provider-descope` | `~/repos/auth/terraform-provider-descope/` | Terraform provider for Descope (Go). Fork of `descope/terraform-provider-descope` |
| `descope-saas-starter` | `~/repos/auth/descope-saas-starter/` | SaaS starter kit — FastAPI backend + Vite/React frontend + Terraform infra |

### Cross-Repo Relationships

- `descope-saas-starter/backend` depends on `py-identity-model` (>= 2.1.0) for token validation
- `terraform-provider-descope` manages Descope project infrastructure that the SaaS starter connects to
- `py-identity-model/examples/descope/` contains Descope-specific integration examples

## BMAD Method

This repo uses [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) v6 for AI-driven agile planning. BMAD is installed at `_bmad/` with Claude Code skills at `.claude/skills/`.

### Key Paths

- `_bmad/` — BMAD core + BMM module (agents, workflows, config)
- `_bmad-output/planning-artifacts/` — PRDs, architecture docs, product briefs
- `_bmad-output/implementation-artifacts/` — Epics, stories, sprint plans
- `docs/` — Project knowledge base
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

1. **Read sibling repos directly** — You have full access to `~/repos/auth/py-identity-model/`, `~/repos/auth/terraform-provider-descope/`, and `~/repos/auth/descope-saas-starter/`. Read their code, tests, configs, and CLAUDE.md files to inform planning.
2. **Never modify sibling repos from this context** — Planning artifacts live here; code changes happen in the target repos.
3. **Reference by repo name** — In planning docs, refer to repos by name (e.g., "py-identity-model") rather than absolute paths.

## Git Conventions

- Standard commit messages (no conventional commits required)
- Planning artifacts are committed to this repo
- Each sibling repo has its own git history and remote — see the root `~/repos/auth/CLAUDE.md` for per-repo conventions
