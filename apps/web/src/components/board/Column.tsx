import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Trash2, GripVertical, Pencil, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardFace } from '@/components/card/CardFace';
import { useCreateCard, useUpdateColumn, useDeleteColumn } from '@/hooks/useBoard';
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
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [settingWip, setSettingWip] = useState(false);
  const [wipValue, setWipValue] = useState('');

  const createCard = useCreateCard(boardId);
  const updateColumn = useUpdateColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== column.name) {
      updateColumn.mutate({ columnId: column.id, data: { name: trimmed } });
    }
    setRenaming(false);
  };

  const submitWip = () => {
    const val = wipValue.trim();
    const parsed = val === '' ? null : parseInt(val, 10);
    if (parsed !== column.wip_limit && (parsed === null || (!isNaN(parsed) && parsed > 0))) {
      updateColumn.mutate({ columnId: column.id, data: { wip_limit: parsed } });
    }
    setSettingWip(false);
    setMenuOpen(false);
  };

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
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              className="bg-white/20 text-white text-sm font-semibold px-1 rounded w-full outline-none min-w-0"
            />
          ) : (
            <span
              className="text-white font-semibold text-sm truncate cursor-pointer hover:underline"
              onClick={() => { setRenameValue(column.name); setRenaming(true); }}
            >
              {column.name}
            </span>
          )}
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
              aria-label={`Add card to ${column.name}`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/80 hover:bg-white/20"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={`Column options for ${column.name}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-10 min-w-[160px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-t-lg"
                  onClick={() => { setMenuOpen(false); setRenameValue(column.name); setRenaming(true); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
                {settingWip ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <input
                      autoFocus
                      type="number"
                      min="1"
                      placeholder="Limit…"
                      value={wipValue}
                      onChange={(e) => setWipValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitWip();
                        if (e.key === 'Escape') { setSettingWip(false); setMenuOpen(false); }
                      }}
                      className="w-16 text-sm border border-[var(--color-border)] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                    <button
                      onClick={submitWip}
                      className="text-xs text-[var(--color-accent)] font-medium hover:underline"
                    >
                      Set
                    </button>
                    {column.wip_limit != null && (
                      <button
                        onClick={() => { updateColumn.mutate({ columnId: column.id, data: { wip_limit: null } }); setSettingWip(false); setMenuOpen(false); }}
                        className="text-xs text-[var(--color-text-muted)] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                    onClick={() => { setWipValue(column.wip_limit != null ? String(column.wip_limit) : ''); setSettingWip(true); }}
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {column.wip_limit != null ? `WIP limit: ${column.wip_limit}` : 'Set WIP limit'}
                  </button>
                )}
                <div className="border-t border-[var(--color-border)] my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-red-50 rounded-b-lg"
                  onClick={() => {
                    setMenuOpen(false);
                    if (cards.length > 0) {
                      toast.error('Move or archive all cards before deleting this column');
                      return;
                    }
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
        role="list"
        aria-label={`${column.name} cards`}
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
