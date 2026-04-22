import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Field, Input } from '~/components/ui/Input';
import { Spinner } from '~/components/ui/Spinner';
import { SupplierFormModal } from '~/components/SupplierFormModal';
import { SupplierDocsModal } from '~/components/SupplierDocsModal';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useSuppliers } from '~/hooks/useSuppliers';
import { useProjectData } from '~/hooks/useProjectData';
import { useToast } from '~/hooks/useToast';
import { useConfirm } from '~/hooks/useConfirm';
import { canEdit } from '~/lib/roles';
import { deleteSupplier } from '~/lib/suppliers';
import { eur } from '~/lib/format';
import { poTotals } from '~/lib/reconcile';
import type { Supplier } from '~/types';
import '~/theme/page-layout.css';
import './SuppliersPage.css';

export function SuppliersPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { suppliers, loading } = useSuppliers(project.id);
  const { purchaseOrders } = useProjectData(project.id);
  const { push } = useToast();
  const confirm = useConfirm();

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [docsFor, setDocsFor] = useState<Supplier | null>(null);

  const writable = canEdit(role);

  const filtered = useMemo(() => {
    if (!query.trim()) return suppliers;
    const q = query.trim().toLowerCase();
    return suppliers.filter((s) =>
      [s.tradeName, s.legalName, s.taxId, s.email, ...(s.tags ?? [])]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q)),
    );
  }, [suppliers, query]);

  const statsBySupplier = useMemo(() => {
    const map = new Map<string, { openCount: number; committed: number }>();
    for (const po of purchaseOrders) {
      const prev = map.get(po.supplierId) ?? { openCount: 0, committed: 0 };
      if (po.status !== 'draft' && po.status !== 'rejected') {
        const t = poTotals(po);
        prev.committed += t.committed;
        if (po.status !== 'closed') prev.openCount += 1;
      }
      map.set(po.supplierId, prev);
    }
    return map;
  }, [purchaseOrders]);

  async function handleDelete(s: Supplier) {
    const ok = await confirm({
      title: t('suppliers.form.confirmDelete', { name: s.tradeName || s.legalName }),
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteSupplier(project.id, s.id);
      push({ message: t('suppliers.form.deleted'), icon: 'check-circle-fill' });
    } catch {
      push({ message: t('signup.error'), icon: 'x-circle-fill', tone: 'error' });
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <>
      <Topbar
        title={t('suppliers.pageTitle')}
        subtitle={
          suppliers.length > 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>
              {suppliers.length === 1
                ? t('suppliers.countOne')
                : t('suppliers.countOther', { count: suppliers.length })}
            </span>
          ) : null
        }
        actions={
          writable ? (
            <Button variant="primary" size="sm" leading={<Icon name="plus" size={13} />} onClick={openCreate}>
              {t('suppliers.newCta')}
            </Button>
          ) : null
        }
      />

      <div className="suppliers-page page-container">
        {suppliers.length > 0 ? (
          <section className="suppliers-filter reveal reveal-d1">
            <Field>
              <div className="input-with-icon">
                <span className="input-with-icon-glyph">
                  <Icon name="search" size={14} />
                </span>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('suppliers.searchPlaceholder')}
                />
              </div>
            </Field>
          </section>
        ) : null}

        {loading ? (
          <div className="suppliers-loader">
            <Spinner size={22} />
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState writable={writable} onCreate={openCreate} />
        ) : filtered.length === 0 ? (
          <Card size="lg" tone="muted" className="suppliers-empty-filter">
            <h3 className="display-sm">{t('suppliers.emptyFilter.title')}</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              {t('suppliers.emptyFilter.body')}
            </p>
          </Card>
        ) : (
          <section className="suppliers-grid reveal reveal-d2">
            {filtered.map((s) => {
              const stats = statsBySupplier.get(s.id);
              return (
                <SupplierCard
                  key={s.id}
                  supplier={s}
                  openPOs={stats?.openCount ?? 0}
                  committed={stats?.committed ?? 0}
                  canEdit={writable}
                  onEdit={() => openEdit(s)}
                  onDelete={() => handleDelete(s)}
                  onOpenDocs={() => setDocsFor(s)}
                />
              );
            })}
          </section>
        )}

        {!writable ? (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {t('suppliers.viewerNotice')}
          </p>
        ) : null}
      </div>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={project.id}
        supplier={editing}
      />

      {docsFor ? (
        <SupplierDocsModal
          open={docsFor !== null}
          onClose={() => setDocsFor(null)}
          projectId={project.id}
          supplier={docsFor}
          canEdit={writable}
        />
      ) : null}
    </>
  );
}

function EmptyState({ writable, onCreate }: { writable: boolean; onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="suppliers-empty reveal reveal-d1">
      <div className="suppliers-empty-inner">
        <div className="suppliers-empty-mark">
          <Icon name="building-fill" size={24} />
        </div>
        <h2 className="display-md">{t('suppliers.empty.title')}</h2>
        <p>{t('suppliers.empty.body')}</p>
        {writable ? (
          <Button
            variant="primary"
            size="lg"
            leading={<Icon name="plus" size={14} />}
            onClick={onCreate}
          >
            {t('suppliers.newCta')}
          </Button>
        ) : (
          <p className="muted" style={{ fontSize: 12 }}>{t('suppliers.viewerNotice')}</p>
        )}
      </div>
    </section>
  );
}

function SupplierCard({
  supplier,
  openPOs,
  committed,
  canEdit: writable,
  onEdit,
  onDelete,
  onOpenDocs,
}: {
  supplier: Supplier;
  openPOs: number;
  committed: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDocs: () => void;
}) {
  const { t } = useTranslation();
  const seedDocsCount = (supplier.docs ?? []).length;
  return (
    <article className="supplier-card">
      <header className="supplier-card-head">
        <div className="supplier-monogram">{supplier.monogram}</div>
        <div className="supplier-card-heading">
          <h3 className="supplier-name">{supplier.tradeName || supplier.legalName}</h3>
          <span className="supplier-tax mono">{supplier.taxId || '—'}</span>
        </div>
        {writable ? (
          <div className="supplier-card-actions">
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label={t('common.edit')}>
              <Icon name="pencil-fill" size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} aria-label={t('common.remove')}>
              <Icon name="trash-fill" size={13} />
            </Button>
          </div>
        ) : null}
      </header>

      <button
        type="button"
        className="supplier-docs-link"
        onClick={onOpenDocs}
      >
        <Icon name="file-earmark-text-fill" size={12} />
        <span>
          {seedDocsCount > 0
            ? t('supplierDocs.docsLink', { count: seedDocsCount })
            : t('supplierDocs.sectionTitle')}
        </span>
      </button>

      {supplier.tags && supplier.tags.length > 0 ? (
        <div className="supplier-tags">
          {supplier.tags.map((tag) => (
            <span key={tag} className="supplier-tag">{tag}</span>
          ))}
        </div>
      ) : null}

      <dl className="supplier-stats">
        <div>
          <dt>{t('suppliers.card.paymentTerms')}</dt>
          <dd className="mono" style={{ fontSize: 12 }}>{supplier.paymentTerms || 'Net 30'}</dd>
        </div>
        <div>
          <dt>{t('suppliers.card.openPOs')}</dt>
          <dd className="num">{openPOs}</dd>
        </div>
        <div>
          <dt>{t('suppliers.card.totalCommitted')}</dt>
          <dd className="num">{committed ? eur(committed) : '—'}</dd>
        </div>
      </dl>

      <footer className="supplier-card-foot">
        {supplier.email ? (
          <a className="supplier-contact" href={`mailto:${supplier.email}`}>
            <Icon name="envelope-fill" size={12} />
            <span>{supplier.email}</span>
          </a>
        ) : null}
        {supplier.phone ? (
          <span className="supplier-contact">
            <Icon name="telephone-fill" size={12} />
            <span>{supplier.phone}</span>
          </span>
        ) : null}
      </footer>
    </article>
  );
}
