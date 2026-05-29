import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { useAuthStore } from '@/stores/auth.store';

// ── helpers ────────────────────────────────────────────────────────────────────
//
// Every user-scoped query key includes the current userId so that switching
// accounts in the same SPA session never serves a previous user's cached data.
//
// React Query's prefix-matching means invalidateQueries({ queryKey: ['assignments', boardId] })
// still correctly invalidates ['assignments', boardId, userId] entries.

// Pending and rejected assignments are now cross-board — the user sees all of
// them in the inbox regardless of which board they are currently viewing.
export function useMyAssignments() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['assignments', userId],
    queryFn: () => getMyPendingAssignments(),
    enabled: !!userId,
  });
}

export function useRejectedAssignments() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['assignments-rejected', userId],
    queryFn: () => getMyRejectedAssignments(),
    enabled: !!userId,
  });
}

export function useInboxNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['inbox-notifications', userId],
    queryFn: () => getInboxNotifications(),
    enabled: !!userId,
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

export function useIssueCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      title,
      assigneeId,
    }: {
      boardId: string;
      title: string;
      assigneeId: string;
    }) => issueCard(boardId, title, assigneeId),
    onSuccess: (_result, { boardId }) => {
      // Invalidate the target board's card cache (may differ from current board)
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
    },
  });
}

export function useAcceptAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => acceptAssignment(assignmentId),
    onSuccess: ({ boardId }) => {
      // Invalidate the card list on the assignment's own board (not the viewer's board)
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
      toast.success('Card accepted — added to the board');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to accept assignment');
    },
  });
}

export function useRejectAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => rejectAssignment(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] });
      toast.success('Assignment rejected');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to reject assignment');
    },
  });
}
