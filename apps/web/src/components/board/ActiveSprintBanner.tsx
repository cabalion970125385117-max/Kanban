import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, ExternalLink, CheckCircle2, X } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useActiveSprint, useCompleteSprint, useSprintCards } from '@/hooks/useSprints';
import { useColumns } from '@/hooks/useBoard';
import { cn } from '@/lib/utils';

interface Props {
  boardId: string;
}

// Heuristic: any column whose name matches these patterns is considered a "done" column
const DONE_COLUMN_NAMES = /^(done|complete|completed|closed|resolved|shipped|live|released|finished|merged)$/i;

export function ActiveSprintBanner({ boardId }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const { data: sprint } = useActiveSprint(boardId);
  const { data: sprintCards = [] } = useSprintCards(sprint?.id);
  const { data: columns = [] } = useColumns(boardId);
  const completeSprint = useCompleteSprint(boardId);

  if (!sprint || dismissed) return null;

  const doneColIds = new Set(columns.filter((c) => DONE_COLUMN_NAMES.test(c.name)).map((c) => c.id));
  const doneCount = sprintCards.filter((c) => doneColIds.has(c.column_id)).length;
  const totalCount = sprintCards.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const daysLeft = differenceInDays(parseISO(sprint.end_date), new Date());
  const dateRange = `${format(parseISO(sprint.start_date), 'MMM d')} – ${format(parseISO(sprint.end_date), 'MMM d')}`;

  const handleComplete = () => {
    completeSprint.mutate(sprint.id, {
      onSuccess: () => setConfirmComplete(false),
    });
  };

  return (
    <div className="flex-shrink-0 bg-[var(--color-accent)]/10 border-b border-[var(--color-accent)]/20 px-4 py-1.5 flex items-center gap-3 text-sm">
      {/* Sprint icon + name */}
      <Flag className="h-3.5 w-3.5 text-[var(--color-accent)] flex-shrink-0" />
      <span className="font-semibold text-[var(--color-accent)] truncate max-w-[140px]" title={sprint.name}>
        {sprint.name}
      </span>

      {/* Date range */}
      <span className="text-[var(--color-text-muted)] hidden sm:inline text-xs">{dateRange}</span>

      {/* Days left */}
      <span
        className={cn(
          'text-xs font-medium flex-shrink-0',
          daysLeft <= 0
            ? 'text-[var(--color-danger)]'
            : daysLeft <= 2
            ? 'text-orange-500'
            : 'text-[var(--color-text-muted)]',
        )}
      >
        {daysLeft < 0
          ? 'Overdue!'
          : daysLeft === 0
          ? 'Last day'
          : `${daysLeft}d left`}
      </span>

      {/* Progress bar */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <div className="w-24 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {doneCount}/{totalCount}
        </span>
      </div>

      {/* Sprint goal snippet */}
      {sprint.goal && (
        <span className="hidden lg:inline text-xs text-[var(--color-text-muted)] italic truncate max-w-[200px]">
          "{sprint.goal}"
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={() => navigate(`/boards/${boardId}/sprint?sprintId=${sprint.id}`)}
        className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline flex-shrink-0"
      >
        <ExternalLink className="h-3 w-3" />
        Backlog
      </button>

      {confirmComplete ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleComplete}
            disabled={completeSprint.isPending}
            className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full hover:bg-green-700 transition-colors"
          >
            {completeSprint.isPending ? '…' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirmComplete(false)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmComplete(true)}
          className="flex items-center gap-1 text-xs text-green-600 hover:underline flex-shrink-0"
        >
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-[var(--color-accent)]/20 text-[var(--color-text-muted)] flex-shrink-0"
        title="Dismiss sprint banner"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
