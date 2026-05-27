import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyPendingAssignments,
  getMyRejectedAssignments,
  getInboxNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  issueCard,
  acceptAssignment,
  rejectAssignment,
} from '@/api/assignments.api';

export function useMyAssignments(boardId: string) {
  return useQuery({
    queryKey: ['assignments', boardId],
    queryFn: () => getMyPendingAssignments(boardId),
    enabled: !!boardId,
  });
}

export function useRejectedAssignments(boardId: string) {
  return useQuery({
    queryKey: ['assignments-rejected', boardId],
    queryFn: () => getMyRejectedAssignments(boardId),
    enabled: !!boardId,
  });
}

export function useInboxNotifications() {
  return useQuery({
    queryKey: ['inbox-notifications'],
    queryFn: () => getInboxNotifications(),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
    },
  });
}

export function useIssueCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, assigneeId }: { title: string; assigneeId: string }) =>
      issueCard(boardId, title, assigneeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      qc.invalidateQueries({ queryKey: ['assignments', boardId] });
    },
  });
}

export function useAcceptAssignment(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => acceptAssignment(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', boardId] });
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });
}

export function useRejectAssignment(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => rejectAssignment(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', boardId] });
      qc.invalidateQueries({ queryKey: ['assignments-rejected', boardId] });
    },
  });
}
