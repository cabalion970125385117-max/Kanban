import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import type { Card } from '@questboard/shared';

interface CardFaceProps {
  card: Card;
  onClick: (card: Card) => void;
  isDragOverlay?: boolean;
}

function agingDays(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

export const CardFace = memo(function CardFace({ card, onClick, isDragOverlay = false }: CardFaceProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = card.end_date && new Date(card.end_date) < new Date() && !card.archived_at;
  const days = agingDays(card.updated_at);
  const hasCover = !!card.cover_colour;
  const hasSubsteps = (card.substep_count ?? 0) > 0;
  const substepPct = hasSubsteps
    ? Math.round(((card.substep_done ?? 0) / (card.substep_count ?? 1)) * 100)
    : 0;

  const ariaLabel = [
    card.title,
    `${card.priority} priority`,
    isOverdue ? 'overdue' : null,
    hasSubsteps ? `${card.substep_done ?? 0} of ${card.substep_count} subtasks done` : null,
    days >= 3 ? `idle ${days} days` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={ariaLabel}
      role="listitem"
      onClick={() => onClick(card)}
      className={cn(
        'bg-[var(--color-surface)] rounded-lg card-shadow cursor-pointer select-none overflow-hidden',
        'border border-transparent hover:border-[var(--color-accent)]/30',
        isDragging && 'opacity-40',
        isDragOverlay && 'rotate-1 shadow-xl',
      )}
    >
      {/* Cover color stripe */}
      {hasCover && (
        <div className="h-1.5 w-full" style={{ backgroundColor: card.cover_colour! }} />
      )}

      <div className="p-3">
        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className="h-1.5 w-8 rounded-full"
                style={{ backgroundColor: label.colour }}
                title={label.name}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium text-[var(--color-text)] leading-snug mb-2 line-clamp-3">
          {card.title}
        </p>

        {/* Subtask progress bar */}
        {hasSubsteps && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {card.substep_done}/{card.substep_count} tasks
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{substepPct}%</span>
            </div>
            <div className="h-1 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${substepPct}%`,
                  backgroundColor: substepPct === 100 ? '#22c55e' : 'var(--color-accent)',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={card.priority} />

          {card.end_date && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs',
              isOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]',
            )}>
              <Calendar className="h-3 w-3" />
              {new Date(card.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}

          {/* Aging badge */}
          {days >= 3 && (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
                days >= 7
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-700',
              )}
              title={`No activity for ${days} days`}
            >
              {days}d idle
            </span>
          )}

          {/* Assignee avatars */}
          {card.owners && card.owners.length > 0 && (
            <div className="flex -space-x-1 ml-auto">
              {card.owners.slice(0, 3).map((owner) => (
                <div
                  key={owner.id}
                  className="w-5 h-5 rounded-full bg-[var(--color-accent)] border border-[var(--color-surface)] flex items-center justify-center overflow-hidden"
                  title={owner.name}
                >
                  {owner.avatar?.thumb_url ? (
                    <img src={owner.avatar.thumb_url} alt={owner.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-white font-bold">
                      {owner.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {card.owners.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-[var(--color-border)] border border-[var(--color-surface)] flex items-center justify-center">
                  <span className="text-[9px] text-[var(--color-text-muted)] font-bold">
                    +{card.owners.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
