/**
 * DependencyPanel — manage card relationships.
 * Supports: blocks, relates_to, duplicates, child_of
 */
import { useState } from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardDependencies, useAddDependency, useRemoveDependency } from '@/hooks/useDependencies';
import { useBoardStore } from '@/stores/board.store';
import type { DependencyRelType } from '@/lib/db';

interface DependencyPanelProps {
  cardId: string;
  boardId: string;
}

const REL_TYPES: { value: DependencyRelType; label: string; color: string; bgColor: string }[] = [
  { value: 'blocks',      label: 'Blocks',       color: '#ef4444', bgColor: 'bg-red-50' },
  { value: 'relates_to',  label: 'Relates to',   color: '#3b82f6', bgColor: 'bg-blue-50' },
  { value: 'duplicates',  label: 'Duplicates',   color: '#8b5cf6', bgColor: 'bg-purple-50' },
  { value: 'child_of',    label: 'Child of',     color: '#14b8a6', bgColor: 'bg-teal-50' },
];

export function DependencyPanel({ cardId, boardId }: DependencyPanelProps) {
  const { data: deps = [] } = useCardDependencies(cardId);
  const addDep = useAddDependency(cardId, boardId);
  const removeDep = useRemoveDependency(cardId, boardId);

  const [adding, setAdding] = useState(false);
  const [relType, setRelType] = useState<DependencyRelType>('blocks');
  const [search, setSearch] = useState('');

  const allCards = Object.values(useBoardStore((s) => s.cards)).flat();
  const candidates = allCards.filter(
    (c) =>
      c.id !== cardId &&
      !c.archived_at &&
      c.title.toLowerCase().includes(search.toLowerCase()) &&
      !deps.some((d) => d.related_card_id === c.id && d.rel_type === relType),
  );

  const grouped = REL_TYPES.map((rt) => ({
    ...rt,
    items: deps.filter((d) => d.rel_type === rt.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
          <Link2 className="h-3.5 w-3.5" />
          <span>Dependencies</span>
          {deps.length > 0 && (
            <span className="text-[var(--color-accent)] font-semibold">{deps.length}</span>
          )}
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:opacity-70 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-3 p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] space-y-2">
          {/* Relationship type */}
          <div className="flex gap-1 flex-wrap">
            {REL_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setRelType(rt.value)}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border transition-all',
                  relType === rt.value
                    ? 'text-white border-transparent'
                    : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40',
                )}
                style={relType === rt.value ? { backgroundColor: rt.color } : {}}
              >
                {rt.label}
              </button>
            ))}
          </div>

          {/* Card search */}
          <input
            autoFocus
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] bg-[var(--color-surface)]"
          />

          {/* Results */}
          {search && (
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {candidates.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-1 py-1">No cards found</p>
              ) : (
                candidates.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      addDep.mutate({ relatedCardId: c.id, relType });
                      setAdding(false);
                      setSearch('');
                    }}
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-[var(--color-surface)] transition-colors truncate text-[var(--color-text)]"
                  >
                    {c.title}
                  </button>
                ))
              )}
            </div>
          )}

          <button
            onClick={() => { setAdding(false); setSearch(''); }}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Grouped relationship list */}
      {grouped.length === 0 && !adding && (
        <p className="text-xs text-[var(--color-text-muted)] italic">No dependencies</p>
      )}

      {grouped.map((group) => (
        <div key={group.value} className="mb-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-1 px-1"
            style={{ color: group.color }}
          >
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((dep) => {
              const relatedCard = allCards.find((c) => c.id === dep.related_card_id);
              return (
                <div
                  key={dep.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--color-bg)] group"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="flex-1 text-xs text-[var(--color-text)] truncate">
                    {relatedCard?.title ?? dep.related_card_id}
                  </span>
                  <button
                    onClick={() => removeDep.mutate(dep.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
