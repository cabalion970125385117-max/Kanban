import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as dashboardApi from '@/api/dashboard.api';
import type { WidgetConfig } from '@/api/dashboard.api';

export function useDashboardLayout(boardId: string) {
  return useQuery({
    queryKey: ['dashboard-layout', boardId],
    queryFn: () => dashboardApi.getLayout(boardId),
    enabled: !!boardId,
  });
}

export function useSaveDashboardLayout(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (widgets: WidgetConfig[]) => dashboardApi.saveLayout(boardId, widgets),
    onSuccess: (_, widgets) => {
      qc.setQueryData(['dashboard-layout', boardId], widgets);
    },
    onError: () => toast.error('Failed to save layout'),
  });
}

export function useShareToken(boardId: string) {
  return useQuery({
    queryKey: ['dashboard-share', boardId],
    queryFn: () => dashboardApi.getShareToken(boardId),
    enabled: !!boardId,
  });
}

export function useCreateShareToken(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => dashboardApi.createShareToken(boardId),
    onSuccess: (token) => {
      qc.setQueryData(['dashboard-share', boardId], token);
    },
    onError: () => toast.error('Failed to generate share link'),
  });
}

export function useRevokeShareToken(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => dashboardApi.revokeShareToken(boardId),
    onSuccess: () => {
      qc.setQueryData(['dashboard-share', boardId], null);
      toast.success('Share link revoked');
    },
    onError: () => toast.error('Failed to revoke share link'),
  });
}

export function useDashboardData(boardId: string) {
  return useQuery({
    queryKey: ['dashboard-data', boardId],
    queryFn: () => dashboardApi.getDashboardData(boardId),
    enabled: !!boardId,
    staleTime: 15_000,
  });
}

export function usePublicDashboard(token: string) {
  return useQuery({
    queryKey: ['public-dashboard', token],
    queryFn: async () => {
      const [data, layout] = await Promise.all([
        dashboardApi.getDashboardDataByToken(token),
        dashboardApi.getLayoutByToken(token),
      ]);
      return { data, layout };
    },
    enabled: !!token,
    retry: false,
  });
}
