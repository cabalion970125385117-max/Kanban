/**
 * sprints.api.ts — Sprint CRUD and sprint card membership.
 * Sprints don't move cards between columns — they track which cards are
 * committed to a time-boxed iteration while cards remain in their columns.
 */
import { getDB, uid, now } from '@/lib/db';
import type { SprintRow, SprintCardRow, CardRow } from '@/lib/db';

export type { SprintRow, SprintCardRow };

// ── helpers ───────────────────────────────────────────────────────────────────

function makeError(message: string, status = 400): Error {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

// ── Sprints ───────────────────────────────────────────────────────────────────

export async function getSprints(boardId: string): Promise<SprintRow[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('sprints', 'by-board', boardId);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getActiveSprint(boardId: string): Promise<SprintRow | null> {
  const sprints = await getSprints(boardId);
  return sprints.find((s) => s.status === 'active') ?? null;
}

export interface CreateSprintInput {
  board_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
}

export async function createSprint(data: CreateSprintInput): Promise<SprintRow> {
  const db = await getDB();
  const sprint: SprintRow = {
    id: uid(),
    board_id: data.board_id,
    name: data.name.trim(),
    goal: data.goal?.trim() || null,
    start_date: data.start_date,
    end_date: data.end_date,
    status: 'planning',
    created_at: now(),
    completed_at: null,
  };
  await db.put('sprints', sprint);
  return sprint;
}

export async function updateSprint(
  id: string,
  patch: Partial<Pick<SprintRow, 'name' | 'goal' | 'start_date' | 'end_date'>>,
): Promise<SprintRow> {
  const db = await getDB();
  const existing = await db.get('sprints', id);
  if (!existing) throw makeError('Sprint not found', 404);
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw makeError('Cannot edit a completed or cancelled sprint');
  }
  const updated = { ...existing, ...patch };
  await db.put('sprints', updated);
  return updated;
}

export async function startSprint(id: string): Promise<SprintRow> {
  const db = await getDB();
  const sprint = await db.get('sprints', id);
  if (!sprint) throw makeError('Sprint not found', 404);
  if (sprint.status !== 'planning') throw makeError('Only a planning sprint can be started');

  // Guard: no other sprint can be active on this board
  const boardSprints = await db.getAllFromIndex('sprints', 'by-board', sprint.board_id);
  if (boardSprints.some((s) => s.id !== id && s.status === 'active')) {
    throw makeError('Another sprint is already active on this board');
  }

  const updated = { ...sprint, status: 'active' as const };
  await db.put('sprints', updated);
  return updated;
}

export async function completeSprint(id: string): Promise<SprintRow> {
  const db = await getDB();
  const sprint = await db.get('sprints', id);
  if (!sprint) throw makeError('Sprint not found', 404);
  if (sprint.status !== 'active') throw makeError('Only an active sprint can be completed');

  const updated = { ...sprint, status: 'completed' as const, completed_at: now() };
  await db.put('sprints', updated);
  return updated;
}

export async function cancelSprint(id: string): Promise<SprintRow> {
  const db = await getDB();
  const sprint = await db.get('sprints', id);
  if (!sprint) throw makeError('Sprint not found', 404);
  if (sprint.status === 'completed') throw makeError('Cannot cancel a completed sprint');

  const updated = { ...sprint, status: 'cancelled' as const };
  await db.put('sprints', updated);
  return updated;
}

export async function deleteSprint(id: string): Promise<void> {
  const db = await getDB();
  const sprint = await db.get('sprints', id);
  if (!sprint) return;
  if (sprint.status === 'active') throw makeError('Cannot delete an active sprint. Complete or cancel it first.');

  // Remove all sprint_card memberships
  const cards = await db.getAllFromIndex('sprint_cards', 'by-sprint', id);
  for (const sc of cards) await db.delete('sprint_cards', sc.id);

  await db.delete('sprints', id);
}

// ── Sprint cards ──────────────────────────────────────────────────────────────

export async function getSprintCardRows(sprintId: string): Promise<SprintCardRow[]> {
  const db = await getDB();
  return db.getAllFromIndex('sprint_cards', 'by-sprint', sprintId);
}

/** Returns full CardRow objects for all cards in the sprint (excludes archived). */
export async function getSprintCards(sprintId: string): Promise<CardRow[]> {
  const db = await getDB();
  const scRows = await db.getAllFromIndex('sprint_cards', 'by-sprint', sprintId);
  const cards: CardRow[] = [];
  for (const sc of scRows) {
    const card = await db.get('cards', sc.card_id);
    if (card && !card.archived_at) cards.push(card);
  }
  return cards;
}

export async function addCardToSprint(sprintId: string, cardId: string): Promise<SprintCardRow> {
  const db = await getDB();
  // Idempotent: check if already in sprint
  const existing = await db.getAllFromIndex('sprint_cards', 'by-sprint', sprintId);
  const alreadyIn = existing.find((sc) => sc.card_id === cardId);
  if (alreadyIn) return alreadyIn;

  const row: SprintCardRow = {
    id: uid(),
    sprint_id: sprintId,
    card_id: cardId,
    added_at: now(),
  };
  await db.put('sprint_cards', row);
  return row;
}

export async function removeCardFromSprint(sprintId: string, cardId: string): Promise<void> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('sprint_cards', 'by-sprint', sprintId);
  const row = rows.find((sc) => sc.card_id === cardId);
  if (row) await db.delete('sprint_cards', row.id);
}

export async function isCardInSprint(sprintId: string, cardId: string): Promise<boolean> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('sprint_cards', 'by-sprint', sprintId);
  return rows.some((sc) => sc.card_id === cardId);
}

/** Returns the set of card IDs that are in *any* sprint on this board. */
export async function getSprintCardIdSet(boardId: string): Promise<Set<string>> {
  const db = await getDB();
  const sprints = await db.getAllFromIndex('sprints', 'by-board', boardId);
  const activeSprint = sprints.find((s) => s.status === 'active');
  if (!activeSprint) return new Set();
  const scRows = await db.getAllFromIndex('sprint_cards', 'by-sprint', activeSprint.id);
  return new Set(scRows.map((r) => r.card_id));
}
