import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useBoardStore } from '@/stores/board.store';
import type { Card, Column } from '@questboard/shared';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? '';

export function useBoardSocket(boardId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!boardId || !accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:board', { boardId });
    });

    socket.on('card:created', ({ card }: { card: Card }) => {
      useBoardStore.getState().addCard(card);
    });

    socket.on('card:updated', ({ cardId, patch }: { cardId: string; patch: Partial<Card> }) => {
      useBoardStore.getState().updateCard(cardId, patch);
    });

    socket.on('card:moved', ({ cardId, columnId, position }: { cardId: string; columnId: string; position: number }) => {
      const { cards, moveCardOptimistic } = useBoardStore.getState();
      let fromColumnId: string | null = null;
      for (const colId of Object.keys(cards)) {
        if (cards[colId].some((c) => c.id === cardId)) { fromColumnId = colId; break; }
      }
      if (fromColumnId) moveCardOptimistic(cardId, fromColumnId, columnId, position);
    });

    socket.on('card:archived', ({ cardId }: { cardId: string }) => {
      useBoardStore.getState().archiveCard(cardId);
    });

    socket.on('column:created', ({ column }: { column: Column }) => {
      useBoardStore.getState().addColumn(column);
      qc.invalidateQueries({ queryKey: ['columns', boardId] });
    });

    socket.on('column:updated', ({ columnId, patch }: { columnId: string; patch: Partial<Column> }) => {
      useBoardStore.getState().updateColumn(columnId, patch);
    });

    socket.on('column:deleted', ({ columnId }: { columnId: string }) => {
      useBoardStore.getState().removeColumn(columnId);
    });

    return () => {
      socket.emit('leave:board', { boardId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef;
}
