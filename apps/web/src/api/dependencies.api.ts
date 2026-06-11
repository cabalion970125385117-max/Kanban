import { getDB, uid, now } from '@/lib/db';
import type { CardDependencyRow, DependencyRelType } from '@/lib/db';

export async function getDependencies(cardId: string): Promise<CardDependencyRow[]> {
  const db = await getDB();
  return db.getAllFromIndex('card_dependencies', 'by-card', cardId);
}

export async function addDependency(
  cardId: string,
  relatedCardId: string,
  relType: DependencyRelType,
): Promise<CardDependencyRow> {
  const db = await getDB();
  // Prevent duplicates of same rel_type between same pair
  const existing = await db.getAllFromIndex('card_dependencies', 'by-card', cardId);
  const dupe = existing.find((d) => d.related_card_id === relatedCardId && d.rel_type === relType);
  if (dupe) return dupe;

  const row: CardDependencyRow = {
    id: uid(),
    card_id: cardId,
    related_card_id: relatedCardId,
    rel_type: relType,
    created_at: now(),
  };
  await db.put('card_dependencies', row);
  return row;
}

export async function removeDependency(depId: string): Promise<void> {
  const db = await getDB();
  await db.delete('card_dependencies', depId);
}
