import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as cardsApi from '@/api/cards.api';
import { useBoardStore } from '@/stores/board.store';
import { triggerAutomation } from '@/lib/automation/engine';
import type { UpdateCardInput, MoveCardInput } from '@questboard/shared';

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: UpdateCardInput }) =>
      cardsApi.updateCard(cardId, data),
    onMutate: ({ cardId, data }) => {
      useBoardStore.getState().updateCard(cardId, data);
    },
    onSuccess: (card, { data }) => {
      useBoardStore.getState().updateCard(card.id, card);
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      if (data.priority) void triggerAutomation(boardId, { type: 'card.priority_changed', card, newPriority: data.priority });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      toast.error('Failed to update card');
    },
  });
}

export function useArchiveCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => cardsApi.deleteCard(cardId),
    onMutate: (cardId) => {
      useBoardStore.getState().archiveCard(cardId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      toast.success('Card archived');
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      toast.error('Failed to archive card');
    },
  });
}

export function useAddCardOwner(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: string }) =>
      cardsApi.addCardOwner(cardId, userId),
    onSuccess: (card) => {
      useBoardStore.getState().updateCard(card.id, card);
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
    },
    onError: () => toast.error('Failed to assign member'),
  });
}

export function useRemoveCardOwner(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: string }) =>
      cardsApi.removeCardOwner(cardId, userId),
    onSuccess: (card) => {
      useBoardStore.getState().updateCard(card.id, card);
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
    },
    onError: () => toast.error('Failed to unassign member'),
  });
}

export function useMoveCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: MoveCardInput }) =>
      cardsApi.moveCard(cardId, data),
    onSuccess: (card, { data }) => {
      void triggerAutomation(boardId, { type: 'card.moved', card, toColumnId: data.columnId });
    },
    onError: () => {
      // Rollback optimistic update
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      toast.error('Failed to move card');
    },
  });
}
