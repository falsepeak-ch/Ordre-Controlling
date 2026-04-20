import {
  collection,
  doc,
  deleteDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  deleteStorageObject,
  randomAttachmentId,
  uploadAttachment,
} from './attachments';
import type { SupplierDocument } from '~/types';

function docsCol(projectId: string, supplierId: string) {
  return collection(db, 'projects', projectId, 'suppliers', supplierId, 'docs');
}

export interface AddSupplierDocInput {
  file: File;
  kind?: string | null;
  uploadedBy: string;
}

export async function addSupplierDoc(
  projectId: string,
  supplierId: string,
  input: AddSupplierDocInput,
): Promise<string> {
  const id = randomAttachmentId('doc');
  const path = `projects/${projectId}/suppliers/${supplierId}/docs/${id}`;
  const uploaded = await uploadAttachment(path, input.file);

  await setDoc(doc(docsCol(projectId, supplierId), id), {
    id,
    ...uploaded,
    kind: input.kind ?? null,
    uploadedBy: input.uploadedBy,
    uploadedAt: serverTimestamp(),
  });
  return id;
}

export async function deleteSupplierDoc(
  projectId: string,
  supplierId: string,
  docIn: Pick<SupplierDocument, 'id' | 'storagePath'>,
): Promise<void> {
  if (!docIn.id) return;
  if (docIn.storagePath) await deleteStorageObject(docIn.storagePath);
  await deleteDoc(doc(docsCol(projectId, supplierId), docIn.id));
}
