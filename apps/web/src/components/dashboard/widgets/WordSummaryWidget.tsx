import type { Card, Column, BoardMember } from '@questboard/shared';

interface WordSummaryWidgetProps {
  cards: Card[];
  columns: Column[];
  members: BoardMember[];
  boardName: string;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <strong className="text-[var(--color-text)] font-semibold">{children}</strong>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
        {title}
      </p>
      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{children}</p>
    </div>
  );
}

export function WordSummaryWidget({ cards, columns, members, boardName }: WordSummaryWidgetProps) {
  const today = new Date().toISOString().split('T')[0];
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const total      = cards.length;
  const lastCol    = columns[columns.length - 1];
  const doneCount  = lastCol ? cards.filter((c) => c.column_id === lastCol.id).length : 0;
  const donePct    = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const overdue    = cards.filter((c) => c.end_date && c.end_date < today).length;
  const dueIn7     = cards.filter((c) => {
    if (!c.end_date) return false;
    const d = daysUntil(c.end_date);
    return d >= 0 && d <= 7;
  }).length;
  const critical   = cards.filter((c) => c.priority === 'critical').length;
  const high       = cards.filter((c) => c.priority === 'high').length;
  const unassigned = cards.filter((c) => !c.owners || c.owners.length === 0).length;

  // Busiest column (excluding last/done col)
  const busiestCol = [...columns]
    .filter((c) => c.id !== lastCol?.id)
    .map((c) => ({ ...c, count: cards.filter((card) => card.column_id === c.id).length }))
    .sort((a, b) => b.count - a.count)[0];

  // Top assignee
  const topAssignee = members
    .map((m) => ({
      name: m.user?.name ?? 'Someone',
      count: cards.filter((c) => c.owners?.some((o) => o.id === m.user_id)).length,
    }))
    .sort((a, b) => b.count - a.count)[0];

  // Most recent activity
  const lastUpdated = cards.length > 0
    ? new Date(Math.max(...cards.map((c) => new Date(c.updated_at).getTime())))
    : null;
  const lastUpdatedAgo = lastUpdated
    ? (() => {
        const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60_000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
      })()
    : 'never';

  const urgencyLine = overdue > 0
    ? <><Highlight>{plural(overdue, 'card')}</Highlight> {overdue === 1 ? 'is' : 'are'} overdue
      {dueIn7 > 0 && <> — <Highlight>{dueIn7}</Highlight> more due within 7 days</>}.</>
    : dueIn7 > 0
    ? <><Highlight>{plural(dueIn7, 'card')}</Highlight> due within the next 7 days.</>
    : <>No cards are overdue or due this week. Great shape!</>;

  return (
    <div className="space-y-3 overflow-y-auto max-h-full">
      {/* Date header */}
      <div className="pb-2 border-b border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-text-muted)]">{dateLabel}</p>
        <p className="text-sm font-bold text-[var(--color-text)] mt-0.5">{boardName}</p>
      </div>

      <Section title="Active Work">
        <Highlight>{plural(total, 'active card')}</Highlight> across{' '}
        <Highlight>{plural(columns.length, 'column')}</Highlight>.
        {busiestCol && busiestCol.count > 0 && (
          <> The most loaded column is <Highlight>"{busiestCol.name}"</Highlight> with{' '}
          <Highlight>{busiestCol.count}</Highlight>.</>
        )}
        {(critical > 0 || high > 0) && (
          <> <Highlight>{critical + high} card{critical + high !== 1 ? 's' : ''}</Highlight>{' '}
          are Critical or High priority.</>
        )}
      </Section>

      <Section title="Team">
        {members.length === 0
          ? 'No members yet.'
          : <>
              <Highlight>{plural(members.length, 'member')}</Highlight> on this board.{' '}
              {topAssignee && topAssignee.count > 0 && (
                <><Highlight>{topAssignee.name}</Highlight> has the most work with{' '}
                <Highlight>{plural(topAssignee.count, 'card')}</Highlight> assigned.</>
              )}
              {unassigned > 0 && (
                <> <Highlight>{plural(unassigned, 'card')}</Highlight> {unassigned === 1 ? 'has' : 'have'} no assignee.</>
              )}
            </>
        }
      </Section>

      <Section title="Timeline">
        {urgencyLine}
      </Section>

      <Section title="Completion">
        {lastCol
          ? <><Highlight>{donePct}%</Highlight> of cards are in the final column
            (<Highlight>{lastCol.name}</Highlight>){' '}
            — <Highlight>{plural(doneCount, 'card')}</Highlight> done.
            Last activity <Highlight>{lastUpdatedAgo}</Highlight>.</>
          : 'No columns defined yet.'
        }
      </Section>
    </div>
  );
}
