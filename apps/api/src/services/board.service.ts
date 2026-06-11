import { db } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import type { Board, BoardMember, Column, Label, UserRole } from '@questboard/shared';

// ─── Board CRUD ───────────────────────────────────────────────

export async function createBoard(ownerId: string, name: string): Promise<Board> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO boards (name, owner_id) VALUES ($1, $2) RETURNING *`,
      [name, ownerId],
    );
    const board = res.rows[0] as Board;
    await client.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [board.id, ownerId],
    );
    await client.query('COMMIT');
    return { ...board, member_count: 1 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getBoards(userId: string): Promise<Board[]> {
  const res = await db.query(
    `SELECT b.*, COUNT(bm2.user_id)::int AS member_count
     FROM boards b
     JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = $1
     LEFT JOIN board_members bm2 ON bm2.board_id = b.id
     WHERE b.archived_at IS NULL
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [userId],
  );
  return res.rows as Board[];
}

export async function getBoardById(boardId: string): Promise<Board> {
  const res = await db.query(
    `SELECT b.*, COUNT(bm.user_id)::int AS member_count
     FROM boards b
     LEFT JOIN board_members bm ON bm.board_id = b.id
     WHERE b.id = $1 AND b.archived_at IS NULL
     GROUP BY b.id`,
    [boardId],
  );
  if (!res.rows[0]) throw new AppError(404, 'Board not found', 'NOT_FOUND');
  return res.rows[0] as Board;
}

export async function updateBoard(boardId: string, name: string): Promise<Board> {
  const res = await db.query(
    `UPDATE boards SET name = $1 WHERE id = $2 AND archived_at IS NULL RETURNING *`,
    [name, boardId],
  );
  if (!res.rows[0]) throw new AppError(404, 'Board not found', 'NOT_FOUND');
  return res.rows[0] as Board;
}

export async function archiveBoard(boardId: string): Promise<void> {
  await db.query(`UPDATE boards SET archived_at = NOW() WHERE id = $1`, [boardId]);
}

// ─── Membership ───────────────────────────────────────────────

export async function checkMembership(
  boardId: string,
  userId: string,
): Promise<{ role: UserRole }> {
  const res = await db.query(
    `SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2`,
    [boardId, userId],
  );
  if (!res.rows[0]) throw new AppError(403, 'Not a board member', 'FORBIDDEN');
  return { role: res.rows[0].role as UserRole };
}

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  const res = await db.query(
    `SELECT bm.board_id, bm.user_id, bm.role,
            u.name, u.email, a.thumb_url AS avatar_thumb
     FROM board_members bm
     JOIN users u ON u.id = bm.user_id
     LEFT JOIN avatars a ON a.id = u.avatar_id
     WHERE bm.board_id = $1
     ORDER BY bm.role, u.name`,
    [boardId],
  );
  return res.rows.map((r) => ({
    board_id: r.board_id as string,
    user_id: r.user_id as string,
    role: r.role as UserRole,
    user: {
      id: r.user_id as string,
      name: r.name as string,
      email: r.email as string,
      avatar: r.avatar_thumb ? { thumb_url: r.avatar_thumb as string } : undefined,
    },
  }));
}

export async function addBoardMember(
  boardId: string,
  userId: string,
  role: UserRole,
): Promise<void> {
  const userExists = await db.query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (!userExists.rows[0]) throw new AppError(404, 'User not found', 'NOT_FOUND');
  await db.query(
    `INSERT INTO board_members (board_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (board_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [boardId, userId, role],
  );
}

export async function removeBoardMember(boardId: string, userId: string): Promise<void> {
  await db.query(
    `DELETE FROM board_members WHERE board_id = $1 AND user_id = $2`,
    [boardId, userId],
  );
}

// ─── Columns ──────────────────────────────────────────────────

export async function getColumns(boardId: string): Promise<Column[]> {
  const res = await db.query(
    `SELECT col.*, COUNT(c.id)::int AS card_count
     FROM columns col
     LEFT JOIN cards c ON c.column_id = col.id AND c.archived_at IS NULL
     WHERE col.board_id = $1
     GROUP BY col.id
     ORDER BY col.order_index`,
    [boardId],
  );
  return res.rows as Column[];
}

export async function createColumn(
  boardId: string,
  name: string,
  colour: string,
  wipLimit?: number | null,
): Promise<Column> {
  const orderRes = await db.query(
    `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx FROM columns WHERE board_id = $1`,
    [boardId],
  );
  const orderIndex = orderRes.rows[0].next_idx as number;
  const res = await db.query(
    `INSERT INTO columns (board_id, name, colour, order_index, wip_limit)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [boardId, name, colour, orderIndex, wipLimit ?? null],
  );
  return { ...res.rows[0], card_count: 0 } as Column;
}

export async function updateColumn(
  boardId: string,
  columnId: string,
  data: { name?: string; colour?: string; order_index?: number; wip_limit?: number | null },
): Promise<Column> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (data.name !== undefined) { fields.push(`name = $${i++}`); params.push(data.name); }
  if (data.colour !== undefined) { fields.push(`colour = $${i++}`); params.push(data.colour); }
  if (data.order_index !== undefined) { fields.push(`order_index = $${i++}`); params.push(data.order_index); }
  if ('wip_limit' in data) { fields.push(`wip_limit = $${i++}`); params.push(data.wip_limit); }
  if (!fields.length) throw new AppError(400, 'No fields to update', 'BAD_REQUEST');
  params.push(columnId, boardId);
  const res = await db.query(
    `UPDATE columns SET ${fields.join(', ')} WHERE id = $${i++} AND board_id = $${i} RETURNING *`,
    params,
  );
  if (!res.rows[0]) throw new AppError(404, 'Column not found', 'NOT_FOUND');
  return res.rows[0] as Column;
}

export async function deleteColumn(boardId: string, columnId: string): Promise<void> {
  const count = await db.query(
    `SELECT COUNT(*) FROM cards WHERE column_id = $1 AND archived_at IS NULL`,
    [columnId],
  );
  if (parseInt(count.rows[0].count as string) > 0) {
    throw new AppError(409, 'Column is not empty', 'COLUMN_NOT_EMPTY');
  }
  await db.query(`DELETE FROM columns WHERE id = $1 AND board_id = $2`, [columnId, boardId]);
}

export async function reorderColumns(boardId: string, order: string[]): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < order.length; i++) {
      await client.query(
        `UPDATE columns SET order_index = $1 WHERE id = $2 AND board_id = $3`,
        [i, order[i], boardId],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Labels ───────────────────────────────────────────────────

export async function getLabels(boardId: string): Promise<Label[]> {
  const res = await db.query(
    `SELECT * FROM labels WHERE board_id = $1 ORDER BY name`,
    [boardId],
  );
  return res.rows as Label[];
}

export async function createLabel(
  boardId: string,
  name: string,
  colour: string,
): Promise<Label> {
  const res = await db.query(
    `INSERT INTO labels (board_id, name, colour) VALUES ($1, $2, $3) RETURNING *`,
    [boardId, name, colour],
  );
  return res.rows[0] as Label;
}

export async function updateLabel(
  boardId: string,
  labelId: string,
  data: { name?: string; colour?: string },
): Promise<Label> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (data.name !== undefined) { fields.push(`name = $${i++}`); params.push(data.name); }
  if (data.colour !== undefined) { fields.push(`colour = $${i++}`); params.push(data.colour); }
  if (!fields.length) throw new AppError(400, 'No fields to update', 'BAD_REQUEST');
  params.push(labelId, boardId);
  const res = await db.query(
    `UPDATE labels SET ${fields.join(', ')} WHERE id = $${i++} AND board_id = $${i} RETURNING *`,
    params,
  );
  if (!res.rows[0]) throw new AppError(404, 'Label not found', 'NOT_FOUND');
  return res.rows[0] as Label;
}

export async function deleteLabel(boardId: string, labelId: string): Promise<void> {
  await db.query(`DELETE FROM labels WHERE id = $1 AND board_id = $2`, [labelId, boardId]);
}
