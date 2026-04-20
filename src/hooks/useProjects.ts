import { useContext } from 'react';
import { ProjectsContext } from '~/contexts/ProjectsContext';

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within <ProjectsProvider>');
  return ctx;
}
