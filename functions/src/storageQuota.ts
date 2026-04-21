import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onObjectDeleted, onObjectFinalized } from 'firebase-functions/v2/storage';

/**
 * Parse a Firebase Storage object path and pull out the projectId when
 * the object belongs to a project-scoped subtree. Returns `null` for
 * anything else (public assets, misc bucket uploads, …).
 *
 * Paths we care about (mirrored in storage.rules):
 *   projects/{projectId}/purchaseOrders/{poId}/invoices/{invoiceId}/{fileName}
 *   projects/{projectId}/purchaseOrders/{poId}/attachments/{attId}/{fileName}
 *   projects/{projectId}/suppliers/{supplierId}/docs/{docId}/{fileName}
 */
function projectIdFromPath(name: string | undefined): string | null {
  if (!name) return null;
  if (!name.startsWith('projects/')) return null;
  const parts = name.split('/');
  if (parts.length < 2) return null;
  const projectId = parts[1];
  if (!projectId) return null;
  return projectId;
}

async function bumpCounter(projectId: string, deltaBytes: number) {
  if (deltaBytes === 0) return;
  const db = getFirestore();
  try {
    await db.doc(`projects/${projectId}`).set(
      { storageBytesUsed: FieldValue.increment(deltaBytes) },
      { merge: true },
    );
  } catch (err) {
    // Projects may be deleted before a trailing Storage delete event.
    // Log and swallow — a missing counter on a gone project is fine.
    logger.warn('[storageQuota] counter update failed', { projectId, deltaBytes, err });
  }
}

/**
 * On every successful upload, add the object size to the owning
 * project's `storageBytesUsed` counter. The Storage rules read the
 * counter on the next upload to enforce the cap.
 */
export const onStorageObjectFinalized = onObjectFinalized(
  { region: 'europe-west1' },
  async (event) => {
    const projectId = projectIdFromPath(event.data.name);
    if (!projectId) return;
    const size = Number(event.data.size ?? 0);
    if (!Number.isFinite(size) || size <= 0) return;
    await bumpCounter(projectId, size);
  },
);

/**
 * On every deletion, subtract the size back out. `event.data.size` is
 * populated for delete events too.
 */
export const onStorageObjectDeleted = onObjectDeleted(
  { region: 'europe-west1' },
  async (event) => {
    const projectId = projectIdFromPath(event.data.name);
    if (!projectId) return;
    const size = Number(event.data.size ?? 0);
    if (!Number.isFinite(size) || size <= 0) return;
    await bumpCounter(projectId, -size);
  },
);
