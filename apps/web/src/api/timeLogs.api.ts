import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { TimeLog } from '@questboard/shared';
import type { TimeLogRow } from '@/lib/db';

async function toTimeLog(row: TimeLogRow): Promise<TimeLog> {
  const db = await getDB();
  const user = await db.get('users', row.user_id);
  return {
    id: row.id,
    card_id: row.card_id,
    user_id: row.user_id,
    user_name: user?.name,
    minutes: row.minutes,
    is_billable: row.is_billable,
    logged_at: row.logged_at,
    note: row.note,
    created_at: row.created_at,
  };
}

export async function getTimeLogs(cardId: string): Promise<TimeLog[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('time_logs', 'by-card', cardId);
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return Promise.all(rows.map(toTimeLog));
}

export async function createTimeLog(
  cardId: string,
  data: { minutes: number; note?: string | null; logged_at?: string; is_billable?: boolean },
): Promise<TimeLog> {
  const userId = useAuthStore.getState().user?.id ?? 'unknown';
  const row: TimeLogRow = {
    id: uid(),
    card_id: cardId,
    user_id: userId,
    minutes: data.minutes,
    is_billable: data.is_billable ?? false,
    logged_at: data.logged_at ?? new Date().toISOString().slice(0, 10),
    note: data.note ?? null,
    created_at: now(),
  };
  const db = await getDB();
  await db.put('time_logs', row);
  return toTimeLog(row);
}

export async function deleteTimeLog(logId: string): Promise<void> {
  const db = await getDB();
  await db.delete('time_logs', logId);
}

/** Sum of all logged minutes for a card */
export async function getTotalMinutes(cardId: string): Promise<number> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('time_logs', 'by-card', cardId);
  return rows.reduce((sum, r) => sum + r.minutes, 0);
}
