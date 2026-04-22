import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '~/components/layout/PublicLayout';
import { ProjectShell } from '~/components/layout/ProjectShell';
import { RequireAuth } from '~/components/RequireAuth';
import { NotFoundPage } from '~/pages/NotFoundPage';
import { ErrorPage } from '~/pages/ErrorPage';

const LandingPage = lazy(() => import('~/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('~/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('~/pages/SignupPage').then(m => ({ default: m.SignupPage })));
const TermsPage = lazy(() => import('~/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('~/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const ProjectsListPage = lazy(() => import('~/pages/ProjectsListPage').then(m => ({ default: m.ProjectsListPage })));
const DashboardPage = lazy(() => import('~/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MembersPage = lazy(() => import('~/pages/MembersPage').then(m => ({ default: m.MembersPage })));
const SuppliersPage = lazy(() => import('~/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const CategoriesPage = lazy(() => import('~/pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const ApprovalsQueuePage = lazy(() => import('~/pages/ApprovalsQueuePage').then(m => ({ default: m.ApprovalsQueuePage })));
const ProjectSettingsPage = lazy(() => import('~/pages/ProjectSettingsPage').then(m => ({ default: m.ProjectSettingsPage })));
const InvoicesPage = lazy(() => import('~/pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const ReportsPage = lazy(() => import('~/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const PurchaseOrdersPage = lazy(() => import('~/pages/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })));
const PODetailPage = lazy(() => import('~/pages/PODetailPage').then(m => ({ default: m.PODetailPage })));
const POFormPage = lazy(() => import('~/pages/POFormPage').then(m => ({ default: m.POFormPage })));

const Page = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <Page><LandingPage /></Page> },
      { path: '/login', element: <Page><LoginPage /></Page> },
      { path: '/signup', element: <Page><SignupPage /></Page> },
      { path: '/terms', element: <Page><TermsPage /></Page> },
      { path: '/privacy', element: <Page><PrivacyPage /></Page> },
    ],
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <Page><ProjectsListPage /></Page>
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
      { index: true, element: <Page><DashboardPage /></Page> },
      { path: 'members', element: <Page><MembersPage /></Page> },
      { path: 'suppliers', element: <Page><SuppliersPage /></Page> },
      { path: 'categories', element: <Page><CategoriesPage /></Page> },
      { path: 'approvals', element: <Page><ApprovalsQueuePage /></Page> },
      { path: 'settings', element: <Page><ProjectSettingsPage /></Page> },
      { path: 'invoices', element: <Page><InvoicesPage /></Page> },
      { path: 'reports', element: <Page><ReportsPage /></Page> },
      { path: 'purchase-orders', element: <Page><PurchaseOrdersPage /></Page> },
      { path: 'purchase-orders/new', element: <Page><POFormPage /></Page> },
      { path: 'purchase-orders/:poId', element: <Page><PODetailPage /></Page> },
      { path: 'purchase-orders/:poId/edit', element: <Page><POFormPage /></Page> },
      { path: '*', element: <Navigate to="." replace /> },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <ErrorPage /> },
]);
