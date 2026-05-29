import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuestState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'questboard-quest-banner' },
  ),
);
