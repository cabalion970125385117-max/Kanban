import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { CardDetailDrawer } from '@/components/card/CardDetailDrawer';
import { AppLogo } from '@/components/shared/AppLogo';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { Card } from '@questboard/shared';

interface CardWithBoardContext extends Card {
  boardId: string;
  boardName: string;
  columnName: string;
}

async function fetchMyCards(userId: string): Promise<CardWithBoardContext[]> {
  const db = await getDB();
  const boards = await db.getAll('boards');
  const result: CardWithBoardContext[] = [];

  for (const board of boards) {
    if (board.archived_at) continue;
    const columns = await db.getAllFromIndex('columns', 'by-board', board.id);
    const colMap = new Map(columns.map((c) => [c.id, c.name]));

    const cardRows = await db.getAllFromIndex('cards', 'by-board', board.id);
    for (const row of cardRows) {
      if (row.archived_at) continue;
      if (!row.owner_ids.includes(userId)) continue;

      // Build minimal enriched card
      const owners = await Promise.all(
        row.owner_ids.map(async (oid) => {
          const u = await db.get('users', oid);
          if (!u) return null;
          const avatar = u.avatar_id ? await db.get('avatars', u.avatar_id) : undefined;
          return { id: u.id, name: u.name, avatar: avatar ? { thumb_url: avatar.thumb_url } : undefined };
        }),
      );

      result.push({
        id: row.id,
        board_id: row.board_id,
        column_id: row.column_id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        start_date: row.start_date,
        end_date: row.end_date,
        estimate_hours: row.estimate_hours,
        order_index: row.order_index,
        archived_at: row.archived_at,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        cover_colour: row.cover_colour ?? null,
        tags: row.card_tags ?? [],
        owners: owners.filter(Boolean) as Card['owners'],
        labels: [],
        substep_count: await db.countFromIndex('substeps', 'by-card', row.id),
        substep_done: (await db.getAllFromIndex('substeps', 'by-card', row.id)).filter((s) => s.is_complete).length,
        boardId: board.id,
        boardName: board.name,
        columnName: colMap.get(row.column_id) ?? '—',
      });
    }
  }

  return result;
}

function isOverdue(card: Card) {
  if (!card.end_date) return false;
  return new Date(card.end_date) < new Date(new Date().toDateString());
}

function isDueToday(card: Card) {
  if (!card.end_date) return false;
  return new Date(card.end_date).toDateString() === new Date().toDateString();
}

function isDueThisWeek(card: Card) {
  if (!card.end_date || isOverdue(card) || isDueToday(card)) return false;
  const end = new Date(card.end_date);
  const weekOut = new Date();
  weekOut.setDate(weekOut.getDate() + 7);
  return end <= weekOut;
}

interface GroupProps {
  title: string;
  icon: React.ReactNode;
  cards: CardWithBoardContext[];
  color: string;
  onOpenCard: (card: CardWithBoardContext) => void;
  defaultOpen?: boolean;
}

function MyWorkGroup({ title, icon, cards, color, onOpenCard, defaultOpen = true }: GroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (cards.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <span style={{ color }}>{icon}</span>
        <span className="font-semibold text-sm" style={{ color }}>{title}</span>
        <span className="text-xs text-[var(--color-text-muted)] ml-1">({cards.length})</span>
        <span className={cn('ml-auto text-[var(--color-text-muted)] transition-transform text-xs', !open && '-rotate-90')}>
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-1.5">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => onOpenCard(card)}
              className="w-full text-left bg-[var(--color-surface)] rounded-xl px-4 py-3 hover:border-[var(--color-accent)]/30 border border-transparent transition-all group/card"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{card.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
                      {card.boardName}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{card.columnName}</span>
                    {card.end_date && (
                      <span className={cn(
                        'text-[10px] flex items-center gap-0.5',
                        isOverdue(card) ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]',
                      )}>
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(card.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <PriorityBadge priority={card.priority} />
              </div>
              {card.substep_count != null && card.substep_count > 0 && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(((card.substep_done ?? 0) / card.substep_count) * 100)}%`,
                        backgroundColor: 'var(--color-accent)',
                      }}
                    />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyWorkPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [selectedCard, setSelectedCard] = useState<CardWithBoardContext | null>(null);

  const { data: myCards = [], isLoading } = useQuery({
    queryKey: ['my-work', user?.id],
    queryFn: () => fetchMyCards(user!.id),
    enabled: !!user?.id,
  });

  const overdue = myCards.filter(isOverdue);
  const dueToday = myCards.filter(isDueToday);
  const thisWeek = myCards.filter(isDueThisWeek);
  const later = myCards.filter((c) => !isOverdue(c) && !isDueToday(c) && !isDueThisWeek(c));

  const openCard = (card: CardWithBoardContext) => setSelectedCard(card);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md flex-shrink-0">
        <button
          onClick={() => navigate('/boards')}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Back to boards"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <AppLogo variant="nav" />
        <span className="text-white/60 text-sm">My Work</span>
      </header>

      <main id="main-content" className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => <div key={n} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : myCards.length === 0 ? (
          <div className="text-center py-24">
            <CheckCircle2 className="h-16 w-16 text-[var(--color-success)] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">You're all caught up!</h3>
            <p className="text-[var(--color-text-muted)]">No cards are assigned to you.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Inbox className="h-5 w-5 text-[var(--color-accent)]" />
              <h2 className="text-xl font-bold text-[var(--color-primary)]">My Work</h2>
              <span className="text-sm text-[var(--color-text-muted)]">
                {myCards.length} card{myCards.length !== 1 ? 's' : ''} assigned to you
              </span>
            </div>

            <MyWorkGroup
              title="Overdue"
              icon={<AlertCircle className="h-4 w-4" />}
              cards={overdue}
              color="var(--color-danger)"
              onOpenCard={openCard}
            />
            <MyWorkGroup
              title="Due Today"
              icon={<Clock className="h-4 w-4" />}
              cards={dueToday}
              color="var(--color-warning)"
              onOpenCard={openCard}
            />
            <MyWorkGroup
              title="Due This Week"
              icon={<Calendar className="h-4 w-4" />}
              cards={thisWeek}
              color="var(--color-info)"
              onOpenCard={openCard}
            />
            <MyWorkGroup
              title="Later / No Due Date"
              icon={<Inbox className="h-4 w-4" />}
              cards={later}
              color="var(--color-text-muted)"
              onOpenCard={openCard}
              defaultOpen={overdue.length === 0 && dueToday.length === 0 && thisWeek.length === 0}
            />
          </>
        )}
      </main>

      {selectedCard && (
        <CardDetailDrawer
          card={selectedCard}
          boardId={selectedCard.boardId}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
