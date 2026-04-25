---
name: identity-stack-design
description: Use this skill to generate well-branded interfaces and assets for the identity-stack platform — a multi-repo, vendor-agnostic identity control plane (SaaS admin built on shadcn/ui, Geist, and OKLCH neutrals). Use for production-facing features of the identity-stack app, throwaway prototypes of new admin flows, mocks, or design explorations. Contains the full token table, type system, iconography guidance, and a clickable React UI kit.
user-invocable: true
---

Read the `README.md` file within this skill first — it captures the content fundamentals (terse developer-dashboard voice, Title Case titles, verb-first buttons, zero emoji), the visual foundations (flat neutral grayscale, 1px borders, destructive-red as the only color, ring-1 card outlines, 1px press nudge), and the iconography rules (Lucide stroke-1.75 outline, icons-left-of-text).

Key files to pull from:

- **`colors_and_type.css`** — drop-in CSS variable definitions. Light + dark tokens, Geist Variable via jsDelivr, full radius + spacing scale, plus ready-to-use semantic classes (`h1`, `h2`, `body`, `body-sm`, `label`, `caption`, `code`). Copy this into any HTML you generate.
- **`ui_kits/saas-app/`** — reusable JSX primitives (`Button`, `Card`, `Badge`, `Alert`, `Table`, `Tabs`, `Select`, `Dropdown`, `Avatar`, `Separator`, `Toaster`) and shell components (`AppSidebar`, `Header`, `PageHeader`, `TenantSwitcher`, `UserMenu`). `kit.css` is the pure-CSS companion — no Tailwind runtime required. Copy whole files; the components are pre-wired to the CSS classes.
- **`preview/`** — specimen cards for every foundation (colors, type, spacing, components, brand). Open these when you need to sanity-check a detail.
- **`_source/`** — read-only mirror of the real identity-stack codebase. Reach for it when recreating an existing screen; it's the source of truth for visual parity.

When building:

- **Prototypes / mocks / slides:** create a static HTML file, link `colors_and_type.css`, optionally link `ui_kits/saas-app/kit.css` + the JSX primitives, and build from there. Never invent new brand colors — the system is intentionally monochromatic. If you need chromatic signal, use `--destructive` for errors; otherwise stay in neutrals.
- **Production code in identity-stack itself:** the repo uses shadcn/ui + Tailwind v4 directly. Use this skill as a quick reference for tokens, naming, and content voice rather than importing anything from it.
- **New features:** if you're designing something that doesn't exist in the codebase (e.g. a marketing page, a billing UI), flag it — this system is calibrated for admin/dashboard surfaces and has no illustration, hero imagery, or gradient motifs to lean on.

If the user invokes this skill without other guidance, ask them what they want to build — a new admin page, a throwaway mock of an interaction, a slide about the platform — ask a few clarifying questions (which screen, what data shape, what states), and output HTML artifacts or production code as needed. Act as an expert designer for the identity-stack platform: terse voice, dense layouts, 1px borders, no decoration.

Flag substitutions the user should verify:

- **Geist fonts are CDN-loaded** (`@fontsource-variable/geist`). For offline production, download woff2 files.
- **No real logo exists** in the codebase — use the text wordmark `Descope Starter` or the monogram placeholder in `preview/brand-wordmark.html`. Ask the user if they have a real logo to slot in.
