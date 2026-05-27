import { useState, useCallback, useRef } from 'react';
import { X, UserPlus, Trash2, Search, Crown, Shield, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardMembers, useAddBoardMember, useRemoveBoardMember, useUpdateBoardMemberRole } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';
import { searchUsers } from '@/api/boards.api';
import type { BoardMember, User as UserType } from '@questboard/shared';

interface BoardMembersDialogProps {
  boardId: string;
  boardOwnerId: string;
  onClose: () => void;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Crown className="h-3 w-3 text-yellow-500" />,
  member: <User className="h-3 w-3 text-[var(--color-text-muted)]" />,
  guest: <Shield className="h-3 w-3 text-[var(--color-info)]" />,
};

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', member: 'Member', guest: 'Guest' };

// ─── Last-admin block dialog ──────────────────────────────────────────────────

function LastAdminBlockDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-text)]">Cannot revoke last admin</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              This board must always have at least one admin.
              Promote another member to admin before revoking your own rights.
            </p>
          </div>
        </div>
        <Button onClick={onClose} className="w-full">Got it</Button>
      </div>
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isCurrentUser,
  isCurrentUserAdmin,
  isLastAdmin,
  canRemove,
  onPromote,
  onDemote,
  onRemove,
  updating,
  removing,
}: {
  member: BoardMember;
  isCurrentUser: boolean;
  isCurrentUserAdmin: boolean;
  isLastAdmin: boolean;
  canRemove: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
  updating: boolean;
  removing: boolean;
}) {
  const name = member.user?.name ?? 'Unknown';
  const initials = name.slice(0, 2).toUpperCase();
  const isAdmin = member.role === 'admin';

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] flex-shrink-0">
        {member.user?.avatar?.thumb_url
          ? <img src={member.user.avatar.thumb_url} className="h-8 w-8 rounded-full object-cover" alt={name} />
          : initials}
      </div>

      {/* Name / email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">
          {name}
          {isCurrentUser && (
            <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)] font-normal">(you)</span>
          )}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{member.user?.email ?? ''}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Role badge */}
        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
          {ROLE_ICONS[member.role]}
          {ROLE_LABELS[member.role] ?? member.role}
        </span>

        {/* Grant admin — visible to admins when target is not already admin */}
        {isCurrentUserAdmin && !isAdmin && (
          <button
            onClick={onPromote}
            disabled={updating}
            title="Grant admin rights"
            aria-label={`Grant admin to ${name}`}
            className="p-1 rounded hover:bg-yellow-50 text-[var(--color-text-muted)] hover:text-yellow-600 transition-colors disabled:opacity-50"
          >
            <Crown className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Revoke admin — visible when target is admin and current user is admin */}
        {isCurrentUserAdmin && isAdmin && (
          <button
            onClick={onDemote}
            disabled={updating}
            title={isLastAdmin ? 'Cannot revoke — last admin' : 'Revoke admin rights'}
            aria-label={`Revoke admin from ${name}`}
            className={`p-1 rounded transition-colors disabled:opacity-50 ${
              isLastAdmin
                ? 'text-orange-300 cursor-not-allowed'
                : 'hover:bg-orange-50 text-yellow-500 hover:text-orange-600'
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Remove member */}
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={removing}
            className="p-1 rounded hover:bg-red-50 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-50"
            title="Remove member"
            aria-label={`Remove ${name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function BoardMembersDialog({ boardId, boardOwnerId, onClose }: BoardMembersDialogProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [], isLoading } = useBoardMembers(boardId);
  const addMember = useAddBoardMember(boardId);
  const removeMember = useRemoveBoardMember(boardId);
  const updateRole = useUpdateBoardMemberRole(boardId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [showLastAdminBlock, setShowLastAdminBlock] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const isCurrentUserAdmin = members.some(
    (m) => m.user_id === currentUser?.id && m.role === 'admin',
  );
  const adminCount = members.filter((m) => m.role === 'admin').length;

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      clearTimeout(debounceRef.current);
      if (!query.trim()) { setSearchResults([]); return; }
      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        const results = await searchUsers(query);
        setSearchResults(results.filter((u) => !memberUserIds.has(u.id)));
        setSearching(false);
      }, 300);
    },
    [members], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleAdd = (userId: string) => {
    addMember.mutate(
      { userId, role: selectedRole },
      { onSuccess: () => { setSearchQuery(''); setSearchResults([]); } },
    );
  };

  const handlePromote = (member: BoardMember) => {
    updateRole.mutate({ userId: member.user_id, role: 'admin' });
  };

  const handleDemote = (member: BoardMember) => {
    if (adminCount <= 1 && member.role === 'admin') {
      setShowLastAdminBlock(true);
      return;
    }
    updateRole.mutate({ userId: member.user_id, role: 'member' });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <div>
              <h2 className="font-bold text-[var(--color-text)]">Board Members</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {members.length} {members.length === 1 ? 'member' : 'members'}
                {adminCount > 0 && (
                  <span className="ml-2 text-yellow-600">
                    · {adminCount} {adminCount === 1 ? 'admin' : 'admins'}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close members dialog"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            {/* Invite section — admins only */}
            {isCurrentUserAdmin && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Invite member
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>

                {/* Role selector */}
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

                {searching && <p className="text-xs text-[var(--color-text-muted)] px-1">Searching…</p>}

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

            {/* Admin hint for non-admins */}
            {!isCurrentUserAdmin && (
              <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2">
                Only board admins can invite or remove members.
              </p>
            )}

            {/* Current members list */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Current members
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((n) => <div key={n} className="h-12 skeleton rounded-lg" />)}
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {members.map((m) => {
                    const isThisAdmin = m.role === 'admin';
                    const isThisLastAdmin = isThisAdmin && adminCount <= 1;
                    return (
                      <MemberRow
                        key={m.user_id}
                        member={m}
                        isCurrentUser={m.user_id === currentUser?.id}
                        isCurrentUserAdmin={isCurrentUserAdmin}
                        isLastAdmin={isThisLastAdmin}
                        canRemove={
                          isCurrentUserAdmin &&
                          m.user_id !== boardOwnerId &&
                          m.user_id !== currentUser?.id
                        }
                        onPromote={() => handlePromote(m)}
                        onDemote={() => handleDemote(m)}
                        onRemove={() => removeMember.mutate(m.user_id)}
                        updating={updateRole.isPending}
                        removing={removeMember.isPending}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={onClose} className="w-full">Close</Button>
          </div>
        </div>
      </div>

      {showLastAdminBlock && (
        <LastAdminBlockDialog onClose={() => setShowLastAdminBlock(false)} />
      )}
    </>
  );
}
