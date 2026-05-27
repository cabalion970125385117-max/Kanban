import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, LayoutGrid, LogOut, Settings, Bug, Scroll } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUiStore } from '@/stores/ui.store';
import { logout } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { useBoards, useCreateBoard } from '@/hooks/useBoard';
import type { UserRole } from '@questboard/shared';

const ARCHETYPE_EMOJI: Record<string, string> = {
  knight: '⚔️', mage: '🧙', archer: '🏹', paladin: '🛡️',
  rogue: '🗡️', sorcerer: '🔮', berserker: '🪓', herald: '📯',
};

export function BoardsPage() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { openSettings } = useSettingsStore();
  const { openBugReport, openChangelog } = useUiStore();
  const [creating, setCreating] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardNameError, setBoardNameError] = useState('');

  const { data: boards, isLoading } = useBoards();
  const createBoard = useCreateBoard();

  const handleLogout = async () => {
    try { await logout(); } finally {
      clearAuth();
      navigate('/login');
      toast.success('Signed out');
    }
  };

  const submitBoard = () => {
    const trimmed = boardName.trim();
    if (!trimmed) {
      setBoardNameError('Board name is required');
      return;
    }
    setBoardNameError('');
    createBoard.mutate({ name: trimmed }, {
      onSuccess: (board) => {
        setBoardName('');
        setCreating(false);
        navigate(`/boards/${board.id}`);
      },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Top nav */}
      <header className="bg-[var(--color-primary)] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{'⚔️'}</span>
          <span className="font-bold text-lg tracking-wide">QuestBoard</span>
          <VersionBadge className="text-white/50" />
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {ARCHETYPE_EMOJI[user.avatar?.archetype ?? ''] ?? '🧙'}
              </span>
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant={user.role as UserRole}>{user.role}</Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={openChangelog}
            className="text-white hover:bg-white/10"
            title="Changelog"
          >
            <Scroll className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openBugReport}
            className="text-white hover:bg-white/10"
            title="Report a bug"
          >
            <Bug className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openSettings}
            className="text-white hover:bg-white/10"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign out
          </Button>
        </div>
      </header>

      {/* ── Task-banner slot — reserved for future animated banner (current task + team count) ── */}
      <div className="h-10 flex-shrink-0 border-b border-[var(--color-border)]" aria-hidden="true" />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-primary)]">Your Boards</h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              {boards?.length ?? 0} {boards?.length === 1 ? 'board' : 'boards'}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Board
          </Button>
        </div>

        {/* New board form */}
        {creating && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-accent)]/30 rounded-xl p-5 mb-6 shadow-sm">
            <h3 className="font-semibold mb-3 text-[var(--color-primary)]">Create a board</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  autoFocus
                  placeholder="Board name…"
                  value={boardName}
                  onChange={(e) => { setBoardName(e.target.value); if (boardNameError) setBoardNameError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitBoard();
                    if (e.key === 'Escape') { setCreating(false); setBoardName(''); setBoardNameError(''); }
                  }}
                  className={boardNameError ? 'border-[var(--color-danger)]' : ''}
                />
                {boardNameError && (
                  <p className="text-xs text-[var(--color-danger)] mt-1">{boardNameError}</p>
                )}
              </div>
              <Button onClick={submitBoard} loading={createBoard.isPending}>
                Create
              </Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setBoardName(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Board grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 skeleton" />
            ))}
          </div>
        ) : boards && boards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => navigate(`/boards/${board.id}`)}
                className="group text-left bg-[var(--color-surface)] rounded-xl p-5 card-shadow border border-transparent hover:border-[var(--color-accent)]/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">{'🏰'}</div>
                  <LayoutGrid className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                </div>
                <h3 className="font-semibold text-[var(--color-text)] truncate mb-1">
                  {board.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {board.member_count} {board.member_count === 1 ? 'member' : 'members'} ·{' '}
                  {new Date(board.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">{'🏰'}</div>
            <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">No boards yet</h3>
            <p className="text-[var(--color-text-muted)] mb-8">Create your first board to get started.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Board
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
