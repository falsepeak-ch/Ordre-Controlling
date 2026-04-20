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
import { CategoriesPage } from '~/pages/CategoriesPage';
import { ProjectSettingsPage } from '~/pages/ProjectSettingsPage';
import { InvoicesPage } from '~/pages/InvoicesPage';
import { ReportsPage } from '~/pages/ReportsPage';
import { NotFoundPage } from '~/pages/NotFoundPage';
import { ErrorPage } from '~/pages/ErrorPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
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
    errorElement: <ErrorPage />,
  },
  {
    path: '/app/p/:projectId',
    element: (
      <RequireAuth>
        <ProjectShell />
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'approvals', element: <ApprovalsQueuePage /> },
      { path: 'settings', element: <ProjectSettingsPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'purchase-orders', element: <PurchaseOrdersPage /> },
      { path: 'purchase-orders/new', element: <POFormPage /> },
      { path: 'purchase-orders/:poId', element: <PODetailPage /> },
      { path: 'purchase-orders/:poId/edit', element: <POFormPage /> },
      { path: '*', element: <Navigate to="." replace /> },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <ErrorPage /> },
]);
