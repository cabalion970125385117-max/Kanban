import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { CardReactionRow } from '@/lib/db';

function currentUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getReactions(cardId: string): Promise<CardReactionRow[]> {
  const db = await getDB();
  return db.getAllFromIndex('card_reactions', 'by-card', cardId);
}

export async function toggleReaction(cardId: string, emoji: string): Promise<CardReactionRow[]> {
  const db = await getDB();
  const userId = currentUserId();
  const all = await db.getAllFromIndex('card_reactions', 'by-card', cardId);
  const existing = all.find((r) => r.user_id === userId && r.emoji === emoji);

  if (existing) {
    await db.delete('card_reactions', existing.id);
  } else {
    const row: CardReactionRow = {
      id: uid(),
      card_id: cardId,
      user_id: userId,
      emoji,
      created_at: now(),
    };
    await db.put('card_reactions', row);
  }

  return db.getAllFromIndex('card_reactions', 'by-card', cardId);
}
