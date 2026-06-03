import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { Card, Column } from '@questboard/shared';

interface TrendAnalysisWidgetProps {
  cards: Card[];
  columns: Column[];
  /** How many weeks of history to show. Default 8. */
  weeksBack?: number;
}

interface WeekBucket {
  label: string;       // "Jun 2"
  isoStart: string;    // for key
  created: number;
  completed: number;
}

function buildWeeklyBuckets(cards: Card[], lastColId: string | undefined, weeksBack: number): WeekBucket[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  return Array.from({ length: weeksBack }, (_, i) => {
    // i=0 is the oldest week
    const weekEnd = new Date(now.getTime() - (weeksBack - 1 - i) * 7 * 86_400_000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 86_400_000);

    const created = cards.filter((c) => {
      const d = new Date(c.created_at);
      return d > weekStart && d <= weekEnd;
    }).length;

    const completed = lastColId
      ? cards.filter((c) => {
          if (c.column_id !== lastColId) return false;
          const d = new Date(c.updated_at);
          return d > weekStart && d <= weekEnd;
        }).length
      : 0;

    const label = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    return { label, isoStart: weekStart.toISOString(), created, completed };
  });
}

function trendArrow(buckets: WeekBucket[], key: 'created' | 'completed'): { icon: string; label: string; cls: string } {
  if (buckets.length < 4) return { icon: '→', label: 'not enough data', cls: 'text-[var(--color-text-muted)]' };
  const half = Math.floor(buckets.length / 2);
  const older = buckets.slice(0, half).reduce((s, b) => s + b[key], 0) / half;
  const newer = buckets.slice(half).reduce((s, b) => s + b[key], 0) / (buckets.length - half);
  const delta = newer - older;
  if (Math.abs(delta) < 0.5) return { icon: '→', label: 'stable', cls: 'text-[var(--color-text-muted)]' };
  if (delta > 0) return { icon: '↑', label: 'increasing', cls: 'text-green-600' };
  return { icon: '↓', label: 'decreasing', cls: 'text-red-500' };
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-[var(--color-text)] mb-1.5">Week of {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 mb-0.5">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--color-text-muted)]">{p.name}:</span>
          <span className="font-semibold text-[var(--color-text)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function TrendAnalysisWidget({ cards, columns, weeksBack = 8 }: TrendAnalysisWidgetProps) {
  const lastCol    = columns[columns.length - 1];
  const buckets    = buildWeeklyBuckets(cards, lastCol?.id, weeksBack);
  const avgCreated   = (buckets.reduce((s, b) => s + b.created,   0) / weeksBack).toFixed(1);
  const avgCompleted = (buckets.reduce((s, b) => s + b.completed, 0) / weeksBack).toFixed(1);

  const createdTrend   = trendArrow(buckets, 'created');
  const completedTrend = trendArrow(buckets, 'completed');

  // Net flow: if avg completed > avg created, team is clearing backlog
  const netFlow = parseFloat(avgCompleted) - parseFloat(avgCreated);
  const netFlowLabel = netFlow > 0.3
    ? 'Clearing backlog'
    : netFlow < -0.3
    ? 'Backlog growing'
    : 'Balanced';
  const netFlowCls = netFlow > 0.3 ? 'text-green-600' : netFlow < -0.3 ? 'text-red-500' : 'text-[var(--color-text-muted)]';

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent').trim() || '#5B4FCF';

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs bg-[var(--color-bg)] rounded-lg px-2.5 py-1.5 border border-[var(--color-border)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[var(--color-text-muted)]">Avg created/wk</span>
          <span className="font-semibold text-[var(--color-text)]">{avgCreated}</span>
          <span className={`font-bold ${createdTrend.cls}`}>{createdTrend.icon}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-[var(--color-bg)] rounded-lg px-2.5 py-1.5 border border-[var(--color-border)]">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[var(--color-text-muted)]">Avg closed/wk</span>
          <span className="font-semibold text-[var(--color-text)]">{avgCompleted}</span>
          <span className={`font-bold ${completedTrend.cls}`}>{completedTrend.icon}</span>
        </div>
        <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] ${netFlowCls}`}>
          {netFlowLabel}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={buckets} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={accentColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            />

            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="var(--color-border)" />

            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#gradCreated)"
              dot={{ r: 3, fill: accentColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#gradCompleted)"
              dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0 text-center">
        Last {weeksBack} weeks · Completed = cards moved to{' '}
        <span className="font-medium">{lastCol?.name ?? 'final column'}</span>
      </p>
    </div>
  );
}
