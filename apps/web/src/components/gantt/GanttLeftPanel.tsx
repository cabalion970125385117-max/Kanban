import { forwardRef } from 'react';
import type { GanttCard } from '@/hooks/useGantt';

const PRIORITY_COLOUR: Record<string, string> = {
  low: '#2EA64A',
  medium: '#5B4FCF',
  high: '#E07B2A',
  critical: '#D94040',
};

interface GanttLeftPanelProps {
  ganttCards: GanttCard[];
  rowHeight: number;
  headerHeight: number;
  onCardClick: (card: GanttCard['card']) => void;
}

export const GanttLeftPanel = forwardRef<HTMLDivElement, GanttLeftPanelProps>(
  function GanttLeftPanel({ ganttCards, rowHeight, headerHeight, onCardClick }, ref) {
    return (
      <div className="w-60 flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Header spacer — aligns with timeline date header */}
        <div
          className="flex-shrink-0 flex items-end px-3 pb-1 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ height: headerHeight }}
        >
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Tasks
          </span>
        </div>

        {/* Card rows — synced scroll via ref */}
        <div ref={ref} className="flex-1 overflow-y-hidden">
          <div style={{ height: ganttCards.length * rowHeight }}>
            {ganttCards.map((gc) => (
              <div
                key={gc.card.id}
                className="flex items-center gap-2 px-3 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
                style={{ height: rowHeight }}
                onClick={() => onCardClick(gc.card)}
                title={gc.card.title}
              >
                <div
                  className="w-1.5 h-5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_COLOUR[gc.card.priority] ?? '#5B4FCF' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate leading-tight">
                    {gc.card.title}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate leading-tight">
                    {gc.columnName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
