/**
 * useSocket.ts — no-op stub for the local-first build.
 * With no backend server there are no WebSocket events; state is managed
 * entirely through the Zustand board store and TanStack Query cache.
 */
export function useBoardSocket(_boardId: string | undefined) {
  // No-op: real-time is not available in local-only mode.
  return { current: null };
}
