import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSprints,
  getActiveSprint,
  getSprintCards,
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  cancelSprint,
  deleteSprint,
  addCardToSprint,
  removeCardFromSprint,
} from '@/api/sprints.api';
import type { CreateSprintInput } from '@/api/sprints.api';

// ── Query keys ────────────────────────────────────────────────────────────────

export const sprintKeys = {
  all: (boardId: string) => ['sprints', boardId] as const,
  active: (boardId: string) => ['active-sprint', boardId] as const,
  cards: (sprintId: string) => ['sprint-cards', sprintId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useSprints(boardId: string) {
  return useQuery({
    queryKey: sprintKeys.all(boardId),
    queryFn: () => getSprints(boardId),
    enabled: !!boardId,
  });
}

export function useActiveSprint(boardId: string) {
  return useQuery({
    queryKey: sprintKeys.active(boardId),
    queryFn: () => getActiveSprint(boardId),
    enabled: !!boardId,
  });
}

export function useSprintCards(sprintId: string | null | undefined) {
  return useQuery({
    queryKey: sprintKeys.cards(sprintId ?? ''),
    queryFn: () => getSprintCards(sprintId!),
    enabled: !!sprintId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSprintInput) => createSprint(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all(boardId) });
      toast.success('Sprint created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateSprint>[1] }) =>
      updateSprint(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all(boardId) });
      toast.success('Sprint updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useStartSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startSprint(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all(boardId) });
      qc.invalidateQueries({ queryKey: sprintKeys.active(boardId) });
      toast.success('Sprint started!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCompleteSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeSprint(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all(boardId) });
      qc.invalidateQueries({ queryKey: sprintKeys.active(boardId) });
      toast.success('Sprint completed!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSprint(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all(boardId) });
      qc.invalidateQueries({ queryKey: sprintKeys.active(boardId) });
      toast.success('Sprint cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSprint(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSprint(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all(boardId) });
      qc.invalidateQueries({ queryKey: sprintKeys.active(boardId) });
      toast.success('Sprint deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddCardToSprint(boardId: string, sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => addCardToSprint(sprintId, cardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.cards(sprintId) });
      qc.invalidateQueries({ queryKey: sprintKeys.active(boardId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveCardFromSprint(boardId: string, sprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => removeCardFromSprint(sprintId, cardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.cards(sprintId) });
      qc.invalidateQueries({ queryKey: sprintKeys.active(boardId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
