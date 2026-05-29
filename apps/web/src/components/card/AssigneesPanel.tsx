import { Users } from 'lucide-react';
import { useBoardMembers } from '@/hooks/useBoard';
import { useAddCardOwner, useRemoveCardOwner } from '@/hooks/useCard';
import type { Card } from '@questboard/shared';

interface AssigneesPanelProps {
  card: Card;
  boardId: string;
}

export function AssigneesPanel({ card, boardId }: AssigneesPanelProps) {
  const { data: members = [], isLoading } = useBoardMembers(boardId);
  const addOwner = useAddCardOwner(boardId);
  const removeOwner = useRemoveCardOwner(boardId);

  const ownerIds = new Set((card.owners ?? []).map((o) => o.id));

  const toggle = (userId: string) => {
    if (ownerIds.has(userId)) {
      removeOwner.mutate({ cardId: card.id, userId });
    } else {
      addOwner.mutate({ cardId: card.id, userId });
    }
  };

  if (isLoading) return null;
  if (members.length === 0) return null;

  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mb-2">
        <Users className="h-3.5 w-3.5" /> Assignees
      </label>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const name = m.user?.name ?? 'User';
          const initials = name.slice(0, 2).toUpperCase();
          const assigned = ownerIds.has(m.user_id);

          return (
            <button
              key={m.user_id}
              onClick={() => toggle(m.user_id)}
              title={assigned ? `Unassign ${name}` : `Assign ${name}`}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
                assigned
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
              }`}
            >
              {m.user?.avatar?.thumb_url ? (
                <img
                  src={m.user.avatar.thumb_url}
                  alt={name}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  assigned ? 'bg-white/20 text-white' : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                }`}>
                  {initials}
                </span>
              )}
              {name}
            </button>
          );
        })}
      </div>
      {ownerIds.size > 0 && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
          {ownerIds.size} {ownerIds.size === 1 ? 'assignee' : 'assignees'}
        </p>
      )}
    </div>
  );
}
