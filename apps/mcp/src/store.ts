import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../../data');
const DATA_FILE = join(DATA_DIR, 'questboard.json');

export interface BoardRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  archived_at: string | null;
}

export interface ColumnRow {
  id: string;
  board_id: string;
  name: string;
  colour: string;
  order_index: number;
  wip_limit: number | null;
  created_at: string;
}

export interface CardRow {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string | null;
  end_date: string | null;
  estimate_hours: number | null;
  order_index: number;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // web-app extras (may not be present on MCP-created cards)
  owner_ids?: string[];
  label_ids?: string[];
  cover_colour?: string | null;
  card_tags?: string[];
}

export interface SubstepRow {
  id: string;
  card_id: string;
  name: string;
  is_complete: boolean;
  order_index: number;
  created_at: string;
}

export interface CommentRow {
  id: string;
  card_id: string;
  body: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Store {
  boards: BoardRow[];
  columns: ColumnRow[];
  cards: CardRow[];
  substeps: SubstepRow[];
  comments: CommentRow[];
  version: number;
  last_modified: string;
}

const DEFAULT: Store = {
  boards: [],
  columns: [],
  cards: [],
  substeps: [],
  comments: [],
  version: 0,
  last_modified: new Date().toISOString(),
};

export function readStore(): Store {
  try {
    if (!existsSync(DATA_FILE)) return { ...DEFAULT };
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as Store;
  } catch {
    return { ...DEFAULT };
  }
}

export function writeStore(data: Store): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  data.version = (data.version ?? 0) + 1;
  data.last_modified = new Date().toISOString();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
