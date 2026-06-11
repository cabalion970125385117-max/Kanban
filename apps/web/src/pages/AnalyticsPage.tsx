import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCards } from '@/components/analytics/KpiCards';
import { CycleTimeChart } from '@/components/analytics/CycleTimeChart';
import { BurndownChart } from '@/components/analytics/BurndownChart';
import { HeatmapGrid } from '@/components/analytics/HeatmapGrid';
import { VelocityChart } from '@/components/analytics/VelocityChart';
import {
  useAnalyticsSummary,
  useCycleTimeData,
  useBurndownData,
  useHeatmapData,
  useVelocityData,
} from '@/hooks/useAnalytics';
import { useBoard } from '@/hooks/useBoard';

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <div className="skeleton rounded-xl" style={{ height }} />;
}

export function AnalyticsPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const { boardQuery } = useBoard(boardId ?? '');
  const summary = useAnalyticsSummary(boardId ?? '');
  const cycleTime = useCycleTimeData(boardId ?? '');
  const burndown = useBurndownData(boardId ?? '');
  const heatmap = useHeatmapData(boardId ?? '');
  const velocity = useVelocityData(boardId ?? '');

  if (!boardId) { navigate('/boards'); return null; }

  const isLoading = summary.isLoading || cycleTime.isLoading;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/boards/${boardId}`)}
          className="text-white hover:bg-white/10"
          title="Back to board"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BarChart3 className="h-4 w-4 text-yellow-300 flex-shrink-0" />
          <h1 className="text-base font-bold truncate">
            {boardQuery.data?.name ?? 'Board'} — Analytics
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Analytics</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Insights derived from your board's card history and time logs.
          </p>
        </div>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => <div key={n} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : summary.data ? (
          <KpiCards summary={summary.data} />
        ) : null}

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cycleTime.isLoading ? <ChartSkeleton /> : cycleTime.data ? <CycleTimeChart data={cycleTime.data} /> : null}
          {burndown.isLoading ? <ChartSkeleton /> : burndown.data ? <BurndownChart data={burndown.data} /> : null}
        </div>

        {/* Heatmap */}
        {heatmap.isLoading ? <ChartSkeleton height={160} /> : heatmap.data ? <HeatmapGrid data={heatmap.data} /> : null}

        {/* Velocity */}
        {velocity.isLoading ? <ChartSkeleton /> : velocity.data ? <VelocityChart data={velocity.data} /> : null}

        {summary.data?.totalCards === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm mt-1">Create some cards to see analytics here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
