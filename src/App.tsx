import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '~/contexts/ThemeContext';
import { AuthProvider } from '~/contexts/AuthContext';
import { ToastProvider } from '~/contexts/ToastContext';
import { ProjectsProvider } from '~/contexts/ProjectsContext';
import { SubscriptionProvider } from '~/contexts/SubscriptionContext';
import { ToastStack } from '~/components/ui/Toast';
import { router } from '~/routes';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <ProjectsProvider>
            <ToastProvider>
              <RouterProvider router={router} />
              <ToastStack />
            </ToastProvider>
          </ProjectsProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
