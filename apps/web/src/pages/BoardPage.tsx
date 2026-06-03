import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BoardHeader } from '@/components/board/BoardHeaderV2';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import { TableView } from '@/components/board/TableView';
import { SwimlaneCanvas } from '@/components/board/SwimlaneCanvas';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { FilterBar } from '@/components/board/FilterBar';
import { InboxColumn } from '@/components/board/InboxColumn';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { BulkActionBar } from '@/components/board/BulkActionBar';
import { StandupMode } from '@/components/board/StandupMode';
import { LiveCursorLayer } from '@/components/collaboration/LiveCursorLayer';
import { AppWordCloudBanner } from '@/components/shared/AppWordCloudBanner';
import { useBoard } from '@/hooks/useBoard';
import { useBoardSocket } from '@/hooks/useSocket';
import { useBoardStore } from '@/stores/board.store';
import type { ActiveFilters, BoardView, SwimlaneGroupBy } from '@/components/board/FilterBar';
import type { Card } from '@questboard/shared';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>({ userId: null, priority: null, labelId: null });
  const [view, setView] = useState<BoardView>('kanban');
  const [swimlaneGroupBy, setSwimlaneGroupBy] = useState<SwimlaneGroupBy>('priority');
  const [standupOpen, setStandupOpen] = useState(false);

  const { boardQuery, isLoading } = useBoard(boardId ?? '');
  const { emitCursor, emitTypingStart, emitTypingStop } = useBoardSocket(boardId);

  const storeCards = useBoardStore((s) => s.cards);
  const clear = useBoardStore((s) => s.clear);
  const bulkMode = useBoardStore((s) => s.bulkMode);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    for (const colCards of Object.values(storeCards)) {
      const found = colCards.find((c) => c.id === selectedCardId);
      if (found) return found;
    }
    return null;
  }, [selectedCardId, storeCards]);

  useEffect(() => {
    return () => { clear(); };
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key clears bulk mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && bulkMode) {
        useBoardStore.getState().setBulkMode(false);
        useBoardStore.getState().setSelectedCardIds([]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [bulkMode]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      emitCursor(e.clientX, e.clientY);
    },
    [emitCursor],
  );

  const handleOpenCard = useCallback((card: Card) => {
    setSelectedCardId(card.id);
  }, []);

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
      {board && <BoardHeader board={board} onStandupClick={() => setStandupOpen(true)} />}

      <AppWordCloudBanner />

      <FilterBar
        boardId={boardId}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={(v) => {
          setView(v);
          if (v === 'calendar') navigate(`/boards/${boardId}/calendar`);
          if (v === 'roadmap') navigate(`/boards/${boardId}/roadmap`);
        }}
        swimlaneGroupBy={swimlaneGroupBy}
        onSwimlaneGroupByChange={setSwimlaneGroupBy}
      />

      <main id="main-content" className="flex-1 overflow-hidden flex">
        <InboxColumn boardId={boardId} />
        <div className="flex-1 overflow-hidden py-4">
          {view === 'kanban' && (
            <BoardCanvas boardId={boardId} onCardClick={(c) => setSelectedCardId(c.id)} filters={filters} />
          )}
          {view === 'table' && (
            <TableView onCardClick={(c) => setSelectedCardId(c.id)} filters={filters} />
          )}
          {view === 'swimlane' && (
            <SwimlaneCanvas
              boardId={boardId}
              onCardClick={(c) => setSelectedCardId(c.id)}
              filters={filters}
              groupBy={swimlaneGroupBy}
            />
          )}
          {view === 'dashboard' && board && (
            <DashboardView boardId={boardId} boardName={board.name} />
          )}
        </div>
      </main>

      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId}
        onClose={() => setSelectedCardId(null)}
        onOpenCard={handleOpenCard}
        emitTypingStart={emitTypingStart}
        emitTypingStop={emitTypingStop}
      />

      {/* Bulk action floating bar */}
      {boardId && <BulkActionBar boardId={boardId} />}

      {/* Standup mode overlay */}
      {standupOpen && <StandupMode onClose={() => setStandupOpen(false)} />}

      <LiveCursorLayer />
    </div>
  );
}
