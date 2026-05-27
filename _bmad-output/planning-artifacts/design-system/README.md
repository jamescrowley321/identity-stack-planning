# Identity Stack Design System

Design system extracted from **identity-stack** — an open-source, vendor-agnostic identity platform reference project. The frontend is a React + Vite + TypeScript SPA built on **shadcn/ui** (radix-nova style) with **Tailwind CSS v4** and the **Geist** typeface.

The aesthetic is best described as **"modern developer dashboard"** — high-contrast neutral grayscale, tight density, Geist as the single type family, subtle 1px borders, small corner radii on controls, and color reserved almost entirely for semantic signals (destructive red, a single blue-violet in the dark-mode sidebar). Think Vercel / Linear / shadcn defaults — but calibrated for an admin UI, not a marketing site.

## Source material

Everything in this design system was extracted from the public identity-stack repo on GitHub:

- **Repo:** https://github.com/jamescrowley321/identity-stack
- **Ref:** `main` @ commit `2584564f`
- **Files pulled:**
  - `frontend/src/index.css` — the full token table (OKLCH color vars, radius scale, theme-inline block)
  - `frontend/components.json` — shadcn config: `radix-nova` style, `neutral` baseColor, Lucide icons
  - `frontend/package.json` — font family (`@fontsource-variable/geist`), Tailwind v4, shadcn@4
  - `frontend/src/components/ui/*` — every shadcn primitive (button, card, badge, table, tabs, dialog, dropdown, select, sheet, sidebar, alert, input, label, avatar, skeleton, separator, tooltip, sonner)
  - `frontend/src/components/layout/*` — `AppSidebar`, `Header`, `PageHeader`, `TenantSwitcher`, `UserMenu`, `ThemeToggle`
  - `frontend/src/pages/*` — `Dashboard`, `MemberManagement`, `AccessKeys`, `RoleManagement`, `UserProfile`, `FGAManagement`

The full imported source is mirrored in `_source/` as a read-only reference. Nothing in `_source/` is part of the published design system — it's there so future iterations can keep checking against the real code.

## Index

| Path | What it is |
|---|---|
| `colors_and_type.css` | All design tokens — color CSS vars (light + dark), type scale, semantic type styles, radius + spacing. Drop into any page to inherit the system. |
| `preview/` | Small HTML specimen cards (one concept per card) used by the Design System tab. |
| `ui_kits/saas-app/` | React/JSX recreation of the identity-stack admin app — sidebar, header, Dashboard, Members, Access Keys, Profile. Clickable between screens. |
| `assets/` | Lucide icon references and placeholder marks. Most iconography is CDN-linked (Lucide). |
| `_source/` | Raw import of the identity-stack `frontend/src/` tree — reference only, do not edit. |
| `SKILL.md` | Agent skill manifest. |

## Products represented

There is **one product surface**: the identity-stack web admin app. It's a multi-tenant SaaS control plane for managing users, roles (RBAC), tenants, access keys, and fine-grained authorization (FGA) rules against a Descope-backed identity platform. The whole thing is a logged-in dashboard — no marketing site, no mobile app.

Key screens observed in the codebase:

- **Login** — a single centered "Sign In" button that hands off to the OIDC provider
- **Dashboard** — status overview + tabbed view for Resources and token Claims
- **Members** — invite + manage team members in the current tenant
- **Access Keys** — create / revoke / activate API keys (with one-shot secret reveal)
- **Roles** — RBAC role management
- **FGA Management** — ReBAC relation tuples (Descope FGA / Zanzibar-style)
- **Profile** — per-user custom attributes (`department`, `job_title`, `avatar_url`)

## Content fundamentals

The copy is **terse, direct, developer-facing**. Dashboards, not documents.

- **Case:** Title Case for page titles and card titles (`Access Keys`, `Create Key`, `Custom Attributes`, `Invite Member`, `Tenant Resources`). Lowercase for labels on attribute keys that are themselves identifiers (`department`, `job_title`). Sentence case for descriptions (`Invite and manage team members`).
- **Voice:** Second-person when addressing the user directly (`Welcome, {name}`), but most UI is impersonal label-style (`Backend:`, `Tenant:`, `Roles:`). No "we", no brand voice. The product is a tool, not a companion.
- **Tone:** Dry and functional. Button labels are verbs: `Create`, `Invite`, `Revoke`, `Activate`, `Deactivate`, `Remove`, `Edit`, `Save`, `Cancel`, `Copy to Clipboard`. No marketing exclamation points.
- **Empty states:** One-line declarative — `No members found.`, `No access keys yet.`, `No resources yet.`, `No tenants`. Never cute, never illustrated.
- **Descriptions under card titles:** Short noun phrases or counts — `Scoped to {tenant}`, `3 members`, `Validated by py-identity-model`, `py-identity-model ClaimsPrincipal`. Pluralization handled (`member` vs `members`).
- **Toasts:** Imperative past tense on success (`Access key created`, `Member removed`, `Attribute saved`, `Key revoked`, `Invited {email}`). Generic failures on error (`Failed to save`, `Failed to create key`, `Failed to invite`).
- **Errors:** Render the server's `detail` when present; fall back to `res.statusText`; last-resort to a generic string. Errors go in a destructive `Alert` or a sonner toast.
- **Confirmation copy:** `Copy the secret below — it will not be shown again.` — plain, no emoji, em-dash for a beat.
- **No emoji.** Not in the codebase, not in this system. Iconography is handled by Lucide.
- **No marketing adjectives.** No "amazing", "seamless", "powerful". If you can't prove it in a table, don't say it.

Concrete examples pulled from the source:

> **Page title:** `Members` · **Description:** `Invite and manage team members`
> **Page title:** `Access Keys` · **Description:** `Create and manage API access keys`
> **Alert title:** `Key created!` · **Body:** `Copy the secret below — it will not be shown again.`
> **Button:** `Sign In` · `Try Again` · `Copy to Clipboard` · `Sign out`
> **Toast:** `Member removed` · `Invited alice@acme.com` · `Failed to revoke key`

## Visual foundations

### Color
- **Neutral grayscale is the whole palette.** Defined in OKLCH so light/dark flips cleanly. Background is pure white (light) or near-black `oklch(0.145 0 0)` (dark). Foreground is its inverse. `muted`, `secondary`, `accent` all resolve to the same off-white `oklch(0.97 0 0)` in light mode — they're semantically distinct roles for the same pixel value.
- **One chromatic color: destructive red.** `oklch(0.577 0.245 27.325)` in light, `oklch(0.704 0.191 22.216)` in dark. Used for delete actions, auth errors, the rare destructive badge.
- **One secondary chromatic color: blue-violet.** `oklch(0.488 0.243 264.376)` — only appears as `--sidebar-primary` in dark mode. This is the lone "brand accent" in the system.
- **Chart colors are a gray ramp**, not categorical hues. The system deliberately avoids color-coding data.
- **Borders use low-alpha white in dark mode** (`oklch(1 0 0 / 10%)`) instead of a solid gray — a signature Vercel/shadcn move for luminous dark interfaces.

### Type
- **Geist Variable** is the single family for sans. `--font-heading` aliases `--font-sans` — there is no display face, no serif. Geist Mono for code blocks and key IDs.
- **Weights in use:** 400 (body), 500 (labels, card titles, table headers, nav items), 600 (page titles, H1). No 700, no 800.
- **Scale (observed in code):** `text-xs` (12px) for secondary metadata, `text-sm` (14px) for body + labels + descriptions (the dominant size), `text-base` (16px) for card titles, `text-2xl` (24px) semibold for page titles, `text-3xl` (30px) bold only on the Login hero.
- **Tracking:** `tracking-tight` (`-0.01em`) on `h1` titles. No wide letterspacing anywhere.
- **Line height:** `leading-snug` on card titles, default 1.5 elsewhere.

### Spacing & density
- **4px grid** (Tailwind default). Most interior paddings are `px-2`/`px-2.5` on controls, `p-4` on card bodies, `p-6` on page content wrappers. Vertical stacks use `space-y-4` or `space-y-6`.
- **Control heights:** `h-6` (xs), `h-7` (sm), `h-8` (default), `h-9` (lg). The header sits at `h-12`. Buttons are genuinely small — this is an info-dense admin UI, not a consumer app.
- **Table rows** are comfortable, not airy — `h-10` on `TableHead`, `p-2` on `TableCell`.

### Backgrounds
- **Flat white / flat near-black.** No gradients anywhere. No texture, no noise, no hand-drawn illustration, no hero imagery. The UI is entirely type + controls + tables on solid backgrounds.
- **Occasional muted wash** (`bg-muted/50`) for table footers and code blocks — that's the extent of "background variation".

### Borders & separators
- **1px solid `--border`** (a neutral ~0.922 luminance in light, 10% white in dark). This is the dominant structural element — cards, inputs, table rows, sidebar edge, header bottom — all just 1px borders.
- **Card outline** uses `ring-1 ring-foreground/10` (a translucent hairline ring) rather than a solid `border`, giving cards a slightly softer edge than inputs.
- **`Separator`** (Radix primitive) for inline dividers — `h-4` vertical separator between the sidebar trigger and the page label in the header.

### Shadows
- **Almost none.** The one explicit shadow usage is `shadow-sm` on the active tab pill in default tabs. No card shadows. No button shadows. Elevation is expressed by 1px borders and `ring-1` outlines, not drop shadows.

### Corner radii
- `--radius: 10px` is the base. Scale runs `radius-sm` (6px) → `radius-md` (8px) → `radius-lg` (10px, default) → `radius-xl` (14px, cards) → `radius-4xl` (26px, badges/pills).
- Buttons: `rounded-lg` (10px) default, `rounded-[min(var(--radius-md),10px)]` on xs/sm — clamped so they never get too round.
- Badges: `rounded-4xl` (26px) — full capsule.
- Inputs: `rounded-lg`.
- Cards: `rounded-xl` (14px).
- Avatars: `rounded-full`.

### Hover / press / focus
- **Hover:** subtle bg shifts only. Buttons go to `bg-primary/80`, `bg-secondary/80`, `bg-muted`, `bg-destructive/20`. Links use `underline` on hover. No color inversions, no glow.
- **Active (press):** `active:not-aria-[haspopup]:translate-y-px` — a 1px downward nudge on press. This is the only "affordance animation" in the system.
- **Focus:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` — a 3px translucent ring at the focus color. Same pattern for every interactive element (buttons, inputs, badges, tabs).
- **Invalid state:** `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20` — identical mechanic, destructive red.
- **Disabled:** `disabled:pointer-events-none disabled:opacity-50` — universal.

### Animation
- **Minimal.** `tw-animate-css` is imported but hardly used. The only bespoke motion is the ThemeToggle's sun/moon rotate-scale swap (`rotate-90 scale-0` → `rotate-0 scale-100`). Sidebar/sheet use Radix's default slide transitions.
- **Transitions:** `transition-all` on buttons/badges (covers bg + border + ring); `transition-colors` on inputs.
- **Easing:** default (Tailwind's `ease`). No bounces, no spring, no staggered reveals.

### Transparency & blur
- Dark-mode borders use **alpha** (`oklch(1 0 0 / 10%)`) instead of solid colors — this is the only place transparency is semantic.
- Dark-mode inputs use `dark:bg-input/30` (semi-transparent fill over the dark bg).
- **No backdrop-blur.** Dialogs use a solid dim overlay; no frosted glass.

### Cards — the definitive recipe
```
rounded-xl                      ← 14px corners
bg-card                         ← white (light) / near-black (dark)
ring-1 ring-foreground/10       ← hairline outline, NOT a border
py-4                            ← 16px vertical padding (12px at size="sm")
text-sm text-card-foreground    ← body text inside
overflow-hidden                 ← clips header/footer backgrounds

CardHeader:  px-4, gap-1, font-medium text-base title
CardContent: px-4
CardFooter:  border-t bg-muted/50 p-4   ← the only "accent surface" motif
```

### Layout rules
- **App shell is sticky sidebar + scrollable main.** Sidebar width is controlled by the shadcn `sidebar` primitive (~16rem). Header is `h-12` sticky inside the main column.
- **Page content is `p-6` or `px-6 pt-6`.** PageHeader lives outside the padded container and has its own `px-6 pt-6` + trailing `Separator`.
- **Max-width on forms:** inputs inside a toolbar use `max-w-xs` / `max-w-sm` — forms never stretch edge-to-edge.
- **Action toolbars use `flex gap-2 flex-wrap`** — never a right-aligned floating submit.

## Iconography

- **Library:** [Lucide React](https://lucide.dev) — explicitly configured in `components.json` (`iconLibrary: "lucide"`). Already a dependency (`lucide-react@^1.8.0`).
- **Stroke-based, 1.5px stroke weight, rounded line caps.** Outline style, not filled.
- **Sizes:** `size-4` (16px) inline in text / in buttons. `size-3` (12px) inside badges. `size-5` (20px) rarely.
- **Icons-in-use (verified from code):**
  - `Home`, `Users`, `Shield`, `Key`, `Settings`, `User`, `Lock` — sidebar navigation (one icon per page)
  - `LogOut`, `User` — user menu
  - `Sun`, `Moon` — theme toggle (swap animation)
- **No icon fonts. No SVG sprite. No emoji.** Lucide is imported per-icon as React components.
- **Never-used:** illustration, spot images, 3D icons, duotone, emoji-as-icon.
- **Placement:** icons always live *to the left* of text in a button or menu item (`<item.icon /> <span>{label}</span>`). Never right-aligned except for chevrons in selects/dropdowns (Radix-provided).
- **Logo/wordmark:** the app has **no logo**. The sidebar header literally renders the text `Descope Starter` as a heavyweight string. For the design system we provide a wordmark placeholder; a real logo should be supplied by brand.

All Lucide icons are linked from CDN in preview/kit files (`https://unpkg.com/lucide-static@latest/icons/{name}.svg`) rather than copied — this matches how the codebase treats them (as a dependency, not a local asset).

## Preview cards

21 specimen cards live in `preview/` and are registered into the Design System tab under five groups: **Colors** (neutrals-light, neutrals-dark, semantic, chart), **Type** (Geist fonts, scale, in-use), **Spacing** (radii, scale, borders, states), **Components** (buttons, badges, inputs, card, table, tabs/misc, alert, menus), and **Brand** (iconography, wordmark).

## Caveats & flags

- **Font substitution:** Geist Variable is loaded from jsDelivr's `@fontsource-variable/geist` CDN to match the package the codebase depends on. No local `.ttf` is copied. If offline use matters, download the Geist woff2 files and drop them in `fonts/`.
- **No logo provided.** The only "brand" in the codebase is the literal string `Descope Starter` / `Descope SaaS Starter`. The design system uses a text-mark placeholder.
- **Dark-mode sidebar active color (`oklch(0.488 0.243 264.376)` blue-violet) is the only non-neutral chromatic accent** outside `destructive`. It appears only in one token, only in dark mode — flag this if the team wants a consistent accent across light mode too.
- **No marketing / landing surface exists in the codebase** — there are no Hero components, no pricing tables, no illustrated sections. If those are needed, this system covers tokens/type but not motifs.
