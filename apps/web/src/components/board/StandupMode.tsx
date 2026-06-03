/**
 * StandupMode — fullscreen presentation overlay for daily standups.
 * Shows columns as tabs, cards as large tiles, with keyboard navigation.
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Maximize2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { useBoardStore } from '@/stores/board.store';
import type { Card, Column } from '@questboard/shared';

interface StandupModeProps {
  onClose: () => void;
}

const TIMER_OPTIONS = [1, 2, 5] as const;

function agingDays(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

interface SpotlightCardProps {
  card: Card;
  onClose: () => void;
}

function SpotlightCard({ card, onClose }: SpotlightCardProps) {
  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4">
          <PriorityBadge priority={card.priority} />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">{card.title}</h2>
        {card.description && (
          <p className="text-[var(--color-text-muted)] text-base leading-relaxed mb-4 whitespace-pre-wrap">
            {card.description}
          </p>
        )}
        {card.end_date && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Due: {new Date(card.end_date).toLocaleDateString()}
          </p>
        )}
        {card.owners && card.owners.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {card.owners.map((owner) => (
              <div key={owner.id} className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center overflow-hidden">
                  {owner.avatar?.thumb_url ? (
                    <img src={owner.avatar.thumb_url} alt={owner.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-white font-bold">{owner.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm text-[var(--color-text)]">{owner.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StandupCardTileProps {
  card: Card;
  onSpotlight: () => void;
}

function StandupCardTile({ card, onSpotlight }: StandupCardTileProps) {
  const days = agingDays(card.updated_at);
  const isOverdue = card.end_date && new Date(card.end_date) < new Date();

  return (
    <div
      onClick={onSpotlight}
      className="bg-[var(--color-surface)] rounded-xl p-5 cursor-pointer hover:ring-2 hover:ring-[var(--color-accent)]/40 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <PriorityBadge priority={card.priority} />
        <Maximize2 className="h-3.5 w-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <p className="text-base font-semibold text-[var(--color-text)] leading-snug mb-3 line-clamp-3">
        {card.title}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {card.end_date && (
          <span className={cn(
            'text-xs',
            isOverdue ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-muted)]',
          )}>
            {isOverdue ? '⚠️ ' : ''}Due {new Date(card.end_date).toLocaleDateString()}
          </span>
        )}
        {days >= 3 && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            days >= 7 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700',
          )}>
            {days}d idle
          </span>
        )}
        {card.substep_count != null && card.substep_count > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {card.substep_done}/{card.substep_count} tasks
          </span>
        )}
      </div>

      {card.owners && card.owners.length > 0 && (
        <div className="flex -space-x-1 mt-3">
          {card.owners.slice(0, 4).map((owner) => (
            <div
              key={owner.id}
              className="w-6 h-6 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-surface)] flex items-center justify-center overflow-hidden"
              title={owner.name}
            >
              {owner.avatar?.thumb_url ? (
                <img src={owner.avatar.thumb_url} alt={owner.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] text-white font-bold">{owner.name.charAt(0)}</span>
              )}
            </div>
          ))}
          {card.owners.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-[var(--color-border)] border-2 border-[var(--color-surface)] flex items-center justify-center">
              <span className="text-[9px] text-[var(--color-text-muted)]">+{card.owners.length - 4}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StandupMode({ onClose }: StandupModeProps) {
  const { columns, cards: cardsByColumn } = useBoardStore();
  const [colIdx, setColIdx] = useState(0);
  const [timerMins, setTimerMins] = useState<(typeof TIMER_OPTIONS)[number] | null>(null);
  const [secsLeft, setSecsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [spotlightCard, setSpotlightCard] = useState<Card | null>(null);

  const visibleColumns = columns.filter((c) => (cardsByColumn[c.id]?.length ?? 0) > 0);
  const activeCol: Column | undefined = visibleColumns[colIdx];
  const activeCards = activeCol ? (cardsByColumn[activeCol.id] ?? []) : [];

  const prev = useCallback(() => setColIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setColIdx((i) => Math.min(visibleColumns.length - 1, i + 1)), [visibleColumns.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (spotlightCard) { if (e.key === 'Escape') setSpotlightCard(null); return; }
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, prev, next, spotlightCard]);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || secsLeft <= 0) { if (secsLeft <= 0 && timerRunning) setTimerRunning(false); return; }
    const t = setInterval(() => setSecsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timerRunning, secsLeft]);

  const startTimer = (mins: (typeof TIMER_OPTIONS)[number]) => {
    setTimerMins(mins);
    setSecsLeft(mins * 60);
    setTimerRunning(true);
  };

  const timerColor = secsLeft < 30 ? 'text-[var(--color-danger)]' : secsLeft < 60 ? 'text-amber-400' : 'text-white';
  const minsLeft = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;

  const overlay = (
    <div
      className="fixed inset-0 z-[9000] bg-[var(--color-bg)] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Standup mode"
    >
      {/* Header */}
      <div className="bg-[var(--color-primary)] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Standup</h1>
          {activeCol && (
            <span className="text-white/70 text-sm">
              {colIdx + 1} / {visibleColumns.length} — {activeCol.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-2">
            {TIMER_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => startTimer(m)}
                className={cn(
                  'text-xs px-2 py-1 rounded-lg transition-colors',
                  timerMins === m && timerRunning
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20',
                )}
              >
                {m}m
              </button>
            ))}
            {timerRunning && (
              <span className={cn('text-base font-mono font-bold tabular-nums ml-1', timerColor)}>
                {minsLeft}:{secs.toString().padStart(2, '0')}
              </span>
            )}
            {!timerRunning && timerMins && (
              <button
                onClick={() => startTimer(timerMins)}
                className="text-xs text-white/60 hover:text-white"
              >
                <Timer className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close standup mode"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Column tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-2 overflow-x-auto flex-shrink-0">
        {visibleColumns.map((col, i) => (
          <button
            key={col.id}
            onClick={() => setColIdx(i)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              i === colIdx
                ? 'text-white shadow-md'
                : 'text-[var(--color-text-muted)] bg-[var(--color-surface)] hover:bg-[var(--color-border)]',
            )}
            style={i === colIdx ? { backgroundColor: col.colour } : {}}
          >
            {col.name}
            <span className="ml-1.5 text-xs opacity-70">
              {(cardsByColumn[col.id] ?? []).length}
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeCards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--color-text-muted)] text-lg">No cards in this column</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeCards.map((card) => (
              <StandupCardTile
                key={card.id}
                card={card}
                onSpotlight={() => setSpotlightCard(card)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface)]">
        <button
          onClick={prev}
          disabled={colIdx === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] disabled:opacity-30 hover:not-disabled:bg-[var(--color-border)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">← → to navigate · Esc to close</span>
        <button
          onClick={next}
          disabled={colIdx >= visibleColumns.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] disabled:opacity-30 hover:not-disabled:bg-[var(--color-border)] transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(overlay, document.body)}
      {spotlightCard && createPortal(
        <SpotlightCard card={spotlightCard} onClose={() => setSpotlightCard(null)} />,
        document.body,
      )}
    </>
  );
}
