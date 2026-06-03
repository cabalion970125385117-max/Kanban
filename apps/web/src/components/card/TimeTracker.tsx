import { useState } from 'react';
import { Clock, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTimeLogs, useCreateTimeLog, useDeleteTimeLog } from '@/hooks/useTimeLogs';
import { useAuthStore } from '@/stores/auth.store';

interface TimeTrackerProps {
  cardId: string;
  estimateHours?: number | null;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TimeTracker({ cardId, estimateHours }: TimeTrackerProps) {
  const { data: logs = [] } = useTimeLogs(cardId);
  const create = useCreateTimeLog(cardId);
  const remove = useDeleteTimeLog(cardId);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');

  const totalMinutes = logs.reduce((sum, l) => sum + l.minutes, 0);
  const estimateMinutes = estimateHours ? estimateHours * 60 : null;
  const overEstimate = estimateMinutes != null && totalMinutes > estimateMinutes;

  const submitLog = () => {
    const h = parseFloat(hours || '0');
    const m = parseFloat(minutes || '0');
    const total = Math.round(h * 60 + m);
    if (total <= 0) return;
    create.mutate(
      { minutes: total, note: note.trim() || null },
      { onSuccess: () => { setHours(''); setMinutes(''); setNote(''); setAdding(false); } },
    );
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <button
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          onClick={() => setExpanded((v) => !v)}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Time logged</span>
          <span className={`font-semibold ml-0.5 ${overEstimate ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}>
            {formatMinutes(totalMinutes)}
          </span>
          {estimateMinutes != null && (
            <span className="text-[var(--color-text-muted)]">/ {formatMinutes(estimateMinutes)}</span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Log time form */}
      {adding && (
        <div className="bg-gray-50 rounded-lg p-3 mb-2 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)]">Hours</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)]">Minutes</label>
              <Input
                type="number"
                min="0"
                max="59"
                step="5"
                placeholder="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
          </div>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitLog(); if (e.key === 'Escape') setAdding(false); }}
            className="h-7 text-sm"
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={submitLog} loading={create.isPending}>
              Log time
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Log entries */}
      {expanded && logs.length > 0 && (
        <div className="space-y-1 mt-1">
          {logs.map((log) => (
            <div key={log.id} className="group flex items-start gap-2 text-xs py-1 px-1 rounded hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-[var(--color-text)]">{formatMinutes(log.minutes)}</span>
                <span className="text-[var(--color-text-muted)] mx-1">·</span>
                <span className="text-[var(--color-text-muted)]">{log.user_name}</span>
                <span className="text-[var(--color-text-muted)] mx-1">·</span>
                <span className="text-[var(--color-text-muted)]">{log.logged_at}</span>
                {log.note && (
                  <p className="text-[var(--color-text-muted)] mt-0.5 truncate">{log.note}</p>
                )}
              </div>
              {log.user_id === currentUserId && (
                <button
                  onClick={() => remove.mutate(log.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[var(--color-danger)] flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && logs.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] py-1">No time logged yet.</p>
      )}
    </div>
  );
}
