/* ==========================================================================
   Purchase-order lifecycle helpers.

   Status transitions:
     draft → pending_approval → approved → closed
                                        ↘ rejected
     (reopen: closed → approved)

   Approval model (v3):
     Submitting a PO sends it to `pending_approval`. Any owner or
     approver-role member can then approve or reject with a comment —
     approval is purely a logged decision and does not require a bill.
     Bills (invoices) are uploaded independently via `InvoiceFormModal`
     and may be attached from `pending_approval` onwards. Closing the
     PO is a separate user action; invoices may exceed the committed
     total (over-budget is a scannable state, not a block).
   ========================================================================== */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { purchaseOrdersCol, projectDoc } from './firestore';
import { deleteInvoice } from './invoices';
import { deleteStorageObject } from './attachments';
import type {
  Approval,
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
// A counter doc per project at `projects/{id}/meta/poCounters` holds the
// last-allocated number for each year: `{ [year]: number }`. Wrapping
// the read + write in a transaction makes concurrent PO creation safe;
// two clients racing no longer get the same number.
//
// On first use (or if the counter doc is missing, e.g. during a legacy
// project migration) we seed from the max existing `PO-{year}-NNNN` in
// the collection so we never recycle a number.
async function nextPONumber(projectId: string): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'projects', projectId, 'meta', 'poCounters');

  // Seed value — only read if the transaction sees no existing entry.
  let seed: number | null = null;
  async function computeSeed(): Promise<number> {
    if (seed !== null) return seed;
    const snap = await getDocs(
      query(purchaseOrdersCol(projectId), where('number', '>=', `PO-${year}-`)),
    );
    seed = snap.docs.reduce((acc, d) => {
      const n = d.data().number as string | undefined;
      if (!n) return acc;
      const parts = n.split('-');
      const num = Number(parts[2] ?? 0);
      return Number.isFinite(num) && num > acc ? num : acc;
    }, 0);
    return seed;
  }

  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const data = (snap.exists() ? snap.data() : {}) as Record<string, number>;
    const current = data[String(year)];
    const base = typeof current === 'number' ? current : await computeSeed();
    const allocated = base + 1;
    tx.set(counterRef, { [String(year)]: allocated }, { merge: true });
    return allocated;
  });

  return `PO-${year}-${String(next).padStart(4, '0')}`;
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
  // Go through the untyped `collection` helper here: the typed
  // CollectionReference<PurchaseOrder> wants the full shape of a PO,
  // but addDoc is creating a fresh doc without `id`/`invoices`/`approvals`
  // (server-assigned ID, populated subcollections). The seed payload is
  // complete enough for our rules + readers.
  const untyped = collection(db, 'projects', projectId, 'purchaseOrders');
  const ref = await addDoc(untyped, {
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
  });
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

// ---------- Approve (logged decision, no bill) ----------
export interface ApprovePOInput {
  approverUid: string;
  approverDisplayName: string;
  approverRoleLabel: string;
  comment?: string;
}

/**
 * Records an approval decision against a PO. Appends an approval-log
 * entry (uid, comment — no amount, no invoiceId) and moves the PO to
 * `approved`. Closing the PO and recording bills are separate actions.
 */
export async function approvePO(
  projectId: string,
  po: PurchaseOrder,
  input: ApprovePOInput,
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
    approverUid: input.approverUid,
    approver: input.approverDisplayName,
    initials: initialsFrom(input.approverDisplayName),
    role: input.approverRoleLabel,
    decision: 'approved' as const,
    comment: (input.comment ?? '').trim() || null,
    decidedAt: serverTimestamp(),
  });
  batch.update(poRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
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

/**
 * Reverts a previous approval/rejection decision. Deletes the approval
 * log entry, and if the approval recorded a bill, deletes the matching
 * invoice doc + Storage object too. The PO returns to
 * `pending_approval` and re-enters the approvals queue.
 *
 * Intentionally destructive: the user explicitly asked to undo, so we
 * don't leave an orphan invoice behind. Any other approvers' entries on
 * the same PO are untouched.
 */
export async function undoApproval(
  projectId: string,
  poId: string,
  approval: Pick<Approval, 'id' | 'invoiceId'>,
): Promise<void> {
  if (approval.invoiceId) {
    const invRef = doc(
      db,
      'projects',
      projectId,
      'purchaseOrders',
      poId,
      'invoices',
      approval.invoiceId,
    );
    try {
      const snap = await getDoc(invRef);
      if (snap.exists()) {
        const data = snap.data() as { storagePath?: string };
        await deleteInvoice(projectId, poId, {
          id: approval.invoiceId,
          storagePath: data.storagePath,
        });
      }
    } catch (err) {
      console.warn('[purchaseOrders] undoApproval invoice cleanup failed', err);
    }
  }

  const apRef = doc(
    db,
    'projects',
    projectId,
    'purchaseOrders',
    poId,
    'approvals',
    approval.id,
  );
  const poRef = doc(purchaseOrdersCol(projectId), poId);
  const batch = writeBatch(db);
  batch.delete(apRef);
  batch.update(poRef, {
    status: 'pending_approval',
    approvedAt: null,
    closedAt: null,
  });
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
 * (used to surface "you've already approved" affordances).
 */
export function hasApprovalFrom(po: PurchaseOrder, uid: string | undefined): boolean {
  if (!uid) return false;
  return (po.approvals ?? []).some((a: Approval) => a.approverUid === uid);
}

// ---------- Close / reopen / delete ----------
export async function closePO(projectId: string, poId: string): Promise<void> {
  await updateDoc(doc(purchaseOrdersCol(projectId), poId), {
    status: 'closed',
    closedAt: serverTimestamp(),
  });
}

export async function reopenPO(projectId: string, poId: string): Promise<void> {
  await updateDoc(doc(purchaseOrdersCol(projectId), poId), {
    status: 'approved',
    closedAt: null,
  });
}

export async function deletePO(projectId: string, poId: string): Promise<void> {
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
