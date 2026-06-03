import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { WidgetConfig } from '@/api/dashboard.api';
import { WIDGET_META } from '@/api/dashboard.api';
import type { DashboardData } from '@/api/dashboard.api';
import { KpiWidget } from './widgets/KpiWidget';
import { ByStatusWidget } from './widgets/ByStatusWidget';
import { ByPriorityWidget } from './widgets/ByPriorityWidget';
import { ByAssigneeWidget } from './widgets/ByAssigneeWidget';
import { ProgressWidget } from './widgets/ProgressWidget';
import { RecentActivityWidget } from './widgets/RecentActivityWidget';
import { WordSummaryWidget } from './widgets/WordSummaryWidget';
import { AvgCloseTimeWidget } from './widgets/AvgCloseTimeWidget';
import { UpcomingDueWidget } from './widgets/UpcomingDueWidget';
import { RecentCommentsWidget } from './widgets/RecentCommentsWidget';
import { TrendAnalysisWidget } from './widgets/TrendAnalysisWidget';
import { MindmapWidget } from './widgets/MindmapWidget';

// ─── Render widget content ────────────────────────────────────────────────────

function WidgetContent({ type, data }: { type: WidgetConfig['type']; data: DashboardData }) {
  switch (type) {
    case 'kpi-summary':     return <KpiWidget cards={data.cards} columns={data.columns} />;
    case 'by-status':       return <ByStatusWidget cards={data.cards} columns={data.columns} />;
    case 'by-priority':     return <ByPriorityWidget cards={data.cards} />;
    case 'by-assignee':     return <ByAssigneeWidget cards={data.cards} members={data.members} />;
    case 'progress':        return <ProgressWidget cards={data.cards} columns={data.columns} />;
    case 'recent-activity': return <RecentActivityWidget cards={data.cards} columns={data.columns} />;
    case 'word-summary':    return <WordSummaryWidget cards={data.cards} columns={data.columns} members={data.members} boardName={data.board.name} />;
    case 'avg-close-time':  return <AvgCloseTimeWidget cards={data.cards} columns={data.columns} members={data.members} />;
    case 'upcoming-due':    return <UpcomingDueWidget cards={data.cards} columns={data.columns} />;
    case 'recent-comments': return <RecentCommentsWidget comments={data.recentComments} />;
    case 'trend-analysis':  return <TrendAnalysisWidget cards={data.cards} columns={data.columns} />;
    case 'mindmap':         return <MindmapWidget cards={data.cards} />;
    default: return null;
  }
}

// ─── Single sortable widget tile ──────────────────────────────────────────────

interface TileProps {
  widget: WidgetConfig;
  data: DashboardData;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  isDragging?: boolean;
}

function WidgetTile({ widget, data, onRemove, readOnly, isDragging }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({ id: widget.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] flex flex-col overflow-hidden ${isDragging ? 'shadow-2xl ring-2 ring-[var(--color-accent)]' : ''}`}
    >
      {/* Tile header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {!readOnly && (
            <button
              {...listeners}
              {...attributes}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-grab active:cursor-grabbing flex-shrink-0"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
            {WIDGET_META[widget.type].label}
          </h3>
        </div>
        {!readOnly && onRemove && (
          <button
            onClick={() => onRemove(widget.id)}
            aria-label={`Remove ${WIDGET_META[widget.type].label} widget`}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors flex-shrink-0 ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tile body — canvas-heavy widgets need extra height */}
      <div className={`flex-1 p-4 overflow-hidden ${
        widget.type === 'mindmap' ? 'min-h-[300px]' :
        widget.type === 'trend-analysis' ? 'min-h-[240px]' : 'min-h-[180px]'
      }`}>
        <WidgetContent type={widget.type} data={data} />
      </div>
    </div>
  );
}

// ─── Drag overlay tile (no drag handle / remove button) ──────────────────────

function OverlayTile({ widget, data }: { widget: WidgetConfig; data: DashboardData }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl border-2 border-[var(--color-accent)] flex flex-col overflow-hidden opacity-90">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <GripVertical className="h-4 w-4 text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          {WIDGET_META[widget.type].label}
        </h3>
      </div>
      <div className="flex-1 p-4 min-h-[180px] overflow-hidden">
        <WidgetContent type={widget.type} data={data} />
      </div>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface WidgetGridProps {
  widgets: WidgetConfig[];
  data: DashboardData;
  onReorder: (widgets: WidgetConfig[]) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

export function WidgetGrid({ widgets, data, onReorder, onRemove, readOnly }: WidgetGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeWidget = widgets.find((w) => w.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      onReorder(arrayMove(widgets, oldIndex, newIndex));
    }
  };

  if (readOnly) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((w) => (
          <WidgetTile key={w.id} widget={w} data={data} readOnly />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((w) => (
            <WidgetTile
              key={w.id}
              widget={w}
              data={data}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeWidget ? (
          <OverlayTile widget={activeWidget} data={data} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
