import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Flag, ChevronDown, ChevronRight, ExternalLink, CheckCircle2, XCircle, Trash2, Edit2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useSprints,
  useCreateSprint,
  useUpdateSprint,
  useStartSprint,
  useCompleteSprint,
  useCancelSprint,
  useDeleteSprint,
} from '@/hooks/useSprints';
import type { SprintRow } from '@/api/sprints.api';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Props {
  boardId: string;
  boardName: string;
  onClose: () => void;
}

function daysLeft(endDate: string): number {
  return differenceInDays(parseISO(endDate), new Date());
}

function formatDateRange(start: string, end: string): string {
  return `${format(parseISO(start), 'MMM d')} – ${format(parseISO(end), 'MMM d')}`;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  planning:  { label: 'Planning',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  active:    { label: 'Active',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

// ── Sprint card component ─────────────────────────────────────────────────────

function SprintCard({
  sprint,
  boardId,
  onViewBacklog,
}: {
  sprint: SprintRow;
  boardId: string;
  onViewBacklog: (sprintId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sprint.name);
  const [editGoal, setEditGoal] = useState(sprint.goal ?? '');
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const updateSprint = useUpdateSprint(boardId);
  const startSprint = useStartSprint(boardId);
  const completeSprint = useCompleteSprint(boardId);
  const cancelSprint = useCancelSprint(boardId);
  const deleteSprint = useDeleteSprint(boardId);

  const badge = STATUS_BADGE[sprint.status];
  const days = daysLeft(sprint.end_date);
  const isEditable = sprint.status === 'planning' || sprint.status === 'active';

  const saveEdit = () => {
    if (!editName.trim()) return;
    updateSprint.mutate({ id: sprint.id, patch: { name: editName, goal: editGoal || null } });
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3 transition-colors',
        sprint.status === 'active'
          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-bg)]',
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-accent)]/50 rounded px-2 py-0.5 text-sm font-semibold text-[var(--color-text)] focus:outline-none"
            />
          ) : (
            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{sprint.name}</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {formatDateRange(sprint.start_date, sprint.end_date)}
            {sprint.status === 'active' && days >= 0 && (
              <span className={cn('ml-2 font-medium', days <= 2 ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]')}>
                {days === 0 ? 'Last day!' : `${days}d left`}
              </span>
            )}
          </p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', badge.className)}>
          {badge.label}
        </span>
      </div>

      {/* Goal */}
      {editing ? (
        <input
          value={editGoal}
          onChange={(e) => setEditGoal(e.target.value)}
          placeholder="Sprint goal (optional)"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50"
        />
      ) : sprint.goal ? (
        <p className="text-xs text-[var(--color-text-muted)] italic">"{sprint.goal}"</p>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {sprint.status === 'active' && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onViewBacklog(sprint.id)}
              className="text-xs h-7 gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Backlog
            </Button>

            {confirmComplete ? (
              <>
                <Button
                  size="sm"
                  onClick={() => { completeSprint.mutate(sprint.id); setConfirmComplete(false); }}
                  loading={completeSprint.isPending}
                  className="text-xs h-7 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-3 w-3 mr-1" />Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmComplete(false)} className="text-xs h-7">
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmComplete(true)}
                className="text-xs h-7 gap-1 text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Button>
            )}
          </>
        )}

        {sprint.status === 'planning' && (
          <>
            <Button
              size="sm"
              onClick={() => startSprint.mutate(sprint.id)}
              loading={startSprint.isPending}
              className="text-xs h-7"
            >
              Start Sprint
            </Button>
            {isEditable && !editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="text-xs h-7 gap-1"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            )}
            {editing && (
              <>
                <Button size="sm" onClick={saveEdit} loading={updateSprint.isPending} className="text-xs h-7">
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs h-7">
                  Discard
                </Button>
              </>
            )}
          </>
        )}

        {/* Cancel */}
        {(sprint.status === 'planning' || sprint.status === 'active') && (
          <>
            {confirmCancel ? (
              <>
                <Button
                  size="sm"
                  onClick={() => { cancelSprint.mutate(sprint.id); setConfirmCancel(false); }}
                  loading={cancelSprint.isPending}
                  className="text-xs h-7 bg-red-600 hover:bg-red-700"
                >
                  Confirm cancel
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)} className="text-xs h-7">No</Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmCancel(true)}
                className="text-xs h-7 gap-1 text-[var(--color-text-muted)]"
              >
                <XCircle className="h-3 w-3" />
                Cancel
              </Button>
            )}
          </>
        )}

        {/* Delete (only planning/cancelled) */}
        {(sprint.status === 'planning' || sprint.status === 'cancelled') && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteSprint.mutate(sprint.id)}
            loading={deleteSprint.isPending}
            className="text-xs h-7 gap-1 text-[var(--color-danger)] hover:bg-red-50 ml-auto"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Create Sprint form ────────────────────────────────────────────────────────

function CreateSprintForm({ boardId, onDone }: { boardId: string; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeks = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);

  const [name, setName] = useState('Sprint 1');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(twoWeeks);
  const [nameError, setNameError] = useState('');

  const createSprint = useCreateSprint(boardId);

  const submit = () => {
    if (!name.trim()) { setNameError('Name is required'); return; }
    setNameError('');
    createSprint.mutate(
      { board_id: boardId, name, goal: goal || undefined, start_date: startDate, end_date: endDate },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-accent)]/30 space-y-3">
      <p className="text-sm font-semibold text-[var(--color-text)]">New Sprint</p>

      <div className="space-y-2">
        <Input
          autoFocus
          placeholder="Sprint name"
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
          className={cn('text-sm', nameError && 'border-[var(--color-danger)]')}
        />
        {nameError && <p className="text-xs text-[var(--color-danger)]">{nameError}</p>}

        <Input
          placeholder="Sprint goal (optional)"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="text-sm"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] block mb-1">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={submit} loading={createSprint.isPending} className="flex-1">
          Create Sprint
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SprintPanel({ boardId, boardName, onClose }: Props) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const { data: sprints = [] } = useSprints(boardId);

  const active    = sprints.filter((s) => s.status === 'active');
  const planning  = sprints.filter((s) => s.status === 'planning');
  const completed = sprints.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  const handleViewBacklog = (sprintId: string) => {
    onClose();
    navigate(`/boards/${boardId}/sprint?sprintId=${sprintId}`);
  };

  const panel = (
    <div className="fixed inset-0 z-[150] flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[var(--color-surface)] shadow-2xl flex flex-col border-l border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[var(--color-accent)]" />
            <h2 className="font-bold text-[var(--color-text)]">Sprints</h2>
            <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[120px]">{boardName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Create sprint button / form */}
          {creating ? (
            <CreateSprintForm boardId={boardId} onDone={() => setCreating(false)} />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreating(true)}
              className="w-full gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Sprint
            </Button>
          )}

          {/* Active sprints */}
          {active.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                Active
              </p>
              <div className="space-y-2">
                {active.map((s) => (
                  <SprintCard key={s.id} sprint={s} boardId={boardId} onViewBacklog={handleViewBacklog} />
                ))}
              </div>
            </div>
          )}

          {/* Planning sprints */}
          {planning.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                Planning
              </p>
              <div className="space-y-2">
                {planning.map((s) => (
                  <SprintCard key={s.id} sprint={s} boardId={boardId} onViewBacklog={handleViewBacklog} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {active.length === 0 && planning.length === 0 && !creating && (
            <div className="text-center py-10">
              <Flag className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[var(--color-text-muted)]">No sprints yet.</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Create your first sprint to plan an iteration.
              </p>
            </div>
          )}

          {/* Completed / Cancelled (collapsible) */}
          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setCompletedOpen((v) => !v)}
                className="w-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                {completedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Past ({completed.length})
              </button>
              {completedOpen && (
                <div className="space-y-2 mt-2">
                  {completed.map((s) => (
                    <SprintCard key={s.id} sprint={s} boardId={boardId} onViewBacklog={handleViewBacklog} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
