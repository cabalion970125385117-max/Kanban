import { useState, useRef, useEffect } from 'react';
import { Users, User, ChevronDown, X, LayoutList, Kanban, Rows3 } from 'lucide-react';
import { useBoardMembers, useBoardLabels } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import type { Priority } from '@questboard/shared';

export interface ActiveFilters {
  userId: string | null;
  priority: Priority | null;
  labelId: string | null;
}

export type BoardView = 'kanban' | 'table' | 'swimlane';
export type SwimlaneGroupBy = 'priority' | 'assignee';

interface FilterBarProps {
  boardId: string;
  filters: ActiveFilters;
  onFiltersChange: (f: ActiveFilters) => void;
  view: BoardView;
  onViewChange: (v: BoardView) => void;
  swimlaneGroupBy: SwimlaneGroupBy;
  onSwimlaneGroupByChange: (g: SwimlaneGroupBy) => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f97316' },
  { value: 'medium',   label: 'Medium',   color: '#eab308' },
  { value: 'low',      label: 'Low',      color: '#22c55e' },
];

function Dropdown({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-30 min-w-[160px]"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  boardId,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  swimlaneGroupBy,
  onSwimlaneGroupByChange,
}: FilterBarProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: members = [] } = useBoardMembers(boardId);
  const { data: labels = [] } = useBoardLabels(boardId);

  const set = (patch: Partial<ActiveFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.userId !== null || filters.priority !== null || filters.labelId !== null;

  const pill = (
    active: boolean,
    onClick: () => void,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors select-none flex-shrink-0',
        active
          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]',
      )}
    >
      {icon}
      {label}
    </button>
  );

  const dropBtn = (label: string, active: boolean) => (
    <button
      className={cn(
        'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors select-none flex-shrink-0',
        active
          ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]'
          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]',
      )}
    >
      {label}
      <ChevronDown className="h-3 w-3" />
    </button>
  );

  const activePriority = PRIORITIES.find((p) => p.value === filters.priority);
  const activeLabel = labels.find((l) => l.id === filters.labelId);

  const viewBtn = (v: BoardView, icon: React.ReactNode, title: string) => (
    <button
      onClick={() => onViewChange(v)}
      title={title}
      aria-label={title}
      className={cn(
        'flex items-center justify-center h-7 w-7 rounded transition-colors',
        view === v
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]',
      )}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0 overflow-x-auto"
      role="toolbar"
      aria-label="Board filters and view controls"
    >
      {/* Assignee section */}
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] flex-shrink-0">
        Filter
      </span>

      {pill(filters.userId === null, () => set({ userId: null }), 'All', <Users className="h-3 w-3" aria-hidden="true" />)}
      {pill(
        filters.userId === currentUser?.id,
        () => set({ userId: filters.userId === currentUser?.id ? null : (currentUser?.id ?? null) }),
        'Mine',
        <User className="h-3 w-3" aria-hidden="true" />,
      )}

      {members.map((member) => {
        const name = member.user?.name ?? 'Unknown';
        const initials = name.slice(0, 2).toUpperCase();
        const isActive = filters.userId === member.user_id;
        return (
          <button
            key={member.user_id}
            onClick={() => set({ userId: isActive ? null : member.user_id })}
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
            {member.user?.avatar?.thumb_url ? (
              <img src={member.user.avatar.thumb_url} className="h-4 w-4 rounded-full object-cover" alt="" aria-hidden="true" />
            ) : (
              <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0', isActive ? 'bg-white/25' : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]')} aria-hidden="true">
                {initials}
              </span>
            )}
            <span className="max-w-[80px] truncate">{name}</span>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-4 bg-[var(--color-border)] mx-1 flex-shrink-0" aria-hidden="true" />

      {/* Priority filter */}
      <Dropdown trigger={dropBtn(activePriority ? activePriority.label : 'Priority', !!filters.priority)}>
        <div className="py-1">
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            onClick={() => set({ priority: null })}
          >
            Any priority
          </button>
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-bg)]',
                filters.priority === p.value ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text)]',
              )}
              onClick={() => set({ priority: p.value })}
            >
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Label filter */}
      {labels.length > 0 && (
        <Dropdown trigger={dropBtn(activeLabel ? activeLabel.name : 'Label', !!filters.labelId)}>
          <div className="py-1">
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              onClick={() => set({ labelId: null })}
            >
              Any label
            </button>
            {labels.map((l) => (
              <button
                key={l.id}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-bg)]',
                  filters.labelId === l.id ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text)]',
                )}
                onClick={() => set({ labelId: l.id })}
              >
                <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.colour }} />
                {l.name}
              </button>
            ))}
          </div>
        </Dropdown>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => onFiltersChange({ userId: null, priority: null, labelId: null })}
          title="Clear all filters"
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors flex-shrink-0"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}

      {/* Push view toggle to right */}
      <div className="flex-1" />

      {/* Swimlane group-by (only visible in swimlane view) */}
      {view === 'swimlane' && (
        <Dropdown trigger={
          <button className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors flex-shrink-0">
            Group: {swimlaneGroupBy === 'priority' ? 'Priority' : 'Assignee'}
            <ChevronDown className="h-3 w-3" />
          </button>
        }>
          <div className="py-1">
            <button className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-bg)]', swimlaneGroupBy === 'priority' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text)]')} onClick={() => onSwimlaneGroupByChange('priority')}>Priority</button>
            <button className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--color-bg)]', swimlaneGroupBy === 'assignee' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text)]')} onClick={() => onSwimlaneGroupByChange('assignee')}>Assignee</button>
          </div>
        </Dropdown>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-0.5 border border-[var(--color-border)] rounded-lg p-0.5 flex-shrink-0">
        {viewBtn('kanban', <Kanban className="h-3.5 w-3.5" />, 'Kanban view')}
        {viewBtn('swimlane', <Rows3 className="h-3.5 w-3.5" />, 'Swimlane view')}
        {viewBtn('table', <LayoutList className="h-3.5 w-3.5" />, 'Table view')}
      </div>
    </div>
  );
}
