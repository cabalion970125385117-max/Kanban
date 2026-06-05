import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AiProvider = 'none' | 'openai';
export type OpenAiModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';

interface AiState {
  provider: AiProvider;
  openaiKey: string;
  openaiModel: OpenAiModel;
  setProvider: (p: AiProvider) => void;
  setOpenaiKey: (k: string) => void;
  setOpenaiModel: (m: OpenAiModel) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      provider: 'none',
      openaiKey: '',
      openaiModel: 'gpt-4o-mini',
      setProvider: (provider) => set({ provider }),
      setOpenaiKey: (openaiKey) => set({ openaiKey }),
      setOpenaiModel: (openaiModel) => set({ openaiModel }),
    }),
    { name: 'qb-ai-settings' },
  ),
);
