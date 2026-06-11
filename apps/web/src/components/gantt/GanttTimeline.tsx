import { forwardRef, useMemo } from 'react';
import { GanttBar } from './GanttBar';
import { MilestoneDiamond } from './MilestoneDiamond';
import { addDays, daysBetween, parseDate } from '@/hooks/useGantt';
import type { GanttCard } from '@/hooks/useGantt';
import type { Card } from '@questboard/shared';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const PRIORITY_COLOUR: Record<string, string> = {
  low: '#2EA64A',
  medium: '#5B4FCF',
  high: '#E07B2A',
  critical: '#D94040',
};

const HEADER_MONTH_H = 24;
const HEADER_DAY_H = 36;
export const HEADER_HEIGHT = HEADER_MONTH_H + HEADER_DAY_H;

interface MonthSpan {
  label: string;
  x: number;
  width: number;
}

interface DayCell {
  label: string;
  x: number;
  isToday: boolean;
  isWeekend: boolean;
}

interface GanttTimelineProps {
  ganttCards: GanttCard[];
  minDate: Date;
  totalDays: number;
  dayWidth: number;
  rowHeight: number;
  onUpdateDates: (cardId: string, startDate: string, endDate: string) => void;
  onCardClick: (card: Card) => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}

export const GanttTimeline = forwardRef<HTMLDivElement, GanttTimelineProps>(
  function GanttTimeline(
    { ganttCards, minDate, totalDays, dayWidth, rowHeight, onUpdateDates, onCardClick, onScroll },
    ref,
  ) {
    const totalWidth = totalDays * dayWidth;
    const totalBodyHeight = ganttCards.length * rowHeight;

    const today = new Date();
    const todayX = daysBetween(minDate, today) * dayWidth;
    const showToday = todayX >= 0 && todayX <= totalWidth;

    const { months, days } = useMemo(() => {
      const monthSpans: MonthSpan[] = [];
      const dayCells: DayCell[] = [];

      let curMonth: { year: number; month: number; startDay: number } | null = null;

      for (let i = 0; i < totalDays; i++) {
        const d = addDays(minDate, i);
        const y = d.getFullYear();
        const m = d.getMonth();
        const dow = d.getDay(); // 0=Sun 6=Sat

        if (!curMonth || curMonth.year !== y || curMonth.month !== m) {
          if (curMonth) {
            monthSpans.push({
              label: `${MONTH_NAMES[curMonth.month]} ${curMonth.year}`,
              x: curMonth.startDay * dayWidth,
              width: (i - curMonth.startDay) * dayWidth,
            });
          }
          curMonth = { year: y, month: m, startDay: i };
        }

        const isToday =
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();

        dayCells.push({
          label: String(d.getDate()),
          x: i * dayWidth,
          isToday,
          isWeekend: dow === 0 || dow === 6,
        });
      }

      if (curMonth) {
        monthSpans.push({
          label: `${MONTH_NAMES[curMonth.month]} ${curMonth.year}`,
          x: curMonth.startDay * dayWidth,
          width: (totalDays - curMonth.startDay) * dayWidth,
        });
      }

      return { months: monthSpans, days: dayCells };
    }, [minDate, totalDays, dayWidth]);

    return (
      <div ref={ref} className="flex-1 overflow-auto" onScroll={onScroll}>
        <div style={{ minWidth: totalWidth, position: 'relative' }}>
          {/* ── Sticky date header ── */}
          <div
            className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
            style={{ height: HEADER_HEIGHT }}
          >
            {/* Month row */}
            <div
              className="relative border-b border-[var(--color-border)]"
              style={{ height: HEADER_MONTH_H }}
            >
              {months.map((m) => (
                <div
                  key={`${m.label}-${m.x}`}
                  className="absolute top-0 flex items-center px-2 text-[11px] font-semibold text-[var(--color-text-muted)]"
                  style={{ left: m.x, width: m.width, height: HEADER_MONTH_H }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Day row */}
            <div className="relative" style={{ height: HEADER_DAY_H }}>
              {days.map((d) => (
                <div
                  key={d.x}
                  className="absolute top-0 flex items-center justify-center border-r border-[var(--color-border)]"
                  style={{
                    left: d.x,
                    width: dayWidth,
                    height: HEADER_DAY_H,
                    backgroundColor: d.isToday
                      ? 'var(--color-accent)'
                      : d.isWeekend
                        ? 'var(--color-bg)'
                        : undefined,
                    color: d.isToday
                      ? 'white'
                      : d.isWeekend
                        ? 'var(--color-text-muted)'
                        : 'var(--color-text)',
                  }}
                >
                  {dayWidth >= 20 && (
                    <span className="text-[10px] font-medium">{d.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bar area ── */}
          <div className="relative" style={{ height: totalBodyHeight }}>
            {/* SVG layer: grid lines + today marker */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalWidth}
              height={totalBodyHeight}
            >
              {/* Weekend columns */}
              {days
                .filter((d) => d.isWeekend)
                .map((d) => (
                  <rect
                    key={d.x}
                    x={d.x}
                    y={0}
                    width={dayWidth}
                    height={totalBodyHeight}
                    fill="var(--color-bg)"
                    opacity={0.5}
                  />
                ))}

              {/* Vertical day gridlines */}
              {days.map((d) => (
                <line
                  key={`grid-${d.x}`}
                  x1={d.x}
                  y1={0}
                  x2={d.x}
                  y2={totalBodyHeight}
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                />
              ))}

              {/* Horizontal row lines */}
              {ganttCards.map((_, i) => (
                <line
                  key={`row-${i}`}
                  x1={0}
                  y1={(i + 1) * rowHeight}
                  x2={totalWidth}
                  y2={(i + 1) * rowHeight}
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                />
              ))}

              {/* Today vertical marker */}
              {showToday && (
                <line
                  x1={todayX}
                  y1={0}
                  x2={todayX}
                  y2={totalBodyHeight}
                  stroke="var(--color-danger)"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              )}

              {/* Milestone diamonds rendered in SVG */}
              {ganttCards
                .filter((gc) => gc.isMilestone && gc.hasBar)
                .map((gc) => {
                  const cx =
                    daysBetween(minDate, parseDate(gc.card.start_date!)) * dayWidth +
                    dayWidth / 2;
                  const cy = gc.rowIndex * rowHeight + rowHeight / 2;
                  return (
                    <MilestoneDiamond
                      key={gc.card.id}
                      cx={cx}
                      cy={cy}
                      colour={PRIORITY_COLOUR[gc.card.priority] ?? '#E07B2A'}
                      label={gc.card.title}
                      onClick={() => onCardClick(gc.card)}
                    />
                  );
                })}
            </svg>

            {/* Bar divs (non-milestone cards with dates) */}
            {ganttCards
              .filter((gc) => gc.hasBar && !gc.isMilestone)
              .map((gc) => {
                const x =
                  daysBetween(minDate, parseDate(gc.card.start_date!)) * dayWidth;
                const w =
                  (daysBetween(parseDate(gc.card.start_date!), parseDate(gc.card.end_date!)) + 1) *
                  dayWidth;
                return (
                  <GanttBar
                    key={gc.card.id}
                    card={gc.card}
                    x={x}
                    y={gc.rowIndex * rowHeight}
                    width={w}
                    rowHeight={rowHeight}
                    dayWidth={dayWidth}
                    minDate={minDate}
                    onDragEnd={onUpdateDates}
                    onClick={() => onCardClick(gc.card)}
                  />
                );
              })}
          </div>
        </div>
      </div>
    );
  },
);
