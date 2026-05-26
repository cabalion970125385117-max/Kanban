import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@questboard/shared';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ accessToken: token, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ accessToken: null, user: null, isAuthenticated: false }),

      updateUser: (user) => set({ user }),
    }),
    {
      name: 'questboard-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
