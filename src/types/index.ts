export type Role = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  defaultProjectId: string | null;
  createdAt: string;
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
}

export interface SupplierDocument {
  name: string;
  size: string;
  kind: string;
  url?: string;
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

export type LineCategory = 'shoot' | 'office' | 'travel' | 'services';

export interface POLine {
  id: string;
  description: string;
  category: LineCategory;
  quantity: number;
  unitPrice: number;
}

export type POStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';

export interface Approval {
  id: string;
  approverUid?: string;
  approver: string;
  initials: string;
  role: string;
  decision: 'pending' | 'approved' | 'rejected';
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
