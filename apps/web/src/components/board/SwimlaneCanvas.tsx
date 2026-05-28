import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { useBoardStore } from '@/stores/board.store';
import type { ActiveFilters, SwimlaneGroupBy } from './FilterBar';
import type { Card, Priority } from '@questboard/shared';

interface SwimlaneCanvasProps {
  boardId: string;
  onCardClick: (card: Card) => void;
  filters: ActiveFilters;
  groupBy: SwimlaneGroupBy;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f97316' },
  { value: 'medium',   label: 'Medium',   color: '#eab308' },
  { value: 'low',      label: 'Low',      color: '#22c55e' },
];

interface SwimGroup {
  key: string;
  label: string;
  color?: string;
  cards: Card[];
}

function CardMini({ card, onClick }: { card: Card; onClick: (c: Card) => void }) {
  const isOverdue = card.end_date && new Date(card.end_date) < new Date() && !card.archived_at;
  return (
    <div
      onClick={() => onClick(card)}
      className="bg-[var(--color-surface)] rounded p-2 text-xs cursor-pointer border border-transparent hover:border-[var(--color-accent)]/40 transition-colors shadow-sm"
    >
      {card.cover_colour && (
        <div className="h-1 w-full rounded-full mb-1.5" style={{ backgroundColor: card.cover_colour }} />
      )}
      {card.labels && card.labels.length > 0 && (
        <div className="flex gap-0.5 mb-1">
          {card.labels.map((l) => (
            <span key={l.id} className="h-1 w-5 rounded-full" style={{ backgroundColor: l.colour }} />
          ))}
        </div>
      )}
      <p className="font-medium text-[var(--color-text)] line-clamp-2 leading-snug mb-1.5">{card.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge priority={card.priority} />
        {card.end_date && (
          <span className={cn('text-[10px]', isOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
            {new Date(card.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {card.owners && card.owners.length > 0 && (
          <div className="flex -space-x-1 ml-auto">
            {card.owners.slice(0, 2).map((o) => (
              <div key={o.id} title={o.name} className="w-4 h-4 rounded-full bg-[var(--color-accent)] border border-[var(--color-surface)] flex items-center justify-center overflow-hidden">
                {o.avatar?.thumb_url
                  ? <img src={o.avatar.thumb_url} alt={o.name} className="w-full h-full object-cover" />
                  : <span className="text-[8px] text-white font-bold">{o.name.charAt(0)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SwimlaneCanvas({ onCardClick, filters, groupBy }: SwimlaneCanvasProps) {
  const { columns, cards } = useBoardStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allCards = useMemo(() => {
    const flat: Card[] = [];
    for (const colId of Object.keys(cards)) {
      flat.push(...(cards[colId] ?? []));
    }
    return flat
      .filter((c) => !c.archived_at)
      .filter((c) => {
        if (filters.userId && !c.owners?.some((o) => o.id === filters.userId)) return false;
        if (filters.priority && c.priority !== filters.priority) return false;
        if (filters.labelId && !c.labels?.some((l) => l.id === filters.labelId)) return false;
        return true;
      });
  }, [cards, filters]);

  const groups = useMemo((): SwimGroup[] => {
    if (groupBy === 'priority') {
      return PRIORITIES.map((p) => ({
        key: p.value,
        label: p.label,
        color: p.color,
        cards: allCards.filter((c) => c.priority === p.value),
      }));
    }

    // Assignee grouping
    const assigneeMap = new Map<string, { name: string; cards: Card[] }>();
    const unassigned: Card[] = [];

    for (const card of allCards) {
      if (!card.owners || card.owners.length === 0) {
        unassigned.push(card);
      } else {
        const owner = card.owners[0];
        if (!assigneeMap.has(owner.id)) {
          assigneeMap.set(owner.id, { name: owner.name, cards: [] });
        }
        assigneeMap.get(owner.id)!.cards.push(card);
      }
    }

    const result: SwimGroup[] = [];
    for (const [id, data] of assigneeMap.entries()) {
      result.push({ key: id, label: data.name, cards: data.cards });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    if (unassigned.length > 0) {
      result.push({ key: '__unassigned', label: 'Unassigned', cards: unassigned });
    }
    return result;
  }, [allCards, groupBy]);

  return (
    <div className="h-full overflow-auto">
      {/* Column header row */}
      <div className="flex sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        {/* swimlane label column */}
        <div className="flex-shrink-0 w-36 px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide border-r border-[var(--color-border)]">
          {groupBy === 'priority' ? 'Priority' : 'Assignee'}
        </div>
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-52 px-3 py-2 border-r border-[var(--color-border)]"
            style={{ borderTopColor: col.colour, borderTopWidth: 3 }}
          >
            <span className="text-xs font-semibold text-[var(--color-text)]">{col.name}</span>
          </div>
        ))}
      </div>

      {/* Swimlane rows */}
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key);
        const total = group.cards.length;

        return (
          <div key={group.key} className="border-b border-[var(--color-border)]">
            {/* Row header */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
              onClick={() => toggleRow(group.key)}
            >
              {isCollapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                : <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
              {group.color && (
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
              )}
              <span className="text-xs font-semibold text-[var(--color-text)]">{group.label}</span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] rounded-full px-1.5 py-0.5">
                {total}
              </span>
            </div>

            {!isCollapsed && (
              <div className="flex">
                {/* Label column spacer */}
                <div className="flex-shrink-0 w-36 border-r border-[var(--color-border)]" />

                {/* Column cells */}
                {columns.map((col) => {
                  const colCards = group.cards
                    .filter((c) => c.column_id === col.id)
                    .sort((a, b) => a.order_index - b.order_index);
                  return (
                    <div
                      key={col.id}
                      className="flex-shrink-0 w-52 p-2 space-y-1.5 border-r border-[var(--color-border)] bg-[var(--color-bg)] min-h-[80px]"
                    >
                      {colCards.map((card) => (
                        <CardMini key={card.id} card={card} onClick={onCardClick} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {groups.every((g) => g.cards.length === 0) && (
        <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
          No cards match the current filters.
        </div>
      )}
    </div>
  );
}
