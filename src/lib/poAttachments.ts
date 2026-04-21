import {
  collection,
  doc,
  deleteDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  assertStorageQuota,
  deleteStorageObject,
  randomAttachmentId,
  uploadAttachment,
} from './attachments';
import type { POAttachment } from '~/types';

function attachmentsCol(projectId: string, poId: string) {
  return collection(db, 'projects', projectId, 'purchaseOrders', poId, 'attachments');
}

export interface AddPOAttachmentInput {
  file: File;
  kind?: string | null;
  uploadedBy: string;
}

export async function addPOAttachment(
  projectId: string,
  poId: string,
  input: AddPOAttachmentInput,
): Promise<string> {
  await assertStorageQuota(projectId, input.file.size);
  const id = randomAttachmentId('att');
  const path = `projects/${projectId}/purchaseOrders/${poId}/attachments/${id}`;
  const uploaded = await uploadAttachment(path, input.file);

  await setDoc(doc(attachmentsCol(projectId, poId), id), {
    id,
    ...uploaded,
    kind: input.kind ?? null,
    uploadedBy: input.uploadedBy,
    uploadedAt: serverTimestamp(),
  });
  return id;
}

export async function deletePOAttachment(
  projectId: string,
  poId: string,
  attachment: Pick<POAttachment, 'id' | 'storagePath'>,
): Promise<void> {
  if (!attachment.id) return;
  if (attachment.storagePath) await deleteStorageObject(attachment.storagePath);
  await deleteDoc(doc(attachmentsCol(projectId, poId), attachment.id));
}
