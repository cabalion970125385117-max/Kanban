import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { useUiStore } from '@/stores/ui.store';

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { openChangelog } = useUiStore();
  if (isAuthenticated) return <Navigate to="/boards" replace />;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* ── Task-banner slot — reserved for future animated banner (current task + team count) ── */}
      <div className="h-10 flex-shrink-0 border-b border-[var(--color-border)]" aria-hidden="true" />

      <div id="main-content" className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{'⚔️'}</div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)]">QuestBoard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Pixel-art project management
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue your quest</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 mt-4">
          <VersionBadge />
          <span className="text-[var(--color-text-muted)] text-xs">·</span>
          <button
            onClick={openChangelog}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            Changelog
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
