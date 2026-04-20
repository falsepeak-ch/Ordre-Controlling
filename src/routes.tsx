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
import { SuppliersPage } from '~/pages/SuppliersPage';
import { PurchaseOrdersPage } from '~/pages/PurchaseOrdersPage';
import { PODetailPage } from '~/pages/PODetailPage';
import { POFormPage } from '~/pages/POFormPage';
import { ApprovalsQueuePage } from '~/pages/ApprovalsQueuePage';
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
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'approvals', element: <ApprovalsQueuePage /> },
      { path: 'purchase-orders', element: <PurchaseOrdersPage /> },
      { path: 'purchase-orders/new', element: <POFormPage /> },
      { path: 'purchase-orders/:poId', element: <PODetailPage /> },
      { path: 'purchase-orders/:poId/edit', element: <POFormPage /> },
      { path: '*', element: <Navigate to="." replace /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
