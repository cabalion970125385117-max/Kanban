import { create } from 'zustand';
import type { Board, Column, Card, Label } from '@questboard/shared';

interface BoardState {
  activeBoard: Board | null;
  columns: Column[];
  cards: Record<string, Card[]>; // keyed by column_id
  labels: Label[];

  setBoard: (board: Board) => void;
  setColumns: (columns: Column[]) => void;
  setAllCards: (cardsByColumn: Record<string, Card[]>) => void;
  setLabels: (labels: Label[]) => void;

  addColumn: (column: Column) => void;
  updateColumn: (columnId: string, patch: Partial<Column>) => void;
  removeColumn: (columnId: string) => void;

  addCard: (card: Card) => void;
  updateCard: (cardId: string, patch: Partial<Card>) => void;
  archiveCard: (cardId: string) => void;

  // Optimistic drag move — mutates cards in place
  moveCardOptimistic: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    toIndex: number,
  ) => void;

  clear: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  activeBoard: null,
  columns: [],
  cards: {},
  labels: [],

  setBoard: (board) => set({ activeBoard: board }),
  setColumns: (columns) => set({ columns }),
  setAllCards: (cardsByColumn) => set({ cards: cardsByColumn }),
  setLabels: (labels) => set({ labels }),

  addColumn: (column) =>
    set((s) => ({ columns: [...s.columns, column], cards: { ...s.cards, [column.id]: [] } })),

  updateColumn: (columnId, patch) =>
    set((s) => ({ columns: s.columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)) })),

  removeColumn: (columnId) =>
    set((s) => {
      const { [columnId]: _dropped, ...rest } = s.cards;
      return { columns: s.columns.filter((c) => c.id !== columnId), cards: rest };
    }),

  addCard: (card) =>
    set((s) => ({
      cards: {
        ...s.cards,
        [card.column_id]: [...(s.cards[card.column_id] ?? []), card],
      },
    })),

  updateCard: (cardId, patch) =>
    set((s) => {
      const newCards = { ...s.cards };
      for (const colId of Object.keys(newCards)) {
        const idx = newCards[colId].findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          newCards[colId] = [...newCards[colId]];
          newCards[colId][idx] = { ...newCards[colId][idx], ...patch };
          break;
        }
      }
      return { cards: newCards };
    }),

  archiveCard: (cardId) =>
    set((s) => {
      const newCards = { ...s.cards };
      for (const colId of Object.keys(newCards)) {
        const idx = newCards[colId].findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          newCards[colId] = newCards[colId].filter((c) => c.id !== cardId);
          break;
        }
      }
      return { cards: newCards };
    }),

  moveCardOptimistic: (cardId, fromColumnId, toColumnId, toIndex) =>
    set((s) => {
      const newCards = { ...s.cards };
      const fromList = [...(newCards[fromColumnId] ?? [])];
      const cardIdx = fromList.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return {};

      const [card] = fromList.splice(cardIdx, 1);
      newCards[fromColumnId] = fromList;

      const toList = [...(newCards[toColumnId] ?? [])];
      const clampedIndex = Math.min(toIndex, toList.length);
      toList.splice(clampedIndex, 0, { ...card, column_id: toColumnId });
      newCards[toColumnId] = toList;

      return { cards: newCards };
    }),

  clear: () => set({ activeBoard: null, columns: [], cards: {}, labels: [] }),
}));
