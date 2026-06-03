import { create } from 'zustand';

export interface RemoteUser {
  userId: string;
  name: string;
}

export interface RemoteCursor extends RemoteUser {
  x: number;
  y: number;
  lastSeen: number;
}

interface CollaborationState {
  onlineUsers: Record<string, RemoteUser>;
  cursors: Record<string, RemoteCursor>;
  typing: Record<string, string>; // userId → cardId

  userJoined: (user: RemoteUser) => void;
  userLeft: (userId: string) => void;
  updateCursor: (userId: string, x: number, y: number) => void;
  clearStaleCursors: () => void;
  setTyping: (userId: string, cardId: string) => void;
  clearTyping: (userId: string) => void;
  reset: () => void;
}

export const useCollabStore = create<CollaborationState>((set, get) => ({
  onlineUsers: {},
  cursors: {},
  typing: {},

  userJoined: (user) =>
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [user.userId]: user } })),

  userLeft: (userId) =>
    set((s) => {
      const { [userId]: _u, ...users } = s.onlineUsers;
      const { [userId]: _c, ...cursors } = s.cursors;
      const { [userId]: _t, ...typing } = s.typing;
      return { onlineUsers: users, cursors, typing };
    }),

  updateCursor: (userId, x, y) =>
    set((s) => ({
      cursors: {
        ...s.cursors,
        [userId]: {
          ...(s.onlineUsers[userId] ?? { userId, name: '?' }),
          userId,
          x,
          y,
          lastSeen: Date.now(),
        },
      },
    })),

  clearStaleCursors: () => {
    const threshold = Date.now() - 5000;
    const { cursors } = get();
    const fresh = Object.fromEntries(
      Object.entries(cursors).filter(([, c]) => c.lastSeen > threshold),
    );
    set({ cursors: fresh });
  },

  setTyping: (userId, cardId) =>
    set((s) => ({ typing: { ...s.typing, [userId]: cardId } })),

  clearTyping: (userId) =>
    set((s) => {
      const { [userId]: _, ...typing } = s.typing;
      return { typing };
    }),

  reset: () => set({ onlineUsers: {}, cursors: {}, typing: {} }),
}));
