import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: unknown;
  headers?: Record<string, string>;
  enqueuedAt: number;
}

interface OfflineQueueState {
  queue: QueuedMutation[];
  enqueue: (mutation: Omit<QueuedMutation, 'id' | 'enqueuedAt'>) => void;
  dequeue: (id: string) => void;
  flush: (getToken: () => string | null) => Promise<void>;
  clear: () => void;
}

export const useOfflineQueue = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (mutation) =>
        set((s) => ({
          queue: [
            ...s.queue,
            { ...mutation, id: crypto.randomUUID(), enqueuedAt: Date.now() },
          ],
        })),

      dequeue: (id) => set((s) => ({ queue: s.queue.filter((m) => m.id !== id) })),

      flush: async (getToken) => {
        const { queue, dequeue } = get();
        if (queue.length === 0) return;

        const token = getToken();
        for (const mutation of [...queue]) {
          try {
            const res = await fetch(mutation.url, {
              method: mutation.method,
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...mutation.headers,
              },
              body: mutation.body != null ? JSON.stringify(mutation.body) : undefined,
            });
            if (res.ok) {
              dequeue(mutation.id);
            } else {
              break; // server-side error — stop replaying
            }
          } catch {
            break; // still offline — stop and wait for next reconnect
          }
        }
      },

      clear: () => set({ queue: [] }),
    }),
    { name: 'questboard-offline-queue' },
  ),
);
