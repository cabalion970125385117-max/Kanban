import { Clock, CheckCircle2, Layers, Timer } from 'lucide-react';
import type { AnalyticsSummary } from '@/api/analytics.api';

interface KpiCardsProps {
  summary: AnalyticsSummary;
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-text-muted)] font-medium">{label}</p>
        <p className="text-2xl font-bold text-[var(--color-text)] leading-tight">{value}</p>
        {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function KpiCards({ summary }: KpiCardsProps) {
  const hours = Math.floor(summary.totalTimeMinutes / 60);
  const mins = summary.totalTimeMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={<Layers className="h-4 w-4 text-[var(--color-accent)]" />}
        label="Total Cards"
        value={summary.totalCards}
        sub={`${summary.completionRate}% completion rate`}
        color="bg-[var(--color-accent)]/10"
      />
      <KpiCard
        icon={<CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />}
        label="Completed"
        value={summary.completedCards}
        sub={`${summary.totalCards - summary.completedCards} still active`}
        color="bg-[var(--color-success)]/10"
      />
      <KpiCard
        icon={<Timer className="h-4 w-4 text-[var(--color-info)]" />}
        label="Time Logged"
        value={timeStr}
        sub={`${summary.totalEstimateHours.toFixed(1)}h estimated`}
        color="bg-[var(--color-info)]/10"
      />
      <KpiCard
        icon={<Clock className="h-4 w-4 text-[var(--color-warning)]" />}
        label="Avg Card Age"
        value={`${summary.avgCardAgeDays}d`}
        sub="active cards"
        color="bg-[var(--color-warning)]/10"
      />
    </div>
  );
}
