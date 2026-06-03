import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Inbox, Check, X, Send, ChevronDown, ChevronUp,
  Flag, RefreshCw, Bell, BellOff, History, CheckCheck, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoards, useBoardMembers } from '@/hooks/useBoard';
import {
  useMyAssignments,
  useRejectedAssignments,
  useInboxNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useIssueCard,
  useAcceptAssignment,
  useRejectAssignment,
} from '@/hooks/useAssignments';
import { useAuthStore } from '@/stores/auth.store';

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-blue-400',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface InboxColumnProps {
  boardId: string;
}

export function InboxColumn({ boardId }: InboxColumnProps) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // Assignments are cross-board — show all pending/rejected regardless of current board
  const { data: assignments = [], isLoading: loadingAssignments } = useMyAssignments();
  const { data: rejected = [] } = useRejectedAssignments();
  const { data: notifications = [] } = useInboxNotifications();
  const { data: boards = [] } = useBoards();

  // Issue-card target board (defaults to current board)
  const [issueBoard, setIssueBoard] = useState(boardId);

  // Load members of the selected board for the assignee dropdown
  const { data: issueBoardMembers = [] } = useBoardMembers(issueBoard);

  const issueCard = useIssueCard();
  const accept = useAcceptAssignment();
  const reject = useRejectAssignment();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [issueOpen, setIssueOpen] = useState(false);
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(true);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueAssignee, setIssueAssignee] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reset assignee when the target board changes
  useEffect(() => {
    setIssueAssignee('');
  }, [issueBoard]);

  const otherMembers = issueBoardMembers.filter((m) => m.user_id !== currentUser?.id);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const totalBadge = assignments.length + unreadCount;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assignments'] }),
      qc.invalidateQueries({ queryKey: ['inbox-notifications'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleIssue = () => {
    if (!issueTitle.trim() || !issueAssignee || !issueBoard) return;
    issueCard.mutate(
      { boardId: issueBoard, title: issueTitle.trim(), assigneeId: issueAssignee },
      {
        onSuccess: () => {
          setIssueTitle('');
          setIssueAssignee('');
          setIssueOpen(false);
        },
      },
    );
  };

  return (
    <div className="w-72 flex-shrink-0 flex flex-col h-full border-r border-[var(--color-border)] bg-[var(--color-surface)]">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        <Inbox className="h-4 w-4 text-[var(--color-accent)]" />
        <span className="text-sm font-semibold text-[var(--color-text)]">Inbox</span>
        {totalBadge > 0 && (
          <span className="text-xs bg-[var(--color-accent)] text-white rounded-full px-1.5 py-0.5 font-medium">
            {totalBadge}
          </span>
        )}
        <button
          onClick={handleRefresh}
          title="Refresh inbox"
          className="ml-auto p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* ── Notifications ── */}
        <div>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent)] px-1 mb-2 transition-colors"
          >
            <Bell className="h-3 w-3" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-[9px] bg-[var(--color-accent)] text-white rounded-full px-1 py-0.5 font-medium">
                {unreadCount}
              </span>
            )}
            {notifOpen
              ? <ChevronUp className="h-3 w-3 ml-auto" />
              : <ChevronDown className="h-3 w-3 ml-auto" />}
          </button>

          {notifOpen && (
            <div>
              {notifications.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-1 py-2 flex items-center gap-1.5">
                  <BellOff className="h-3 w-3" /> No notifications.
                </p>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="w-full flex items-center justify-end gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] mb-1.5 px-1 transition-colors"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                  <div className="space-y-1.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                        className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          n.is_read
                            ? 'border-[var(--color-border)] bg-transparent opacity-60'
                            : 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 hover:bg-[var(--color-accent)]/10'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {!n.is_read && (
                            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--color-text)] leading-snug truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-snug mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                              {formatRelative(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Assigned to me ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2 px-1">
            Assigned to me
          </p>
          {loadingAssignments ? (
            <div className="space-y-2">
              {[1, 2].map((n) => <div key={n} className="h-16 skeleton rounded-lg" />)}
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] px-1 py-2">No pending assignments.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map(({ assignment, assignedBy, boardName }) => (
                <div
                  key={assignment.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 space-y-1.5"
                >
                  <p className="text-sm font-medium text-[var(--color-text)] leading-snug">
                    {assignment.card_title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Flag className={`h-3 w-3 ${PRIORITY_COLOR[assignment.card_priority] ?? 'text-gray-400'}`} />
                    <span className="text-[10px] text-[var(--color-text-muted)] capitalize">
                      {assignment.card_priority}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                      from <span className="font-medium">{assignedBy.name}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-border)]/50 rounded px-1.5 py-0.5 truncate max-w-full">
                      📋 {boardName}
                    </span>
                  </div>
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      onClick={() => accept.mutate(assignment.id)}
                      disabled={accept.isPending}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-md bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Accept
                    </button>
                    <button
                      onClick={() => reject.mutate(assignment.id)}
                      disabled={reject.isPending}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Rejected log ── */}
        <div>
          <button
            onClick={() => setRejectedOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent)] px-1 mb-2 transition-colors"
          >
            <History className="h-3 w-3" />
            Rejected
            {rejected.length > 0 && (
              <span className="text-[9px] bg-[var(--color-border)] text-[var(--color-text-muted)] rounded-full px-1 py-0.5">
                {rejected.length}
              </span>
            )}
            {rejectedOpen
              ? <ChevronUp className="h-3 w-3 ml-auto" />
              : <ChevronDown className="h-3 w-3 ml-auto" />}
          </button>

          {rejectedOpen && (
            <div>
              {rejected.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-1 py-2">No rejected assignments.</p>
              ) : (
                <div className="space-y-1.5">
                  {rejected.map(({ assignment, assignedBy, boardName }) => (
                    <div
                      key={assignment.id}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 opacity-60"
                    >
                      <p className="text-xs font-medium text-[var(--color-text)] leading-snug line-through">
                        {assignment.card_title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flag className={`h-3 w-3 ${PRIORITY_COLOR[assignment.card_priority] ?? 'text-gray-400'}`} />
                        <span className="text-[10px] text-[var(--color-text-muted)] capitalize">
                          {assignment.card_priority}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                          {formatRelative(assignment.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        from <span className="font-medium">{assignedBy.name}</span> · {boardName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Issue card ── */}
        <div>
          <button
            onClick={() => setIssueOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent)] px-1 mb-2 transition-colors"
          >
            <Send className="h-3 w-3" />
            Issue card
            {issueOpen
              ? <ChevronUp className="h-3 w-3 ml-auto" />
              : <ChevronDown className="h-3 w-3 ml-auto" />}
          </button>

          {issueOpen && (
            <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">

              {/* Board picker */}
              <div>
                <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1">
                  <LayoutGrid className="h-3 w-3" /> Board
                </label>
                <select
                  value={issueBoard}
                  onChange={(e) => setIssueBoard(e.target.value)}
                  className="mt-1 w-full text-sm border border-[var(--color-border)] rounded-md px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  {boards.filter((b) => !b.archived_at).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id === boardId ? `${b.name} (current)` : b.name}
                    </option>
                  ))}
                </select>
              </div>

              {otherMembers.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  No other members on this board yet.
                  Add members via the Members button in the header.
                </p>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                      Title
                    </label>
                    <input
                      type="text"
                      value={issueTitle}
                      onChange={(e) => setIssueTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleIssue(); }}
                      placeholder="Card title…"
                      className="mt-1 w-full text-sm border border-[var(--color-border)] rounded-md px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                      Assign to
                    </label>
                    <select
                      value={issueAssignee}
                      onChange={(e) => setIssueAssignee(e.target.value)}
                      className="mt-1 w-full text-sm border border-[var(--color-border)] rounded-md px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    >
                      <option value="">Select member…</option>
                      {otherMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user?.name ?? m.user_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleIssue}
                    loading={issueCard.isPending}
                    disabled={!issueTitle.trim() || !issueAssignee}
                    className="w-full text-xs"
                  >
                    <Send className="h-3 w-3 mr-1.5" />
                    Issue card
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
