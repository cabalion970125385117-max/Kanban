import { useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, CalendarDays, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GanttLeftPanel } from '@/components/gantt/GanttLeftPanel';
import { GanttTimeline, HEADER_HEIGHT } from '@/components/gantt/GanttTimeline';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { useBoard } from '@/hooks/useBoard';
import { useGanttData, useUpdateCardDates, daysBetween } from '@/hooks/useGantt';
import { useGanttStore, type GanttZoom } from '@/stores/gantt.store';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { NotificationDrawer } from '@/components/shared/NotificationDrawer';
import type { Card } from '@questboard/shared';

const ROW_HEIGHT = 40;
const ZOOM_LEVELS: GanttZoom[] = [14, 28, 56];

export function GanttPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { boardQuery, isLoading } = useBoard(boardId ?? '');
  const { ganttCards, minDate, totalDays } = useGanttData();
  const { mutate: updateDates } = useUpdateCardDates(boardId ?? '');
  const { zoom, setZoom } = useGanttStore();

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);

  const handleRightScroll = useCallback(() => {
    if (syncingScroll.current || !rightRef.current || !leftRef.current) return;
    syncingScroll.current = true;
    leftRef.current.scrollTop = rightRef.current.scrollTop;
    syncingScroll.current = false;
  }, []);

  const handleUpdateDates = useCallback(
    (cardId: string, startDate: string, endDate: string) => {
      updateDates({ cardId, startDate, endDate });
    },
    [updateDates],
  );

  const scrollToToday = useCallback(() => {
    if (!rightRef.current) return;
    const today = new Date();
    const todayX = daysBetween(minDate, today) * zoom;
    const containerWidth = rightRef.current.clientWidth;
    rightRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 2);
  }, [minDate, zoom]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  };
  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  };

  if (!boardId) {
    navigate('/boards');
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{'📅'}</div>
          <p className="text-[var(--color-text-muted)]">Loading Gantt&hellip;</p>
        </div>
      </div>
    );
  }

  const board = boardQuery.data;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden print:h-auto">
      {/* ── Header ── */}
      <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md flex-shrink-0 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/boards/${boardId}`)}
          className="text-white hover:bg-white/10"
          title="Back to board"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{'📅'}</span>
          <h1 className="text-base font-bold truncate">
            {board?.name ?? 'Board'} — Gantt
          </h1>
          <VersionBadge className="text-white/40 hidden sm:inline" />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <NotificationDrawer />
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0 print:hidden">
        <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoom === ZOOM_LEVELS[0]}>
          <ZoomOut className="h-3.5 w-3.5 mr-1" />
          Zoom out
        </Button>
        <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
          <ZoomIn className="h-3.5 w-3.5 mr-1" />
          Zoom in
        </Button>
        <Button variant="ghost" size="sm" onClick={scrollToToday}>
          <CalendarDays className="h-3.5 w-3.5 mr-1" />
          Today
        </Button>

        <div className="flex-1" />

        <span className="text-xs text-[var(--color-text-muted)]">
          {ganttCards.length} task{ganttCards.length !== 1 ? 's' : ''}
          {' · '}
          {ganttCards.filter((g) => g.hasBar).length} with dates
        </span>

        <Button variant="ghost" size="sm" onClick={handleExportPDF}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Export PDF
        </Button>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        <GanttLeftPanel
          ref={leftRef}
          ganttCards={ganttCards}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
          onCardClick={setSelectedCard}
        />

        <GanttTimeline
          ref={rightRef}
          ganttCards={ganttCards}
          minDate={minDate}
          totalDays={totalDays}
          dayWidth={zoom}
          rowHeight={ROW_HEIGHT}
          onUpdateDates={handleUpdateDates}
          onCardClick={setSelectedCard}
          onScroll={handleRightScroll}
        />
      </div>

      {/* Card drawer for editing dates etc. */}
      <CardDetailDrawer
        card={selectedCard}
        boardId={boardId}
        onClose={() => setSelectedCard(null)}
        emitTypingStart={() => {}}
        emitTypingStop={() => {}}
      />
    </div>
  );
}
