# saas-app UI Kit

Interactive recreation of the **identity-stack** admin app. Clickable between screens; state persisted in localStorage so refresh doesn't lose your place.

## Files

- `index.html` — full app shell. Start here.
- `kit.css` — pure-CSS version of the shadcn/ui primitives (no Tailwind runtime).
- `Primitives.jsx` — Button, Input, Card, Badge, Alert, Table, Tabs, Select, Dropdown, Avatar, Separator, Toaster, Lucide icon set.
- `Shell.jsx` — AppSidebar, Header, PageHeader, TenantSwitcher, ThemeToggle, UserMenu.
- `Pages.jsx` — DashboardPage, MembersPage, AccessKeysPage, RolesPage, ProfilePage, LoginPage.

## Flows

1. Land on **Login** — centered card, single "Sign In" button.
2. Dashboard loads with mock status, tenant, and roles; tab into Claims to see a mocked JWT payload.
3. Use the sidebar to jump to **Members** (invite + enable/disable + remove), **Access Keys** (create, reveal-once secret, revoke, delete), **Roles** (read-only matrix), **Profile** (add/remove custom attributes).
4. Switch tenants via the header dropdown. Toggle dark mode via the sun/moon button. Sign out via the avatar menu.

## Caveats

- Dark mode swaps all tokens via `html.dark` — verify against the real app's dark.
- Sidebar is always expanded (no collapse animation; real app uses Radix collapsible).
- Dialog / Sheet / FGA relation editor are omitted — low-traffic in the codebase.
- All data is local mock state.
