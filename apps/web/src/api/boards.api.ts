/**
 * boards.api.ts — local-first implementation backed by IndexedDB.
 * Mirrors the original server API signatures exactly so hooks/components are unchanged.
 */
import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { Board, BoardMember, Column, Label } from '@questboard/shared';
import type {
  CreateBoardInput,
  UpdateBoardInput,
  AddBoardMemberInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateLabelInput,
  UpdateLabelInput,
} from '@questboard/shared';

// ─── helpers ──────────────────────────────────────────────────────────────────

function currentUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function makeError(message: string, status = 400): Error {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export async function getBoards(): Promise<Board[]> {
  const db = await getDB();
  const userId = currentUserId();

  // Boards the user is a member of
  const memberships = await db.getAllFromIndex('board_members', 'by-user', userId);
  const boards: Board[] = [];

  for (const m of memberships) {
    const b = await db.get('boards', m.board_id);
    if (!b || b.archived_at) continue;
    const allMembers = await db.getAllFromIndex('board_members', 'by-board', b.id);
    boards.push({ ...b, member_count: allMembers.length });
  }

  return boards.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function createBoard(data: CreateBoardInput): Promise<Board> {
  const db = await getDB();
  const userId = currentUserId();
  const id = uid();
  const board: import('@/lib/db').BoardRow = {
    id,
    name: data.name,
    owner_id: userId,
    created_at: now(),
    archived_at: null,
  };
  await db.put('boards', board);
  // Add creator as admin member
  await db.put('board_members', { board_id: id, user_id: userId, role: 'admin' });
  return { ...board, member_count: 1 };
}

export async function getBoard(boardId: string): Promise<Board> {
  const db = await getDB();
  const b = await db.get('boards', boardId);
  if (!b) throw makeError('Board not found', 404);
  const members = await db.getAllFromIndex('board_members', 'by-board', boardId);
  return { ...b, member_count: members.length };
}

export async function updateBoard(boardId: string, data: UpdateBoardInput): Promise<Board> {
  const db = await getDB();
  const b = await db.get('boards', boardId);
  if (!b) throw makeError('Board not found', 404);
  const updated = { ...b, ...data };
  await db.put('boards', updated);
  const members = await db.getAllFromIndex('board_members', 'by-board', boardId);
  return { ...updated, member_count: members.length };
}

/** Soft-delete: sets archived_at, data preserved. */
export async function archiveBoard(boardId: string): Promise<void> {
  const db = await getDB();
  const b = await db.get('boards', boardId);
  if (!b) return;
  await db.put('boards', { ...b, archived_at: now() });
}

/** Alias kept for callers using the old name. */
export const deleteBoard = archiveBoard;

/** Count of active (non-archived) cards so callers know whether to warn. */
export async function getBoardCardCount(boardId: string): Promise<number> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('cards', 'by-board', boardId);
  return rows.filter((c) => !c.archived_at).length;
}

/** Hard-delete: removes all board data from IndexedDB permanently. */
export async function permanentlyDeleteBoard(boardId: string): Promise<void> {
  const db = await getDB();

  const cards = await db.getAllFromIndex('cards', 'by-board', boardId);
  for (const card of cards) {
    const substeps = await db.getAllFromIndex('substeps', 'by-card', card.id);
    for (const s of substeps) await db.delete('substeps', s.id);

    const timeLogs = await db.getAllFromIndex('time_logs', 'by-card', card.id);
    for (const t of timeLogs) await db.delete('time_logs', t.id);

    const comments = await db.getAllFromIndex('comments', 'by-card', card.id);
    for (const c of comments) await db.delete('comments', c.id);

    const attachments = await db.getAllFromIndex('attachments', 'by-card', card.id);
    for (const a of attachments) await db.delete('attachments', a.id);

    await db.delete('cards', card.id);
  }

  const labels = await db.getAllFromIndex('labels', 'by-board', boardId);
  for (const l of labels) await db.delete('labels', l.id);

  const columns = await db.getAllFromIndex('columns', 'by-board', boardId);
  for (const col of columns) await db.delete('columns', col.id);

  const members = await db.getAllFromIndex('board_members', 'by-board', boardId);
  for (const m of members) await db.delete('board_members', [m.board_id, m.user_id]);

  const rules = await db.getAllFromIndex('automation_rules', 'by-board', boardId);
  for (const r of rules) await db.delete('automation_rules', r.id);

  const assignments = await db.getAllFromIndex('card_assignments', 'by-board', boardId);
  for (const a of assignments) await db.delete('card_assignments', a.id);

  await db.delete('boards', boardId);
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('board_members', 'by-board', boardId);
  const members: BoardMember[] = [];
  for (const r of rows) {
    const user = await db.get('users', r.user_id);
    const avatar = user?.avatar_id ? await db.get('avatars', user.avatar_id) : undefined;
    members.push({
      board_id: r.board_id,
      user_id: r.user_id,
      role: r.role,
      user: user
        ? { id: user.id, name: user.name, email: user.email, avatar: avatar ? { thumb_url: avatar.thumb_url } : undefined }
        : undefined,
    });
  }
  return members;
}

export async function addBoardMember(boardId: string, data: AddBoardMemberInput): Promise<void> {
  const db = await getDB();
  await db.put('board_members', { board_id: boardId, user_id: data.userId, role: data.role ?? 'member' });
}

export async function removeBoardMember(boardId: string, userId: string): Promise<void> {
  const db = await getDB();
  await db.delete('board_members', [boardId, userId]);
}

export async function updateBoardMemberRole(
  boardId: string,
  userId: string,
  newRole: 'admin' | 'member' | 'guest',
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('board_members', [boardId, userId]);
  if (!existing) throw makeError('Member not found', 404);

  // Guard: cannot remove the last admin
  if (existing.role === 'admin' && newRole !== 'admin') {
    const allMembers = await db.getAllFromIndex('board_members', 'by-board', boardId);
    const adminCount = allMembers.filter((m) => m.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error(
        'This board must have at least one admin. Promote another member to admin before revoking your own rights.',
      );
    }
  }

  await db.put('board_members', { ...existing, role: newRole });
}

export async function searchUsers(query: string): Promise<import('@questboard/shared').User[]> {
  const db = await getDB();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const rows = await db.getAll('users');
  return rows
    .filter((u) => u.status === 'active' && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar_id: u.avatar_id,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
    }));
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export async function getColumns(boardId: string): Promise<Column[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('columns', 'by-board', boardId);
  // Attach card_count
  const result: Column[] = [];
  for (const col of rows) {
    const cards = await db.getAllFromIndex('cards', 'by-column', col.id);
    const activeCards = cards.filter((c) => !c.archived_at);
    result.push({ ...col, card_count: activeCards.length });
  }
  return result.sort((a, b) => a.order_index - b.order_index);
}

export async function createColumn(boardId: string, data: CreateColumnInput): Promise<Column> {
  const db = await getDB();
  const existing = await db.getAllFromIndex('columns', 'by-board', boardId);
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.order_index), -1);
  const col: import('@/lib/db').ColumnRow = {
    id: uid(),
    board_id: boardId,
    name: data.name,
    colour: data.colour ?? '#5B4FCF',
    order_index: maxOrder + 1,
    wip_limit: data.wip_limit ?? null,
    created_at: now(),
  };
  await db.put('columns', col);
  return { ...col, card_count: 0 };
}

export async function updateColumn(
  _boardId: string,
  columnId: string,
  data: UpdateColumnInput,
): Promise<Column> {
  const db = await getDB();
  const col = await db.get('columns', columnId);
  if (!col) throw makeError('Column not found', 404);
  const updated = { ...col, ...data };
  await db.put('columns', updated);
  const cards = await db.getAllFromIndex('cards', 'by-column', columnId);
  return { ...updated, card_count: cards.filter((c) => !c.archived_at).length };
}

export async function deleteColumn(_boardId: string, columnId: string): Promise<void> {
  const db = await getDB();
  // Guard: column must be empty
  const cards = await db.getAllFromIndex('cards', 'by-column', columnId);
  if (cards.some((c) => !c.archived_at)) {
    throw makeError('Cannot delete a column that still has cards', 409);
  }
  await db.delete('columns', columnId);
}

export async function reorderColumns(boardId: string, order: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('columns', 'readwrite');
  for (let i = 0; i < order.length; i++) {
    const col = await tx.store.get(order[i]);
    if (col && col.board_id === boardId) {
      await tx.store.put({ ...col, order_index: i });
    }
  }
  await tx.done;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function getLabels(boardId: string): Promise<Label[]> {
  const db = await getDB();
  return db.getAllFromIndex('labels', 'by-board', boardId);
}

export async function createLabel(boardId: string, data: CreateLabelInput): Promise<Label> {
  const db = await getDB();
  const label: Label = { id: uid(), board_id: boardId, name: data.name, colour: data.colour };
  await db.put('labels', label);
  return label;
}

export async function updateLabel(
  _boardId: string,
  labelId: string,
  data: UpdateLabelInput,
): Promise<Label> {
  const db = await getDB();
  const existing = await db.get('labels', labelId);
  if (!existing) throw makeError('Label not found', 404);
  const updated = { ...existing, ...data };
  await db.put('labels', updated);
  return updated;
}

export async function deleteLabel(_boardId: string, labelId: string): Promise<void> {
  const db = await getDB();
  await db.delete('labels', labelId);
}
