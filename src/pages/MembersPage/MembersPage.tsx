import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Field, Input } from '~/components/ui/Input';
import { Avatar } from '~/components/ui/Avatar';
import { RolePill } from '~/components/ui/RolePill';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useAuth } from '~/hooks/useAuth';
import { useToast } from '~/hooks/useToast';
import { useConfirm } from '~/hooks/useConfirm';
import {
  addMemberByEmail,
  removeMember,
  updateMemberRole,
  MemberMutationError,
} from '~/lib/projects';
import { canManage } from '~/lib/roles';
import type { Role } from '~/types';
import '~/theme/page-layout.css';
import './MembersPage.css';

function memberErrorMessage(
  err: unknown,
  t: TFunction,
  fallbackKey: 'generic' | 'roleChangeFailed',
  targetName?: string,
): string {
  if (err instanceof MemberMutationError) {
    switch (err.code) {
      case 'user-not-found':
        return t('members.errors.userNotFound');
      case 'already-member':
        return t('members.errors.alreadyMember', { name: targetName ?? '' });
      case 'target-project-limit':
        return t('members.errors.targetProjectLimit', { name: targetName ?? '' });
      case 'permission-denied':
        return t('members.errors.permissionDenied');
      default:
        return t(`members.errors.${fallbackKey}`);
    }
  }
  return t(`members.errors.${fallbackKey}`);
}

export function MembersPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { user } = useAuth();
  const { push } = useToast();
  const confirm = useConfirm();

  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('editor');
  const [busy, setBusy] = useState(false);

  const selfUid = user?.uid;
  const members = useMemo(() => {
    const entries = Object.entries(project.members);
    return entries
      .map(([uid, r]) => {
        const profile = project.memberProfiles?.[uid];
        return {
          uid,
          role: r as Role,
          displayName: profile?.displayName ?? project.memberEmails?.[uid] ?? uid,
          email: profile?.email ?? project.memberEmails?.[uid] ?? '',
          photoURL: profile?.photoURL ?? null,
        };
      })
      .sort((a, b) => {
        if (a.uid === selfUid) return -1;
        if (b.uid === selfUid) return 1;
        return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
      });
  }, [project, selfUid]);

  const canEditMembers = canManage(role);
  const ownerCount = members.filter((m) => m.role === 'owner').length;

  async function handleAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const normalized = email.trim();
    if (!normalized) return;
    setBusy(true);
    try {
      await addMemberByEmail(project.id, normalized, newRole);
      push({
        message: t('members.addedToast', {
          name: normalized,
          role: t(`projects.roles.${newRole}`),
        }),
        icon: 'check-circle-fill',
      });
      setEmail('');
    } catch (err) {
      push({
        message: memberErrorMessage(err, t, 'generic', normalized),
        icon: 'x-circle-fill',
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(uid: string, newR: Role, name: string) {
    try {
      await updateMemberRole(project.id, uid, newR);
      push({
        message: t('members.roleChangedToast', { name, role: t(`projects.roles.${newR}`) }),
        icon: 'check-circle-fill',
      });
    } catch (err) {
      push({
        message: memberErrorMessage(err, t, 'roleChangeFailed', name),
        icon: 'x-circle-fill',
        tone: 'error',
      });
    }
  }

  async function handleRemove(uid: string, name: string) {
    const ok = await confirm({
      title: t('members.removeConfirm', { name }),
      confirmLabel: t('common.remove'),
    });
    if (!ok) return;
    try {
      await removeMember(project.id, uid);
      push({ message: t('members.removedToast', { name }), icon: 'check-circle-fill' });
    } catch {
      push({
        message: t('members.errors.removeFailed'),
        icon: 'x-circle-fill',
        tone: 'error',
      });
    }
  }

  return (
    <>
      <Topbar
        title={t('members.title')}
        subtitle={
          members.length > 0 ? (
            <span className="muted" style={{ fontSize: 13 }}>
              {members.length === 1
                ? t('members.countOne')
                : t('members.countOther', { count: members.length })}
            </span>
          ) : null
        }
      />

      <div className="members-page page-container page-container--narrow">
        {canEditMembers ? (
          <section className="members-add reveal reveal-d1">
            <Card size="md">
              <div className="members-add-head">
                <h3 className="display-sm mb-0">{t('members.addTitle')}</h3>
                <span className="muted" style={{ fontSize: 13 }}>{t('members.addSubtitle')}</span>
              </div>

              <form className="members-add-form" onSubmit={handleAdd}>
                <Field label={t('members.emailLabel')}>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    placeholder={t('members.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                <Field label={t('members.roleLabel')}>
                  <div className="role-segmented">
                    {(['viewer', 'approver', 'editor', 'owner'] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={['role-segmented-option', newRole === r ? 'is-active' : null]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setNewRole(r)}
                      >
                        {t(`projects.roles.${r}`)}
                      </button>
                    ))}
                  </div>
                </Field>

                <Button
                  variant="primary"
                  type="submit"
                  isLoading={busy}
                  disabled={!email.trim()}
                  leading={<Icon name="plus" size={13} />}
                >
                  {busy ? t('members.adding') : t('members.addCta')}
                </Button>
              </form>
              <p className="members-add-caption">{t(`members.roleCaption.${newRole}`)}</p>
            </Card>
          </section>
        ) : (
          <section className="members-readonly reveal reveal-d1">
            <Icon name="clock-fill" size={14} />
            <span>{t('members.ownerOnly')}</span>
          </section>
        )}

        <section className="members-list reveal reveal-d2">
          {members.map((m) => {
            const isSelf = m.uid === user?.uid;
            const canRemove = canEditMembers && !(isSelf && m.role === 'owner' && ownerCount === 1);
            return (
              <article key={m.uid} className="member-row">
                <div className="member-identity">
                  <Avatar name={m.displayName} photoURL={m.photoURL} size="md" />
                  <div className="member-identity-text">
                    <span className="member-name">
                      {m.displayName}
                      {isSelf ? (
                        <span className="member-self-chip">{t('members.you')}</span>
                      ) : null}
                    </span>
                    <span className="member-email">{m.email}</span>
                  </div>
                </div>

                <div className="member-actions">
                  {canEditMembers && !isSelf ? (
                    <RoleSelect
                      current={m.role}
                      onChange={(r) => handleRoleChange(m.uid, r, m.displayName)}
                    />
                  ) : (
                    <RolePill role={m.role} size="md" />
                  )}

                  {canRemove && !isSelf ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(m.uid, m.displayName)}
                      aria-label={t('common.remove')}
                    >
                      <Icon name="trash-fill" size={13} />
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </>
  );
}

function RoleSelect({ current, onChange }: { current: Role; onChange: (r: Role) => void }) {
  const { t } = useTranslation();
  return (
    <div className="role-segmented role-segmented-sm">
      {(['viewer', 'approver', 'editor', 'owner'] as Role[]).map((r) => (
        <button
          key={r}
          type="button"
          className={['role-segmented-option', current === r ? 'is-active' : null]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            if (current !== r) onChange(r);
          }}
        >
          {t(`projects.roles.${r}`)}
        </button>
      ))}
    </div>
  );
}
