import { useEffect, useState } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllBoards, adminArchiveBoard, adminDeleteBoard, type BoardWithStats } from '@/api/admin.api';
import { Button } from '@/components/ui/button';

export function BoardOverviewSection() {
  const [boards, setBoards] = useState<BoardWithStats[]>([]);

  const load = async () => setBoards(await getAllBoards());

  useEffect(() => { load(); }, []);

  const archive = async (id: string) => {
    await adminArchiveBoard(id);
    toast.success('Board archived');
    await load();
  };

  const del = async (id: string) => {
    await adminDeleteBoard(id);
    toast.success('Board deleted');
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Board Overview</h2>
        <span className="text-sm text-[var(--color-text-muted)]">{boards.length} total</span>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {boards.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] text-sm">No boards found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Board</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Members</th>
                <th className="text-left px-4 py-3">Cards</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {boards.map((b) => (
                <tr key={b.id} className={`hover:bg-[var(--color-bg)]/50 ${b.archived_at ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{b.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{b.ownerName}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{b.memberCount}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{b.cardCount}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {b.archived_at ? (
                      <span className="text-xs bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">Archived</span>
                    ) : (
                      <span className="text-xs bg-[var(--color-success)]/15 text-[var(--color-success)] px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {!b.archived_at && (
                        <Button size="sm" variant="ghost" onClick={() => archive(b.id)} title="Archive">
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => del(b.id)} className="text-[var(--color-danger)]" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
