import type { Card, Column } from '@questboard/shared';
import { cn } from '@/lib/utils';

interface ProgressWidgetProps {
  cards: Card[];
  columns: Column[];
}

export function ProgressWidget({ cards, columns }: ProgressWidgetProps) {
  const total = cards.length;
  const lastColId = columns[columns.length - 1]?.id;

  const rows = columns.map((col) => {
    const count = cards.filter((c) => c.column_id === col.id).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const isDone = col.id === lastColId;
    return { col, count, pct, isDone };
  });

  return (
    <div className="space-y-2.5 overflow-y-auto max-h-full">
      {rows.map(({ col, count, pct, isDone }) => (
        <div key={col.id}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2 w-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: col.colour ?? '#5B4FCF' }}
              />
              <span className={cn('text-xs font-medium truncate', isDone ? 'text-green-600' : 'text-[var(--color-text)]')}>
                {col.name}
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 ml-2">
              {count} ({pct}%)
            </span>
          </div>
          <div className="h-2 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: isDone ? '#22c55e' : (col.colour ?? '#5B4FCF') }}
            />
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No columns yet</p>
      )}
    </div>
  );
}
