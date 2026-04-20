import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { Button } from '~/components/ui/Button';
import { Icon } from '~/components/ui/Icon';
import { Avatar } from '~/components/ui/Avatar';
import { RolePill } from '~/components/ui/RolePill';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { LocaleToggle } from '~/components/ui/LocaleToggle';
import { Spinner } from '~/components/ui/Spinner';
import { CreateProjectModal } from '~/components/CreateProjectModal';
import { useAuth } from '~/hooks/useAuth';
import { useProjects } from '~/hooks/useProjects';
import type { Project, Role } from '~/types';
import './ProjectsListPage.css';

export function ProjectsListPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { projects, loading } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);

  const grouped = useMemo(() => {
    const byRole: Record<Role, Project[]> = { owner: [], editor: [], viewer: [] };
    for (const p of projects) {
      const role = user ? (p.members[user.uid] as Role | undefined) : undefined;
      if (!role) continue;
      byRole[role].push(p);
    }
    return byRole;
  }, [projects, user]);

  const total = projects.length;

  return (
    <div className="projects-page">
      <header className="projects-topbar">
        <Logo size="md" />
        <div className="projects-topbar-actions">
          <LocaleToggle />
          <ThemeToggle />
          <div className="projects-user">
            <Avatar name={user?.displayName ?? undefined} photoURL={user?.photoURL} size="sm" />
            <span className="projects-user-name">{user?.displayName ?? user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            leading={<Icon name="box-arrow-right-fill" size={13} />}
          >
            {t('nav.logout')}
          </Button>
        </div>
      </header>

      <main className="projects-main">
        <section className="projects-hero reveal">
          <div className="projects-hero-left">
            <span className="eyebrow">
              {total === 0
                ? t('nav.projects')
                : total === 1
                  ? t('projects.projectsCountOne')
                  : t('projects.projectsCountOther', { count: total })}
            </span>
            <h1 className="display-xl">{t('projects.listTitle')}</h1>
            <p className="projects-hero-sub">{t('projects.listSubtitle')}</p>
          </div>
          {total > 0 ? (
            <Button
              variant="primary"
              size="md"
              leading={<Icon name="plus" size={13} />}
              onClick={() => setCreateOpen(true)}
            >
              {t('projects.newCta')}
            </Button>
          ) : null}
        </section>

        {loading ? (
          <div className="projects-loader">
            <Spinner size={22} />
          </div>
        ) : total === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <ProjectGroups grouped={grouped} uid={user?.uid} />
        )}
      </main>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="projects-empty reveal reveal-d1">
      <div className="projects-empty-inner">
        <div className="projects-empty-mark">
          <Icon name="receipt-fill" size={26} />
        </div>
        <h2 className="display-md">{t('projects.empty.title')}</h2>
        <p>{t('projects.empty.body')}</p>
        <Button
          variant="primary"
          size="lg"
          leading={<Icon name="plus" size={14} />}
          onClick={onCreate}
        >
          {t('projects.empty.cta')}
        </Button>
      </div>
    </section>
  );
}

function ProjectGroups({
  grouped,
  uid,
}: {
  grouped: Record<Role, Project[]>;
  uid: string | undefined;
}) {
  const order: Role[] = ['owner', 'editor', 'viewer'];
  return (
    <section className="projects-grid-wrap reveal reveal-d1">
      {order.map((role) => {
        const items = grouped[role];
        if (!items.length) return null;
        return (
          <div key={role} className="projects-group">
            <div className="projects-group-head">
              <h3 className="display-sm">{items[0]?.members && <RoleLabel role={role} />}</h3>
              <span className="muted" style={{ fontSize: 12 }}>{items.length}</span>
            </div>
            <div className="projects-grid">
              {items.map((p) => (
                <ProjectCard key={p.id} project={p} uid={uid} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function RoleLabel({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {t(`projects.roles.${role}`)}
    </span>
  );
}

function ProjectCard({ project, uid }: { project: Project; uid: string | undefined }) {
  const { t } = useTranslation();
  const role = (uid && (project.members[uid] as Role)) || 'viewer';
  const memberCount = Object.keys(project.members).length;
  const memberEntries = Object.entries(project.memberProfiles ?? {}).slice(0, 3);

  return (
    <Link to={`/app/p/${project.id}`} className="project-card">
      <div className="project-card-head">
        <div className="project-card-monogram" aria-hidden="true">{project.initial}</div>
        <div className="project-card-heading">
          <h3 className="project-card-name">{project.name}</h3>
          {project.description ? (
            <p className="project-card-desc">{project.description}</p>
          ) : null}
        </div>
        <RolePill role={role} size="sm" />
      </div>

      <div className="project-card-meta">
        <div className="project-card-members">
          <div className="avatar-stack">
            {memberEntries.map(([id, info]) => (
              <Avatar
                key={id}
                name={info.displayName}
                photoURL={info.photoURL}
                size="sm"
              />
            ))}
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {memberCount === 1
              ? t('members.countOne')
              : t('members.countOther', { count: memberCount })}
          </span>
        </div>

        <span className="project-card-arrow" aria-hidden="true">
          <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </Link>
  );
}
