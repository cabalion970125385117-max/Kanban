import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '@/api/comments.api';

export function useComments(cardId: string) {
  return useQuery({
    queryKey: ['comments', cardId],
    queryFn: () => api.getComments(cardId),
    enabled: !!cardId,
  });
}

export function useCreateComment(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; parent_id?: string | null }) =>
      api.createComment(cardId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', cardId] }),
    onError: () => toast.error('Failed to post comment'),
  });
}

export function useUpdateComment(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.updateComment(id, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', cardId] }),
    onError: () => toast.error('Failed to update comment'),
  });
}

export function useDeleteComment(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', cardId] }),
    onError: () => toast.error('Failed to delete comment'),
  });
}
