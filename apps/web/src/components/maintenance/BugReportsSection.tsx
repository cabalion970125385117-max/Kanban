import { useEffect, useState } from 'react';
import { getBugReports, updateBugReportStatus } from '@/api/admin.api';
import { toast } from 'sonner';
import type { BugReportRow } from '@/lib/db';

const STATUS_COLORS: Record<BugReportRow['status'], string> = {
  open: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
  in_progress: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  resolved: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
};

const SEVERITY_COLORS: Record<BugReportRow['severity'], string> = {
  low: 'text-[var(--color-text-muted)]',
  medium: 'text-[var(--color-info)]',
  high: 'text-[var(--color-warning)]',
  critical: 'text-[var(--color-danger)] font-bold',
};

const CATEGORY_LABELS: Record<BugReportRow['category'], string> = {
  ui_bug: 'UI Bug', functionality: 'Functionality',
  performance: 'Performance', security: 'Security', other: 'Other',
};

export function BugReportsSection() {
  const [reports, setReports] = useState<BugReportRow[]>([]);

  const load = async () => setReports(await getBugReports());

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: BugReportRow['status']) => {
    await updateBugReportStatus(id, status);
    toast.success('Status updated');
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Bug Reports</h2>
        <span className="text-sm text-[var(--color-text-muted)]">{reports.length} total</span>
      </div>

      {reports.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center text-[var(--color-text-muted)] text-sm">
          No bug reports submitted yet
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Page</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-bg)]/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text)] truncate max-w-[200px]">{r.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">{r.description}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">{CATEGORY_LABELS[r.category]}</td>
                  <td className={`px-4 py-3 text-xs capitalize ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs font-mono">{r.current_page}</td>
                  <td className="px-4 py-3">
                    <select
                      className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer ${STATUS_COLORS[r.status]}`}
                      value={r.status}
                      onChange={(e) => changeStatus(r.id, e.target.value as BugReportRow['status'])}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
