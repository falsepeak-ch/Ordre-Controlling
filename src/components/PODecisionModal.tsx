import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Input, Textarea } from '~/components/ui/Input';
import { FileDropzone } from '~/components/ui/FileDropzone';
import { Icon } from '~/components/ui/Icon';
import { useToast } from '~/hooks/useToast';
import { approveWithBill, rejectPO } from '~/lib/purchaseOrders';
import { lineCommitted, lineInvoiced, poTotals } from '~/lib/reconcile';
import { eur } from '~/lib/format';
import type { InvoiceLine, PurchaseOrder, Role } from '~/types';
import './PODecisionModal.css';

interface Props {
  open: boolean;
  mode: 'approve' | 'reject';
  po: PurchaseOrder;
  projectId: string;
  approverUid: string;
  approverDisplayName: string;
  approverRole: Role;
  onClose: () => void;
  onDecided?: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PODecisionModal({
  open,
  mode,
  po,
  projectId,
  approverUid,
  approverDisplayName,
  approverRole,
  onClose,
  onDecided,
}: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 30));
  const [total, setTotal] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setComment('');
    setNumber('');
    setIssueDate(todayIso());
    setDueDate(addDays(todayIso(), 30));
    setTotal('');
    setFile(null);
    setMapping({});
  }, [open]);

  const totals = useMemo(() => poTotals(po), [po]);
  const totalNumber = Number(total) || 0;
  const mappedTotal = useMemo(
    () => Object.values(mapping).reduce((s, v) => s + (Number(v) || 0), 0),
    [mapping],
  );
  const mapMismatch = totalNumber > 0 && Math.abs(totalNumber - mappedTotal) >= 0.005;
  const newInvoicedTotal = totals.invoiced + totalNumber;
  const newRemaining = Math.max(0, totals.committed - newInvoicedTotal);
  const willClose = totals.committed > 0 && newInvoicedTotal >= totals.committed;

  function setLineAmount(lineId: string, raw: string) {
    const v = Number(raw);
    setMapping((prev) => {
      const next = { ...prev };
      if (!raw || Number.isNaN(v) || v === 0) delete next[lineId];
      else next[lineId] = Math.max(0, v);
      return next;
    });
  }

  async function submitApprove() {
    if (!number.trim()) {
      push({ message: t('invoiceForm.invalid'), icon: 'x-circle-fill', tone: 'error' });
      return;
    }
    if (totalNumber <= 0) {
      push({ message: t('poDecision.amountRequired'), icon: 'x-circle-fill', tone: 'error' });
      return;
    }
    if (!file) {
      push({ message: t('poDecision.fileRequired'), icon: 'x-circle-fill', tone: 'error' });
      return;
    }
    const lines: InvoiceLine[] = Object.entries(mapping)
      .filter(([, v]) => Number(v) > 0)
      .map(([lineId, amount]) => ({ lineId, amount: Number(amount) }));
    if (lines.length === 0) {
      push({ message: t('invoiceForm.noLines'), icon: 'x-circle-fill', tone: 'error' });
      return;
    }

    setBusy(true);
    try {
      await approveWithBill(projectId, po, {
        approverUid,
        approverDisplayName,
        approverRoleLabel: capitalise(approverRole),
        invoice: {
          number,
          issueDate,
          dueDate,
          total: totalNumber,
          lines,
          file,
        },
        comment,
      });
      push({
        message: willClose
          ? t('poDecision.approvedClosedToast')
          : t('poActions.approvedToast'),
        icon: 'check-circle-fill',
      });
      onDecided?.();
      onClose();
    } catch (err) {
      console.warn('[poDecision] approve failed', err);
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    setBusy(true);
    try {
      await rejectPO(
        projectId,
        po,
        approverUid,
        approverDisplayName,
        capitalise(approverRole),
        comment,
      );
      push({ message: t('poActions.rejectedToast'), icon: 'x-circle-fill' });
      onDecided?.();
      onClose();
    } catch {
      push({ message: t('poForm.error'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const isApprove = mode === 'approve';

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size={isApprove ? 'lg' : 'md'}
      title={t(isApprove ? 'poDecision.approveTitle' : 'poActions.rejectTitle', {
        number: po.number,
      })}
      subtitle={t(isApprove ? 'poDecision.approveSubtitle' : 'poActions.rejectSubtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={isApprove ? submitApprove : submitReject}
            isLoading={busy}
          >
            {t(
              isApprove
                ? willClose
                  ? 'poDecision.approveAndCloseCta'
                  : 'poDecision.approveAndRecordCta'
                : 'poActions.rejectCta',
            )}
          </Button>
        </>
      }
    >
      {isApprove ? (
        <div className="po-decision">
          <section className="po-decision-summary">
            <div className="po-decision-summary-row">
              <span className="po-decision-summary-label">{t('poDecision.committed')}</span>
              <span className="num">{eur(totals.committed)}</span>
            </div>
            <div className="po-decision-summary-row">
              <span className="po-decision-summary-label">{t('poDecision.alreadyInvoiced')}</span>
              <span className="num">{eur(totals.invoiced)}</span>
            </div>
            <div className="po-decision-summary-row po-decision-summary-remaining">
              <span className="po-decision-summary-label">{t('poDecision.remainingAfter')}</span>
              <span className={['num', willClose ? 'is-closed' : ''].filter(Boolean).join(' ')}>
                {eur(newRemaining)}
                {willClose ? (
                  <span className="po-decision-closed-flag">
                    · {t('poDecision.willClose')}
                  </span>
                ) : null}
              </span>
            </div>
          </section>

          <section className="po-decision-section">
            <h3 className="display-xs po-decision-section-title">{t('poDecision.billTitle')}</h3>
            <div className="po-decision-grid">
              <Field label={t('invoiceForm.numberLabel')}>
                <Input
                  autoFocus
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder={t('invoiceForm.numberPlaceholder')}
                  maxLength={40}
                />
              </Field>
              <Field label={t('invoiceForm.totalLabel')}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="text-right num"
                />
              </Field>
              <Field label={t('invoiceForm.issueDateLabel')}>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
              <Field label={t('invoiceForm.dueDateLabel')}>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label={t('invoiceForm.fileLabel')}>
              <FileDropzone value={file} onChange={setFile} />
            </Field>
          </section>

          <section className="po-decision-section">
            <h3 className="display-xs po-decision-section-title">
              {t('invoiceForm.mappingTitle')}
            </h3>
            <p className="muted po-decision-mapping-hint">{t('invoiceForm.mappingHint')}</p>
            <ul className="po-decision-lines">
              {po.lines.map((line) => {
                const committed = lineCommitted(line);
                const alreadyInvoiced = lineInvoiced(po, line.id);
                const remaining = committed - alreadyInvoiced;
                const mappedHere = mapping[line.id] ?? 0;
                const overHere = mappedHere > remaining && remaining >= 0;
                return (
                  <li key={line.id} className="po-decision-line">
                    <div>
                      <div className="po-decision-line-title">{line.description || '—'}</div>
                      <div className="muted po-decision-line-meta">
                        {t('invoiceForm.remaining')}: <span className="num">{eur(Math.max(0, remaining))}</span>
                      </div>
                    </div>
                    <div className="po-decision-line-input">
                      <span>€</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.01}
                        value={mapping[line.id] ?? ''}
                        onChange={(e) => setLineAmount(line.id, e.target.value)}
                        className="text-right num"
                      />
                      {overHere ? <Icon name="x-circle-fill" size={12} /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {mapMismatch ? (
              <p className="po-decision-mismatch">
                {t('poDecision.mappingMismatch', {
                  mapped: eur(mappedTotal),
                  total: eur(totalNumber),
                })}
              </p>
            ) : null}
          </section>

          <Field label={t('poActions.commentPlaceholder')}>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={400}
            />
          </Field>
        </div>
      ) : (
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t('poActions.commentPlaceholder')}
          maxLength={400}
        />
      )}
    </Modal>
  );
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
