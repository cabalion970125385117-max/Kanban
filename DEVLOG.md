# QuestBoard — Developer Log

Chronological record of changes, bug fixes, and technical decisions.

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
