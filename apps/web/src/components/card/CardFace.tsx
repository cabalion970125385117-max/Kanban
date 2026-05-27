import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import type { Card } from '@questboard/shared';

interface CardFaceProps {
  card: Card;
  onClick: (card: Card) => void;
  isDragOverlay?: boolean;
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

  const ariaLabel = [
    card.title,
    `${card.priority} priority`,
    isOverdue ? 'overdue' : null,
    (card.substep_count ?? 0) > 0
      ? `${card.substep_done ?? 0} of ${card.substep_count} subtasks done`
      : null,
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
        'bg-[var(--color-surface)] rounded-lg p-3 card-shadow cursor-pointer select-none',
        'border border-transparent hover:border-[var(--color-accent)]/30',
        isDragging && 'opacity-40',
        isDragOverlay && 'rotate-1 shadow-xl',
      )}
    >
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

        {(card.substep_count ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-[var(--color-text-muted)]">
            <Clock className="h-3 w-3" />
            {card.substep_done}/{card.substep_count}
          </span>
        )}

        {/* Assignee avatars */}
        {card.owners && card.owners.length > 0 && (
          <div className="flex -space-x-1 ml-auto">
            {card.owners.slice(0, 3).map((owner) => (
              <div
                key={owner.id}
                className="w-5 h-5 rounded-full bg-[var(--color-accent)] border border-white flex items-center justify-center"
                title={owner.name}
              >
                {owner.avatar?.thumb_url ? (
                  <img
                    src={owner.avatar.thumb_url}
                    alt={owner.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] text-white font-bold">
                    {owner.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
