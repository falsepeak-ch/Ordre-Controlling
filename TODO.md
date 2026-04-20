# TODO

Remaining work for Ordre. Ordered by impact.

---

## Bugs / Data Issues

- **Invoice data in list views is stale** — `useProjectData` reads `raw.invoices ?? []` from the PO document root, but invoices are stored in a subcollection and never written back to the root field. Only the `usePurchaseOrder` hook (single-PO detail view) correctly subscribes to the subcollection. Dashboard metrics and the PO list page rely on this stale array, so they will show `0` for invoiced amounts. Fix: either denormalize invoice totals back onto the PO document on every invoice write (in `createInvoice`/`updateInvoice`/`deleteInvoice`), or query the subcollection directly in `useProjectData`.

- **Same issue applies to `approvals`** — `useProjectData` reads `raw.approvals ?? []` from the PO root document field, which may not match the subcollection data.

- **Invoice file replacement not supported** — `updateInvoice` in `src/lib/invoices.ts` does not support swapping the attached file. The workaround is to delete and recreate the invoice. The function should delete the old Storage file and upload the new one in a single operation.

---

## Dashboard Stubs

- **"Recent activity" panel** — Shows a "coming next" placeholder. Should display a chronological feed of recent PO events (created, submitted, approved, rejected, closed, invoice uploaded) across the project.

- **"Approvals waiting on you" panel** — Shows an empty-state message. Should mirror the ApprovalsQueuePage filtered to the current user's pending decisions, limited to 3–5 items with a "See all" link.

---

## Missing Features

### Invoices
- **Payment status** — There is no concept of a paid vs. unpaid invoice. Add an optional `paidAt` field to the `Invoice` type and a "Mark as paid" action on the PO detail page.
- **Invoice-level download from Invoices page** — The Invoices list page links to the parent PO but does not expose a direct file download link. Add a download icon column.
- **Overdue tracking** — Invoices have a `dueDate` field but nothing surfaces overdue invoices anywhere. The Invoices page could highlight rows where `dueDate < today` and status is unpaid.

### Approvals
- **Approval reminders** — No Cloud Function sends a reminder when a PO has been waiting for approval beyond a configurable threshold (e.g., 3 days). Add a scheduled function.
- **Approval delegation** — No way to reassign or escalate a pending approval to another user.
- **Multi-step approvals** — Currently any approver can unilaterally approve. No support for requiring N-of-M approvals.

### Email Notifications
- Only `sendProjectInvite` Cloud Function exists. Missing:
  - Notify all approvers when a PO is submitted for approval.
  - Notify the PO creator when their PO is approved/rejected.
  - Notify the submitter when a PO is closed.

### Reports
- **Export to CSV/PDF** — The Reports page has charts but no way to export data.
- **Budget vs. actuals** — No concept of a project budget cap. Adding a project-level budget would enable a "budget remaining" KPI and progress bar on the dashboard.
- **Committed-over-time by status** — The "Spend over time" chart currently plots committed (by PO creation date) and invoiced (by invoice issue date). A future improvement would add filtering by PO status transitions.

### Suppliers
- **Supplier contact portal** — Suppliers receive no direct communication. A future "portal" mode could let suppliers upload invoices themselves.
- **Supplier performance metrics** — No view of on-time payment rate, average invoice amount, or open PO count per supplier (data is available, just not surfaced).

### Bulk Operations
- No bulk actions on the PO list (e.g., bulk export, bulk close).
- No bulk invoice import.

### Settings / Admin
- **Audit log** — No tamper-evident log of who changed what and when. The `approvals` subcollection records approval decisions but nothing tracks PO edits, line deletions, or invoice uploads.
- **Project currency** — Hardcoded to EUR. The `Project.currency` field exists but the rest of the codebase assumes EUR everywhere.

---

## Code Quality / Cleanup

- **`formatFileSize` duplication** — Identical function defined in both `src/lib/invoices.ts` and `src/lib/attachments.ts`. Consolidate onto `attachments.ts` and remove the copy from `invoices.ts`.

- **`src/components/ui/FileDropzone.tsx`** imports `formatFileSize` from `~/lib/invoices` — update this import after deduplication above.

- **`PODecisionModal` duplicates invoice form UI** — The "Approve with bill" modal (`src/components/PODecisionModal.tsx`) re-implements a subset of `InvoiceFormModal`. Consider extracting a shared `InvoiceFields` component.

- **`useProjectData` loads both suppliers and POs** — These are two independent subscriptions bundled into one hook. If a page only needs POs (e.g., ApprovalsQueuePage), it still pays for a suppliers subscription. Consider splitting into `usePurchaseOrders` and keeping `useProjectData` as a convenience wrapper.
