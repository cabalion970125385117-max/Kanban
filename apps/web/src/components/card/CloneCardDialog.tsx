/**
 * CloneCardDialog — duplicate a card with selectable field copying.
 */
import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCloneCard } from '@/hooks/useCard';
import type { Card } from '@questboard/shared';

interface CloneCardDialogProps {
  card: Card;
  boardId: string;
  onClose: () => void;
  onCloned: (newCard: Card) => void;
}

interface CloneOptions {
  substeps: boolean;
  assignees: boolean;
  labels: boolean;
  tags: boolean;
}

export function CloneCardDialog({ card, boardId, onClose, onCloned }: CloneCardDialogProps) {
  const [options, setOptions] = useState<CloneOptions>({
    substeps: true,
    assignees: true,
    labels: true,
    tags: true,
  });

  const cloneCard = useCloneCard(boardId);

  const toggle = (key: keyof CloneOptions) =>
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleClone = () => {
    cloneCard.mutate(
      { sourceCardId: card.id, options },
      {
        onSuccess: (newCard) => {
          onCloned(newCard);
        },
      },
    );
  };

  const OPTS: { key: keyof CloneOptions; label: string; count?: number }[] = [
    { key: 'substeps', label: 'Subtasks', count: card.substep_count ?? 0 },
    { key: 'assignees', label: 'Assignees', count: card.owners?.length ?? 0 },
    { key: 'labels', label: 'Labels', count: card.labels?.length ?? 0 },
    { key: 'tags', label: 'Tags', count: card.tags?.length ?? 0 },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="font-semibold text-[var(--color-text)]">Duplicate Card</span>
            </div>
            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Source preview */}
          <div className="px-5 py-3 bg-[var(--color-bg)] mx-5 mt-4 rounded-lg">
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Duplicating</p>
            <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2">{card.title}</p>
          </div>

          {/* Options */}
          <div className="px-5 py-4">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
              Include with copy
            </p>
            <div className="space-y-2">
              {OPTS.map(({ key, label, count }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={() => toggle(key)}
                    className="w-4 h-4 accent-[var(--color-accent)] rounded"
                  />
                  <span className="text-sm text-[var(--color-text)]">{label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="ml-auto text-xs text-[var(--color-text-muted)]">{count}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 pb-5">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              loading={cloneCard.isPending}
              className="flex-1"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Duplicate
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
