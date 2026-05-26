import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { useBoard } from '@/hooks/useBoard';
import { useBoardSocket } from '@/hooks/useSocket';
import { useBoardStore } from '@/stores/board.store';
import type { Card } from '@questboard/shared';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { boardQuery, isLoading } = useBoard(boardId ?? '');
  useBoardSocket(boardId);

  const clear = useBoardStore((s) => s.clear);

  useEffect(() => {
    return () => { clear(); };
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!boardId) {
    navigate('/boards');
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <p className="text-[var(--color-text-muted)]">Loading board…</p>
        </div>
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="text-4xl mb-4">🏚️</div>
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
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      {board && <BoardHeader board={board} />}

      <main className="flex-1 overflow-hidden py-4">
        <BoardCanvas boardId={boardId} onCardClick={setSelectedCard} />
      </main>

      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}
