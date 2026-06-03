import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '@/api/timeLogs.api';

export function useTimeLogs(cardId: string) {
  return useQuery({
    queryKey: ['time_logs', cardId],
    queryFn: () => api.getTimeLogs(cardId),
    enabled: !!cardId,
  });
}

export function useCreateTimeLog(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { minutes: number; note?: string | null; logged_at?: string; is_billable?: boolean }) =>
      api.createTimeLog(cardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_logs', cardId] });
      toast.success('Time logged');
    },
    onError: () => toast.error('Failed to log time'),
  });
}

export function useDeleteTimeLog(cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => api.deleteTimeLog(logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_logs', cardId] }),
    onError: () => toast.error('Failed to delete log'),
  });
}
