import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Field, Input } from '~/components/ui/Input';
import { Spinner } from '~/components/ui/Spinner';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useProjectData } from '~/hooks/useProjectData';
import { eur, eurFull, formatDate } from '~/lib/format';
import type { Invoice, PurchaseOrder, Supplier } from '~/types';
import './InvoicesPage.css';

interface InvoiceRow {
  invoice: Invoice;
  po: PurchaseOrder;
  supplier: Supplier | undefined;
}

export function InvoicesPage() {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { purchaseOrders, suppliers, loading } = useProjectData(project.id);

  const [query, setQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );

  const allRows: InvoiceRow[] = useMemo(
    () =>
      purchaseOrders.flatMap((po) =>
        (po.invoices ?? []).map((invoice) => ({
          invoice,
          po,
          supplier: supplierMap.get(po.supplierId),
        })),
      ),
    [purchaseOrders, supplierMap],
  );

  const filtered = useMemo(() => {
    let list = allRows.slice();
    if (supplierFilter !== 'all') {
      list = list.filter((r) => r.po.supplierId === supplierFilter);
    }
    if (poFilter !== 'all') {
      list = list.filter((r) => r.po.id === poFilter);
    }
    if (dateFrom) {
      list = list.filter((r) => (r.invoice.issueDate ?? '') >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((r) => (r.invoice.issueDate ?? '') <= dateTo);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.invoice.number.toLowerCase().includes(q));
    }
    return list.sort((a, b) =>
      (b.invoice.issueDate ?? '').localeCompare(a.invoice.issueDate ?? ''),
    );
  }, [allRows, supplierFilter, poFilter, dateFrom, dateTo, query]);

  const totals = useMemo(() => {
    const total = allRows.reduce((sum, r) => sum + r.invoice.total, 0);
    const count = allRows.length;
    return { total, count, avg: count > 0 ? total / count : 0 };
  }, [allRows]);

  return (
    <>
      <Topbar title={t('invoices.pageTitle')} />

      <div className="inv-page">
        <section className="inv-hero reveal">
          <span className="eyebrow">
            {allRows.length === 1
              ? t('invoices.countOne')
              : t('invoices.countOther', { count: allRows.length })}
          </span>
          <h1 className="display-xl">{t('invoices.pageTitle')}</h1>
          <p className="inv-hero-sub">
            {t('invoices.heroSubtitle', { project: project.name })}
          </p>
        </section>

        {allRows.length > 0 ? (
          <section className="inv-totals reveal reveal-d1">
            <div className="inv-total-cell">
              <span className="inv-total-label">{t('invoices.totals.totalInvoiced')}</span>
              <span className="inv-total-value num">{eurFull(totals.total)}</span>
              <span className="inv-total-hint">{t('invoices.countOther', { count: totals.count })}</span>
            </div>
            <div className="inv-total-cell">
              <span className="inv-total-label">{t('invoices.totals.invoiceCount')}</span>
              <span className="inv-total-value num">{totals.count}</span>
              <span className="inv-total-hint">&nbsp;</span>
            </div>
            <div className="inv-total-cell">
              <span className="inv-total-label">{t('invoices.totals.avgInvoice')}</span>
              <span className="inv-total-value num">{eur(totals.avg)}</span>
              <span className="inv-total-hint">&nbsp;</span>
            </div>
          </section>
        ) : null}

        {allRows.length > 0 ? (
          <section className="inv-filter reveal reveal-d2">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              aria-label={t('invoices.allSuppliers')}
            >
              <option value="all">{t('invoices.allSuppliers')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.tradeName ?? s.legalName}
                </option>
              ))}
            </select>

            <select
              value={poFilter}
              onChange={(e) => setPoFilter(e.target.value)}
              aria-label={t('invoices.allPOs')}
            >
              <option value="all">{t('invoices.allPOs')}</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.number}
                </option>
              ))}
            </select>

            <div className="inv-filter-dates">
              <label>{t('invoices.dateFrom')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: 140 }}
              />
            </div>
            <div className="inv-filter-dates">
              <label>{t('invoices.dateTo')}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: 140 }}
              />
            </div>

            <div className="inv-search">
              <Field>
                <div className="input-with-icon">
                  <span className="input-with-icon-glyph">
                    <Icon name="search" size={14} />
                  </span>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('invoices.searchPlaceholder')}
                  />
                </div>
              </Field>
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="inv-loader">
            <Spinner size={22} />
          </div>
        ) : allRows.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <Card size="lg" tone="muted" className="inv-empty-filter">
            <h3 className="display-sm">{t('invoices.emptyFilter.title')}</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              {t('invoices.emptyFilter.body')}
            </p>
          </Card>
        ) : (
          <section className="inv-list reveal reveal-d3">
            <div className="inv-row inv-row-head">
              <div>{t('invoices.table.number')}</div>
              <div>{t('invoices.table.poRef')}</div>
              <div>{t('invoices.table.supplier')}</div>
              <div>{t('invoices.table.issueDate')}</div>
              <div>{t('invoices.table.dueDate')}</div>
              <div className="text-right">{t('invoices.table.total')}</div>
              <div>{t('invoices.table.uploadedBy')}</div>
              <div />
            </div>
            {filtered.map((row) => (
              <Link
                key={`${row.po.id}-${row.invoice.id}`}
                to={`/app/p/${project.id}/purchase-orders/${row.po.id}`}
                className="inv-row inv-row-interactive"
              >
                <div className="inv-row-number">{row.invoice.number}</div>
                <div className="inv-row-po">{row.po.number.replace('PO-', '')}</div>
                <div className="inv-row-supplier">
                  <span className="inv-row-supplier-name">
                    {row.supplier?.tradeName ?? row.supplier?.legalName ?? row.po.supplierId}
                  </span>
                </div>
                <div className="inv-row-date">{formatDate(row.invoice.issueDate)}</div>
                <div className="inv-row-date">{formatDate(row.invoice.dueDate)}</div>
                <div className="inv-row-total">{eur(row.invoice.total)}</div>
                <div className="inv-row-uploader">{row.invoice.uploadedBy ?? '—'}</div>
                <div className="inv-row-caret">
                  <Icon name="chevron-right" size={13} />
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <section className="inv-empty reveal reveal-d1">
      <div className="inv-empty-inner">
        <div className="inv-empty-mark">
          <Icon name="file-earmark-text-fill" size={24} />
        </div>
        <h2 className="display-md">{t('invoices.empty.title')}</h2>
        <p>{t('invoices.empty.body')}</p>
      </div>
    </section>
  );
}
