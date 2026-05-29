import { useState } from 'react';
import { AlertTriangle, Archive, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Board } from '@questboard/shared';

interface BoardDeleteDialogProps {
  board: Board;
  cardCount: number;
  onClose: () => void;
  onArchive: () => void;
  onPermanentDelete: () => void;
  isPending: boolean;
}

export function BoardDeleteDialog({
  board,
  cardCount,
  onClose,
  onArchive,
  onPermanentDelete,
  isPending,
}: BoardDeleteDialogProps) {
  const [confirmed, setConfirmed] = useState('');
  const hasData = cardCount > 0;
  const canDelete = !hasData || confirmed.trim().toLowerCase() === board.name.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Remove Board</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                <span className="font-semibold text-[var(--color-text)]">{board.name}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasData ? (
          <>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">
              This board has{' '}
              <span className="font-semibold text-[var(--color-text)]">{cardCount} card{cardCount !== 1 ? 's' : ''}</span>{' '}
              with data. Choose how to remove it:
            </p>

            {/* Archive option */}
            <button
              onClick={onArchive}
              disabled={isPending}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg)] transition-colors mb-3 text-left"
            >
              <Archive className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">Archive board</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Hides the board from your list. All data is preserved and can be restored later.
                </p>
              </div>
            </button>

            {/* Permanent delete */}
            <div className="border border-red-200 rounded-xl p-3 bg-red-50/50">
              <div className="flex items-start gap-3 mb-3">
                <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Permanently delete</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Deletes all {cardCount} cards, comments, attachments, and board data. This cannot be undone.
                  </p>
                </div>
              </div>
              <p className="text-xs text-red-600 mb-2 font-medium">
                Type <span className="font-bold">{board.name}</span> to confirm:
              </p>
              <input
                value={confirmed}
                onChange={(e) => setConfirmed(e.target.value)}
                placeholder={board.name}
                className={cn(
                  'w-full text-sm border rounded-lg px-3 py-2 outline-none transition-colors bg-white',
                  canDelete && confirmed
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-red-200 focus:border-red-400',
                )}
              />
              <Button
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white"
                disabled={!canDelete || isPending}
                loading={isPending}
                onClick={onPermanentDelete}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete permanently
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">
              This board is empty. Deleting it is immediate and cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={onPermanentDelete}
                loading={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete board
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
