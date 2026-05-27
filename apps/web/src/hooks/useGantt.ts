import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBoardStore } from '@/stores/board.store';
import * as cardsApi from '@/api/cards.api';
import type { Card } from '@questboard/shared';

export interface GanttCard {
  card: Card;
  columnName: string;
  columnColour: string;
  rowIndex: number;
  hasBar: boolean;
  isMilestone: boolean;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function useGanttData() {
  const columns = useBoardStore((s) => s.columns);
  const cardsByColumn = useBoardStore((s) => s.cards);

  return useMemo(() => {
    const allCards: GanttCard[] = [];
    let minD: Date | null = null;
    let maxD: Date | null = null;

    const sortedCols = [...columns].sort((a, b) => a.order_index - b.order_index);
    let rowIndex = 0;

    for (const col of sortedCols) {
      const cards = (cardsByColumn[col.id] ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index);

      for (const card of cards) {
        const hasBar = !!card.start_date && !!card.end_date;
        const isMilestone =
          hasBar && card.start_date === card.end_date;

        if (hasBar) {
          const sd = parseDate(card.start_date!);
          const ed = parseDate(card.end_date!);
          if (!minD || sd < minD) minD = sd;
          if (!maxD || ed > maxD) maxD = ed;
        }

        allCards.push({
          card,
          columnName: col.name,
          columnColour: col.colour,
          rowIndex,
          hasBar,
          isMilestone,
        });
        rowIndex++;
      }
    }

    const today = new Date();
    const minDate = minD ? addDays(minD, -7) : addDays(today, -14);
    const maxDate = maxD ? addDays(maxD, 7) : addDays(today, 60);
    const totalDays = daysBetween(minDate, maxDate) + 1;

    return { ganttCards: allCards, minDate, maxDate, totalDays };
  }, [columns, cardsByColumn]);
}

export function useUpdateCardDates(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      startDate,
      endDate,
    }: {
      cardId: string;
      startDate: string;
      endDate: string;
    }) => cardsApi.updateCard(cardId, { start_date: startDate, end_date: endDate }),
    onMutate: ({ cardId, startDate, endDate }) => {
      useBoardStore.getState().updateCard(cardId, {
        start_date: startDate,
        end_date: endDate,
      });
    },
    onSuccess: (card) => {
      useBoardStore.getState().updateCard(card.id, card);
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['cards', boardId] });
      toast.error('Failed to update card dates');
    },
  });
}
