import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjects } from '~/hooks/useProjects';
import { useAuth } from '~/hooks/useAuth';
import { useSubscription } from '~/hooks/useSubscription';
import { CreateProjectModal } from '~/components/CreateProjectModal';
import { UpgradeModal } from '~/components/UpgradeModal';
import { RolePill } from '~/components/ui/RolePill';
import { Icon } from '~/components/ui/Icon';
import type { Project, Role } from '~/types';
import './ProjectSwitcher.css';

const FREE_PROJECT_LIMIT = 1;

interface ProjectSwitcherProps {
  current: Project;
}

export function ProjectSwitcher({ current }: ProjectSwitcherProps) {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const ownedCount = useMemo(
    () => projects.filter((p) => user && p.members[user.uid] === 'owner').length,
    [projects, user],
  );
  const gated = !isPro && ownedCount >= FREE_PROJECT_LIMIT;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const currentRole = (user && (current.members[user.uid] as Role | undefined)) ?? 'viewer';

  return (
    <>
      <div className="project-switcher" ref={ref}>
        <button
          type="button"
          className="project-switcher-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="project-switcher-monogram">{current.initial}</span>
          <span className="project-switcher-meta">
            <span className="project-switcher-name">{current.name}</span>
            <span className="project-switcher-role">{t(`projects.roles.${currentRole}`)}</span>
          </span>
          <span className="project-switcher-chevron">
            <Icon name="chevron-down" size={13} />
          </span>
        </button>

        {open ? (
          <ul className="project-switcher-menu" role="listbox" aria-label={t('nav.projects')}>
            {projects.map((p) => {
              const role = (user && (p.members[user.uid] as Role | undefined)) ?? 'viewer';
              const isCurrent = p.id === current.id;
              return (
                <li key={p.id}>
                  <Link
                    to={`/app/p/${p.id}`}
                    className={['project-switcher-option', isCurrent ? 'is-current' : null]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setOpen(false)}
                  >
                    <span className="project-switcher-option-monogram">{p.initial}</span>
                    <span className="project-switcher-option-text">
                      <span className="project-switcher-option-name">{p.name}</span>
                      <RolePill role={role} size="sm" />
                    </span>
                    {isCurrent ? (
                      <span className="project-switcher-check">
                        <Icon name="check" size={13} />
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}

            <li className="project-switcher-divider" aria-hidden="true" />

            <li>
              <button
                type="button"
                className="project-switcher-option project-switcher-new"
                onClick={() => {
                  setOpen(false);
                  if (gated) setUpgradeOpen(true);
                  else setCreateOpen(true);
                }}
              >
                <span className="project-switcher-option-monogram plus">
                  <Icon name="plus" size={12} />
                </span>
                <span className="project-switcher-option-text">
                  <span className="project-switcher-option-name">{t('projects.newCta')}</span>
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="project-switcher-option"
                onClick={() => {
                  setOpen(false);
                  navigate('/app');
                }}
              >
                <span className="project-switcher-option-monogram plus">
                  <Icon name="arrow-left" size={12} />
                </span>
                <span className="project-switcher-option-text">
                  <span className="project-switcher-option-name">{t('nav.backToProjects')}</span>
                </span>
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onLimitReached={() => setUpgradeOpen(true)}
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
