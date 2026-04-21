import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '~/lib/firebase';
import { purchaseOrdersCol, tsToISO } from '~/lib/firestore';
import type { Approval, Invoice, PurchaseOrder } from '~/types';

export interface QueueEntry {
  po: PurchaseOrder;
  approvals: Approval[];
  /** True when this user has already recorded at least one approval on this PO. */
  iHaveActed: boolean;
}

export interface UseApprovalsQueueResult {
  pending: QueueEntry[];
  decided: QueueEntry[];
  loading: boolean;
}

/**
 * Real-time approvals queue for the current user.
 *
 * pending  — POs in `pending_approval` (any approver/owner may act)
 * decided  — approved/closed/rejected POs that have at least one approval
 *            log entry from this user
 */
export function useApprovalsQueue(
  projectId: string,
  uid: string | undefined,
): UseApprovalsQueueResult {
  const [pendingPOs, setPendingPOs] = useState<Map<string, PurchaseOrder>>(new Map());
  const [decidedPOs, setDecidedPOs] = useState<Map<string, PurchaseOrder>>(new Map());
  const [approvalsByPO, setApprovalsByPO] = useState<Map<string, Approval[]>>(new Map());
  const [invoicesByPO, setInvoicesByPO] = useState<Map<string, Invoice[]>>(new Map());
  const [posReady, setPosReady] = useState(false);

  useEffect(() => {
    if (!projectId || !uid) return;
    setPosReady(false);

    const unsubPending = onSnapshot(
      query(
        purchaseOrdersCol(projectId),
        where('status', 'in', ['pending_approval']),
      ),
      (snap) => {
        const m = new Map<string, PurchaseOrder>();
        snap.docs.forEach((d) => {
          const raw = d.data();
          m.set(d.id, {
            ...(raw as PurchaseOrder),
            id: d.id,
            createdAt: tsToISO(raw.createdAt) ?? '',
            submittedAt: tsToISO(raw.submittedAt),
            approvedAt: tsToISO(raw.approvedAt),
            closedAt: tsToISO(raw.closedAt),
          });
        });
        setPendingPOs(m);
        setPosReady(true);
      },
      (err) => { console.warn('[approvalsQueue] pending error', err); setPosReady(true); },
    );

    const unsubDecided = onSnapshot(
      query(
        purchaseOrdersCol(projectId),
        where('status', 'in', ['approved', 'closed', 'rejected']),
      ),
      (snap) => {
        const m = new Map<string, PurchaseOrder>();
        snap.docs.forEach((d) => {
          const raw = d.data();
          m.set(d.id, {
            ...(raw as PurchaseOrder),
            id: d.id,
            createdAt: tsToISO(raw.createdAt) ?? '',
            submittedAt: tsToISO(raw.submittedAt),
            approvedAt: tsToISO(raw.approvedAt),
            closedAt: tsToISO(raw.closedAt),
          });
        });
        setDecidedPOs(m);
      },
      (err) => console.warn('[approvalsQueue] decided error', err),
    );

    return () => { unsubPending(); unsubDecided(); };
  }, [projectId, uid]);

  // Subscribe to approvals + invoices subcollections for each relevant PO
  useEffect(() => {
    if (!projectId || !uid) return;
    const relevant = new Set<string>([...pendingPOs.keys(), ...decidedPOs.keys()]);
    const unsubs: Unsubscribe[] = [];
    relevant.forEach((poId) => {
      const unsubAp = onSnapshot(
        collection(db, 'projects', projectId, 'purchaseOrders', poId, 'approvals'),
        (snap) => {
          const rows: Approval[] = snap.docs.map((d) => {
            const raw = d.data();
            return { ...(raw as Approval), id: d.id, decidedAt: tsToISO(raw.decidedAt) };
          });
          setApprovalsByPO((prev) => { const n = new Map(prev); n.set(poId, rows); return n; });
        },
        (err) => console.warn('[approvalsQueue] approvals error', poId, err),
      );
      const unsubInv = onSnapshot(
        collection(db, 'projects', projectId, 'purchaseOrders', poId, 'invoices'),
        (snap) => {
          const rows: Invoice[] = snap.docs.map((d) => {
            const raw = d.data();
            return {
              ...(raw as Invoice),
              id: d.id,
              uploadedAt: tsToISO(raw.uploadedAt) ?? undefined,
              paidAt: tsToISO(raw.paidAt),
            };
          });
          setInvoicesByPO((prev) => { const n = new Map(prev); n.set(poId, rows); return n; });
        },
        (err) => console.warn('[approvalsQueue] invoices error', poId, err),
      );
      unsubs.push(unsubAp, unsubInv);
    });
    return () => unsubs.forEach((u) => u());
  }, [projectId, uid, pendingPOs, decidedPOs]);

  const { pending, decided } = useMemo(() => {
    const p: QueueEntry[] = [];
    const d: QueueEntry[] = [];
    if (!uid) return { pending: p, decided: d };

    for (const po of pendingPOs.values()) {
      const approvals = approvalsByPO.get(po.id) ?? [];
      const invoices = invoicesByPO.get(po.id) ?? [];
      const iHaveActed = approvals.some((a) => a.approverUid === uid);
      p.push({ po: { ...po, approvals, invoices }, approvals, iHaveActed });
    }

    for (const po of decidedPOs.values()) {
      const approvals = approvalsByPO.get(po.id) ?? [];
      const invoices = invoicesByPO.get(po.id) ?? [];
      const mine = approvals.some((a) => a.approverUid === uid);
      if (mine) d.push({ po: { ...po, approvals, invoices }, approvals, iHaveActed: true });
    }

    p.sort((a, b) => (b.po.submittedAt ?? '').localeCompare(a.po.submittedAt ?? ''));
    d.sort((a, b) =>
      (b.approvals.filter((a) => a.approverUid === uid).at(-1)?.decidedAt ?? '')
        .localeCompare(
          a.approvals.filter((ap) => ap.approverUid === uid).at(-1)?.decidedAt ?? '',
        ),
    );

    return { pending: p, decided: d };
  }, [pendingPOs, decidedPOs, approvalsByPO, invoicesByPO, uid]);

  return { pending, decided, loading: !posReady };
}
