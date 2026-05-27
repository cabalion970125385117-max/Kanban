import { Users, User } from 'lucide-react';
import { useBoardMembers } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  boardId: string;
  /** null = show all cards; a userId = show only cards owned by that user */
  activeFilter: string | null;
  onChange: (userId: string | null) => void;
}

export function FilterBar({ boardId, activeFilter, onChange }: FilterBarProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [] } = useBoardMembers(boardId);

  const pill = (active: boolean, onClick: () => void, label: string, icon: React.ReactNode) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors select-none',
        active
          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]',
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0 overflow-x-auto"
      role="toolbar"
      aria-label="Card filter"
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mr-1 flex-shrink-0">
        Filter
      </span>

      {pill(
        activeFilter === null,
        () => onChange(null),
        'All',
        <Users className="h-3 w-3" aria-hidden="true" />,
      )}

      {pill(
        activeFilter === currentUser?.id,
        () => onChange(activeFilter === currentUser?.id ? null : (currentUser?.id ?? null)),
        'Mine',
        <User className="h-3 w-3" aria-hidden="true" />,
      )}

      {members.length > 0 && (
        <div className="w-px h-4 bg-[var(--color-border)] mx-1 flex-shrink-0" aria-hidden="true" />
      )}

      {members.map((member) => {
        const name = member.user?.name ?? 'Unknown';
        const initials = name.slice(0, 2).toUpperCase();
        const isActive = activeFilter === member.user_id;

        const avatar = member.user?.avatar?.thumb_url ? (
          <img
            src={member.user.avatar.thumb_url}
            className="h-4 w-4 rounded-full object-cover"
            alt=""
            aria-hidden="true"
          />
        ) : (
          <span
            className={cn(
              'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
              isActive
                ? 'bg-white/25'
                : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]',
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
        );

        return (
          <button
            key={member.user_id}
            onClick={() => onChange(isActive ? null : member.user_id)}
            aria-pressed={isActive}
            aria-label={`Filter by ${name}`}
            title={name}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors select-none flex-shrink-0',
              isActive
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]',
            )}
          >
            {avatar}
            <span className="max-w-[80px] truncate">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
