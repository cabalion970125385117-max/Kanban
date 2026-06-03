# QuestBoard — Developer Log

Chronological record of changes, bug fixes, and technical decisions.

---

## 2026-06-03 — v1.4.0 Roadmap · Implementation & Design Plan

Sixteen features selected for the next major cycle. Codebase audit before planning revealed three are **already built** (noted inline). Remaining thirteen are organised into four delivery phases below.

---

### Pre-build Audit: Already Implemented

| # | Feature | Evidence |
|---|---|---|
| 7 | Card Aging Indicators | `agingDays()` in `CardFace.tsx`; amber/red "Xd idle" badge renders at ≥3 / ≥7 days |
| 8 | Card Color Override | `cover_colour` field on `Card` type; stripe rendered in `CardFace.tsx`; `coverColour` state wired in `CardDetailDrawer.tsx` (picker UI may need verification) |
| 19 | Column Collapse | `collapsed` state + full collapsed render (rotated label, card count) in `Column.tsx` lines 97–124 |

---

### Phase 9 — Card Feature Pack  *(target: Weeks 15–16)*

**Goal:** Deepen individual card capabilities without touching routes or views.

---

#### #4 — Rich Text / Markdown Descriptions

**Problem:** Description is a plain `<textarea>`. No formatting is possible.

**Design:**
- Split-pane editor: **Write** tab (monospace textarea with toolbar) ↔ **Preview** tab (rendered markdown)
- Toolbar row: Bold `**`, Italic `_`, `H2`, `• List`, `[ ] Task`, `` `Code` ``, `🔗 Link` — icon buttons, no labels
- Preview renders via `marked` + sanitised with `DOMPurify`
- Empty preview shows a muted "No description — click to add" prompt
- Markdown stored as-is in existing `description TEXT` column — zero schema change

**Components:**
```
components/card/
  MarkdownEditor.tsx       — controlled editor with toolbar + Write/Preview tabs
  MarkdownPreview.tsx      — renders sanitised HTML from markdown string
```

**CardDetailDrawer change:** replace `<textarea>` description block with `<MarkdownEditor>`. The existing `editingDesc` / `saveDesc` flow is preserved; MarkdownEditor fires `onChange` on every keystroke, saves on blur or explicit save button.

**Dependencies:** `marked`, `dompurify` (both ~5 kB gzip).

---

#### #5 — Card Cloning

**Problem:** No way to duplicate a card. Users re-type recurring task structures.

**Design:**
- "Duplicate card" option in the `⋯` header menu of `CardDetailDrawer`
- Opens `CloneCardDialog` — a small modal with:
  - Preview of the source title (greyed, not editable)
  - Checkboxes: ☑ Substeps  ☑ Assignees  ☑ Labels  ☑ Tags  ☐ Time logs
  - "Clone" button
- Cloned card inserts into the same column at position 0 with title `"<original> (copy)"`
- On success: drawer closes the source and opens the new card

**Components:**
```
components/card/
  CloneCardDialog.tsx
```

**Hook:** `useCloneCard(boardId)` — mutation in `useCard.ts`. Reads source card from IndexedDB, deep-copies fields per checkbox selection, writes new card + relation rows.

**Schema:** No changes. Uses existing `cards`, `substeps`, `card_owners`, `card_labels` tables.

---

#### #6 — Bulk Actions

**Problem:** Operating on many cards requires opening each one individually.

**Design:**
- **Selection mode** toggled by a "Select" button in `BoardHeader` (checkbox icon). When active:
  - Each `CardFace` gains a checkbox in its top-left corner (appears even without hover)
  - Checked cards get a `ring-2 ring-[var(--color-accent)]` outline
- **Bulk action bar** — fixed bottom bar that slides up when ≥ 1 card is selected:
  - Shows `N selected` count
  - Actions: **Move to…** (column picker), **Priority** (4-chip picker), **Add label**, **Archive**, **Clear**
  - Destructive actions (Archive) require a 1-second hold or confirmation chip
- Selection state lives in `board.store.ts`: `selectedCardIds: string[]`, `bulkMode: boolean`
- Escape key clears selection and exits bulk mode

**Components:**
```
components/board/
  BulkActionBar.tsx        — fixed bottom floating bar
```

**CardFace change:** Accept optional `selected` and `onSelect` props; render checkbox overlay when `bulkMode` is true in store.

**Hook additions:** `useBulkMoveCards`, `useBulkArchiveCards`, `useBulkSetPriority` — all take `cardIds[]` + target value, execute as sequential IDB writes with a single React Query invalidation at the end.

---

#### #9 — Emoji Reactions

**Problem:** Lightweight feedback (👍 agreement, ❤️ appreciation) requires writing a full comment.

**Design:**
- Reaction strip at the bottom of `CardDetailDrawer` header area, above the comment thread
- 6 quick-pick emojis: 👍 ❤️ 🎉 😮 🔥 😢
- Each shows: emoji + count badge. Your own reaction: filled accent background. Others': light grey pill
- Click = toggle your reaction (add if absent, remove if present)
- On `CardFace`: only show if total reactions > 0; render compact pill `👍 3` in the footer row

**Components:**
```
components/card/
  ReactionBar.tsx          — strip of emoji pills + add-reaction popover
```

**Schema:** New IDB object store `card_reactions`:
```ts
{ id: string; card_id: string; user_id: string; emoji: string; created_at: string }
```
Composite unique: `(card_id, user_id, emoji)`.

**Hook:** `useCardReactions(cardId)`, `useToggleReaction(boardId)`.

---

#### #10 — "Relates To" / "Duplicates" Card Links

**Problem:** Only `blocks / blocked-by` dependency type exists. "This is a duplicate of…" or "relates to…" has no modelling.

**Design:**
- `DependencyPanel.tsx` gains a **Relationship type** selector before the card picker:
  - `blocks` (existing), `blocked by` (existing), `relates to` (new), `duplicates` (new), `is child of` (new)
- Display groups dependencies by type with a coloured pill label:
  - `blocks` → red, `blocked by` → orange, `relates to` → blue, `duplicates` → purple, `is child of` → teal
- "Is child of" links surface on the parent card as an expandable "Child cards" section

**Schema change:** Add `rel_type` to `card_dependencies` IDB store:
```ts
rel_type: 'blocks' | 'relates_to' | 'duplicates' | 'child_of'  // default: 'blocks'
```
Existing rows default to `'blocks'` on migration.

**No new component files** — extend `DependencyPanel.tsx` only.

---

#### #20 — @Mentions in Descriptions

**Problem:** `@username` autocomplete exists in `CommentThread.tsx` but not in the card description field.

**Design:**
- `MarkdownEditor` (from #4) listens for `@` keypress → shows a floating member picker (same `MentionPicker` logic as `CommentThread`)
- On selection, inserts `@Full Name ` into markdown source
- On description save, `parseDescriptionMentions(markdown, members)` extracts mentioned user IDs using `includes('@' + name)` (same fix as BUG-004) and creates IDB notification rows

**Components:** Logic extracted from `CommentThread.tsx` into:
```
components/shared/
  MentionPicker.tsx        — reusable floating member list (used by both comment + description)
```

**Note:** Depends on #4 (MarkdownEditor must exist first).

---

### Phase 10 — New Views  *(target: Weeks 17–18)*

**Goal:** Add three new top-level navigation destinations.

---

#### #1 — Calendar View

**Route:** `/boards/:boardId/calendar`

**Design:**
- Full-month grid (6 × 7 cells, Mon–Sun header row)
- Cards plotted by `end_date`; cards with no due date shown in a "Unscheduled" right sidebar drawer
- Each cell shows up to 3 card pills (title truncated, priority dot left); overflow: "+N more" chip that expands a popover
- Card pills are draggable to another day cell — drag updates `end_date` optimistically
- Header controls: `< Month >` navigation, "Today" button, week/month toggle (future)
- Overdue cards (past cells): red pill background; today cell: accent-tinted cell background

**Components:**
```
pages/
  CalendarPage.tsx

components/calendar/
  CalendarGrid.tsx         — 6×7 cell grid, handles drag context
  CalendarDayCell.tsx      — single day cell with pill list + overflow
  CalendarCardPill.tsx     — compact draggable card strip
  UnscheduledDrawer.tsx    — right panel listing cards with no end_date
```

**FilterBar change:** Add `calendar` to `BoardView` union type; add calendar icon button to the view switcher row. Route navigation on view change (same pattern as Gantt).

**Data:** No schema change. Uses existing `cards` filtered by `board_id`, mapped to `end_date`.

---

#### #2 — My Work

**Route:** `/my-work`

**Design:**
- Accessible from BoardsPage header (new "My Work" button next to "New Board") and a `/my-work` nav link
- Scans all boards the current user is a member of; fetches all cards where `card_owners.user_id = currentUser.id`
- Groups into four swim-lanes: **Overdue** (red header), **Due Today** (amber), **Due This Week** (blue), **Later / No Date** (grey)
- Each card row: board name chip, card title (link → opens CardDetailDrawer), priority badge, due date, column name
- Secondary tab: **Assigned to me** — cards from the inbox (card_assignments) with accept/reject inline
- Empty state: "You're all caught up 🎉"

**Components:**
```
pages/
  MyWorkPage.tsx

components/my-work/
  MyWorkGroup.tsx          — labelled swim-lane with card rows
  MyWorkCardRow.tsx        — single card row with cross-board context
```

**App.tsx change:** Add route `<Route path="/my-work" element={<MyWorkPage />} />` inside `ProtectedRoute`.

**BoardsPage change:** Add "My Work" link button in the header row.

---

#### #3 — Standup / Presentation Mode

**Route:** None — triggered as a fullscreen overlay on any board page.

**Design:**
- Triggered from `BoardHeader` via a `Presentation` icon button (tooltip: "Standup mode")
- Fullscreen portal overlay (`position: fixed, inset: 0, z-index: 9000`)
- **Layout:** Column tabs across the top (accent-coloured pills); active column's cards fill the main area as large cards
- Each card tile: `text-xl` title, priority chip, assignee avatar(s), aging badge, due date — no drag handles
- Navigation: `← →` arrow keys or on-screen chevron buttons to cycle columns; Escape to exit
- Timer: optional per-column countdown (1 / 2 / 5 min options shown in a corner selector)
- "Card spotlight" on click: zooms one card to fill 80% of screen with full description + substep list
- Dark background (`bg-[var(--color-bg)]`), no sidebar, no header

**Components:**
```
components/board/
  StandupMode.tsx          — full overlay, column cycling, timer
  StandupCardTile.tsx      — large-format card for standup display
```

---

### Phase 11 — Roadmap View  *(target: Weeks 19–20)*

---

#### #14 — Roadmap View

**Route:** `/boards/:boardId/roadmap`

**User requirement:** Show cards as timeline bars from `start_date` to `end_date` (or final deliverable). Subtasks (substeps) should also appear on the timeline under their parent card.

**Design:**

*Two-panel SVG layout (mirrors Gantt structure):*

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│  Left panel (280px) │  Timeline (SVG, horizontally scrollable)             │
│                     │                                                        │
│  ▾ Card Title       │  ████████████████░░░░░░░░  (card bar)                │
│    ├ Subtask A      │    ██████                   (substep bar, indented)   │
│    └ Subtask B      │          ████               (substep bar)             │
│  ▾ Card Title       │                   ◆         (milestone diamond)       │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

**Timeline mechanics:**
- Header row: zoom-dependent tick marks — **Month** (default), **Quarter**, **Year**
- Zoom control: 3-button toggle (M / Q / Y) in page header; zoom affects px-per-day ratio
- Card bar: horizontal rectangle from `start_date` to `end_date`; colour = column colour
  - Drag **left edge** → changes `start_date` (live preview ghost)
  - Drag **right edge** → changes `end_date`
  - Drag **body** → shifts both dates by Δ days
- Substep bar: indented 16px, height 6px (thinner than card bar), colour = 60% opacity of parent column colour
  - Only renders if substep has a `target_date`; start = card `start_date` (or substep created_at), end = substep `target_date`
  - Substep `target_date` dragable from right edge
- **Milestone diamond** (◆): rendered when card has `end_date` but no `start_date` (point-in-time deliverable)
- Today line: red vertical rule across full timeline height
- Hover tooltip on any bar: card title, assignee(s), date range, column, progress %

**Left panel:**
- Row per card; indent level 1 for substeps (hidden unless parent row is expanded via ▾ toggle)
- Row height 36px (card) / 26px (substep); vertically synced with SVG rows via shared `rowHeights[]` array
- Expand/collapse per card — persisted in component state
- Filter: hide cards with no dates (toggle "Show unscheduled")
- Group by: None (default) / Assignee / Priority / Label — collapses into group header rows

**Substep schema addendum:**
Current `substeps` table has `target_date DATE` (single end date). To support a timeline bar:
- Add `start_date DATE` to `substeps` IDB store (nullable; falls back to parent card `start_date`)
- Migration: set `start_date = NULL` for all existing substeps

**Components:**
```
pages/
  RoadmapPage.tsx

components/roadmap/
  RoadmapLeftPanel.tsx     — tree list of cards + substeps with expand toggles
  RoadmapTimeline.tsx      — SVG canvas, header ticks, vertical scroll sync
  RoadmapBar.tsx           — draggable horizontal bar (card or substep variant)
  RoadmapMilestone.tsx     — diamond shape for point-in-time cards
  RoadmapTooltip.tsx       — hover overlay with card detail
  RoadmapGroupRow.tsx      — collapsible group header (when grouping is active)
```

**Hook:** `useRoadmap(boardId)` — fetches cards + substeps, returns flat row list with computed pixel positions based on current zoom and date range.

**Store:** `roadmap.store.ts` — `zoom: 'month' | 'quarter' | 'year'`, `groupBy`, `showUnscheduled`, `expandedCardIds: Set<string>`.

**App.tsx change:** Add route `<Route path="/boards/:boardId/roadmap" element={<RoadmapPage />} />`.

**FilterBar change:** Add `roadmap` to `BoardView` union; add roadmap icon (horizontal bars) to view switcher.

---

### Phase 12 — Search & AI  *(target: Weeks 21–22)*

---

#### #15 — Global Search / Command Palette

**Trigger:** `Ctrl+K` / `⌘K` from anywhere in the app.

**Design:**
- Full-width modal overlay: centered `max-w-2xl` panel with blurred backdrop
- Search input auto-focused; results appear live as user types (debounced 150ms)
- Result sections (each collapsible):
  - **Cards** — title match; shows board name + column name chips + priority badge
  - **Boards** — name match; click → navigate
  - **Comments** — body match; shows card title context + board
  - **Members** — name/email; click → opens My Work filtered to that user (admin only)
- Keyboard navigation: `↑↓` moves selection highlight, `Enter` activates, `Escape` closes
- Recent searches: last 5 stored in localStorage, shown when input is empty
- No results: "No matches for `<query>`" with suggestion to try different terms

**Components:**
```
components/shared/
  CommandPalette.tsx       — modal overlay, search input, grouped results
  CommandPaletteResult.tsx — single result row with icon + context chips
```

**App.tsx change:** Mount `<CommandPalette />` globally (alongside `<SettingsDialog />`); register `Ctrl+K` listener in `App.tsx`.

**Store:** `useUiStore` gains `commandPaletteOpen: boolean`, `openCommandPalette()`, `closeCommandPalette()`.

**Search logic:** `useGlobalSearch(query)` hook — runs parallel IDB queries across `cards`, `boards`, `comments` tables; merges + ranks results by recency + match position.

---

#### #26 — AI Card Breakdown

**Design:**
- "✨ Break down with AI" button in `CardDetailDrawer` substep section header (only visible when substep list is empty)
- Opens `AiBreakdownPanel` — a slide-in panel within the drawer:
  - Shows card title + description as context (read-only)
  - `<textarea>` for additional context: "What does done look like?" (optional)
  - "Generate" button → spinner → returns 3–8 suggested substep titles
  - Each suggestion is a checkbox; user selects which to add
  - "Add selected" creates them as IDB substep rows and dismisses the panel
- **AI provider:** configurable. Default: local heuristic (keyword extraction from title/description). If an `OPENAI_API_KEY` is set in app settings (new Settings tab: "AI"), use `gpt-4o-mini` via direct fetch from the browser. No proxy server required.
- Heuristic fallback algorithm: splits description into sentences → filters action-verb sentences → reformats as imperative ("Define X", "Build Y", "Review Z")

**Components:**
```
components/card/
  AiBreakdownPanel.tsx     — sliding panel with context + suggestion checkboxes
```

**Settings change:** New "AI" tab in `SettingsDialog` — API key input (stored in localStorage, never sent anywhere except OpenAI), provider selector (Heuristic / OpenAI / Anthropic Claude).

**Store:** `useSettingsStore` gains `aiProvider`, `aiApiKey`.

---

#### #27 — AI Effort Estimation

**Design:**
- Small "✨ Estimate" chip next to the `estimate_hours` field in `CardDetailDrawer`
- Click → shows a popover:
  - Header: "AI Estimate"
  - Suggested range: e.g. **2–4 h** with a confidence bar (low / medium / high)
  - Rationale: 1–2 bullet lines ("3 substeps detected", "Similar past cards averaged 3.2 h")
  - "Use this estimate" button fills the `estimate_hours` input
- **Estimation logic:**
  1. Fetch all completed cards in the same board → compute average time logged per substep count bucket
  2. Score current card: substep count, description word count, priority weight
  3. Return `{ min, max, confidence, rationale[] }`
- If AI provider (from #26 settings) is configured, optionally pass title+description to the model for a richer estimate

**Components:**
```
components/card/
  EstimateAiPopover.tsx    — popover with suggested range + rationale
```

**No schema changes.** Uses existing `time_logs` and `substeps` IDB data.

---

### Cross-cutting Design Rules (all phases)

| Concern | Rule |
|---|---|
| **Colours** | All `var(--color-*)` tokens only. Never hardcode hex in components. |
| **New routes** | Lazy-loaded chunks in `App.tsx`. Pattern: `lazy(() => import('@/pages/XPage').then(m => ({ default: m.XPage })))` |
| **New IDB stores** | Add to `lib/db/schema.ts`; bump IDB version; write upgrade handler that creates the store + any indexes |
| **New hooks** | Follow `useBoard.ts` / `useCard.ts` patterns: query keys, `useMutation` with `onSuccess` → `queryClient.invalidateQueries` |
| **New pages** | Must include `id="main-content"` on the `<main>` element (SkipNav target) |
| **Portal z-index** | CommandPalette: 9000 · StandupMode: 8000 · Dropdown panels: 200 (existing) |
| **AI keys** | Stored in `localStorage` only. Never log, never send to any server except the configured AI endpoint. |

---

### New Routes Summary

| Route | Component | Phase |
|---|---|---|
| `/boards/:boardId/calendar` | `CalendarPage` | 10 |
| `/boards/:boardId/roadmap` | `RoadmapPage` | 11 |
| `/my-work` | `MyWorkPage` | 10 |

---

### New Component Files (full list)

```
components/
  card/
    MarkdownEditor.tsx        #4
    MarkdownPreview.tsx        #4
    CloneCardDialog.tsx        #5
    ReactionBar.tsx            #9
    AiBreakdownPanel.tsx       #26
    EstimateAiPopover.tsx      #27
  board/
    BulkActionBar.tsx          #6
    StandupMode.tsx            #3
    StandupCardTile.tsx        #3
  calendar/
    CalendarGrid.tsx           #1
    CalendarDayCell.tsx        #1
    CalendarCardPill.tsx       #1
    UnscheduledDrawer.tsx      #1
  roadmap/
    RoadmapLeftPanel.tsx       #14
    RoadmapTimeline.tsx        #14
    RoadmapBar.tsx             #14
    RoadmapMilestone.tsx       #14
    RoadmapTooltip.tsx         #14
    RoadmapGroupRow.tsx        #14
  my-work/
    MyWorkGroup.tsx            #2
    MyWorkCardRow.tsx          #2
  shared/
    CommandPalette.tsx         #15
    CommandPaletteResult.tsx   #15
    MentionPicker.tsx          #20 (extracted from CommentThread)
pages/
  CalendarPage.tsx             #1
  MyWorkPage.tsx               #2
  RoadmapPage.tsx              #14
```

---

### IDB Schema Changes Summary

| Table / Store | Change | Feature |
|---|---|---|
| `card_reactions` | New store: `id, card_id, user_id, emoji, created_at` | #9 |
| `card_dependencies` | Add `rel_type` field (default `'blocks'`) | #10 |
| `substeps` | Add `start_date DATE` field (nullable) | #14 |

---

### Delivery Order Within Phases

Dependencies between features:
- **#20 depends on #4** — MentionPicker requires MarkdownEditor to exist
- **#26 and #27 share** the AI settings store — build together
- **#14 Roadmap** reuses `GanttBar` drag logic — review `GanttBar.tsx` before building `RoadmapBar.tsx` to extract shared drag-resize hook

Recommended build order within Phase 9:
`#4 → #20 → #5 → #6 → #9 → #10`

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
