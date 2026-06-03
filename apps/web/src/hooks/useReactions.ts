import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reactionsApi from '@/api/reactions.api';

export function useCardReactions(cardId: string) {
  return useQuery({
    queryKey: ['reactions', cardId],
    queryFn: () => reactionsApi.getReactions(cardId),
    enabled: !!cardId,
  });
}

export function useToggleReaction(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emoji }: { emoji: string }) =>
      reactionsApi.toggleReaction(cardId, emoji),
    onSuccess: (reactions) => {
      qc.setQueryData(['reactions', cardId], reactions);
    },
  });
}
