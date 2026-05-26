import { useEffect, useState } from 'react';
import { Users, LayoutGrid, CreditCard, LogIn, AlertTriangle, Database } from 'lucide-react';
import { getAllUsers } from '@/api/admin.api';
import { getAllBoards } from '@/api/admin.api';
import { getLoginAttempts } from '@/api/admin.api';
import { getErrorLogs } from '@/api/admin.api';
import { getStorageStats } from '@/api/admin.api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface Kpi { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }

export function SystemStatsSection() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [users, boards, attempts, errors, storage] = await Promise.all([
        getAllUsers(),
        getAllBoards(),
        getLoginAttempts(),
        getErrorLogs(),
        getStorageStats(),
      ]);
      const failed = attempts.filter((a) => !a.success).length;
      const activeUsers = users.filter((u) => u.status === 'active').length;
      const totalCards = boards.reduce((s, b) => s + b.cardCount, 0);

      setKpis([
        {
          label: 'Storage Used',
          value: formatBytes(storage.usage),
          sub: `of ${formatBytes(storage.quota)} quota`,
          icon: <Database className="h-5 w-5" />,
          color: 'text-[var(--color-accent)]',
        },
        {
          label: 'Active Users',
          value: activeUsers,
          sub: `${users.length} total`,
          icon: <Users className="h-5 w-5" />,
          color: 'text-[var(--color-success)]',
        },
        {
          label: 'Total Boards',
          value: boards.filter((b) => !b.archived_at).length,
          sub: `${boards.length} including archived`,
          icon: <LayoutGrid className="h-5 w-5" />,
          color: 'text-[var(--color-primary)]',
        },
        {
          label: 'Total Cards',
          value: totalCards,
          sub: 'across all boards',
          icon: <CreditCard className="h-5 w-5" />,
          color: 'text-[var(--color-primary)]',
        },
        {
          label: 'Login Attempts',
          value: attempts.length,
          sub: `${attempts.filter((a) => a.success).length} successful`,
          icon: <LogIn className="h-5 w-5" />,
          color: 'text-[var(--color-info)]',
        },
        {
          label: 'Failed Logins',
          value: failed,
          sub: failed > 0 ? 'review login logs' : 'none recorded',
          icon: <AlertTriangle className="h-5 w-5" />,
          color: failed > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]',
        },
        {
          label: 'Error Logs',
          value: errors.length,
          sub: errors.length > 0 ? 'check error log section' : 'all clear',
          icon: <AlertTriangle className="h-5 w-5" />,
          color: errors.length > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]',
        },
      ]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">System Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] shadow-sm"
          >
            <div className={`mb-2 ${k.color}`}>{k.icon}</div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{k.value}</p>
            <p className="text-xs font-medium text-[var(--color-text)] mt-0.5">{k.label}</p>
            {k.sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
