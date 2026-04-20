import { createContext, useMemo, type ReactNode } from 'react';
import type { Project, Role } from '~/types';

interface CurrentProjectContextValue {
  project: Project;
  role: Role;
}

export const CurrentProjectContext = createContext<CurrentProjectContextValue | null>(null);

export function CurrentProjectProvider({
  project,
  role,
  children,
}: {
  project: Project;
  role: Role;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ project, role }), [project, role]);
  return <CurrentProjectContext.Provider value={value}>{children}</CurrentProjectContext.Provider>;
}
