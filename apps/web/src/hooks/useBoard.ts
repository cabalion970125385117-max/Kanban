import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as boardsApi from '@/api/boards.api';
import * as cardsApi from '@/api/cards.api';
import { useBoardStore } from '@/stores/board.store';
import { triggerAutomation } from '@/lib/automation/engine';
import type { CreateBoardInput, CreateColumnInput, UpdateColumnInput, CreateCardInput, Card, AddBoardMemberInput } from '@questboard/shared';

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: boardsApi.getBoards,
  });
}

export function useBoard(boardId: string) {
  const qc = useQueryClient();

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.getBoard(boardId),
    enabled: !!boardId,
  });

  const columnsQuery = useQuery({
    queryKey: ['columns', boardId],
    queryFn: () => boardsApi.getColumns(boardId),
    enabled: !!boardId,
  });

  const cardsQuery = useQuery({
    queryKey: ['cards', boardId],
    queryFn: () => cardsApi.getCards(boardId, { limit: 200 }),
    enabled: !!boardId,
  });

  const labelsQuery = useQuery({
    queryKey: ['labels', boardId],
    queryFn: () => boardsApi.getLabels(boardId),
    enabled: !!boardId,
  });

  useEffect(() => {
    if (boardQuery.data) useBoardStore.getState().setBoard(boardQuery.data);
  }, [boardQuery.data]);

  useEffect(() => {
    if (columnsQuery.data) useBoardStore.getState().setColumns(columnsQuery.data);
  }, [columnsQuery.data]);

  useEffect(() => {
    if (cardsQuery.data) {
      const byColumn: Record<string, Card[]> = {};
      cardsQuery.data.cards.forEach((card) => {
        if (!byColumn[card.column_id]) byColumn[card.column_id] = [];
        byColumn[card.column_id].push(card);
      });
      useBoardStore.getState().setAllCards(byColumn);
    }
  }, [cardsQuery.data]);

  useEffect(() => {
    if (labelsQuery.data) useBoardStore.getState().setLabels(labelsQuery.data);
  }, [labelsQuery.data]);

  const isLoading = boardQuery.isLoading || columnsQuery.isLoading || cardsQuery.isLoading;

  return { boardQuery, columnsQuery, cardsQuery, labelsQuery, isLoading, qc };
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBoardInput) => boardsApi.createBoard(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Board created');
    },
    onError: () => toast.error('Failed to create board'),
  });
}

export function useCreateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateColumnInput) => boardsApi.createColumn(boardId, data),
    onSuccess: (column) => {
      useBoardStore.getState().addColumn(column);
      qc.invalidateQueries({ queryKey: ['columns', boardId] });
    },
    onError: () => toast.error('Failed to create column'),
  });
}

export function useCreateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCardInput) => cardsApi.createCard(boardId, data),
    onSuccess: (card) => {
      useBoardStore.getState().addCard(card);
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      void triggerAutomation(boardId, { type: 'card.created', card });
    },
    onError: () => toast.error('Failed to create card'),
  });
}

export function useReorderColumns(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: string[]) => boardsApi.reorderColumns(boardId, order),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['columns', boardId] });
    },
    onError: () => toast.error('Failed to reorder columns'),
  });
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: UpdateColumnInput }) =>
      boardsApi.updateColumn(boardId, columnId, data),
    onSuccess: (column) => {
      useBoardStore.getState().updateColumn(column.id, column);
      qc.invalidateQueries({ queryKey: ['columns', boardId] });
    },
    onError: () => toast.error('Failed to update column'),
  });
}

export function useBoardLabels(boardId: string) {
  return useQuery({
    queryKey: ['labels', boardId],
    queryFn: () => boardsApi.getLabels(boardId),
    enabled: !!boardId,
  });
}

export function useBoardMembers(boardId: string) {
  return useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => boardsApi.getBoardMembers(boardId),
    enabled: !!boardId,
  });
}

export function useAddBoardMember(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddBoardMemberInput) => boardsApi.addBoardMember(boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members', boardId] });
      qc.invalidateQueries({ queryKey: ['board', boardId] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });
}

export function useRemoveBoardMember(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => boardsApi.removeBoardMember(boardId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members', boardId] });
      qc.invalidateQueries({ queryKey: ['board', boardId] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });
}

export function useUpdateBoardMemberRole(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' | 'guest' }) =>
      boardsApi.updateBoardMemberRole(boardId, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members', boardId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update role');
    },
  });
}

export function useArchiveBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => boardsApi.archiveBoard(boardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Board archived');
    },
    onError: () => toast.error('Failed to archive board'),
  });
}

export function usePermanentlyDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => boardsApi.permanentlyDeleteBoard(boardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Board permanently deleted');
    },
    onError: () => toast.error('Failed to delete board'),
  });
}

export function useBoardCardCount(boardId: string) {
  return useQuery({
    queryKey: ['board-card-count', boardId],
    queryFn: () => boardsApi.getBoardCardCount(boardId),
    enabled: !!boardId,
  });
}

export function useBoardTags(boardId: string) {
  return useQuery({
    queryKey: ['board-tags', boardId],
    queryFn: () => cardsApi.getBoardTags(boardId),
    enabled: !!boardId,
  });
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnId: string) => boardsApi.deleteColumn(boardId, columnId),
    onSuccess: (_, columnId) => {
      useBoardStore.getState().removeColumn(columnId);
      qc.invalidateQueries({ queryKey: ['columns', boardId] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Failed to delete column'),
  });
}
