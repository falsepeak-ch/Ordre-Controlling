import { useEffect, useState } from 'react';
import type { Project, Role } from '~/types';
import { listenProject } from '~/lib/projects';
import { useAuth } from './useAuth';

export interface UseProjectResult {
  project: Project | null;
  role: Role | undefined;
  loading: boolean;
  notFound: boolean;
}

export function useProject(projectId: string | undefined): UseProjectResult {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      setNotFound(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    const unsub = listenProject(projectId, (next) => {
      setProject(next);
      setLoading(false);
      if (!next) setNotFound(true);
    });
    return unsub;
  }, [projectId]);

  const role = user && project ? (project.members[user.uid] as Role | undefined) : undefined;
  return { project, role, loading, notFound };
}
