/**
 * ReactionBar — emoji reactions on cards.
 * Quick-pick 6 emojis, toggled per user, with live counts.
 */
import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardReactions, useToggleReaction } from '@/hooks/useReactions';
import { useAuthStore } from '@/stores/auth.store';

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '😮', '🔥', '😢'];

interface ReactionBarProps {
  cardId: string;
  compact?: boolean; // true = CardFace footer pill (only shows nonzero)
}

export function ReactionBar({ cardId, compact = false }: ReactionBarProps) {
  const { data: reactions = [] } = useCardReactions(cardId);
  const toggle = useToggleReaction(cardId);
  const currentUser = useAuthStore((s) => s.user);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Aggregate: emoji → { count, mine }
  const counts = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const existing = counts.get(r.emoji) ?? { count: 0, mine: false };
    counts.set(r.emoji, {
      count: existing.count + 1,
      mine: existing.mine || r.user_id === currentUser?.id,
    });
  }

  const handleToggle = (emoji: string) => {
    toggle.mutate({ emoji });
    setPickerOpen(false);
  };

  if (compact) {
    // Only show pills that have reactions; used in CardFace footer
    const nonZero = QUICK_EMOJIS.filter((e) => (counts.get(e)?.count ?? 0) > 0);
    if (nonZero.length === 0) return null;
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {nonZero.map((emoji) => {
          const { count, mine } = counts.get(emoji) ?? { count: 0, mine: false };
          return (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); handleToggle(emoji); }}
              className={cn(
                'flex items-center gap-0.5 text-[10px] px-1 py-0 rounded-full border transition-colors',
                mine
                  ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                  : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)]',
              )}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reaction pills */}
      {QUICK_EMOJIS.filter((e) => (counts.get(e)?.count ?? 0) > 0).map((emoji) => {
        const { count, mine } = counts.get(emoji) ?? { count: 0, mine: false };
        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            title={mine ? 'Remove your reaction' : 'Add reaction'}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-all',
              mine
                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/50 text-[var(--color-accent)] font-medium'
                : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]/40',
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs tabular-nums">{count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          title="Add reaction"
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-all',
            'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]/40',
          )}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>

        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <div className="absolute bottom-full mb-1 left-0 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 flex gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleToggle(emoji)}
                  className="text-xl p-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
