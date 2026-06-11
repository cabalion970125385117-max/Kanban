import type { Card, Column } from '@questboard/shared';
import { cn } from '@/lib/utils';

interface UpcomingDueWidgetProps {
  cards: Card[];
  columns: Column[];
  /** How many days ahead to look. Default 14. */
  daysAhead?: number;
}

function daysFromNow(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function urgencyLabel(days: number): { text: string; cls: string; badgeCls: string } {
  if (days < 0)  return { text: 'Overdue',   cls: 'border-red-300 bg-red-50/50',    badgeCls: 'bg-red-500 text-white' };
  if (days === 0) return { text: 'Today',     cls: 'border-red-200 bg-red-50/30',    badgeCls: 'bg-red-500 text-white' };
  if (days === 1) return { text: 'Tomorrow',  cls: 'border-orange-200 bg-orange-50/30', badgeCls: 'bg-orange-500 text-white' };
  if (days <= 3)  return { text: `${days}d`,  cls: 'border-amber-200 bg-amber-50/30',  badgeCls: 'bg-amber-500 text-white' };
  if (days <= 7)  return { text: `${days}d`,  cls: 'border-yellow-200',              badgeCls: 'bg-yellow-400 text-yellow-900' };
  return           { text: `${days}d`,        cls: 'border-[var(--color-border)]',   badgeCls: 'bg-[var(--color-border)] text-[var(--color-text-muted)]' };
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

export function UpcomingDueWidget({ cards, columns, daysAhead = 14 }: UpcomingDueWidgetProps) {
  const colNameById  = Object.fromEntries(columns.map((c) => [c.id, c.name]));
  const colColorById = Object.fromEntries(columns.map((c) => [c.id, c.colour ?? '#5B4FCF']));

  const upcoming = cards
    .filter((c) => {
      if (!c.end_date) return false;
      const d = daysFromNow(c.end_date);
      return d <= daysAhead; // includes overdue (d < 0)
    })
    .sort((a, b) => a.end_date!.localeCompare(b.end_date!));

  const overdueCount  = upcoming.filter((c) => daysFromNow(c.end_date!) < 0).length;
  const dueToday      = upcoming.filter((c) => daysFromNow(c.end_date!) === 0).length;
  const dueThisWeek   = upcoming.filter((c) => {
    const d = daysFromNow(c.end_date!);
    return d > 0 && d <= 7;
  }).length;

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-full">
      {/* Summary chips */}
      {upcoming.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {overdueCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {overdueCount} overdue
            </span>
          )}
          {dueToday > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
              {dueToday} today
            </span>
          )}
          {dueThisWeek > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              {dueThisWeek} this week
            </span>
          )}
        </div>
      )}

      {upcoming.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-sm font-medium text-[var(--color-text)]">All clear!</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            No cards due in the next {daysAhead} days.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map((card) => {
            const days    = daysFromNow(card.end_date!);
            const urgency = urgencyLabel(days);

            return (
              <div
                key={card.id}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 rounded-lg border',
                  urgency.cls,
                )}
              >
                {/* Priority dot */}
                <span
                  className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_COLOR[card.priority] ?? '#94a3b8' }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate leading-tight">
                    {card.title}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {/* Column badge */}
                    <span
                      className="text-[10px] px-1.5 py-px rounded-full text-white font-medium"
                      style={{ backgroundColor: colColorById[card.column_id] }}
                    >
                      {colNameById[card.column_id] ?? '—'}
                    </span>

                    {/* Assignee initials */}
                    {card.owners && card.owners.length > 0 && (
                      <div className="flex -space-x-1">
                        {card.owners.slice(0, 3).map((o) => (
                          <div
                            key={o.id}
                            title={o.name}
                            className="w-4 h-4 rounded-full bg-[var(--color-accent)] border border-white flex items-center justify-center overflow-hidden"
                          >
                            {o.avatar?.thumb_url ? (
                              <img src={o.avatar.thumb_url} alt={o.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] text-white font-bold">
                                {o.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Due badge */}
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5', urgency.badgeCls)}>
                  {urgency.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-1">
          Showing cards due in the next {daysAhead} days
        </p>
      )}
    </div>
  );
}
