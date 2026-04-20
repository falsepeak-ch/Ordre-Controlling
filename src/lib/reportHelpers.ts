import { lineCommitted } from '~/lib/reconcile';
import type { POStatus, PurchaseOrder, Supplier } from '~/types';

export interface DateRange {
  from: string;
  to: string;
}

export interface CategorySpend {
  code: string;
  concept: string;
  committed: number;
  invoiced: number;
}

export interface SupplierSpend {
  supplierId: string;
  name: string;
  committed: number;
  invoiced: number;
}

export interface MonthlySpend {
  month: string;
  committed: number;
  invoiced: number;
}

export interface StatusCount {
  status: POStatus;
  count: number;
}

const EXCLUDED = new Set<POStatus>(['draft', 'rejected']);

function inRange(iso: string | null | undefined, range?: DateRange): boolean {
  if (!range) return true;
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= range.from && d <= range.to;
}

export function spendByCategory(
  pos: PurchaseOrder[],
  range?: DateRange,
): CategorySpend[] {
  const map = new Map<string, CategorySpend>();

  for (const po of pos) {
    if (EXCLUDED.has(po.status)) continue;
    if (!inRange(po.createdAt, range)) continue;

    // Build a lookup: lineId -> invoiced amount
    const lineInvoicedMap = new Map<string, number>();
    for (const inv of po.invoices ?? []) {
      for (const l of inv.lines ?? []) {
        lineInvoicedMap.set(l.lineId, (lineInvoicedMap.get(l.lineId) ?? 0) + l.amount);
      }
    }

    for (const line of po.lines ?? []) {
      const code = line.categoryCode ?? 'N/A';
      const concept = line.categoryConcept ?? 'Uncategorized';
      const committed = lineCommitted(line);
      const invoiced = lineInvoicedMap.get(line.id) ?? 0;

      const existing = map.get(code);
      if (existing) {
        existing.committed += committed;
        existing.invoiced += invoiced;
      } else {
        map.set(code, { code, concept, committed, invoiced });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.committed - a.committed);
}

export function spendBySupplier(
  pos: PurchaseOrder[],
  supplierMap: Map<string, Supplier>,
  range?: DateRange,
): SupplierSpend[] {
  const map = new Map<string, SupplierSpend>();

  for (const po of pos) {
    if (EXCLUDED.has(po.status)) continue;
    if (!inRange(po.createdAt, range)) continue;

    let committed = 0;
    for (const line of po.lines ?? []) committed += lineCommitted(line);

    let invoiced = 0;
    for (const inv of po.invoices ?? []) {
      for (const l of inv.lines ?? []) invoiced += l.amount;
    }

    const supplier = supplierMap.get(po.supplierId);
    const name = supplier?.tradeName ?? supplier?.legalName ?? po.supplierId;

    const existing = map.get(po.supplierId);
    if (existing) {
      existing.committed += committed;
      existing.invoiced += invoiced;
    } else {
      map.set(po.supplierId, { supplierId: po.supplierId, name, committed, invoiced });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.committed - a.committed)
    .slice(0, 10);
}

export function spendOverTime(
  pos: PurchaseOrder[],
  range?: DateRange,
): MonthlySpend[] {
  const committed = new Map<string, number>();
  const invoiced = new Map<string, number>();

  for (const po of pos) {
    if (EXCLUDED.has(po.status)) continue;

    // Committed: keyed by PO creation month
    const poMonth = (po.createdAt ?? '').slice(0, 7);
    if (poMonth && inRange(po.createdAt, range)) {
      let poCommitted = 0;
      for (const line of po.lines ?? []) poCommitted += lineCommitted(line);
      committed.set(poMonth, (committed.get(poMonth) ?? 0) + poCommitted);
    }

    // Invoiced: keyed by invoice issue month
    for (const inv of po.invoices ?? []) {
      const invMonth = (inv.issueDate ?? '').slice(0, 7);
      if (!invMonth) continue;
      if (!inRange(inv.issueDate, range)) continue;
      const invTotal = (inv.lines ?? []).reduce((sum, l) => sum + l.amount, 0);
      invoiced.set(invMonth, (invoiced.get(invMonth) ?? 0) + invTotal);
    }
  }

  // Merge all months
  const allMonths = new Set([...committed.keys(), ...invoiced.keys()]);
  return [...allMonths]
    .sort()
    .map((month) => ({
      month,
      committed: committed.get(month) ?? 0,
      invoiced: invoiced.get(month) ?? 0,
    }));
}

export function statusDistribution(pos: PurchaseOrder[]): StatusCount[] {
  const map = new Map<POStatus, number>();
  for (const po of pos) {
    map.set(po.status, (map.get(po.status) ?? 0) + 1);
  }
  const order: POStatus[] = ['draft', 'pending_approval', 'approved', 'closed', 'rejected'];
  return order
    .filter((s) => (map.get(s) ?? 0) > 0)
    .map((status) => ({ status, count: map.get(status) ?? 0 }));
}
