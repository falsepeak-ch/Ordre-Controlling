import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Field, Input, Textarea } from '~/components/ui/Input';
import { Spinner } from '~/components/ui/Spinner';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useSuppliers } from '~/hooks/useSuppliers';
import { useCategories } from '~/hooks/useCategories';
import { usePurchaseOrder } from '~/hooks/usePurchaseOrder';
import { useAuth } from '~/hooks/useAuth';
import { useToast } from '~/hooks/useToast';
import {
  blankLine,
  createDraftPO,
  deletePO,
  submitPOForApproval,
  updateDraftPO,
} from '~/lib/purchaseOrders';
import { canEdit } from '~/lib/roles';
import { eur, eurFull, initialsFromName } from '~/lib/format';
import type { POLine } from '~/types';
import './POFormPage.css';

export function POFormPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { poId } = useParams<{ poId?: string }>();
  const editing = Boolean(poId);

  const { suppliers, loading: suppliersLoading } = useSuppliers(project.id);
  const { categories } = useCategories(project.id);
  const { po, loading: poLoading, notFound } = usePurchaseOrder(
    project.id,
    poId,
  );

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<POLine[]>([blankLine()]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(!editing);

  // Hydrate the form once the PO loads (edit mode).
  useEffect(() => {
    if (!editing) return;
    if (!po) return;
    if (po.status !== 'draft') return;
    if (initialized) return;
    setSupplierId(po.supplierId);
    setNotes(po.notes ?? '');
    setLines(po.lines.length ? po.lines : [blankLine()]);
    setInitialized(true);
  }, [editing, po, initialized]);

  // Guard clauses
  if (!canEdit(role)) {
    return <Navigate to={`/app/p/${project.id}/purchase-orders`} replace />;
  }
  if (editing && notFound) {
    return <Navigate to={`/app/p/${project.id}/purchase-orders`} replace />;
  }
  if (editing && po && po.status !== 'draft') {
    return <Navigate to={`/app/p/${project.id}/purchase-orders/${po.id}`} replace />;
  }

  const loading = suppliersLoading || (editing && (poLoading || !initialized));

  // ---- Helpers ----
  const totalCommitted = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    [lines],
  );

  function setLine(idx: number, patch: Partial<POLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }

  function validBasic() {
    if (!supplierId) {
      push({ message: t('poForm.noSupplier'), icon: 'x-circle-fill', tone: 'error' });
      return false;
    }
    const withContent = lines.filter(
      (l) => l.description.trim() && l.quantity > 0 && l.unitPrice > 0,
    );
    if (!withContent.length) {
      push({ message: t('poForm.noLines'), icon: 'x-circle-fill', tone: 'error' });
      return false;
    }
    return true;
  }

  const author = {
    uid: user?.uid ?? '',
    displayName: user?.displayName ?? user?.email ?? 'You',
    initials: initialsFromName(user?.displayName ?? user?.email ?? ''),
  };

  async function saveDraft(): Promise<string | null> {
    if (savingDraft) return null;
    if (!supplierId) {
      push({ message: t('poForm.noSupplier'), icon: 'x-circle-fill', tone: 'error' });
      return null;
    }
    setSavingDraft(true);
    try {
      if (editing && po) {
        await updateDraftPO(project.id, po.id, {
          supplierId,
          notes,
          lines: lines.filter((l) => l.description.trim()),
        });
        push({ message: t('poForm.savedDraftToast'), icon: 'check-circle-fill' });
        return po.id;
      }
      const id = await createDraftPO(project.id, author, {
        supplierId,
        notes,
        lines: lines.filter((l) => l.description.trim()),
      });
      push({ message: t('poForm.savedDraftToast'), icon: 'check-circle-fill' });
      return id;
    } catch (err) {
      console.warn('[poForm] saveDraft failed', err);
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
      return null;
    } finally {
      setSavingDraft(false);
    }
  }

  async function onSubmitForApproval() {
    if (!validBasic()) return;
    setSubmitting(true);
    try {
      const id = await saveDraft();
      if (!id) return;
      // Fetch a fresh PO snapshot to pass into submitPOForApproval — we
      // specifically need the (possibly new) lines + supplierId as stored.
      const reloaded = po ?? {
        id,
        number: '',
        supplierId,
        status: 'draft' as const,
        currency: 'EUR' as const,
        createdBy: author.displayName,
        createdAt: new Date().toISOString(),
        submittedAt: null,
        approvedAt: null,
        closedAt: null,
        notes: notes,
        lines,
        approvals: [],
        invoices: [],
      };
      await submitPOForApproval(project.id, { ...reloaded, id });
      push({ message: t('poForm.submittedToast'), icon: 'check-circle-fill' });
      navigate(`/app/p/${project.id}/purchase-orders/${id}`);
    } catch (err) {
      const code = (err as Error).message;
      console.warn('[poForm] submit failed', err);
      if (code === 'no-approvers-available') {
        push({ message: t('poForm.noApprovers'), icon: 'x-circle-fill', tone: 'error' });
      } else {
        push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteDraft() {
    if (!editing || !po) return;
    if (!window.confirm(t('poForm.confirmDeleteDraft'))) return;
    try {
      await deletePO(project.id, po.id);
      push({ message: t('poForm.draftDeletedToast'), icon: 'check-circle-fill' });
      navigate(`/app/p/${project.id}/purchase-orders`);
    } catch (err) {
      console.warn('[poForm] delete failed', err);
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
    }
  }

  return (
    <>
      <Topbar
        title={
          <Link
            to={`/app/p/${project.id}/purchase-orders`}
            className="po-back-link"
          >
            <Icon name="arrow-left" size={14} />
            {t('poDetail.back')}
          </Link>
        }
        actions={
          <>
            {editing && po ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeleteDraft}
                leading={<Icon name="trash-fill" size={13} />}
              >
                {t('poForm.deleteDraft')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveDraft()}
              isLoading={savingDraft}
              disabled={submitting}
            >
              {savingDraft ? t('poForm.savingDraft') : t('poForm.saveDraftShort')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onSubmitForApproval}
              isLoading={submitting}
              leading={<Icon name="shield-fill-check" size={13} />}
              disabled={savingDraft}
            >
              {submitting ? t('poForm.submitting') : t('poForm.submit')}
            </Button>
          </>
        }
      />

      <div className="po-form-page">
        {loading ? (
          <div className="po-form-loader"><Spinner size={22} /></div>
        ) : (
          <>
            <section className="po-form-hero reveal">
              <span className="eyebrow">{t('nav.purchaseOrders')}</span>
              <h1 className="display-xl">
                {editing ? t('poForm.editTitle') : t('poForm.createTitle')}
              </h1>
              <p className="po-form-sub muted">
                {editing ? t('poForm.editSubtitle') : t('poForm.createSubtitle')}
              </p>
            </section>

            <section className="po-form-body reveal reveal-d1">
              <Card size="md" className="po-form-meta">
                <Field label={t('poForm.supplierLabel')}>
                  {suppliers.length === 0 ? (
                    <div className="po-form-missing">
                      <span className="muted" style={{ fontSize: 13 }}>
                        {t('poForm.supplierMissing')}
                      </span>
                      <Link
                        to={`/app/p/${project.id}/suppliers`}
                        className="btn btn-link btn-size-sm"
                      >
                        {t('poForm.goCreateSupplier')} →
                      </Link>
                    </div>
                  ) : (
                    <select
                      className="input po-form-select"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                    >
                      <option value="">{t('poForm.supplierPlaceholder')}</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.tradeName || s.legalName}
                          {s.taxId ? ` — ${s.taxId}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field
                  label={
                    <span>
                      {t('poForm.notesLabel')}
                      <span
                        style={{
                          color: 'var(--fg-muted)',
                          fontWeight: 400,
                          marginLeft: 6,
                        }}
                      >
                        {t('poForm.notesHint')}
                      </span>
                    </span>
                  }
                >
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={t('poForm.notesPlaceholder')}
                    maxLength={500}
                  />
                </Field>
              </Card>

              <Card size="md" className="po-form-lines">
                <div className="po-form-lines-head">
                  <h3 className="display-sm mb-0">{t('poForm.linesTitle')}</h3>
                  <span className="count-chip">{lines.length}</span>
                </div>

                <div className="po-form-line po-form-line-head">
                  <div>{t('poForm.lineDescription')}</div>
                  <div>{t('poForm.lineCategory')}</div>
                  <div className="text-right">{t('poForm.lineQty')}</div>
                  <div className="text-right">{t('poForm.lineUnitPrice')}</div>
                  <div className="text-right">{t('poForm.lineSubtotal')}</div>
                  <div />
                </div>

                {lines.map((l, idx) => {
                  const sub = l.quantity * l.unitPrice;
                  return (
                    <div key={l.id} className="po-form-line">
                      <Input
                        value={l.description}
                        onChange={(e) => setLine(idx, { description: e.target.value })}
                        placeholder={t('poForm.lineDescriptionPlaceholder')}
                      />
                      <select
                        className="input"
                        value={l.categoryId ?? ''}
                        onChange={(e) => {
                          const cat = categories.find((c) => c.id === e.target.value) ?? null;
                          setLine(idx, {
                            categoryId: cat?.id ?? null,
                            categoryCode: cat?.code ?? null,
                            categoryConcept: cat?.concept ?? null,
                          });
                        }}
                      >
                        <option value="">{t('poCategory.pickerPlaceholder')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {c.concept}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={l.quantity}
                        onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                        className="text-right num"
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.01}
                        value={l.unitPrice}
                        onChange={(e) => setLine(idx, { unitPrice: Number(e.target.value) })}
                        className="text-right num"
                      />
                      <div className="po-form-line-subtotal num">{eurFull(sub)}</div>
                      <button
                        type="button"
                        className="po-form-line-remove"
                        onClick={() => removeLine(idx)}
                        aria-label={t('poForm.lineRemove')}
                        disabled={lines.length <= 1}
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  );
                })}

                <div className="po-form-lines-foot">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addLine}
                    leading={<Icon name="plus" size={13} />}
                  >
                    {t('poForm.addLine')}
                  </Button>

                  <div className="po-form-total">
                    <span className="muted" style={{ fontSize: 12 }}>
                      {t('poForm.totalCommitted')}
                    </span>
                    <span className="num po-form-total-value">
                      {eur(totalCommitted)}
                    </span>
                  </div>
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </>
  );
}
