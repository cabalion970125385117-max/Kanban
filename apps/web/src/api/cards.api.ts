/**
 * cards.api.ts — local-first implementation backed by IndexedDB.
 */
import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { Card, Label } from '@questboard/shared';
import type { CreateCardInput, UpdateCardInput, MoveCardInput, ListCardsQuery } from '@questboard/shared';
import type { CardRow } from '@/lib/db';

export interface CardsResponse {
  cards: Card[];
  total: number;
  page: number;
  limit: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function currentUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function makeError(message: string, status = 400): Error {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

async function enrichCard(row: CardRow): Promise<Card> {
  const db = await getDB();

  const owners = await Promise.all(
    row.owner_ids.map(async (oid) => {
      const u = await db.get('users', oid);
      if (!u) return null;
      const avatar = u.avatar_id ? await db.get('avatars', u.avatar_id) : undefined;
      return { id: u.id, name: u.name, avatar: avatar ? { thumb_url: avatar.thumb_url } : undefined };
    }),
  );

  const labels = (
    await Promise.all(
      row.label_ids.map((lid) => db.get('labels', lid)),
    )
  ).filter(Boolean) as Label[];

  return {
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
    owners: owners.filter(Boolean) as Card['owners'],
    labels,
    substep_count: await db.countFromIndex('substeps', 'by-card', row.id),
    substep_done: (await db.getAllFromIndex('substeps', 'by-card', row.id))
      .filter((s) => s.is_complete).length,
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

export async function getCards(
  boardId: string,
  query?: Partial<ListCardsQuery>,
): Promise<CardsResponse> {
  const db = await getDB();
  let rows = await db.getAllFromIndex('cards', 'by-board', boardId);

  // Filter out archived
  rows = rows.filter((c) => !c.archived_at);

  // Optional filters
  if (query?.columnId) rows = rows.filter((c) => c.column_id === query.columnId);
  if (query?.priority) rows = rows.filter((c) => c.priority === query.priority);
  if (query?.search) {
    const q = query.search.toLowerCase();
    rows = rows.filter((c) => c.title.toLowerCase().includes(q));
  }

  // Sort by column then order_index
  rows.sort((a, b) =>
    a.column_id.localeCompare(b.column_id) || a.order_index - b.order_index,
  );

  const cards = await Promise.all(rows.map(enrichCard));
  return { cards, total: cards.length, page: 1, limit: cards.length };
}

export async function createCard(boardId: string, data: CreateCardInput): Promise<Card> {
  const db = await getDB();
  const userId = currentUserId();

  // Determine next order_index for this column
  const existing = await db.getAllFromIndex('cards', 'by-column', data.column_id);
  const maxOrder = existing
    .filter((c) => !c.archived_at)
    .reduce((m, c) => Math.max(m, c.order_index), -1);

  const row: CardRow = {
    id: uid(),
    board_id: boardId,
    column_id: data.column_id,
    title: data.title,
    description: data.description ?? null,
    priority: data.priority ?? 'medium',
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    estimate_hours: data.estimate_hours ?? null,
    order_index: maxOrder + 1,
    archived_at: null,
    created_by: userId,
    created_at: now(),
    updated_at: now(),
    owner_ids: [],
    label_ids: [],
  };
  await db.put('cards', row);
  return enrichCard(row);
}

export async function getCard(cardId: string): Promise<Card> {
  const db = await getDB();
  const row = await db.get('cards', cardId);
  if (!row) throw makeError('Card not found', 404);
  return enrichCard(row);
}

export async function updateCard(cardId: string, data: UpdateCardInput): Promise<Card> {
  const db = await getDB();
  const row = await db.get('cards', cardId);
  if (!row) throw makeError('Card not found', 404);

  const updated: CardRow = {
    ...row,
    title: data.title ?? row.title,
    description: data.description !== undefined ? data.description : row.description,
    priority: data.priority ?? row.priority,
    start_date: data.start_date !== undefined ? data.start_date : row.start_date,
    end_date: data.end_date !== undefined ? data.end_date : row.end_date,
    estimate_hours: data.estimate_hours !== undefined ? data.estimate_hours : row.estimate_hours,
    updated_at: now(),
  };
  await db.put('cards', updated);
  return enrichCard(updated);
}

export async function deleteCard(cardId: string): Promise<void> {
  const db = await getDB();
  const row = await db.get('cards', cardId);
  if (!row) return;
  await db.put('cards', { ...row, archived_at: now() });
}

export async function addCardOwner(cardId: string, userId: string): Promise<Card> {
  const db = await getDB();
  const row = await db.get('cards', cardId);
  if (!row) throw makeError('Card not found', 404);
  if (row.owner_ids.includes(userId)) return enrichCard(row);
  const updated = { ...row, owner_ids: [...row.owner_ids, userId], updated_at: now() };
  await db.put('cards', updated);
  return enrichCard(updated);
}

export async function removeCardOwner(cardId: string, userId: string): Promise<Card> {
  const db = await getDB();
  const row = await db.get('cards', cardId);
  if (!row) throw makeError('Card not found', 404);
  const updated = { ...row, owner_ids: row.owner_ids.filter((id) => id !== userId), updated_at: now() };
  await db.put('cards', updated);
  return enrichCard(updated);
}

export async function moveCard(cardId: string, data: MoveCardInput): Promise<Card> {
  const db = await getDB();
  const row = await db.get('cards', cardId);
  if (!row) throw makeError('Card not found', 404);

  const fromColumnId = row.column_id;
  const toColumnId = data.columnId;
  const position = data.position ?? 0;

  // Reorder cards in the destination column
  const destCards = (await db.getAllFromIndex('cards', 'by-column', toColumnId))
    .filter((c) => !c.archived_at && c.id !== cardId)
    .sort((a, b) => a.order_index - b.order_index);

  destCards.splice(position, 0, { ...row, column_id: toColumnId });
  const tx = db.transaction('cards', 'readwrite');
  for (let i = 0; i < destCards.length; i++) {
    const c = destCards[i];
    await tx.store.put({ ...c, column_id: toColumnId, order_index: i, updated_at: now() });
  }

  // Re-index source column if different
  if (fromColumnId !== toColumnId) {
    const srcCards = (await db.getAllFromIndex('cards', 'by-column', fromColumnId))
      .filter((c) => !c.archived_at && c.id !== cardId)
      .sort((a, b) => a.order_index - b.order_index);
    for (let i = 0; i < srcCards.length; i++) {
      await tx.store.put({ ...srcCards[i], order_index: i, updated_at: now() });
    }
  }

  await tx.done;

  const moved = await db.get('cards', cardId);
  return enrichCard(moved!);
}
