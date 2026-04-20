import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjects } from '~/hooks/useProjects';
import { useAuth } from '~/hooks/useAuth';
import { CreateProjectModal } from '~/components/CreateProjectModal';
import { RolePill } from '~/components/ui/RolePill';
import { Icon } from '~/components/ui/Icon';
import type { Project, Role } from '~/types';
import './ProjectSwitcher.css';

interface ProjectSwitcherProps {
  current: Project;
}

export function ProjectSwitcher({ current }: ProjectSwitcherProps) {
  const { t } = useTranslation();
  const { projects } = useProjects();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
                  setCreateOpen(true);
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

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
