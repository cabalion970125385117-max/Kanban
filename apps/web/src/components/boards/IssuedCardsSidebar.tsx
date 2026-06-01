import { useState, useEffect } from 'react';
import {
  Send, RefreshCw, ChevronDown, Pencil, X, Check, Clock,
  AlertCircle, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useBoards, useBoardMembers } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import {
  useIssuedByMe,
  useWithdrawAssignment,
  useUpdateIssuedCard,
  useIssueCard,
} from '@/hooks/useAssignments';
import type { Priority } from '@questboard/shared';
import type { IssuedCard } from '@/api/assignments.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageOf(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function ageDays(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000);
}

const PRIORITY_META: Record<Priority, { label: string; dot: string; text: string }> = {
  critical: { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-600' },
  high:     { label: 'High',     dot: 'bg-orange-500', text: 'text-orange-600' },
  medium:   { label: 'Medium',   dot: 'bg-yellow-500', text: 'text-yellow-600' },
  low:      { label: 'Low',      dot: 'bg-green-500',  text: 'text-green-600' },
};

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];

// ─── Issue form ───────────────────────────────────────────────────────────────

function IssueForm({ defaultBoardId }: { defaultBoardId?: string }) {
  const { data: boards = [] } = useBoards();
  const activeBoards = boards.filter((b) => !b.archived_at);

  const [boardId, setBoardId] = useState(defaultBoardId ?? activeBoards[0]?.id ?? '');
  const [assigneeId, setAssigneeId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [open, setOpen] = useState(true);

  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [] } = useBoardMembers(boardId);
  const otherMembers = members.filter((m) => m.user_id !== currentUser?.id);

  const issueCard = useIssueCard();

  // Reset assignee when board changes
  useEffect(() => { setAssigneeId(''); }, [boardId]);

  // Sync board default when boards load
  useEffect(() => {
    if (!boardId && activeBoards.length > 0) setBoardId(activeBoards[0].id);
  }, [activeBoards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (!title.trim() || !assigneeId || !boardId) return;
    issueCard.mutate(
      { boardId, title: title.trim(), assigneeId },
      { onSuccess: () => { setTitle(''); setAssigneeId(''); } },
    );
  };

  const canSubmit = !!title.trim() && !!assigneeId && !!boardId;

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Section header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--color-bg)] hover:bg-[var(--color-border)]/30 transition-colors"
      >
        <Send className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        <span className="text-xs font-semibold text-[var(--color-text)] flex-1 text-left">
          Issue New Card
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-[var(--color-border)]">
          {activeBoards.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-2">
              Create a board first to issue cards.
            </p>
          ) : (
            <>
              {/* Board picker */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1 mb-1">
                  <LayoutGrid className="h-3 w-3" /> Board
                </label>
                <select
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  className="w-full text-xs border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                >
                  {activeBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id === defaultBoardId ? `${b.name} (current)` : b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              {otherMembers.length === 0 ? (
                <p className="text-[11px] text-[var(--color-text-muted)] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                  No other members on this board yet. Invite via the Members button on the board.
                </p>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">
                      Assign to
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full text-xs border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    >
                      <option value="">Select member…</option>
                      {otherMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user?.name ?? m.user_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                      placeholder="Describe the task…"
                      className="w-full text-xs border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                  </div>

                  {/* Priority row */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
                      Priority
                    </label>
                    <div className="flex gap-1.5">
                      {PRIORITIES.map((p) => {
                        const m = PRIORITY_META[p];
                        return (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded-lg border transition-colors',
                              priority === p
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50',
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    loading={issueCard.isPending}
                    className="w-full text-xs"
                  >
                    <Send className="h-3 w-3 mr-1.5" />
                    Issue card
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single issued card row ───────────────────────────────────────────────────

function IssuedCardRow({ item }: { item: IssuedCard }) {
  const { assignment, assignee, boardName } = item;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(assignment.card_title);
  const [editPriority, setEditPriority] = useState<Priority>(assignment.card_priority);

  const withdraw = useWithdrawAssignment();
  const update = useUpdateIssuedCard();

  const days = ageDays(assignment.created_at);
  const age = ageOf(assignment.created_at);
  const pm = PRIORITY_META[assignment.card_priority];

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    update.mutate(
      { id: assignment.id, patch: { title: editTitle.trim(), priority: editPriority } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleCancelEdit = () => {
    setEditTitle(assignment.card_title);
    setEditPriority(assignment.card_priority);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3 space-y-2 transition-colors',
        days >= 7
          ? 'border-red-200 bg-red-50/40'
          : days >= 3
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-[var(--color-border)] bg-[var(--color-bg)]',
      )}
    >
      {editing ? (
        /* ── Edit mode ─────────────────────────────────────── */
        <div className="space-y-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
            className="w-full text-xs border border-[var(--color-accent)] rounded-lg px-2.5 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none"
          />
          {/* Priority picker in edit mode */}
          <div className="flex gap-1">
            {PRIORITIES.map((p) => {
              const m = PRIORITY_META[p];
              return (
                <button
                  key={p}
                  onClick={() => setEditPriority(p)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-0.5 text-[9px] font-medium py-0.5 rounded border transition-colors',
                    editPriority === p
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="flex-1 h-6 text-[10px]"
              onClick={handleSaveEdit}
              loading={update.isPending}
              disabled={!editTitle.trim()}
            >
              <Check className="h-2.5 w-2.5 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-6 text-[10px]"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* ── View mode ─────────────────────────────────────── */
        <>
          <div className="flex items-start gap-2">
            <span
              className={cn('mt-0.5 h-2 w-2 rounded-full flex-shrink-0', pm.dot)}
              title={pm.label}
            />
            <p className="text-xs font-medium text-[var(--color-text)] leading-snug flex-1 min-w-0 break-words">
              {assignment.card_title}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              → <span className="font-medium text-[var(--color-text)]">{assignee.name}</span>
            </span>
            <span className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0 truncate max-w-[100px]">
              📋 {boardName}
            </span>
          </div>

          {/* Footer: age + actions */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium',
                days >= 7 ? 'text-red-600' : days >= 3 ? 'text-amber-600' : 'text-[var(--color-text-muted)]',
              )}
              title={new Date(assignment.created_at).toLocaleString()}
            >
              <Clock className="h-2.5 w-2.5" />
              {age} ago
            </span>

            {days >= 3 && (
              <span
                className={cn(
                  'text-[9px] rounded-full px-1.5 py-0.5 font-semibold',
                  days >= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                )}
              >
                {days >= 7 ? 'STALE' : 'WAITING'}
              </span>
            )}

            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setEditing(true)}
                title="Edit card"
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => withdraw.mutate(assignment.id)}
                disabled={withdraw.isPending}
                title="Withdraw card"
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main sidebar component ───────────────────────────────────────────────────

interface IssuedCardsSidebarProps {
  /** Pass the current board's id when on a board page, so it pre-selects in the form. */
  defaultBoardId?: string;
}

export function IssuedCardsSidebar({ defaultBoardId }: IssuedCardsSidebarProps) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: issued = [], isLoading } = useIssuedByMe();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['issued-by-me', userId] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col h-full border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        <Send className="h-4 w-4 text-[var(--color-accent)]" />
        <span className="text-sm font-semibold text-[var(--color-text)] flex-1">Issued Cards</span>
        {issued.length > 0 && (
          <span className="text-xs bg-[var(--color-accent)] text-white rounded-full px-1.5 py-0.5 font-medium">
            {issued.length}
          </span>
        )}
        <button
          onClick={handleRefresh}
          title="Refresh"
          className="p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* Issue form */}
        <IssueForm defaultBoardId={defaultBoardId} />

        {/* Awaiting response list */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1 mb-2">
            Awaiting Response
            {issued.length > 0 && (
              <span className="ml-1.5 text-[var(--color-accent)]">({issued.length})</span>
            )}
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-20 skeleton rounded-xl" />
              ))}
            </div>
          ) : issued.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-[var(--color-text-muted)]/40" />
              <p className="text-xs text-[var(--color-text-muted)]">
                No pending issued cards.
                <br />Issue a card above to assign work.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {issued.map((item) => (
                <IssuedCardRow key={item.assignment.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
