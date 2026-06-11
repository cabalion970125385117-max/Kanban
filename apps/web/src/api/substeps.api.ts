import { getDB, uid, now } from '@/lib/db';
import type { Substep } from '@questboard/shared';
import type { SubstepRow } from '@/lib/db';

function toSubstep(row: SubstepRow): Substep {
  return {
    id: row.id,
    card_id: row.card_id,
    name: row.name,
    is_complete: row.is_complete,
    order_index: row.order_index,
    target_date: row.target_date,
    created_at: row.created_at,
  };
}

export async function getSubsteps(cardId: string): Promise<Substep[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('substeps', 'by-card', cardId);
  return rows.sort((a, b) => a.order_index - b.order_index).map(toSubstep);
}

export async function createSubstep(
  cardId: string,
  data: { name: string; target_date?: string | null },
): Promise<Substep> {
  const db = await getDB();
  const existing = await db.getAllFromIndex('substeps', 'by-card', cardId);
  const maxOrder = existing.reduce((m, s) => Math.max(m, s.order_index), -1);
  const row: SubstepRow = {
    id: uid(),
    card_id: cardId,
    name: data.name,
    is_complete: false,
    order_index: maxOrder + 1,
    target_date: data.target_date ?? null,
    created_at: now(),
  };
  await db.put('substeps', row);
  return toSubstep(row);
}

export async function updateSubstep(
  substepId: string,
  data: Partial<Pick<Substep, 'name' | 'is_complete' | 'target_date'>>,
): Promise<Substep> {
  const db = await getDB();
  const row = await db.get('substeps', substepId);
  if (!row) throw new Error('Substep not found');
  const updated = { ...row, ...data };
  await db.put('substeps', updated);
  return toSubstep(updated);
}

export async function deleteSubstep(substepId: string): Promise<void> {
  const db = await getDB();
  await db.delete('substeps', substepId);
}

export async function reorderSubsteps(cardId: string, orderedIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('substeps', 'readwrite');
  for (let i = 0; i < orderedIds.length; i++) {
    const row = await tx.store.get(orderedIds[i]);
    if (row && row.card_id === cardId) {
      await tx.store.put({ ...row, order_index: i });
    }
  }
  await tx.done;
}
