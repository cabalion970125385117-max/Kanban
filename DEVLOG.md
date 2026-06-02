# QuestBoard — Developer Log

Chronological record of changes, bug fixes, and technical decisions.

---

## 2026-06-02 — v1.2.0 · Custom Sprites · RPG Mode · Issued Cards Sidebar

### Custom Sprite Redesign (`QuestBanner.tsx`)

All five sprites completely redrawn from scratch — hand-coded pixel art, no external assets.
Each sprite now uses `K='#0D0D0D'` dark outlines, 4–6 dedicated palette colours, and consistent top-left light direction. The `lighten(hex, amount)` helper was added alongside the existing `darken()` for highlight colours.

| Sprite | Art size | Palette highlights | Character |
|--------|----------|-------------------|-----------|
| Slime  | 8 × 8    | poison green `#22CC44`, glassy eye `#DDFFDD` | Toxic blob, belly shadow, four raised bumps |
| Goblin | 8 × 14   | dark hood `#1C2A18`, glowing eyes `#FFEE33` | Hooded assassin, leather torso, boots |
| Orc    | 10 × 14  | blood iris `#FF2200`, dark steel `#445566` | Scarred berserker, white tusks, plate shoulder |
| Dragon | 12 × 12  | wing membrane `#440C00`, gold eyes `#FFDD00` | Red wyvern, folded wings, armoured underbelly |
| Avatar | 8 × 16   | gold trim `c='#CCAA44'`, visor slit | Armoured sentinel, archetype-coloured plate, `lighten()` highlights |

### Environment Additions (`QuestBanner.tsx`)

- **Crescent moon** (`drawBackground`): disc + shadow-bite + radial halo glow above the castle
- **Dead trees** (`drawTrees()`): 5 silhouette trees with forked bare branches, placed between cave exit and castle; drawn per-RAF between cave and castle layers
- **Tower window glow** (`drawWindowGlow()` inside `drawCastle()`): 3 amber `createRadialGradient` glows at each tower window opening

### RPG Mode — Rename & Toggle

**Rename:** "Quest Banner" renamed to "RPG Mode" everywhere — `QuestBanner.tsx`, `SettingsDialog.tsx`, aria labels, and all descriptive strings.

**Toggle behaviour:**
- **ON**: Banner renders in full. A `"RPG MODE ✕"` pill (semi-transparent dark capsule) overlays the top-right corner. Click or Enter/Space dismisses to OFF.
- **OFF**: Full banner replaced by a single `h-10` re-enable strip — `⚔️ RPG Mode [OFF]` — matching the reserved header slot height. Clicking it re-enables the full animation.
- State persisted in localStorage via `useQuestStore` (key `questboard-quest-banner`).

**SettingsDialog → Appearance tab:**
- Section heading: `"QUEST BANNER"` → `"RPG Mode"`
- Button label: `"Animated Quest Banner"` → `"RPG Mode"`
- Status text: `"Enabled/Disabled"` → `"On — monsters march…" / "Off — animated banner is hidden"`

### Issued Cards Sidebar (`BoardsPage.tsx`)

New `IssuedCardsSidebar` component (`components/boards/IssuedCardsSidebar.tsx`) docked to the right of the Boards page.

**IssueForm section:**
- Board picker (dropdown of all user boards)
- Assignee dropdown (all board members)
- Title input
- Priority chips: Critical / High / Medium / Low

**Awaiting Response list:**
- Fetched via `useIssuedByMe()` — full `card_assignments` scan filtered by `assigned_by_id === currentUserId && status === 'pending'`
- Each row shows: title, board name badge, assignee avatar, priority chip, age string
- Age colour coding: grey `< 3 days`, amber `WAITING ≥ 3 days`, red `STALE ≥ 7 days`
- Per-card actions: **Withdraw** (✕) calls `useWithdrawAssignment` mutation; **Inline edit** (✎) expands title + priority inline before the other party responds

**API additions** (`assignments.api.ts`):
- `getIssuedByMe()` — returns `IssuedCard[]` with nested `assignee` and `boardName`
- `withdrawAssignment(id)` — deletes row; marks assignee's notification as read
- `updateIssuedCard(id, patch)` — patches title/priority; updates notification message text

**Hook additions** (`useAssignments.ts`):
- `useIssuedByMe()` — query key `['issued-by-me', userId]`
- `useWithdrawAssignment()` — mutation, invalidates `issued-by-me`
- `useUpdateIssuedCard()` — mutation `{ id, patch: { title?, priority? } }`

**BoardsPage layout change:**
- `min-h-screen` centred layout → `h-screen flex flex-col overflow-hidden`
- Body: `flex flex-1 overflow-hidden` — `<main>` (flex-1, overflow-y-auto) + `<IssuedCardsSidebar />` on right
- Board grid: `lg:grid-cols-3` → `sm:grid-cols-2` (sidebar occupies right column)

---

## 2026-05-30 — v1.2.0 · FF-style Quest Banner + Bug Fixes

### Quest Banner Redesign (`QuestBanner.tsx`)

Replaced the original basic pixel-art banner with a Final Fantasy–inspired version following user feedback ("the pixel art style is too basic, take inspiration from final fantasy").

**Sprite upgrades** — every sprite now uses `K='#0D0D0D'` dark outlines and 3–4 shaded body colours with consistent top-left light direction:

| Sprite | Size (art-px) | CSS px | Notes |
|--------|--------------|--------|-------|
| Slime  | 8 × 8        | 16 × 16 | Blue blob, glassy highlight eyes, belly shadow |
| Goblin | 8 × 14       | 16 × 28 | Green imp, leather armour rows, yellow iris eyes, boots |
| Orc    | 10 × 14      | 20 × 28 | Purple-grey bruiser, red irises, white tusks, steel plate |
| Dragon | 12 × 12      | 24 × 24 | Red beast, dark wing membranes, gold underbelly accents |
| Avatar | 8 × 16       | 16 × 32 | Chibi guard, archetype-coloured armour, skin-tone face, belt detail |

**Environment additions:**
- `drawTorches()` — animated flame gradient (`createLinearGradient` red→yellow→transparent) + `createRadialGradient` ambient glow flanking the castle gate
- `drawBlock()` — FF dungeon stone texture: brick rows, horizontally offset mortar joints, pillar corner blocks, crenellated merlons
- `drawArrowSlit()` — narrow slit windows on tower faces
- Stalactites (4 triangular shapes from cave ceiling)
- Pixel star band at very top of sky gradient
- Grass tufts (`Δy = Math.sin(i * 2.4) * 3`) along hill ridgelines
- Castle gate portcullis bars (semi-opaque iron overlay)
- Waving flag (`wave = 2 * sin(t × 3)`) with golden cross emblem

**Arch change:** `drawCastle` now accepts `t` (time) parameter for torch animation. `cardToMonsterType` maps `Priority` → sprite type.

**TypeScript fix:** `card.priority === 'dragon'` comparison corrected to `card.priority === 'critical'` (Priority type union does not include `'dragon'`).

---

### Bug Fixes

#### BUG-001 — CardDetailDrawer: Duplicate Assignees Section
**File:** `apps/web/src/components/card/CardDetailDrawer.tsx`  
**Severity:** Medium (confusing UX)  
**Root cause:** A read-only list of `card.owners` was rendered at the bottom of the drawer (lines 325–345) after `<AssigneesPanel>` already renders them interactively at line 196.  
**Fix:** Removed the redundant read-only block. `AssigneesPanel` is the single source of truth.

#### BUG-002 — CardDetailDrawer: Hardcoded Light Colors in Dark Mode
**File:** `apps/web/src/components/card/CardDetailDrawer.tsx`  
**Severity:** Low-Medium (visual regression in dark theme)  
**Root cause:** Title hover and description click area used `bg-gray-50` / `hover:bg-gray-100` — Tailwind static light classes that don't respond to CSS custom properties.  
**Fix:**
- Title hover: `hover:bg-gray-50` → `hover:bg-[var(--color-bg)]`
- Description view: `bg-gray-50 hover:bg-gray-100` → `bg-[var(--color-bg)] hover:bg-[var(--color-border)]/30`

#### BUG-003 — BoardDeleteDialog: `bg-white` Confirmation Input
**File:** `apps/web/src/components/board/BoardDeleteDialog.tsx`  
**Severity:** Low (visual glitch in dark mode)  
**Root cause:** The board-name confirmation input used `bg-white` which is always white regardless of theme.  
**Fix:** `bg-white` → `bg-[var(--color-surface)]`

#### BUG-004 — CommentThread: @mention Notification Fails for Multi-Word Names
**File:** `apps/web/src/components/card/CommentThread.tsx`  
**Severity:** Medium (silent notification loss)  
**Root cause:** Notification matching used `/@(\S+)/g` regex to extract mentioned tokens. For a user named "John Doe", `insertMention` inserts `@John Doe ` but the regex captures only `@John`. The subsequent member lookup comparing `["john"]` against `"john doe"` finds no match → notification never sent.  
**Fix:** Replaced regex extraction with direct string search:
```ts
// Before (broken for multi-word names)
const mentionedNames = [...trimmed.matchAll(/@(\S+)/g)].map((m) => m[1].toLowerCase());
const mentionedIds = members
  .filter((m) => mentionedNames.includes((m.user?.name ?? '').toLowerCase()))
  .map((m) => m.user_id);

// After (correct for all names)
const mentionedIds = members
  .filter((m) => m.user?.name && trimmed.includes(`@${m.user.name}`))
  .map((m) => m.user_id)
  .filter((id) => id !== currentUser?.id);
```
Also added self-exclude guard to prevent notifying yourself.

#### BUG-005 — SwimlaneCanvas: Unused `boardId` Prop
**File:** `apps/web/src/components/board/SwimlaneCanvas.tsx`  
**Severity:** Negligible (dead prop, no runtime effect)  
**Root cause:** `boardId` was declared in `SwimlaneCanvasProps` and passed by `BoardPage` but never destructured or used inside the component. All data comes from `useBoardStore()`.  
**Fix:** Added JSDoc comment marking it as reserved for future server-side swimlane queries.

---

## 2026-05-29 — v1.1.0 · Lark/Feishu Feature Parity + Board Management

See `apps/web/src/constants/changelog.ts` for full feature list.

Key items:
- Table view, Swimlane view, advanced multi-filter (Priority + Label)
- Board delete with archive/permanent delete dialog
- Card tags with hash-based deterministic color
- Progress report modal with per-member stats and text export
- @mention in comments with autocomplete and inbox notifications
- Quest Banner initial implementation (animated canvas, pixel-art sprites, cave + castle + monsters)

---

## 2026-05-27 — v1.0.0 · All 8 Phases Complete

Phases 1–8 shipped:
1. Auth, user CRUD, DB migrations (IndexedDB local-first)
2. Board/column/card CRUD, drag-drop (dnd-kit), card drawer
3. Sub-steps, time tracking, comments, attachments
4. Socket.io real-time, live cursors, offline mutation queue
5. Gantt chart (SVG), drag-to-edit dates, PDF export
6. Automation engine, rule builder UI, trigger hooks
7. Analytics dashboard — cycle time, burndown, heatmap, velocity
8. Accessibility (WCAG 2.1 AA), Playwright E2E tests, performance (code splitting, React.memo)

Inbox system (IDB v7): card assignments, accept/reject flow, cross-board notifications.
