# Procurement & Purchase Order Management App — Specification

**Status:** Draft v0.1
**Source:** Voice note in Catalan, 16 April 2026 (see `transcription.txt`)
**Context cues from the source:** mention of *rodatge* (film shoot) and *despatx* (office), suggesting the initial user is a production / small-business context.

---

## 1. Problem Statement

Small companies and production teams need a lightweight way to track what they are about to spend with a supplier, get it approved by the right people, and then reconcile real invoices against the original commitment. Spreadsheets and email chains lose the thread: nobody knows how much of a purchase order is still unspent, who approved what, or whether the invoice that just arrived matches what was agreed.

The app closes that loop: **Supplier → Purchase Order (with line items) → Approval → Invoice → Automatic remaining-balance calculation per line.**

## 2. Goals

- Give a non-accountant user a fast way to raise a purchase order against a supplier.
- Enforce a configurable approval step before money is committed.
- Let the same user (or a teammate) attach an invoice when it arrives and see in one glance how much of each line item is still available to spend.
- Keep supplier documentation (contracts, certificates, tax info) in one place.

## 3. Non-Goals (v1)

- Full accounting / general ledger integration.
- Payments / bank transfers.
- Tax filings or country-specific fiscal reports.
- Multi-currency FX handling (single currency in v1, EUR by default).
- Inventory / stock management.

## 4. Target Users & Personas

- **Requester** — creates POs, uploads invoices. Usually the person running production or operations.
- **Approver** — designated in the system; reviews and approves/rejects POs. There can be one or several per PO, possibly in sequence.
- **Admin** — manages suppliers, users, approval rules, and cost categories.
- **Viewer (optional)** — read-only access for finance or the boss.

## 5. Core Concepts (Domain Model)

- **Supplier** — the vendor. Has contact info, tax ID, attached documents (contract, certificates).
- **Purchase Order (PO)** — a commitment to spend with a supplier. Has a status (`draft`, `pending_approval`, `approved`, `rejected`, `closed`), a total amount, and N line items.
- **PO Line Item** — what is being bought. Has description, category (e.g. "office furniture", "for the shoot"), quantity, unit price, subtotal.
- **Approval** — who must approve which POs. Rules can be global or scoped (e.g. amount-based thresholds).
- **Invoice** — a bill from the supplier attached to one PO. Has number, date, file attachment (PDF/image), and lines that map back to PO lines.
- **Reconciliation** — the automatic diff between PO committed amounts and invoiced amounts, per line and in total.

## 6. Functional Requirements

### 6.1 Supplier management
- Create, edit, and archive suppliers.
- Fields: legal name, trade name, tax ID, address, contact name, email, phone, payment terms, bank details (optional), notes.
- Attach files to a supplier: contract, certificates, tax forms, W-9 / model 036 equivalents, etc.
- Search and filter suppliers by name, tax ID, tag/category.

### 6.2 Purchase orders
- Create a PO linked to a supplier.
- Add N line items; each line has: description, category, quantity, unit price, total (auto-calculated).
- Attach reference documents (quote, email thread).
- Auto-generate a human-readable PO number (e.g. `PO-2026-0042`).
- Save as draft; submit for approval when ready.
- Edit freely while in `draft`; lock most fields once `pending_approval` or `approved` (edits after approval require re-approval).

### 6.3 Approval workflow
- Admin configures who can approve POs. At least two modes in v1:
  1. **Named approvers** — a list of users who can each approve.
  2. **Amount thresholds** — e.g. up to €500 any manager; >€500 requires the director.
- When a PO is submitted, notify the relevant approvers (email + in-app).
- Approver can **approve**, **reject with comment**, or **request changes**.
- Every decision is logged with timestamp and user (audit trail).
- A PO cannot move to `approved` until all required approvals are in.

### 6.4 Invoice capture & reconciliation
- From an approved PO, upload one or more invoices.
- Invoice fields: supplier invoice number, issue date, due date, total, attached file.
- For each invoice line, the user picks the PO line it belongs to and enters the actual amount.
- System then shows, per PO line: **Committed → Invoiced → Remaining** (`remaining = committed − sum(invoiced on this line)`).
- PO-level totals also show Committed / Invoiced / Remaining.
- When remaining reaches zero (or the user marks it), the PO can be closed.
- Allow over-invoicing with a warning (user must confirm).

### 6.5 Notifications
- Email + in-app for: PO submitted, PO approved, PO rejected, invoice uploaded, line over-spent.
- Per-user preferences for frequency (immediate, daily digest).

### 6.6 Reporting / dashboards (light in v1)
- Per-supplier view: all POs, totals committed vs invoiced.
- Per-user view: my open POs, pending approvals assigned to me.
- Export a PO (and its invoices) to PDF.
- CSV export of POs and invoices for accounting handoff.

### 6.7 Access control
- Role-based: Admin, Requester, Approver, Viewer.
- Everything scoped to a workspace (multi-tenant ready from day 1 even if we only sell single-tenant initially).

## 7. Non-Functional Requirements

- **Platforms:** responsive web app in v1 (usable on mobile browser); native mobile wrapper (iOS/Android) as a v1.1 follow-up using the same backend.
- **Performance:** PO list and reconciliation views render in under 500 ms for workspaces with <5,000 POs.
- **Availability:** 99.5% in v1 (single-region cloud deployment is fine).
- **Security:** HTTPS only, password + TOTP 2FA, encrypted file storage, audit log immutable once written.
- **Localisation:** Catalan, Spanish, English at launch. Date/number formats follow locale.
- **Accessibility:** WCAG 2.1 AA for the web app.
- **Data residency:** EU-region storage by default (GDPR-friendly).

## 8. Proposed Architecture (high level)

- **Frontend:** React + TypeScript, responsive (Tailwind or similar). One codebase targets web + mobile browser. Mobile wrapper via Capacitor or React Native if/when needed.
- **Backend:** REST or tRPC API (Node.js / TypeScript, or Python / Django if team prefers). Background worker for email notifications and PDF generation.
- **Database:** PostgreSQL. Core tables: `users`, `workspaces`, `suppliers`, `supplier_documents`, `purchase_orders`, `po_lines`, `approvals`, `approval_rules`, `invoices`, `invoice_lines`, `audit_log`.
- **File storage:** S3-compatible object store (supplier docs, invoice files).
- **Auth:** email+password, magic link, or SSO (Google) via a standard provider (Clerk/Auth0/Supabase Auth).
- **PDF generation:** server-side renderer (e.g. Puppeteer) for PO and invoice summaries.
- **Email:** transactional provider (Postmark, SES, or Resend).

## 9. Key Data Model (sketch)

```
Supplier(id, workspace_id, legal_name, tax_id, email, phone, address, payment_terms, created_at, archived_at)
SupplierDocument(id, supplier_id, file_url, kind, uploaded_by, uploaded_at)

PurchaseOrder(id, workspace_id, number, supplier_id, status, currency,
              created_by, created_at, submitted_at, approved_at, closed_at, notes)
POLine(id, po_id, description, category, quantity, unit_price, subtotal)

ApprovalRule(id, workspace_id, scope_json)  -- e.g. amount thresholds, category-based
Approval(id, po_id, approver_user_id, decision, comment, decided_at)

Invoice(id, po_id, supplier_invoice_number, issue_date, due_date, total, file_url, uploaded_by)
InvoiceLine(id, invoice_id, po_line_id, description, amount)

AuditLog(id, workspace_id, actor_id, entity_type, entity_id, action, payload_json, created_at)
```

## 10. Key User Flows

1. **Raise a PO.** Requester picks a supplier → adds line items → saves draft → submits for approval.
2. **Approve a PO.** Approver gets notified → opens the PO → approves or rejects with comment. PO moves to `approved` or `rejected`.
3. **Receive an invoice.** Requester opens the approved PO → uploads invoice → maps invoice lines to PO lines → enters real amounts. System shows the new Remaining per line.
4. **Close a PO.** When there is no remaining budget to spend, or the project is finished, user marks PO as `closed`.

## 11. Edge Cases & Decisions to Confirm

- **Partial deliveries / multiple invoices per PO:** supported (each invoice reduces the remaining on the relevant lines).
- **Invoice total doesn't match the sum of mapped lines:** show a warning, let user adjust.
- **Editing a PO after approval:** requires re-approval. Do we keep a version history? (Recommendation: yes, immutable snapshots.)
- **Tax / VAT on lines:** v1 stores amounts as-entered (net or gross, user's choice per PO). A proper tax engine is a v2 topic.
- **Currency:** single currency per workspace in v1. Multi-currency with FX is v2.
- **Attachments size limit:** 25 MB per file, 10 files per entity (reasonable defaults).
- **Who can upload invoices:** Requester and Admin by default. Approvers optionally.

## 12. Open Questions for You

These affect scope and should be confirmed before estimating:

1. Is this for one company (internal tool) or a SaaS product with multiple customers?
2. Rough team size / number of POs per month expected — this influences DB sizing and whether we need proper SSO from day 1.
3. Must the app work **offline on mobile** (e.g. on a shoot with bad connectivity) or is online-only OK?
4. Do invoices need **OCR / auto-extraction** from the PDF, or is manual data entry acceptable in v1?
5. Do you need an integration with an accounting tool (Holded, Quipu, Sage, Xero, QuickBooks) in v1, or is CSV export enough?
6. Are there any regulatory invoicing rules to honour at launch (e.g. Spain's *Veri*factu / Ticket*BAI*)?

## 13. Suggested Milestones

- **M0 — Discovery (1 week):** resolve open questions above, lock the v1 scope, pick the stack.
- **M1 — Foundations (2–3 weeks):** auth, workspaces, users/roles, suppliers CRUD with document attachments.
- **M2 — Purchase orders (3 weeks):** PO creation with line items, drafts, PO numbering, PDF export.
- **M3 — Approvals (2 weeks):** named approvers + amount thresholds, notifications, audit log.
- **M4 — Invoices & reconciliation (3 weeks):** invoice upload, line mapping, remaining calculation, over-invoice warnings.
- **M5 — Polish & launch (2 weeks):** dashboards, CSV export, localisation, accessibility pass, beta with real users.

**Rough total:** ~13 weeks for one full-stack engineer + part-time designer, shorter with a small team. This is a coarse estimate, not a commitment; it depends on the M0 answers.

## 14. Risks

- **Scope creep into "mini-accounting tool."** Stay disciplined: POs and invoice reconciliation, not ledgers.
- **Approval rules complexity.** Start with two simple modes; resist per-customer custom rules until we have real demand.
- **Invoice capture UX.** Mapping invoice lines to PO lines is the feature that will make or break daily use; prototype and user-test it early.
- **Multi-currency / tax pressure from early users.** Expect requests; defer to v2 unless a blocking deal depends on it.
