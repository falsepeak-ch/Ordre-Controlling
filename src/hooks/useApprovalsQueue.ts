import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '~/lib/firebase';
import { purchaseOrdersCol } from '~/lib/firestore';
import type { Approval, PurchaseOrder } from '~/types';

export interface QueueEntry {
  po: PurchaseOrder;
  approvals: Approval[];
  myApproval: Approval | null;
  myDecision: Approval['decision'] | null;
}

export interface UseApprovalsQueueResult {
  waitingForMe: QueueEntry[];
  decidedByMe: QueueEntry[];
  loading: boolean;
}

/**
 * Real-time view of POs relevant to the current user as an approver:
 *  - waitingForMe: pending_approval POs where I'm a pending approver
 *  - decidedByMe: any PO where I hold a non-pending approval
 */
export function useApprovalsQueue(
  projectId: string,
  uid: string | undefined,
): UseApprovalsQueueResult {
  const [pendingPOs, setPendingPOs] = useState<Map<string, PurchaseOrder>>(new Map());
  const [decidedPOs, setDecidedPOs] = useState<Map<string, PurchaseOrder>>(new Map());
  const [approvalsByPO, setApprovalsByPO] = useState<Map<string, Approval[]>>(new Map());
  const [posReady, setPosReady] = useState(false);

  // 1. Watch pending_approval POs
  useEffect(() => {
    if (!projectId || !uid) return;
    setPosReady(false);
    const unsubPending = onSnapshot(
      query(purchaseOrdersCol(projectId), where('status', '==', 'pending_approval')),
      (snap) => {
        const m = new Map<string, PurchaseOrder>();
        snap.docs.forEach((d) => {
          m.set(d.id, { ...(d.data() as PurchaseOrder), id: d.id });
        });
        setPendingPOs(m);
        setPosReady(true);
      },
      (err) => {
        console.warn('[approvalsQueue] pending POs error', err);
        setPosReady(true);
      },
    );

    // 2. Watch approved/rejected/closed POs so we can surface my decisions.
    const unsubDecided = onSnapshot(
      query(purchaseOrdersCol(projectId), where('status', 'in', ['approved', 'rejected', 'closed'])),
      (snap) => {
        const m = new Map<string, PurchaseOrder>();
        snap.docs.forEach((d) => {
          m.set(d.id, { ...(d.data() as PurchaseOrder), id: d.id });
        });
        setDecidedPOs(m);
      },
    );

    return () => {
      unsubPending();
      unsubDecided();
    };
  }, [projectId, uid]);

  // 3. Subscribe to approvals for each PO currently in either map.
  useEffect(() => {
    if (!projectId || !uid) return;
    const relevant = new Set<string>([...pendingPOs.keys(), ...decidedPOs.keys()]);
    const unsubs: Unsubscribe[] = [];
    relevant.forEach((poId) => {
      const apCol = collection(db, 'projects', projectId, 'purchaseOrders', poId, 'approvals');
      const unsub = onSnapshot(
        apCol,
        (snap) => {
          const rows: Approval[] = snap.docs.map((d) => ({
            ...(d.data() as Approval),
            id: d.id,
          }));
          setApprovalsByPO((prev) => {
            const next = new Map(prev);
            next.set(poId, rows);
            return next;
          });
        },
        (err) => console.warn('[approvalsQueue] approvals error for', poId, err),
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [projectId, uid, pendingPOs, decidedPOs]);

  const { waitingForMe, decidedByMe } = useMemo(() => {
    const waiting: QueueEntry[] = [];
    const decided: QueueEntry[] = [];
    if (!uid) return { waitingForMe: waiting, decidedByMe: decided };

    for (const po of pendingPOs.values()) {
      const approvals = approvalsByPO.get(po.id) ?? [];
      const mine = approvals.find((a) => a.approverUid === uid) ?? null;
      if (mine && mine.decision === 'pending') {
        waiting.push({ po: { ...po, approvals }, approvals, myApproval: mine, myDecision: 'pending' });
      }
    }

    for (const po of decidedPOs.values()) {
      const approvals = approvalsByPO.get(po.id) ?? [];
      const mine = approvals.find((a) => a.approverUid === uid) ?? null;
      if (mine && mine.decision !== 'pending') {
        decided.push({ po: { ...po, approvals }, approvals, myApproval: mine, myDecision: mine.decision });
      }
    }

    waiting.sort((a, b) => (b.po.submittedAt ?? '').localeCompare(a.po.submittedAt ?? ''));
    decided.sort((a, b) => (b.myApproval?.decidedAt ?? '').localeCompare(a.myApproval?.decidedAt ?? ''));

    return { waitingForMe: waiting, decidedByMe: decided };
  }, [pendingPOs, decidedPOs, approvalsByPO, uid]);

  return { waitingForMe, decidedByMe, loading: !posReady };
}
