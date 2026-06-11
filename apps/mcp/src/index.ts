/**
 * QuestBoard MCP Server
 *
 * Dual-mode process:
 *   • stdio  — MCP tools for Claude Code (read/write boards, cards, etc.)
 *   • HTTP :4002 — sync endpoint for the web app (receives IDB snapshots,
 *                  serves pull data so the browser picks up Claude's changes)
 *
 * Data lives in <repo-root>/data/questboard.json — a plain JSON file that
 * both this process and the web app treat as a shared source of truth.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import { readStore, writeStore, uid, now } from './store.js';
import type { CardRow, ColumnRow, BoardRow, SubstepRow, CommentRow } from './store.js';

// ── HTTP bridge (web app ↔ data file) ─────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// POST /sync — web app pushes incremental mutations or a full IDB snapshot
app.post('/sync', (req, res) => {
  try {
    const { type, payload } = req.body as { type: string; payload: unknown };
    const store = readStore();

    const upsert = <T extends { id: string }>(list: T[], item: T) => {
      const i = list.findIndex((x) => x.id === item.id);
      if (i >= 0) list[i] = item; else list.push(item);
    };

    switch (type) {
      case 'board:upsert':   upsert(store.boards,   payload as BoardRow);   break;
      case 'column:upsert':  upsert(store.columns,  payload as ColumnRow);  break;
      case 'card:upsert':    upsert(store.cards,    payload as CardRow);    break;
      case 'substep:upsert': upsert(store.substeps, payload as SubstepRow); break;
      case 'comment:upsert': upsert(store.comments, payload as CommentRow); break;

      case 'column:delete': {
        const { id } = payload as { id: string };
        store.columns = store.columns.filter((x) => x.id !== id);
        break;
      }
      case 'substep:delete': {
        const { id } = payload as { id: string };
        store.substeps = store.substeps.filter((x) => x.id !== id);
        break;
      }
      case 'comment:delete': {
        const { id } = payload as { id: string };
        store.comments = store.comments.filter((x) => x.id !== id);
        break;
      }

      case 'snapshot': {
        const snap = payload as Partial<typeof store>;
        if (snap.boards)   store.boards   = snap.boards;
        if (snap.columns)  store.columns  = snap.columns;
        if (snap.cards)    store.cards    = snap.cards;
        if (snap.substeps) store.substeps = snap.substeps;
        if (snap.comments) store.comments = snap.comments;
        break;
      }
    }

    writeStore(store);
    res.json({ ok: true, version: store.version });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /pull?since=<version> — web app polls for Claude's changes
app.get('/pull', (req, res) => {
  const store = readStore();
  const since = Number(req.query.since ?? 0);
  res.json({ ...store, changed: store.version > since });
});

// GET /version — lightweight version check before a full pull
app.get('/version', (_req, res) => {
  const { version, last_modified } = readStore();
  res.json({ version, last_modified });
});

app.listen(4002, () => {
  process.stderr.write('[QuestBoard MCP] Bridge HTTP server listening on :4002\n');
});

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_boards',
    description: 'List all active QuestBoard boards with column and card counts.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_board',
    description: 'Get a board with its columns and all active cards.',
    inputSchema: {
      type: 'object' as const,
      properties: { board_id: { type: 'string', description: 'Board UUID' } },
      required: ['board_id'],
    },
  },
  {
    name: 'create_board',
    description: 'Create a new board. Adds default columns: To Do, In Progress, Done.',
    inputSchema: {
      type: 'object' as const,
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'create_column',
    description: 'Add a column to an existing board.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        board_id: { type: 'string' },
        name: { type: 'string' },
        colour: { type: 'string', description: 'Hex colour, e.g. #5B4FCF' },
      },
      required: ['board_id', 'name'],
    },
  },
  {
    name: 'get_card',
    description: 'Get a card with its substeps (checklist) and comments.',
    inputSchema: {
      type: 'object' as const,
      properties: { card_id: { type: 'string' } },
      required: ['card_id'],
    },
  },
  {
    name: 'create_card',
    description: 'Create a card in a column.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        board_id: { type: 'string' },
        column_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        estimate_hours: { type: 'number' },
        end_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['board_id', 'column_id', 'title'],
    },
  },
  {
    name: 'update_card',
    description: 'Update card fields. Only pass fields you want to change.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        card_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        estimate_hours: { type: 'number' },
        end_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'move_card',
    description: 'Move a card to a different column.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        card_id: { type: 'string' },
        to_column_id: { type: 'string' },
      },
      required: ['card_id', 'to_column_id'],
    },
  },
  {
    name: 'archive_card',
    description: 'Archive (soft-delete) a card.',
    inputSchema: {
      type: 'object' as const,
      properties: { card_id: { type: 'string' } },
      required: ['card_id'],
    },
  },
  {
    name: 'search_cards',
    description: 'Full-text search across card titles and descriptions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' },
        board_id: { type: 'string', description: 'Optional — limit to one board' },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_substep',
    description: 'Add a checklist item to a card.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        card_id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['card_id', 'name'],
    },
  },
  {
    name: 'complete_substep',
    description: 'Mark a substep as complete or incomplete.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        substep_id: { type: 'string' },
        is_complete: { type: 'boolean' },
      },
      required: ['substep_id', 'is_complete'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a card.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        card_id: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['card_id', 'body'],
    },
  },
  {
    name: 'get_analytics',
    description: 'Summary analytics for a board: cards by column, priority breakdown, overdue cards.',
    inputSchema: {
      type: 'object' as const,
      properties: { board_id: { type: 'string' } },
      required: ['board_id'],
    },
  },
];

// ── MCP server ─────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'questboard', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const a = args as Record<string, unknown>;

  try {
    const store = readStore();

    switch (name) {
      // ── list_boards ─────────────────────────────────────────────────────────
      case 'list_boards': {
        const result = store.boards
          .filter((b) => !b.archived_at)
          .map((b) => ({
            id: b.id,
            name: b.name,
            created_at: b.created_at,
            columns: store.columns.filter((c) => c.board_id === b.id).length,
            cards: store.cards.filter((c) => c.board_id === b.id && !c.archived_at).length,
          }));
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      // ── get_board ───────────────────────────────────────────────────────────
      case 'get_board': {
        const board = store.boards.find((b) => b.id === a.board_id);
        if (!board) return { content: [{ type: 'text', text: `Board not found: ${a.board_id}` }] };
        const columns = store.columns
          .filter((c) => c.board_id === a.board_id)
          .sort((a, b) => a.order_index - b.order_index);
        const cards = store.cards
          .filter((c) => c.board_id === a.board_id && !c.archived_at)
          .sort((a, b) => a.order_index - b.order_index);
        return {
          content: [{ type: 'text', text: JSON.stringify({ board, columns, cards }, null, 2) }],
        };
      }

      // ── create_board ────────────────────────────────────────────────────────
      case 'create_board': {
        const boardId = uid();
        const board: BoardRow = {
          id: boardId,
          name: String(a.name),
          owner_id: 'claude',
          created_at: now(),
          archived_at: null,
        };
        const colDefs = [
          { name: 'To Do',       colour: '#5B4FCF' },
          { name: 'In Progress', colour: '#E07B2A' },
          { name: 'Done',        colour: '#2EA64A' },
        ];
        const columns: ColumnRow[] = colDefs.map((d, i) => ({
          id: uid(), board_id: boardId, name: d.name, colour: d.colour,
          order_index: i, wip_limit: null, created_at: now(),
        }));
        store.boards.push(board);
        store.columns.push(...columns);
        writeStore(store);
        return {
          content: [{ type: 'text', text: JSON.stringify({ board, columns }, null, 2) }],
        };
      }

      // ── create_column ───────────────────────────────────────────────────────
      case 'create_column': {
        const existing = store.columns.filter((c) => c.board_id === a.board_id);
        const column: ColumnRow = {
          id: uid(),
          board_id: String(a.board_id),
          name: String(a.name),
          colour: String(a.colour ?? '#5B4FCF'),
          order_index: existing.length,
          wip_limit: null,
          created_at: now(),
        };
        store.columns.push(column);
        writeStore(store);
        return { content: [{ type: 'text', text: JSON.stringify(column, null, 2) }] };
      }

      // ── get_card ────────────────────────────────────────────────────────────
      case 'get_card': {
        const card = store.cards.find((c) => c.id === a.card_id);
        if (!card) return { content: [{ type: 'text', text: `Card not found: ${a.card_id}` }] };
        const substeps = store.substeps
          .filter((s) => s.card_id === a.card_id)
          .sort((a, b) => a.order_index - b.order_index);
        const comments = store.comments
          .filter((c) => c.card_id === a.card_id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return {
          content: [{ type: 'text', text: JSON.stringify({ card, substeps, comments }, null, 2) }],
        };
      }

      // ── create_card ─────────────────────────────────────────────────────────
      case 'create_card': {
        const colCards = store.cards.filter(
          (c) => c.column_id === a.column_id && !c.archived_at,
        );
        const card: CardRow = {
          id: uid(),
          board_id: String(a.board_id),
          column_id: String(a.column_id),
          title: String(a.title),
          description: a.description != null ? String(a.description) : null,
          priority: (a.priority as CardRow['priority']) ?? 'medium',
          start_date: null,
          end_date: a.end_date != null ? String(a.end_date) : null,
          estimate_hours: a.estimate_hours != null ? Number(a.estimate_hours) : null,
          order_index: colCards.length,
          archived_at: null,
          created_by: 'claude',
          created_at: now(),
          updated_at: now(),
          owner_ids: [],
          label_ids: [],
          card_tags: [],
        };
        store.cards.push(card);
        writeStore(store);
        return { content: [{ type: 'text', text: JSON.stringify(card, null, 2) }] };
      }

      // ── update_card ─────────────────────────────────────────────────────────
      case 'update_card': {
        const card = store.cards.find((c) => c.id === a.card_id);
        if (!card) return { content: [{ type: 'text', text: `Card not found: ${a.card_id}` }] };
        if (a.title        !== undefined) card.title         = String(a.title);
        if (a.description  !== undefined) card.description   = a.description != null ? String(a.description) : null;
        if (a.priority     !== undefined) card.priority      = a.priority as CardRow['priority'];
        if (a.estimate_hours !== undefined) card.estimate_hours = a.estimate_hours != null ? Number(a.estimate_hours) : null;
        if (a.end_date     !== undefined) card.end_date      = a.end_date != null ? String(a.end_date) : null;
        card.updated_at = now();
        writeStore(store);
        return { content: [{ type: 'text', text: JSON.stringify(card, null, 2) }] };
      }

      // ── move_card ───────────────────────────────────────────────────────────
      case 'move_card': {
        const card = store.cards.find((c) => c.id === a.card_id);
        if (!card) return { content: [{ type: 'text', text: `Card not found: ${a.card_id}` }] };
        const fromCol = card.column_id;
        card.column_id  = String(a.to_column_id);
        card.updated_at = now();
        writeStore(store);
        const toColName  = store.columns.find((c) => c.id === a.to_column_id)?.name ?? a.to_column_id;
        const fromColName = store.columns.find((c) => c.id === fromCol)?.name ?? fromCol;
        return {
          content: [{
            type: 'text',
            text: `Moved "${card.title}" from "${fromColName}" → "${toColName}"`,
          }],
        };
      }

      // ── archive_card ────────────────────────────────────────────────────────
      case 'archive_card': {
        const card = store.cards.find((c) => c.id === a.card_id);
        if (!card) return { content: [{ type: 'text', text: `Card not found: ${a.card_id}` }] };
        card.archived_at = now();
        card.updated_at  = now();
        writeStore(store);
        return { content: [{ type: 'text', text: `Archived "${card.title}"` }] };
      }

      // ── search_cards ────────────────────────────────────────────────────────
      case 'search_cards': {
        const q = String(a.query).toLowerCase();
        const results = store.cards
          .filter((c) => {
            if (c.archived_at) return false;
            if (a.board_id && c.board_id !== a.board_id) return false;
            return (
              c.title.toLowerCase().includes(q) ||
              c.description?.toLowerCase().includes(q)
            );
          })
          .map((c) => ({
            id: c.id,
            title: c.title,
            priority: c.priority,
            column: store.columns.find((col) => col.id === c.column_id)?.name,
            board: store.boards.find((b) => b.id === c.board_id)?.name,
          }));
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      // ── add_substep ─────────────────────────────────────────────────────────
      case 'add_substep': {
        const existing = store.substeps.filter((s) => s.card_id === a.card_id);
        const substep = {
          id: uid(),
          card_id: String(a.card_id),
          name: String(a.name),
          is_complete: false,
          order_index: existing.length,
          created_at: now(),
        };
        store.substeps.push(substep);
        writeStore(store);
        return { content: [{ type: 'text', text: JSON.stringify(substep, null, 2) }] };
      }

      // ── complete_substep ────────────────────────────────────────────────────
      case 'complete_substep': {
        const substep = store.substeps.find((s) => s.id === a.substep_id);
        if (!substep) return { content: [{ type: 'text', text: `Substep not found: ${a.substep_id}` }] };
        substep.is_complete = Boolean(a.is_complete);
        writeStore(store);
        return {
          content: [{
            type: 'text',
            text: `"${substep.name}" marked ${substep.is_complete ? '✅ complete' : '⬜ incomplete'}`,
          }],
        };
      }

      // ── add_comment ─────────────────────────────────────────────────────────
      case 'add_comment': {
        const comment = {
          id: uid(),
          card_id: String(a.card_id),
          user_id: 'claude',
          body: String(a.body),
          created_at: now(),
          updated_at: now(),
        };
        store.comments.push(comment);
        writeStore(store);
        return { content: [{ type: 'text', text: JSON.stringify(comment, null, 2) }] };
      }

      // ── get_analytics ───────────────────────────────────────────────────────
      case 'get_analytics': {
        const board = store.boards.find((b) => b.id === a.board_id);
        if (!board) return { content: [{ type: 'text', text: `Board not found: ${a.board_id}` }] };
        const columns = store.columns.filter((c) => c.board_id === a.board_id);
        const cards   = store.cards.filter((c) => c.board_id === a.board_id && !c.archived_at);
        const today   = new Date().toISOString().slice(0, 10);

        const byColumn  = columns.map((col) => ({
          column: col.name,
          count: cards.filter((c) => c.column_id === col.id).length,
        }));
        const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
        const overdue: string[] = [];
        for (const c of cards) {
          byPriority[c.priority] = (byPriority[c.priority] ?? 0) + 1;
          if (c.end_date && c.end_date < today) overdue.push(c.title);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              board: board.name,
              total_cards: cards.length,
              by_column: byColumn,
              by_priority: byPriority,
              overdue_count: overdue.length,
              overdue,
            }, null, 2),
          }],
        };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${String(e)}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
