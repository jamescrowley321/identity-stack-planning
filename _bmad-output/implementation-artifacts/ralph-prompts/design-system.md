Self-referential implementation loop. Execute ONE phase of ONE story per iteration, then end. Fresh context each iteration — persist all state to files.

## Task Queue

Independent PRs — each story branches from `main`, not from the previous story's branch.

| Story | Task ID | Branch | Status |
|-------|---------|--------|--------|
| DS-1.1 | T210 | ds/tokens-purple-brand | done |
| DS-1.2 | T211 | ds/density-control-heights | partial |
| DS-1.3 | T212 | ds/density-header-layout | partial |
| DS-1.4 | T213 | ds/typography-scale | done |
| DS-2.1 | T214 | ds/badge-sync-variants | done |
| DS-2.2 | T215 | ds/responsive-breakpoints | done |
| DS-2.3 | T216 | ds/sidebar-nav-platform | done |
| DS-2.4 | T217 | ds/fix-e2e-density | pending |
| DS-3.1 | T218 | ds/component-kpi-strip | done |
| DS-3.2 | T219 | ds/component-provider-glyph | pending |
| DS-3.3 | T220 | ds/component-spark | pending |
| DS-3.4 | T221 | ds/component-stream-row | pending |
| DS-3.5 | T222 | ds/component-sync-flow | pending |
| DS-3.6 | T223 | ds/component-matrix-grid | pending |
| DS-3.7 | T224 | ds/component-audit-row | pending |
| DS-3.8 | T225 | ds/component-confidence-score | pending |
| DS-4.0 | T226 | ds/backend-admin-endpoints | pending |
| DS-4.1 | T227 | ds/page-providers-list | pending |
| DS-4.2 | T228 | ds/page-providers-detail | pending |
| DS-4.3 | T229 | ds/page-sync-dashboard | pending |
| DS-4.4 | T230 | ds/page-sync-matrix | pending |
| DS-4.5 | T231 | ds/page-events-tail | pending |
| DS-4.6 | T232 | ds/page-events-polling | pending |
| DS-4.7 | T233 | ds/page-identity-correlation | pending |
| DS-4.8 | T234 | ds/page-identity-conflicts | pending |
| DS-4.9 | T235 | ds/page-provisional-queue | pending |
| DS-4.10 | T236 | ds/page-provisional-actions | pending |
| DS-5.1 | T237 | ds/tests-unit-components | pending |
| DS-5.2 | T238 | ds/tests-e2e-pages | pending |
| DS-5.3 | T239 | ds/tests-responsive | pending |
| DS-5.4 | T240 | ds/tests-visual-regression | pending |

### Dependencies (enforce ordering)

- DS-1.1 must be done before DS-1.2, DS-1.3, DS-1.4, DS-2.*, DS-3.*
- DS-1.2 must be done before DS-1.3
- DS-3.2 must be done before DS-3.5
- DS-4.0 must be done before DS-4.1, DS-4.3, DS-4.5, DS-4.9
- Each page pair is sequential (DS-4.1→DS-4.2, DS-4.3→DS-4.4, etc.)

### Execution Priority

Stories DS-1.1, DS-1.4, DS-2.1, DS-2.2, DS-2.3, DS-3.1 are done. DS-1.2 and DS-1.3 are partial (tokens defined but not wired into components).

Process remaining stories in this order:
1. DS-3.2 (Provider Glyph — blocks DS-3.5, DS-4.1, DS-4.5, DS-4.7, DS-4.9)
2. DS-3.4 (Stream Row — blocks DS-4.3, DS-4.5)
3. DS-3.3, DS-3.8, DS-3.6, DS-3.7 (remaining components, parallel)
4. DS-3.5 (Sync Flow — depends on DS-3.2)
5. DS-1.2 finish, DS-1.3 finish (wire density tokens into components)
6. DS-4.0 (backend admin endpoints — finish aggregation endpoints)
7. DS-4.1 through DS-4.10 (pages, in pairs)
8. DS-2.4, DS-5.1 through DS-5.4 (testing)

## Routing

Read `~/repos/auth/identity-stack/.claude/task-state.md`.

- **Does not exist** → pick next `pending` story (respecting dependencies), create task-state.md with `phase: setup`, execute setup
- **phase is `complete`** → update this file (`pending` → `done`), clean up worktree, delete task-state.md, pick next story
- **Any other phase** → read the phase file and execute it

Phase order: `setup → analyze → implement → test → review → review-fix → pr → docs → ci → complete`

## Phase Instructions

Read ONLY the current phase file — do not read other phase files:

```
~/repos/auth/identity-stack-planning/_bmad-output/implementation-artifacts/ralph-prompts/phases/<phase>.md
```

**All work after `setup` happens in the worktree** — `cd` to the path in `worktree:` first.

## New Story Setup

When picking up a new story, create `~/repos/auth/identity-stack/.claude/task-state.md`:
```
story: <DS-N.M>
task_id: <T2XX>
branch: <branch from queue>
base_branch: main
worktree: /tmp/is-design-system-<story>
phase: setup
design_ref: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/design-system/
epic_ref: ~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/epics-design-system.md
```

If all stories are `done`: output `<promise>LOOP_COMPLETE</promise>`

## Design System Reference

The design system reference files are at:
```
~/repos/auth/identity-stack-planning/_bmad-output/planning-artifacts/design-system/
├── README.md              — Design system overview and product context
├── SKILL.md               — Agent skill manifest
├── colors_and_type.css    — All design tokens (THE source of truth for token values)
├── kit.css                — Pure CSS component primitives (reference for component behavior)
├── tokens.css             — UI kit token overrides (softer brand variant, reference only)
├── ui-kit-README.md       — UI kit component documentation
```

**Token changes come from `colors_and_type.css`.** Read this file before implementing any token story.

**Component patterns come from `kit.css`.** Read the relevant CSS class before implementing a component.

**Epic details are in `epics-design-system.md`.** Read the full acceptance criteria for your current story.

## Rules

- ONE story per iteration. Never start a second story.
- Each story branches from `main` (not chained like canonical-identity).
- Read the design system reference files before implementing.
- Every component story MUST include unit tests in a `__tests__/` directory alongside the component.
- Every page story MUST follow existing patterns from `frontend/src/pages/Dashboard.tsx` (hooks, API calls, loading states, error handling).
- Use Tailwind CSS classes and the design system's CSS variables — no inline styles, no hardcoded colors.
- Follow existing shadcn/ui patterns: CVA variants, `cn()` utility, `data-slot` attributes, `Slot.Root` for asChild.
- Conventional commits (Angular convention). Prefix: `feat:` for new components/pages, `style:` for token changes.
- Run `make lint` and `make test-unit` (frontend vitest) before creating PR.
- Never push to main. Always create feature branch and PR.
