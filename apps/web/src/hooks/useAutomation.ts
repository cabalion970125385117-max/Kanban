import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as automationApi from '@/api/automation.api';
import type { AutomationRule } from '@questboard/shared';

export function useAutomationRules(boardId: string) {
  return useQuery({
    queryKey: ['automation', boardId],
    queryFn: () => automationApi.getRules(boardId),
    enabled: !!boardId,
  });
}

export function useCreateRule(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: automationApi.CreateRuleInput) => automationApi.createRule(boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation', boardId] });
      toast.success('Automation rule created');
    },
    onError: () => toast.error('Failed to create rule'),
  });
}

export function useUpdateRule(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, patch }: { ruleId: string; patch: Partial<Omit<AutomationRule, 'id' | 'board_id' | 'created_at'>> }) =>
      automationApi.updateRule(ruleId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation', boardId] });
    },
    onError: () => toast.error('Failed to update rule'),
  });
}

export function useDeleteRule(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => automationApi.deleteRule(ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation', boardId] });
      toast.success('Rule deleted');
    },
    onError: () => toast.error('Failed to delete rule'),
  });
}
