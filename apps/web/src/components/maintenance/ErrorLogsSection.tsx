import { useEffect, useState } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorLogs, clearErrorLogs } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import type { ErrorLogRow } from '@/lib/db';

export function ErrorLogsSection() {
  const [logs, setLogs] = useState<ErrorLogRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => setLogs(await getErrorLogs());

  useEffect(() => { load(); }, []);

  const clearAll = async () => {
    await clearErrorLogs();
    toast.success('Error logs cleared');
    setLogs([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Error Logs</h2>
        {logs.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll} className="text-[var(--color-danger)]">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
          </Button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center text-[var(--color-text-muted)] text-sm">
          No errors logged — all clear!
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-bg)]/50"
              >
                {expanded === log.id
                  ? <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                }
                <span className="flex-1 text-sm font-medium text-[var(--color-danger)] truncate">{log.message}</span>
                <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </button>
              {expanded === log.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    <span className="font-medium text-[var(--color-text)]">Page:</span> {log.page_url}
                  </p>
                  {log.stack && (
                    <pre className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                      {log.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
