import type { Card, Column, BoardMember } from '@questboard/shared';
import { cn } from '@/lib/utils';

interface AvgCloseTimeWidgetProps {
  cards: Card[];
  columns: Column[];
  members: BoardMember[];
}

function formatDuration(ms: number): string {
  const hrs = ms / 3_600_000;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  const days = hrs / 24;
  if (days < 7) return `${days.toFixed(1)}d`;
  const weeks = days / 7;
  return `${weeks.toFixed(1)}w`;
}

/** Speed tier → colour class for the time badge */
function speedClass(days: number): string {
  if (days < 1)  return 'text-green-600 bg-green-50';
  if (days < 3)  return 'text-green-600 bg-green-50';
  if (days < 7)  return 'text-amber-600 bg-amber-50';
  if (days < 14) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

export function AvgCloseTimeWidget({ cards, columns, members }: AvgCloseTimeWidgetProps) {
  const lastCol = columns[columns.length - 1];
  const doneCards = lastCol ? cards.filter((c) => c.column_id === lastCol.id) : [];

  const rows = members
    .map((m) => {
      const mine = doneCards.filter((c) => c.owners?.some((o) => o.id === m.user_id));
      if (mine.length === 0) return { ...m, avgMs: null, count: 0 };
      const totalMs = mine.reduce((sum, c) => {
        const created = new Date(c.created_at).getTime();
        const closed  = new Date(c.updated_at).getTime();
        return sum + Math.max(0, closed - created);
      }, 0);
      return { ...m, avgMs: totalMs / mine.length, count: mine.length };
    })
    .sort((a, b) => {
      // Those with data first, then by avgMs ascending (fastest first)
      if (a.avgMs === null && b.avgMs === null) return 0;
      if (a.avgMs === null) return 1;
      if (b.avgMs === null) return -1;
      return a.avgMs - b.avgMs;
    });

  const hasData = rows.some((r) => r.avgMs !== null);

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto max-h-full">
      {/* Column label */}
      {lastCol && (
        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
          Based on cards currently in{' '}
          <span className="font-medium" style={{ color: lastCol.colour ?? '#5B4FCF' }}>
            {lastCol.name}
          </span>
          . Close time = card age when it reached the final column.
        </p>
      )}

      {rows.map((r) => {
        const name   = r.user?.name ?? 'Unknown';
        const thumb  = r.user?.avatar?.thumb_url;
        const initials = name.slice(0, 2).toUpperCase();
        const avgDays = r.avgMs !== null ? r.avgMs / 86_400_000 : null;

        return (
          <div key={r.user_id} className="flex items-center gap-2.5 py-2 border-b border-[var(--color-border)] last:border-0">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {thumb ? (
                <img src={thumb} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-white font-bold">{initials}</span>
              )}
            </div>

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-text)] truncate">{name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {r.count > 0
                  ? `${r.count} card${r.count !== 1 ? 's' : ''} closed`
                  : 'No closed cards yet'}
              </p>
            </div>

            {/* Avg time badge */}
            {avgDays !== null ? (
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                speedClass(avgDays),
              )}>
                {formatDuration(r.avgMs!)}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">—</span>
            )}
          </div>
        );
      })}

      {!hasData && (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--color-text-muted)]">No closed cards yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Avg close time appears once cards reach{' '}
            <span className="font-medium">{lastCol?.name ?? 'the final column'}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
