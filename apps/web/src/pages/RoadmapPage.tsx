/**
 * RoadmapPage — Phase 11
 * Two-panel timeline view: sticky-left labels + horizontally-scrolling bar canvas.
 * Features: card bars (start→end), milestone diamonds, drag-move, drag-resize edges,
 * zoom M/Q/Y, group by Column/Priority/None, unscheduled section, today marker.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import { useBoardStore } from '@/stores/board.store';
import { useBoard } from '@/hooks/useBoard';
import { useUpdateCard } from '@/hooks/useCard';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { AppLogo } from '@/components/shared/AppLogo';
import { cn } from '@/lib/utils';
import type { Card } from '@questboard/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

type Zoom     = 'month' | 'quarter' | 'year';
type GroupBy  = 'column' | 'priority' | 'none';
type DragMode = 'move' | 'resize-s' | 'resize-e';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_W: Record<Zoom, number> = { month: 28, quarter: 10, year: 3 };
const ROW_H     = 40;
const HEADER_H  = 56;
const GROUP_H   = 30;
const LEFT_W    = 240;
const BAR_H     = 22;

const PRI_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Parse a YYYY-MM-DD string to a local noon Date (avoids UTC-midnight timezone drift). */
function parseD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ── View range ────────────────────────────────────────────────────────────────

function computeRange(cards: Card[], zoom: Zoom): { viewStart: Date; totalDays: number } {
  const minDays = zoom === 'year' ? 366 : zoom === 'quarter' ? 183 : 92;
  let earliest: Date | null = null;
  let latest: Date | null = null;
  for (const c of cards) {
    const s = parseD(c.start_date);
    const e = parseD(c.end_date);
    if (s && (!earliest || s < earliest)) earliest = s;
    if (e && (!latest   || e > latest))   latest   = e;
  }
  const today = new Date();
  const base  = earliest ? addDays(earliest, -14) : addDays(today, -7);
  const far   = latest   ? addDays(latest,   +14) : addDays(today, minDays);
  const totalDays = Math.max(minDays, diffDays(base, far));
  return { viewStart: base, totalDays };
}

// ── Grouping ──────────────────────────────────────────────────────────────────

interface Group { id: string; label: string; colour: string; cards: Card[] }

function groupCards(
  cards: Card[],
  by: GroupBy,
  cols: { id: string; name: string; colour: string }[],
): { groups: Group[]; unscheduled: Card[] } {
  const sched: Card[]   = [];
  const unsched: Card[] = [];
  for (const c of cards) {
    (c.start_date || c.end_date ? sched : unsched).push(c);
  }

  if (by === 'none') {
    return {
      groups: [{ id: 'all', label: 'All cards', colour: 'var(--color-accent)', cards: sched }],
      unscheduled: unsched,
    };
  }

  if (by === 'column') {
    const groups: Group[] = cols
      .map((col) => ({
        id: col.id,
        label: col.name,
        colour: col.colour,
        cards: sched.filter((c) => c.column_id === col.id),
      }))
      .filter((g) => g.cards.length > 0);
    return { groups, unscheduled: unsched };
  }

  // priority
  const groups: Group[] = (['critical','high','medium','low'] as const)
    .map((p) => ({
      id: p,
      label: p[0].toUpperCase() + p.slice(1),
      colour: PRI_COLOR[p],
      cards: sched.filter((c) => c.priority === p),
    }))
    .filter((g) => g.cards.length > 0);
  return { groups, unscheduled: unsched };
}

// ── Tick generators ───────────────────────────────────────────────────────────

function monthTicks(viewStart: Date, totalDays: number): { label: string; day: number }[] {
  const out: { label: string; day: number }[] = [];
  let d = new Date(viewStart.getFullYear(), viewStart.getMonth() + 1, 1); // first of next month
  while (diffDays(viewStart, d) < totalDays) {
    out.push({ label: `${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`, day: diffDays(viewStart, d) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

function weekTicks(viewStart: Date, totalDays: number): number[] {
  const out: number[] = [];
  // advance to next Monday
  const dow = viewStart.getDay();
  let d = addDays(viewStart, dow === 1 ? 7 : (8 - dow) % 7 || 7);
  while (diffDays(viewStart, d) < totalDays) {
    out.push(diffDays(viewStart, d));
    d = addDays(d, 7);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RoadmapPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate    = useNavigate();

  const [zoom,    setZoom]    = useState<Zoom>('month');
  const [groupBy, setGroupBy] = useState<GroupBy>('column');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [, tick] = useState(0); // force re-render during drag

  const { boardQuery } = useBoard(boardId ?? '');
  const updateCard     = useUpdateCard(boardId ?? '');

  const storeCards = useBoardStore((s) => s.cards);
  const columns    = useBoardStore((s) => s.columns);

  const allCards = useMemo(
    () => Object.values(storeCards).flat().filter((c) => !c.archived_at),
    [storeCards],
  );

  const selectedCard = useMemo(
    () => allCards.find((c) => c.id === selectedCardId) ?? null,
    [allCards, selectedCardId],
  );

  const dayW = DAY_W[zoom];
  const dayWRef = useRef(dayW);
  useEffect(() => { dayWRef.current = dayW; }, [dayW]);

  const { viewStart, totalDays } = useMemo(() => computeRange(allCards, zoom), [allCards, zoom]);
  const totalW = totalDays * dayW;

  const { groups, unscheduled } = useMemo(
    () => groupCards(allCards, groupBy, columns),
    [allCards, groupBy, columns],
  );

  const todayX = diffDays(viewStart, new Date()) * dayW;
  const mTicks = useMemo(() => monthTicks(viewStart, totalDays), [viewStart, totalDays]);
  const wTicks = useMemo(() => weekTicks(viewStart, totalDays),  [viewStart, totalDays]);

  // ── Coordinate helpers (closed over viewStart + dayW) ─────────────────────
  const dateToX = (d: Date) => diffDays(viewStart, d) * dayW;

  // ── Drag ──────────────────────────────────────────────────────────────────
  const dragRef = useRef<{
    cardId: string;
    mode: DragMode;
    startX: number;
    origStart: Date | null;
    origEnd: Date | null;
  } | null>(null);

  /** Live date overrides while dragging — keyed by cardId */
  const liveRef = useRef<Map<string, { start: string | null; end: string | null }>>(new Map());

  const startDrag = useCallback((e: React.MouseEvent, card: Card, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      cardId: card.id,
      mode,
      startX: e.clientX,
      origStart: parseD(card.start_date),
      origEnd:   parseD(card.end_date),
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dr = dragRef.current;
      if (!dr) return;
      const delta = Math.round((e.clientX - dr.startX) / dayWRef.current);

      let ns: string | null = dr.origStart ? toISO(dr.origStart) : null;
      let ne: string | null = dr.origEnd   ? toISO(dr.origEnd)   : null;

      if (dr.mode === 'move') {
        if (dr.origStart) ns = toISO(addDays(dr.origStart, delta));
        if (dr.origEnd)   ne = toISO(addDays(dr.origEnd,   delta));
      } else if (dr.mode === 'resize-s') {
        if (dr.origStart) ns = toISO(addDays(dr.origStart, delta));
        // ne stays as origEnd
      } else {
        // resize-e
        if (dr.origEnd) ne = toISO(addDays(dr.origEnd, delta));
        // ns stays as origStart
      }

      liveRef.current.set(dr.cardId, { start: ns, end: ne });
      tick((n) => n + 1);
    };

    const onUp = () => {
      const dr = dragRef.current;
      if (!dr) return;
      const live = liveRef.current.get(dr.cardId);
      dragRef.current = null;
      liveRef.current.clear();
      tick((n) => n + 1);

      if (!live) return;
      const origS = dr.origStart ? toISO(dr.origStart) : null;
      const origE = dr.origEnd   ? toISO(dr.origEnd)   : null;
      if (live.start !== origS || live.end !== origE) {
        updateCard.mutate({
          cardId: dr.cardId,
          data: { start_date: live.start, end_date: live.end },
        });
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [updateCard]);

  // ── Get effective dates for a card (live override or stored) ──────────────
  const getCardDates = (card: Card) => {
    const live = liveRef.current.get(card.id);
    return live
      ? { s: parseD(live.start), e: parseD(live.end) }
      : { s: parseD(card.start_date), e: parseD(card.end_date) };
  };

  // ── Card row renderer ─────────────────────────────────────────────────────
  const renderCardRow = (card: Card) => {
    const { s, e } = getCardDates(card);
    const color = PRI_COLOR[card.priority] ?? 'var(--color-accent)';
    const isDragging = dragRef.current?.cardId === card.id;

    // Compute bar geometry
    let barLeft = 0, barWidth = 0;
    let showBar = false, milestoneX: number | null = null;

    if (s && e) {
      barLeft  = dateToX(s);
      barWidth = Math.max(dayW, (diffDays(s, e) + 1) * dayW);
      showBar  = true;
    } else if (e && !s) {
      milestoneX = dateToX(e); // diamond milestone
    } else if (s && !e) {
      barLeft  = dateToX(s);
      barWidth = dayW * 2;
      showBar  = true;
    }

    return (
      <div key={card.id} className="flex flex-shrink-0" style={{ height: ROW_H }}>
        {/* Label — sticky left */}
        <div
          className="sticky left-0 z-10 flex items-center gap-2 px-3 bg-[var(--color-surface)] border-b border-r border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors flex-shrink-0"
          style={{ width: LEFT_W, minWidth: LEFT_W }}
          onClick={() => setSelectedCardId(card.id)}
          title={card.title}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-[var(--color-text)] truncate flex-1">{card.title}</span>
        </div>

        {/* Bar area */}
        <div
          className="relative border-b border-[var(--color-border)] flex-shrink-0"
          style={{ width: totalW }}
        >
          {/* Week gridlines */}
          {zoom !== 'year' && wTicks.map((d) => (
            <div
              key={d}
              className="absolute top-0 bottom-0 w-px bg-[var(--color-border)]/30"
              style={{ left: d * dayW }}
            />
          ))}

          {/* Today line */}
          {todayX > 0 && todayX < totalW && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-accent)]/40 pointer-events-none"
              style={{ left: todayX }}
            />
          )}

          {/* Bar */}
          {showBar && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 rounded-md flex items-center select-none group',
                isDragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab hover:brightness-110',
              )}
              style={{
                left:            barLeft,
                width:           barWidth,
                height:          BAR_H,
                backgroundColor: color,
                opacity:         0.88,
                transition:      isDragging ? 'none' : undefined,
              }}
              onMouseDown={(e) => startDrag(e, card, 'move')}
              onClick={() => setSelectedCardId(card.id)}
            >
              {/* Resize-start handle */}
              <div
                className="absolute left-0 top-0 h-full w-2 rounded-l-md cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity flex-shrink-0"
                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, card, 'resize-s'); }}
              />
              {/* Label */}
              {barWidth > 48 && (
                <span className="px-2 text-[10px] font-medium text-white truncate pointer-events-none flex-1">
                  {card.title}
                </span>
              )}
              {/* Resize-end handle */}
              <div
                className="absolute right-0 top-0 h-full w-2 rounded-r-md cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity flex-shrink-0"
                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, card, 'resize-e'); }}
              />
            </div>
          )}

          {/* Milestone diamond */}
          {milestoneX !== null && (
            <div
              className="absolute top-1/2 cursor-pointer hover:scale-125 transition-transform"
              style={{
                left:      milestoneX,
                width:     12,
                height:    12,
                backgroundColor: color,
                transform: 'translate(-50%, -50%) rotate(45deg)',
              }}
              title={card.title}
              onClick={() => setSelectedCardId(card.id)}
            />
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  const board = boardQuery.data;
  const scheduledCount = allCards.filter((c) => c.start_date || c.end_date).length;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">

      {/* ── App header ── */}
      <header className="bg-[var(--color-primary)] text-white px-4 py-2.5 flex items-center gap-3 shadow-md flex-shrink-0">
        <button
          onClick={() => navigate(`/boards/${boardId}`)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Back to board"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <AppLogo variant="nav" />
        {board && (
          <span className="text-white/70 text-sm truncate max-w-[200px]">{board.name}</span>
        )}
        <MapIcon className="h-3.5 w-3.5 text-white/50 flex-shrink-0" />
        <span className="text-white/60 text-sm flex-shrink-0">Roadmap</span>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {/* Zoom switcher */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
            {(['month', 'quarter', 'year'] as Zoom[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors font-medium',
                  zoom === z
                    ? 'bg-white text-[var(--color-primary)] shadow-sm'
                    : 'text-white/70 hover:text-white',
                )}
              >
                {z === 'month' ? 'Month' : z === 'quarter' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>

          {/* Group-by switcher */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
            {(['column', 'priority', 'none'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors font-medium',
                  groupBy === g
                    ? 'bg-white text-[var(--color-primary)] shadow-sm'
                    : 'text-white/70 hover:text-white',
                )}
              >
                {g === 'column' ? 'Column' : g === 'priority' ? 'Priority' : 'Flat'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Scrollable canvas ── */}
      <main id="main-content" className="flex-1 overflow-auto">

        {/* ── Timeline header — sticky top ── */}
        <div className="sticky top-0 z-30 flex flex-shrink-0" style={{ height: HEADER_H }}>
          {/* Corner cell */}
          <div
            className="sticky left-0 z-40 flex items-end px-3 pb-2 bg-[var(--color-primary)] border-b border-r border-white/10 flex-shrink-0"
            style={{ width: LEFT_W, minWidth: LEFT_W }}
          >
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
              {scheduledCount} card{scheduledCount !== 1 ? 's' : ''} on timeline
            </span>
          </div>

          {/* Month + week tick marks */}
          <div
            className="relative bg-[var(--color-primary)] border-b border-white/10 flex-shrink-0"
            style={{ width: totalW }}
          >
            {/* Month labels */}
            {mTicks.map((tick) => (
              <div
                key={tick.day}
                className="absolute top-3 text-[11px] font-semibold text-white/80 select-none pointer-events-none"
                style={{ left: tick.day * dayW + 4 }}
              >
                {tick.label}
              </div>
            ))}
            {/* Month divider lines */}
            {mTicks.map((tick) => (
              <div
                key={`line-${tick.day}`}
                className="absolute top-0 bottom-0 w-px bg-white/15"
                style={{ left: tick.day * dayW }}
              />
            ))}
            {/* Week ticks (bottom edge marks) */}
            {zoom !== 'year' && wTicks.map((d) => (
              <div
                key={d}
                className="absolute bottom-0 w-px bg-white/20"
                style={{ left: d * dayW, height: 8 }}
              />
            ))}
            {/* Today marker */}
            {todayX > 0 && todayX < totalW && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-accent)]"
                  style={{ left: todayX }}
                />
                <div
                  className="absolute bottom-1 text-[9px] font-bold text-[var(--color-accent)] select-none"
                  style={{ left: todayX + 3 }}
                >
                  TODAY
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Groups ── */}
        {groups.map((group) => (
          <div key={group.id}>
            {/* Group header — sticky below timeline */}
            <div
              className="sticky z-20 flex flex-shrink-0"
              style={{ top: HEADER_H, height: GROUP_H }}
            >
              <div
                className="sticky left-0 z-20 flex items-center gap-2 px-3 bg-[var(--color-bg)] border-b border-r border-[var(--color-border)] flex-shrink-0"
                style={{ width: LEFT_W, minWidth: LEFT_W }}
              >
                <div
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: group.colour }}
                />
                <span className="text-xs font-semibold text-[var(--color-text)] truncate flex-1">
                  {group.label}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
                  {group.cards.length}
                </span>
              </div>
              {/* Background strip with month dividers */}
              <div
                className="relative bg-[var(--color-bg)]/80 border-b border-[var(--color-border)] flex-shrink-0"
                style={{ width: totalW }}
              >
                {mTicks.map((tick) => (
                  <div
                    key={tick.day}
                    className="absolute top-0 bottom-0 w-px bg-[var(--color-border)]"
                    style={{ left: tick.day * dayW }}
                  />
                ))}
                {todayX > 0 && todayX < totalW && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-accent)]/40"
                    style={{ left: todayX }}
                  />
                )}
              </div>
            </div>

            {/* Card rows */}
            {group.cards.map((card) => renderCardRow(card))}
          </div>
        ))}

        {/* ── Unscheduled section ── */}
        {unscheduled.length > 0 && (
          <UnscheduledSection
            cards={unscheduled}
            totalW={totalW}
            todayX={todayX}
            mTicks={mTicks}
            onCardClick={(c) => setSelectedCardId(c.id)}
          />
        )}

        {/* Empty state */}
        {allCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <MapIcon className="h-16 w-16 text-[var(--color-text-muted)] opacity-30 mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">No cards yet</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Add cards with start/end dates to see them on the roadmap.
            </p>
          </div>
        )}

        <div style={{ height: 80 }} />
      </main>

      {/* Card detail drawer */}
      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId ?? ''}
        onClose={() => setSelectedCardId(null)}
        onOpenCard={(c) => setSelectedCardId(c.id)}
      />
    </div>
  );
}

// ── Unscheduled section ───────────────────────────────────────────────────────

interface UnscheduledProps {
  cards: Card[];
  totalW: number;
  todayX: number;
  mTicks: { label: string; day: number }[];
  onCardClick: (c: Card) => void;
}

function UnscheduledSection({ cards, totalW, todayX, mTicks, onCardClick }: UnscheduledProps) {
  const [open, setOpen] = useState(false); // collapsed by default

  return (
    <div>
      {/* Header */}
      <div
        className="sticky z-20 flex flex-shrink-0"
        style={{ top: HEADER_H, height: GROUP_H }}
      >
        <button
          className="sticky left-0 z-20 flex items-center gap-2 px-3 bg-[var(--color-bg)] border-b border-r border-[var(--color-border)] text-left flex-shrink-0"
          style={{ width: LEFT_W, minWidth: LEFT_W }}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="text-xs font-semibold text-[var(--color-text-muted)] truncate flex-1">
            No dates ({cards.length})
          </span>
          <span className={cn('text-[var(--color-text-muted)] text-xs transition-transform flex-shrink-0', !open && '-rotate-90')}>
            ▾
          </span>
        </button>
        <div
          className="relative bg-[var(--color-bg)]/50 border-b border-[var(--color-border)] flex-shrink-0"
          style={{ width: totalW }}
        >
          {mTicks.map((tick) => (
            <div key={tick.day} className="absolute top-0 bottom-0 w-px bg-[var(--color-border)]" style={{ left: tick.day * (totalW / (mTicks.length || 1)) }} />
          ))}
          {todayX > 0 && todayX < totalW && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-accent)]/30" style={{ left: todayX }} />
          )}
        </div>
      </div>

      {open && cards.map((card) => (
        <div key={card.id} className="flex flex-shrink-0" style={{ height: 36 }}>
          <div
            className="sticky left-0 z-10 flex items-center gap-2 px-3 bg-[var(--color-surface)] border-b border-r border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors flex-shrink-0"
            style={{ width: LEFT_W, minWidth: LEFT_W }}
            onClick={() => onCardClick(card)}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-text-muted)] truncate">{card.title}</span>
          </div>
          <div className="border-b border-[var(--color-border)] flex-shrink-0" style={{ width: totalW }} />
        </div>
      ))}
    </div>
  );
}
