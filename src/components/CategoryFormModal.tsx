import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Input } from '~/components/ui/Input';
import { useToast } from '~/hooks/useToast';
import { createCategory, updateCategory } from '~/lib/categories';
import type { Category } from '~/types';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  category?: Category | null;
  existingCodes: Set<string>;
}

export function CategoryFormModal({
  open,
  onClose,
  projectId,
  category,
  existingCodes,
}: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const editing = !!category;

  const [code, setCode] = useState('');
  const [concept, setConcept] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(category?.code ?? '');
    setConcept(category?.concept ?? '');
    setError(null);
  }, [open, category]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const c = code.trim();
    const v = concept.trim();
    if (!c || !v) {
      setError(t('categories.form.error'));
      return;
    }
    // Only check duplicates when the code changed — editing its concept
    // shouldn't trip the "duplicate" branch on its own row.
    if (!editing || category?.code !== c) {
      if (existingCodes.has(c)) {
        setError(t('categories.form.duplicateError'));
        return;
      }
    }
    setBusy(true);
    try {
      if (editing && category) {
        await updateCategory(projectId, category.id, { code: c, concept: v });
        push({ message: t('categories.form.updatedToast'), icon: 'check-circle-fill' });
      } else {
        await createCategory(projectId, { code: c, concept: v });
        push({ message: t('categories.form.createdToast'), icon: 'check-circle-fill' });
      }
      onClose();
    } catch {
      setError(t('categories.form.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="md"
      title={editing ? t('categories.form.editTitle') : t('categories.form.createTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => submit()}
            isLoading={busy}
            disabled={!code.trim() || !concept.trim()}
          >
            {busy
              ? t('categories.form.saving')
              : editing
                ? t('categories.form.saveEdit')
                : t('categories.form.saveCreate')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={submit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
      >
        <Field label={t('categories.form.codeLabel')}>
          <Input
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder={t('categories.form.codePlaceholder')}
            maxLength={64}
          />
        </Field>
        <Field label={t('categories.form.conceptLabel')} error={error ?? undefined}>
          <Input
            value={concept}
            onChange={(e) => {
              setConcept(e.target.value);
              setError(null);
            }}
            placeholder={t('categories.form.conceptPlaceholder')}
            maxLength={160}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
