import { addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { suppliersCol } from './firestore';
import type { Supplier, SupplierDocument } from '~/types';

export type NewSupplierInput = Omit<Supplier, 'id' | 'createdAt' | 'monogram' | 'docs'> & {
  docs?: SupplierDocument[];
};

function deriveMonogram(name: string): string {
  const clean = name.trim();
  if (!clean) return '··';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function createSupplier(projectId: string, input: NewSupplierInput): Promise<string> {
  const trimmed = {
    legalName: input.legalName.trim(),
    tradeName: input.tradeName.trim() || input.legalName.trim(),
    taxId: input.taxId.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    paymentTerms: input.paymentTerms.trim() || 'Net 30',
    notes: input.notes.trim(),
    tags: input.tags.filter(Boolean),
    docs: input.docs ?? [],
  };
  if (!trimmed.legalName) throw new Error('legalName-required');

  const ref = await addDoc(suppliersCol(projectId), {
    ...trimmed,
    monogram: deriveMonogram(trimmed.tradeName),
    createdAt: serverTimestamp(),
  } as never);
  return ref.id;
}

export async function updateSupplier(
  projectId: string,
  supplierId: string,
  patch: Partial<NewSupplierInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === 'tags' && Array.isArray(v)) payload[k] = v.filter(Boolean);
    else if (typeof v === 'string') payload[k] = v.trim();
    else payload[k] = v;
  }
  if (typeof patch.tradeName === 'string' && patch.tradeName.trim()) {
    payload.monogram = deriveMonogram(patch.tradeName);
  } else if (typeof patch.legalName === 'string' && patch.legalName.trim()) {
    payload.monogram = deriveMonogram(patch.legalName);
  }
  await updateDoc(doc(suppliersCol(projectId), supplierId), payload);
}

export async function deleteSupplier(projectId: string, supplierId: string): Promise<void> {
  await deleteDoc(doc(suppliersCol(projectId), supplierId));
}
