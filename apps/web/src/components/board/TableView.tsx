import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { useBoardStore } from '@/stores/board.store';
import type { ActiveFilters } from './FilterBar';
import type { Card } from '@questboard/shared';

interface TableViewProps {
  onCardClick: (card: Card) => void;
  filters: ActiveFilters;
}

type SortKey = 'title' | 'priority' | 'end_date' | 'column' | 'updated_at';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function TableView({ onCardClick, filters }: TableViewProps) {
  const { columns, cards } = useBoardStore();
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const colNameById = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.id, c.name])),
    [columns],
  );

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

  const sorted = useMemo(() => {
    return [...allCards].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case 'end_date':
          cmp = (a.end_date ?? '9999').localeCompare(b.end_date ?? '9999');
          break;
        case 'column':
          cmp = (colNameById[a.column_id] ?? '').localeCompare(colNameById[b.column_id] ?? '');
          break;
        case 'updated_at':
          cmp = a.updated_at.localeCompare(b.updated_at);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allCards, sortKey, sortDir, colNameById]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-[var(--color-accent)]" />
      : <ArrowDown className="h-3 w-3 text-[var(--color-accent)]" />;
  };

  const th = (label: string, key: SortKey) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide cursor-pointer select-none hover:text-[var(--color-text)] whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon k={key} />
      </span>
    </th>
  );

  return (
    <div className="h-full overflow-auto px-4 py-2">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-[var(--color-bg)] z-10 border-b border-[var(--color-border)]">
          <tr>
            {th('Title', 'title')}
            {th('Status', 'column')}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Assignee
            </th>
            {th('Priority', 'priority')}
            {th('Due Date', 'end_date')}
            <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Labels
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Tasks
            </th>
            {th('Updated', 'updated_at')}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-[var(--color-text-muted)] text-sm">
                No cards match the current filters.
              </td>
            </tr>
          )}
          {sorted.map((card) => {
            const isOverdue = card.end_date && new Date(card.end_date) < new Date();
            const substepCount = card.substep_count ?? 0;
            const colColor = columns.find((c) => c.id === card.column_id)?.colour ?? '#5B4FCF';

            return (
              <tr
                key={card.id}
                onClick={() => onCardClick(card)}
                className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/5 cursor-pointer group transition-colors"
              >
                {/* Title + cover */}
                <td className="px-3 py-2 max-w-[280px]">
                  <div className="flex items-center gap-2">
                    {card.cover_colour && (
                      <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: card.cover_colour }} />
                    )}
                    <span className="font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                      {card.title}
                    </span>
                  </div>
                </td>

                {/* Column/Status */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: colColor }}
                  >
                    {colNameById[card.column_id] ?? '—'}
                  </span>
                </td>

                {/* Assignees */}
                <td className="px-3 py-2">
                  {card.owners && card.owners.length > 0 ? (
                    <div className="flex -space-x-1">
                      {card.owners.slice(0, 3).map((owner) => (
                        <div
                          key={owner.id}
                          title={owner.name}
                          className="w-6 h-6 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-bg)] flex items-center justify-center overflow-hidden"
                        >
                          {owner.avatar?.thumb_url ? (
                            <img src={owner.avatar.thumb_url} alt={owner.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-white font-bold">
                              {owner.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-xs">—</span>
                  )}
                </td>

                {/* Priority */}
                <td className="px-3 py-2">
                  <PriorityBadge priority={card.priority} />
                </td>

                {/* Due date */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {card.end_date ? (
                    <span className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
                      <Calendar className="h-3 w-3" />
                      {new Date(card.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-xs">—</span>
                  )}
                </td>

                {/* Labels */}
                <td className="px-3 py-2">
                  {card.labels && card.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {card.labels.map((l) => (
                        <span
                          key={l.id}
                          title={l.name}
                          className="h-3 w-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: l.colour }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-xs">—</span>
                  )}
                </td>

                {/* Subtasks */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {substepCount > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round(((card.substep_done ?? 0) / substepCount) * 100)}%`,
                            backgroundColor: (card.substep_done ?? 0) === substepCount ? '#22c55e' : 'var(--color-accent)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {card.substep_done}/{substepCount}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-xs">—</span>
                  )}
                </td>

                {/* Updated at */}
                <td className="px-3 py-2 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                  {new Date(card.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
