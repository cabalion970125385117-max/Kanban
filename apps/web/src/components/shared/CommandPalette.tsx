/**
 * CommandPalette — Ctrl+K / Cmd+K global search.
 * Searches cards, boards, and comments in parallel from IndexedDB.
 * Navigates to board or opens card drawer on selection.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, LayoutDashboard, CreditCard, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getDB } from '@/lib/db';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import type { Priority } from '@questboard/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResultType = 'board' | 'card' | 'comment';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle?: string;
  boardId?: string;
  cardId?: string;
  priority?: Priority;
}

// ── IDB search ────────────────────────────────────────────────────────────────

async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  const db = await getDB();
  const [allCards, allBoards, allComments] = await Promise.all([
    db.getAll('cards'),
    db.getAll('boards'),
    db.getAll('comments'),
  ]);

  const boardMap = new Map(allBoards.map((b) => [b.id, b]));

  const boardResults: SearchResult[] = allBoards
    .filter((b) => !b.archived_at && b.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((b) => ({
      type: 'board',
      id: b.id,
      title: b.name,
      subtitle: 'Board',
    }));

  const cardResults: SearchResult[] = allCards
    .filter(
      (c) =>
        !c.archived_at &&
        (c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)),
    )
    .slice(0, 10)
    .map((c) => ({
      type: 'card',
      id: c.id,
      title: c.title,
      subtitle: boardMap.get(c.board_id)?.name ?? 'Unknown board',
      boardId: c.board_id,
      priority: c.priority,
    }));

  const commentResults: SearchResult[] = allComments
    .filter((c) => c.body.toLowerCase().includes(q))
    .slice(0, 5)
    .map((c) => {
      const card = allCards.find((card) => card.id === c.card_id);
      return {
        type: 'comment' as const,
        id: c.id,
        title: c.body.length > 80 ? c.body.slice(0, 80) + '…' : c.body,
        subtitle: card?.title ?? 'Unknown card',
        boardId: card?.board_id,
        cardId: c.card_id,
      };
    });

  return [...boardResults, ...cardResults, ...commentResults];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ── Global Ctrl+K / Cmd+K ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Search on query change (debounced 150ms) ─────────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchAll(query);
        setResults(res);
        setActiveIndex(0);
      } finally {
        setSearching(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Focus input when opened ───────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  const selectResult = useCallback(
    (r: SearchResult) => {
      close();
      if (r.type === 'board') {
        navigate(`/boards/${r.id}`);
      } else if (r.type === 'card') {
        navigate(`/boards/${r.boardId}`, { state: { openCardId: r.id } });
      } else if (r.type === 'comment') {
        navigate(`/boards/${r.boardId}`, { state: { openCardId: r.cardId } });
      }
    },
    [close, navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[activeIndex]) selectResult(results[activeIndex]);
    }
  };

  if (!open) return null;

  // ── Group results by type for display ────────────────────────────────────
  const groups: Record<ResultType, SearchResult[]> = {
    board: [],
    card: [],
    comment: [],
  };
  for (const r of results) groups[r.type].push(r);

  const typeIcon = (t: ResultType) => {
    if (t === 'board') return <LayoutDashboard className="h-3.5 w-3.5 flex-shrink-0" />;
    if (t === 'card') return <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />;
    return <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />;
  };

  const typeLabel = (t: ResultType) =>
    t === 'board' ? 'Boards' : t === 'card' ? 'Cards' : 'Comments';

  let flatIdx = 0;
  const renderGroups = (['board', 'card', 'comment'] as ResultType[])
    .filter((t) => groups[t].length > 0)
    .map((type) => {
      const items = groups[type];
      return (
        <div key={type}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            {typeLabel(type)}
          </div>
          {items.map((r) => {
            const idx = flatIdx++;
            const isActive = idx === activeIndex;
            return (
              <button
                key={r.id}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => selectResult(r)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-text)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                )}
              >
                <span
                  className={cn(
                    'flex-shrink-0 text-[var(--color-text-muted)]',
                    isActive && 'text-[var(--color-accent)]',
                  )}
                >
                  {typeIcon(type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{r.title}</p>
                  {r.subtitle && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {r.subtitle}
                    </p>
                  )}
                </div>
                {r.priority && <PriorityBadge priority={r.priority} />}
                {isActive && (
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      );
    });

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/40 flex items-start justify-center pt-[18vh]"
      onClick={close}
    >
      <div
        className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-full max-w-lg max-h-[60vh] flex flex-col overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cards, boards, comments…"
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none"
            aria-label="Search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-autocomplete="list"
          />
          <kbd className="text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5 flex-shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto" role="listbox">
          {searching && (
            <p className="px-3 py-5 text-xs text-[var(--color-text-muted)] text-center">
              Searching…
            </p>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-5 text-xs text-[var(--color-text-muted)] text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {!searching && results.length > 0 && renderGroups}
          {!query.trim() && (
            <div className="px-3 py-7 text-center space-y-1">
              <p className="text-xs text-[var(--color-text-muted)]">
                Type to search cards, boards, and comments
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                ↑↓ navigate · Enter select · Esc close
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
