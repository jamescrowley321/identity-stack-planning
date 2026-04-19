---
inputDocuments:
  - _bmad-output/planning-artifacts/prd-canonical-identity.md
  - _bmad-output/planning-artifacts/architecture-canonical-identity.md
  - _bmad-output/planning-artifacts/design-system/README.md
  - _bmad-output/planning-artifacts/design-system/colors_and_type.css
  - _bmad-output/planning-artifacts/design-system/kit.css
workflowType: 'epics'
project_name: 'identity-stack'
date: '2026-04-19'
---

# Design System Integration — Epic Breakdown

Epic and story breakdown for integrating the Claude Design design system into identity-stack frontend. The design system introduces a purple brand color, density increase, 8 new components, 5 new admin pages for PRD 5 (canonical identity), and responsive breakpoints.

**Source:** Design system bundle exported from Claude Design (2026-04-19). Reference files committed to `_bmad-output/planning-artifacts/design-system/`.

**Target repo:** identity-stack (frontend + backend)

**Execution method:** Ralph loops — one story per loop, feature branch per story, conventional commits.

**Depends on:** PRD 5 backend (COMPLETE — shipped 2026-04-09). Backend routers for providers, idp-links, reconciliation, and internal identity resolution all exist.

---

## Epic List

### Epic DS-1: Design Token Migration
The identity-stack frontend adopts the new purple brand color scale, increased control density, updated typography scale, and new semantic tokens — establishing the visual foundation for all subsequent work.

### Epic DS-2: Component & Layout Updates
Existing shadcn components and layout shells are updated to match the design system's density, responsive breakpoints, and navigation structure for the 5 new admin pages.

### Epic DS-3: New Shared Components
8 new reusable UI components are created for the PRD 5 admin surfaces: KPI strip, provider glyph, sparkline, stream row, sync flow diagram, matrix grid, audit row, and confidence score.

### Epic DS-4: PRD 5 Admin Pages
5 new admin pages provide UI for the canonical identity model: Providers, Sync Dashboard, Inbound Events, Identity Correlation, and Provisional Users. Includes small backend additions for missing endpoints.

### Epic DS-5: Integration Testing
Comprehensive test coverage for all new components and pages: unit tests, E2E Playwright tests, responsive viewport tests, and visual regression baselines.

---

## Epic DS-1: Design Token Migration

The identity-stack frontend adopts the new brand color, density, and typography tokens from the design system. Everything else depends on this epic.

### Story DS-1.1: Purple brand color scale + semantic tokens

As a developer,
I want the identity-stack frontend to use a purple brand color as its primary,
So that the app has a distinct brand identity beyond the default neutral grayscale.

**Acceptance Criteria:**

**Given** the current `index.css` defines `--primary: oklch(0.205 0 0)` (near-black)
**When** the purple scale is applied
**Then** `--primary` maps to `var(--brand)` (purple-500: `oklch(0.565 0.235 276)`)
**And** `--purple-50` through `--purple-900` OKLCH variables exist in `:root`

**Given** the `@theme inline` block registers color tokens
**When** the new semantic tokens are added
**Then** `--color-brand`, `--color-brand-hover`, `--color-brand-foreground`, `--color-brand-soft`, `--color-brand-soft-foreground`, `--color-ink`, `--color-ink-foreground` are available as Tailwind utilities (`bg-brand`, `text-ink`, etc.)

**Given** dark mode (`.dark` class) is active
**When** the user toggles to dark mode
**Then** `--primary` resolves to `var(--purple-400)` and sidebar tokens use purple-tinted values
**And** the purple brand is visible in both light and dark modes

**Given** the chart palette tokens `--chart-1` through `--chart-5`
**When** updated with purple-tinted chroma
**Then** chart colors are purple-tinted neutrals, not pure grays

**Files:** `frontend/src/index.css`
**Size:** Small
**Task ID:** T210

### Story DS-1.2: Density increase — control heights + spacing

As a developer,
I want control heights increased from 32px to 40px default,
So that the admin UI is more comfortable and matches the design system density spec.

**Acceptance Criteria:**

**Given** `button.tsx` defines default size as `h-8` (32px)
**When** the density increase is applied
**Then** the default button size is `h-9` (36px), xs is `h-7` (28px), sm is `h-8` (32px), lg is `h-10` (40px)
**And** icon sizes scale proportionally: `size-9`, `size-7`, `size-8`, `size-10`

**Given** `index.css` has no explicit control height variables
**When** the density tokens are added
**Then** `--control-h: 40px`, `--control-h-sm: 32px`, `--control-h-lg: 48px`, `--header-h: 60px`, `--page-pad: 32px` exist in `:root`

**Given** the app builds with `npm run build`
**When** the density changes are applied
**Then** the build succeeds with no TypeScript errors

**Files:** `frontend/src/index.css`, `frontend/src/components/ui/button.tsx`
**Size:** Small
**Task ID:** T211

### Story DS-1.3: Header + page layout density

As a developer,
I want the header height increased to 60px and page padding to 32px,
So that the layout matches the design system's spacious admin density.

**Acceptance Criteria:**

**Given** `Header.tsx` uses `h-12` (48px)
**When** the density is applied
**Then** the header uses `h-[var(--header-h)]` or equivalent (60px)

**Given** `PageHeader.tsx` uses `px-6 pt-6`
**When** the density is applied
**Then** PageHeader uses `px-8 pt-8` (32px)

**Given** all 7 page components use `p-6` for content padding
**When** the density is applied
**Then** all page wrappers use `p-8` (32px)

**Files:** `frontend/src/components/layout/Header.tsx`, `frontend/src/components/layout/PageHeader.tsx`, all page files (Dashboard, MemberManagement, AccessKeys, RoleManagement, FGAManagement, TenantSettings, UserProfile)
**Size:** Medium
**Task ID:** T212
**Depends on:** DS-1.2

### Story DS-1.4: Typography scale + base styles

As a developer,
I want the typography scale and semantic styles defined as CSS variables,
So that heading/body/caption styles are consistent and adjustable from one place.

**Acceptance Criteria:**

**Given** no explicit typography scale CSS variables exist
**When** the type tokens are added
**Then** `--text-xs` (13px) through `--text-3xl` (36px) are defined in `:root`
**And** `--font-mono` for Geist Mono is defined

**Given** no semantic heading styles exist in `index.css`
**When** the base styles are added
**Then** `h1`-`h4`, `p`, `small`, `code`, `.label`, `.muted` classes are defined in `@layer base`
**And** `body` font-size is `var(--text-sm)` (15px) with `line-height: 1.55`

**Files:** `frontend/src/index.css`
**Size:** Small
**Task ID:** T213

---

## Epic DS-2: Component & Layout Updates

Update existing shadcn components and the app shell to match the design system.

### Story DS-2.1: Badge sync-state variants

As a developer,
I want badge variants for sync states (success, warning),
So that the sync pill component can be built on top of the existing badge system.

**Acceptance Criteria:**

**Given** `badge.tsx` has variants: default, secondary, destructive, outline, ghost, link
**When** sync-state variants are added
**Then** `success` variant renders with green tones and `warning` variant renders with amber tones
**And** both work in light and dark mode

**Given** the success/warning colors don't exist in the current token set
**When** implementing these variants
**Then** use OKLCH green (`oklch(0.62 0.19 145)`) and amber (`oklch(0.75 0.15 75)`) inline or as new `--success`/`--warning` CSS variables

**Files:** `frontend/src/components/ui/badge.tsx`, optionally `frontend/src/index.css`
**Size:** Small
**Task ID:** T214

### Story DS-2.2: Responsive breakpoints

As a developer,
I want a `useBreakpoint()` hook that returns `mobile | tablet | desktop`,
So that components can adapt layout at 768px and 1024px breakpoints.

**Acceptance Criteria:**

**Given** `use-mobile.ts` has only a `useIsMobile()` hook at 768px
**When** the breakpoint system is extended
**Then** `useBreakpoint()` returns `'mobile'` below 768px, `'tablet'` between 768-1024px, `'desktop'` above 1024px
**And** `useIsMobile()` still works (backwards compatible)

**Given** the sidebar uses `useIsMobile()` for Sheet drawer behavior
**When** at tablet width (768-1024px)
**Then** the sidebar auto-collapses to icon mode (not drawer)

**Files:** `frontend/src/hooks/use-mobile.ts`, `frontend/src/components/ui/sidebar.tsx`
**Size:** Medium
**Task ID:** T215

### Story DS-2.3: Sidebar nav items for new pages

As a developer,
I want the sidebar to show navigation items for the 5 new admin pages,
So that users can navigate to Providers, Sync, Events, and Provisional Users.

**Acceptance Criteria:**

**Given** the sidebar has a flat list of nav items
**When** the new pages are added
**Then** nav items are grouped into 3 sections:
  - **Workspace:** Dashboard, Members, Roles, Access Keys, FGA
  - **Platform:** Providers (Globe), Sync Dashboard (RefreshCw), Events (Activity), Provisional Users (UserPlus)
  - **Tenant:** Settings, Profile

**Given** the Header has a `routeLabels` map
**When** new routes are added
**Then** `/providers`, `/sync`, `/events`, `/provisional` have correct page labels

**Given** the Platform pages require admin access
**When** a non-admin user views the sidebar
**Then** Platform section items are hidden (same RBAC filtering as existing admin items)

**Files:** `frontend/src/components/layout/AppSidebar.tsx`, `frontend/src/components/layout/Header.tsx`
**Size:** Small
**Task ID:** T216

### Story DS-2.4: Update existing E2E tests for density changes

As a developer,
I want existing Playwright E2E tests to pass after density changes,
So that the design system migration doesn't introduce regressions.

**Acceptance Criteria:**

**Given** E2E tests exist in `backend/tests/e2e/`
**When** density changes (header height, button sizes, padding) are applied
**Then** all existing E2E tests pass without modification OR are updated to accommodate the new layout

**Given** tests use semantic selectors (roles, text content)
**When** reviewing for density-related breakage
**Then** any pixel-based or dimension-based assertions are updated

**Files:** E2E test files in `backend/tests/e2e/`
**Size:** Small
**Task ID:** T217
**Depends on:** DS-1.2, DS-1.3

---

## Epic DS-3: New Shared Components

8 new reusable UI components for the PRD 5 admin surfaces. Each component follows the existing pattern: CVA variants, `cn()` utility, `data-slot` attributes, unit tests alongside.

### Story DS-3.1: KPI Strip component

As a developer,
I want a KPI strip component that displays 4 metric cards in a row,
So that admin pages can show key metrics at a glance.

**Acceptance Criteria:**

**Given** a list of KPI items `[{label, value, delta?, trend?}]`
**When** rendered
**Then** items display in a 4-column grid (desktop), 2-column (tablet), stacked (mobile)
**And** positive deltas render green, negative render red, neutral render muted

**Files:** New `frontend/src/components/ui/kpi-strip.tsx`, new `frontend/src/components/ui/__tests__/kpi-strip.test.tsx`
**Size:** Small
**Task ID:** T218

### Story DS-3.2: Provider Glyph component

As a developer,
I want a provider glyph component with 8 color-coded provider styles,
So that identity providers are visually distinguishable across admin pages.

**Acceptance Criteria:**

**Given** a provider type (descope, okta, auth0, entra, cognito, google, ory, generic)
**When** rendered
**Then** a 36px square badge shows a 3-letter abbreviation (DSC, OKT, A0, ENT, COG, GOO, ORY, GEN)
**And** each provider has a distinct background color via CVA variants

**Files:** New `frontend/src/components/ui/provider-glyph.tsx`, new test file
**Size:** Small
**Task ID:** T219

### Story DS-3.3: Spark (inline sparkline) component

As a developer,
I want an inline sparkline bar chart component,
So that admin dashboards can show throughput trends without a charting library.

**Acceptance Criteria:**

**Given** an array of numbers `data: number[]`
**When** rendered
**Then** vertical bars represent each value, scaled to 32px max height
**And** bars use the `--brand` color by default, configurable via `color` prop

**Files:** New `frontend/src/components/ui/spark.tsx`, new test file
**Size:** Small
**Task ID:** T220

### Story DS-3.4: Stream Row component

As a developer,
I want a monospace event log row component,
So that the Inbound Events and Sync Dashboard pages can display event streams.

**Acceptance Criteria:**

**Given** an event `{timestamp, icon, verb, subject, code?}`
**When** rendered
**Then** timestamp is fixed-width monospace, verb is color-coded (create=green, update=blue, delete=red, skip=muted), subject is primary text

**Files:** New `frontend/src/components/ui/stream-row.tsx`, new test file
**Size:** Small
**Task ID:** T221

### Story DS-3.5: Sync Flow Diagram component

As a developer,
I want a sync flow diagram showing upstream providers flowing into the canonical store,
So that the Sync Dashboard can visualize the replication topology.

**Acceptance Criteria:**

**Given** a list of providers with sync status
**When** rendered
**Then** 3-column layout: provider glyphs (left), directional arrow with status (center), canonical store indicator (right)
**And** each provider row shows its sync status badge

**Files:** New `frontend/src/components/ui/sync-flow.tsx`, new test file
**Size:** Small
**Task ID:** T222
**Depends on:** DS-3.2

### Story DS-3.6: Matrix Grid component

As a developer,
I want a checkbox matrix grid for role-permission mapping,
So that the Roles page and Providers page can display assignment matrices.

**Acceptance Criteria:**

**Given** `rows: string[]`, `cols: string[]`, `checked: Set<string>`, `onChange: (key) => void`
**When** rendered
**Then** a grid with row headers on the left, column headers on top, and toggle-able checkboxes at intersections
**And** checked state is keyed as `${row}:${col}`

**Files:** New `frontend/src/components/ui/matrix-grid.tsx`, new test file
**Size:** Medium
**Task ID:** T223

### Story DS-3.7: Audit Row component

As a developer,
I want a compact audit log row component,
So that event history can be displayed in identity correlation and sync pages.

**Acceptance Criteria:**

**Given** an audit entry `{timestamp, actor, action, target}`
**When** rendered
**Then** 4-column layout with monospace timestamp, actor name, color-coded action verb, and target identifier

**Files:** New `frontend/src/components/ui/audit-row.tsx`, new test file
**Size:** Small
**Task ID:** T224

### Story DS-3.8: Confidence Score component

As a developer,
I want a visual confidence indicator component,
So that identity correlation suggestions can show match quality.

**Acceptance Criteria:**

**Given** a `value: number` between 0 and 100
**When** rendered
**Then** < 50% renders red, 50-75% renders amber, > 75% renders green
**And** the percentage is displayed as text alongside a color bar

**Files:** New `frontend/src/components/ui/confidence-score.tsx`, new test file
**Size:** Small
**Task ID:** T225

---

## Epic DS-4: PRD 5 Admin Pages

5 new admin pages for the canonical identity model. Each page is split into 2 stories: data-fetching skeleton + interactive features.

### Story DS-4.0: Backend endpoints for admin pages

As a developer,
I want the backend API endpoints needed by the new admin pages,
So that frontend pages can fetch sync status, events, and provisional users.

**Acceptance Criteria:**

**Given** no `/api/sync/status` endpoint exists
**When** the endpoint is created
**Then** `GET /api/sync/status` returns `{providers: [{id, name, type, last_sync, status, user_count}], last_reconciliation}`
**And** it aggregates from existing reconciliation + provider services

**Given** no event log persistence exists
**When** the sync event log is added
**Then** a `sync_events` table is created via Alembic migration
**And** `GET /api/events/recent?limit=50&provider=&verb=` returns recent inbound sync events

**Given** the users endpoint doesn't filter by status
**When** provisional user support is added
**Then** `GET /api/users?status=provisional` filters users by their canonical status field

**Files:** Backend routers, services, Alembic migration
**Size:** Large (bundle of 3-4 small additions)
**Task ID:** T226

### Story DS-4.1: Providers page — list + KPI

As a developer,
I want a Providers page showing all registered identity providers,
So that admins can see which IdPs are configured and their sync status.

**Acceptance Criteria:**

**Given** a user navigates to `/providers`
**When** the page loads
**Then** a KPI strip shows: total providers, active count, total linked users, last sync timestamp
**And** a filterable list shows each provider with glyph, name, type, status badge, and user count

**Given** the user clicks a provider
**When** the provider detail loads
**Then** navigation goes to `/providers/:id` (Story DS-4.2)

**Files:** New `frontend/src/pages/Providers.tsx`, update `frontend/src/App.tsx`
**API:** `GET /api/providers`, `GET /api/sync/status` (from DS-4.0)
**Size:** Medium
**Task ID:** T227
**Depends on:** DS-3.1, DS-3.2, DS-4.0

### Story DS-4.2: Providers page — detail drill-down

As a developer,
I want a provider detail view with tabs for overview, claim mapping, linked users, and webhooks,
So that admins can inspect individual provider configuration.

**Acceptance Criteria:**

**Given** a user is on `/providers/:id`
**When** the detail page loads
**Then** 4 tabs display: Overview (provider info, capabilities, glyph + spark), Claim Mapping (read-only table), Linked Users (list from idp-links), Webhooks (configuration display)

**Given** the Linked Users tab is selected
**When** data loads
**Then** users linked to this provider are listed with their canonical ID, email, and link timestamp

**Files:** New `frontend/src/pages/ProviderDetail.tsx`, update `frontend/src/App.tsx`
**API:** `GET /api/providers/{id}/capabilities`, `GET /api/users/{id}/idp-links`
**Size:** Medium
**Task ID:** T228
**Depends on:** DS-4.1

### Story DS-4.3: Sync Dashboard — flow variant + event stream

As a developer,
I want a Sync Dashboard showing the replication topology and recent sync events,
So that admins can monitor the health of IdP synchronization.

**Acceptance Criteria:**

**Given** a user navigates to `/sync`
**When** the page loads
**Then** a sync flow diagram shows all registered providers with their sync direction and status
**And** a stream of recent sync events is displayed below using Stream Row components

**Given** the page has a layout toggle
**When** the user switches between flow/matrix/stack views
**Then** the layout changes accordingly (matrix and stack are Story DS-4.4)

**Files:** New `frontend/src/pages/SyncDashboard.tsx`, update `frontend/src/App.tsx`
**API:** `GET /api/sync/status`, `GET /api/events/recent` (from DS-4.0)
**Size:** Medium
**Task ID:** T229
**Depends on:** DS-3.4, DS-3.5, DS-4.0

### Story DS-4.4: Sync Dashboard — matrix + conflict resolution

As a developer,
I want matrix and stack layout variants plus conflict resolution UI,
So that admins can view provider metrics in grid form and resolve sync drift.

**Acceptance Criteria:**

**Given** the matrix layout variant is selected
**When** rendered
**Then** a provider x metric grid shows: events, errors, lag p50/p99, user count per provider

**Given** drift conflicts exist
**When** the conflict resolution panel is visible
**Then** field-level diffs are shown with accept/reject actions for each conflicting value

**Files:** Update `frontend/src/pages/SyncDashboard.tsx`
**Size:** Medium
**Task ID:** T230
**Depends on:** DS-4.3, DS-3.6

### Story DS-4.5: Inbound Events — live tail

As a developer,
I want an Inbound Events page showing a live stream of webhook/SCIM events,
So that admins can monitor what identity changes are flowing into the system.

**Acceptance Criteria:**

**Given** a user navigates to `/events`
**When** the page loads
**Then** recent events are displayed as Stream Row entries
**And** provider filter (dropdown with glyphs) and verb filter (created/updated/deleted/linked) are available
**And** a pause/resume toggle controls auto-refresh

**Files:** New `frontend/src/pages/InboundEvents.tsx`, update `frontend/src/App.tsx`
**API:** `GET /api/events/recent` (from DS-4.0)
**Size:** Medium
**Task ID:** T231
**Depends on:** DS-3.2, DS-3.4, DS-4.0

### Story DS-4.6: Inbound Events — polling + detail expansion

As a developer,
I want the events page to poll for new events and allow detail expansion,
So that admins get near-real-time visibility and can inspect event payloads.

**Acceptance Criteria:**

**Given** the page is not paused
**When** 5 seconds elapse
**Then** the page polls `GET /api/events/recent` and prepends new events

**Given** a user clicks a Stream Row
**When** the detail panel expands
**Then** the full event payload (JSON) is displayed in a monospace code block

**Files:** Update `frontend/src/pages/InboundEvents.tsx`
**Size:** Small
**Task ID:** T232
**Depends on:** DS-4.5

### Story DS-4.7: Identity Correlation — canonical detail

As a developer,
I want an Identity Correlation page showing a canonical user with all linked IdP identities,
So that admins can see how a user is represented across providers.

**Acceptance Criteria:**

**Given** a user navigates to `/identity/:id` (linked from Providers or Members page)
**When** the page loads
**Then** the canonical user's profile fields are displayed
**And** all linked IdP identities are listed with Provider Glyph, external subject, link timestamp, and metadata

**Given** the user has links to multiple providers
**When** field attribution is shown
**Then** each canonical field indicates which provider supplied its current value

**Files:** New `frontend/src/pages/IdentityCorrelation.tsx`, update `frontend/src/App.tsx`
**API:** `GET /api/users/{id}`, `GET /api/users/{id}/idp-links`
**Size:** Medium
**Task ID:** T233
**Depends on:** DS-3.2, DS-3.7

### Story DS-4.8: Identity Correlation — conflict resolution

As a developer,
I want conflict resolution UI for field-level drift between canonical and IdP values,
So that admins can manually resolve discrepancies.

**Acceptance Criteria:**

**Given** a canonical field (e.g., email) differs from an IdP link's value
**When** the conflict indicator is shown
**Then** both values are displayed with accept/reject actions

**Given** the admin accepts the IdP value
**When** the accept action is triggered
**Then** the canonical field is updated via the existing user PATCH endpoint

**Files:** Update `frontend/src/pages/IdentityCorrelation.tsx`
**Size:** Medium
**Task ID:** T234
**Depends on:** DS-4.7

### Story DS-4.9: Provisional Users — queue

As a developer,
I want a Provisional Users page showing unlinked runtime sign-ins,
So that admins can review and resolve users that couldn't be auto-matched.

**Acceptance Criteria:**

**Given** a user navigates to `/provisional`
**When** the page loads
**Then** provisional users are listed with: email, source provider glyph, created timestamp, confidence score for best canonical match (if any)
**And** a KPI strip shows: queue depth, resolved today, avg resolve time, auto-merge %

**Files:** New `frontend/src/pages/ProvisionalUsers.tsx`, update `frontend/src/App.tsx`
**API:** `GET /api/users?status=provisional` (from DS-4.0)
**Size:** Medium
**Task ID:** T235
**Depends on:** DS-3.1, DS-3.2, DS-3.8, DS-4.0

### Story DS-4.10: Provisional Users — merge/create/reject actions

As a developer,
I want merge, create-new, and reject actions on provisional users,
So that admins can resolve unlinked identities.

**Acceptance Criteria:**

**Given** a provisional user with a suggested canonical match
**When** the admin clicks "Merge"
**Then** a new IdP link is created connecting the provisional user to the canonical user
**And** the provisional user's status is updated

**Given** no match exists
**When** the admin clicks "Create New"
**Then** a new canonical user is created and the provisional status is cleared

**Given** the sign-in is unwanted
**When** the admin clicks "Reject"
**Then** the provisional user record is deleted

**Files:** Update `frontend/src/pages/ProvisionalUsers.tsx`
**API:** `POST /api/users/{id}/idp-links`, `PATCH /api/users/{id}`, `DELETE /api/users/{id}`
**Size:** Medium
**Task ID:** T236
**Depends on:** DS-4.9

---

## Epic DS-5: Integration Testing

Comprehensive test coverage for all design system work.

### Story DS-5.1: Unit tests for new components

As a developer,
I want unit tests for all 8 new components with >80% coverage,
So that component behavior is verified before page integration.

**Acceptance Criteria:**

**Given** 8 new components in `frontend/src/components/ui/`
**When** `npm run test` is executed
**Then** all components have test files with >80% line coverage
**And** edge cases (empty data, extreme values, all variants) are covered

**Files:** Test files alongside each DS-3 component
**Size:** Medium
**Task ID:** T237
**Depends on:** DS-3.1 through DS-3.8

### Story DS-5.2: E2E Playwright tests for new pages

As a developer,
I want Playwright E2E tests for the 5 new admin pages,
So that navigation, rendering, and basic interactions are verified end-to-end.

**Acceptance Criteria:**

**Given** the 5 new pages are implemented
**When** E2E tests run
**Then** each page is navigable from the sidebar, renders without errors, and displays expected content
**And** tests follow existing patterns from `test_authenticated_ui.py`

**Files:** New E2E test file(s) in `backend/tests/e2e/`
**Size:** Large
**Task ID:** T238
**Depends on:** DS-4.1 through DS-4.10

### Story DS-5.3: Responsive E2E tests

As a developer,
I want E2E tests at tablet (1024px) and mobile (375px) viewports,
So that responsive behavior is verified for key pages.

**Acceptance Criteria:**

**Given** responsive breakpoints are implemented (DS-2.2)
**When** tests run at 1024px viewport
**Then** the sidebar is collapsed to icon mode, grids show 2 columns

**Given** tests run at 375px viewport
**When** the sidebar trigger is clicked
**Then** the sidebar opens as a Sheet drawer

**Files:** New E2E test file(s) in `backend/tests/e2e/`
**Size:** Medium
**Task ID:** T239
**Depends on:** DS-2.2

### Story DS-5.4: Visual regression baseline

As a developer,
I want visual regression snapshot baselines for key pages,
So that future changes can be caught by pixel-diff comparison.

**Acceptance Criteria:**

**Given** Dashboard, Providers, and Login pages are rendered
**When** Playwright captures screenshots
**Then** baseline images are stored for comparison in future runs
**And** both light and dark mode snapshots are captured

**Files:** New E2E test file(s), snapshot directory
**Size:** Medium
**Task ID:** T240

---

## Dependency Graph

```
DS-1.1 (purple tokens)
  ├── DS-1.2 (density) ──── DS-1.3 (layout density)
  ├── DS-1.4 (typography)
  │
  ├── DS-2.1 (badge variants)
  ├── DS-2.2 (responsive)
  ├── DS-2.3 (sidebar nav)
  │
  ├── DS-3.1 (KPI strip)
  ├── DS-3.2 (provider glyph) ──── DS-3.5 (sync flow)
  ├── DS-3.3 (sparkline)
  ├── DS-3.4 (stream row)
  ├── DS-3.6 (matrix grid)
  ├── DS-3.7 (audit row)
  └── DS-3.8 (confidence score)

DS-4.0 (backend endpoints)
  ├── DS-4.1 (Providers list) ── DS-4.2 (Provider detail)
  ├── DS-4.3 (Sync flow) ────── DS-4.4 (Sync matrix)
  ├── DS-4.5 (Events tail) ──── DS-4.6 (Events polling)
  ├── DS-4.7 (Correlation) ──── DS-4.8 (Conflict resolution)
  └── DS-4.9 (Provisional) ──── DS-4.10 (Actions)

DS-1.2 + DS-1.3 ── DS-2.4 (E2E test fixes)

DS-3.* + DS-4.* ── DS-5.1 (unit tests)
DS-4.* ──────────── DS-5.2 (E2E tests)
DS-2.2 ──────────── DS-5.3 (responsive tests)
All ─────────────── DS-5.4 (visual regression)
```

## Story Count Summary

| Epic | Stories | Size Breakdown |
|------|---------|----------------|
| DS-1: Token Migration | 4 | 3 small, 1 medium |
| DS-2: Component Updates | 4 | 2 small, 2 medium |
| DS-3: New Components | 8 | 7 small, 1 medium |
| DS-4: Admin Pages | 11 | 1 large, 8 medium, 2 small |
| DS-5: Testing | 4 | 1 large, 3 medium |
| **Total** | **31** | |
