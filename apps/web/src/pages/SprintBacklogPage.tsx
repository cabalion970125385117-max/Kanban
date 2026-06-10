import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, Plus, Minus, Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useBoard } from '@/hooks/useBoard';
import { useActiveSprint, useSprintCards, useAddCardToSprint, useRemoveCardFromSprint } from '@/hooks/useSprints';
import { BoardHeader } from '@/components/board/BoardHeaderV2';
import { ActiveSprintBanner } from '@/components/board/ActiveSprintBanner';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { useBoardStore } from '@/stores/board.store';
import { cn } from '@/lib/utils';
import type { Card } from '@questboard/shared';

const PRIORITY_COLOURS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
};

// ── Mini card row ─────────────────────────────────────────────────────────────

function CardRow({
  card,
  columnName,
  columnColour,
  action,
  actionIcon,
  actionTitle,
  onOpen,
}: {
  card: Card;
  columnName?: string;
  columnColour?: string;
  action: () => void;
  actionIcon: React.ReactNode;
  actionTitle: string;
  onOpen: (card: Card) => void;
}) {
  return (
    <div className="group flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/30 transition-colors">
      {/* Priority dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: PRIORITY_COLOURS[card.priority] }}
        title={PRIORITY_LABEL[card.priority]}
      />

      {/* Title */}
      <button
        className="flex-1 text-left text-sm text-[var(--color-text)] truncate hover:text-[var(--color-accent)] transition-colors"
        onClick={() => onOpen(card)}
        title={card.title}
      >
        {card.title}
      </button>

      {/* Column badge */}
      {columnName && (
        <span
          className="text-xs text-white px-1.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
          style={{ backgroundColor: columnColour ?? '#64748b' }}
        >
          {columnName}
        </span>
      )}

      {/* Estimate */}
      {card.estimate_hours != null && (
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {card.estimate_hours}h
        </span>
      )}

      {/* Action button */}
      <button
        onClick={(e) => { e.stopPropagation(); action(); }}
        title={actionTitle}
        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
      >
        {actionIcon}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SprintBacklogPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [backlogSearch, setBacklogSearch] = useState('');
  const [sprintSearch, setSprintSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const bid = boardId ?? '';
  const { boardQuery, columnsQuery, isLoading } = useBoard(bid);
  const { data: activeSprint } = useActiveSprint(bid);
  // useSprintCards returns CardRow[] (full card objects already in sprint)
  const { data: sprintCardsFromApi = [] } = useSprintCards(activeSprint?.id);

  const addCard = useAddCardToSprint(bid, activeSprint?.id ?? '');
  const removeCard = useRemoveCardFromSprint(bid, activeSprint?.id ?? '');

  const storeCards = useBoardStore((s) => s.cards);
  const columns = columnsQuery.data ?? [];

  // Flatten all board cards (non-archived)
  const allCards: Card[] = useMemo(() => {
    return Object.values(storeCards).flat().filter((c) => !c.archived_at);
  }, [storeCards]);

  // Sprint card IDs (derived from full card objects returned by useSprintCards)
  const sprintCardIds = useMemo(
    () => new Set(sprintCardsFromApi.map((c) => c.id)),
    [sprintCardsFromApi],
  );

  // Split into backlog and sprint lists (use allCards so ordering / live updates work)
  const backlogCards = useMemo(
    () => allCards.filter((c) => !sprintCardIds.has(c.id)),
    [allCards, sprintCardIds],
  );
  const sprintCards = useMemo(
    () => allCards.filter((c) => sprintCardIds.has(c.id)),
    [allCards, sprintCardIds],
  );

  // Apply search
  const filteredBacklog = useMemo(() => {
    const q = backlogSearch.toLowerCase();
    return q ? backlogCards.filter((c) => c.title.toLowerCase().includes(q)) : backlogCards;
  }, [backlogCards, backlogSearch]);

  const filteredSprint = useMemo(() => {
    const q = sprintSearch.toLowerCase();
    return q ? sprintCards.filter((c) => c.title.toLowerCase().includes(q)) : sprintCards;
  }, [sprintCards, sprintSearch]);

  // Column lookup map
  const colMap = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns],
  );

  // Sprint stats
  const DONE_NAMES = /^(done|complete|completed|closed|resolved|shipped|live|released|finished|merged)$/i;
  const doneColIds = new Set(columns.filter((c) => DONE_NAMES.test(c.name)).map((c) => c.id));
  const doneCount = sprintCards.filter((c) => doneColIds.has(c.column_id)).length;
  const estimateTotal = sprintCards.reduce((sum, c) => sum + (c.estimate_hours ?? 0), 0);

  if (!boardId) { navigate('/boards'); return null; }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] animate-spin" />
      </div>
    );
  }

  const board = boardQuery.data;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      {board && <BoardHeader board={board} />}
      <ActiveSprintBanner boardId={boardId} />

      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/boards/${boardId}`)}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--color-text)]">Sprint Backlog</h2>
          </div>
        </div>
        {activeSprint && (
          <div className="text-sm text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-accent)]">{activeSprint.name}</span>
            {' · '}
            {format(parseISO(activeSprint.start_date), 'MMM d')} – {format(parseISO(activeSprint.end_date), 'MMM d')}
          </div>
        )}
      </div>

      {/* No active sprint state */}
      {!activeSprint ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Flag className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold text-[var(--color-text-muted)]">No active sprint</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
              Create and start a sprint from the board view.
            </p>
            <button
              onClick={() => navigate(`/boards/${boardId}`)}
              className="text-[var(--color-accent)] text-sm underline"
            >
              Back to board
            </button>
          </div>
        </div>
      ) : (
        /* Two-panel layout */
        <div className="flex-1 overflow-hidden flex gap-0">
          {/* Backlog panel */}
          <div className="flex-[4] flex flex-col border-r border-[var(--color-border)] overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--color-text)]">
                  Backlog
                  <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                    ({filteredBacklog.length})
                  </span>
                </h3>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <input
                  value={backlogSearch}
                  onChange={(e) => setBacklogSearch(e.target.value)}
                  placeholder="Search cards…"
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50"
                />
                {backlogSearch && (
                  <button onClick={() => setBacklogSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredBacklog.length === 0 ? (
                <div className="text-center py-10 text-sm text-[var(--color-text-muted)]">
                  {backlogSearch ? 'No cards match your search.' : 'All cards are in the sprint!'}
                </div>
              ) : (
                filteredBacklog.map((card) => {
                  const col = colMap.get(card.column_id);
                  return (
                    <CardRow
                      key={card.id}
                      card={card}
                      columnName={col?.name}
                      columnColour={col?.colour}
                      action={() => addCard.mutate(card.id)}
                      actionIcon={<Plus className="h-3.5 w-3.5" />}
                      actionTitle="Add to sprint"
                      onOpen={setSelectedCard}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Sprint panel */}
          <div className="flex-[6] flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-accent)]/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--color-accent)]">
                  {activeSprint.name}
                  <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                    ({filteredSprint.length} cards
                    {estimateTotal > 0 ? ` · ${estimateTotal}h est.` : ''})
                  </span>
                </h3>
                {/* Done progress */}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {doneCount}/{sprintCards.length} done
                </span>
              </div>

              {/* Progress bar */}
              {sprintCards.length > 0 && (
                <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${Math.round((doneCount / sprintCards.length) * 100)}%` }}
                  />
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <input
                  value={sprintSearch}
                  onChange={(e) => setSprintSearch(e.target.value)}
                  placeholder="Search sprint cards…"
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/50"
                />
                {sprintSearch && (
                  <button onClick={() => setSprintSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredSprint.length === 0 ? (
                <div className="text-center py-10 text-sm text-[var(--color-text-muted)]">
                  {sprintSearch
                    ? 'No cards match your search.'
                    : 'No cards in sprint yet. Add cards from the backlog.'}
                </div>
              ) : (
                filteredSprint.map((card) => {
                  const col = colMap.get(card.column_id);
                  const isDone = doneColIds.has(card.column_id);
                  return (
                    <div key={card.id} className={cn(isDone && 'opacity-60')}>
                      <CardRow
                        card={card}
                        columnName={col?.name}
                        columnColour={col?.colour}
                        action={() => removeCard.mutate(card.id)}
                        actionIcon={<Minus className="h-3.5 w-3.5" />}
                        actionTitle="Remove from sprint"
                        onOpen={setSelectedCard}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card detail drawer */}
      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId}
        onClose={() => setSelectedCard(null)}
        onOpenCard={setSelectedCard}
      />
    </div>
  );
}
