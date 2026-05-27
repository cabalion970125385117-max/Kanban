import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { HeroArchetype, Priority, UserRole, TriggerType, RuleCondition, RuleAction } from '@questboard/shared';

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

export interface AttachmentRow {
  id: string;
  card_id: string;
  user_id: string;
  name: string;
  mime_type: string;
  size: number;
  data: string; // base64 data URL
  created_at: string;
}

export interface LoginAttemptRow {
  id: string;
  identifier: string;
  success: boolean;
  userId: string | null;
  timestamp: string;
}

export interface BugReportRow {
  id: string;
  title: string;
  description: string;
  category: 'ui_bug' | 'functionality' | 'performance' | 'security' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  current_page: string;
  submitted_by: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}

export interface ErrorLogRow {
  id: string;
  message: string;
  stack: string | null;
  page_url: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: 'announcement' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  sent_by: string;
  sent_to_count: number;
  created_at: string;
}

export interface AutomationRuleRow {
  id: string;
  board_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, string>;
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  created_at: string;
}

export interface CardAssignmentRow {
  id: string;
  card_id: string | null;  // null until accepted
  board_id: string;
  user_id: string;         // assigned to
  assigned_by_id: string;  // assigned by
  card_title: string;
  card_priority: Priority;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
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
  attachments: {
    key: string;
    value: AttachmentRow;
    indexes: { 'by-card': string };
  };
  login_attempts: {
    key: string;
    value: LoginAttemptRow;
    indexes: { 'by-timestamp': string };
  };
  bug_reports: {
    key: string;
    value: BugReportRow;
    indexes: { 'by-status': string; 'by-severity': string };
  };
  error_logs: {
    key: string;
    value: ErrorLogRow;
    indexes: { 'by-timestamp': string };
  };
  notifications: {
    key: string;
    value: NotificationRow;
    indexes: { 'by-user': string; 'by-type': string };
  };
  announcements: {
    key: string;
    value: AnnouncementRow;
    indexes: { 'by-timestamp': string };
  };
  automation_rules: {
    key: string;
    value: AutomationRuleRow;
    indexes: { 'by-board': string };
  };
  card_assignments: {
    key: string;
    value: CardAssignmentRow;
    indexes: { 'by-user': string; 'by-board': string; 'by-card': string };
  };
}

const DB_NAME = 'questboard';
const DB_VERSION = 7; // v7 adds card_assignments

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

        // ── v3 stores (attachments) ──────────────────────────────────────────
        if (oldVersion < 3) {
          const attachments = db.createObjectStore('attachments', { keyPath: 'id' });
          attachments.createIndex('by-card', 'card_id', { unique: false });
        }

        // ── v4 stores (maintenance / observability) ──────────────────────────
        if (oldVersion < 4) {
          const attempts = db.createObjectStore('login_attempts', { keyPath: 'id' });
          attempts.createIndex('by-timestamp', 'timestamp', { unique: false });

          const bugs = db.createObjectStore('bug_reports', { keyPath: 'id' });
          bugs.createIndex('by-status', 'status', { unique: false });
          bugs.createIndex('by-severity', 'severity', { unique: false });

          const errors = db.createObjectStore('error_logs', { keyPath: 'id' });
          errors.createIndex('by-timestamp', 'created_at', { unique: false });
        }

        // ── v5 stores (notifications / announcements) ────────────────────────
        if (oldVersion < 5) {
          const notifs = db.createObjectStore('notifications', { keyPath: 'id' });
          notifs.createIndex('by-user', 'user_id', { unique: false });
          notifs.createIndex('by-type', 'type', { unique: false });

          const ann = db.createObjectStore('announcements', { keyPath: 'id' });
          ann.createIndex('by-timestamp', 'created_at', { unique: false });
        }

        // ── v6 stores (automation rules) ─────────────────────────────────────
        if (oldVersion < 6) {
          const rules = db.createObjectStore('automation_rules', { keyPath: 'id' });
          rules.createIndex('by-board', 'board_id', { unique: false });
        }

        // ── v7 stores (card assignments / inbox) ─────────────────────────────
        if (oldVersion < 7) {
          const asgn = db.createObjectStore('card_assignments', { keyPath: 'id' });
          asgn.createIndex('by-user', 'user_id', { unique: false });
          asgn.createIndex('by-board', 'board_id', { unique: false });
          asgn.createIndex('by-card', 'card_id', { unique: false });
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
