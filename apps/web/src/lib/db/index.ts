import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { HeroArchetype, Priority, UserRole } from '@questboard/shared';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_id: string | null;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login_at: string | null;
}

export interface AvatarRow {
  id: string;
  archetype: HeroArchetype;
  variant: 1 | 2 | 3 | 4;
  sprite_url: string;
  thumb_url: string;
}

export interface SessionRow {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface BoardRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  archived_at: string | null;
}

export interface BoardMemberRow {
  board_id: string;
  user_id: string;
  role: UserRole;
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

export interface LabelRow {
  id: string;
  board_id: string;
  name: string;
  colour: string;
}

export interface CardRow {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  start_date: string | null;
  end_date: string | null;
  estimate_hours: number | null;
  order_index: number;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  owner_ids: string[];
  label_ids: string[];
}

export interface SubstepRow {
  id: string;
  card_id: string;
  name: string;
  is_complete: boolean;
  order_index: number;
  target_date: string | null;
  created_at: string;
}

export interface TimeLogRow {
  id: string;
  card_id: string;
  user_id: string;
  minutes: number;
  is_billable: boolean;
  logged_at: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  card_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── DB Schema ────────────────────────────────────────────────────────────────

interface QBSchema extends DBSchema {
  users: {
    key: string;
    value: UserRow;
    indexes: { 'by-email': string; 'by-name': string };
  };
  avatars: {
    key: string;
    value: AvatarRow;
    indexes: { 'by-archetype': string };
  };
  sessions: {
    key: string;
    value: SessionRow;
    indexes: { 'by-user': string };
  };
  boards: {
    key: string;
    value: BoardRow;
  };
  board_members: {
    key: [string, string];
    value: BoardMemberRow;
    indexes: { 'by-board': string; 'by-user': string };
  };
  columns: {
    key: string;
    value: ColumnRow;
    indexes: { 'by-board': string };
  };
  labels: {
    key: string;
    value: LabelRow;
    indexes: { 'by-board': string };
  };
  cards: {
    key: string;
    value: CardRow;
    indexes: { 'by-board': string; 'by-column': string };
  };
  substeps: {
    key: string;
    value: SubstepRow;
    indexes: { 'by-card': string };
  };
  time_logs: {
    key: string;
    value: TimeLogRow;
    indexes: { 'by-card': string };
  };
  comments: {
    key: string;
    value: CommentRow;
    indexes: { 'by-card': string };
  };
}

const DB_NAME = 'questboard';
const DB_VERSION = 2; // bumped for Phase 3 stores

let _db: Promise<IDBPDatabase<QBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<QBSchema>> {
  if (!_db) {
    _db = openDB<QBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // ── v1 stores ────────────────────────────────────────────────────────
        if (oldVersion < 1) {
          const users = db.createObjectStore('users', { keyPath: 'id' });
          users.createIndex('by-email', 'email', { unique: true });
          users.createIndex('by-name', 'name', { unique: false });

          const avatars = db.createObjectStore('avatars', { keyPath: 'id' });
          avatars.createIndex('by-archetype', 'archetype', { unique: false });

          const sessions = db.createObjectStore('sessions', { keyPath: 'token' });
          sessions.createIndex('by-user', 'userId', { unique: false });

          db.createObjectStore('boards', { keyPath: 'id' });

          const bm = db.createObjectStore('board_members', { keyPath: ['board_id', 'user_id'] });
          bm.createIndex('by-board', 'board_id', { unique: false });
          bm.createIndex('by-user', 'user_id', { unique: false });

          const cols = db.createObjectStore('columns', { keyPath: 'id' });
          cols.createIndex('by-board', 'board_id', { unique: false });

          const labels = db.createObjectStore('labels', { keyPath: 'id' });
          labels.createIndex('by-board', 'board_id', { unique: false });

          const cards = db.createObjectStore('cards', { keyPath: 'id' });
          cards.createIndex('by-board', 'board_id', { unique: false });
          cards.createIndex('by-column', 'column_id', { unique: false });
        }

        // ── v2 stores (Phase 3) ──────────────────────────────────────────────
        if (oldVersion < 2) {
          const substeps = db.createObjectStore('substeps', { keyPath: 'id' });
          substeps.createIndex('by-card', 'card_id', { unique: false });

          const timeLogs = db.createObjectStore('time_logs', { keyPath: 'id' });
          timeLogs.createIndex('by-card', 'card_id', { unique: false });

          const comments = db.createObjectStore('comments', { keyPath: 'id' });
          comments.createIndex('by-card', 'card_id', { unique: false });
        }
      },
    });
  }
  return _db;
}

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
