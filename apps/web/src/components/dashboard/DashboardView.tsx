import { useState } from 'react';
import { Plus, Share2, RotateCcw } from 'lucide-react';
import { useDashboardData, useDashboardLayout, useSaveDashboardLayout } from '@/hooks/useDashboard';
import { WidgetGrid } from './WidgetGrid';
import { ShareDashboardModal } from './ShareDashboardModal';
import { DEFAULT_WIDGETS, WIDGET_META } from '@/api/dashboard.api';
import type { WidgetConfig, WidgetType } from '@/api/dashboard.api';
import { uid } from '@/lib/db';

interface DashboardViewProps {
  boardId: string;
  boardName: string;
}

export function DashboardView({ boardId, boardName }: DashboardViewProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: dashData, isLoading: dataLoading } = useDashboardData(boardId);
  const { data: layout, isLoading: layoutLoading } = useDashboardLayout(boardId);
  const saveLayout = useSaveDashboardLayout(boardId);

  const widgets: WidgetConfig[] = layout ?? DEFAULT_WIDGETS;

  const handleReorder = (updated: WidgetConfig[]) => saveLayout.mutate(updated);

  const handleRemove = (id: string) =>
    saveLayout.mutate(widgets.filter((w) => w.id !== id));

  const handleAdd = (type: WidgetType) => {
    setAddOpen(false);
    const newWidget: WidgetConfig = { id: uid(), type };
    saveLayout.mutate([...widgets, newWidget]);
  };

  const handleReset = () => saveLayout.mutate(DEFAULT_WIDGETS);

  const availableTypes = (Object.keys(WIDGET_META) as WidgetType[]).filter(
    (t) => !widgets.some((w) => w.type === t),
  );

  const isLoading = dataLoading || layoutLoading;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Dashboard toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Dashboard</h2>
        <div className="flex items-center gap-2">
          {/* Reset layout */}
          <button
            onClick={handleReset}
            title="Reset to default layout"
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--color-bg)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          {/* Add widget */}
          {availableTypes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setAddOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text)] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add widget
              </button>
              {addOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setAddOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl min-w-[220px] py-1 overflow-hidden">
                    {availableTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleAdd(t)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-bg)] transition-colors"
                      >
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {WIDGET_META[t].label}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {WIDGET_META[t].description}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Share */}
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[var(--color-accent)] text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 skeleton rounded-2xl" />
            ))}
          </div>
        ) : !dashData ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--color-text-muted)]">Failed to load dashboard data.</p>
          </div>
        ) : widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-[var(--color-text-muted)] text-sm">All widgets removed.</p>
            <button
              onClick={handleReset}
              className="text-xs text-[var(--color-accent)] underline"
            >
              Reset to defaults
            </button>
          </div>
        ) : (
          <WidgetGrid
            widgets={widgets}
            data={dashData}
            onReorder={handleReorder}
            onRemove={handleRemove}
          />
        )}
      </div>

      {shareOpen && (
        <ShareDashboardModal
          boardId={boardId}
          boardName={boardName}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
