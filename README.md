# Ordre

Purchase orders, approvals, and invoice reconciliation for small teams.

This repo holds the React + TypeScript + Firebase implementation. The original
HTML/CSS/JS prototype lives under `reference/` as a design reference until
every screen is ported.

For the full working contract (conventions, design system, icon pipeline,
Firebase patterns, i18n), see [AGENTS.md](./AGENTS.md).

## Quick start

```bash
npm install
npm run icons:build   # one-time: turn Bootsy SVGs into typed React components
npm run dev
```

Open http://localhost:5173.

The repo ships with a populated `.env.local` pointing at the `ordre-app-41c95`
Firebase project. For a fresh Firebase project, copy `.env.example` instead.

## Scripts

- `npm run dev` — Vite dev server with hot reload.
- `npm run build` — type-check then Vite production build.
- `npm run preview` — serve `dist/`.
- `npm run type-check` — `tsc -b --noEmit`.
- `npm run icons:build` — regenerate typed icon components from
  `~/Downloads/Bootsy Duotone/SVG/All icons/` into `src/icons/generated/`.
- `npm run seed` — seed Firestore with Studio Verdera sample data (needs
  `firebase-admin-key.json` and `SEED_OWNER_UID`).

## Stack highlights

- **Design system**: monochrome, light + dark mode via CSS variable flip.
- **i18n**: Catalan (default), Spanish, English.
- **Auth**: Google Sign-In via Firebase Auth.
- **Data**: Firestore — workspaces → suppliers / purchaseOrders → invoices / approvals.
- **Icons**: 37 Bootsy Duotone glyphs vendored + transformed to JSX.
