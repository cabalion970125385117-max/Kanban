/**
 * dashboard.api.ts — local-first dashboard layouts and share tokens.
 */
import { getDB, uid, now } from '@/lib/db';
import type { Card, Column, BoardMember, Board, Label } from '@questboard/shared';
import type { CardRow } from '@/lib/db';

// ─── Widget config ────────────────────────────────────────────────────────────

export type WidgetType =
  | 'kpi-summary'
  | 'by-status'
  | 'by-priority'
  | 'by-assignee'
  | 'progress'
  | 'recent-activity'
  | 'word-summary'
  | 'avg-close-time'
  | 'upcoming-due';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w-kpi',      type: 'kpi-summary'    },
  { id: 'w-status',   type: 'by-status'      },
  { id: 'w-priority', type: 'by-priority'    },
  { id: 'w-assignee', type: 'by-assignee'    },
  { id: 'w-progress', type: 'progress'       },
  { id: 'w-activity', type: 'recent-activity'},
];

export const WIDGET_META: Record<WidgetType, { label: string; description: string }> = {
  'kpi-summary':     { label: 'KPI Summary',          description: 'Total cards, done %, overdue count' },
  'by-status':       { label: 'Cards by Status',      description: 'Bar chart: cards per column' },
  'by-priority':     { label: 'Priority Breakdown',   description: 'Cards grouped by priority' },
  'by-assignee':     { label: 'Assignee Workload',    description: 'Card count per team member' },
  'progress':        { label: 'Column Progress',      description: 'Completion bars per column' },
  'recent-activity': { label: 'Recent Activity',      description: 'Most recently updated cards' },
  'word-summary':    { label: 'Word Summary',         description: 'Prose snapshot of board health' },
  'avg-close-time':  { label: 'Avg Close Time',       description: 'Average time to close cards per user' },
  'upcoming-due':    { label: 'Upcoming Due',         description: 'Cards due in the next 14 days' },
};

// ─── Layout CRUD ──────────────────────────────────────────────────────────────

export async function getLayout(boardId: string): Promise<WidgetConfig[]> {
  const db = await getDB();
  const row = await db.get('dashboard_layouts', boardId);
  if (!row) return DEFAULT_WIDGETS;
  try {
    return JSON.parse(row.widgets) as WidgetConfig[];
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export async function saveLayout(boardId: string, widgets: WidgetConfig[]): Promise<void> {
  const db = await getDB();
  await db.put('dashboard_layouts', {
    id: boardId,
    board_id: boardId,
    widgets: JSON.stringify(widgets),
    updated_at: now(),
  });
}

// ─── Share tokens ─────────────────────────────────────────────────────────────

export async function getShareToken(boardId: string): Promise<string | null> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('dashboard_shares', 'by-board', boardId);
  return rows[0]?.token ?? null;
}

export async function createShareToken(boardId: string): Promise<string> {
  const db = await getDB();
  // Revoke any existing token first
  const existing = await db.getAllFromIndex('dashboard_shares', 'by-board', boardId);
  for (const r of existing) await db.delete('dashboard_shares', r.id);
  const token = uid();
  await db.put('dashboard_shares', { id: uid(), token, board_id: boardId, created_at: now() });
  return token;
}

export async function revokeShareToken(boardId: string): Promise<void> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('dashboard_shares', 'by-board', boardId);
  for (const r of rows) await db.delete('dashboard_shares', r.id);
}

// ─── Dashboard data ───────────────────────────────────────────────────────────

export interface DashboardData {
  board: Board;
  columns: Column[];
  cards: Card[];
  members: BoardMember[];
}

async function enrichCardMinimal(row: CardRow): Promise<Card> {
  const db = await getDB();
  const owners = (
    await Promise.all(
      (row.owner_ids ?? []).map(async (oid) => {
        const u = await db.get('users', oid);
        if (!u) return null;
        const avatar = u.avatar_id ? await db.get('avatars', u.avatar_id) : undefined;
        return { id: u.id, name: u.name, avatar: avatar ? { thumb_url: avatar.thumb_url } : undefined };
      }),
    )
  ).filter(Boolean) as Card['owners'];

  const labels = (
    await Promise.all((row.label_ids ?? []).map((lid) => db.get('labels', lid)))
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
    cover_colour: row.cover_colour ?? null,
    tags: row.card_tags ?? [],
    owners,
    labels,
  };
}

export async function getDashboardData(boardId: string): Promise<DashboardData> {
  const db = await getDB();

  const boardRow = await db.get('boards', boardId);
  if (!boardRow) throw new Error('Board not found');

  const colRows = (await db.getAllFromIndex('columns', 'by-board', boardId))
    .sort((a, b) => a.order_index - b.order_index);
  const columns: Column[] = colRows.map((c) => ({ ...c, card_count: 0 }));

  const cardRows = (await db.getAllFromIndex('cards', 'by-board', boardId))
    .filter((c) => !c.archived_at);
  const cards = await Promise.all(cardRows.map(enrichCardMinimal));

  const memberRows = await db.getAllFromIndex('board_members', 'by-board', boardId);
  const members: BoardMember[] = await Promise.all(
    memberRows.map(async (m) => {
      const u = await db.get('users', m.user_id);
      const avatar = u?.avatar_id ? await db.get('avatars', u.avatar_id) : undefined;
      return {
        board_id: m.board_id,
        user_id: m.user_id,
        role: m.role,
        user: u
          ? { id: u.id, name: u.name, email: u.email, avatar: avatar ? { thumb_url: avatar.thumb_url, archetype: avatar.archetype } : undefined }
          : undefined,
      };
    }),
  );

  const allMemberRows = await db.getAllFromIndex('board_members', 'by-board', boardId);
  const board: Board = { ...boardRow, member_count: allMemberRows.length };

  return { board, columns, cards, members };
}

/** Used by the public share page — no auth needed since it's all local IDB. */
export async function getDashboardDataByToken(token: string): Promise<DashboardData | null> {
  const db = await getDB();
  try {
    const shareRow = await db.getFromIndex('dashboard_shares', 'by-token', token);
    if (!shareRow) return null;
    return getDashboardData(shareRow.board_id);
  } catch {
    return null;
  }
}

export async function getLayoutByToken(token: string): Promise<WidgetConfig[] | null> {
  const db = await getDB();
  const shareRow = await db.getFromIndex('dashboard_shares', 'by-token', token);
  if (!shareRow) return null;
  return getLayout(shareRow.board_id);
}
