/**
 * BulkActionBar — fixed bottom bar that appears when ≥1 card is selected.
 * Provides: Move to column, Set priority, Archive, Clear selection.
 */
import { useState } from 'react';
import { X, MoveHorizontal, Flag, Archive, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBulkMoveCards, useBulkArchiveCards, useBulkSetPriority } from '@/hooks/useCard';
import { useBoardStore } from '@/stores/board.store';
import type { Priority } from '@questboard/shared';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f97316' },
  { value: 'medium',   label: 'Medium',   color: '#eab308' },
  { value: 'low',      label: 'Low',      color: '#22c55e' },
];

interface BulkActionBarProps {
  boardId: string;
}

export function BulkActionBar({ boardId }: BulkActionBarProps) {
  const { selectedCardIds, setSelectedCardIds, setBulkMode } = useBoardStore();
  const columns = useBoardStore((s) => s.columns);
  const count = selectedCardIds.length;

  const bulkMove = useBulkMoveCards(boardId);
  const bulkArchive = useBulkArchiveCards(boardId);
  const bulkPriority = useBulkSetPriority(boardId);

  const [moveOpen, setMoveOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const clear = () => {
    setSelectedCardIds([]);
    setBulkMode(false);
    setMoveOpen(false);
    setPriorityOpen(false);
    setConfirmArchive(false);
  };

  if (count === 0) return null;

  const bar = (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--color-primary)] text-white shadow-2xl pointer-events-auto"
        role="toolbar"
        aria-label="Bulk actions"
      >
        {/* Selection count */}
        <span className="text-sm font-semibold tabular-nums min-w-[60px]">
          {count} selected
        </span>

        <div className="w-px h-5 bg-white/20" />

        {/* Move to column */}
        <div className="relative">
          <button
            onClick={() => { setMoveOpen((o) => !o); setPriorityOpen(false); setConfirmArchive(false); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <MoveHorizontal className="h-3.5 w-3.5" />
            <span>Move to</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
          {moveOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMoveOpen(false)} />
              <div className="absolute bottom-full mb-2 left-0 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl min-w-[180px] py-1 overflow-hidden">
                {columns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      bulkMove.mutate(
                        { cardIds: selectedCardIds, columnId: col.id },
                        { onSuccess: clear },
                      );
                      setMoveOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.colour }} />
                    <span className="truncate">{col.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Set priority */}
        <div className="relative">
          <button
            onClick={() => { setPriorityOpen((o) => !o); setMoveOpen(false); setConfirmArchive(false); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>Priority</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
          {priorityOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPriorityOpen(false)} />
              <div className="absolute bottom-full mb-2 left-0 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl min-w-[140px] py-1 overflow-hidden">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      bulkPriority.mutate(
                        { cardIds: selectedCardIds, priority: p.value },
                        { onSuccess: clear },
                      );
                      setPriorityOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Archive */}
        {confirmArchive ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/80">Archive {count} cards?</span>
            <button
              onClick={() => {
                bulkArchive.mutate(
                  { cardIds: selectedCardIds },
                  { onSuccess: clear },
                );
              }}
              className="text-xs px-2 py-1 rounded-lg bg-[var(--color-danger)] text-white hover:opacity-80 transition-opacity"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmArchive(false)}
              className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setConfirmArchive(true); setMoveOpen(false); setPriorityOpen(false); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/30 transition-colors"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Archive</span>
          </button>
        )}

        <div className="w-px h-5 bg-white/20" />

        {/* Clear */}
        <button
          onClick={clear}
          title="Clear selection (Esc)"
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
