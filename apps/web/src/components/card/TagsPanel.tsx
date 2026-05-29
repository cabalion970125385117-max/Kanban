import { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoardTags } from '@/hooks/useBoard';
import { useUpdateCard } from '@/hooks/useCard';

interface TagsPanelProps {
  cardId: string;
  boardId: string;
  tags: string[];
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-800',
  'bg-red-100 text-red-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
];

function tagColor(tag: string): string {
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagsPanel({ cardId, boardId, tags }: TagsPanelProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: boardTags = [] } = useBoardTags(boardId);
  const updateCard = useUpdateCard(boardId);

  const suggestions = boardTags.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t),
  );

  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleaned || tags.includes(cleaned)) { setInput(''); return; }
    updateCard.mutate({ cardId, data: { tags: [...tags, cleaned] } });
    setInput('');
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    updateCard.mutate({ cardId, data: { tags: tags.filter((t) => t !== tag) } });
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-tags-panel]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div data-tags-panel="">
      <label className="text-xs font-medium text-[var(--color-text-muted)] flex items-center gap-1 mb-2">
        <Tag className="h-3.5 w-3.5" /> Tags
      </label>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
              tagColor(tag),
            )}
          >
            #{tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:opacity-70 transition-opacity ml-0.5"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        {/* Add input */}
        <div className="relative">
          {open ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(input); }
                  if (e.key === 'Escape') { setOpen(false); setInput(''); }
                  if (e.key === ',' ) { e.preventDefault(); addTag(input); }
                }}
                placeholder="add tag…"
                className="text-xs border border-[var(--color-accent)] rounded-full px-2 py-0.5 outline-none w-24 bg-[var(--color-bg)]"
              />
              <button
                onClick={() => addTag(input)}
                className="text-[var(--color-accent)] hover:opacity-70"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              <Plus className="h-3 w-3" /> Add tag
            </button>
          )}

          {/* Autocomplete suggestions */}
          {open && (input || suggestions.length > 0) && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg min-w-[140px] max-h-32 overflow-y-auto">
              {suggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg)] flex items-center gap-1.5"
                >
                  <span className={cn('h-2 w-2 rounded-full', tagColor(s).split(' ')[0].replace('bg-', 'bg-').replace('-100', '-400'))} />
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
