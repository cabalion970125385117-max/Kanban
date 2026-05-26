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
import { Column } from './Column';
import { AddColumnButton } from './AddColumnButton';
import { CardDragOverlay } from '@/components/card/CardDragOverlay';
import { useBoardStore } from '@/stores/board.store';
import { useMoveCard } from '@/hooks/useCard';
import type { Card } from '@questboard/shared';

interface BoardCanvasProps {
  boardId: string;
  onCardClick: (card: Card) => void;
}

export function BoardCanvas({ boardId, onCardClick }: BoardCanvasProps) {
  const { columns, cards, moveCardOptimistic } = useBoardStore();
  const moveCard = useMoveCard(boardId);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [preDragSnapshot, setPreDragSnapshot] = useState<Record<string, Card[]> | null>(null);

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

  const isColumnId = useCallback(
    (id: string) => columns.some((c) => c.id === id),
    [columns],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const colId = findCardColumn(active.id as string);
    if (!colId) return;
    const card = cards[colId]?.find((c) => c.id === active.id) ?? null;
    setActiveCard(card);
    setPreDragSnapshot({ ...cards });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeCard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const fromColId = findCardColumn(activeId);
    const toColId = isColumnId(overId) ? overId : findCardColumn(overId);

    if (!fromColId || !toColId || fromColId === toColId) return;

    // Determine target position
    const toCards = cards[toColId] ?? [];
    const toIndex = isColumnId(overId)
      ? toCards.length
      : toCards.findIndex((c) => c.id === overId);

    moveCardOptimistic(activeId, fromColId, toColId, toIndex === -1 ? toCards.length : toIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
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
          // Rollback to pre-drag state
          if (preDragSnapshot) {
            useBoardStore.getState().setAllCards(preDragSnapshot);
          }
        },
      },
    );
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    if (preDragSnapshot) {
      useBoardStore.getState().setAllCards(preDragSnapshot);
    }
    setPreDragSnapshot(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 px-4 pb-4 overflow-x-auto h-full items-start">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={cards[column.id] ?? []}
            boardId={boardId}
            onCardClick={onCardClick}
          />
        ))}
        <AddColumnButton boardId={boardId} />
      </div>

      <DragOverlay>
        {activeCard ? <CardDragOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
