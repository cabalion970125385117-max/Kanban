import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { CardAssignmentRow, NotificationRow } from '@/lib/db/index';
import type { Priority } from '@questboard/shared';

export interface AssignmentWithCard {
  assignment: CardAssignmentRow;
  assignedBy: { id: string; name: string };
}

export interface InboxNotification extends NotificationRow {
  senderName?: string;
}

function currentUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Pending assignments ───────────────────────────────────────────────────────

export async function getMyPendingAssignments(boardId: string): Promise<AssignmentWithCard[]> {
  const db = await getDB();
  const userId = currentUserId();
  const allForUser = await db.getAllFromIndex('card_assignments', 'by-user', userId);
  const pending = allForUser.filter((a) => a.board_id === boardId && a.status === 'pending');

  const results: AssignmentWithCard[] = [];
  for (const a of pending) {
    const assignedBy = await db.get('users', a.assigned_by_id);
    if (!assignedBy) continue;
    results.push({ assignment: a, assignedBy: { id: assignedBy.id, name: assignedBy.name } });
  }
  return results;
}

// ── Rejected log ─────────────────────────────────────────────────────────────

export async function getMyRejectedAssignments(boardId: string): Promise<AssignmentWithCard[]> {
  const db = await getDB();
  const userId = currentUserId();
  const allForUser = await db.getAllFromIndex('card_assignments', 'by-user', userId);
  const rejected = allForUser
    .filter((a) => a.board_id === boardId && a.status === 'rejected')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const results: AssignmentWithCard[] = [];
  for (const a of rejected) {
    const assignedBy = await db.get('users', a.assigned_by_id);
    if (!assignedBy) continue;
    results.push({ assignment: a, assignedBy: { id: assignedBy.id, name: assignedBy.name } });
  }
  return results;
}

// ── Notifications (system / announcement) ────────────────────────────────────

export async function getInboxNotifications(): Promise<InboxNotification[]> {
  const db = await getDB();
  const userId = currentUserId();
  const all = await db.getAllFromIndex('notifications', 'by-user', userId);
  const filtered = all
    .filter((n) => n.type === 'announcement' || n.type === 'system')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return filtered;
}

export async function markNotificationRead(id: string): Promise<void> {
  const db = await getDB();
  const n = await db.get('notifications', id);
  if (n && !n.is_read) {
    await db.put('notifications', { ...n, is_read: true });
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const db = await getDB();
  const userId = currentUserId();
  const all = await db.getAllFromIndex('notifications', 'by-user', userId);
  for (const n of all.filter((n) => !n.is_read)) {
    await db.put('notifications', { ...n, is_read: true });
  }
}

// ── Issue / accept / reject ───────────────────────────────────────────────────

export async function issueCard(
  boardId: string,
  title: string,
  assigneeId: string,
  priority: Priority = 'medium',
): Promise<CardAssignmentRow> {
  const db = await getDB();
  const issuerId = currentUserId();

  const assignment: CardAssignmentRow = {
    id: uid(),
    card_id: null,
    board_id: boardId,
    user_id: assigneeId,
    assigned_by_id: issuerId,
    card_title: title.trim(),
    card_priority: priority,
    status: 'pending',
    created_at: now(),
  };
  await db.put('card_assignments', assignment);

  // Drop a notification for the assignee so their inbox lights up
  await db.put('notifications', {
    id: uid(),
    user_id: assigneeId,
    type: 'system',
    title: 'New card assigned',
    message: `"${assignment.card_title}" was assigned to you by ${
      (await db.get('users', issuerId))?.name ?? 'someone'
    }`,
    is_read: false,
    created_at: now(),
  });

  return assignment;
}

export async function acceptAssignment(assignmentId: string): Promise<string> {
  const db = await getDB();
  const a = await db.get('card_assignments', assignmentId);
  if (!a) throw new Error('Assignment not found');

  const cols = await db.getAllFromIndex('columns', 'by-board', a.board_id);
  cols.sort((col1, col2) => col1.order_index - col2.order_index);
  if (!cols.length) throw new Error('Board has no columns');
  const column = cols[0];

  const existing = await db.getAllFromIndex('cards', 'by-column', column.id);
  const orderIndex = existing.filter((c) => !c.archived_at).length;

  const cardId = uid();
  await db.put('cards', {
    id: cardId,
    board_id: a.board_id,
    column_id: column.id,
    title: a.card_title,
    description: null,
    priority: a.card_priority,
    start_date: null,
    end_date: null,
    estimate_hours: null,
    order_index: orderIndex,
    archived_at: null,
    created_by: a.assigned_by_id,
    created_at: now(),
    updated_at: now(),
    owner_ids: [a.user_id],
    label_ids: [],
  });

  await db.put('card_assignments', { ...a, status: 'accepted', card_id: cardId });
  return cardId;
}

export async function rejectAssignment(assignmentId: string): Promise<void> {
  const db = await getDB();
  const a = await db.get('card_assignments', assignmentId);
  if (!a) return;
  await db.put('card_assignments', { ...a, status: 'rejected' });
}
