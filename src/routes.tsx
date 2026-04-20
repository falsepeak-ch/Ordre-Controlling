import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '~/components/layout/PublicLayout';
import { ProjectShell } from '~/components/layout/ProjectShell';
import { RequireAuth } from '~/components/RequireAuth';
import { LandingPage } from '~/pages/LandingPage';
import { LoginPage } from '~/pages/LoginPage';
import { SignupPage } from '~/pages/SignupPage';
import { ProjectsListPage } from '~/pages/ProjectsListPage';
import { DashboardPage } from '~/pages/DashboardPage';
import { MembersPage } from '~/pages/MembersPage';
import { NotFoundPage } from '~/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <ProjectsListPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/p/:projectId',
    element: (
      <RequireAuth>
        <ProjectShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: '*', element: <Navigate to="." replace /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
