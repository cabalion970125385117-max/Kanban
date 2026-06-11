import type { Card } from '@questboard/shared';

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f97316' },
  { value: 'medium',   label: 'Medium',   color: '#eab308' },
  { value: 'low',      label: 'Low',      color: '#22c55e' },
] as const;

interface ByPriorityWidgetProps {
  cards: Card[];
}

export function ByPriorityWidget({ cards }: ByPriorityWidgetProps) {
  const total = cards.length || 1;
  const counts = PRIORITIES.map((p) => ({
    ...p,
    count: cards.filter((c) => c.priority === p.value).length,
  }));

  return (
    <div className="space-y-3 py-1">
      {counts.map((p) => {
        const pct = Math.round((p.count / total) * 100);
        return (
          <div key={p.value}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-xs font-medium text-[var(--color-text)]">{p.label}</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{p.count}</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: p.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
