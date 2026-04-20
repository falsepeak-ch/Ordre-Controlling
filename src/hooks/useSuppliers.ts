import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { suppliersCol } from '~/lib/firestore';
import type { Supplier } from '~/types';

export interface UseSuppliersResult {
  suppliers: Supplier[];
  loading: boolean;
}

export function useSuppliers(projectId: string | undefined): UseSuppliersResult {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(suppliersCol(projectId), orderBy('tradeName'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSuppliers(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error('[suppliers] snapshot error', err);
        setSuppliers([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [projectId]);

  return { suppliers, loading };
}
