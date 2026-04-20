import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import type { SupplierDocument } from '~/types';

export interface UseSupplierDocsResult {
  docs: SupplierDocument[];
  loading: boolean;
}

export function useSupplierDocs(
  projectId: string | undefined,
  supplierId: string | undefined,
): UseSupplierDocsResult {
  const [docs, setDocs] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !supplierId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'projects', projectId, 'suppliers', supplierId, 'docs'),
      orderBy('uploadedAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(snap.docs.map((d) => ({ ...(d.data() as SupplierDocument), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.warn('[supplierDocs] snapshot error', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [projectId, supplierId]);

  return { docs, loading };
}
