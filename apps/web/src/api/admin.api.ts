import { getDB, uid, now } from '@/lib/db';
import { hashPassword } from '@/lib/crypto';
import type {
  UserRow,
  BoardRow,
  SessionRow,
  LoginAttemptRow,
  BugReportRow,
  ErrorLogRow,
  NotificationRow,
  AnnouncementRow,
} from '@/lib/db';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<UserRow[]> {
  const db = await getDB();
  return db.getAll('users');
}

export async function adminUpdateUser(
  id: string,
  patch: Partial<Pick<UserRow, 'name' | 'role' | 'status'>>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('users', id);
  if (!existing) return;
  await db.put('users', { ...existing, ...patch });
}

export async function adminCreateUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRow['role'];
}): Promise<UserRow> {
  const db = await getDB();
  const existing = await db.getFromIndex('users', 'by-email', data.email);
  if (existing) throw new Error('Email already registered');
  const hash = await hashPassword(data.password);
  const row: UserRow = {
    id: uid(),
    name: data.name,
    email: data.email,
    password_hash: hash,
    avatar_id: null,
    role: data.role,
    status: 'active',
    created_at: now(),
    last_login_at: null,
  };
  await db.put('users', row);
  return row;
}

export async function adminDeleteUser(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('users', id);
  const sessions = await db.getAllFromIndex('sessions', 'by-user', id);
  await Promise.all(sessions.map((s) => db.delete('sessions', s.token)));
}

export async function adminResetPassword(id: string, newPassword: string): Promise<void> {
  const db = await getDB();
  const user = await db.get('users', id);
  if (!user) return;
  const hash = await hashPassword(newPassword);
  await db.put('users', { ...user, password_hash: hash });
}

export async function deleteUserCascade(userId: string): Promise<void> {
  const db = await getDB();

  // Delete all boards owned by this user (and their cascade data)
  const allBoards = await db.getAll('boards');
  const ownedBoards = allBoards.filter((b) => b.owner_id === userId);

  for (const board of ownedBoards) {
    const columns = await db.getAllFromIndex('columns', 'by-board', board.id);
    await Promise.all(columns.map((c) => db.delete('columns', c.id)));

    const labels = await db.getAllFromIndex('labels', 'by-board', board.id);
    await Promise.all(labels.map((l) => db.delete('labels', l.id)));

    const cards = await db.getAllFromIndex('cards', 'by-board', board.id);
    for (const card of cards) {
      const [substeps, timeLogs, comments, attachments] = await Promise.all([
        db.getAllFromIndex('substeps', 'by-card', card.id),
        db.getAllFromIndex('time_logs', 'by-card', card.id),
        db.getAllFromIndex('comments', 'by-card', card.id),
        db.getAllFromIndex('attachments', 'by-card', card.id),
      ]);
      await Promise.all([
        ...substeps.map((s) => db.delete('substeps', s.id)),
        ...timeLogs.map((t) => db.delete('time_logs', t.id)),
        ...comments.map((c) => db.delete('comments', c.id)),
        ...attachments.map((a) => db.delete('attachments', a.id)),
        db.delete('cards', card.id),
      ]);
    }

    const members = await db.getAllFromIndex('board_members', 'by-board', board.id);
    await Promise.all(members.map((m) => db.delete('board_members', [m.board_id, m.user_id])));

    await db.delete('boards', board.id);
  }

  // Remove from other boards' memberships
  const memberships = await db.getAllFromIndex('board_members', 'by-user', userId);
  await Promise.all(memberships.map((m) => db.delete('board_members', [m.board_id, m.user_id])));

  const sessions = await db.getAllFromIndex('sessions', 'by-user', userId);
  await Promise.all(sessions.map((s) => db.delete('sessions', s.token)));

  await db.delete('users', userId);
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export interface BoardWithStats extends BoardRow {
  memberCount: number;
  cardCount: number;
  ownerName: string;
}

export async function getAllBoards(): Promise<BoardWithStats[]> {
  const db = await getDB();
  const boards = await db.getAll('boards');
  const users = await db.getAll('users');
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return Promise.all(
    boards.map(async (b) => {
      const members = await db.getAllFromIndex('board_members', 'by-board', b.id);
      const cards = await db.getAllFromIndex('cards', 'by-board', b.id);
      const activeCards = cards.filter((c) => !c.archived_at);
      return {
        ...b,
        memberCount: members.length,
        cardCount: activeCards.length,
        ownerName: userMap.get(b.owner_id) ?? 'Unknown',
      };
    }),
  );
}

export async function adminArchiveBoard(id: string): Promise<void> {
  const db = await getDB();
  const board = await db.get('boards', id);
  if (!board) return;
  await db.put('boards', { ...board, archived_at: now() });
}

export async function adminDeleteBoard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('boards', id);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface SessionWithUser extends SessionRow {
  userName: string;
  userEmail: string;
}

export async function getAllSessions(): Promise<SessionWithUser[]> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const users = await db.getAll('users');
  const userMap = new Map(users.map((u) => [u.id, u]));
  const active = sessions.filter((s) => s.expiresAt > Date.now());
  return active.map((s) => ({
    ...s,
    userName: userMap.get(s.userId)?.name ?? 'Unknown',
    userEmail: userMap.get(s.userId)?.email ?? '',
  }));
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', token);
}

// ─── Login attempts ───────────────────────────────────────────────────────────

export interface LoginAttemptFilter {
  successOnly?: boolean;
  failedOnly?: boolean;
}

export async function getLoginAttempts(
  filter?: LoginAttemptFilter,
): Promise<LoginAttemptRow[]> {
  const db = await getDB();
  let all = await db.getAll('login_attempts');
  all = all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (filter?.successOnly) all = all.filter((a) => a.success);
  if (filter?.failedOnly) all = all.filter((a) => !a.success);
  return all;
}

// ─── Error logs ───────────────────────────────────────────────────────────────

export async function getErrorLogs(): Promise<ErrorLogRow[]> {
  const db = await getDB();
  const all = await db.getAll('error_logs');
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function clearErrorLogs(): Promise<void> {
  const db = await getDB();
  await db.clear('error_logs');
}

// ─── Bug reports ──────────────────────────────────────────────────────────────

export async function getBugReports(): Promise<BugReportRow[]> {
  const db = await getDB();
  const all = await db.getAll('bug_reports');
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function updateBugReportStatus(
  id: string,
  status: BugReportRow['status'],
): Promise<void> {
  const db = await getDB();
  const report = await db.get('bug_reports', id);
  if (!report) return;
  await db.put('bug_reports', { ...report, status });
}

// ─── Storage stats ────────────────────────────────────────────────────────────

export interface StorageStats {
  quota: number;
  usage: number;
  storeCounts: Record<string, number>;
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function broadcastAnnouncement(
  title: string,
  message: string,
  sentBy: string,
): Promise<number> {
  const db = await getDB();
  const users = await db.getAll('users');
  const announcementId = uid();
  const createdAt = now();

  await Promise.all(
    users.map((u) =>
      db.put('notifications', {
        id: uid(),
        user_id: u.id,
        type: 'announcement' as NotificationRow['type'],
        title,
        message,
        is_read: false,
        created_at: createdAt,
      }),
    ),
  );

  const row: AnnouncementRow = {
    id: announcementId,
    title,
    message,
    sent_by: sentBy,
    sent_to_count: users.length,
    created_at: createdAt,
  };
  await db.put('announcements', row);

  return users.length;
}

export async function getAnnouncementHistory(): Promise<AnnouncementRow[]> {
  const db = await getDB();
  const all = await db.getAll('announcements');
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ─── Storage stats / export ───────────────────────────────────────────────────

const STORE_NAMES = [
  'users', 'avatars', 'sessions', 'boards', 'board_members', 'columns',
  'labels', 'cards', 'substeps', 'time_logs', 'comments', 'attachments',
  'login_attempts', 'bug_reports', 'error_logs', 'notifications', 'announcements',
] as const;

export async function getStorageStats(): Promise<StorageStats> {
  const db = await getDB();
  const estimate = await navigator.storage?.estimate() ?? { quota: 0, usage: 0 };
  const counts = await Promise.all(
    STORE_NAMES.map(async (name) => {
      const count = await db.count(name as Parameters<typeof db.count>[0]);
      return [name, count] as [string, number];
    }),
  );
  return {
    quota: estimate.quota ?? 0,
    usage: estimate.usage ?? 0,
    storeCounts: Object.fromEntries(counts),
  };
}

// ─── Data export ──────────────────────────────────────────────────────────────

export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const db = await getDB();
  const result: Record<string, unknown[]> = {};
  for (const name of STORE_NAMES) {
    result[name] = await db.getAll(name as Parameters<typeof db.getAll>[0]);
  }
  return result;
}
