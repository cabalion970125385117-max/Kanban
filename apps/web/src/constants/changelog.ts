export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-05-27',
    changes: [
      'Phase 4: Real-time collaboration via Socket.io — live cursors, presence bar, typing indicators',
      'Phase 4: Offline mutation queue — changes sync automatically on reconnect',
      'Phase 4: Notification drawer with unread badge',
      'Auth: Forgot password recovery flow',
      'Auth: Confirm password on sign-up',
      'Settings: Avatar, display name, password, and theme (light/dark/system)',
      'Phase 3: Sub-steps with completion tracking and reordering',
      'Phase 3: Time tracking — log billable/non-billable hours per card',
      'Phase 3: Comments with threaded replies',
      'Phase 3: File attachments stored locally (base64)',
      'Phase 2: Kanban board with drag-and-drop columns and cards (dnd-kit)',
      'Phase 2: Card detail drawer — description, labels, priority, dates, owners',
      'Phase 2: Column WIP limits and colour coding',
      'Phase 1: Authentication — register, login, refresh session',
      'Phase 1: Local-first data storage via IndexedDB (no server required)',
      'Phase 1: Eight hero archetypes with four colour variants each',
    ],
  },
];
