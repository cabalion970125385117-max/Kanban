import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { AdminRoute } from '@/components/shared/AdminRoute';
import { SettingsDialog } from '@/components/shared/SettingsDialog';
import { ChangelogDialog } from '@/components/shared/ChangelogDialog';
import { BugReportDialog } from '@/components/shared/BugReportDialog';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { SkipNav } from '@/components/shared/SkipNav';
import { logError } from '@/lib/errorLogger';

// ── Route-level code splitting ────────────────────────────────────────────────
// Each page is its own JS chunk; the browser only fetches what it needs.
const LoginPage        = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage     = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const BoardsPage       = lazy(() => import('@/pages/BoardsPage').then(m => ({ default: m.BoardsPage })));
const BoardPage        = lazy(() => import('@/pages/BoardPage').then(m => ({ default: m.BoardPage })));
const GanttPage        = lazy(() => import('@/pages/GanttPage').then(m => ({ default: m.GanttPage })));
const AutomationPage   = lazy(() => import('@/pages/AutomationPage').then(m => ({ default: m.AutomationPage })));
const AnalyticsPage    = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const MaintenancePage  = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })));

function PageFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]" aria-label="Loading…" role="status">
      <div className="animate-pulse text-4xl select-none" aria-hidden="true">⚔️</div>
    </div>
  );
}

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
          <SkipNav />
          <UnhandledRejectionLogger />
          <MaintenanceBanner />
          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
          <SettingsDialog />
          <ChangelogDialog />
          <BugReportDialog />
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
