/* ==========================================================================
   Purchase-order lifecycle helpers.

   Status transitions:
     draft → pending_approval → approved → closed
                              ↘ rejected

   v1 approval model: when an editor submits a PO for approval, every
   `owner` of the project becomes an approver (stored in the PO's
   approvals subcollection). Any single owner approval transitions the
   PO to `approved`; any single owner rejection transitions it to
   `rejected`. Amount-threshold rules are a v2 concern.
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
import type {
  POLine,
  POStatus,
  Project,
  PurchaseOrder,
  Role,
} from '~/types';

export interface NewPODraftInput {
  supplierId: string;
  notes?: string | null;
  lines: POLine[];
  /** Optional project category (chart of accounts). */
  categoryId?: string | null;
  categoryCode?: string | null;
  categoryConcept?: string | null;
}

export interface POAuthor {
  uid: string;
  displayName: string;
  initials: string;
}

// ---------- PO number generation ----------
// Simple counter: PO-{year}-{####}. The count is derived from a one-time
// query against POs in the same project — good enough for small teams,
// and cheap to replace with a project counter field later.
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
    category: 'shoot',
    quantity: 1,
    unitPrice: 0,
  };
}

export function sanitizeLine(line: POLine): POLine {
  return {
    id: line.id,
    description: line.description.trim(),
    category: line.category,
    quantity: Math.max(0, Math.floor(Number(line.quantity) || 0)),
    unitPrice: Math.max(0, Number(line.unitPrice) || 0),
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
    categoryId: input.categoryId ?? null,
    categoryCode: input.categoryCode ?? null,
    categoryConcept: input.categoryConcept ?? null,
    // We leave approvals + invoices as subcollections, created on demand.
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
  if ('categoryId' in patch) payload.categoryId = patch.categoryId ?? null;
  if ('categoryCode' in patch) payload.categoryCode = patch.categoryCode ?? null;
  if ('categoryConcept' in patch) payload.categoryConcept = patch.categoryConcept ?? null;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(purchaseOrdersCol(projectId), poId), payload);
}

// ---------- Submit for approval ----------
export async function submitPOForApproval(
  projectId: string,
  po: PurchaseOrder,
  project: Project,
): Promise<void> {
  const poRef = doc(purchaseOrdersCol(projectId), po.id);
  const approvers = collectOwnerApprovers(project);
  if (approvers.length === 0) {
    throw new Error('no-approvers-available');
  }

  const batch = writeBatch(db);
  batch.update(poRef, {
    status: 'pending_approval',
    submittedAt: serverTimestamp(),
  });

  // Wipe any previous approvals (e.g. after a rejected → re-submit)
  const { collection } = await import('firebase/firestore');
  const existing = await getDocs(
    collection(db, 'projects', projectId, 'purchaseOrders', po.id, 'approvals'),
  );
  existing.forEach((d) => batch.delete(d.ref));

  for (const [i, a] of approvers.entries()) {
    const apId = `${po.id}_ap_${i}`;
    const apRef = doc(db, 'projects', projectId, 'purchaseOrders', po.id, 'approvals', apId);
    batch.set(apRef, {
      id: apId,
      approverUid: a.uid,
      approver: a.displayName,
      initials: a.initials,
      role: a.roleLabel,
      decision: 'pending',
      comment: null,
      decidedAt: null,
    });
  }

  await batch.commit();
}

function collectOwnerApprovers(project: Project): Array<{
  uid: string;
  displayName: string;
  initials: string;
  roleLabel: string;
}> {
  const out = [];
  const entries = Object.entries(project.members ?? {}) as Array<[string, Role]>;
  for (const [uid, role] of entries) {
    if (role !== 'owner') continue;
    const profile = project.memberProfiles?.[uid];
    const displayName =
      profile?.displayName ?? project.memberEmails?.[uid] ?? uid;
    const initials = initialsFrom(displayName);
    out.push({ uid, displayName, initials, roleLabel: 'Owner' });
  }
  return out;
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('') || '··';
}

// ---------- Approve / reject / close ----------
export async function approvePO(
  projectId: string,
  po: PurchaseOrder,
  approverUid: string,
  comment?: string,
): Promise<void> {
  const approval = findPendingApprovalFor(po, approverUid);
  if (!approval) throw new Error('not-an-approver');

  const apRef = doc(
    db,
    'projects',
    projectId,
    'purchaseOrders',
    po.id,
    'approvals',
    approval.id,
  );
  const poRef = doc(purchaseOrdersCol(projectId), po.id);

  const batch = writeBatch(db);
  batch.update(apRef, {
    decision: 'approved',
    comment: (comment ?? '').trim() || null,
    decidedAt: serverTimestamp(),
  });
  batch.update(poRef, {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function rejectPO(
  projectId: string,
  po: PurchaseOrder,
  approverUid: string,
  comment?: string,
): Promise<void> {
  const approval = findPendingApprovalFor(po, approverUid);
  if (!approval) throw new Error('not-an-approver');

  const apRef = doc(
    db,
    'projects',
    projectId,
    'purchaseOrders',
    po.id,
    'approvals',
    approval.id,
  );
  const poRef = doc(purchaseOrdersCol(projectId), po.id);

  const batch = writeBatch(db);
  batch.update(apRef, {
    decision: 'rejected',
    comment: (comment ?? '').trim() || null,
    decidedAt: serverTimestamp(),
  });
  batch.update(poRef, {
    status: 'rejected',
  });
  await batch.commit();
}

function findPendingApprovalFor(
  po: PurchaseOrder,
  approverUid: string,
) {
  return po.approvals.find(
    (a) => a.approverUid === approverUid && a.decision === 'pending',
  );
}

export function isApproverFor(po: PurchaseOrder, uid: string | undefined): boolean {
  if (!uid) return false;
  return !!findPendingApprovalFor(po, uid);
}

// ---------- Close / delete ----------
export async function closePO(projectId: string, poId: string): Promise<void> {
  await updateDoc(doc(purchaseOrdersCol(projectId), poId), {
    status: 'closed',
    closedAt: serverTimestamp(),
  });
}

export async function deletePO(projectId: string, poId: string): Promise<void> {
  // Delete subcollections first to keep the tree clean.
  const { collection } = await import('firebase/firestore');
  const batch = writeBatch(db);
  const [invSnap, apSnap] = await Promise.all([
    getDocs(collection(db, 'projects', projectId, 'purchaseOrders', poId, 'invoices')),
    getDocs(collection(db, 'projects', projectId, 'purchaseOrders', poId, 'approvals')),
  ]);
  invSnap.forEach((d) => batch.delete(d.ref));
  apSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(purchaseOrdersCol(projectId), poId));
  await batch.commit();
  // Touch the project doc so live listeners pick up the change immediately
  // (no-op if the project hasn't changed).
  try { await setDoc(projectDoc(projectId), {}, { merge: true }); }
  catch { /* ignore */ }
}

// Fallback for environments without deleteDoc aliasing (unused, keeps
// the import surface tidy).
export { deleteDoc };
