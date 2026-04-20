/* ==========================================================================
   Shared file-attachment helpers used by suppliers + PO attachments +
   (already existing) invoices. Keeps Storage + filename + size concerns
   in one place so each feature lib stays small.
   ========================================================================== */

import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import { getStorageInstance } from './firebase';

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

/**
 * Human-readable file size. Kept identical to the invoice formatter so
 * we can collapse invoices onto this helper in a later pass.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export interface UploadedAttachment {
  fileName: string;
  fileSize: string;
  fileUrl: string;
  storagePath: string;
}

/**
 * Upload a single file at a Firestore-friendly path and return a
 * denormalised { fileName, fileSize, fileUrl, storagePath } payload the
 * caller can persist.
 */
export async function uploadAttachment(
  path: string,
  file: File,
): Promise<UploadedAttachment> {
  const fileName = sanitizeFileName(file.name);
  const fullPath = `${path}/${fileName}`;
  const ref = storageRef(getStorageInstance(), fullPath);
  await uploadBytes(ref, file, {
    contentType: file.type || 'application/octet-stream',
  });
  const fileUrl = await getDownloadURL(ref);
  return {
    fileName,
    fileSize: formatFileSize(file.size),
    fileUrl,
    storagePath: fullPath,
  };
}

/** Tolerates "already gone" — so we can always safely try to clean up. */
export async function deleteStorageObject(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(storageRef(getStorageInstance(), storagePath));
  } catch (err) {
    console.warn('[attachments] storage delete failed (non-fatal)', err);
  }
}

export function randomAttachmentId(prefix = 'att'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
