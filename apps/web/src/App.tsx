import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { AdminRoute } from '@/components/shared/AdminRoute';
import { SettingsDialog } from '@/components/shared/SettingsDialog';
import { ChangelogDialog } from '@/components/shared/ChangelogDialog';
import { BugReportDialog } from '@/components/shared/BugReportDialog';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { MaintenanceBanner } from '@/components/shared/MaintenanceBanner';
import { SkipNav } from '@/components/shared/SkipNav';
import { logError } from '@/lib/errorLogger';
import { useBridgeSync } from '@/hooks/useBridgeSync';

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
const MaintenancePage        = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const SharedDashboardPage    = lazy(() => import('@/pages/SharedDashboardPage').then(m => ({ default: m.SharedDashboardPage })));
const CalendarPage           = lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const MyWorkPage             = lazy(() => import('@/pages/MyWorkPage').then(m => ({ default: m.MyWorkPage })));
const RoadmapPage            = lazy(() => import('@/pages/RoadmapPage').then(m => ({ default: m.RoadmapPage })));
const SprintBacklogPage      = lazy(() => import('@/pages/SprintBacklogPage').then(m => ({ default: m.SprintBacklogPage })));

function PageFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]" aria-label="Loading…" role="status">
      <div className="h-8 w-8 rounded-full border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] animate-spin" aria-hidden="true" />
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

function BridgeSyncProvider() {
  useBridgeSync();
  return null;
}

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
          <BridgeSyncProvider />
          <MaintenanceBanner />
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/share/:token" element={<SharedDashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/boards/:boardId" element={<BoardPage />} />
              <Route path="/boards/:boardId/gantt" element={<GanttPage />} />
              <Route path="/boards/:boardId/automation" element={<AutomationPage />} />
              <Route path="/boards/:boardId/analytics" element={<AnalyticsPage />} />
              <Route path="/boards/:boardId/calendar" element={<CalendarPage />} />
              <Route path="/boards/:boardId/roadmap" element={<RoadmapPage />} />
              <Route path="/boards/:boardId/sprint" element={<SprintBacklogPage />} />
              <Route path="/my-work" element={<MyWorkPage />} />
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
          <CommandPalette />
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
