import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Board } from '@questboard/shared';

interface BoardHeaderProps {
  board: Board;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const navigate = useNavigate();

  return (
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
        <span className="text-lg">⚔️</span>
        <h1 className="text-base font-bold truncate">{board.name}</h1>
        {board.member_count != null && (
          <span className="text-xs text-white/60 ml-1">
            {board.member_count} {board.member_count === 1 ? 'member' : 'members'}
          </span>
        )}
      </div>
    </header>
  );
}
