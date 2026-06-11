import { useState, useMemo } from 'react';
import { X, Download, TrendingUp, CheckCircle2, Clock, AlertTriangle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoardStore } from '@/stores/board.store';
import { useBoardMembers } from '@/hooks/useBoard';
import type { Card } from '@questboard/shared';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
};

const PERIOD_DAYS: Record<Period, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

interface MemberStats {
  id: string;
  name: string;
  avatar?: string;
  totalAssigned: number;
  completedInPeriod: number;
  inProgress: number;
  overdue: number;
  substepDone: number;
  substepTotal: number;
  recentCards: Card[];
}

interface ProgressReportModalProps {
  boardId: string;
  boardName: string;
  onClose: () => void;
}

export function ProgressReportModal({ boardId, boardName, onClose }: ProgressReportModalProps) {
  const [period, setPeriod] = useState<Period>('weekly');
  const { columns, cards } = useBoardStore();
  const { data: members = [] } = useBoardMembers(boardId);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - PERIOD_DAYS[period]);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const allCards = useMemo(() => {
    const flat: Card[] = [];
    for (const colId of Object.keys(cards)) flat.push(...(cards[colId] ?? []));
    return flat;
  }, [cards]);

  const stats = useMemo((): MemberStats[] => {
    return members.map((m) => {
      const name = m.user?.name ?? 'Unknown';
      const memberCards = allCards.filter(
        (c) => c.owners?.some((o) => o.id === m.user_id),
      );

      const active = memberCards.filter((c) => !c.archived_at);
      const completed = memberCards.filter(
        (c) => c.archived_at && new Date(c.archived_at) >= cutoff,
      );
      const overdue = active.filter(
        (c) => c.end_date && new Date(c.end_date) < new Date(),
      );
      const inProgress = active.filter(
        (c) => !c.end_date || new Date(c.end_date) >= new Date(),
      );

      const substepDone = active.reduce((sum, c) => sum + (c.substep_done ?? 0), 0);
      const substepTotal = active.reduce((sum, c) => sum + (c.substep_count ?? 0), 0);

      const recentCards = active
        .filter((c) => new Date(c.updated_at) >= cutoff)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 5);

      return {
        id: m.user_id,
        name,
        avatar: m.user?.avatar?.thumb_url,
        totalAssigned: active.length,
        completedInPeriod: completed.length,
        inProgress: inProgress.length,
        overdue: overdue.length,
        substepDone,
        substepTotal,
        recentCards,
      };
    });
  }, [members, allCards, cutoff]);

  const totals = useMemo(() => ({
    assigned: stats.reduce((s, m) => s + m.totalAssigned, 0),
    completed: stats.reduce((s, m) => s + m.completedInPeriod, 0),
    inProgress: stats.reduce((s, m) => s + m.inProgress, 0),
    overdue: stats.reduce((s, m) => s + m.overdue, 0),
  }), [stats]);

  const colName = (colId: string) => columns.find((c) => c.id === colId)?.name ?? '—';
  const colColor = (colId: string) => columns.find((c) => c.id === colId)?.colour ?? '#5B4FCF';

  const exportReport = () => {
    const lines: string[] = [
      `QuestBoard — Progress Report`,
      `Board: ${boardName}`,
      `Period: ${PERIOD_LABELS[period]} (last ${PERIOD_DAYS[period]} day${PERIOD_DAYS[period] > 1 ? 's' : ''})`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `SUMMARY`,
      `  Total assigned cards : ${totals.assigned}`,
      `  Completed in period  : ${totals.completed}`,
      `  In progress          : ${totals.inProgress}`,
      `  Overdue              : ${totals.overdue}`,
      '',
    ];

    for (const m of stats) {
      lines.push(`── ${m.name} ──`);
      lines.push(`  Assigned  : ${m.totalAssigned}`);
      lines.push(`  Completed : ${m.completedInPeriod}`);
      lines.push(`  In progress: ${m.inProgress}`);
      lines.push(`  Overdue   : ${m.overdue}`);
      if (m.substepTotal > 0) {
        const pct = Math.round((m.substepDone / m.substepTotal) * 100);
        lines.push(`  Subtasks  : ${m.substepDone}/${m.substepTotal} (${pct}%)`);
      }
      if (m.recentCards.length > 0) {
        lines.push(`  Recent activity:`);
        for (const c of m.recentCards) {
          lines.push(`    • [${colName(c.column_id)}] ${c.title}`);
        }
      }
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `questboard-report-${period}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[88vh] flex flex-col z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-accent)]" />
            <h2 className="text-base font-bold text-[var(--color-text)]">Member Progress Report</h2>
            <span className="text-xs text-[var(--color-text-muted)]">— {boardName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportReport}
              title="Export as text file"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--color-border)] flex-shrink-0">
          <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mr-1">Period:</span>
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                period === p
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Summary KPI bar */}
        <div className="grid grid-cols-4 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)] flex-shrink-0">
          {[
            { label: 'Assigned', value: totals.assigned, icon: User, color: 'text-blue-500' },
            { label: 'Completed', value: totals.completed, icon: CheckCircle2, color: 'text-green-500' },
            { label: 'In Progress', value: totals.inProgress, icon: Clock, color: 'text-[var(--color-accent)]' },
            { label: 'Overdue', value: totals.overdue, icon: AlertTriangle, color: 'text-[var(--color-danger)]' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--color-surface)] px-5 py-3 text-center">
              <Icon className={cn('h-4 w-4 mx-auto mb-1', color)} />
              <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Per-member rows */}
        <div className="flex-1 overflow-y-auto">
          {stats.length === 0 && (
            <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
              No members on this board yet.
            </div>
          )}

          {stats.map((m) => {
            const substepPct = m.substepTotal > 0
              ? Math.round((m.substepDone / m.substepTotal) * 100)
              : null;

            return (
              <div key={m.id} className="border-b border-[var(--color-border)] px-6 py-4 hover:bg-[var(--color-bg)]/50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                      : <span className="text-sm text-white font-bold">{m.name.charAt(0).toUpperCase()}</span>}
                  </div>

                  {/* Stats */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-text)] mb-2">{m.name}</p>

                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'Assigned', value: m.totalAssigned, className: 'text-blue-600' },
                        { label: 'Completed', value: m.completedInPeriod, className: 'text-green-600' },
                        { label: 'In Progress', value: m.inProgress, className: 'text-[var(--color-accent)]' },
                        { label: 'Overdue', value: m.overdue, className: m.overdue > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]' },
                      ].map(({ label, value, className }) => (
                        <div key={label} className="text-center bg-[var(--color-bg)] rounded-lg py-2">
                          <p className={cn('text-lg font-bold', className)}>{value}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Subtask progress */}
                    {substepPct !== null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--color-text-muted)]">Subtask completion</span>
                          <span className="font-medium text-[var(--color-text)]">{m.substepDone}/{m.substepTotal} ({substepPct}%)</span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${substepPct}%`,
                              backgroundColor: substepPct === 100 ? '#22c55e' : 'var(--color-accent)',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Recent cards */}
                    {m.recentCards.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                          Recent activity
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.recentCards.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: colColor(c.column_id) }}
                              title={`[${colName(c.column_id)}] ${c.title}`}
                            >
                              <span className="max-w-[140px] truncate">{c.title}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.totalAssigned === 0 && m.completedInPeriod === 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] italic">No cards assigned in this period.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
