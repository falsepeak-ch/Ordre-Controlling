import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Input, Textarea } from '~/components/ui/Input';
import { useAuth } from '~/hooks/useAuth';
import { useToast } from '~/hooks/useToast';
import { createProject } from '~/lib/projects';

interface Props {
  open: boolean;
  onClose: () => void;
  redirectOnCreate?: boolean;
}

export function CreateProjectModal({ open, onClose, redirectOnCreate = true }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setName('');
    setDescription('');
    setBusy(false);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!user) return;
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await createProject(
        { name, description },
        {
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? user.email ?? 'You',
          photoURL: user.photoURL,
        },
      );
      push({ message: name.trim(), icon: 'check-circle-fill' });
      reset();
      onClose();
      if (redirectOnCreate) navigate(`/app/p/${id}`);
    } catch {
      push({ message: t('signup.error'), icon: 'x-circle-fill', tone: 'error' });
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) {
          reset();
          onClose();
        }
      }}
      title={t('projects.createTitle')}
      subtitle={t('projects.createSubtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => submit()} isLoading={busy} disabled={!name.trim()}>
            {busy ? t('projects.creating') : t('projects.create')}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="stack-form">
        <Field label={t('projects.nameLabel')}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('projects.namePlaceholder')}
            maxLength={80}
          />
        </Field>

        <Field
          label={
            <span>
              {t('projects.descriptionLabel')}
              <span style={{ color: 'var(--fg-muted)', fontWeight: 400, marginLeft: 6 }}>
                {t('projects.descriptionHint')}
              </span>
            </span>
          }
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('projects.descriptionPlaceholder')}
            rows={3}
            maxLength={280}
          />
        </Field>

        <Field label={t('projects.currencyLabel')}>
          <Input value="EUR (€)" disabled style={{ color: 'var(--fg-muted)' }} />
        </Field>

        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
