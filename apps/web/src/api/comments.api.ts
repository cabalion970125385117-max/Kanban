import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { Comment } from '@questboard/shared';
import type { CommentRow } from '@/lib/db';

async function toComment(row: CommentRow): Promise<Comment> {
  const db = await getDB();
  const user = await db.get('users', row.user_id);
  const avatar = user?.avatar_id ? await db.get('avatars', user.avatar_id) : undefined;
  return {
    id: row.id,
    card_id: row.card_id,
    user_id: row.user_id,
    user_name: user?.name ?? 'Unknown',
    user_avatar: avatar?.thumb_url,
    body: row.body,
    parent_id: row.parent_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getComments(cardId: string): Promise<Comment[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('comments', 'by-card', cardId);
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return Promise.all(rows.map(toComment));
}

export async function createComment(
  cardId: string,
  data: { body: string; parent_id?: string | null },
): Promise<Comment> {
  const userId = useAuthStore.getState().user?.id ?? 'unknown';
  const row: CommentRow = {
    id: uid(),
    card_id: cardId,
    user_id: userId,
    body: data.body,
    parent_id: data.parent_id ?? null,
    created_at: now(),
    updated_at: now(),
  };
  const db = await getDB();
  await db.put('comments', row);
  return toComment(row);
}

export async function updateComment(
  commentId: string,
  data: { body: string },
): Promise<Comment> {
  const db = await getDB();
  const row = await db.get('comments', commentId);
  if (!row) throw new Error('Comment not found');
  const updated = { ...row, body: data.body, updated_at: now() };
  await db.put('comments', updated);
  return toComment(updated);
}

export async function deleteComment(commentId: string): Promise<void> {
  const db = await getDB();
  await db.delete('comments', commentId);
}
