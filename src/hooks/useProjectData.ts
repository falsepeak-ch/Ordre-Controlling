import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { purchaseOrdersCol, suppliersCol, tsToISO } from '~/lib/firestore';
import type { PurchaseOrder, Supplier } from '~/types';

export interface ProjectData {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
}

export function useProjectData(projectId: string): ProjectData {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliersReady, setSuppliersReady] = useState(false);
  const [posReady, setPosReady] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setSuppliersReady(false);
    setPosReady(false);
    const unsubSuppliers = onSnapshot(suppliersCol(projectId), (snap) => {
      setSuppliers(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      setSuppliersReady(true);
    });
    const unsubPos = onSnapshot(purchaseOrdersCol(projectId), (snap) => {
      const docs = snap.docs.map((d) => {
        const raw = d.data();
        return {
          ...(raw as PurchaseOrder),
          id: d.id,
          createdAt: tsToISO(raw.createdAt) ?? '',
          submittedAt: tsToISO(raw.submittedAt),
          approvedAt: tsToISO(raw.approvedAt),
          closedAt: tsToISO(raw.closedAt),
          invoices: raw.invoices ?? [],
          approvals: raw.approvals ?? [],
        };
      });
      setPurchaseOrders(docs);
      setPosReady(true);
    });
    return () => {
      unsubSuppliers();
      unsubPos();
    };
  }, [projectId]);

  return { suppliers, purchaseOrders, loading: !(suppliersReady && posReady) };
}
