import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '@/api/attachments.api';

export function useAttachments(cardId: string) {
  return useQuery({
    queryKey: ['attachments', cardId],
    queryFn: () => api.getAttachments(cardId),
    enabled: !!cardId,
  });
}

export function useCreateAttachment(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.createAttachment(cardId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', cardId] });
      toast.success('File attached');
    },
    onError: () => toast.error('Failed to attach file'),
  });
}

export function useDeleteAttachment(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => api.deleteAttachment(attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', cardId] }),
    onError: () => toast.error('Failed to remove attachment'),
  });
}
