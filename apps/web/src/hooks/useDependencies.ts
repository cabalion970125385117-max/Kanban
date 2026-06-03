import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as depsApi from '@/api/dependencies.api';
import type { DependencyRelType } from '@/lib/db';

export function useCardDependencies(cardId: string) {
  return useQuery({
    queryKey: ['dependencies', cardId],
    queryFn: () => depsApi.getDependencies(cardId),
    enabled: !!cardId,
  });
}

export function useAddDependency(cardId: string, _boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ relatedCardId, relType }: { relatedCardId: string; relType: DependencyRelType }) =>
      depsApi.addDependency(cardId, relatedCardId, relType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dependencies', cardId] });
    },
    onError: () => toast.error('Failed to add dependency'),
  });
}

export function useRemoveDependency(cardId: string, _boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (depId: string) => depsApi.removeDependency(depId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dependencies', cardId] });
    },
    onError: () => toast.error('Failed to remove dependency'),
  });
}
