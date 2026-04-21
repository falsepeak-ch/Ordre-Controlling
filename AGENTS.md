# AGENTS.md — Ordre

Working contract for anyone (human or AI) touching this codebase. Read before editing.

---

## What Ordre is

A procurement / purchase-order management app for small teams — audiovisual
production studios and small offices first. It covers the full loop:

**Supplier → PO (with line items) → Approval → Invoice → Reconciled remainder per line.**

The product is deliberately monochrome, opinionated, and small in surface area.
Resist feature creep into "mini-accounting tool" territory — the repo has a
`reference/` directory with the original spec and a static-HTML prototype to
refer to, not to reintroduce.

For production deploys, post-deploy verification, and the operating
playbook see [LAUNCH.md](LAUNCH.md).

---

## Stack

| Area | Choice |
|---|---|
| Build | Vite 5 + React 18 + TypeScript 5 (`strict: true`) |
| Routing | React Router DOM 6 (`createBrowserRouter`) |
| Auth & data | Firebase v10 (Auth with Google Sign-In, Firestore native, Analytics behind consent) |
| Cloud Functions | `firebase-functions` v7 on Node.js 22 (Gen 2). Runtime pinned in `firebase.json`; `engines.node` in `functions/package.json` must match. |
| i18n | `i18next` + `react-i18next` — Catalan default, Spanish, English |
| Styling | Plain CSS modules per component + CSS custom properties. **No Tailwind, no CSS-in-JS.** |
| Fonts | Google Fonts: Cal Sans (display), Inter (body), JetBrains Mono (code) |
| Icons | Bootsy Duotone SVGs, vendored + transformed into typed React components |

---

## Commands

```bash
npm install           # deps
npm run icons:build   # (re)generate src/icons/generated/*.tsx from the Bootsy archive
npm run dev           # http://localhost:5173
npm run build         # tsc -b && vite build
npm run preview       # serve dist/
npm run type-check    # tsc -b --noEmit
npm run seed          # seed Firestore with Studio Verdera data (requires admin key)
```

First-run checklist for a fresh clone:

1. Copy `.env.example` → `.env.local` (or use the pre-filled `.env.local` for this project).
2. `npm install`
3. `npm run icons:build` — otherwise the `<Icon />` component will render nothing.
4. Enable Google Sign-In in the Firebase console (`ordre-app-41c95`), add `localhost` to Authorized domains.
5. Create the Firestore database in Native mode (EU region).
6. Deploy the rules: `firebase deploy --only firestore:rules`.
7. (Optional) download an admin service-account JSON → `./firebase-admin-key.json`, set `SEED_OWNER_UID` in `.env.local`, then `npm run seed`.

---

## Folder conventions

```
src/
  main.tsx, App.tsx, routes.tsx       # entry + router
  theme/                              # tokens.css (light + dark), reset, base
  lib/                                # framework-agnostic helpers
    firebase.ts                       # init; exports auth, db, analytics
    auth.ts                           # signInWithGoogle, signOut, onAuthChange
    firestore.ts                      # typed collection/doc references
    format.ts                         # eur, eurFull, relDate, formatDate, …
    reconcile.ts                      # lineCommitted, lineInvoiced, poTotals, workspaceMetrics
  types/                              # shared TS types (Workspace, PurchaseOrder, …)
  contexts/                           # React context providers (Auth, Theme, Toast)
  hooks/                              # tiny hooks wrapping each context
  components/
    ui/                               # primitives — Button, Card, Pill, Icon, …
    layout/                           # PublicLayout, AppShell, Sidebar, Topbar
    RequireAuth.tsx                   # route guard
  pages/                              # one file per route
  icons/
    manifest.ts                       # ICON_NAMES — single source of truth
    source/                           # vendored raw SVGs (copied from Bootsy archive)
    generated/                        # auto-built typed React components — do not edit
    index.ts                          # auto-built name → component map
  i18n/
    index.ts                          # init + setLocale
    locales/{ca,es,en}.json           # translation strings

scripts/
  process-icons.mjs                   # icon build pipeline
  seed-firestore.mjs                  # one-shot Firestore seed

reference/                            # original HTML/CSS/JS prototype — read-only reference
```

---

## Design system rules

1. **Everything flows from `src/theme/tokens.css`.** If you catch yourself writing
   a hex value in a component CSS file, stop and add (or reuse) a semantic token.
2. Light/dark mode is a CSS-variable flip keyed off `[data-theme="dark"]` on
   `<html>`. Components never branch on `theme` in JS; they use the variables.
3. Typography:
   - Cal Sans for display (headings 24px+). `display-hero`, `display-xl`, …
     helper classes are in `base.css`.
   - Inter for body, weights 300–700.
   - JetBrains Mono for numbers and PO numbers.
   - Below 24px, Cal Sans cramps — add `letter-spacing: 0.2px` (already on
     `.display-sm`, `.display-xs`).
4. **Shadow borders over CSS borders.** `box-shadow: 0 0 0 1px var(--ring-border)`
   containment gives a hairline without affecting layout. See `--elevation-1`
   and `--elevation-2` for the composited patterns.
5. **Grayscale only.** The sole non-grayscale colours are the link blue and
   Google's brand colours in `GoogleMark`. If you're reaching for a brand
   colour, push back on the design instead.
6. Spacing: use `--s-1`..`--s-9`, `--s-section`. Generous section spacing is
   core to the monochrome aesthetic — don't compress to save space.

---

## Icons

Every icon in the UI goes through `<Icon name="…" />`:

```tsx
import { Icon } from '~/components/ui/Icon';
<Icon name="receipt-fill" size={16} />
```

The `name` prop is typed to `IconName` — unknown names fail at compile time.

**To add an icon:**

1. Find the filename in `reference/…` (the Bootsy archive is at `~/Downloads/Bootsy Duotone/SVG/All icons/`).
2. Add the bare name (no `.svg`) to `ICON_NAMES` in `src/icons/manifest.ts`.
3. Run `npm run icons:build`.

The script transforms `fill="black"` → `fill="currentColor"` so icons follow
the current text colour, which makes them automatically work in both themes.
Do not hand-edit anything under `src/icons/generated/` — it's overwritten on
every build.

---

## i18n

The user-facing locale is Catalan by default, Spanish and English supported.
All user-visible strings come from `src/i18n/locales/*.json` via
`useTranslation()`:

```tsx
const { t } = useTranslation();
<h1>{t('landing.heroTitle')}</h1>
```

**Never hardcode strings** — even placeholders. If the string isn't worth a
translation key, it's probably not worth showing to the user. When adding a
new string:

1. Add it to `ca.json` (source of truth, pick good Catalan).
2. Translate to `es.json` and `en.json`.
3. Reference it via `t('namespace.key')`.

Date and currency formatting live in `src/lib/format.ts` and use
`Intl.NumberFormat('ca-ES', ...)` — they already produce locale-appropriate
output for Catalan/Spanish readers.

---

## Firebase patterns

- `src/lib/firebase.ts` is the only place that calls `initializeApp`, `getAuth`,
  `getFirestore`. Every other module imports `auth` and `db` from there.
- Firestore access goes through typed helpers in `src/lib/firestore.ts` —
  `suppliersCol(wsId)`, `purchaseOrdersCol(wsId)`, etc. Don't call
  `collection(db, '…')` ad-hoc in components.
- Auth-gate every app route with `<RequireAuth>` (already wired in `routes.tsx`).
- Security rules live in `firestore.rules` — keep them workspace-scoped.
  Workspace membership is the primary permission gate for v1.

### App Check

The client attaches an App Check token (reCAPTCHA v3) to every request to
Firestore, Storage, and Cloud Functions. Enforcement is on in the console
for all three services, so requests without a valid token are rejected.

Prod setup (status: reCAPTCHA v3 site key registered, enforcement still
manual — see [LAUNCH.md](LAUNCH.md#2a-app-check-enforcement--still-manual)):
1. In the Firebase console → App Check → Apps → Web, register the domain
   and pick **reCAPTCHA v3**. Copy the site key.
2. Put the site key in `.env.local` as `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
3. Under App Check → APIs, flip **Enforce** on for each service.

Local-dev debug tokens:
- Set `VITE_APP_CHECK_DEBUG=true` in `.env.local` on a fresh run, open
  the browser console, and copy the printed debug token.
- Paste it into Firebase console → App Check → Apps → Manage debug tokens.
- After the token is registered, switch to `VITE_APP_CHECK_DEBUG_TOKEN=<paste>`
  so the same value is reused across reloads.

Callable functions that need enforcement set `enforceAppCheck: true` in
their `onCall` options — see `sendProjectInvite` for the pattern. The
function also guards with `if (!req.app)` so a mis-configured deploy
(enforcement off in code) still fails closed.

---

## Analytics, error tracking, cookie consent

Single source of truth: [src/lib/analytics.ts](src/lib/analytics.ts). It runs
two providers side-by-side:

- **Firebase Analytics (GA4)** — product funnels and marketing. Measurement ID
  comes from `VITE_FIREBASE_MEASUREMENT_ID`.
- **PostHog (EU cloud)** — session-level product analytics + **exception
  autocapture** (this is what replaced Sentry; Firebase Crashlytics doesn't
  support web). Set `VITE_POSTHOG_KEY`, and optionally
  `VITE_POSTHOG_HOST` (defaults to `https://eu.i.posthog.com`).

Both are **off until the user opts in**. Consent lives in
[src/contexts/ConsentContext.tsx](src/contexts/ConsentContext.tsx); the banner
renders from [src/components/ConsentBanner.tsx](src/components/ConsentBanner.tsx)
with Accept all / Reject / Customise. Decisions persist to `localStorage`
under `ordre.consent.v1` and a `CustomEvent('ordre:consent')` fires on every
change so `analytics.ts` can flip the SDKs via
`opt_in_capturing()` / `opt_out_capturing()`.

Usage:

```ts
import { trackEvent, captureAnalyticsError } from '~/lib/analytics';

trackEvent('po_submitted', { poId: po.id, supplierId: po.supplierId });
captureAnalyticsError(err, { where: 'approveWithBill' });
```

Error capture is safe to call even when consent is declined — it falls
through to `console.error`. Never log PII (email, names, project content)
as event properties; rely on the identity attached to the PostHog session.

---

## Conventions

- Component files: PascalCase, one per file. Named exports, not default
  (exception: page files that are lazy-loaded in the future).
- Hooks: `useSomething.ts`, named export.
- CSS: colocated — `Button.tsx` + `Button.css` in the same folder. Imported at
  the top of the `.tsx` file.
- Class names: kebab-case, component-prefixed (`.sidebar-item`, `.btn-primary`).
- No inline styles unless they're computed values (progress widths, dynamic colours).
- `void` a promise you don't want to await: `void i18n.changeLanguage(code)`.

**Comments:** default to writing none. Only add one when the *why* is non-obvious.
Don't describe *what* the code does — identifiers already do that.

---

## Don'ts

- ❌ Tailwind, styled-components, emotion, CSS modules.
- ❌ Brand colours, gradients (except the subtle avatar gradient), drop-shadow glows.
- ❌ Hardcoded strings in UI.
- ❌ Hardcoded colours in component CSS — use tokens.
- ❌ Cal Sans for body text or anything below 16px without +0.2px tracking.
- ❌ Editing `src/icons/generated/*` or `src/icons/index.ts` — regenerated by the script.
- ❌ Dropping React Strict Mode to silence a warning — fix the warning.
- ❌ `any` — if you need an escape hatch, use `unknown` and narrow, or type it properly.
- ❌ Emojis in UI.
- ❌ Top-level `getFirestore()` calls in components — always import `db`.

---

## Projects & roles

Top-level domain unit is a **Project** at `/projects/{projectId}` — a user
can be a member of many projects. Each member has one of four roles:

| Role | Read | Edit content (POs, suppliers…) | Approve POs | Manage members |
|---|---|---|---|---|
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `editor` | ✓ | ✓ | — | — |
| `approver` | ✓ | — | ✓ | — |
| `viewer` | ✓ | — | — | — |

Role helpers live in [src/lib/roles.ts](src/lib/roles.ts):
`canEdit(role)`, `canManage(role)`, `canApprove(role)`, `isMember(role)`,
`hasRoleAtLeast(role, atLeast)`.

Rules enforcement uses the same four roles — see `canWriteProject`,
`canApproveProject`, `isProjectOwner`, `isProjectMember` in
[firestore.rules](firestore.rules).

Membership lives on the project doc itself:
- `members`: `Record<uid, Role>` — the source of truth for the security rules.
- `memberEmails`: `Record<uid, string>` — normalised, used for UI.
- `memberProfiles`: `Record<uid, { displayName, email, photoURL }>` — cached
  for fast rendering (avoids an N+1 fetch against `/users/{uid}`).

When an owner updates the project's non-member content (name, description,
etc.) the rule asserts the members map is unchanged. Member changes are
owner-only. See [firestore.rules](firestore.rules) for the exact predicates.

## Routing

```
/                            → LandingPage                 (public)
/login, /signup              → auth pages                  (public)
/app                         → ProjectsListPage            (auth)
/app/p/:projectId            → ProjectShell                (auth + member)
  /                          → DashboardPage
  /members                   → MembersPage
```

`ProjectShell` loads the project via [src/hooks/useProject.ts](src/hooks/useProject.ts),
asserts the user is a member, and exposes the `{ project, role }` tuple via
`useCurrentProject()` for every page inside it. If the user isn't a member —
whether the project exists or not — the shell renders the "Project unavailable"
screen. All inner routes can safely assume `useCurrentProject()` returns a
valid membership.

## Current state (iteration 3)

Shipped:
- Vite + React + TS scaffold, light + dark design tokens, Google Fonts.
- Firebase Auth (Google Sign-In) + Firestore + Analytics in prod only.
- Bootsy Duotone icon pipeline + typed `<Icon />` component.
- i18n with Catalan (default), Spanish, English.
- Landing, Login, Signup — public marketing + auth.
- **Projects list** (`/app`) with empty state, grouped by role, real-time via
  `onSnapshot`.
- **Create Project** modal — writes directly to `/projects/{id}`, sets the
  creator as owner, updates `users/{uid}.defaultProjectId`.
- **ProjectShell** + **ProjectSwitcher** — scoped sidebar, switcher dropdown
  listing all projects the user belongs to with role pills.
- **Dashboard** (`/app/p/:id`) — metric cards driven by
  [projectMetrics](src/lib/reconcile.ts), empty states when the project has
  no POs, role-aware CTAs.
- **Members** (`/app/p/:id/members`) — add by email (existing Ordre users),
  change roles, remove members. Owner-only writes.
- Security rules updated for the three-role model. Workspace → Project
  rename applied everywhere (types, firestore helpers, seed script, user
  profile's `defaultProjectId`).

Next iteration:
- Port the Purchase Orders list + PO Detail reconciliation view + New PO
  flow from the `reference/` prototype to Firestore-backed React pages.
- Suppliers directory.
- Approvals queue.
- File upload (Firebase Storage) for invoice PDFs.
- Notifications (email + in-app).
- Pending invites for users not yet on Ordre (token-based).
