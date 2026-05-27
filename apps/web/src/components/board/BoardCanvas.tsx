import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, CARD_DROP_PREFIX } from './Column';
import { AddColumnButton } from './AddColumnButton';
import { CardDragOverlay } from '@/components/card/CardDragOverlay';
import { useBoardStore } from '@/stores/board.store';
import { useMoveCard, } from '@/hooks/useCard';
import { useReorderColumns } from '@/hooks/useBoard';
import type { Card, Column as ColumnType } from '@questboard/shared';

interface BoardCanvasProps {
  boardId: string;
  onCardClick: (card: Card) => void;
  /** null = show all cards; a userId = show only cards owned by that user */
  filterUserId: string | null;
}

export function BoardCanvas({ boardId, onCardClick, filterUserId }: BoardCanvasProps) {
  const { columns, cards, moveCardOptimistic, moveColumnOptimistic } = useBoardStore();
  const moveCard = useMoveCard(boardId);
  const reorderColumns = useReorderColumns(boardId);

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [preDragSnapshot, setPreDragSnapshot] = useState<Record<string, Card[]> | null>(null);
  const [preDragColumns, setPreDragColumns] = useState<ColumnType[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const findCardColumn = useCallback(
    (cardId: string): string | null => {
      for (const colId of Object.keys(cards)) {
        if (cards[colId].some((c) => c.id === cardId)) return colId;
      }
      return null;
    },
    [cards],
  );

  /** Resolve the column ID from any drag over-target. */
  const resolveColumnId = useCallback(
    (overId: string): string | null => {
      // Card dropped on the explicit card-droppable zone
      if (overId.startsWith(CARD_DROP_PREFIX)) return overId.slice(CARD_DROP_PREFIX.length);
      // Card dropped on another column's sortable area (e.g. column header)
      if (columns.some((c) => c.id === overId)) return overId;
      return null;
    },
    [columns],
  );

  // ── Drag start ──────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type as string | undefined;

    if (type === 'column') {
      const col = columns.find((c) => c.id === active.id) ?? null;
      setActiveColumn(col);
      setPreDragColumns([...columns]);
    } else {
      const colId = findCardColumn(active.id as string);
      const card = colId ? (cards[colId]?.find((c) => c.id === active.id) ?? null) : null;
      setActiveCard(card);
      setPreDragSnapshot({ ...cards });
    }
  };

  // ── Drag over ───────────────────────────────────────────────────────────────
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type as string | undefined;
    const activeId = active.id as string;
    const overId = over.id as string;

    // ── Column reorder (live preview) ─────────────────────────────────────────
    if (activeType === 'column') {
      const fromIdx = columns.findIndex((c) => c.id === activeId);
      const toIdx = columns.findIndex((c) => c.id === overId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        moveColumnOptimistic(fromIdx, toIdx);
      }
      return;
    }

    // ── Card cross-column move ─────────────────────────────────────────────────
    if (!activeCard) return;

    const fromColId = findCardColumn(activeId);
    const toColId = resolveColumnId(overId) ?? findCardColumn(overId);

    if (!fromColId || !toColId || fromColId === toColId) return;

    const toCards = cards[toColId] ?? [];
    const toIndex = resolveColumnId(overId)
      ? toCards.length                                       // dropped on column body → end
      : toCards.findIndex((c) => c.id === overId);          // dropped on a card

    moveCardOptimistic(activeId, fromColId, toColId, toIndex === -1 ? toCards.length : toIndex);
  };

  // ── Drag end ────────────────────────────────────────────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeType = active.data.current?.type as string | undefined;

    // ── Column reorder ─────────────────────────────────────────────────────────
    if (activeType === 'column') {
      setActiveColumn(null);
      if (!over || active.id === over.id) {
        // Cancelled or same position — no-op (optimistic already applied)
      } else {
        // Persist to DB
        const order = columns.map((c) => c.id);
        reorderColumns.mutate(order, {
          onError: () => {
            if (preDragColumns) useBoardStore.getState().setColumns(preDragColumns);
          },
        });
      }
      setPreDragColumns(null);
      return;
    }

    // ── Card move ─────────────────────────────────────────────────────────────
    setActiveCard(null);
    setPreDragSnapshot(null);

    if (!over) return;

    const activeId = active.id as string;
    const columnId = findCardColumn(activeId);
    if (!columnId) return;

    const cardsInColumn = cards[columnId] ?? [];
    const position = cardsInColumn.findIndex((c) => c.id === activeId);

    moveCard.mutate(
      { cardId: activeId, data: { columnId, position: position === -1 ? 0 : position } },
      {
        onError: () => {
          if (preDragSnapshot) useBoardStore.getState().setAllCards(preDragSnapshot);
        },
      },
    );
  };

  // ── Drag cancel ─────────────────────────────────────────────────────────────
  const handleDragCancel = () => {
    if (activeColumn && preDragColumns) {
      useBoardStore.getState().setColumns(preDragColumns);
    }
    if (activeCard && preDragSnapshot) {
      useBoardStore.getState().setAllCards(preDragSnapshot);
    }
    setActiveCard(null);
    setActiveColumn(null);
    setPreDragSnapshot(null);
    setPreDragColumns(null);
  };

  const columnIds = columns.map((c) => c.id);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Outer SortableContext drives column reordering */}
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div
          className="flex gap-4 px-4 pb-4 overflow-x-auto h-full items-start"
          role="region"
          aria-label="Board columns"
        >
          {columns.map((column) => {
            const colCards = cards[column.id] ?? [];
            const visibleCards = filterUserId === null
              ? colCards
              : colCards.filter((c) => c.owners?.some((o) => o.id === filterUserId));
            return (
              <Column
                key={column.id}
                column={column}
                cards={visibleCards}
                boardId={boardId}
                onCardClick={onCardClick}
              />
            );
          })}
          <AddColumnButton boardId={boardId} />
        </div>
      </SortableContext>

      {/* Drag overlays */}
      <DragOverlay>
        {activeCard ? (
          <CardDragOverlay card={activeCard} />
        ) : activeColumn ? (
          <div
            className="w-64 rounded-lg shadow-2xl rotate-2 opacity-90 border-2 border-[var(--color-accent)]/40"
            style={{ backgroundColor: activeColumn.colour }}
          >
            <div className="px-3 py-2 flex items-center gap-2">
              <span className="text-white font-semibold text-sm">{activeColumn.name}</span>
              <span className="text-white/70 text-xs bg-black/20 rounded-full px-1.5 py-0.5">
                {(cards[activeColumn.id] ?? []).length}
              </span>
            </div>
            <div className="bg-[var(--color-bg)] rounded-b-lg min-h-[60px] mx-0" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
