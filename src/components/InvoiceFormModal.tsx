import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Input } from '~/components/ui/Input';
import { FileDropzone } from '~/components/ui/FileDropzone';
import { Icon } from '~/components/ui/Icon';
import { useToast } from '~/hooks/useToast';
import { createInvoice, updateInvoice } from '~/lib/invoices';
import { StorageQuotaExceededError } from '~/lib/attachments';
import { lineCommitted, lineInvoiced } from '~/lib/reconcile';
import { eur, eurFull } from '~/lib/format';
import type { Invoice, InvoiceLine, PurchaseOrder } from '~/types';
import './InvoiceFormModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  po: PurchaseOrder;
  invoice?: Invoice | null;
  uploadedBy: string;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InvoiceFormModal({
  open,
  onClose,
  projectId,
  po,
  invoice,
  uploadedBy,
}: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const editing = !!invoice;

  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 30));
  const [total, setTotal] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  // Hydrate the form when opened.
  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setNumber(invoice.number);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setTotal(String(invoice.total));
      setFile(null);
      const m: Record<string, number> = {};
      invoice.lines.forEach((l) => {
        m[l.lineId] = l.amount;
      });
      setMapping(m);
    } else {
      setNumber('');
      setIssueDate(todayIso());
      setDueDate(addDays(todayIso(), 30));
      setTotal('');
      setFile(null);
      setMapping({});
    }
  }, [open, invoice]);

  const mappedTotal = useMemo(
    () => Object.values(mapping).reduce((s, v) => s + (Number(v) || 0), 0),
    [mapping],
  );

  const totalNumber = Number(total) || 0;
  const diff = totalNumber - mappedTotal;
  const matches = Math.abs(diff) < 0.005 && totalNumber > 0;
  const mappingState: 'match' | 'under' | 'over' =
    totalNumber <= 0 || mappedTotal === 0
      ? 'under'
      : matches
        ? 'match'
        : diff > 0
          ? 'under'
          : 'over';

  function setLineAmount(lineId: string, raw: string) {
    const v = Number(raw);
    setMapping((prev) => {
      const next = { ...prev };
      if (!raw || Number.isNaN(v) || v === 0) {
        delete next[lineId];
      } else {
        next[lineId] = Math.max(0, v);
      }
      return next;
    });
  }

  async function save() {
    if (!number.trim() || totalNumber <= 0 || (!editing && !file)) {
      push({ message: t('invoiceForm.invalid'), icon: 'x-circle-fill', tone: 'error' });
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
      if (editing && invoice) {
        await updateInvoice(
          projectId,
          po.id,
          invoice.id,
          {
            number,
            issueDate,
            dueDate,
            total: totalNumber,
            lines,
            uploadedBy,
            file,
          },
          { storagePath: invoice.storagePath },
        );
      } else {
        await createInvoice(projectId, po.id, {
          number,
          issueDate,
          dueDate,
          total: totalNumber,
          lines,
          uploadedBy,
          file,
        });
      }
      push({ message: t('invoiceForm.savedToast'), icon: 'check-circle-fill' });
      onClose();
    } catch (err) {
      console.warn('[invoiceForm] save failed', err);
      const message = err instanceof StorageQuotaExceededError
        ? t('attachments.quotaExceeded')
        : t('invoiceForm.error');
      push({ message, icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="lg"
      title={editing ? t('invoiceForm.editTitle') : t('invoiceForm.createTitle')}
      subtitle={t('invoiceForm.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={save} isLoading={busy}>
            {busy
              ? t('invoiceForm.saving')
              : editing
                ? t('invoiceForm.saveEdit')
                : t('invoiceForm.saveCreate')}
          </Button>
        </>
      }
    >
      <form className="invoice-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <section className="invoice-form-section">
          <h3 className="display-xs invoice-form-section-title">
            {t('invoiceForm.metaTitle')}
          </h3>
          <div className="invoice-form-grid">
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
            <FileDropzone
              value={file}
              existingFileName={invoice?.fileName ?? invoice?.file ?? null}
              existingFileSize={invoice?.fileSize ?? null}
              onChange={setFile}
            />
          </Field>
        </section>

        <section className="invoice-form-section">
          <h3 className="display-xs invoice-form-section-title">
            {t('invoiceForm.mappingTitle')}
          </h3>
          <p className="invoice-form-mapping-hint muted">
            {t('invoiceForm.mappingHint')}
          </p>

          <ul className="invoice-form-lines">
            {po.lines.map((line) => {
              const committed = lineCommitted(line);
              const alreadyInvoiced =
                lineInvoiced(po, line.id) - (invoice?.lines.find((l) => l.lineId === line.id)?.amount ?? 0);
              const remaining = committed - alreadyInvoiced;
              const mappedHere = mapping[line.id] ?? 0;
              const overHere = mappedHere > remaining && remaining >= 0;
              return (
                <li key={line.id} className="invoice-form-line">
                  <div className="invoice-form-line-desc">
                    <span className="invoice-form-line-title">
                      {line.description || '—'}
                    </span>
                    <span className="invoice-form-line-meta muted">
                      {t('invoiceForm.remaining')}:{' '}
                      <span className="num">{eur(Math.max(0, remaining))}</span>
                    </span>
                  </div>
                  <div className="invoice-form-line-input">
                    <span className="invoice-form-line-prefix">€</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.01}
                      value={mapping[line.id] ?? ''}
                      onChange={(e) => setLineAmount(line.id, e.target.value)}
                      className="text-right num"
                    />
                  </div>
                  {overHere ? (
                    <span className="invoice-form-line-over">
                      <Icon name="x-circle-fill" size={12} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className={['invoice-form-summary', `invoice-form-summary-${mappingState}`].join(' ')}>
            <div className="invoice-form-summary-row">
              <span className="muted">{t('invoiceForm.mappingTotalLabel')}</span>
              <span className="num invoice-form-summary-num">{eurFull(mappedTotal)}</span>
            </div>
            <div className="invoice-form-summary-row">
              <span className="muted">{t('invoiceForm.invoiceTotalLabel')}</span>
              <span className="num invoice-form-summary-num">{eurFull(totalNumber)}</span>
            </div>
            <div className="invoice-form-summary-status">
              {mappingState === 'match' ? (
                <>
                  <Icon name="check-circle-fill" size={13} />
                  <span>{t('invoiceForm.mappingMatch')}</span>
                </>
              ) : mappingState === 'over' ? (
                <>
                  <Icon name="x-circle-fill" size={13} />
                  <span>{t('invoiceForm.mappingOver', { amount: eurFull(Math.abs(diff)) })}</span>
                </>
              ) : (
                <>
                  <Icon name="clock-fill" size={13} />
                  <span>
                    {t('invoiceForm.mappingMismatch', { amount: eurFull(Math.max(0, diff)) })}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
