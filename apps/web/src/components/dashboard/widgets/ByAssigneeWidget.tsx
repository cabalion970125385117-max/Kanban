import type { Card, BoardMember } from '@questboard/shared';

interface ByAssigneeWidgetProps {
  cards: Card[];
  members: BoardMember[];
}

export function ByAssigneeWidget({ cards, members }: ByAssigneeWidgetProps) {
  const maxCount = Math.max(1, ...members.map((m) =>
    cards.filter((c) => c.owners?.some((o) => o.id === m.user_id)).length,
  ));

  const rows = members
    .map((m) => ({
      id: m.user_id,
      name: m.user?.name ?? 'Unknown',
      initials: (m.user?.name ?? 'U').slice(0, 2).toUpperCase(),
      thumb: m.user?.avatar?.thumb_url,
      count: cards.filter((c) => c.owners?.some((o) => o.id === m.user_id)).length,
    }))
    .sort((a, b) => b.count - a.count);

  const unassigned = cards.filter((c) => !c.owners || c.owners.length === 0).length;

  return (
    <div className="space-y-2 overflow-y-auto max-h-full">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {r.thumb ? (
              <img src={r.thumb} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-white font-bold">{r.initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--color-text)] truncate">{r.name}</p>
            <div className="h-1.5 bg-[var(--color-border)] rounded-full mt-0.5 overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] rounded-full"
                style={{ width: `${(r.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] w-5 text-right flex-shrink-0">
            {r.count}
          </span>
        </div>
      ))}

      {unassigned > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--color-border)] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-[var(--color-text-muted)] font-bold">?</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--color-text-muted)]">Unassigned</p>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] w-5 text-right">
            {unassigned}
          </span>
        </div>
      )}

      {rows.length === 0 && unassigned === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-4">No cards yet</p>
      )}
    </div>
  );
}
