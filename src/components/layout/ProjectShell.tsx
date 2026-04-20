import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Spinner } from '~/components/ui/Spinner';
import { Logo } from '~/components/ui/Logo';
import { ButtonAnchor } from '~/components/ui/Button';
import { CurrentProjectProvider } from '~/contexts/CurrentProjectContext';
import { useProject } from '~/hooks/useProject';
import { useAuth } from '~/hooks/useAuth';
import type { Role } from '~/types';
import './AppShell.css';

export function ProjectShell() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { project, loading, notFound } = useProject(projectId);

  if (authLoading || loading) {
    return (
      <div className="project-shell-loader">
        <Spinner size={22} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (notFound || !project) {
    return (
      <div className="project-shell-empty">
        <Logo size="md" />
        <h1 className="display-xl" style={{ margin: '16px 0 6px' }}>{t('notFound.projectTitle')}</h1>
        <p className="muted" style={{ fontSize: 15, maxWidth: 480, lineHeight: 1.5 }}>{t('notFound.projectBody')}</p>
        <ButtonAnchor href="/app" variant="primary" size="md">
          {t('nav.backToProjects')}
        </ButtonAnchor>
      </div>
    );
  }

  const role = project.members[user.uid] as Role | undefined;
  if (!role) {
    return (
      <div className="project-shell-empty">
        <Logo size="md" />
        <h1 className="display-xl" style={{ margin: '16px 0 6px' }}>{t('notFound.projectTitle')}</h1>
        <p className="muted" style={{ fontSize: 15, maxWidth: 480, lineHeight: 1.5 }}>{t('notFound.projectBody')}</p>
        <ButtonAnchor href="/app" variant="primary" size="md">
          {t('nav.backToProjects')}
        </ButtonAnchor>
      </div>
    );
  }

  return (
    <CurrentProjectProvider project={project} role={role}>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </CurrentProjectProvider>
  );
}
