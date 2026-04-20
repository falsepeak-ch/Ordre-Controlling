import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Pill } from '~/components/ui/Pill';
import { Progress } from '~/components/ui/Progress';
import { Avatar } from '~/components/ui/Avatar';
import { Spinner } from '~/components/ui/Spinner';
import { PODecisionModal } from '~/components/PODecisionModal';
import { InvoiceFormModal } from '~/components/InvoiceFormModal';
import { useAuth } from '~/hooks/useAuth';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { usePurchaseOrder } from '~/hooks/usePurchaseOrder';
import { useSuppliers } from '~/hooks/useSuppliers';
import { useToast } from '~/hooks/useToast';
import { poTotals, lineCommitted, lineInvoiced } from '~/lib/reconcile';
import { canEdit } from '~/lib/roles';
import { closePO, isApproverFor, submitPOForApproval } from '~/lib/purchaseOrders';
import { deleteInvoice } from '~/lib/invoices';
import { eur, eurFull, formatDate } from '~/lib/format';
import type { Invoice, POLine, PurchaseOrder } from '~/types';
import './PODetailPage.css';

export function PODetailPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { user } = useAuth();
  const { poId } = useParams<{ poId: string }>();
  const { po, loading, notFound } = usePurchaseOrder(project.id, poId);
  const { suppliers } = useSuppliers(project.id);
  const { push } = useToast();
  const navigate = useNavigate();
  const [decisionMode, setDecisionMode] = useState<null | 'approve' | 'reject'>(null);
  const [busyAction, setBusyAction] = useState<null | 'submit' | 'close'>(null);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [invoiceBeingEdited, setInvoiceBeingEdited] = useState<Invoice | null>(null);

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === po?.supplierId),
    [suppliers, po],
  );

  const totals = useMemo(() => (po ? poTotals(po) : null), [po]);

  function openNewInvoice() {
    setInvoiceBeingEdited(null);
    setInvoiceFormOpen(true);
  }
  function openEditInvoice(inv: Invoice) {
    setInvoiceBeingEdited(inv);
    setInvoiceFormOpen(true);
  }
  async function handleDeleteInvoice(inv: Invoice) {
    if (!window.confirm(t('invoiceForm.confirmDelete'))) return;
    try {
      await deleteInvoice(project.id, po?.id ?? '', inv);
      push({ message: t('invoiceForm.deletedToast'), icon: 'check-circle-fill' });
    } catch (err) {
      console.warn('[poDetail] invoice delete failed', err);
      push({ message: t('invoiceForm.error'), icon: 'x-circle-fill', tone: 'error' });
    }
  }

  if (notFound) return <Navigate to={`/app/p/${project.id}/purchase-orders`} replace />;
  if (loading || !po || !totals) {
    return (
      <>
        <Topbar title={t('poDetail.back')} />
        <div className="po-detail-loader">
          <Spinner size={24} />
        </div>
      </>
    );
  }

  const pct = totals.committed
    ? Math.min(100, Math.round((totals.invoiced / totals.committed) * 100))
    : 0;
  const overInvoiced = totals.invoiced > totals.committed;

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
          <POActions
            po={po}
            projectId={project.id}
            userRole={role}
            userUid={user?.uid}
            busy={busyAction}
            onEditDraft={() =>
              navigate(`/app/p/${project.id}/purchase-orders/${po.id}/edit`)
            }
            onSubmit={async () => {
              setBusyAction('submit');
              try {
                await submitPOForApproval(project.id, po, project);
                push({ message: t('poForm.submittedToast'), icon: 'check-circle-fill' });
              } catch (err) {
                const code = (err as Error).message;
                if (code === 'no-approvers-available') {
                  push({ message: t('poForm.noApprovers'), icon: 'x-circle-fill', tone: 'error' });
                } else {
                  push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
                }
              } finally {
                setBusyAction(null);
              }
            }}
            onApprove={() => setDecisionMode('approve')}
            onReject={() => setDecisionMode('reject')}
            onClose={async () => {
              if (!window.confirm(t('poActions.closeConfirm'))) return;
              setBusyAction('close');
              try {
                await closePO(project.id, po.id);
                push({ message: t('poActions.closedToast'), icon: 'check-circle-fill' });
              } catch {
                push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
              } finally {
                setBusyAction(null);
              }
            }}
          />
        }
      />

      {user ? (
        <PODecisionModal
          open={decisionMode !== null}
          mode={decisionMode ?? 'approve'}
          po={po}
          projectId={project.id}
          approverUid={user.uid}
          onClose={() => setDecisionMode(null)}
        />
      ) : null}

      <InvoiceFormModal
        open={invoiceFormOpen}
        onClose={() => setInvoiceFormOpen(false)}
        projectId={project.id}
        po={po}
        invoice={invoiceBeingEdited}
        uploadedBy={user?.displayName ?? user?.email ?? 'You'}
      />

      <div className="po-detail-page">
        <section className="po-hero reveal">
          <div className="po-hero-status">
            <Pill status={po.status}>{t(`pos.statusLabel.${po.status}`)}</Pill>
            {po.categoryCode ? (
              <span className="po-hero-category">
                <span className="po-hero-category-code mono">{po.categoryCode}</span>
                {po.categoryConcept ? (
                  <span className="po-hero-category-concept">{po.categoryConcept}</span>
                ) : null}
              </span>
            ) : null}
            {supplier?.tags?.[0] ? (
              <span className="po-hero-tag">{supplier.tags[0]}</span>
            ) : null}
          </div>

          <h1 className="po-hero-title num">{po.number}</h1>

          <div className="po-hero-meta">
            {supplier ? (
              <div className="po-hero-supplier">
                <div className="supplier-monogram po-hero-monogram">{supplier.monogram}</div>
                <div className="po-hero-supplier-text">
                  <span className="po-hero-supplier-name">{supplier.tradeName}</span>
                  <span className="po-hero-supplier-meta mono">
                    {supplier.taxId} · {supplier.paymentTerms}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="po-hero-dates">
              <span>
                {t('poDetail.headerCreated', {
                  date: formatDate(po.createdAt),
                  by: po.createdBy,
                })}
              </span>
              {po.submittedAt ? (
                <span>
                  · {t('poDetail.headerSubmitted', { date: formatDate(po.submittedAt) })}
                </span>
              ) : null}
              {po.approvedAt ? (
                <span>
                  · {t('poDetail.headerApproved', { date: formatDate(po.approvedAt) })}
                </span>
              ) : null}
              {po.closedAt ? (
                <span>· {t('poDetail.headerClosed', { date: formatDate(po.closedAt) })}</span>
              ) : null}
            </div>
          </div>

          {po.notes ? <p className="po-hero-notes muted">{po.notes}</p> : null}
        </section>

        {overInvoiced ? (
          <section className="po-warning reveal reveal-d1">
            <Icon name="x-circle-fill" size={14} />
            <span>{t('poDetail.overBudgetWarning')}</span>
          </section>
        ) : null}

        <section className="po-totals reveal reveal-d1">
          <div className="po-total-cell">
            <span className="pos-total-label">{t('poDetail.lineCommitted')}</span>
            <span className="pos-total-value num">{eurFull(totals.committed)}</span>
            <span className="pos-total-hint">
              {po.lines.length === 1
                ? t('pos.table.linesOne')
                : t('pos.table.linesOther', { count: po.lines.length })}
            </span>
          </div>
          <div className="po-total-cell">
            <span className="pos-total-label">{t('poDetail.lineInvoiced')}</span>
            <span className="pos-total-value num">{eurFull(totals.invoiced)}</span>
            <span className="pos-total-hint">
              {po.invoices.length === 1
                ? t('poDetail.invoicesCountOne')
                : t('poDetail.invoicesCountOther', { count: po.invoices.length })}{' '}
              · {pct}%
            </span>
          </div>
          <div className="po-total-cell">
            <span className="pos-total-label">{t('poDetail.lineRemaining')}</span>
            <span
              className={['pos-total-value', 'num', overInvoiced ? 'is-over' : null]
                .filter(Boolean)
                .join(' ')}
            >
              {eurFull(Math.abs(totals.remaining))}
            </span>
            <span className="pos-total-hint">
              {overInvoiced
                ? t('poDetail.lineOverInvoiced')
                : t('pos.totals.remainingHint')}
            </span>
          </div>
        </section>

        <section className="po-split reveal reveal-d2">
          <div className="po-split-main">
            <div className="po-block">
              <div className="po-block-head">
                <h3 className="display-sm mb-0">{t('poDetail.lineItemsTitle')}</h3>
                <span className="count-chip">{po.lines.length}</span>
                <span className="grow" />
                <span className="muted" style={{ fontSize: 12 }}>
                  {t('poDetail.lineItemsSubtitle')}
                </span>
              </div>

              <div className="po-lines">
                <div className="po-line po-line-head">
                  <div>{t('suppliers.form.notesLabel').toLocaleUpperCase?.() || 'ITEM'}</div>
                  <div className="text-right">{t('poDetail.lineCommitted')}</div>
                  <div className="text-right">{t('poDetail.lineInvoiced')}</div>
                  <div className="text-right">{t('poDetail.lineRemaining')}</div>
                  <div>{t('poDetail.lineProgress')}</div>
                </div>

                {po.lines.map((line) => (
                  <LineRow key={line.id} line={line} po={po} />
                ))}
              </div>
            </div>

            <div className="po-block">
              <div className="po-block-head">
                <h3 className="display-sm mb-0">{t('poDetail.invoicesTitle')}</h3>
                <span className="count-chip">{po.invoices.length}</span>
                <span className="grow" />
                {canEdit(role) && po.status === 'approved' ? (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={openNewInvoice}
                    leading={<Icon name="plus" size={13} />}
                  >
                    {t('poDetail.addInvoiceCta')}
                  </Button>
                ) : null}
              </div>

              {po.invoices.length === 0 ? (
                <Card size="md" tone="muted" className="po-empty-inline">
                  <Icon name="file-earmark-text-fill" size={18} />
                  <span className="muted">
                    {canEdit(role)
                      ? t('poDetail.invoicesEmpty')
                      : t('poDetail.invoicesEmptyRole')}
                  </span>
                </Card>
              ) : (
                <ul className="po-invoices">
                  {po.invoices.map((inv) => (
                    <li key={inv.id} className="po-invoice">
                      <button
                        type="button"
                        className="po-invoice-doc po-invoice-doc-btn"
                        onClick={() => inv.fileUrl && window.open(inv.fileUrl, '_blank', 'noopener')}
                        disabled={!inv.fileUrl}
                        aria-label={inv.fileName ?? inv.file ?? inv.number}
                      >
                        <Icon name="file-earmark-text-fill" size={18} />
                      </button>
                      <div className="po-invoice-main">
                        <span className="po-invoice-number mono">
                          {inv.fileUrl ? (
                            <a
                              href={inv.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="po-invoice-link"
                            >
                              {inv.number}
                            </a>
                          ) : (
                            inv.number
                          )}
                        </span>
                        <span className="po-invoice-meta">
                          {t('poDetail.invoiceIssued', {
                            date: formatDate(inv.issueDate),
                          })}{' '}
                          · {t('poDetail.invoiceDue', { date: formatDate(inv.dueDate) })} ·{' '}
                          {t('poDetail.invoiceUploadedBy', { by: inv.uploadedBy })}
                          {inv.fileSize ? ` · ${inv.fileSize}` : ''}
                        </span>
                        <ul className="po-invoice-lines">
                          {inv.lines.map((il) => {
                            const line = po.lines.find((l) => l.id === il.lineId);
                            return (
                              <li key={il.lineId + il.amount} className="po-invoice-mapped">
                                <span className="po-invoice-mapped-arrow">↳</span>
                                <span className="po-invoice-mapped-desc">
                                  {line?.description ?? t('poDetail.pickLabel')}
                                </span>
                                <span className="num po-invoice-mapped-amount">
                                  {eurFull(il.amount)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div className="po-invoice-right">
                        <div className="po-invoice-total num">{eurFull(inv.total)}</div>
                        {canEdit(role) ? (
                          <div className="po-invoice-actions">
                            <button
                              type="button"
                              className="po-invoice-action"
                              onClick={() => openEditInvoice(inv)}
                              aria-label={t('common.edit')}
                            >
                              <Icon name="pencil-fill" size={12} />
                            </button>
                            <button
                              type="button"
                              className="po-invoice-action"
                              onClick={() => handleDeleteInvoice(inv)}
                              aria-label={t('common.remove')}
                            >
                              <Icon name="trash-fill" size={12} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className="po-split-aside">
            <div className="po-block">
              <div className="po-block-head">
                <h3 className="display-sm mb-0">{t('poDetail.approvalTrailTitle')}</h3>
              </div>

              <ul className="po-timeline">
                <li className="po-timeline-item is-done">
                  <span className="po-timeline-glyph" aria-hidden="true" />
                  <div className="po-timeline-main">
                    <div className="po-timeline-row">
                      <Avatar name={po.createdBy} size="sm" />
                      <strong>{po.createdBy}</strong>
                      <span className="muted po-timeline-time">{formatDate(po.createdAt)}</span>
                    </div>
                    <span className="muted">
                      {po.lines.length === 1
                        ? t('pos.table.linesOne')
                        : t('pos.table.linesOther', { count: po.lines.length })}{' '}
                      · {eur(totals.committed)}
                    </span>
                  </div>
                </li>

                {po.approvals.map((a) => (
                  <li
                    key={a.id}
                    className={[
                      'po-timeline-item',
                      a.decision === 'approved'
                        ? 'is-done'
                        : a.decision === 'rejected'
                          ? 'is-reject'
                          : 'is-active',
                    ].join(' ')}
                  >
                    <span className="po-timeline-glyph" aria-hidden="true" />
                    <div className="po-timeline-main">
                      <div className="po-timeline-row">
                        <Avatar initials={a.initials} size="sm" />
                        <strong>{a.approver}</strong>
                        <span className="muted po-timeline-time">
                          {a.decidedAt
                            ? formatDate(a.decidedAt)
                            : t('poDetail.approvalPendingNote', { name: a.approver })}
                        </span>
                      </div>
                      {a.comment ? <span className="muted">{a.comment}</span> : null}
                      {a.role ? <span className="muted" style={{ fontSize: 11.5 }}>{a.role}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {supplier ? (
              <div className="po-block">
                <div className="po-block-head">
                  <h3 className="display-sm mb-0">{t('poDetail.supplierTitle')}</h3>
                </div>
                <div className="po-supplier-card">
                  <div className="po-supplier-head">
                    <div className="supplier-monogram">{supplier.monogram}</div>
                    <div>
                      <div className="po-supplier-name">{supplier.tradeName}</div>
                      <div className="mono muted" style={{ fontSize: 11.5 }}>
                        {supplier.taxId}
                      </div>
                    </div>
                  </div>
                  <ul className="po-supplier-contact">
                    {supplier.email ? (
                      <li>
                        <Icon name="envelope-fill" size={12} />
                        <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                      </li>
                    ) : null}
                    {supplier.phone ? (
                      <li>
                        <Icon name="telephone-fill" size={12} />
                        <span>{supplier.phone}</span>
                      </li>
                    ) : null}
                    {supplier.address ? (
                      <li>
                        <Icon name="geo-alt-fill" size={12} />
                        <span>{supplier.address}</span>
                      </li>
                    ) : null}
                  </ul>
                  <Link
                    to={`/app/p/${project.id}/suppliers`}
                    className="btn btn-link btn-size-sm"
                    style={{ alignSelf: 'flex-start', padding: 0 }}
                  >
                    {t('suppliers.card.viewDetails')} →
                  </Link>
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </>
  );
}

// --- Top-bar actions, wired to the PO's current status + user's role ---
function POActions({
  po,
  projectId: _projectId,
  userRole,
  userUid,
  busy,
  onEditDraft,
  onSubmit,
  onApprove,
  onReject,
  onClose,
}: {
  po: PurchaseOrder;
  projectId: string;
  userRole: 'owner' | 'editor' | 'viewer';
  userUid: string | undefined;
  busy: null | 'submit' | 'close';
  onEditDraft: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const writable = canEdit(userRole);
  const approverHere = isApproverFor(po, userUid);
  const canClose = userRole === 'owner' && po.status === 'approved';

  // Draft: editor+ can edit draft or submit it.
  if (po.status === 'draft' && writable) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditDraft}
          leading={<Icon name="pencil-fill" size={13} />}
        >
          {t('poActions.editDraftCta')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onSubmit}
          isLoading={busy === 'submit'}
          leading={<Icon name="shield-fill-check" size={13} />}
        >
          {t('poActions.submitForApproval')}
        </Button>
      </>
    );
  }

  // Pending approval: the assigned approver can decide.
  if (po.status === 'pending_approval' && approverHere) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          leading={<Icon name="x-circle-fill" size={13} />}
        >
          {t('poActions.rejectCta')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApprove}
          leading={<Icon name="check-circle-fill" size={13} />}
        >
          {t('poActions.approveCta')}
        </Button>
      </>
    );
  }

  // Approved: owners can close.
  if (canClose) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={onClose}
        isLoading={busy === 'close'}
      >
        {t('poActions.closeCta')}
      </Button>
    );
  }

  return null;
}

function LineRow({ line, po }: { line: POLine; po: PurchaseOrder }) {
  const { t } = useTranslation();
  const committed = lineCommitted(line);
  const invoiced = lineInvoiced(po, line.id);
  const remaining = committed - invoiced;
  const over = invoiced > committed;
  const full = !over && committed > 0 && invoiced === committed;
  const pct = committed ? Math.min(100, Math.round((invoiced / committed) * 100)) : 0;

  return (
    <div className="po-line">
      <div className="po-line-desc">
        <span className="po-line-title">{line.description}</span>
        <span className="po-line-meta">
          <span className={`cat-tag cat-tag-${line.category}`}>{line.category}</span>
          <span className="muted">·</span>
          <span className="muted">
            {line.quantity} × {eurFull(line.unitPrice)}
          </span>
        </span>
      </div>
      <div className="text-right po-line-amount">{eur(committed)}</div>
      <div
        className={['text-right', 'po-line-amount', over ? 'is-over' : full ? 'is-full' : null]
          .filter(Boolean)
          .join(' ')}
      >
        {eur(invoiced)}
      </div>
      <div
        className={['text-right', 'po-line-amount', full ? 'is-full' : null]
          .filter(Boolean)
          .join(' ')}
      >
        {over ? `+${eur(Math.abs(remaining))}` : eur(Math.max(0, remaining))}
      </div>
      <div className="po-line-progress">
        <div className="po-line-progress-label">
          <span className="muted">
            {full
              ? t('poDetail.lineFullyInvoiced')
              : over
                ? t('poDetail.lineOverInvoiced')
                : t('poDetail.lineInvoiced')}
          </span>
          <span className="num">{pct}%</span>
        </div>
        <Progress
          value={Math.min(100, pct)}
          size="default"
          tone={over ? 'over' : full ? 'solid' : 'striped'}
        />
      </div>
    </div>
  );
}
