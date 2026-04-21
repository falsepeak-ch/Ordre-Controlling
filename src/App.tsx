import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '~/contexts/ThemeContext';
import { AuthProvider } from '~/contexts/AuthContext';
import { ToastProvider } from '~/contexts/ToastContext';
import { ProjectsProvider } from '~/contexts/ProjectsContext';
import { SubscriptionProvider } from '~/contexts/SubscriptionContext';
import { ConfirmProvider } from '~/contexts/ConfirmContext';
import { ConsentProvider } from '~/contexts/ConsentContext';
import { ToastStack } from '~/components/ui/Toast';
import { ConsentBanner } from '~/components/ConsentBanner';
import { ErrorBoundary } from '~/components/ErrorBoundary';
import { router } from '~/routes';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConsentProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <ProjectsProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <RouterProvider router={router} />
                    <ToastStack />
                    <ConsentBanner />
                  </ConfirmProvider>
                </ToastProvider>
              </ProjectsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ConsentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
