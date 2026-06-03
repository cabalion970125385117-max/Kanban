import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings, Bug, Scroll, GanttChartSquare, Kanban, Zap, BarChart3, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PresenceBar } from '@/components/collaboration/PresenceBar';
import { NotificationDrawer } from '@/components/shared/NotificationDrawer';
import { VersionBadge } from '@/components/shared/VersionBadge';
import { BoardMembersDialog } from './BoardMembersDialog';
import { ProgressReportModal } from './ProgressReportModal';
import { useSettingsStore } from '@/stores/settings.store';
import { useUiStore } from '@/stores/ui.store';
import type { Board } from '@questboard/shared';

interface BoardHeaderProps {
  board: Board;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isGantt = location.pathname.endsWith('/gantt');
  const { openSettings } = useSettingsStore();
  const { openBugReport, openChangelog } = useUiStore();
  const [membersOpen, setMembersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
    <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/boards')}
        className="text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg">{'⚔️'}</span>
        <h1 className="text-base font-bold truncate">{board.name}</h1>
        {board.member_count != null && (
          <span className="text-xs text-white/60 ml-1">
            {board.member_count} {board.member_count === 1 ? 'member' : 'members'}
          </span>
        )}
        <VersionBadge className="text-white/40 hidden sm:inline" />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(isGantt ? `/boards/${board.id}` : `/boards/${board.id}/gantt`)
          }
          className="text-white hover:bg-white/10 text-xs gap-1"
          title={isGantt ? 'Board view' : 'Gantt view'}
        >
          {isGantt ? (
            <>
              <Kanban className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </>
          ) : (
            <>
              <GanttChartSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gantt</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/boards/${board.id}/analytics`)}
          className="text-white hover:bg-white/10"
          title="Analytics"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/boards/${board.id}/automation`)}
          className="text-white hover:bg-white/10"
          title="Automation"
        >
          <Zap className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMembersOpen(true)}
          className="text-white hover:bg-white/10"
          title="Members"
        >
          <Users className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setReportOpen(true)}
          className="text-white hover:bg-white/10"
          title="Progress report"
        >
          <TrendingUp className="h-4 w-4" />
        </Button>
        <PresenceBar />
        <Button
          variant="ghost"
          size="icon"
          onClick={openChangelog}
          className="text-white hover:bg-white/10"
          title="Changelog"
        >
          <Scroll className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={openBugReport}
          className="text-white hover:bg-white/10"
          title="Report a bug"
        >
          <Bug className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={openSettings}
          className="text-white hover:bg-white/10"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <NotificationDrawer />
      </div>
    </header>

    {membersOpen && (
      <BoardMembersDialog
        boardId={board.id}
        boardOwnerId={board.owner_id}
        onClose={() => setMembersOpen(false)}
      />
    )}

    {reportOpen && (
      <ProgressReportModal
        boardId={board.id}
        boardName={board.name}
        onClose={() => setReportOpen(false)}
      />
    )}
    </>
  );
}
