import { useParams, Link } from 'react-router-dom';
import { Eye, ExternalLink } from 'lucide-react';
import { usePublicDashboard } from '@/hooks/useDashboard';
import { WidgetGrid } from '@/components/dashboard/WidgetGrid';
import { DEFAULT_WIDGETS } from '@/api/dashboard.api';

export function SharedDashboardPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError } = usePublicDashboard(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <p className="text-[var(--color-text-muted)]">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-lg font-bold text-[var(--color-text)] mb-2">Dashboard not found</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            This share link may have been revoked, or you're on a different device from where
            the board was created. QuestBoard is local-first — data lives in your browser.
          </p>
          <Link
            to="/login"
            className="text-sm text-[var(--color-accent)] underline"
          >
            Sign in to QuestBoard
          </Link>
        </div>
      </div>
    );
  }

  const { data: dashData, layout } = data;
  const widgets = layout ?? DEFAULT_WIDGETS;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <span className="font-bold text-lg tracking-wide">QuestBoard</span>
            <span className="mx-2 text-white/40">·</span>
            <span className="text-white/80 text-sm">{dashData.board.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/10 px-3 py-1.5 rounded-full">
            <Eye className="h-3.5 w-3.5" />
            Read-only shared view
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Sign in
          </Link>
        </div>
      </header>

      {/* Dashboard */}
      <main className="flex-1 px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--color-text)]">
            {dashData.board.name} — Dashboard
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {dashData.cards.length} active cards · {dashData.members.length} members
          </p>
        </div>

        <WidgetGrid
          widgets={widgets}
          data={dashData}
          onReorder={() => {}}
          onRemove={() => {}}
          readOnly
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 py-3 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          Powered by{' '}
          <Link to="/login" className="text-[var(--color-accent)] hover:underline">
            QuestBoard
          </Link>
          {' '}· Data from local device · Read-only
        </p>
      </footer>
    </div>
  );
}
