import { useState, useRef, useEffect } from 'react';
import { X, Tag, Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoardTagsWithCount, useCreateBoardTag, useDeleteBoardTag } from '@/hooks/useBoard';

// ─── Colour helpers (must match TagsPanel) ────────────────────────────────────

const TAG_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  { bg: 'bg-purple-100', text: 'text-purple-700',  dot: 'bg-purple-400' },
  { bg: 'bg-green-100',  text: 'text-green-700',   dot: 'bg-green-400'  },
  { bg: 'bg-amber-100',  text: 'text-amber-800',   dot: 'bg-amber-400'  },
  { bg: 'bg-red-100',    text: 'text-red-700',     dot: 'bg-red-400'    },
  { bg: 'bg-teal-100',   text: 'text-teal-700',    dot: 'bg-teal-400'   },
  { bg: 'bg-pink-100',   text: 'text-pink-700',    dot: 'bg-pink-400'   },
  { bg: 'bg-indigo-100', text: 'text-indigo-700',  dot: 'bg-indigo-400' },
];

function tagPalette(tag: string) {
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TagRowProps {
  name: string;
  cardCount: number;
  defined: boolean;
  onDelete: () => void;
  deleting: boolean;
}

function TagRow({ name, cardCount, defined, onDelete, deleting }: TagRowProps) {
  const [confirming, setConfirming] = useState(false);
  const palette = tagPalette(name);

  const handleDelete = () => {
    if (cardCount > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    onDelete();
    setConfirming(false);
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
        confirming
          ? 'bg-red-50 border border-red-200'
          : 'hover:bg-[var(--color-bg)] border border-transparent',
      )}
    >
      {/* Tag chip */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', palette.dot)} />
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full inline-block',
            palette.bg,
            palette.text,
          )}
        >
          #{name}
        </span>
        {!defined && (
          <span className="text-[10px] text-[var(--color-text-muted)] italic">implicit</span>
        )}
      </div>

      {/* Right side: count + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {cardCount > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {cardCount} card{cardCount !== 1 ? 's' : ''}
          </span>
        )}

        {confirming ? (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs text-red-600 font-medium">Remove from {cardCount} card{cardCount !== 1 ? 's' : ''}?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs px-2 py-0.5 border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label={`Delete tag ${name}`}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface BoardTagsDialogProps {
  boardId: string;
  boardName: string;
  onClose: () => void;
}

export function BoardTagsDialog({ boardId, boardName, onClose }: BoardTagsDialogProps) {
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { data: tags = [], isLoading } = useBoardTagsWithCount(boardId);
  const createTag = useCreateBoardTag(boardId);
  const deleteTag = useDeleteBoardTag(boardId);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on overlay click
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '-');

  const handleCreate = () => {
    if (!cleaned) { setInputError('Tag name is required'); return; }
    if (cleaned.length > 40) { setInputError('Max 40 characters'); return; }
    if (tags.some((t) => t.name === cleaned)) { setInputError('Tag already exists'); return; }
    setInputError('');
    createTag.mutate(cleaned, { onSuccess: () => setInput('') });
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onClick={handleOverlay}
    >
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[var(--color-accent)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Manage Tags</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{boardName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Create new tag */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-2">
            Create new tag
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); if (inputError) setInputError(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                  if (e.key === 'Escape') { setInput(''); setInputError(''); }
                }}
                placeholder="tag-name (spaces become hyphens)"
                className={cn(
                  'w-full text-sm border rounded-lg px-3 py-2 outline-none bg-[var(--color-bg)] text-[var(--color-text)] transition-colors',
                  inputError
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-accent)]',
                )}
              />
              {inputError && (
                <p className="text-xs text-[var(--color-danger)] mt-1">{inputError}</p>
              )}
              {cleaned && !inputError && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Will be saved as <span className="font-mono">#{cleaned}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleCreate}
              disabled={createTag.isPending || !cleaned}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-9 skeleton rounded-lg" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-8 w-8 text-[var(--color-border)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-muted)]">No tags yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Create a tag above or add tags directly to cards.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <TagRow
                  key={tag.name}
                  name={tag.name}
                  cardCount={tag.cardCount}
                  defined={tag.defined}
                  onDelete={() => deleteTag.mutate(tag.name)}
                  deleting={deleteTag.isPending && deleteTag.variables === tag.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex-shrink-0">
          <p className="text-xs text-[var(--color-text-muted)]">
            <span className="font-medium">Implicit</span> tags exist on cards but were not
            explicitly created here. Deleting any tag removes it from all cards on this board.
          </p>
        </div>
      </div>
    </div>
  );
}
