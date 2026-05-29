import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, LayoutGrid, LogOut, Settings, Bug, Scroll, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUiStore } from '@/stores/ui.store';
import { logout } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { BoardDeleteDialog } from '@/components/board/BoardDeleteDialog';
import { useBoards, useCreateBoard, useArchiveBoard, usePermanentlyDeleteBoard, useBoardCardCount } from '@/hooks/useBoard';
import type { Board, UserRole } from '@questboard/shared';

const ARCHETYPE_EMOJI: Record<string, string> = {
  knight: '⚔️', mage: '🧙', archer: '🏹', paladin: '🛡️',
  rogue: '🗡️', sorcerer: '🔮', berserker: '🪓', herald: '📯',
};

// ── Board card with contextual menu ──────────────────────────────────────────

function BoardCard({ board, onClick }: { board: Board; onClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const { data: cardCount = 0 } = useBoardCardCount(board.id);
  const archiveBoard = useArchiveBoard();
  const permanentlyDelete = usePermanentlyDeleteBoard();

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(true);
  };

  const handleArchive = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpen(false);
    archiveBoard.mutate(board.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDeleteTarget(board);
  };

  return (
    <>
      <div className="relative group">
        <button
          onClick={onClick}
          className="w-full text-left bg-[var(--color-surface)] rounded-xl p-5 card-shadow border border-transparent hover:border-[var(--color-accent)]/30 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-2xl">{'🏰'}</div>
            <LayoutGrid className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
          </div>
          <h3 className="font-semibold text-[var(--color-text)] truncate mb-1">{board.name}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {board.member_count} {board.member_count === 1 ? 'member' : 'members'} ·{' '}
            {new Date(board.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </button>

        {/* "..." menu button — shown on hover */}
        <button
          onClick={openMenu}
          aria-label={`Options for ${board.name}`}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 shadow-sm"
        >
          <MoreHorizontal className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-10 right-3 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl min-w-[160px] py-1 overflow-hidden">
              <button
                onClick={handleArchive}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
              >
                <Archive className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                Archive board
              </button>
              <div className="border-t border-[var(--color-border)] my-1" />
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete board…
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <BoardDeleteDialog
          board={deleteTarget}
          cardCount={cardCount}
          onClose={() => setDeleteTarget(null)}
          onArchive={() => {
            handleArchive();
            setDeleteTarget(null);
          }}
          onPermanentDelete={() => {
            permanentlyDelete.mutate(board.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }}
          isPending={permanentlyDelete.isPending || archiveBoard.isPending}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BoardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      queryClient.clear();
      clearAuth();
      navigate('/login');
      toast.success('Signed out');
    }
  };

  const submitBoard = () => {
    const trimmed = boardName.trim();
    if (!trimmed) { setBoardNameError('Board name is required'); return; }
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
      <header className="bg-[var(--color-primary)] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{'⚔️'}</span>
          <span className="font-bold text-lg tracking-wide">QuestBoard</span>
          <VersionBadge className="text-white/50" />
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-lg">{ARCHETYPE_EMOJI[user.avatar?.archetype ?? ''] ?? '🧙'}</span>
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant={user.role as UserRole}>{user.role}</Badge>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={openChangelog} className="text-white hover:bg-white/10" title="Changelog"><Scroll className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={openBugReport} className="text-white hover:bg-white/10" title="Report a bug"><Bug className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={openSettings} className="text-white hover:bg-white/10" title="Settings"><Settings className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
            <LogOut className="h-4 w-4 mr-1" />Sign out
          </Button>
        </div>
      </header>

      <div className="h-10 flex-shrink-0 border-b border-[var(--color-border)]" aria-hidden="true" />

      <main id="main-content" className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-primary)]">Your Boards</h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              {boards?.length ?? 0} {boards?.length === 1 ? 'board' : 'boards'}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />New Board
          </Button>
        </div>

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
                {boardNameError && <p className="text-xs text-[var(--color-danger)] mt-1">{boardNameError}</p>}
              </div>
              <Button onClick={submitBoard} loading={createBoard.isPending}>Create</Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setBoardName(''); }}>Cancel</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => <div key={n} className="h-32 skeleton" />)}
          </div>
        ) : boards && boards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onClick={() => navigate(`/boards/${board.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">{'🏰'}</div>
            <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">No boards yet</h3>
            <p className="text-[var(--color-text-muted)] mb-8">Create your first board to get started.</p>
            <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" />New Board</Button>
          </div>
        )}
      </main>
    </div>
  );
}
