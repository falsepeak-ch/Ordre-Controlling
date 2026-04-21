import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import { purchaseOrdersCol, suppliersCol, tsToISO } from '~/lib/firestore';
import type { Approval, Invoice, PurchaseOrder, Supplier } from '~/types';

export interface ProjectData {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
}

export function useProjectData(projectId: string): ProjectData {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [posById, setPosById] = useState<Map<string, PurchaseOrder>>(new Map());
  const [invoicesByPO, setInvoicesByPO] = useState<Map<string, Invoice[]>>(new Map());
  const [approvalsByPO, setApprovalsByPO] = useState<Map<string, Approval[]>>(new Map());
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
      const next = new Map<string, PurchaseOrder>();
      snap.docs.forEach((d) => {
        const raw = d.data();
        next.set(d.id, {
          ...(raw as PurchaseOrder),
          id: d.id,
          createdAt: tsToISO(raw.createdAt) ?? '',
          submittedAt: tsToISO(raw.submittedAt),
          approvedAt: tsToISO(raw.approvedAt),
          closedAt: tsToISO(raw.closedAt),
          invoices: [],
          approvals: [],
        });
      });
      setPosById(next);
      setPosReady(true);
    });

    return () => {
      unsubSuppliers();
      unsubPos();
    };
  }, [projectId]);

  // Subscribe to invoices + approvals subcollections for each known PO.
  // The root PO doc has stale empty arrays for these — the authoritative
  // data lives in the subcollection.
  useEffect(() => {
    if (!projectId) return;
    const unsubs: Unsubscribe[] = [];
    const tracked = new Set<string>();

    posById.forEach((_po, poId) => {
      tracked.add(poId);

      const invCol = collection(db, 'projects', projectId, 'purchaseOrders', poId, 'invoices');
      unsubs.push(
        onSnapshot(
          invCol,
          (snap) => {
            const rows = snap.docs.map((d) => {
              const raw = d.data();
              return {
                ...(raw as Invoice),
                id: d.id,
                uploadedAt: tsToISO(raw.uploadedAt) ?? undefined,
                paidAt: tsToISO(raw.paidAt),
              };
            });
            setInvoicesByPO((prev) => {
              const n = new Map(prev);
              n.set(poId, rows);
              return n;
            });
          },
          (err) => console.warn('[projectData] invoices error', poId, err),
        ),
      );

      const apCol = collection(db, 'projects', projectId, 'purchaseOrders', poId, 'approvals');
      unsubs.push(
        onSnapshot(
          apCol,
          (snap) => {
            const rows = snap.docs.map((d) => {
              const raw = d.data();
              return {
                ...(raw as Approval),
                id: d.id,
                decidedAt: tsToISO(raw.decidedAt),
              };
            });
            setApprovalsByPO((prev) => {
              const n = new Map(prev);
              n.set(poId, rows);
              return n;
            });
          },
          (err) => console.warn('[projectData] approvals error', poId, err),
        ),
      );
    });

    // Drop cached rows for POs that no longer exist.
    setInvoicesByPO((prev) => {
      let changed = false;
      const n = new Map(prev);
      for (const id of n.keys()) {
        if (!tracked.has(id)) {
          n.delete(id);
          changed = true;
        }
      }
      return changed ? n : prev;
    });
    setApprovalsByPO((prev) => {
      let changed = false;
      const n = new Map(prev);
      for (const id of n.keys()) {
        if (!tracked.has(id)) {
          n.delete(id);
          changed = true;
        }
      }
      return changed ? n : prev;
    });

    return () => unsubs.forEach((u) => u());
  }, [projectId, posById]);

  const purchaseOrders = useMemo(() => {
    const out: PurchaseOrder[] = [];
    posById.forEach((po) => {
      out.push({
        ...po,
        invoices: invoicesByPO.get(po.id) ?? [],
        approvals: approvalsByPO.get(po.id) ?? [],
      });
    });
    return out;
  }, [posById, invoicesByPO, approvalsByPO]);

  return {
    suppliers,
    purchaseOrders,
    loading: !(suppliersReady && posReady),
  };
}
