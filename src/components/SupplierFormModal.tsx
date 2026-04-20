import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Input, Textarea } from '~/components/ui/Input';
import { useToast } from '~/hooks/useToast';
import { createSupplier, updateSupplier } from '~/lib/suppliers';
import type { Supplier } from '~/types';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  supplier?: Supplier | null;
}

function blank() {
  return {
    legalName: '',
    tradeName: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: 'Net 30',
    notes: '',
    tags: '' as string,
  };
}

function fromSupplier(s: Supplier) {
  return {
    legalName: s.legalName ?? '',
    tradeName: s.tradeName ?? '',
    taxId: s.taxId ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    address: s.address ?? '',
    paymentTerms: s.paymentTerms ?? 'Net 30',
    notes: s.notes ?? '',
    tags: (s.tags ?? []).join(', '),
  };
}

export function SupplierFormModal({ open, onClose, projectId, supplier }: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const editing = !!supplier;
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm(supplier ? fromSupplier(supplier) : blank());
  }, [open, supplier]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const legalName = form.legalName.trim();
    if (!legalName) return;
    setBusy(true);
    const payload = {
      legalName,
      tradeName: form.tradeName.trim() || legalName,
      taxId: form.taxId,
      email: form.email,
      phone: form.phone,
      address: form.address,
      paymentTerms: form.paymentTerms || 'Net 30',
      notes: form.notes,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      if (editing && supplier) {
        await updateSupplier(projectId, supplier.id, payload);
        push({ message: t('suppliers.form.updated'), icon: 'check-circle-fill' });
      } else {
        await createSupplier(projectId, payload);
        push({ message: t('suppliers.form.created'), icon: 'check-circle-fill' });
      }
      onClose();
    } catch {
      push({ message: t('signup.error'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="lg"
      title={editing ? t('suppliers.form.editTitle') : t('suppliers.form.createTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => submit()}
            isLoading={busy}
            disabled={!form.legalName.trim()}
          >
            {busy
              ? t('suppliers.form.saving')
              : editing
                ? t('suppliers.form.saveEdit')
                : t('suppliers.form.saveCreate')}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="supplier-form">
        <div className="supplier-form-grid">
          <Field label={t('suppliers.form.legalNameLabel')}>
            <Input
              autoFocus
              value={form.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              placeholder={t('suppliers.form.legalNamePlaceholder')}
              maxLength={120}
            />
          </Field>

          <Field
            label={t('suppliers.form.tradeNameLabel')}
            hint={t('suppliers.form.tradeNameHint')}
          >
            <Input
              value={form.tradeName}
              onChange={(e) => set('tradeName', e.target.value)}
              placeholder={t('suppliers.form.tradeNamePlaceholder')}
              maxLength={80}
            />
          </Field>

          <Field label={t('suppliers.form.taxIdLabel')}>
            <Input
              value={form.taxId}
              onChange={(e) => set('taxId', e.target.value)}
              placeholder={t('suppliers.form.taxIdPlaceholder')}
              maxLength={30}
            />
          </Field>

          <Field label={t('suppliers.form.paymentTermsLabel')}>
            <Input
              value={form.paymentTerms}
              onChange={(e) => set('paymentTerms', e.target.value)}
              placeholder={t('suppliers.form.paymentTermsPlaceholder')}
              maxLength={40}
            />
          </Field>

          <Field label={t('suppliers.form.emailLabel')}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder={t('suppliers.form.emailPlaceholder')}
              maxLength={120}
            />
          </Field>

          <Field label={t('suppliers.form.phoneLabel')}>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder={t('suppliers.form.phonePlaceholder')}
              maxLength={40}
            />
          </Field>
        </div>

        <Field label={t('suppliers.form.addressLabel')}>
          <Input
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder={t('suppliers.form.addressPlaceholder')}
            maxLength={160}
          />
        </Field>

        <Field label={t('suppliers.form.tagsLabel')} hint={t('suppliers.form.tagsHint')}>
          <Input
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder={t('suppliers.form.tagsPlaceholder')}
            maxLength={120}
          />
        </Field>

        <Field label={t('suppliers.form.notesLabel')}>
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('suppliers.form.notesPlaceholder')}
            rows={3}
            maxLength={500}
          />
        </Field>

        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
