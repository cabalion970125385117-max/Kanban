import type { Card, Column } from '@questboard/shared';

interface RecentActivityWidgetProps {
  cards: Card[];
  columns: Column[];
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-green-500',
};

export function RecentActivityWidget({ cards, columns }: RecentActivityWidgetProps) {
  const colNameById = Object.fromEntries(columns.map((c) => [c.id, c.name]));
  const colColorById = Object.fromEntries(columns.map((c) => [c.id, c.colour ?? '#5B4FCF']));

  const recent = [...cards]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8);

  return (
    <div className="space-y-2 overflow-y-auto max-h-full">
      {recent.map((card) => (
        <div key={card.id} className="flex items-start gap-2 py-1 border-b border-[var(--color-border)] last:border-0">
          <span
            className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[card.priority] ?? 'bg-gray-400'}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--color-text)] truncate">{card.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="text-[10px] px-1.5 py-px rounded-full text-white font-medium"
                style={{ backgroundColor: colColorById[card.column_id] }}
              >
                {colNameById[card.column_id] ?? '—'}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {timeAgo(card.updated_at)}
              </span>
            </div>
          </div>
        </div>
      ))}
      {recent.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No cards yet</p>
      )}
    </div>
  );
}
