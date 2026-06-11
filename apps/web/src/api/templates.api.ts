/**
 * templates.api.ts — Board template CRUD + built-in template definitions.
 * Built-in templates are constants (never stored in IDB).
 * User-saved templates live in the `board_templates` IDB store.
 */
import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { BoardTemplateRow } from '@/lib/db';
import type { Board } from '@questboard/shared';

// Re-export for external consumers
export type Template = BoardTemplateRow;

// ── Built-in templates ────────────────────────────────────────────────────────

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: 'builtin-scrum',
    name: 'Scrum Sprint',
    description: 'Classic Scrum workflow with backlog, sprint backlog, and done columns. Add WIP limits to keep your team focused.',
    icon: '🏃',
    is_builtin: true,
    source_board_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    columns: [
      { name: 'Backlog', colour: '#64748b', wip_limit: null, order_index: 0 },
      { name: 'Sprint Backlog', colour: '#3b82f6', wip_limit: null, order_index: 1 },
      { name: 'In Progress', colour: '#f97316', wip_limit: 3, order_index: 2 },
      { name: 'In Review', colour: '#8b5cf6', wip_limit: null, order_index: 3 },
      { name: 'Done', colour: '#22c55e', wip_limit: null, order_index: 4 },
    ],
    sample_cards: [
      { title: 'Set up project repository', column_index: 0, priority: 'high' },
      { title: 'Design system architecture', column_index: 0, priority: 'high' },
      { title: 'Write initial test suite', column_index: 1, priority: 'medium' },
      { title: 'Implement authentication', column_index: 2, priority: 'high' },
      { title: 'Code review guidelines', column_index: 3, priority: 'low' },
    ],
  },
  {
    id: 'builtin-kanban',
    name: 'Simple Kanban',
    description: 'The classic three-column board. Zero overhead, maximum clarity. Perfect for individuals and small teams.',
    icon: '📋',
    is_builtin: true,
    source_board_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    columns: [
      { name: 'To Do', colour: '#5B4FCF', wip_limit: null, order_index: 0 },
      { name: 'In Progress', colour: '#f97316', wip_limit: null, order_index: 1 },
      { name: 'Done', colour: '#22c55e', wip_limit: null, order_index: 2 },
    ],
    sample_cards: [
      { title: 'Define project goals', column_index: 0, priority: 'high' },
      { title: 'Research competitors', column_index: 0, priority: 'medium' },
      { title: 'Build initial prototype', column_index: 1, priority: 'high' },
      { title: 'Onboarding documentation', column_index: 2, priority: 'low' },
    ],
  },
  {
    id: 'builtin-bug-tracker',
    name: 'Bug Tracker',
    description: 'Track bugs from first report to resolution. Includes triage and testing gates to ensure nothing ships broken.',
    icon: '🐛',
    is_builtin: true,
    source_board_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    columns: [
      { name: 'New', colour: '#ef4444', wip_limit: null, order_index: 0 },
      { name: 'Triaged', colour: '#f97316', wip_limit: null, order_index: 1 },
      { name: 'In Progress', colour: '#3b82f6', wip_limit: null, order_index: 2 },
      { name: 'Testing', colour: '#8b5cf6', wip_limit: null, order_index: 3 },
      { name: 'Resolved', colour: '#22c55e', wip_limit: null, order_index: 4 },
      { name: 'Closed', colour: '#64748b', wip_limit: null, order_index: 5 },
    ],
    sample_cards: [
      { title: 'Login page crashes on Safari', column_index: 0, priority: 'critical' },
      { title: 'Avatar upload fails > 2MB', column_index: 1, priority: 'high' },
      { title: 'Dashboard tooltip misaligned', column_index: 2, priority: 'medium' },
      { title: 'CSV export encoding issue', column_index: 3, priority: 'high' },
      { title: 'Dark mode contrast fix', column_index: 4, priority: 'low' },
    ],
  },
  {
    id: 'builtin-content-calendar',
    name: 'Content Calendar',
    description: 'Manage content from ideation to publication. Assign due dates and track every piece through your editorial pipeline.',
    icon: '📅',
    is_builtin: true,
    source_board_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    columns: [
      { name: 'Ideas', colour: '#06b6d4', wip_limit: null, order_index: 0 },
      { name: 'Writing', colour: '#3b82f6', wip_limit: null, order_index: 1 },
      { name: 'Review', colour: '#f97316', wip_limit: null, order_index: 2 },
      { name: 'Scheduled', colour: '#8b5cf6', wip_limit: null, order_index: 3 },
      { name: 'Published', colour: '#22c55e', wip_limit: null, order_index: 4 },
    ],
    sample_cards: [
      { title: 'Q3 product blog post', column_index: 0, priority: 'medium' },
      { title: 'Customer success story', column_index: 1, priority: 'high' },
      { title: 'Release notes announcement', column_index: 2, priority: 'high' },
      { title: 'Monthly newsletter', column_index: 3, priority: 'medium' },
      { title: 'Getting started guide', column_index: 4, priority: 'low' },
    ],
  },
  {
    id: 'builtin-product-launch',
    name: 'Product Launch',
    description: 'End-to-end product launch from discovery to live. Keeps design, development, and QA in one clear view.',
    icon: '🚀',
    is_builtin: true,
    source_board_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    columns: [
      { name: 'Discovery', colour: '#06b6d4', wip_limit: null, order_index: 0 },
      { name: 'Design', colour: '#8b5cf6', wip_limit: null, order_index: 1 },
      { name: 'Development', colour: '#3b82f6', wip_limit: null, order_index: 2 },
      { name: 'QA', colour: '#f97316', wip_limit: null, order_index: 3 },
      { name: 'Staging', colour: '#eab308', wip_limit: null, order_index: 4 },
      { name: 'Live', colour: '#22c55e', wip_limit: null, order_index: 5 },
    ],
    sample_cards: [
      { title: 'User research synthesis', column_index: 0, priority: 'high' },
      { title: 'Wireframes & prototypes', column_index: 1, priority: 'high' },
      { title: 'Core feature development', column_index: 2, priority: 'critical' },
      { title: 'End-to-end testing', column_index: 3, priority: 'high' },
      { title: 'Performance benchmarks', column_index: 4, priority: 'medium' },
    ],
  },
];

// ── User-saved templates (IDB) ────────────────────────────────────────────────

export async function getUserTemplates(): Promise<Template[]> {
  const db = await getDB();
  return db.getAll('board_templates');
}

export async function getAllTemplates(): Promise<Template[]> {
  const user = await getUserTemplates();
  return [...BUILTIN_TEMPLATES, ...user];
}

export async function saveBoardAsTemplate(
  boardId: string,
  name: string,
  description: string,
): Promise<Template> {
  const db = await getDB();
  const cols = await db.getAllFromIndex('columns', 'by-board', boardId);
  const sorted = [...cols].sort((a, b) => a.order_index - b.order_index);

  const template: Template = {
    id: uid(),
    name: name.trim(),
    description: description.trim(),
    icon: '📌',
    is_builtin: false,
    source_board_id: boardId,
    created_at: now(),
    columns: sorted.map((c) => ({
      name: c.name,
      colour: c.colour,
      wip_limit: c.wip_limit,
      order_index: c.order_index,
    })),
    sample_cards: [],
  };

  await db.put('board_templates', template);
  return template;
}

export async function deleteUserTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('board_templates', id);
}

// ── Create board from template ────────────────────────────────────────────────

export async function createBoardFromTemplate(
  template: Template,
  boardName: string,
  includeSampleCards: boolean,
): Promise<Board> {
  const db = await getDB();
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('Not authenticated');

  const boardId = uid();
  const boardRow = {
    id: boardId,
    name: boardName.trim(),
    owner_id: userId,
    created_at: now(),
    archived_at: null,
  };

  await db.put('boards', boardRow);
  await db.put('board_members', { board_id: boardId, user_id: userId, role: 'admin' });

  // Create columns
  const columnIds: string[] = [];
  for (const col of template.columns) {
    const colId = uid();
    columnIds.push(colId);
    await db.put('columns', {
      id: colId,
      board_id: boardId,
      name: col.name,
      colour: col.colour,
      order_index: col.order_index,
      wip_limit: col.wip_limit,
      created_at: now(),
    });
  }

  // Optionally create sample cards
  if (includeSampleCards && template.sample_cards.length > 0) {
    for (let i = 0; i < template.sample_cards.length; i++) {
      const sc = template.sample_cards[i];
      const colId = columnIds[sc.column_index];
      if (!colId) continue;
      await db.put('cards', {
        id: uid(),
        board_id: boardId,
        column_id: colId,
        title: sc.title,
        description: null,
        priority: sc.priority,
        start_date: null,
        end_date: null,
        estimate_hours: null,
        order_index: i,
        archived_at: null,
        created_by: userId,
        created_at: now(),
        updated_at: now(),
        cover_colour: null,
        card_tags: [],
        owner_ids: [],
        label_ids: [],
      });
    }
  }

  return { ...boardRow, member_count: 1 };
}
