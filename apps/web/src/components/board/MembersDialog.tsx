import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Trash2, Search, Crown, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardMembers, useAddBoardMember, useRemoveBoardMember } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';
import { searchUsers } from '@/api/boards.api';
import type { BoardMember, User as UserType } from '@questboard/shared';

interface MembersDialogProps {
  boardId: string;
  boardOwnerId: string;
  onClose: () => void;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Crown className="h-3 w-3 text-yellow-500" />,
  member: <User className="h-3 w-3 text-[var(--color-text-muted)]" />,
  guest: <Shield className="h-3 w-3 text-[var(--color-info)]" />,
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

function MemberRow({
  member,
  canRemove,
  onRemove,
  removing,
}: {
  member: BoardMember;
  canRemove: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const name = member.user?.name ?? 'Unknown';
  const email = member.user?.email ?? '';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className="h-8 w-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] flex-shrink-0">
        {member.user?.avatar?.thumb_url ? (
          <img src={member.user.avatar.thumb_url} className="h-8 w-8 rounded-full object-cover" alt={name} />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{name}</p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{email}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
          {ROLE_ICONS[member.role]}
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={removing}
            className="p-1 rounded hover:bg-red-50 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-50"
            title="Remove member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function MembersDialog({ boardId, boardOwnerId, onClose }: MembersDialogProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [], isLoading } = useBoardMembers(boardId);
  const addMember = useAddBoardMember(boardId);
  const removeMember = useRemoveBoardMember(boardId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'guest'>('member');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const isAdmin = members.some((m) => m.user_id === currentUser?.id && (m.role === 'admin' || m.user_id === boardOwnerId));

  const membersRef = useRef(members);
  membersRef.current = members;

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const currentMemberIds = new Set(membersRef.current.map((m) => m.user_id));
      const results = await searchUsers(searchQuery);
      setSearchResults(results.filter((u) => !currentMemberIds.has(u.id)));
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = (userId: string) => {
    addMember.mutate(
      { userId, role: selectedRole },
      {
        onSuccess: () => {
          setSearchQuery('');
          setSearchResults([]);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="font-bold text-[var(--color-text)]">Board Members</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* Invite section */}
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Invite member</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              {/* Role picker */}
              <div className="flex gap-1.5">
                {(['member', 'admin', 'guest'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedRole === r
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>

              {/* Search results */}
              {searching && (
                <p className="text-xs text-[var(--color-text-muted)] px-1">Searching…</p>
              )}
              {searchResults.length > 0 && (
                <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] overflow-hidden">
                  {searchResults.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-bg)] transition-colors">
                      <div className="h-7 w-7 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] flex-shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{u.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(u.id)}
                        loading={addMember.isPending}
                        className="shrink-0 h-7 text-xs px-2.5"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {!searching && searchQuery.trim() && searchResults.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] px-1">No matching users found.</p>
              )}
            </div>
          )}

          {/* Current members */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Current members</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((n) => <div key={n} className="h-12 skeleton rounded-lg" />)}
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {members.map((m) => (
                  <MemberRow
                    key={m.user_id}
                    member={m}
                    canRemove={isAdmin && m.user_id !== boardOwnerId && m.user_id !== currentUser?.id}
                    onRemove={() => removeMember.mutate(m.user_id)}
                    removing={removeMember.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)]">
          <Button variant="ghost" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}
