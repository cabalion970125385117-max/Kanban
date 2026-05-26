import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Flag, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { SubstepList } from './SubstepList';
import { TimeTracker } from './TimeTracker';
import { CommentThread } from './CommentThread';
import { AttachmentPanel } from './AttachmentPanel';
import { useUpdateCard, useArchiveCard } from '@/hooks/useCard';
import { useBoardStore } from '@/stores/board.store';
import type { Card, Priority } from '@questboard/shared';

interface CardDetailDrawerProps {
  card: Card | null;
  boardId: string;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

export function CardDetailDrawer({ card, boardId, onClose }: CardDetailDrawerProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  const [estimateHours, setEstimateHours] = useState<string>('');

  const updateCard = useUpdateCard(boardId);
  const archiveCard = useArchiveCard(boardId);
  const columns = useBoardStore((s) => s.columns);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? '');
      setEstimateHours(card.estimate_hours != null ? String(card.estimate_hours) : '');
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card) return null;

  const columnName = columns.find((c) => c.id === card.column_id)?.name ?? '—';

  const saveTitle = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.title) { setEditingTitle(false); return; }
    updateCard.mutate({ cardId: card.id, data: { title: trimmed } });
    setEditingTitle(false);
  };

  const saveDescription = () => {
    const val = description.trim() || null;
    if (val !== card.description) {
      updateCard.mutate({ cardId: card.id, data: { description: val } });
    }
    setEditingDesc(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--color-surface)] shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] flex-shrink-0">
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            {columnName}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon" variant="ghost"
              onClick={() => archiveCard.mutate(card.id, { onSuccess: onClose })}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
              title="Archive card"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Title */}
          <div>
            {editingTitle ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') { setTitle(card.title); setEditingTitle(false); }
                }}
                className="text-base font-semibold"
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                className="text-base font-semibold text-[var(--color-text)] cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 py-0.5"
              >
                {card.title}
              </h2>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mb-2">
              <Flag className="h-3.5 w-3.5" /> Priority
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => updateCard.mutate({ cardId: card.id, data: { priority: p } })}
                  className={`rounded-full transition-opacity ${
                    card.priority === p
                      ? 'ring-2 ring-offset-1 ring-[var(--color-accent)]'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <PriorityBadge priority={p} />
                </button>
              ))}
            </div>
          </div>

          {/* Dates + Estimate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5" /> Start
              </label>
              <input
                type="date"
                value={card.start_date ?? ''}
                onChange={(e) =>
                  updateCard.mutate({ cardId: card.id, data: { start_date: e.target.value || null } })
                }
                className="w-full text-sm border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5" /> Due
              </label>
              <input
                type="date"
                value={card.end_date ?? ''}
                onChange={(e) =>
                  updateCard.mutate({ cardId: card.id, data: { end_date: e.target.value || null } })
                }
                className="w-full text-sm border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Estimate */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5" /> Estimate (hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              onBlur={() => {
                const val = estimateHours.trim();
                const parsed = val ? parseFloat(val) : null;
                const current = card.estimate_hours ?? null;
                if (parsed !== current) {
                  updateCard.mutate({ cardId: card.id, data: { estimate_hours: parsed } });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEstimateHours(card.estimate_hours != null ? String(card.estimate_hours) : '');
              }}
              className="w-28 text-sm border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">
              Description
            </label>
            {editingDesc ? (
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setDescription(card.description ?? '');
                    setEditingDesc(false);
                  }
                }}
                rows={4}
                className="w-full text-sm border border-[var(--color-accent)] rounded px-3 py-2 focus:outline-none resize-none"
                placeholder="Add a description…"
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="min-h-[64px] text-sm text-[var(--color-text)] bg-gray-50 rounded px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                {card.description || (
                  <span className="text-[var(--color-text-muted)]">Add a description…</span>
                )}
              </div>
            )}
          </div>

          {/* ── Attachments ── */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <AttachmentPanel cardId={card.id} />
          </div>

          {/* ── Subtasks ── */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <SubstepList cardId={card.id} />
          </div>

          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-2 block">Labels</label>
              <div className="flex flex-wrap gap-1.5">
                {card.labels.map((label) => (
                  <span
                    key={label.id}
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: label.colour }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assignees */}
          {card.owners && card.owners.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <label className="text-xs font-medium text-[var(--color-text-muted)] mb-2 block">Assignees</label>
              <div className="flex flex-wrap gap-2">
                {card.owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center gap-1.5 bg-gray-100 rounded-full pl-0.5 pr-2.5 py-0.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                      <span className="text-[9px] text-white font-bold">
                        {owner.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs font-medium">{owner.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Time Tracking ── */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <TimeTracker
              cardId={card.id}
              estimateHours={estimateHours ? parseFloat(estimateHours) : null}
            />
          </div>

          {/* ── Comments ── */}
          <div className="border-t border-[var(--color-border)] pt-4 pb-4">
            <CommentThread cardId={card.id} />
          </div>

        </div>
      </div>
    </>
  );
}
