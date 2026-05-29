import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getLoginAttempts } from '@/api/admin.api';
import type { LoginAttemptRow } from '@/lib/db';

type Filter = 'all' | 'success' | 'failed';

export function LoginLogsSection() {
  const [logs, setLogs] = useState<LoginAttemptRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    getLoginAttempts().then(setLogs);
  }, []);

  const filtered = logs.filter((l) => {
    if (filter === 'success') return l.success;
    if (filter === 'failed') return !l.success;
    return true;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Login Logs</h2>
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
          {(['all', 'success', 'failed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`px-3 py-1.5 capitalize font-medium transition-colors border-r last:border-r-0 border-[var(--color-border)] ${
                filter === f
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {paged.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">No login attempts recorded</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-left px-4 py-3">Identifier</th>
                <th className="text-left px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {paged.map((l) => (
                <tr key={l.id} className="hover:bg-[var(--color-bg)]/50">
                  <td className="px-4 py-2.5">
                    {l.success ? (
                      <span className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[var(--color-danger)] text-xs font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text)] font-mono text-xs">{l.identifier}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-[var(--color-text-muted)]">
          <span>{filtered.length} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-[var(--color-border)] disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-3 py-1">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded border border-[var(--color-border)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
