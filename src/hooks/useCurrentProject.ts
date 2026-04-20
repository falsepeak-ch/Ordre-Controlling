import { useContext } from 'react';
import { CurrentProjectContext } from '~/contexts/CurrentProjectContext';

export function useCurrentProject() {
  const ctx = useContext(CurrentProjectContext);
  if (!ctx) throw new Error('useCurrentProject must be used within a project route');
  return ctx;
}
