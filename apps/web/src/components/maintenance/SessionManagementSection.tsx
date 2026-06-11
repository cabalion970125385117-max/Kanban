import { useEffect, useState } from 'react';
import { ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { getAllSessions, deleteSession, type SessionWithUser } from '@/api/admin.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';

export function SessionManagementSection() {
  const { accessToken } = useAuthStore();
  const [sessions, setSessions] = useState<SessionWithUser[]>([]);

  const load = async () => setSessions(await getAllSessions());

  useEffect(() => { load(); }, []);

  const invalidate = async (token: string) => {
    if (token === accessToken) { toast.error('Cannot invalidate your own session'); return; }
    await deleteSession(token);
    toast.success('Session invalidated');
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Session Management</h2>
        <span className="text-sm text-[var(--color-text-muted)]">{sessions.length} active</span>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] text-sm">No active sessions</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sessions.map((s) => (
                <tr key={s.token} className="hover:bg-[var(--color-bg)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                    {s.userName}
                    {s.token === accessToken && (
                      <span className="ml-2 text-xs bg-[var(--color-accent)]/15 text-[var(--color-accent)] px-1.5 py-0.5 rounded">you</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{s.userEmail}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">
                    {new Date(s.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => invalidate(s.token)}
                      disabled={s.token === accessToken}
                      className="text-[var(--color-danger)]"
                      title="Invalidate session"
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Invalidate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
