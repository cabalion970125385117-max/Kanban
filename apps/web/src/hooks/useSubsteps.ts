import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '@/api/substeps.api';
import { getCard } from '@/api/cards.api';
import { useBoardStore } from '@/stores/board.store';

export function useSubsteps(cardId: string) {
  return useQuery({
    queryKey: ['substeps', cardId],
    queryFn: () => api.getSubsteps(cardId),
    enabled: !!cardId,
  });
}

/** After any substep change, refresh the card's substep_count/substep_done in the board store
 *  so the card face progress bar updates immediately without a full board re-fetch. */
async function syncCardSubstepCounts(cardId: string) {
  try {
    const fresh = await getCard(cardId);
    useBoardStore.getState().updateCard(cardId, fresh);
  } catch {
    // card may not be in board store (e.g. opened from My Work) — ignore
  }
}

export function useCreateSubstep(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; target_date?: string | null }) =>
      api.createSubstep(cardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['substeps', cardId] });
      syncCardSubstepCounts(cardId);
    },
    onError: () => toast.error('Failed to add subtask'),
  });
}

export function useUpdateSubstep(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; is_complete?: boolean; target_date?: string | null }) =>
      api.updateSubstep(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['substeps', cardId] });
      syncCardSubstepCounts(cardId);
    },
    onError: () => toast.error('Failed to update subtask'),
  });
}

export function useDeleteSubstep(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (substepId: string) => api.deleteSubstep(substepId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['substeps', cardId] });
      syncCardSubstepCounts(cardId);
    },
    onError: () => toast.error('Failed to delete subtask'),
  });
}
