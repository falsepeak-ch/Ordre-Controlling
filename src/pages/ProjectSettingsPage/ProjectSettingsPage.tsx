import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Field, Input, Textarea } from '~/components/ui/Input';
import { Pill } from '~/components/ui/Pill';
import { Modal } from '~/components/ui/Modal';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useAuth } from '~/hooks/useAuth';
import { useToast } from '~/hooks/useToast';
import {
  archiveProject,
  deleteEmptyProject,
  inspectProjectContents,
  transferOwnership,
  unarchiveProject,
  updateProjectMeta,
  type ProjectContentsCheck,
} from '~/lib/projects';
import './ProjectSettingsPage.css';

export function ProjectSettingsPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  if (role !== 'owner') {
    return <Navigate to={`/app/p/${project.id}`} replace />;
  }

  return (
    <>
      <Topbar title={t('projectSettings.pageTitle')} />

      <div className="settings-page">
        <section className="settings-hero reveal">
          <span className="eyebrow">{t('nav.settings')}</span>
          <h1 className="display-xl">{t('projectSettings.pageTitle')}</h1>
          <p className="settings-hero-sub">
            {t('projectSettings.subtitle', { project: project.name })}
          </p>
        </section>

        {project.archived ? (
          <div className="settings-banner reveal reveal-d1">
            <Icon name="clock-fill" size={14} />
            <span>{t('projectSettings.archivedBanner')}</span>
            <span className="grow" />
            <Button
              variant="subtle"
              size="sm"
              onClick={async () => {
                try {
                  await unarchiveProject(project.id);
                  push({ message: t('projectSettings.unarchivedToast'), icon: 'check-circle-fill' });
                } catch {
                  push({ message: t('projectSettings.deleteError'), icon: 'x-circle-fill', tone: 'error' });
                }
              }}
            >
              {t('projectSettings.unarchiveCta')}
            </Button>
          </div>
        ) : null}

        <GeneralSection />
        <OwnershipSection uid={user?.uid} />
        <ArchiveSection archived={!!project.archived} />
        <DangerSection onDeleted={() => navigate('/app')} />
      </div>
    </>
  );
}

// ---------- General ----------

function GeneralSection() {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { push } = useToast();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
  }, [project.id, project.name, project.description]);

  const dirty =
    name.trim() !== project.name.trim() ||
    description.trim() !== (project.description ?? '').trim();

  async function save() {
    if (!dirty) {
      push({ message: t('projectSettings.nothingToSave'), icon: 'clock-fill' });
      return;
    }
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateProjectMeta(project.id, { name, description });
      push({ message: t('projectSettings.savedToast'), icon: 'check-circle-fill' });
    } catch {
      push({ message: t('projectSettings.deleteError'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="md" className="settings-card">
      <header className="settings-card-head">
        <h2 className="display-sm mb-0">{t('projectSettings.generalTitle')}</h2>
      </header>
      <div className="settings-card-body">
        <Field label={t('projectSettings.nameLabel')}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field
          label={t('projectSettings.descriptionLabel')}
          hint={t('projectSettings.descriptionHint')}
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={280}
          />
        </Field>
      </div>
      <footer className="settings-card-foot">
        <Button
          variant="primary"
          onClick={save}
          isLoading={busy}
          disabled={!name.trim() || !dirty}
        >
          {busy ? t('projectSettings.saving') : t('projectSettings.saveGeneral')}
        </Button>
      </footer>
    </Card>
  );
}

// ---------- Ownership ----------

function OwnershipSection({ uid }: { uid: string | undefined }) {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { push } = useToast();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const otherMembers = useMemo(
    () =>
      Object.entries(project.members)
        .filter(([id]) => id !== uid)
        .map(([id]) => {
          const profile = project.memberProfiles?.[id];
          return {
            uid: id,
            displayName: profile?.displayName ?? project.memberEmails?.[id] ?? id,
          };
        }),
    [project, uid],
  );

  async function doTransfer() {
    if (!target || !uid) return;
    const name =
      project.memberProfiles?.[target]?.displayName ?? target;
    if (!window.confirm(t('projectSettings.ownershipConfirm', { name }))) return;
    setBusy(true);
    try {
      await transferOwnership(project.id, uid, target);
      push({
        message: t('projectSettings.ownershipToast', { name }),
        icon: 'check-circle-fill',
      });
      setTarget('');
    } catch {
      push({
        message: t('projectSettings.deleteError'),
        icon: 'x-circle-fill',
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="md" className="settings-card">
      <header className="settings-card-head">
        <h2 className="display-sm mb-0">{t('projectSettings.ownershipTitle')}</h2>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {t('projectSettings.ownershipHint')}
        </p>
      </header>
      <div className="settings-card-body">
        <Field label={t('projectSettings.ownershipPick')}>
          <select
            className="input settings-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={otherMembers.length === 0}
          >
            <option value="">—</option>
            {otherMembers.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.displayName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <footer className="settings-card-foot">
        <Button
          variant="primary"
          onClick={doTransfer}
          isLoading={busy}
          disabled={!target}
        >
          {t('projectSettings.ownershipCta')}
        </Button>
      </footer>
    </Card>
  );
}

// ---------- Archive ----------

function ArchiveSection({ archived }: { archived: boolean }) {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function onArchive() {
    if (!window.confirm(t('projectSettings.archiveConfirm', { name: project.name }))) return;
    setBusy(true);
    try {
      await archiveProject(project.id);
      push({ message: t('projectSettings.archivedToast'), icon: 'check-circle-fill' });
    } catch {
      push({ message: t('projectSettings.deleteError'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function onUnarchive() {
    setBusy(true);
    try {
      await unarchiveProject(project.id);
      push({ message: t('projectSettings.unarchivedToast'), icon: 'check-circle-fill' });
    } catch {
      push({ message: t('projectSettings.deleteError'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="md" className="settings-card">
      <header className="settings-card-head">
        <h2 className="display-sm mb-0">{t('projectSettings.archiveTitle')}</h2>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {t('projectSettings.archiveBody')}
        </p>
      </header>
      <footer className="settings-card-foot">
        {archived ? (
          <Button variant="primary" onClick={onUnarchive} isLoading={busy}>
            {t('projectSettings.unarchiveCta')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onArchive} isLoading={busy}>
            {t('projectSettings.archiveCta')}
          </Button>
        )}
      </footer>
    </Card>
  );
}

// ---------- Danger / Delete ----------

function DangerSection({ onDeleted }: { onDeleted: () => void }) {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { push } = useToast();
  const [contents, setContents] = useState<ProjectContentsCheck | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void inspectProjectContents(project.id).then((res) => {
      if (!cancelled) setContents(res);
    });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const canDelete = contents?.isEmpty === true;

  async function doDelete() {
    if (confirmName.trim() !== project.name.trim()) return;
    setBusy(true);
    try {
      await deleteEmptyProject(project.id);
      push({ message: t('projectSettings.deletedToast'), icon: 'check-circle-fill' });
      onDeleted();
    } catch {
      push({ message: t('projectSettings.deleteError'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card size="md" className="settings-card settings-card-danger">
      <header className="settings-card-head">
        <h2 className="display-sm mb-0">{t('projectSettings.dangerTitle')}</h2>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {t('projectSettings.dangerBody')}
        </p>
      </header>
      {contents && !canDelete ? (
        <div className="settings-card-body">
          <Pill tone="soft">
            {t('projectSettings.deleteDisabledReason', {
              suppliers: contents.supplierCount,
              categories: contents.categoryCount,
              pos: contents.poCount,
            })}
          </Pill>
        </div>
      ) : null}
      <footer className="settings-card-foot">
        <Button
          variant="ghost"
          onClick={() => {
            setConfirmName('');
            setModalOpen(true);
          }}
          disabled={!canDelete}
        >
          {t('projectSettings.deleteCta')}
        </Button>
      </footer>

      <Modal
        open={modalOpen}
        onClose={() => !busy && setModalOpen(false)}
        size="sm"
        title={t('projectSettings.deleteCta')}
        subtitle={t('projectSettings.deleteConfirm')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={doDelete}
              isLoading={busy}
              disabled={confirmName.trim() !== project.name.trim()}
            >
              {t('projectSettings.deleteCta')}
            </Button>
          </>
        }
      >
        <Field
          error={
            confirmName && confirmName.trim() !== project.name.trim()
              ? t('projectSettings.deleteConfirmMismatch')
              : undefined
          }
        >
          <Input
            autoFocus
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={t('projectSettings.deleteConfirmPlaceholder', { name: project.name })}
          />
        </Field>
      </Modal>
    </Card>
  );
}
