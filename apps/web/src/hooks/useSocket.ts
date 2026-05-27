import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useBoardStore } from '@/stores/board.store';
import { useCollabStore } from '@/stores/collaboration.store';
import { useOfflineQueue } from '@/stores/offline.store';
import { toast } from 'sonner';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export interface BoardSocketHandle {
  emitCursor: (x: number, y: number) => void;
  emitTypingStart: (cardId: string) => void;
  emitTypingStop: (cardId: string) => void;
}

export function useBoardSocket(boardId: string | undefined): BoardSocketHandle {
  const socketRef = useRef<Socket | null>(null);
  const cursorThrottle = useRef(0);

  const emitCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorThrottle.current < 60) return;
    cursorThrottle.current = now;
    socketRef.current?.emit('cursor:move', { x, y });
  }, []);

  const emitTypingStart = useCallback((cardId: string) => {
    socketRef.current?.emit('typing:start', { cardId });
  }, []);

  const emitTypingStop = useCallback((cardId: string) => {
    socketRef.current?.emit('typing:stop', { cardId });
  }, []);

  useEffect(() => {
    // Skip if no backend URL or no boardId
    if (!API_URL || !boardId) return;

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    const socket = io(API_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:board', { boardId });
      // Replay any queued mutations
      useOfflineQueue.getState().flush(() => useAuthStore.getState().accessToken);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        toast.error('Disconnected from server. Reconnecting…');
      }
    });

    // Board state events
    const { addCard, updateCard, archiveCard, addColumn, updateColumn, removeColumn } =
      useBoardStore.getState();

    socket.on('card:created', ({ card }) => addCard(card));
    socket.on('card:updated', ({ cardId, patch }) => updateCard(cardId, patch));
    socket.on('card:archived', ({ cardId }) => archiveCard(cardId));
    socket.on('column:created', ({ column }) => addColumn(column));
    socket.on('column:updated', ({ columnId, patch }) => updateColumn(columnId, patch));
    socket.on('column:deleted', ({ columnId }) => removeColumn(columnId));

    // card:moved — apply only if from a different user (our own moves are optimistic)
    socket.on('card:moved', ({ cardId, columnId, position, movedBy }) => {
      const myId = useAuthStore.getState().user?.id;
      if (movedBy !== myId) {
        // Find the card's current column so we can pass fromColumnId
        const cards = useBoardStore.getState().cards;
        const fromColumnId = Object.keys(cards).find((cid) =>
          cards[cid].some((c) => c.id === cardId),
        );
        if (fromColumnId) {
          useBoardStore.getState().moveCardOptimistic(cardId, fromColumnId, columnId, position);
        }
      }
    });

    // Presence
    const { userJoined, userLeft, updateCursor, setTyping, clearTyping, reset } =
      useCollabStore.getState();

    socket.on('user:joined', ({ userId, name }) => userJoined({ userId, name }));
    socket.on('user:left', ({ userId }) => userLeft(userId));

    // Cursors
    socket.on('cursor:move', ({ userId, x, y }) => updateCursor(userId, x, y));

    // Typing
    socket.on('typing:start', ({ userId, cardId }) => setTyping(userId, cardId));
    socket.on('typing:stop', ({ userId }) => clearTyping(userId));

    // In-app notifications
    socket.on('notification:new', ({ notification }) => {
      toast.info(notification.message, { duration: 5000 });
    });

    return () => {
      socket.emit('leave:board', { boardId });
      socket.disconnect();
      socketRef.current = null;
      reset();
    };
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { emitCursor, emitTypingStart, emitTypingStop };
}
