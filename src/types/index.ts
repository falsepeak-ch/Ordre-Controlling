export type Role = 'owner' | 'editor' | 'approver' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  defaultProjectId: string | null;
  createdAt: string;
  // Stripe subscription fields — written only by Cloud Functions (admin SDK).
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null;
  subscriptionPlan?: 'monthly' | 'annual' | null;
  subscriptionCurrentPeriodEnd?: string | null;
}

export interface Project {
  id: string;
  name: string;
  currency: 'EUR';
  members: Record<string, Role>;
  memberEmails: Record<string, string>;
  memberProfiles?: Record<string, { displayName: string; email: string; photoURL?: string | null }>;
  createdAt: string;
  createdBy: string;
  initial: string;
  description?: string;
  /**
   * When true, the project is archived — UI surfaces a banner and the
   * projects list groups it under a collapsed "Archived" section. Writes
   * aren't hard-blocked so an owner can always reactivate.
   */
  archived?: boolean;
  archivedAt?: string | null;
  /**
   * Cumulative bytes stored under `projects/{id}/...` in Firebase
   * Storage. Maintained by the `onStorageObjectFinalized` /
   * `onStorageObjectDeleted` Cloud Functions; not writable by clients.
   */
  storageBytesUsed?: number;
  /**
   * Hard cap on total bytes. 300 MB on free, 10 GB on Pro. Set on
   * project creation; Cloud Functions update it when the owner's tier
   * changes.
   */
  storageCapBytes?: number;
}

/**
 * A document attached to a supplier — contract, tax certificate,
 * insurance, bank details, etc. Stored as its own document in
 * `projects/{projectId}/suppliers/{supplierId}/docs/{docId}` with the
 * actual file in Firebase Storage at
 * `projects/{projectId}/suppliers/{supplierId}/docs/{docId}/{fileName}`.
 *
 * The legacy `name` / `size` fields at the supplier-doc root (seed data
 * only) are kept as optional for backward compatibility.
 */
export interface SupplierDocument {
  id?: string;
  /** Legacy seed field; prefer `fileName`. */
  name?: string;
  /** Display-friendly size, e.g. "214 KB". */
  size?: string;
  /** Document kind: "Contract" | "Tax" | "Insurance" | "Pricing" | "Other". */
  kind?: string;
  /** Legacy seed field; prefer `fileUrl`. */
  url?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  storagePath?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

/**
 * A supporting document on a PO (quote, email thread, delivery note,
 * etc.). Distinct from Invoice, which has per-line reconciliation.
 * Stored at
 * `projects/{projectId}/purchaseOrders/{poId}/attachments/{attId}` with
 * the file under the same path in Firebase Storage.
 */
export interface POAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  fileUrl: string;
  storagePath: string;
  /** Optional free-form label: "Quote", "Email", etc. */
  kind?: string | null;
  uploadedBy: string;
  uploadedAt?: string;
}

export interface Supplier {
  id: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  notes: string;
  tags: string[];
  createdAt: string;
  monogram: string;
  docs: SupplierDocument[];
}

/**
 * A project-level accounting category — the "code + concept" that a PO
 * rolls up to in the chart of accounts. In film-production accounting
 * this is the account number (e.g. "1201") plus its description
 * (e.g. "EXECUTIVE PRODUCERS").
 */
export interface Category {
  id: string;
  code: string;
  concept: string;
  createdAt?: string;
}

export interface POLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Optional link to a project Category. Denormalised for render-without-fetch. */
  categoryId?: string | null;
  categoryCode?: string | null;
  categoryConcept?: string | null;
}

export type POStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';

/**
 * UI-only status. Stored POs never have `partially_invoiced` or
 * `partially_approved` — both are computed at render time. See
 * `displayPOStatus`.
 */
export type DisplayPOStatus = POStatus | 'partially_invoiced' | 'partially_approved' | 'paid';

/**
 * An append-only approval log entry. Created when an approver records
 * spend against a PO (approve + bill) or rejects it. There is no longer
 * any pre-assigned slot: approvers act on the PO directly, and the
 * history is the full audit trail.
 */
export interface Approval {
  id: string;
  approverUid: string;
  approver: string;
  initials: string;
  role: string;
  decision: 'approved' | 'rejected';
  /** Amount captured on this approval event (for 'approved' only). */
  amount?: number;
  /** Invoice the approval created (for 'approved' only). */
  invoiceId?: string | null;
  comment: string | null;
  decidedAt: string | null;
}

export interface InvoiceLine {
  lineId: string;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  total: number;
  /** Legacy: original filename (seed data). */
  file?: string;
  /** Display-friendly size e.g. "312 KB". */
  fileSize?: string;
  /** Preferred modern field: original filename as uploaded. */
  fileName?: string;
  /** Public download URL from Firebase Storage. */
  fileUrl?: string;
  /** Storage path, kept for deletion. */
  storagePath?: string;
  lines: InvoiceLine[];
  uploadedBy: string;
  uploadedAt?: string;
  /**
   * ISO timestamp of when the invoice was marked paid. `null` or
   * undefined means the invoice is still outstanding.
   */
  paidAt?: string | null;
  /** Who marked the invoice as paid (display name). */
  paidBy?: string | null;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  status: POStatus;
  currency: 'EUR';
  createdBy: string;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  closedAt: string | null;
  notes: string | null;
  lines: POLine[];
  approvals: Approval[];
  invoices: Invoice[];
}

export interface ProjectMetrics {
  committed: number;
  invoiced: number;
  remaining: number;
  pendingApprovals: number;
  open: number;
  supplierCount: number;
  poCount: number;
}
