import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { useBoard } from '@/hooks/useBoard';
import { useUpdateCard } from '@/hooks/useCard';
import { useBoardStore } from '@/stores/board.store';
import type { Card } from '@questboard/shared';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Week starts Monday: 0=Mon…6=Sun
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to 6 rows × 7
  while (cells.length < 42) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < 6; i++) rows.push(cells.slice(i * 7, i * 7 + 7));
  return rows;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

interface CalendarCardPillProps {
  card: Card;
  onClick: () => void;
}

function CalendarCardPill({ card, onClick }: CalendarCardPillProps) {
  const PRIORITY_COLOR: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
  };
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded font-medium text-white truncate leading-tight mb-0.5 hover:opacity-80 transition-opacity"
      style={{ backgroundColor: PRIORITY_COLOR[card.priority] ?? '#8b5cf6' }}
      title={card.title}
    >
      {card.title}
    </button>
  );
}

export function CalendarPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  const { boardQuery } = useBoard(boardId ?? '');
  const updateCard = useUpdateCard(boardId ?? '');
  const storeCards = useBoardStore((s) => s.cards);

  const allCards = useMemo(
    () => Object.values(storeCards).flat().filter((c) => !c.archived_at),
    [storeCards],
  );

  const unscheduled = allCards.filter((c) => !c.end_date);
  const scheduled = allCards.filter((c) => !!c.end_date);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const cardsOnDay = (date: Date) =>
    scheduled.filter((c) => isSameDay(new Date(c.end_date!), date));

  const handleDrop = (date: Date) => {
    if (!draggingCardId) return;
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    updateCard.mutate({ cardId: draggingCardId, data: { end_date: iso } });
    setDraggingCardId(null);
  };

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return allCards.find((c) => c.id === selectedCardId) ?? null;
  }, [selectedCardId, allCards]);

  if (!boardId) return null;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md flex-shrink-0">
        <button
          onClick={() => navigate(`/boards/${boardId}`)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Back to board"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-bold">{boardQuery.data?.name ?? 'Calendar'}</h1>
        <span className="text-white/60 text-sm">Calendar</span>
      </header>

      <main id="main-content" className="flex-1 overflow-hidden flex gap-0">
        {/* Main calendar */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] flex-shrink-0">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--color-text)]" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[var(--color-text)]">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Today
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-[var(--color-text)]" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--color-border)] flex-shrink-0">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 grid grid-rows-6" style={{ minHeight: 0 }}>
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7" style={{ minHeight: 0 }}>
                {row.map((date, colIdx) => {
                  const dayCards = date ? cardsOnDay(date) : [];
                  const isToday = date ? isSameDay(date, today) : false;
                  const isPast = date ? date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false;

                  return (
                    <div
                      key={colIdx}
                      onDragOver={date ? (e) => e.preventDefault() : undefined}
                      onDrop={date ? () => handleDrop(date) : undefined}
                      className={cn(
                        'border-r border-b border-[var(--color-border)] p-1 min-h-[90px] overflow-hidden transition-colors',
                        !date && 'bg-[var(--color-bg)]/50',
                        date && isPast && 'opacity-60',
                        isToday && 'bg-[var(--color-accent)]/5',
                        date && 'cursor-default',
                      )}
                    >
                      {date && (
                        <>
                          <div className={cn(
                            'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                            isToday
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'text-[var(--color-text-muted)]',
                          )}>
                            {date.getDate()}
                          </div>
                          {dayCards.slice(0, 3).map((c) => (
                            <CalendarCardPill
                              key={c.id}
                              card={c}
                              onClick={() => setSelectedCardId(c.id)}
                            />
                          ))}
                          {dayCards.length > 3 && (
                            <span className="text-[10px] text-[var(--color-text-muted)] pl-1">
                              +{dayCards.length - 3} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Unscheduled sidebar */}
        <div className="w-56 border-l border-[var(--color-border)] flex flex-col overflow-hidden bg-[var(--color-surface)] flex-shrink-0">
          <div className="px-3 py-2 border-b border-[var(--color-border)] flex-shrink-0">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Unscheduled ({unscheduled.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {unscheduled.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic p-1">All cards have due dates 🎉</p>
            ) : (
              unscheduled.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDraggingCardId(card.id)}
                  onDragEnd={() => setDraggingCardId(null)}
                  onClick={() => setSelectedCardId(card.id)}
                  className="bg-[var(--color-bg)] rounded-lg p-2 cursor-pointer hover:bg-[var(--color-border)]/40 transition-colors group"
                >
                  <p className="text-xs font-medium text-[var(--color-text)] line-clamp-2 mb-1">
                    {card.title}
                  </p>
                  <PriorityBadge priority={card.priority} />
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId}
        onClose={() => setSelectedCardId(null)}
      />
    </div>
  );
}
