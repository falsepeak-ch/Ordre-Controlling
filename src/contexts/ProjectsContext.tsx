import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Project } from '~/types';
import { listenProjectsForUser } from '~/lib/projects';
import { useAuth } from '~/hooks/useAuth';

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenProjectsForUser(user.uid, (next) => {
      setProjects(next);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const value = useMemo(() => ({ projects, loading }), [projects, loading]);
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
