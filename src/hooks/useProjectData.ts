import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { purchaseOrdersCol, suppliersCol } from '~/lib/firestore';
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
      const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      // Invoices and approvals are sub-collections — not loaded in this hook
      // to keep the dashboard query cheap. They'll be lazily joined when a
      // future iteration renders detail views.
      setPurchaseOrders(docs.map((d) => ({ ...d, invoices: d.invoices ?? [], approvals: d.approvals ?? [] })));
      setPosReady(true);
    });
    return () => {
      unsubSuppliers();
      unsubPos();
    };
  }, [projectId]);

  return { suppliers, purchaseOrders, loading: !(suppliersReady && posReady) };
}
