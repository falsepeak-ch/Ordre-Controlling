/* ==========================================================================
   Purchase-order lifecycle helpers.

   Status transitions:
     draft → pending_approval → closed
                              ↘ rejected

   Approval model (v2):
     Submitting a PO sends it to `pending_approval`. Any owner or
     approver-role member can then record spend by uploading a bill and
     entering an amount. Each approval event appends to the approvals
     log (append-only audit trail) and writes a matching invoice doc.
     The PO stays in `pending_approval` while more spend can land; it
     automatically transitions to `closed` once `invoiced >= committed`.
     Rejection closes the PO with no further bills.
   ========================================================================== */

import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { purchaseOrdersCol, projectDoc } from './firestore';
import { createInvoice } from './invoices';
import type {
  Approval,
  InvoiceLine,
  POLine,
  POStatus,
  PurchaseOrder,
} from '~/types';

export interface NewPODraftInput {
  supplierId: string;
  notes?: string | null;
  lines: POLine[];
}

export interface POAuthor {
  uid: string;
  displayName: string;
  initials: string;
}

// ---------- PO number generation ----------
async function nextPONumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await getDocs(
    query(purchaseOrdersCol(projectId), where('number', '>=', `PO-${year}-`)),
  );
  const max = snap.docs.reduce((acc, d) => {
    const n = d.data().number as string | undefined;
    if (!n) return acc;
    const parts = n.split('-');
    const num = Number(parts[2] ?? 0);
    return Number.isFinite(num) && num > acc ? num : acc;
  }, 0);
  return `PO-${year}-${String(max + 1).padStart(4, '0')}`;
}

export function blankLine(): POLine {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    quantity: 1,
    categoryId: null,
    categoryCode: null,
    categoryConcept: null,
    unitPrice: 0,
  };
}

export function sanitizeLine(line: POLine): POLine {
  return {
    id: line.id,
    description: line.description.trim(),
    quantity: Math.max(0, Math.floor(Number(line.quantity) || 0)),
    unitPrice: Math.max(0, Number(line.unitPrice) || 0),
    categoryId: line.categoryId ?? null,
    categoryCode: line.categoryCode ?? null,
    categoryConcept: line.categoryConcept ?? null,
  };
}

// ---------- Create / update ----------
export async function createDraftPO(
  projectId: string,
  author: POAuthor,
  input: NewPODraftInput,
): Promise<string> {
  if (!input.supplierId) throw new Error('supplier-required');
  const number = await nextPONumber(projectId);
  const ref = await addDoc(purchaseOrdersCol(projectId), {
    number,
    supplierId: input.supplierId,
    status: 'draft' as POStatus,
    currency: 'EUR',
    createdBy: author.displayName,
    createdAt: serverTimestamp(),
    submittedAt: null,
    approvedAt: null,
    closedAt: null,
    notes: (input.notes ?? '').trim(),
    lines: input.lines.map(sanitizeLine),
  } as never);
  return ref.id;
}

export async function updateDraftPO(
  projectId: string,
  poId: string,
  patch: Partial<NewPODraftInput> & { notes?: string | null },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.supplierId !== undefined) payload.supplierId = patch.supplierId;
  if (patch.notes !== undefined) payload.notes = (patch.notes ?? '').trim();
  if (patch.lines !== undefined) payload.lines = patch.lines.map(sanitizeLine);
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(purchaseOrdersCol(projectId), poId), payload);
}

// ---------- Submit for approval ----------
/**
 * Transitions a draft into `pending_approval`. The approval model no
 * longer pre-assigns approver slots — any owner or approver-role
 * member can pick the PO up from the queue. Previous approval-log
 * entries (e.g. after a rejection → re-submit) are wiped.
 */
export async function submitPOForApproval(
  projectId: string,
  po: PurchaseOrder,
): Promise<void> {
  const poRef = doc(purchaseOrdersCol(projectId), po.id);

  const { collection } = await import('firebase/firestore');
  const existing = await getDocs(
    collection(db, 'projects', projectId, 'purchaseOrders', po.id, 'approvals'),
  );

  const batch = writeBatch(db);
  existing.forEach((d) => batch.delete(d.ref));
  batch.update(poRef, {
    status: 'pending_approval',
    submittedAt: serverTimestamp(),
    approvedAt: null,
    closedAt: null,
  });
  await batch.commit();
}

// ---------- Approve with bill (records spend) ----------
export interface ApproveWithBillInput {
  approverUid: string;
  approverDisplayName: string;
  approverRoleLabel: string;
  invoice: {
    number: string;
    issueDate: string;
    dueDate: string;
    total: number;
    lines: InvoiceLine[];
    file?: File | null;
  };
  comment?: string;
}

/**
 * Records a spend event against a PO:
 *   1. Uploads the bill to Storage + creates the invoice doc.
 *   2. Appends an approval-log entry (uid, amount, invoiceId, comment).
 *   3. If invoiced total now meets/exceeds committed, closes the PO.
 *
 * Kept as a client-side sequence because Storage uploads can't be part
 * of a Firestore batch — the worst failure mode is an orphan invoice,
 * which editors can delete manually.
 */
export async function approveWithBill(
  projectId: string,
  po: PurchaseOrder,
  input: ApproveWithBillInput,
): Promise<void> {
  if (!input.invoice.number.trim()) throw new Error('invoice-number-required');
  if (!input.invoice.total || input.invoice.total <= 0) {
    throw new Error('invoice-total-required');
  }

  const invoiceId = await createInvoice(projectId, po.id, {
    number: input.invoice.number,
    issueDate: input.invoice.issueDate,
    dueDate: input.invoice.dueDate,
    total: input.invoice.total,
    lines: input.invoice.lines,
    uploadedBy: input.approverDisplayName,
    file: input.invoice.file ?? null,
  });

  const approvalId = newApprovalId();
  const apRef = doc(
    db,
    'projects',
    projectId,
    'purchaseOrders',
    po.id,
    'approvals',
    approvalId,
  );
  const approvalDoc = {
    id: approvalId,
    approverUid: input.approverUid,
    approver: input.approverDisplayName,
    initials: initialsFrom(input.approverDisplayName),
    role: input.approverRoleLabel,
    decision: 'approved' as const,
    amount: Number(input.invoice.total),
    invoiceId,
    comment: (input.comment ?? '').trim() || null,
    decidedAt: serverTimestamp(),
  };

  const committed = po.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0,
  );
  const invoicedSoFar = (po.invoices ?? []).reduce(
    (sum, inv) => sum + (inv.total ?? 0),
    0,
  );
  const newInvoicedTotal = invoicedSoFar + Number(input.invoice.total);
  const shouldClose = committed > 0 && newInvoicedTotal >= committed;

  const poRef = doc(purchaseOrdersCol(projectId), po.id);
  const batch = writeBatch(db);
  batch.set(apRef, approvalDoc);
  const poPatch: Record<string, unknown> = { approvedAt: serverTimestamp() };
  if (shouldClose) {
    poPatch.status = 'closed';
    poPatch.closedAt = serverTimestamp();
  }
  batch.update(poRef, poPatch);
  await batch.commit();
}

// ---------- Reject ----------
export async function rejectPO(
  projectId: string,
  po: PurchaseOrder,
  approverUid: string,
  approverDisplayName: string,
  approverRoleLabel: string,
  comment?: string,
): Promise<void> {
  const approvalId = newApprovalId();
  const apRef = doc(
    db,
    'projects',
    projectId,
    'purchaseOrders',
    po.id,
    'approvals',
    approvalId,
  );
  const poRef = doc(purchaseOrdersCol(projectId), po.id);

  const batch = writeBatch(db);
  batch.set(apRef, {
    id: approvalId,
    approverUid,
    approver: approverDisplayName,
    initials: initialsFrom(approverDisplayName),
    role: approverRoleLabel,
    decision: 'rejected',
    comment: (comment ?? '').trim() || null,
    decidedAt: serverTimestamp(),
  });
  batch.update(poRef, { status: 'rejected' });
  await batch.commit();
}

function newApprovalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ap_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `ap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('') || '··';
}

/**
 * True if the user has already recorded an approval event for this PO
 * (used to surface "you've already approved" affordances). Because the
 * log is now append-only, a user CAN approve multiple times as more
 * bills arrive — this helper just tells you whether at least one event
 * exists.
 */
export function hasApprovalFrom(po: PurchaseOrder, uid: string | undefined): boolean {
  if (!uid) return false;
  return (po.approvals ?? []).some((a: Approval) => a.approverUid === uid);
}

// ---------- Close / delete ----------
export async function closePO(projectId: string, poId: string): Promise<void> {
  await updateDoc(doc(purchaseOrdersCol(projectId), poId), {
    status: 'closed',
    closedAt: serverTimestamp(),
  });
}

export async function deletePO(projectId: string, poId: string): Promise<void> {
  const { collection } = await import('firebase/firestore');
  const { deleteStorageObject } = await import('./attachments');
  const batch = writeBatch(db);
  const [invSnap, apSnap, attSnap] = await Promise.all([
    getDocs(collection(db, 'projects', projectId, 'purchaseOrders', poId, 'invoices')),
    getDocs(collection(db, 'projects', projectId, 'purchaseOrders', poId, 'approvals')),
    getDocs(collection(db, 'projects', projectId, 'purchaseOrders', poId, 'attachments')),
  ]);
  // Clean up attachment files from Storage (non-fatal)
  await Promise.all(
    attSnap.docs.map((d) => {
      const storagePath = (d.data() as { storagePath?: string }).storagePath;
      return storagePath ? deleteStorageObject(storagePath) : Promise.resolve();
    }),
  );
  invSnap.forEach((d) => batch.delete(d.ref));
  apSnap.forEach((d) => batch.delete(d.ref));
  attSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(purchaseOrdersCol(projectId), poId));
  await batch.commit();
  try { await setDoc(projectDoc(projectId), {}, { merge: true }); }
  catch { /* ignore */ }
}

export { deleteDoc };
