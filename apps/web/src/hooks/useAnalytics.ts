import { useQuery } from '@tanstack/react-query';
import * as analyticsApi from '@/api/analytics.api';

export function useAnalyticsSummary(boardId: string) {
  return useQuery({
    queryKey: ['analytics', 'summary', boardId],
    queryFn: () => analyticsApi.getAnalyticsSummary(boardId),
    enabled: !!boardId,
  });
}

export function useCycleTimeData(boardId: string) {
  return useQuery({
    queryKey: ['analytics', 'cycletime', boardId],
    queryFn: () => analyticsApi.getCycleTimeData(boardId),
    enabled: !!boardId,
  });
}

export function useBurndownData(boardId: string) {
  return useQuery({
    queryKey: ['analytics', 'burndown', boardId],
    queryFn: () => analyticsApi.getBurndownData(boardId),
    enabled: !!boardId,
  });
}

export function useHeatmapData(boardId: string) {
  return useQuery({
    queryKey: ['analytics', 'heatmap', boardId],
    queryFn: () => analyticsApi.getHeatmapData(boardId),
    enabled: !!boardId,
  });
}

export function useVelocityData(boardId: string) {
  return useQuery({
    queryKey: ['analytics', 'velocity', boardId],
    queryFn: () => analyticsApi.getVelocityData(boardId),
    enabled: !!boardId,
  });
}
