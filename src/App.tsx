import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '~/contexts/ThemeContext';
import { AuthProvider } from '~/contexts/AuthContext';
import { ToastProvider } from '~/contexts/ToastContext';
import { ProjectsProvider } from '~/contexts/ProjectsContext';
import { ToastStack } from '~/components/ui/Toast';
import { router } from '~/routes';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectsProvider>
          <ToastProvider>
            <RouterProvider router={router} />
            <ToastStack />
          </ToastProvider>
        </ProjectsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
