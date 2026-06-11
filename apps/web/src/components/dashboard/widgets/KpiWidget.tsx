import type { Card, Column } from '@questboard/shared';

interface KpiWidgetProps {
  cards: Card[];
  columns: Column[];
}

export function KpiWidget({ cards, columns }: KpiWidgetProps) {
  const today = new Date().toISOString().split('T')[0];
  const lastColId = columns[columns.length - 1]?.id;

  const total    = cards.length;
  const done     = lastColId ? cards.filter((c) => c.column_id === lastColId).length : 0;
  const overdue  = cards.filter((c) => c.end_date && c.end_date < today).length;
  const critical = cards.filter((c) => c.priority === 'critical').length;
  const donePct  = total > 0 ? Math.round((done / total) * 100) : 0;

  const tiles = [
    { label: 'Total Cards',   value: total,             sub: 'active',        accent: 'var(--color-accent)' },
    { label: 'Done',          value: `${donePct}%`,     sub: `${done} cards`, accent: '#22c55e' },
    { label: 'Overdue',       value: overdue,           sub: 'past due date', accent: overdue > 0 ? '#ef4444' : 'var(--color-text-muted)' },
    { label: 'Critical',      value: critical,          sub: 'priority',      accent: critical > 0 ? '#f97316' : 'var(--color-text-muted)' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-[var(--color-bg)] rounded-xl p-4 flex flex-col justify-between"
        >
          <p className="text-xs text-[var(--color-text-muted)] font-medium">{t.label}</p>
          <div>
            <p className="text-3xl font-bold mt-1" style={{ color: t.accent }}>
              {t.value}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
