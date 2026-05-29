import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BoardHeader } from '@/components/board/BoardHeaderV2';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import { TableView } from '@/components/board/TableView';
import { SwimlaneCanvas } from '@/components/board/SwimlaneCanvas';
import { FilterBar } from '@/components/board/FilterBar';
import { InboxColumn } from '@/components/board/InboxColumn';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { LiveCursorLayer } from '@/components/collaboration/LiveCursorLayer';
import { QuestBanner } from '@/components/shared/QuestBanner';
import { useBoard } from '@/hooks/useBoard';
import { useBoardSocket } from '@/hooks/useSocket';
import { useBoardStore } from '@/stores/board.store';
import type { ActiveFilters, BoardView, SwimlaneGroupBy } from '@/components/board/FilterBar';
import type { Card } from '@questboard/shared';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({ userId: null, priority: null, labelId: null });
  const [view, setView] = useState<BoardView>('kanban');
  const [swimlaneGroupBy, setSwimlaneGroupBy] = useState<SwimlaneGroupBy>('priority');

  const { boardQuery, isLoading } = useBoard(boardId ?? '');
  const { emitCursor, emitTypingStart, emitTypingStop } = useBoardSocket(boardId);

  const clear = useBoardStore((s) => s.clear);

  useEffect(() => {
    return () => { clear(); };
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      emitCursor(e.clientX, e.clientY);
    },
    [emitCursor],
  );

  if (!boardId) {
    navigate('/boards');
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{'⚔️'}</div>
          <p className="text-[var(--color-text-muted)]">Loading board&hellip;</p>
        </div>
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="text-4xl mb-4">{'🏚️'}</div>
          <p className="text-[var(--color-danger)] font-medium mb-4">Board not found or access denied.</p>
          <button
            onClick={() => navigate('/boards')}
            className="text-[var(--color-accent)] underline text-sm"
          >
            Back to boards
          </button>
        </div>
      </div>
    );
  }

  const board = boardQuery.data;

  return (
    <div
      className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {board && <BoardHeader board={board} />}

      <QuestBanner boardId={boardId} />

      <FilterBar
        boardId={boardId}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        swimlaneGroupBy={swimlaneGroupBy}
        onSwimlaneGroupByChange={setSwimlaneGroupBy}
      />

      <main id="main-content" className="flex-1 overflow-hidden flex">
        <InboxColumn boardId={boardId} />
        <div className="flex-1 overflow-hidden py-4">
          {view === 'kanban' && (
            <BoardCanvas boardId={boardId} onCardClick={setSelectedCard} filters={filters} />
          )}
          {view === 'table' && (
            <TableView onCardClick={setSelectedCard} filters={filters} />
          )}
          {view === 'swimlane' && (
            <SwimlaneCanvas
              boardId={boardId}
              onCardClick={setSelectedCard}
              filters={filters}
              groupBy={swimlaneGroupBy}
            />
          )}
        </div>
      </main>

      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId}
        onClose={() => setSelectedCard(null)}
        emitTypingStart={emitTypingStart}
        emitTypingStop={emitTypingStop}
      />

      <LiveCursorLayer />
    </div>
  );
}
