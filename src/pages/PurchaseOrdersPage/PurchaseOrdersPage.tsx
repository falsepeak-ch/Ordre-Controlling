import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Pill } from '~/components/ui/Pill';
import { Progress } from '~/components/ui/Progress';
import { Field, Input } from '~/components/ui/Input';
import { Spinner } from '~/components/ui/Spinner';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useProjectData } from '~/hooks/useProjectData';
import { useSuppliers } from '~/hooks/useSuppliers';
import { canEdit } from '~/lib/roles';
import { displayPOStatus, poTotals } from '~/lib/reconcile';
import { eur, eurFull, relDate } from '~/lib/format';
import type { DisplayPOStatus } from '~/types';
import '~/theme/page-layout.css';
import './PurchaseOrdersPage.css';

const STATUS_TABS: Array<DisplayPOStatus | 'all'> = [
  'all',
  'draft',
  'pending_approval',
  'approved',
  'partially_invoiced',
  'closed',
  'rejected',
];

export function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { purchaseOrders, loading } = useProjectData(project.id);
  const { suppliers } = useSuppliers(project.id);

  const [filter, setFilter] = useState<DisplayPOStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const writable = canEdit(role);
  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );

  const filtered = useMemo(() => {
    let list = purchaseOrders.slice();
    if (filter !== 'all') list = list.filter((p) => displayPOStatus(p) === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => {
        const s = supplierMap.get(p.supplierId);
        return (
          p.number.toLowerCase().includes(q) ||
          (s?.tradeName ?? '').toLowerCase().includes(q) ||
          (s?.legalName ?? '').toLowerCase().includes(q)
        );
      });
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [purchaseOrders, filter, query, supplierMap]);

  const totals = useMemo(() => {
    let committed = 0;
    let invoiced = 0;
    let active = 0;
    for (const p of purchaseOrders) {
      if (p.status === 'draft' || p.status === 'rejected') continue;
      const t = poTotals(p);
      committed += t.committed;
      invoiced += t.invoiced;
      active += 1;
    }
    return { committed, invoiced, remaining: committed - invoiced, active };
  }, [purchaseOrders]);

  const navigate = useNavigate();
  const goNew = () => navigate(`/app/p/${project.id}/purchase-orders/new`);

  return (
    <>
      <Topbar
        title={t('pos.pageTitle')}
        subtitle={
          purchaseOrders.length > 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>
              {purchaseOrders.length === 1
                ? t('pos.countOne')
                : t('pos.countOther', { count: purchaseOrders.length })}
            </span>
          ) : null
        }
        actions={
          writable ? (
            <Button
              variant="primary"
              size="sm"
              leading={<Icon name="plus" size={13} />}
              onClick={goNew}
            >
              {t('pos.newCta')}
            </Button>
          ) : null
        }
      />

      <div className="pos-page page-container">
        {purchaseOrders.length > 0 ? (
          <section className="pos-totals reveal reveal-d1">
            <div className="pos-total-cell">
              <span className="pos-total-label">{t('pos.totals.committed')}</span>
              <span className="pos-total-value num">{eurFull(totals.committed)}</span>
              <span className="pos-total-hint">
                {t('pos.totals.committedHint', { count: totals.active })}
              </span>
            </div>
            <div className="pos-total-cell">
              <span className="pos-total-label">{t('pos.totals.invoiced')}</span>
              <span className="pos-total-value num">{eurFull(totals.invoiced)}</span>
              <span className="pos-total-hint">
                {t('pos.totals.invoicedHint', {
                  pct: totals.committed
                    ? Math.round((totals.invoiced / totals.committed) * 100)
                    : 0,
                })}
              </span>
            </div>
            <div className="pos-total-cell">
              <span className="pos-total-label">{t('pos.totals.remaining')}</span>
              <span className="pos-total-value num">{eurFull(totals.remaining)}</span>
              <span className="pos-total-hint">{t('pos.totals.remainingHint')}</span>
            </div>
          </section>
        ) : null}

        {purchaseOrders.length > 0 ? (
          <section className="pos-filter reveal reveal-d2">
            <div className="pos-tabs" role="tablist">
              {STATUS_TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={['pos-tab', filter === key ? 'is-active' : null]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setFilter(key)}
                >
                  {t(`pos.status.${key}`)}
                </button>
              ))}
            </div>
            <div className="pos-search">
              <Field>
                <div className="input-with-icon">
                  <span className="input-with-icon-glyph">
                    <Icon name="search" size={14} />
                  </span>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('pos.searchPlaceholder')}
                  />
                </div>
              </Field>
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="pos-loader">
            <Spinner size={22} />
          </div>
        ) : purchaseOrders.length === 0 ? (
          <EmptyState writable={writable} onCreate={goNew} />
        ) : filtered.length === 0 ? (
          <Card size="lg" tone="muted" className="pos-empty-filter">
            <h3 className="display-sm">{t('pos.emptyFilter.title')}</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              {t('pos.emptyFilter.body')}
            </p>
          </Card>
        ) : (
          <section className="pos-list reveal reveal-d3">
            <div className="pos-row pos-row-head">
              <div>{t('pos.table.number')}</div>
              <div>{t('pos.table.supplier')}</div>
              <div className="text-right">{t('pos.table.committed')}</div>
              <div className="text-right">{t('pos.table.remaining')}</div>
              <div>{t('pos.table.progress')}</div>
              <div>{t('pos.table.status')}</div>
              <div />
            </div>
            {filtered.map((po) => {
              const t2 = poTotals(po);
              const rawPct = t2.committed ? Math.round((t2.invoiced / t2.committed) * 100) : 0;
              const over = rawPct > 100;
              const full = rawPct === 100;
              const pct = over ? rawPct : Math.min(100, rawPct);
              const displayStatus = displayPOStatus(po);
              const supplier = supplierMap.get(po.supplierId);
              return (
                <Link
                  key={po.id}
                  to={`/app/p/${project.id}/purchase-orders/${po.id}`}
                  className="pos-row pos-row-interactive"
                >
                  <div className="pos-row-number mono">{po.number.replace('PO-', '')}</div>
                  <div className="pos-row-supplier">
                    <div className="supplier-monogram pos-row-monogram">
                      {supplier?.monogram ?? '··'}
                    </div>
                    <div className="pos-row-supplier-text">
                      <span className="pos-row-supplier-name">
                        {supplier?.tradeName ?? po.supplierId}
                        {(() => {
                          const codes = [...new Set(po.lines.map((l) => l.categoryCode).filter(Boolean))];
                          if (!codes.length) return null;
                          return (
                            <span className="pos-row-category mono">
                              {codes[0]}{codes.length > 1 ? ` +${codes.length - 1}` : ''}
                            </span>
                          );
                        })()}
                      </span>
                      <span className="pos-row-supplier-meta muted">
                        {po.lines.length === 1
                          ? t('pos.table.linesOne')
                          : t('pos.table.linesOther', { count: po.lines.length })}{' '}
                        · {relDate(po.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right num pos-row-amount">{eur(t2.committed)}</div>
                  <div className={`text-right num pos-row-amount${over ? ' is-over' : ''}`}>
                    {over ? `+${eur(Math.abs(t2.remaining))}` : eur(Math.max(0, t2.remaining))}
                  </div>
                  <div className="pos-row-progress">
                    <Progress
                      value={Math.min(100, pct)}
                      size="thin"
                      tone={over ? 'over' : full ? 'solid' : 'striped'}
                    />
                    <span className={`pos-row-pct num${over ? ' pos-row-pct-over' : ''}`}>{pct}%</span>
                  </div>
                  <div>
                    <Pill status={displayStatus}>{t(`pos.statusLabel.${displayStatus}`)}</Pill>
                  </div>
                  <div className="pos-row-caret">
                    <Icon name="chevron-right" size={13} />
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}

function EmptyState({ writable, onCreate }: { writable: boolean; onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="pos-empty reveal reveal-d1">
      <div className="pos-empty-inner">
        <div className="pos-empty-mark">
          <Icon name="receipt-fill" size={24} />
        </div>
        <h2 className="display-md">{t('pos.empty.title')}</h2>
        <p>{t('pos.empty.body')}</p>
        {writable ? (
          <Button
            variant="primary"
            size="lg"
            leading={<Icon name="plus" size={14} />}
            onClick={onCreate}
          >
            {t('pos.newCta')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
