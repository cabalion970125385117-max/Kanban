import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as boardsApi from '@/api/boards.api';
import * as cardsApi from '@/api/cards.api';
import { useBoardStore } from '@/stores/board.store';
import type { CreateBoardInput, CreateColumnInput, CreateCardInput, Card } from '@questboard/shared';

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
    },
    onError: () => toast.error('Failed to create card'),
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
