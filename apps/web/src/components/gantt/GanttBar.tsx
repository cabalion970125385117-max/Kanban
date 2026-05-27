import { useState, useEffect, useRef, useCallback } from 'react';
import { parseDate, formatDate, addDays, daysBetween } from '@/hooks/useGantt';
import type { Card } from '@questboard/shared';

const PRIORITY_COLOUR: Record<string, string> = {
  low: '#2EA64A',
  medium: '#5B4FCF',
  high: '#E07B2A',
  critical: '#D94040',
};

interface GanttBarProps {
  card: Card;
  x: number;
  y: number;
  width: number;
  rowHeight: number;
  dayWidth: number;
  minDate: Date;
  onDragEnd: (cardId: string, startDate: string, endDate: string) => void;
  onClick: () => void;
}

type DragType = 'move' | 'resize-left' | 'resize-right';

interface DragState {
  type: DragType;
  startX: number;
  origStart: string;
  origEnd: string;
}

const BAR_HEIGHT = 24;
const HANDLE_WIDTH = 6;

export function GanttBar({
  card,
  x,
  y,
  width,
  rowHeight,
  dayWidth,
  minDate,
  onDragEnd,
  onClick,
}: GanttBarProps) {
  const [localStart, setLocalStart] = useState(card.start_date!);
  const [localEnd, setLocalEnd] = useState(card.end_date!);
  const dragging = useRef<DragState | null>(null);

  // Keep in sync with external updates
  useEffect(() => {
    if (!dragging.current) {
      setLocalStart(card.start_date!);
      setLocalEnd(card.end_date!);
    }
  }, [card.start_date, card.end_date]);

  const computedX = daysBetween(minDate, parseDate(localStart)) * dayWidth;
  const computedWidth =
    (daysBetween(parseDate(localStart), parseDate(localEnd)) + 1) * dayWidth;

  const barTop = (rowHeight - BAR_HEIGHT) / 2;
  const colour = PRIORITY_COLOUR[card.priority] ?? '#5B4FCF';

  const startDrag = useCallback(
    (type: DragType, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      dragging.current = {
        type,
        startX: e.clientX,
        origStart: localStart,
        origEnd: localEnd,
      };
    },
    [localStart, localEnd],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const { type, startX, origStart, origEnd } = dragging.current;
      const delta = Math.round((e.clientX - startX) / dayWidth);

      const sd = parseDate(origStart);
      const ed = parseDate(origEnd);

      if (type === 'move') {
        setLocalStart(formatDate(addDays(sd, delta)));
        setLocalEnd(formatDate(addDays(ed, delta)));
      } else if (type === 'resize-left') {
        const newStart = addDays(sd, delta);
        if (newStart <= ed) setLocalStart(formatDate(newStart));
      } else {
        const newEnd = addDays(ed, delta);
        if (newEnd >= sd) setLocalEnd(formatDate(newEnd));
      }
    }

    function onMouseUp() {
      if (!dragging.current) return;
      const { origStart, origEnd } = dragging.current;
      dragging.current = null;

      setLocalStart((s) => {
        setLocalEnd((e) => {
          if (s !== origStart || e !== origEnd) {
            onDragEnd(card.id, s, e);
          }
          return e;
        });
        return s;
      });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [card.id, dayWidth, onDragEnd]);

  return (
    <div
      className="absolute select-none"
      style={{ left: computedX, top: y + barTop, width: computedWidth, height: BAR_HEIGHT }}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 h-full z-10 cursor-ew-resize"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={(e) => startDrag('resize-left', e)}
      />

      {/* Bar body */}
      <div
        className="absolute inset-0 rounded flex items-center px-2 cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          left: HANDLE_WIDTH,
          right: HANDLE_WIDTH,
          backgroundColor: colour,
          opacity: 0.9,
        }}
        onMouseDown={(e) => startDrag('move', e)}
        onClick={onClick}
        title={card.title}
      >
        <span className="text-white text-xs font-medium truncate leading-none">
          {card.title}
        </span>
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 h-full z-10 cursor-ew-resize"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={(e) => startDrag('resize-right', e)}
      />
    </div>
  );
}
