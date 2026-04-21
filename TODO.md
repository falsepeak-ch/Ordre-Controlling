# TODO

Remaining work for Ordre. Most of the original list shipped in the April 2026
production-readiness push (see `git log` and the plan file for details). What
remains below is either deferred to a follow-up or intentionally out-of-scope
until we validate demand.

---

## Deferred, not blocking launch

### Billing

- **Stripe self-serve billing.** The client + server framing is in place
  (`VITE_BILLING_ENABLED` flag, `UpgradeModal` copy switches between beta and
  checkout states, `users/{uid}.subscriptionStatus` read by
  `SubscriptionContext`). What's missing: a Cloud Function `createCheckoutSession`,
  a `stripeWebhook` HTTP endpoint that updates `users/{uid}` on Stripe events,
  a `redirectToPortal` callable, and the Stripe price IDs wired through
  `functions/.secret.local`. Until then, Pro is granted via
  `npm run grant-pro -- <uid>`.

### Approvals

- **Approval reminders.** Scheduled Cloud Function that pings approvers when a
  PO has been pending beyond N days (default 3). Needs `onSchedule` trigger +
  email template.
- **Multi-step / N-of-M approvals.** Any owner-or-approver can unilaterally
  close out a PO today. Larger teams will want "two approvers required" or a
  fixed sequence.
- **Approval delegation** (reassign pending approvals to a backup).

### Email notifications (Cloud Functions)

- On PO submitted → notify owners + approvers.
- On PO approved / rejected → notify the submitter.
- On PO closed → notify the submitter.
  Template infrastructure already exists under
  `functions/src/templates/inviteEmail.ts`; each new notification needs its own
  template + onCreate trigger.

### Reports

- **CSV / PDF export** on [ReportsPage](src/pages/ReportsPage).
- **Budget vs. actuals.** Add a project-level `budgetBytes` / `budgetAmount`
  and surface "budget remaining" KPIs + a progress bar on the dashboard.
- **Filterable committed-over-time.** The spend-over-time chart uses PO
  creation date; a status-transition variant would be more useful for
  planning.

### Suppliers

- **Supplier self-service portal.** Suppliers upload their own invoices —
  needs per-supplier auth token + a separate public route.
- **Supplier performance metrics** (on-time payment rate, average invoice
  amount, open PO count). Data is there; we just don't render it.

### Bulk operations

- Bulk PO export / close on [PurchaseOrdersPage](src/pages/PurchaseOrdersPage).
- Bulk invoice import.

### Settings / admin

- **Audit log.** The `approvals` subcollection captures approval decisions,
  but PO edits, line deletes, and invoice uploads aren't logged in a
  tamper-evident way. Add a project-level `audit/` subcollection, append-only,
  written from every mutation helper.
- **Project currency.** `Project.currency` exists but [format.ts](src/lib/format.ts)
  still hardcodes EUR in `eur` / `eurFull`. Thread project currency through
  the formatters.

---

## Code quality / cleanup (non-blocking)

- **`useApprovalsQueue` opens N subscriptions.** One
  [per-PO approvals listener](src/hooks/useApprovalsQueue.ts:91); with 200
  POs that's 200 live listeners. Collapse to a single
  `collectionGroup('approvals')` + `where('projectId','==',projectId)` query.
  Requires denormalising `projectId` onto each approval doc + a
  collectionGroup index.
- **`PODecisionModal` duplicates invoice form UI.** The "Approve with bill"
  modal re-implements a subset of `InvoiceFormModal`. Extract a shared
  `InvoiceFields` component.
- **Split `useProjectData`.** Currently bundles suppliers + POs + invoices +
  approvals; pages that only need one pay for all. Carve out `usePurchaseOrders`,
  `useSuppliersOnly`, etc., and keep `useProjectData` as the convenience
  wrapper.
- **Pagination.** `useProjectData`, the PO list, and the invoices list all
  fetch everything. Fine at 50 POs, wasteful at 5000. Add `limit()` + "Show
  more" cursors once we have data to warrant it.

---

## Delivered in the April 2026 push (for reference)

- P0 data correctness: subcollection-aware `useProjectData`, `approveWithBill`
  auto-close uses the real invoiced total, `nextPONumber` race-free via
  transaction, locale-aware formatters.
- Firebase App Check (reCAPTCHA v3) initialised client-side and enforced on
  `sendProjectInvite` + `createProject`.
- Free-tier quotas: server-enforced max-1-project (via `createProject`
  callable), per-project storage cap (300 MB free / 10 GB Pro) maintained by
  `onStorageObjectFinalized` / `onStorageObjectDeleted` triggers, enforced
  in Storage rules, surfaced in Project Settings.
- Landing-page redesign + full SEO/ASO infrastructure: 10 sections
  (hero → social proof → contrast → how-it-works → features → testimonials →
  pricing → FAQ → CTA), meta / OG / Twitter / JSON-LD, robots, sitemap,
  manifest, hreflang, hosting cache headers, 43 MB hero asset replaced by a
  CSS gradient. Terms + Privacy pages. Footer links.
- Global React error boundary → PostHog exception capture (replaces the
  short-lived Sentry wiring). ConfirmModal replaces every `window.confirm`
  (11 call sites). `useNavigate` replaces in-app `window.location.href`.
- Analytics stack: Firebase Analytics + PostHog (EU cloud), both consent-gated
  via a monochrome cookie banner (`ConsentContext`, `ConsentBanner`). Banner
  is re-openable from the footer and the Privacy page; decisions persist to
  `localStorage`.
- Ops: ESLint installed + configured, GitHub Actions CI (`type-check` +
  `lint` + `build` for both web and functions), invite rate-limit
  (10 / uid / hour), functions `lint` dead-script cleanup.
- Invoice paid status (`paidAt`, "Mark as paid" on PO detail, overdue
  highlighting in the invoices list). Invoice file replacement in
  `updateInvoice`.
- Dashboard "Recent activity" feed + "Approvals waiting on you" queue
  synthesised from PO events.
- `formatFileSize` deduped, 4-role model documented in AGENTS.md, storage
  rules now whitelist content types (PDF / image / text), `as never` cast
  removed.
- Deployed to Firebase: Firestore + Storage rules, four Cloud Functions
  (`createProject`, `sendProjectInvite`, `onStorageObjectFinalized`,
  `onStorageObjectDeleted`), and the web bundle to
  <https://ordre-app-41c95.web.app>. Artifact cleanup policy (1-day
  retention) set for both function regions (us-east1 + europe-west1).
- Cloud Functions upgraded to **Node.js 22** (ahead of Node 20's
  2026-04-30 deprecation) and **`firebase-functions@^7.2.5`**
  (from `^6.0.1`). Pin lives in `firebase.json#functions[].runtime` +
  `functions/package.json#engines.node`; CI bumped to match.
