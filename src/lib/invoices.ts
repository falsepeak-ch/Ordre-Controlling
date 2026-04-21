/* ==========================================================================
   Invoice capture and reconciliation.

   Files live under:
     projects/{projectId}/purchaseOrders/{poId}/invoices/{invoiceId}/{fileName}

   The Firestore doc at projects/.../invoices/{id} stores the metadata +
   the mapping of amounts back to PO lines. Deleting the doc also deletes
   the underlying file.
   ========================================================================== */

import {
  collection,
  doc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  type StorageReference,
} from 'firebase/storage';
import { db, getStorageInstance } from './firebase';
import {
  assertStorageQuota,
  deleteStorageObject,
  formatFileSize,
  resolveContentType,
  sanitizeFileName,
} from './attachments';
import type { Invoice, InvoiceLine } from '~/types';

// Re-export so existing callers can keep importing from `~/lib/invoices`
// while the helper lives in `~/lib/attachments`.
export { formatFileSize };

export interface InvoiceInput {
  number: string;
  issueDate: string;
  dueDate: string;
  total: number;
  lines: InvoiceLine[];
  uploadedBy: string;
  /** Optional file selection — uploaded to Storage when present. */
  file?: File | null;
}

function invoicesCol(projectId: string, poId: string) {
  return collection(
    db,
    'projects',
    projectId,
    'purchaseOrders',
    poId,
    'invoices',
  );
}

function newInvoiceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `inv_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseLines(lines: InvoiceLine[]): InvoiceLine[] {
  return lines
    .filter((l) => l.lineId && Number(l.amount) > 0)
    .map((l) => ({ lineId: l.lineId, amount: Math.max(0, Number(l.amount)) }));
}

/**
 * Create an invoice attached to a PO. Uploads the file to Storage first
 * (if provided), then writes the Firestore doc with fileUrl + storagePath.
 */
export async function createInvoice(
  projectId: string,
  poId: string,
  input: InvoiceInput,
): Promise<string> {
  if (!input.number.trim()) throw new Error('number-required');
  if (!input.total || input.total <= 0) throw new Error('total-required');

  const invoiceId = newInvoiceId();
  let fileFields: {
    fileName?: string;
    fileSize?: string;
    fileUrl?: string;
    storagePath?: string;
  } = {};

  if (input.file) {
    await assertStorageQuota(projectId, input.file.size);
    const fileName = sanitizeFileName(input.file.name);
    const path = `projects/${projectId}/purchaseOrders/${poId}/invoices/${invoiceId}/${fileName}`;
    const ref = storageRef(getStorageInstance(), path);
    await uploadBytes(ref, input.file, {
      contentType: resolveContentType(input.file),
    });
    const url = await getDownloadURL(ref);
    fileFields = {
      fileName,
      fileSize: formatFileSize(input.file.size),
      fileUrl: url,
      storagePath: path,
    };
  }

  const ref = doc(invoicesCol(projectId, poId), invoiceId);
  const payload: Record<string, unknown> = {
    id: invoiceId,
    number: input.number.trim(),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    total: Number(input.total),
    lines: normaliseLines(input.lines),
    uploadedBy: input.uploadedBy,
    uploadedAt: serverTimestamp(),
  };
  // Only include defined file fields — Firestore rejects `undefined`.
  for (const [k, v] of Object.entries(fileFields)) {
    if (v !== undefined) payload[k] = v;
  }
  await setDoc(ref, payload);
  return invoiceId;
}

/**
 * Update metadata / line mapping on an existing invoice. When `file`
 * is provided the old Storage object is deleted after the new upload
 * succeeds, and the fileName/fileSize/fileUrl/storagePath fields are
 * rewritten to point at the new object.
 */
export async function updateInvoice(
  projectId: string,
  poId: string,
  invoiceId: string,
  patch: Partial<InvoiceInput>,
  previous?: Pick<Invoice, 'storagePath'>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.number !== undefined) payload.number = patch.number.trim();
  if (patch.issueDate !== undefined) payload.issueDate = patch.issueDate;
  if (patch.dueDate !== undefined) payload.dueDate = patch.dueDate;
  if (patch.total !== undefined) payload.total = Number(patch.total);
  if (patch.lines !== undefined) payload.lines = normaliseLines(patch.lines);

  // File swap: upload new first, then schedule cleanup of the old one.
  if (patch.file) {
    await assertStorageQuota(projectId, patch.file.size);
    const fileName = sanitizeFileName(patch.file.name);
    const path = `projects/${projectId}/purchaseOrders/${poId}/invoices/${invoiceId}/${fileName}`;
    const ref = storageRef(getStorageInstance(), path);
    await uploadBytes(ref, patch.file, {
      contentType: resolveContentType(patch.file),
    });
    const url = await getDownloadURL(ref);
    payload.fileName = fileName;
    payload.fileSize = formatFileSize(patch.file.size);
    payload.fileUrl = url;
    payload.storagePath = path;

    // Best-effort: delete the previous object. If the storage path
    // matches the new one (same filename) we skip to avoid deleting
    // the file we just uploaded.
    if (previous?.storagePath && previous.storagePath !== path) {
      await deleteStorageObject(previous.storagePath);
    }
  }

  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(invoicesCol(projectId, poId), invoiceId), payload);
}

/**
 * Mark an invoice as paid (or unpaid, with paid=false).
 */
export async function setInvoicePaid(
  projectId: string,
  poId: string,
  invoiceId: string,
  paid: boolean,
  actorDisplayName: string,
): Promise<void> {
  const ref = doc(invoicesCol(projectId, poId), invoiceId);
  if (paid) {
    await updateDoc(ref, {
      paidAt: serverTimestamp(),
      paidBy: actorDisplayName,
    });
  } else {
    await updateDoc(ref, {
      paidAt: null,
      paidBy: null,
    });
  }
}

/**
 * Delete the invoice and the backing Storage object.
 */
export async function deleteInvoice(
  projectId: string,
  poId: string,
  invoice: Pick<Invoice, 'id' | 'storagePath'>,
): Promise<void> {
  if (invoice.storagePath) {
    try {
      const ref: StorageReference = storageRef(getStorageInstance(), invoice.storagePath);
      await deleteObject(ref);
    } catch (err) {
      // If the object is already gone, that's fine — log and continue.
      console.warn('[invoices] storage delete failed (non-fatal)', err);
    }
  }
  await deleteDoc(doc(invoicesCol(projectId, poId), invoice.id));
}
