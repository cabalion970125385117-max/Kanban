import { useEffect, useState } from 'react';
import { getStorageStats, type StorageStats } from '@/api/admin.api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StorageInspectorSection() {
  const [stats, setStats] = useState<StorageStats | null>(null);

  useEffect(() => { getStorageStats().then(setStats); }, []);

  if (!stats) {
    return <div className="h-64 skeleton rounded-xl" />;
  }

  const usedPct = stats.quota > 0 ? Math.round((stats.usage / stats.quota) * 100) : 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Storage Inspector</h2>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--color-text)]">IndexedDB Usage</span>
          <span className="text-sm font-bold text-[var(--color-text)]">{usedPct}%</span>
        </div>
        <div className="w-full h-3 bg-[var(--color-bg)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${Math.min(usedPct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[var(--color-text-muted)]">
          <span>{formatBytes(stats.usage)} used</span>
          <span>{formatBytes(stats.quota)} quota</span>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Store</th>
              <th className="text-right px-4 py-3">Records</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {Object.entries(stats.storeCounts).map(([name, count]) => (
              <tr key={name} className="hover:bg-[var(--color-bg)]/50">
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text)]">{name}</td>
                <td className="px-4 py-2.5 text-right text-[var(--color-text-muted)]">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
