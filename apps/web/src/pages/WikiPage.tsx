import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, BookOpen, LayoutDashboard, Layers, Square, List, CalendarDays,
  GanttChartSquare, TrendingUp, Zap, BarChart3, Brain, Command, Flag, Sparkles,
  Settings, Users, HelpCircle, ChevronRight, Kanban, Clock, Tag, MessageSquare,
  Link2, Star, Copy, CheckSquare, MapIcon, Presentation, GitBranch,
} from 'lucide-react';
import { AppLogo } from '@/components/shared/AppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Content helpers ───────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/20 rounded-lg px-4 py-3 text-sm text-[var(--color-text)]">
      <span className="shrink-0 mt-0.5 text-[var(--color-accent)]">💡</span>
      <span>{children}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/10 dark:border-amber-700/40 dark:text-amber-300">
      <span className="shrink-0 mt-0.5">📌</span>
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded shadow-sm text-[var(--color-text)]">
      {children}
    </kbd>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-[var(--color-text)]">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function FeatureGrid({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.title} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">{item.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-[var(--color-primary)] border-b border-[var(--color-border)] pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ── Wiki content ──────────────────────────────────────────────────────────────

const WIKI_CONTENT: Record<string, React.ReactNode> = {
  'getting-started': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] leading-relaxed">
        QuestBoard is a local-first project management app inspired by Trello. Everything is stored
        in your browser — no server, no account required beyond the login screen.
      </p>
      <Section title="Logging in">
        <p className="text-sm text-[var(--color-text)]">Use the credentials created during setup. The default demo account is:</p>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 font-mono text-sm space-y-1">
          <p><span className="text-[var(--color-text-muted)]">Username:</span> <strong>cabal</strong></p>
          <p><span className="text-[var(--color-text-muted)]">Password:</span> <strong>cabal</strong></p>
        </div>
        <Note>All data is stored in IndexedDB in your browser. Clearing site data will erase everything.</Note>
      </Section>
      <Section title="Creating your first board">
        <Steps items={[
          'Click "New Board" in the top-right of the Boards page.',
          'Type a name and press Enter or click Create.',
          'You\'ll be taken directly to your new board.',
          'Click "+ Add Column" to create your first workflow stage (e.g. To Do, In Progress, Done).',
        ]} />
      </Section>
      <Section title="Interface overview">
        <FeatureGrid items={[
          { icon: '🗂️', title: 'Boards page', desc: 'Your home — lists all boards, access templates, My Work.' },
          { icon: '📋', title: 'Board view', desc: 'Kanban columns with draggable cards.' },
          { icon: '⌨️', title: 'Command palette', desc: 'Press Ctrl+K anywhere to search cards, boards, and actions.' },
          { icon: '🏠', title: 'My Work', desc: 'Cross-board view of all cards assigned to you.' },
        ]} />
      </Section>
      <Tip>Use <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> at any time to jump between boards or cards without navigating manually.</Tip>
    </div>
  ),

  'boards-columns': (
    <div className="space-y-6">
      <Section title="Creating & managing boards">
        <Steps items={[
          'From the Boards page, click "New Board" or "From Template".',
          'Enter a name — keep it descriptive (e.g. "Q3 Feature Releases").',
          'Once inside the board, the header shows the board name, member count, and navigation icons.',
        ]} />
        <FeatureGrid items={[
          { icon: '📦', title: 'Archive a board', desc: 'Use the ⋯ menu on a board card → Archive. Archived boards are hidden from the main list.' },
          { icon: '🗑️', title: 'Delete a board', desc: '⋯ menu → Delete board. This is permanent and cannot be undone.' },
        ]} />
      </Section>
      <Section title="Columns">
        <p className="text-sm text-[var(--color-text)]">Columns represent workflow stages (e.g. Backlog → In Progress → Review → Done).</p>
        <Steps items={[
          'Click the "+ Add Column" button at the right edge of the board.',
          'Type a name and press Enter.',
          'Drag the column header to reorder columns.',
          'Double-click a column name to rename it inline.',
        ]} />
      </Section>
      <Section title="WIP limits">
        <p className="text-sm text-[var(--color-text)]">Work-In-Progress limits prevent columns from becoming overloaded.</p>
        <Steps items={[
          'Click the gear/settings icon on a column header.',
          'Set a WIP limit number.',
          'The column header turns amber when at the limit.',
          'Hard WIP mode blocks new cards from being added when the column is full.',
        ]} />
        <Tip>WIP limits are a Kanban best practice — try setting them on your "In Progress" column to 3–5.</Tip>
      </Section>
      <Section title="Column collapse">
        <p className="text-sm text-[var(--color-text)]">Click the collapse arrow on a column header to fold it into a narrow strip, giving more space to active columns.</p>
      </Section>
    </div>
  ),

  'cards': (
    <div className="space-y-6">
      <Section title="Creating cards">
        <Steps items={[
          'Click "+ Add card" at the bottom of any column.',
          'Type a title (max 140 characters) and press Enter.',
          'The card appears at the bottom of the column.',
          'Click the card to open the detail drawer for full editing.',
        ]} />
      </Section>
      <Section title="Card fields">
        <div className="space-y-2">
          {[
            ['Title', 'Required. Shown on the card face. Max 140 chars.'],
            ['Description', 'Rich Markdown text with @mention support. Supports **bold**, *italic*, `code`, lists, headings, and links.'],
            ['Priority', 'Low / Medium / High / Critical. Shown as a colour-coded badge on the card face.'],
            ['Start & End date', 'Shown on the calendar view and roadmap. End date drives overdue detection.'],
            ['Estimate (hours)', 'Used in analytics velocity charts and sprint planning.'],
            ['Cover colour', 'Coloured strip at the top of the card face for quick visual grouping.'],
          ].map(([field, desc]) => (
            <div key={field} className="flex gap-3 text-sm border-b border-[var(--color-border)] pb-2 last:border-0">
              <span className="shrink-0 font-semibold text-[var(--color-primary)] w-28">{field}</span>
              <span className="text-[var(--color-text-muted)]">{desc}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Assignees">
        <Steps items={[
          'Open a card → Assignees section.',
          'Click a team member\'s avatar to assign/unassign.',
          'Assigned cards appear in the member\'s My Work page.',
          'Filter the board by assignee using the Filter Bar.',
        ]} />
      </Section>
      <Section title="Labels & tags">
        <p className="text-sm text-[var(--color-text)]">Labels are board-level colour tags (e.g. "Bug", "Feature"). Tags are free-form text keywords.</p>
        <Steps items={[
          'Create labels via the Tag icon in the board header.',
          'Apply labels to a card in the Labels section of the detail drawer.',
          'Filter the board by label using the Filter Bar.',
        ]} />
      </Section>
    </div>
  ),

  'card-features': (
    <div className="space-y-6">
      <Section title="Substeps / Checklist">
        <p className="text-sm text-[var(--color-text)]">Break a card into smaller actionable steps.</p>
        <Steps items={[
          'Open a card → Substeps tab.',
          'Click "Add substep" and type a name.',
          'Tick the checkbox to mark a substep complete.',
          'Assign a substep to a team member or set a target date.',
          'Drag substeps to reorder them.',
        ]} />
        <Tip>The card face shows a progress bar (e.g. "2/5") when substeps exist.</Tip>
      </Section>
      <Section title="Time tracking">
        <Steps items={[
          'Open a card → Time tab.',
          'Click "Log time" and enter minutes (or use the built-in timer).',
          'Mark entries as billable if needed.',
          'View total hours per card in the detail drawer.',
          'Analytics → Velocity chart shows team effort over time.',
        ]} />
      </Section>
      <Section title="Comments">
        <Steps items={[
          'Open a card → Comments tab.',
          'Type in the text box and press Enter or click "Post".',
          'Use @name to mention a team member — they get a notification.',
          'Edit or delete your own comments with the pencil/trash icons.',
          'Reply to a comment to start a thread.',
        ]} />
      </Section>
      <Section title="Dependencies">
        <p className="text-sm text-[var(--color-text)]">Link cards that have blocking relationships.</p>
        <FeatureGrid items={[
          { icon: '🔗', title: 'Blocks', desc: 'This card blocks another card from starting.' },
          { icon: '🔗', title: 'Blocked by', desc: 'This card cannot start until another is done.' },
          { icon: '↔️', title: 'Relates to', desc: 'Informational link — no blocking semantics.' },
          { icon: '📋', title: 'Duplicates', desc: 'Marks this card as a duplicate of another.' },
        ]} />
        <Note>The Gantt view draws dependency arrows between linked cards automatically.</Note>
      </Section>
      <Section title="Emoji reactions">
        <p className="text-sm text-[var(--color-text)]">React to a card with emoji (👍 ❤️ 🎉 etc.) via the reaction bar at the bottom of the card detail. Reactions are visible to all board members.</p>
      </Section>
      <Section title="Card cloning">
        <Steps items={[
          'Open a card → click the Clone button (top-right).',
          'Choose what to copy: substeps, labels, assignees, custom fields.',
          'The cloned card appears in the same column.',
        ]} />
      </Section>
      <Section title="Bulk actions">
        <Steps items={[
          'Click the checkbox that appears on hover over a card (or enable Bulk mode in the toolbar).',
          'Select multiple cards.',
          'Use the action bar that appears at the bottom: move, label, assign, archive, or set priority.',
          'Press Escape to exit bulk mode.',
        ]} />
      </Section>
    </div>
  ),

  'views': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Switch views using the view-switcher icons in the Filter Bar below the board header.</p>
      <Section title="Kanban (default)">
        <p className="text-sm text-[var(--color-text)]">The classic column-and-card layout. Drag cards between columns to update status. Drag cards within a column to reorder.</p>
      </Section>
      <Section title="Table view">
        <p className="text-sm text-[var(--color-text)]">A spreadsheet-style list of all cards. Click any cell to edit inline. Sort by any column header. Useful for bulk reviewing fields.</p>
      </Section>
      <Section title="Swimlane view">
        <p className="text-sm text-[var(--color-text)]">Horizontal rows that group cards by priority, assignee, or label. Each row shows the same column structure. Drag cards across swimlanes to reassign the grouping field.</p>
      </Section>
      <Section title="Calendar view">
        <Steps items={[
          'Cards with an end_date (or start_date) appear on the monthly grid.',
          'Drag a card to a different day to update its date.',
          'Cards without dates appear in an "Unscheduled" sidebar on the right.',
          'Click a card to open the detail drawer.',
        ]} />
      </Section>
      <Section title="Gantt chart">
        <p className="text-sm text-[var(--color-text)]">Timeline bars for each card from start_date to end_date.</p>
        <FeatureGrid items={[
          { icon: '↔️', title: 'Resize', desc: 'Drag the left or right edge of a bar to change dates.' },
          { icon: '⬛', title: 'Move', desc: 'Drag the bar body to shift both dates together.' },
          { icon: '◆', title: 'Milestones', desc: 'Cards with only an end_date appear as diamonds.' },
          { icon: '→', title: 'Dependency arrows', desc: 'Drawn between linked blocking/blocked cards.' },
          { icon: '🔍', title: 'Zoom', desc: 'Month / Quarter / Year zoom levels.' },
        ]} />
      </Section>
      <Section title="Roadmap view">
        <p className="text-sm text-[var(--color-text)]">Similar to Gantt but with group-by options (Column, Priority, Flat). Features a "Today" marker line and zoom controls.</p>
      </Section>
      <Section title="Dashboard view">
        <p className="text-sm text-[var(--color-text)]">Add, remove, and reorder widgets for a board overview. Available widgets:</p>
        <FeatureGrid items={[
          { icon: '📊', title: 'KPI summary', desc: 'Total / active / overdue card counts.' },
          { icon: '📈', title: 'Trend analysis', desc: 'Created vs completed over 8 weeks.' },
          { icon: '🥧', title: 'Priority breakdown', desc: 'Bar chart by priority level.' },
          { icon: '👥', title: 'Assignee workload', desc: 'Cards per team member.' },
          { icon: '🔥', title: 'Recent activity', desc: 'Latest card updates and comments.' },
          { icon: '☁️', title: 'Word cloud', desc: 'Most-used keywords from card titles.' },
          { icon: '⏱️', title: 'Avg close time', desc: 'Per-user card close speed.' },
          { icon: '📅', title: 'Upcoming due', desc: 'Cards due in the next 14 days.' },
        ]} />
        <Tip>Drag widget tiles by their grip handle to reorder. Click × to remove a widget.</Tip>
      </Section>
    </div>
  ),

  'sprint-tracking': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Sprint tracking is available for every board. Access it via the Flag icon in the board header.</p>
      <Section title="Creating a sprint">
        <Steps items={[
          'Click the Flag icon in the board header to open the Sprint Panel.',
          'Click "New Sprint" and enter a name, start date, and end date.',
          'The sprint is created in "planning" status.',
        ]} />
      </Section>
      <Section title="Sprint Backlog page">
        <p className="text-sm text-[var(--color-text)]">Navigate to <strong>Sprint Backlog</strong> (link in board header) for a two-panel view:</p>
        <FeatureGrid items={[
          { icon: '📋', title: 'Backlog panel', desc: 'All unassigned cards. Drag or click "Add to Sprint" to include them.' },
          { icon: '🏃', title: 'Sprint panel', desc: 'Cards in the current sprint. Shows completion progress.' },
        ]} />
      </Section>
      <Section title="Active sprint banner">
        <p className="text-sm text-[var(--color-text)]">When a sprint is active, a thin banner shows below the board header with a progress bar, days remaining (turns red when ≤3 days left), and a link to the backlog.</p>
      </Section>
      <Section title="Sprint lifecycle">
        <FeatureGrid items={[
          { icon: '📝', title: 'Planning', desc: 'Sprint created but not started. Add cards to scope.' },
          { icon: '▶️', title: 'Active', desc: 'Sprint started. Only one sprint can be active at a time.' },
          { icon: '✅', title: 'Completed', desc: 'Sprint finished. Incomplete cards stay in the sprint for review.' },
          { icon: '❌', title: 'Cancelled', desc: 'Sprint abandoned — cards return to the backlog.' },
        ]} />
      </Section>
    </div>
  ),

  'automation': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Automation rules fire automatically when events happen on the board. Access via the Zap icon in the board header.</p>
      <Section title="How rules work">
        <p className="text-sm text-[var(--color-text)]">Each rule has three parts:</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            ['Trigger', 'The event that fires the rule (e.g. card moved to a column).', 'bg-blue-50 border-blue-200 text-blue-800'],
            ['Conditions', 'Optional filters (e.g. only if priority is High).', 'bg-amber-50 border-amber-200 text-amber-800'],
            ['Actions', 'What to do when the rule fires (e.g. assign owner, send webhook).', 'bg-green-50 border-green-200 text-green-800'],
          ].map(([label, desc, cls]) => (
            <div key={label} className={cn('border rounded-lg p-3', cls)}>
              <p className="font-semibold">{label}</p>
              <p className="text-xs mt-1 opacity-80">{desc}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Triggers">
        <FeatureGrid items={[
          { icon: '↗️', title: 'card.moved', desc: 'Card moved to a specific column.' },
          { icon: '✨', title: 'card.created', desc: 'New card added to the board.' },
          { icon: '📅', title: 'card.due_date', desc: 'Card is due within N days.' },
          { icon: '✅', title: 'substep.all_complete', desc: 'All substeps on a card are ticked.' },
          { icon: '🏷️', title: 'label.added', desc: 'A specific label is applied to a card.' },
          { icon: '🔧', title: 'custom_field.changed', desc: 'A custom field value changes.' },
          { icon: '⏰', title: 'schedule', desc: 'Runs on a cron-style time schedule.' },
        ]} />
      </Section>
      <Section title="Actions">
        <FeatureGrid items={[
          { icon: '↗️', title: 'Move card', desc: 'Move the card to a different column.' },
          { icon: '👤', title: 'Assign owner', desc: 'Add a specific user as assignee.' },
          { icon: '🏷️', title: 'Add / Remove label', desc: 'Apply or strip a label.' },
          { icon: '🚦', title: 'Set priority', desc: 'Change the card\'s priority.' },
          { icon: '📋', title: 'Create substep', desc: 'Add a new substep to the card.' },
          { icon: '🔔', title: 'Send notification', desc: 'Notify a user or the card\'s assignees.' },
          { icon: '🌐', title: 'Webhook', desc: 'POST a JSON payload to any URL (e.g. Slack).' },
          { icon: '📧', title: 'Send email', desc: 'Email a configured recipient.' },
          { icon: '📁', title: 'Archive card', desc: 'Archive the triggering card.' },
        ]} />
      </Section>
      <Tip>Use the "Test rule" button to dry-run an automation against the last 10 cards before enabling it.</Tip>
    </div>
  ),

  'analytics': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Access Analytics via the BarChart icon in the board header. Charts use all non-archived cards on the board.</p>
      <Section title="KPI cards">
        <FeatureGrid items={[
          { icon: '📦', title: 'Total cards', desc: 'All active (non-archived) cards.' },
          { icon: '✅', title: 'Completed', desc: 'Cards currently in the rightmost column.' },
          { icon: '⏱️', title: 'Avg cycle time', desc: 'Average days from first move to done.' },
          { icon: '🔥', title: 'Cards this week', desc: 'Cards completed in the last 7 days.' },
        ]} />
      </Section>
      <Section title="Cycle time chart">
        <p className="text-sm text-[var(--color-text)]">A scatter plot of each card's time in the workflow (first column entry to Done). Useful for spotting outliers and setting reliable SLAs.</p>
      </Section>
      <Section title="Burndown chart">
        <p className="text-sm text-[var(--color-text)]">Shows ideal vs actual work remaining over a date range. Select a sprint or custom date range with the date pickers.</p>
      </Section>
      <Section title="Velocity chart">
        <p className="text-sm text-[var(--color-text)]">Bar chart of estimated hours completed per week. Use this to set realistic sprint targets — velocity stabilises after 3–4 sprints.</p>
      </Section>
      <Section title="Activity heatmap">
        <p className="text-sm text-[var(--color-text)]">GitHub-style contribution grid showing card completions by day. Helps identify days of the week when your team is most productive.</p>
      </Section>
    </div>
  ),

  'ai-features': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">AI features work with a heuristic fallback out of the box — no API key needed. Connect an OpenAI key for smarter results.</p>
      <Section title="Configuring AI">
        <Steps items={[
          'Click the gear icon → Settings → AI tab.',
          'Choose provider: Heuristic (default, no key) or OpenAI.',
          'If OpenAI: paste your API key and select a model (gpt-4o, gpt-4o-mini, etc.).',
          'Keys are stored in localStorage on your device only — never sent to our servers.',
        ]} />
      </Section>
      <Section title="AI card breakdown">
        <p className="text-sm text-[var(--color-text)]">Automatically suggest substeps for a card based on its title.</p>
        <Steps items={[
          'Open a card → Substeps tab → click "Generate" (sparkle button).',
          'AI suggests 4–8 substeps.',
          'Tick the ones you want to keep.',
          'Click "Add selected" to insert them.',
          'Click the refresh icon to regenerate with a different set.',
        ]} />
      </Section>
      <Section title="AI effort estimation">
        <p className="text-sm text-[var(--color-text)]">Get a suggested hour estimate for a card.</p>
        <Steps items={[
          'Open a card → click the AI wand icon next to the Estimate field.',
          'The AI analyses the card title, description, and substep count.',
          'Click "Use Xh" to apply the suggestion to the estimate field.',
        ]} />
        <Tip>The heuristic estimator works by keyword matching — connecting OpenAI gives much better results for complex technical cards.</Tip>
      </Section>
    </div>
  ),

  'command-palette': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">The command palette gives you keyboard-first access to everything in QuestBoard.</p>
      <Section title="Opening the palette">
        <p className="text-sm text-[var(--color-text)]">Press <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> (or <Kbd>⌘</Kbd>+<Kbd>K</Kbd> on Mac) from anywhere in the app.</p>
      </Section>
      <Section title="What you can search">
        <FeatureGrid items={[
          { icon: '📋', title: 'Cards', desc: 'Search card titles across all boards. Press Enter to open the card.' },
          { icon: '🗂️', title: 'Boards', desc: 'Jump directly to a board.' },
          { icon: '⚡', title: 'Actions', desc: 'Trigger app actions like opening Settings or creating a board.' },
        ]} />
      </Section>
      <Section title="Navigation">
        <div className="space-y-1 text-sm text-[var(--color-text)]">
          <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
            <span>Move selection</span><span><Kbd>↑</Kbd> / <Kbd>↓</Kbd></span>
          </div>
          <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
            <span>Open result</span><span><Kbd>Enter</Kbd></span>
          </div>
          <div className="flex justify-between py-1">
            <span>Close palette</span><span><Kbd>Esc</Kbd></span>
          </div>
        </div>
      </Section>
    </div>
  ),

  'my-work': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">My Work is a personal cross-board view of every card assigned to you. Access it from the Boards page header or via Ctrl+K → "My Work".</p>
      <Section title="Card groups">
        <FeatureGrid items={[
          { icon: '🔴', title: 'Overdue', desc: 'Cards with end_date before today.' },
          { icon: '🟡', title: 'Due today', desc: 'Cards due on today\'s date.' },
          { icon: '🟢', title: 'Due this week', desc: 'Cards due within the next 7 days.' },
          { icon: '⚪', title: 'Later', desc: 'Everything else assigned to you.' },
        ]} />
      </Section>
      <Section title="Opening cards">
        <p className="text-sm text-[var(--color-text)]">Click any card row to open the full Card Detail Drawer — you can edit the card without leaving My Work.</p>
      </Section>
    </div>
  ),

  'standup-mode': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Standup mode turns QuestBoard into a presentation screen for daily standups.</p>
      <Section title="Launching standup mode">
        <Steps items={[
          'Open a board → click the Presentation icon in the board header.',
          'The screen goes fullscreen with a dark overlay.',
          'Each column is shown with its cards highlighted one at a time.',
        ]} />
      </Section>
      <Section title="Controls">
        <div className="space-y-1 text-sm text-[var(--color-text)]">
          <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
            <span>Next card</span><span><Kbd>→</Kbd> or click</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
            <span>Previous card</span><span><Kbd>←</Kbd></span>
          </div>
          <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
            <span>Start / pause timer</span><span><Kbd>Space</Kbd></span>
          </div>
          <div className="flex justify-between py-1">
            <span>Exit standup</span><span><Kbd>Esc</Kbd></span>
          </div>
        </div>
      </Section>
      <Tip>The built-in timer helps keep standups under 15 minutes. It counts up and turns amber at 10 min.</Tip>
    </div>
  ),

  'templates': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Templates let you spin up a new board with pre-configured columns and starter cards.</p>
      <Section title="Built-in templates">
        <FeatureGrid items={[
          { icon: '🏃', title: 'Scrum Sprint', desc: 'Backlog, Sprint, In Progress, Review, Done.' },
          { icon: '📋', title: 'Simple Kanban', desc: 'To Do, In Progress, Done.' },
          { icon: '🐛', title: 'Bug Tracker', desc: 'New, Triaged, In Fix, In Review, Closed.' },
          { icon: '📰', title: 'Content Calendar', desc: 'Ideas, Writing, Editing, Scheduled, Published.' },
          { icon: '🚀', title: 'Product Launch', desc: 'Research, Design, Build, QA, Launch.' },
        ]} />
      </Section>
      <Section title="Saving a custom template">
        <Steps items={[
          'Set up a board exactly how you want it (columns, labels, custom fields).',
          'Click "From Template" → "Save current board as template".',
          'Give the template a name.',
          'It appears in the "My Templates" tab of the gallery.',
        ]} />
      </Section>
    </div>
  ),

  'custom-fields': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Custom fields let you add board-specific metadata to cards — beyond the built-in fields.</p>
      <Section title="Creating custom fields">
        <Steps items={[
          'Open a board → click the custom fields icon in the board header.',
          'Click "Add field" and choose a type.',
          'Set a name and optionally mark it as required.',
          'All cards on the board will now show this field.',
        ]} />
      </Section>
      <Section title="Field types">
        <FeatureGrid items={[
          { icon: '📝', title: 'Text', desc: 'Free-form single-line text.' },
          { icon: '🔢', title: 'Number', desc: 'Decimal number with optional unit.' },
          { icon: '▼', title: 'Dropdown', desc: 'Predefined options with optional colours.' },
          { icon: '☑️', title: 'Checkbox', desc: 'Boolean yes/no toggle.' },
          { icon: '📅', title: 'Date', desc: 'Date picker field.' },
          { icon: '🔗', title: 'URL', desc: 'Validated URL field.' },
          { icon: '📧', title: 'Email', desc: 'Email address with mailto link.' },
          { icon: '👤', title: 'Person', desc: 'Select a board member.' },
        ]} />
      </Section>
    </div>
  ),

  'settings': (
    <div className="space-y-6">
      <p className="text-[var(--color-text-muted)] text-sm">Access Settings via the gear icon in the nav header, or press <Kbd>Ctrl</Kbd>+<Kbd>,</Kbd>.</p>
      <Section title="Appearance tab">
        <FeatureGrid items={[
          { icon: '🌙', title: 'Dark / Light mode', desc: 'Toggle the colour scheme. Stored per device.' },
          { icon: '☁️', title: 'Word Cloud Banner', desc: 'Enable/disable the animated word cloud on the boards page.' },
        ]} />
      </Section>
      <Section title="Profile / Avatar tab">
        <Steps items={[
          'Choose your department role (8 options).',
          'Choose a colour variant (4 options per role) — 32 combinations total.',
          'Click "Save avatar".',
        ]} />
      </Section>
      <Section title="Notifications tab">
        <p className="text-sm text-[var(--color-text)]">Control which events create in-app notifications: card assignments, due date reminders, comments mentioning you, and automation triggers.</p>
      </Section>
      <Section title="AI tab">
        <p className="text-sm text-[var(--color-text)]">Configure the AI provider (Heuristic / OpenAI), API key, and model. See <strong>AI Features</strong> for full setup instructions.</p>
      </Section>
      <Section title="Data tab">
        <p className="text-sm text-[var(--color-text)]">Export your boards as CSV, reset IndexedDB, or view raw storage usage.</p>
      </Section>
    </div>
  ),

  'keyboard-shortcuts': (
    <div className="space-y-6">
      <Section title="Global shortcuts">
        <div className="space-y-1 text-sm text-[var(--color-text)]">
          {[
            ['Open command palette', 'Ctrl+K'],
            ['Open settings', 'Ctrl+,'],
            ['Go to My Work', 'Alt+M'],
            ['Toggle notifications', 'Alt+T'],
          ].map(([action, shortcut]) => (
            <div key={action} className="flex justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
              <span>{action}</span>
              <span className="font-mono text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5">{shortcut}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Board / card shortcuts">
        <div className="space-y-1 text-sm text-[var(--color-text)]">
          {[
            ['Close card drawer', 'Esc'],
            ['Cycle card priority', 'P (when card is focused)'],
            ['Exit bulk mode', 'Esc'],
          ].map(([action, shortcut]) => (
            <div key={action} className="flex justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
              <span>{action}</span>
              <span className="font-mono text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5">{shortcut}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Standup mode shortcuts">
        <div className="space-y-1 text-sm text-[var(--color-text)]">
          {[
            ['Next card', '→ or click'],
            ['Previous card', '←'],
            ['Start / pause timer', 'Space'],
            ['Exit standup', 'Esc'],
          ].map(([action, shortcut]) => (
            <div key={action} className="flex justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
              <span>{action}</span>
              <span className="font-mono text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-0.5">{shortcut}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
};

// ── Sidebar structure ─────────────────────────────────────────────────────────

interface WikiTopic {
  id: string;
  label: string;
  icon: React.ReactNode;
  keywords: string;
}

interface WikiCategory {
  label: string;
  topics: WikiTopic[];
}

const CATEGORIES: WikiCategory[] = [
  {
    label: 'Getting started',
    topics: [
      { id: 'getting-started', label: 'Introduction', icon: <BookOpen className="h-4 w-4" />, keywords: 'login intro overview interface start create board first' },
    ],
  },
  {
    label: 'Boards & cards',
    topics: [
      { id: 'boards-columns', label: 'Boards & columns', icon: <LayoutDashboard className="h-4 w-4" />, keywords: 'board column create archive wip limit collapse reorder rename' },
      { id: 'cards', label: 'Cards', icon: <Square className="h-4 w-4" />, keywords: 'card create title description priority date estimate assignee label tag cover' },
      { id: 'card-features', label: 'Card features', icon: <List className="h-4 w-4" />, keywords: 'substep checklist time tracking comment attachment photo dependency reaction clone bulk' },
      { id: 'custom-fields', label: 'Custom fields', icon: <Tag className="h-4 w-4" />, keywords: 'custom field text number dropdown checkbox date url email person' },
    ],
  },
  {
    label: 'Views',
    topics: [
      { id: 'views', label: 'All views', icon: <Layers className="h-4 w-4" />, keywords: 'kanban table swimlane calendar gantt roadmap dashboard widget view switch' },
      { id: 'sprint-tracking', label: 'Sprint tracking', icon: <Flag className="h-4 w-4" />, keywords: 'sprint backlog planning active complete cancel banner progress' },
    ],
  },
  {
    label: 'Features',
    topics: [
      { id: 'automation', label: 'Automation', icon: <Zap className="h-4 w-4" />, keywords: 'automation rule trigger condition action webhook notify move assign archive schedule' },
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, keywords: 'analytics kpi cycle time burndown velocity heatmap chart metric' },
      { id: 'ai-features', label: 'AI features', icon: <Brain className="h-4 w-4" />, keywords: 'ai openai breakdown substep estimate effort heuristic api key model gpt' },
    ],
  },
  {
    label: 'Navigation & shortcuts',
    topics: [
      { id: 'command-palette', label: 'Command palette', icon: <Command className="h-4 w-4" />, keywords: 'command palette ctrl+k search jump navigate quick' },
      { id: 'my-work', label: 'My Work', icon: <CheckSquare className="h-4 w-4" />, keywords: 'my work assigned cross-board overdue today week personal' },
      { id: 'standup-mode', label: 'Standup mode', icon: <Presentation className="h-4 w-4" />, keywords: 'standup presentation mode fullscreen timer navigate escape' },
      { id: 'keyboard-shortcuts', label: 'Keyboard shortcuts', icon: <Kbd>⌨</Kbd>, keywords: 'keyboard shortcut hotkey ctrl alt escape ctrl+k settings bulk standup' },
    ],
  },
  {
    label: 'Setup',
    topics: [
      { id: 'templates', label: 'Board templates', icon: <Sparkles className="h-4 w-4" />, keywords: 'template scrum kanban bug content calendar product launch custom save' },
      { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, keywords: 'settings appearance dark light mode avatar profile notification ai data export' },
    ],
  },
];

// ── Page component ────────────────────────────────────────────────────────────

export function WikiPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>('getting-started');
  const [query, setQuery] = useState('');

  const allTopics = useMemo(() => CATEGORIES.flatMap((c) => c.topics), []);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        topics: cat.topics.filter(
          (t) => t.label.toLowerCase().includes(q) || t.keywords.includes(q),
        ),
      }))
      .filter((cat) => cat.topics.length > 0);
  }, [query]);

  const selectedTopic = allTopics.find((t) => t.id === selectedId);
  const content = WIKI_CONTENT[selectedId];

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center gap-4 shadow-md flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/boards')}
          className="text-white hover:bg-white/10"
          aria-label="Back to boards"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <AppLogo variant="nav" />
        <div className="flex items-center gap-2 ml-2">
          <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          <span className="text-sm font-medium text-white/80">Help & Documentation</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Search docs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {filteredCategories.map((cat) => (
              <div key={cat.label} className="mb-4">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide px-2 mb-1">
                  {cat.label}
                </p>
                {cat.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => { setSelectedId(topic.id); setQuery(''); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                      selectedId === topic.id
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                    )}
                  >
                    <span className={cn('shrink-0', selectedId === topic.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')}>
                      {topic.icon}
                    </span>
                    {topic.label}
                  </button>
                ))}
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] px-2 py-4 text-center">No results for "{query}"</p>
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {selectedTopic && (
              <div className="flex items-center gap-2.5 mb-6">
                <span className="text-[var(--color-accent)]">{selectedTopic.icon}</span>
                <h1 className="text-2xl font-bold text-[var(--color-primary)]">{selectedTopic.label}</h1>
              </div>
            )}
            {content ?? (
              <p className="text-[var(--color-text-muted)]">Select a topic from the sidebar.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
