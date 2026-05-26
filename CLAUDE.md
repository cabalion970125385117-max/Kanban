# QuestBoard — Claude Code Implementation Guide

Trello-inspired project management platform with pixel-art medieval hero theme.
Full spec: `questboard_design_v2.docx`

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite |
| UI | shadcn/ui + Tailwind CSS |
| Drag & Drop | dnd-kit |
| State | Zustand + TanStack React Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Real-time | Socket.io client |
| Backend | Node.js 20 + Express + TypeScript |
| WebSocket | Socket.io |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis + BullMQ |
| Auth | JWT access token + httpOnly refresh cookie |
| Files | AWS S3 / Cloudflare R2 (pre-signed uploads) |
| Email | AWS SES + Nodemailer |
| Testing BE | Jest + Supertest |
| Testing FE | Vitest + React Testing Library |
| CI | GitHub Actions |
| Dev env | Docker Compose |

---

## Monorepo Structure

```
questboard/
├── apps/
│   ├── api/               # Express backend
│   └── web/               # React frontend
├── packages/
│   └── shared/            # Shared types & Zod schemas
├── docker-compose.yml
├── .env.example
└── CLAUDE.md              # ← this file
```

### API Structure (`apps/api/`)

```
src/
├── index.ts               # Entry: Express + Socket.io init
├── config/
│   ├── db.ts              # PostgreSQL pool (pg)
│   ├── redis.ts           # Redis client (ioredis)
│   ├── env.ts             # Zod-validated env vars
│   └── s3.ts              # S3 client (aws-sdk v3)
├── middleware/
│   ├── auth.ts            # JWT verify; attach req.user
│   ├── errorHandler.ts    # Global error middleware
│   ├── validate.ts        # Zod body/query/params validator
│   └── rateLimit.ts       # express-rate-limit configs
├── routes/
│   ├── auth.ts
│   ├── users.ts
│   ├── boards.ts
│   ├── columns.ts
│   ├── cards.ts
│   ├── comments.ts
│   ├── substeps.ts
│   ├── timeLogs.ts
│   ├── photos.ts
│   ├── labels.ts
│   ├── customFields.ts
│   ├── dependencies.ts
│   ├── automation.ts
│   ├── analytics.ts
│   └── gantt.ts
├── services/
│   ├── auth.service.ts
│   ├── board.service.ts
│   ├── card.service.ts
│   ├── notification.service.ts
│   ├── automation.service.ts
│   ├── analytics.service.ts
│   ├── upload.service.ts
│   └── email.service.ts
├── socket/
│   ├── index.ts           # Socket.io server setup
│   ├── board.socket.ts    # Board room events
│   └── cursor.socket.ts   # Cursor broadcast (60ms throttle)
├── jobs/
│   ├── queue.ts           # BullMQ queue definitions
│   ├── workers/
│   │   ├── automation.worker.ts
│   │   ├── webhook.worker.ts
│   │   ├── email.worker.ts
│   │   └── recurring.worker.ts
│   └── schedulers/
│       └── recurring.scheduler.ts
├── db/
│   ├── migrations/        # Numbered SQL migration files
│   └── seeds/             # Dev seed data
└── types/
    └── express.d.ts       # Augment req.user
```

### Web Structure (`apps/web/`)

```
src/
├── main.tsx
├── App.tsx                # Router setup
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── BoardsPage.tsx     # Board list / home
│   ├── BoardPage.tsx      # Main Kanban view
│   ├── GanttPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── AutomationPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AvatarPicker.tsx
│   ├── board/
│   │   ├── BoardHeader.tsx
│   │   ├── BoardCanvas.tsx    # DndContext wrapper
│   │   ├── ColumnList.tsx
│   │   ├── Column.tsx
│   │   ├── AddColumnButton.tsx
│   │   ├── SwimlaneWrapper.tsx
│   │   └── FilterBar.tsx
│   ├── card/
│   │   ├── CardFace.tsx       # Compact drag card
│   │   ├── CardDetailDrawer.tsx
│   │   ├── CardDragOverlay.tsx
│   │   ├── SubstepList.tsx
│   │   ├── TimeTracker.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── DependencyPanel.tsx
│   │   ├── CommentThread.tsx
│   │   └── CustomFieldsPanel.tsx
│   ├── gantt/
│   │   ├── GanttPage.tsx
│   │   ├── GanttLeftPanel.tsx
│   │   ├── GanttTimeline.tsx
│   │   ├── GanttBar.tsx
│   │   ├── MilestoneDiamond.tsx
│   │   └── DependencyArrow.tsx
│   ├── analytics/
│   │   ├── KpiCards.tsx
│   │   ├── CycleTimeChart.tsx
│   │   ├── BurndownChart.tsx
│   │   ├── HeatmapGrid.tsx
│   │   └── VelocityChart.tsx
│   ├── automation/
│   │   ├── RuleList.tsx
│   │   └── RuleBuilder.tsx
│   ├── collaboration/
│   │   ├── LiveCursorLayer.tsx
│   │   ├── PresenceBar.tsx
│   │   └── TypingIndicator.tsx
│   └── shared/
│       ├── AvatarStack.tsx
│       ├── PriorityBadge.tsx
│       ├── PixelAvatar.tsx     # Renders sprite image
│       ├── NotificationDrawer.tsx
│       └── ConfirmDialog.tsx
├── stores/
│   ├── auth.store.ts
│   ├── board.store.ts
│   ├── gantt.store.ts
│   └── collaboration.store.ts
├── hooks/
│   ├── useSocket.ts
│   ├── useBoard.ts
│   ├── useCard.ts
│   ├── useTimer.ts
│   └── useGantt.ts
├── api/
│   ├── client.ts          # Axios instance + interceptors
│   ├── auth.api.ts
│   ├── boards.api.ts
│   ├── cards.api.ts
│   └── analytics.api.ts
└── styles/
    ├── globals.css        # Tailwind base + CSS variables
    └── pixel.css          # Pixel font + sprite styles
```

---

## Database Schema

Run migrations in order from `apps/api/src/db/migrations/`.

```sql
-- 001_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_id UUID REFERENCES avatars(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','guest')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 002_avatars.sql
CREATE TABLE avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype VARCHAR(50) NOT NULL,   -- knight, mage, archer, etc.
  variant SMALLINT NOT NULL,         -- 1-4 colour variant
  sprite_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL
);

-- 003_boards.sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  owner_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE board_members (
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin','member','guest')),
  PRIMARY KEY (board_id, user_id)
);

-- 004_columns.sql
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  colour VARCHAR(7) DEFAULT '#5B4FCF',
  order_index SMALLINT NOT NULL DEFAULT 0,
  wip_limit SMALLINT,               -- NULL = no limit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 005_labels.sql
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  colour VARCHAR(7) NOT NULL
);

-- 006_cards.sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id),
  title VARCHAR(140) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  start_date DATE,
  end_date DATE,
  estimate_hours DECIMAL(6,2),
  order_index INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE card_owners (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE TABLE card_labels (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE card_watchers (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE TABLE card_votes (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (card_id, user_id)
);

-- 007_substeps.sql
CREATE TABLE substeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  target_date DATE,
  is_complete BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES users(id),
  order_index SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 008_photos.sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  alt_text TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 009_time_logs.sql
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  minutes INTEGER NOT NULL,
  is_billable BOOLEAN DEFAULT FALSE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 010_comments.sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 011_card_dependencies.sql
CREATE TABLE card_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  blocked_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  UNIQUE (blocking_card_id, blocked_card_id)
);

-- 012_custom_fields.sql
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) CHECK (field_type IN ('text','number','dropdown','checkbox','date','url','email','person')),
  is_required BOOLEAN DEFAULT FALSE,
  options JSONB,          -- for dropdown: [{value, label, colour}]
  order_index SMALLINT DEFAULT 0
);

CREATE TABLE card_custom_values (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  field_id UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number DECIMAL(12,4),
  value_date DATE,
  value_bool BOOLEAN,
  value_user_id UUID REFERENCES users(id),
  PRIMARY KEY (card_id, field_id)
);

-- 013_automation.sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 014_activity.sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,  -- card.moved, card.updated, comment.added, etc.
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE card_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ                           -- NULL = currently in column
);

-- 015_notifications.sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  ref_card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 016_recurring.sql
CREATE TABLE recurring_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id),
  cron_expression VARCHAR(100) NOT NULL,
  next_run_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  max_occurrences INTEGER,
  occurrence_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX ON cards(board_id, archived_at);
CREATE INDEX ON cards(column_id, order_index);
CREATE INDEX ON card_history(card_id, entered_at);
CREATE INDEX ON activity_logs(card_id, created_at DESC);
CREATE INDEX ON notifications(user_id, is_read, created_at DESC);
```

---

## API Endpoints

Base: `http://localhost:4000/api`
Auth header: `Authorization: Bearer <access_token>`

### Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/reset-password/request
POST   /auth/reset-password/confirm
```

### Users
```
GET    /users                          admin only
GET    /users/:id
PUT    /users/:id
DELETE /users/:id                      admin only
GET    /users/:id/notifications
PUT    /users/:id/notifications/read-all
```

### Boards
```
GET    /boards
POST   /boards
GET    /boards/:id
PUT    /boards/:id
DELETE /boards/:id
GET    /boards/:id/members
POST   /boards/:id/members
DELETE /boards/:id/members/:userId
GET    /boards/:id/labels
POST   /boards/:id/labels
PUT    /boards/:id/labels/:lid
DELETE /boards/:id/labels/:lid
GET    /boards/:id/custom-fields
POST   /boards/:id/custom-fields
PUT    /boards/:id/custom-fields/:fid
DELETE /boards/:id/custom-fields/:fid
```

### Columns
```
GET    /boards/:id/columns
POST   /boards/:id/columns
PUT    /boards/:id/columns/:cid        name, colour, order_index, wip_limit
DELETE /boards/:id/columns/:cid        requires column to be empty
POST   /boards/:id/columns/reorder     body: { order: [colId, colId, ...] }
```

### Cards
```
GET    /boards/:id/cards               supports ?columnId=&ownerId=&priority=&label=&search=
POST   /boards/:id/cards
GET    /cards/:id
PUT    /cards/:id
DELETE /cards/:id                      archives (sets archived_at)
POST   /cards/:id/move                 body: { columnId, position }
POST   /cards/:id/restore

POST   /cards/:id/owners               body: { userId }
DELETE /cards/:id/owners/:uid
POST   /cards/:id/watch                toggles watch
POST   /cards/:id/vote                 toggles vote

GET    /cards/:id/substeps
POST   /cards/:id/substeps
PUT    /cards/:id/substeps/:sid
DELETE /cards/:id/substeps/:sid
POST   /cards/:id/substeps/reorder     body: { order: [sid, sid, ...] }

POST   /cards/:id/photos               multipart or body: { confirmKey } after S3 upload
DELETE /cards/:id/photos/:pid
GET    /cards/:id/photos/upload-url    returns pre-signed S3 PUT URL

GET    /cards/:id/time
POST   /cards/:id/time                 body: { minutes, isBillable, loggedAt, note }
PUT    /time-logs/:lid
DELETE /time-logs/:lid

GET    /cards/:id/dependencies
POST   /cards/:id/dependencies         body: { blockingCardId } or { blockedCardId }
DELETE /cards/:id/dependencies/:did

GET    /cards/:id/comments
POST   /cards/:id/comments
PUT    /comments/:id
DELETE /comments/:id

GET    /cards/:id/activity
GET    /cards/:id/custom-values
PUT    /cards/:id/custom-values        body: { fieldId, value }
```

### Automation
```
GET    /boards/:id/automation
POST   /boards/:id/automation
PUT    /boards/:id/automation/:rid
DELETE /boards/:id/automation/:rid
POST   /boards/:id/automation/:rid/test   dry-run against last 10 cards
```

### Analytics
```
GET    /boards/:id/analytics/summary
GET    /boards/:id/analytics/cycle-time?from=&to=
GET    /boards/:id/analytics/burndown?from=&to=
GET    /boards/:id/analytics/heatmap?from=&to=
GET    /boards/:id/analytics/velocity
GET    /boards/:id/gantt
GET    /boards/:id/export/csv
GET    /boards/:id/export/gantt-pdf
```

---

## WebSocket Events

Server → Client (board room):
```
card:created      { card }
card:updated      { cardId, patch }
card:moved        { cardId, columnId, position, movedBy }
card:archived     { cardId }
column:created    { column }
column:updated    { columnId, patch }
column:deleted    { columnId }
comment:added     { comment }
user:joined       { userId, name, avatarUrl }
user:left         { userId }
cursor:move       { userId, x, y }           throttled 60ms
typing:start      { userId, cardId }
typing:stop       { userId, cardId }
notification:new  { notification }
```

Client → Server:
```
join:board        { boardId }
leave:board       { boardId }
cursor:move       { x, y }
typing:start      { cardId }
typing:stop       { cardId }
```

---

## Auth Flow

```
1. POST /auth/login → { accessToken, user }
   + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict

2. Axios interceptor attaches: Authorization: Bearer <accessToken>

3. On 401 → POST /auth/refresh (sends cookie automatically)
   → new accessToken → retry original request

4. POST /auth/logout → server blacklists refresh token in Redis
```

---

## File Upload Flow

```
1. Client: GET /cards/:id/photos/upload-url
   Server returns: { uploadUrl, key, expiresIn }

2. Client: PUT <uploadUrl> with raw file bytes + Content-Type header
   (Direct S3 upload — no proxy through API server)

3. Client: POST /cards/:id/photos body: { key, altText }
   Server: validates key, generates thumb via Lambda or sharp,
           inserts into photos table, emits card:updated via socket
```

---

## Automation Rule Format (JSONB)

```json
{
  "trigger_type": "card.moved",
  "trigger_config": { "toColumnId": "uuid-of-in-review-column" },
  "conditions": [
    { "field": "priority", "op": "eq", "value": "high" }
  ],
  "actions": [
    { "type": "assign_owner", "userId": "uuid" },
    { "type": "webhook", "url": "https://hooks.slack.com/...", "method": "POST",
      "body": { "text": "Card {{card.title}} moved to In Review" } },
    { "type": "set_label", "labelId": "uuid" }
  ]
}
```

Supported trigger_types: `card.moved`, `card.created`, `card.due_date`, `substep.all_complete`, `label.added`, `custom_field.changed`, `schedule`

Supported action types: `move_card`, `assign_owner`, `add_label`, `remove_label`, `set_priority`, `create_substep`, `send_notification`, `webhook`, `send_email`, `archive_card`

---

## Key Implementation Rules

1. **Always validate with Zod** — define schemas in `packages/shared`; reuse on FE and BE.
2. **Optimistic updates on drag** — update Zustand store immediately; rollback on API error + toast.
3. **Card history tracking** — on every `card.moved`, insert row into `card_history` (exited_at on old row, new row for new column). This powers cycle time analytics.
4. **WIP limit check** — before inserting card into column, count active cards; if at limit and rule is `hard`, return 409.
5. **Circular dependency guard** — before inserting into `card_dependencies`, BFS/DFS check for cycles; return 422 if found.
6. **Real-time on all mutations** — every successful card/column mutation emits the corresponding socket event to the board room.
7. **Soft deletes only** — never hard-delete cards; always set `archived_at`. Hard-delete only users (admin, GDPR).
8. **Row-level security intent** — middleware checks board membership before any board/card operation; guests cannot create cards.
9. **Pagination** — all list endpoints support `?page=&limit=` (default limit 50).
10. **CSS variables** — all colours via `--color-*` tokens; never hardcode hex in components.

---

## Delivery Phases

| Phase | Target | Key Output |
|---|---|---|
| 1 | Weeks 1–2 | Auth, user CRUD, DB migrations, Docker Compose |
| 2 | Weeks 3–5 | Board/column/card CRUD, drag-drop UI, card drawer |
| 3 | Weeks 6–7 | Sub-steps, time tracking, dependencies, custom fields |
| 4 | Weeks 7–8 | Socket.io real-time, live cursors, offline queue |
| 5 | Weeks 9–10 | Gantt chart (SVG), drag-to-edit dates, PDF export |
| 6 | Weeks 10–11 | Automation engine, BullMQ workers, rule builder UI |
| 7 | Weeks 11–12 | Analytics dashboard (cycle time, burndown, heatmap) |
| 8 | Weeks 13–14 | Accessibility audit, E2E tests, performance tuning |

---

## Environment Variables (`.env.example`)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/questboard
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-32-chars-minimum
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# S3 / R2
S3_BUCKET=questboard-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
CDN_BASE_URL=https://cdn.questboard.app

# Email
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@questboard.app

# App
PORT=4000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## Commands

```bash
# Dev
docker compose up -d          # start postgres + redis
cd apps/api && npm run dev    # API on :4000
cd apps/web && npm run dev    # Web on :5173

# Migrations
cd apps/api && npm run migrate:up
cd apps/api && npm run migrate:down

# Tests
cd apps/api && npm test
cd apps/web && npm test

# Build
npm run build                  # builds both apps
```
