import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardFace } from '@/components/card/CardFace';
import { useCreateCard, useDeleteColumn } from '@/hooks/useBoard';
import type { Column as ColumnType, Card } from '@questboard/shared';

interface ColumnProps {
  column: ColumnType;
  cards: Card[];
  boardId: string;
  onCardClick: (card: Card) => void;
}

// Unique prefix so card droppable IDs don't collide with column sortable IDs
export const CARD_DROP_PREFIX = 'cards:';

export function Column({ column, cards, boardId, onCardClick }: ColumnProps) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const createCard = useCreateCard(boardId);
  const deleteColumn = useDeleteColumn(boardId);

  // ── Sortable (for column reordering) ──────────────────────────────────────
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  // ── Droppable (for card drops into this column) ────────────────────────────
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: CARD_DROP_PREFIX + column.id,
    data: { type: 'column-body', columnId: column.id },
  });

  const cardIds = cards.map((c) => c.id);
  const isAtWipLimit = column.wip_limit != null && cards.length >= column.wip_limit;

  const submitCard = () => {
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    createCard.mutate(
      { title: trimmed, column_id: column.id, priority: 'medium' },
      {
        onSuccess: () => {
          setNewCardTitle('');
          setAddingCard(false);
        },
      },
    );
  };

  const columnStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={columnStyle}
      className={cn(
        'flex-shrink-0 w-64 flex flex-col max-h-full',
        isDragging && 'opacity-40',
      )}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between pl-2 pr-1 py-2 rounded-t-lg"
        style={{ backgroundColor: column.colour }}
      >
        {/* Drag handle — only this triggers column drag */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-white/50 hover:text-white/90 p-0.5 rounded transition-colors touch-none"
          aria-label="Drag to reorder column"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 ml-1">
          <span className="text-white font-semibold text-sm truncate">{column.name}</span>
          <span className="text-white/70 text-xs bg-black/20 rounded-full px-1.5 py-0.5 tabular-nums flex-shrink-0">
            {cards.length}
            {column.wip_limit != null && `/${column.wip_limit}`}
          </span>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {!isAtWipLimit && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/80 hover:bg-white/20"
              onClick={() => setAddingCard(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/80 hover:bg-white/20"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-10 min-w-[140px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-red-50 rounded-lg"
                  onClick={() => {
                    setMenuOpen(false);
                    deleteColumn.mutate(column.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete column
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WIP warning */}
      {isAtWipLimit && (
        <div className="bg-orange-50 border-x border-orange-200 px-3 py-1 text-xs text-orange-700 text-center">
          WIP limit reached
        </div>
      )}

      {/* Card list — separate drop target for cards */}
      <div
        ref={setDropRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 rounded-b-lg border-x border-b border-[var(--color-border)] bg-[var(--color-bg)] min-h-[80px]',
          isOver && 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]/40',
        )}
        onClick={() => menuOpen && setMenuOpen(false)}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardFace key={card.id} card={card} onClick={onCardClick} />
          ))}
        </SortableContext>

        {/* Inline add-card form */}
        {addingCard ? (
          <div className="bg-[var(--color-surface)] rounded-lg p-2 shadow-sm border border-[var(--color-accent)]/30">
            <Input
              autoFocus
              placeholder="Card title…"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCard();
                if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); }
              }}
              className="mb-2 text-sm"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={submitCard}
                loading={createCard.isPending}
                className="flex-1 text-xs h-7"
              >
                Add card
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAddingCard(false); setNewCardTitle(''); }}
                className="text-xs h-7"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          !isAtWipLimit && (
            <button
              onClick={() => setAddingCard(true)}
              className="w-full text-left text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] py-1 px-1 rounded hover:bg-[var(--color-accent)]/5 transition-colors"
            >
              + Add a card
            </button>
          )
        )}
      </div>
    </div>
  );
}
