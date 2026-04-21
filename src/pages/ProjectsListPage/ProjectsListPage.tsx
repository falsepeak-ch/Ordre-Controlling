import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '~/components/ui/Logo';
import { Button } from '~/components/ui/Button';
import { Icon } from '~/components/ui/Icon';
import { Avatar } from '~/components/ui/Avatar';
import { RolePill } from '~/components/ui/RolePill';
import { ProBadge } from '~/components/ui/ProBadge';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { LocaleToggle } from '~/components/ui/LocaleToggle';
import { Spinner } from '~/components/ui/Spinner';
import { CreateProjectModal } from '~/components/CreateProjectModal';
import { UpgradeModal } from '~/components/UpgradeModal';
import { useAuth } from '~/hooks/useAuth';
import { useProjects } from '~/hooks/useProjects';
import { useSubscription } from '~/hooks/useSubscription';
import type { Project, Role } from '~/types';
import './ProjectsListPage.css';

const FREE_PROJECT_LIMIT = 1;
const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true';

export function ProjectsListPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { projects, loading } = useProjects();
  const { isPro } = useSubscription();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const ownedCount = useMemo(
    () => projects.filter((p) => user && p.members[user.uid] === 'owner').length,
    [projects, user],
  );

  const gated = !isPro && ownedCount >= FREE_PROJECT_LIMIT;

  function onNewProject() {
    if (gated) setUpgradeOpen(true);
    else setCreateOpen(true);
  }

  const { activeProjects, archivedProjects } = useMemo(() => {
    const active: Project[] = [];
    const archived: Project[] = [];
    for (const p of projects) {
      (p.archived ? archived : active).push(p);
    }
    return { activeProjects: active, archivedProjects: archived };
  }, [projects]);

  const grouped = useMemo(() => {
    const byRole: Record<Role, Project[]> = { owner: [], editor: [], approver: [], viewer: [] };
    for (const p of activeProjects) {
      const role = user ? (p.members[user.uid] as Role | undefined) : undefined;
      if (!role) continue;
      byRole[role].push(p);
    }
    return byRole;
  }, [activeProjects, user]);

  const total = activeProjects.length;

  return (
    <div className="projects-page">
      <header className="projects-topbar">
        <Logo size="md" />
        <div className="projects-topbar-actions">
          <LocaleToggle />
          <ThemeToggle />
          {BILLING_ENABLED && !isPro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUpgradeOpen(true)}
            >
              {t('subscription.upgrade')}
            </Button>
          )}
          <div className="projects-user">
            <Avatar name={user?.displayName ?? undefined} photoURL={user?.photoURL} size="sm" />
            <span className="projects-user-name">{user?.displayName ?? user?.email}</span>
            <ProBadge variant={isPro ? 'pro' : 'free'} size="sm" />
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
              onClick={onNewProject}
            >
              {t('projects.newCta')}
            </Button>
          ) : null}
        </section>

        {loading ? (
          <div className="projects-loader">
            <Spinner size={22} />
          </div>
        ) : total === 0 && archivedProjects.length === 0 ? (
          <EmptyState onCreate={onNewProject} />
        ) : (
          <>
            <ProjectGroups grouped={grouped} uid={user?.uid} />
            {archivedProjects.length > 0 ? (
              <ArchivedGroup projects={archivedProjects} uid={user?.uid} />
            ) : null}
          </>
        )}
      </main>

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onLimitReached={() => setUpgradeOpen(true)}
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
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
  const order: Role[] = ['owner', 'editor', 'approver', 'viewer'];
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

function ArchivedGroup({
  projects,
  uid,
}: {
  projects: Project[];
  uid: string | undefined;
}) {
  const { t } = useTranslation();
  return (
    <section className="projects-group projects-group-archived reveal reveal-d2">
      <div className="projects-group-head">
        <h3 className="display-sm">{t('projectSettings.archiveTitle')}</h3>
        <span className="muted" style={{ fontSize: 12 }}>{projects.length}</span>
      </div>
      <div className="projects-grid">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} uid={uid} />
        ))}
      </div>
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
    <Link
      to={`/app/p/${project.id}`}
      className={['project-card', project.archived ? 'project-card-archived' : null]
        .filter(Boolean)
        .join(' ')}
    >
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
