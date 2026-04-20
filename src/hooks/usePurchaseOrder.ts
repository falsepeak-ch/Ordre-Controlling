import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { purchaseOrdersCol } from '~/lib/firestore';
import { db } from '~/lib/firebase';
import type { Approval, Invoice, PurchaseOrder } from '~/types';

export interface UsePurchaseOrderResult {
  po: PurchaseOrder | null;
  loading: boolean;
  notFound: boolean;
}

export function usePurchaseOrder(
  projectId: string | undefined,
  poId: string | undefined,
): UsePurchaseOrderResult {
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  useEffect(() => {
    if (!projectId || !poId) return;
    setLoading(true);
    setNotFound(false);
    const poRef = doc(purchaseOrdersCol(projectId), poId);
    const unsubPo = onSnapshot(poRef, (snap) => {
      if (!snap.exists()) {
        setPo(null);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPo({ ...(snap.data() as PurchaseOrder), id: snap.id });
      setLoading(false);
    });

    const invCol = collection(db, 'projects', projectId, 'purchaseOrders', poId, 'invoices');
    const unsubInv = onSnapshot(invCol, (snap) => {
      setInvoices(snap.docs.map((d) => ({ ...(d.data() as Invoice), id: d.id })));
    });

    const apCol = collection(db, 'projects', projectId, 'purchaseOrders', poId, 'approvals');
    const unsubAp = onSnapshot(apCol, (snap) => {
      setApprovals(snap.docs.map((d) => ({ ...(d.data() as Approval), id: d.id })));
    });

    return () => {
      unsubPo();
      unsubInv();
      unsubAp();
    };
  }, [projectId, poId]);

  const merged = po ? { ...po, invoices, approvals } : null;
  return { po: merged, loading, notFound };
}
