import { format, parseISO, getDay } from 'date-fns';
import type { HeatmapPoint } from '@/api/analytics.api';

interface HeatmapGridProps {
  data: HeatmapPoint[];
}

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-[var(--color-border)]',
  1: 'bg-[var(--color-accent)]/20',
  2: 'bg-[var(--color-accent)]/40',
  3: 'bg-[var(--color-accent)]/65',
  4: 'bg-[var(--color-accent)]',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HeatmapGrid({ data }: HeatmapGridProps) {
  // Pad the start so week starts on Sunday
  const firstDayOfWeek = data.length > 0 ? getDay(parseISO(data[0].date)) : 0;
  const padded: (HeatmapPoint | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...data,
  ];

  // Group into columns of 7
  const weeks: (HeatmapPoint | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // Month labels: when the month changes in the data
  const monthLabels: Array<{ col: number; label: string }> = [];
  let lastMonth = '';
  weeks.forEach((week, col) => {
    const firstData = week.find((d) => d !== null);
    if (firstData) {
      const m = format(parseISO(firstData.date), 'MMM');
      if (m !== lastMonth) {
        monthLabels.push({ col, label: m });
        lastMonth = m;
      }
    }
  });

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Activity Heatmap</h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">Cards created & completed per day — last 12 weeks</p>

      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1">
            <div className="h-4" /> {/* spacer for month labels */}
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className="h-3 w-7 flex items-center text-[10px] text-[var(--color-text-muted)]"
                style={{ opacity: i % 2 === 0 ? 1 : 0 }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, col) => {
            const monthLabel = monthLabels.find((m) => m.col === col);
            return (
              <div key={col} className="flex flex-col gap-1">
                <div className="h-4 text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                  {monthLabel?.label ?? ''}
                </div>
                {Array(7).fill(null).map((_, row) => {
                  const cell = week[row] ?? null;
                  return (
                    <div
                      key={row}
                      title={cell ? `${cell.date}: ${cell.count} activities` : undefined}
                      className={`h-3 w-3 rounded-sm ${cell ? LEVEL_COLORS[cell.level] : 'bg-transparent'}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3">
        <span className="text-[10px] text-[var(--color-text-muted)] mr-1">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`h-3 w-3 rounded-sm ${LEVEL_COLORS[l]}`} />
        ))}
        <span className="text-[10px] text-[var(--color-text-muted)] ml-1">More</span>
      </div>
    </div>
  );
}
