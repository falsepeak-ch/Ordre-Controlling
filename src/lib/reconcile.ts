import type { DisplayPOStatus, POLine, ProjectMetrics, PurchaseOrder } from '~/types';

export const lineCommitted = (line: POLine): number => line.quantity * line.unitPrice;

export function lineInvoiced(po: PurchaseOrder, lineId: string): number {
  let total = 0;
  for (const inv of po.invoices ?? []) {
    for (const l of inv.lines ?? []) {
      if (l.lineId === lineId) total += l.amount;
    }
  }
  return total;
}

export const lineRemaining = (po: PurchaseOrder, line: POLine): number =>
  lineCommitted(line) - lineInvoiced(po, line.id);

export interface POTotals {
  committed: number;
  invoiced: number;
  remaining: number;
}

export function poTotals(po: PurchaseOrder): POTotals {
  let committed = 0;
  let invoiced = 0;
  for (const l of po.lines ?? []) committed += lineCommitted(l);
  for (const inv of po.invoices ?? []) {
    for (const l of inv.lines ?? []) invoiced += l.amount;
  }
  return { committed, invoiced, remaining: committed - invoiced };
}

export function displayPOStatus(po: PurchaseOrder): DisplayPOStatus {
  if (po.status === 'pending_approval') {
    const hasApproved = (po.approvals ?? []).some((a) => a.decision === 'approved');
    return hasApproved ? 'partially_approved' : po.status;
  }
  if (po.status !== 'approved') return po.status;
  const { committed, invoiced } = poTotals(po);
  if (committed > 0 && invoiced > 0 && invoiced < committed) return 'partially_invoiced';
  return po.status;
}

const METRIC_EXCLUDED_STATUSES = new Set(['draft', 'rejected']);

export function projectMetrics(
  pos: PurchaseOrder[],
  supplierCount: number,
): ProjectMetrics {
  let committed = 0;
  let invoiced = 0;
  let pendingApprovals = 0;
  let open = 0;

  for (const po of pos) {
    if (METRIC_EXCLUDED_STATUSES.has(po.status)) continue;
    const t = poTotals(po);
    committed += t.committed;
    invoiced += t.invoiced;
    if (po.status === 'pending_approval') pendingApprovals += 1;
    if (po.status !== 'closed') open += 1;
  }

  return {
    committed,
    invoiced,
    remaining: committed - invoiced,
    pendingApprovals,
    open,
    supplierCount,
    poCount: pos.length,
  };
}
