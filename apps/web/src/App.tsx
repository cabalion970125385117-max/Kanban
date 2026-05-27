import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { BoardsPage } from '@/pages/BoardsPage';
import { BoardPage } from '@/pages/BoardPage';
import { GanttPage } from '@/pages/GanttPage';
import { AutomationPage } from '@/pages/AutomationPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { AdminRoute } from '@/components/shared/AdminRoute';
import { SettingsDialog } from '@/components/shared/SettingsDialog';
import { ChangelogDialog } from '@/components/shared/ChangelogDialog';
import { BugReportDialog } from '@/components/shared/BugReportDialog';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { logError } from '@/lib/errorLogger';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function UnhandledRejectionLogger() {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const reason = e.reason as Error | undefined;
      logError(
        reason?.message ?? String(e.reason),
        reason?.stack ?? null,
        window.location.href,
      );
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UnhandledRejectionLogger />
          <MaintenanceBanner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/boards/:boardId" element={<BoardPage />} />
              <Route path="/boards/:boardId/gantt" element={<GanttPage />} />
              <Route path="/boards/:boardId/automation" element={<AutomationPage />} />
              <Route path="/boards/:boardId/analytics" element={<AnalyticsPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/maintenance" element={<MaintenancePage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <SettingsDialog />
          <ChangelogDialog />
          <BugReportDialog />
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
