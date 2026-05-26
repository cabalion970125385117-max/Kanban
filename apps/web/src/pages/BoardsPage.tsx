import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Priority, UserRole } from '@questboard/shared';

const ARCHETYPE_EMOJI: Record<string, string> = {
  knight: '⚔️', mage: '🧙', archer: '🏹', paladin: '🛡️',
  rogue: '🗡️', sorcerer: '🔮', berserker: '🪓', herald: '📯',
};

export function BoardsPage() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate('/login');
      toast.success('Signed out');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Top nav */}
      <header className="bg-[var(--color-primary)] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <span className="font-bold text-lg tracking-wide">QuestBoard</span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {ARCHETYPE_EMOJI[user.avatar?.archetype ?? ''] ?? '🧙'}
              </span>
              <span className="text-sm font-medium">{user.name}</span>
              <Badge variant={user.role as UserRole}>{user.role}</Badge>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Content placeholder */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center py-24">
          <div className="text-6xl mb-6">🏰</div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-2">Your Boards</h2>
          <p className="text-[var(--color-text-muted)] mb-8">
            Phase 2 will add board creation & the full Kanban view.
          </p>
          <div className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed">
            ＋ New Board <span className="text-xs opacity-75">(Phase 2)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
