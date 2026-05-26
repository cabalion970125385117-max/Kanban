import { db } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { emitToBoard } from '../socket/index';
import type { Card, Priority } from '@questboard/shared';

type CardRow = Record<string, unknown>;

async function enrichCards(rows: CardRow[]): Promise<Card[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id as string);

  const [ownersRes, labelsRes, substepsRes] = await Promise.all([
    db.query(
      `SELECT co.card_id, u.id, u.name, a.thumb_url
       FROM card_owners co
       JOIN users u ON u.id = co.user_id
       LEFT JOIN avatars a ON a.id = u.avatar_id
       WHERE co.card_id = ANY($1)`,
      [ids],
    ),
    db.query(
      `SELECT cl.card_id, l.id, l.name, l.colour
       FROM card_labels cl
       JOIN labels l ON l.id = cl.label_id
       WHERE cl.card_id = ANY($1)`,
      [ids],
    ),
    db.query(
      `SELECT card_id,
              COUNT(*)::int AS total,
              SUM(CASE WHEN is_complete THEN 1 ELSE 0 END)::int AS done
       FROM substeps WHERE card_id = ANY($1) GROUP BY card_id`,
      [ids],
    ),
  ]);

  const ownersMap: Record<string, Array<{ id: string; name: string; avatar?: { thumb_url: string } }>> = {};
  ownersRes.rows.forEach((r) => {
    if (!ownersMap[r.card_id as string]) ownersMap[r.card_id as string] = [];
    ownersMap[r.card_id as string].push({
      id: r.id as string,
      name: r.name as string,
      avatar: r.thumb_url ? { thumb_url: r.thumb_url as string } : undefined,
    });
  });

  const labelsMap: Record<string, Array<{ id: string; name: string; colour: string; board_id: string }>> = {};
  labelsRes.rows.forEach((r) => {
    if (!labelsMap[r.card_id as string]) labelsMap[r.card_id as string] = [];
    labelsMap[r.card_id as string].push({
      id: r.id as string,
      name: r.name as string,
      colour: r.colour as string,
      board_id: '',
    });
  });

  const substepsMap: Record<string, { total: number; done: number }> = {};
  substepsRes.rows.forEach((r) => {
    substepsMap[r.card_id as string] = { total: r.total as number, done: r.done as number };
  });

  return rows.map((r) => ({
    ...(r as unknown as Card),
    owners: ownersMap[r.id as string] ?? [],
    labels: labelsMap[r.id as string] ?? [],
    substep_count: substepsMap[r.id as string]?.total ?? 0,
    substep_done: substepsMap[r.id as string]?.done ?? 0,
  }));
}

export async function getCards(
  boardId: string,
  query: {
    columnId?: string;
    ownerId?: string;
    priority?: string;
    label?: string;
    search?: string;
    page: number;
    limit: number;
  },
): Promise<{ cards: Card[]; total: number; page: number; limit: number }> {
  const conditions: string[] = ['c.board_id = $1', 'c.archived_at IS NULL'];
  const params: unknown[] = [boardId];
  let i = 2;

  if (query.columnId) { conditions.push(`c.column_id = $${i++}`); params.push(query.columnId); }
  if (query.priority) { conditions.push(`c.priority = $${i++}`); params.push(query.priority); }
  if (query.search) { conditions.push(`c.title ILIKE $${i++}`); params.push(`%${query.search}%`); }
  if (query.ownerId) {
    conditions.push(`EXISTS (SELECT 1 FROM card_owners WHERE card_id = c.id AND user_id = $${i++})`);
    params.push(query.ownerId);
  }
  if (query.label) {
    conditions.push(`EXISTS (SELECT 1 FROM card_labels WHERE card_id = c.id AND label_id = $${i++})`);
    params.push(query.label);
  }

  const where = conditions.join(' AND ');
  const offset = (query.page - 1) * query.limit;

  const [countRes, dataRes] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS total FROM cards c WHERE ${where}`, params),
    db.query(
      `SELECT * FROM cards c WHERE ${where}
       ORDER BY c.column_id, c.order_index
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, query.limit, offset],
    ),
  ]);

  const cards = await enrichCards(dataRes.rows);
  return { cards, total: countRes.rows[0].total as number, page: query.page, limit: query.limit };
}

export async function createCard(
  boardId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    priority: Priority;
    column_id: string;
    start_date?: string | null;
    end_date?: string | null;
    estimate_hours?: number | null;
  },
): Promise<Card> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const col = await client.query(
      `SELECT wip_limit FROM columns WHERE id = $1 AND board_id = $2`,
      [data.column_id, boardId],
    );
    if (!col.rows[0]) throw new AppError(404, 'Column not found', 'NOT_FOUND');

    if (col.rows[0].wip_limit != null) {
      const count = await client.query(
        `SELECT COUNT(*)::int AS n FROM cards WHERE column_id = $1 AND archived_at IS NULL`,
        [data.column_id],
      );
      if ((count.rows[0].n as number) >= (col.rows[0].wip_limit as number)) {
        throw new AppError(409, 'Column WIP limit reached', 'WIP_LIMIT');
      }
    }

    const orderRes = await client.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx
       FROM cards WHERE column_id = $1 AND archived_at IS NULL`,
      [data.column_id],
    );
    const orderIndex = orderRes.rows[0].next_idx as number;

    const res = await client.query(
      `INSERT INTO cards
         (board_id, column_id, title, description, priority,
          start_date, end_date, estimate_hours, order_index, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        boardId, data.column_id, data.title, data.description ?? null,
        data.priority, data.start_date ?? null, data.end_date ?? null,
        data.estimate_hours ?? null, orderIndex, userId,
      ],
    );
    const card = res.rows[0] as CardRow;

    await client.query(
      `INSERT INTO card_history (card_id, column_id, entered_at) VALUES ($1, $2, NOW())`,
      [card.id, data.column_id],
    );

    await client.query('COMMIT');

    const [enriched] = await enrichCards([card]);
    emitToBoard(boardId, 'card:created', { card: enriched });
    return enriched;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getCardById(cardId: string): Promise<Card> {
  const res = await db.query(
    `SELECT * FROM cards WHERE id = $1 AND archived_at IS NULL`,
    [cardId],
  );
  if (!res.rows[0]) throw new AppError(404, 'Card not found', 'NOT_FOUND');
  const [card] = await enrichCards([res.rows[0] as CardRow]);
  return card;
}

export async function updateCard(
  cardId: string,
  boardId: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: Priority;
    start_date?: string | null;
    end_date?: string | null;
    estimate_hours?: number | null;
  },
): Promise<Card> {
  const fields: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let i = 1;

  if (data.title !== undefined) { fields.push(`title = $${i++}`); params.push(data.title); }
  if ('description' in data) { fields.push(`description = $${i++}`); params.push(data.description ?? null); }
  if (data.priority !== undefined) { fields.push(`priority = $${i++}`); params.push(data.priority); }
  if ('start_date' in data) { fields.push(`start_date = $${i++}`); params.push(data.start_date ?? null); }
  if ('end_date' in data) { fields.push(`end_date = $${i++}`); params.push(data.end_date ?? null); }
  if ('estimate_hours' in data) { fields.push(`estimate_hours = $${i++}`); params.push(data.estimate_hours ?? null); }

  params.push(cardId);
  const res = await db.query(
    `UPDATE cards SET ${fields.join(', ')} WHERE id = $${i} AND archived_at IS NULL RETURNING *`,
    params,
  );
  if (!res.rows[0]) throw new AppError(404, 'Card not found', 'NOT_FOUND');

  const [card] = await enrichCards([res.rows[0] as CardRow]);
  emitToBoard(boardId, 'card:updated', { cardId, patch: data });
  return card;
}

export async function archiveCard(cardId: string, boardId: string): Promise<void> {
  const res = await db.query(
    `UPDATE cards SET archived_at = NOW() WHERE id = $1 AND archived_at IS NULL RETURNING id`,
    [cardId],
  );
  if (!res.rows[0]) throw new AppError(404, 'Card not found', 'NOT_FOUND');
  emitToBoard(boardId, 'card:archived', { cardId });
}

export async function moveCard(
  cardId: string,
  boardId: string,
  columnId: string,
  position: number,
  movedBy: string,
): Promise<Card> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      `SELECT column_id FROM cards WHERE id = $1 AND archived_at IS NULL`,
      [cardId],
    );
    if (!currentRes.rows[0]) throw new AppError(404, 'Card not found', 'NOT_FOUND');
    const fromColumnId = currentRes.rows[0].column_id as string;

    const colRes = await client.query(
      `SELECT wip_limit FROM columns WHERE id = $1 AND board_id = $2`,
      [columnId, boardId],
    );
    if (!colRes.rows[0]) throw new AppError(404, 'Column not found', 'NOT_FOUND');

    if (fromColumnId !== columnId && colRes.rows[0].wip_limit != null) {
      const count = await client.query(
        `SELECT COUNT(*)::int AS n FROM cards WHERE column_id = $1 AND archived_at IS NULL`,
        [columnId],
      );
      if ((count.rows[0].n as number) >= (colRes.rows[0].wip_limit as number)) {
        throw new AppError(409, 'Column WIP limit reached', 'WIP_LIMIT');
      }
    }

    // Shift cards at target position up to make room
    await client.query(
      `UPDATE cards SET order_index = order_index + 1
       WHERE column_id = $1 AND order_index >= $2 AND id != $3 AND archived_at IS NULL`,
      [columnId, position, cardId],
    );

    await client.query(
      `UPDATE cards SET column_id = $1, order_index = $2, updated_at = NOW() WHERE id = $3`,
      [columnId, position, cardId],
    );

    if (fromColumnId !== columnId) {
      await client.query(
        `UPDATE card_history SET exited_at = NOW() WHERE card_id = $1 AND exited_at IS NULL`,
        [cardId],
      );
      await client.query(
        `INSERT INTO card_history (card_id, column_id, entered_at) VALUES ($1, $2, NOW())`,
        [cardId, columnId],
      );
    }

    await client.query('COMMIT');

    const card = await getCardById(cardId);
    emitToBoard(boardId, 'card:moved', { cardId, columnId, position, movedBy });
    return card;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
