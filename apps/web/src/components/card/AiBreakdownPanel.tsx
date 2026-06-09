/**
 * AiBreakdownPanel — suggests substep breakdowns for a card.
 *
 * Heuristic mode (always available): keyword-matched templates.
 * OpenAI mode: if provider=openai + key set in Settings → AI tab.
 */
import { useState } from 'react';
import { Sparkles, Plus, Check, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiStore } from '@/stores/ai.store';
import { useCreateSubstep } from '@/hooks/useSubsteps';
import type { Card } from '@questboard/shared';

// ── Keyword templates ─────────────────────────────────────────────────────────

const KEYWORD_TEMPLATES: Array<{ keywords: string[]; steps: string[] }> = [
  {
    keywords: ['auth', 'login', 'signup', 'register', 'password', 'session', 'oauth'],
    steps: [
      'Design auth schema & token strategy',
      'Implement auth middleware',
      'Build login / register UI',
      'Add session management & refresh',
      'Write auth integration tests',
    ],
  },
  {
    keywords: ['api', 'endpoint', 'rest', 'route', 'backend', 'handler'],
    steps: [
      'Define API contract & Zod schema',
      'Implement route handler',
      'Add input validation & error handling',
      'Write integration tests',
      'Update API documentation',
    ],
  },
  {
    keywords: ['ui', 'component', 'design', 'layout', 'page', 'view', 'screen'],
    steps: [
      'Create wireframe / mockup',
      'Build component skeleton',
      'Wire up state & interactions',
      'Handle loading & error states',
      'Accessibility review (WCAG)',
    ],
  },
  {
    keywords: ['database', 'migration', 'schema', 'table', 'model', 'idb', 'indexeddb'],
    steps: [
      'Write migration / upgrade script',
      'Update TypeScript row types',
      'Verify upgrade path from previous version',
      'Add / update seed data',
      'Test rollback scenario',
    ],
  },
  {
    keywords: ['bug', 'fix', 'error', 'crash', 'issue', 'broken', 'regression'],
    steps: [
      'Reproduce the issue reliably',
      'Identify root cause',
      'Implement fix',
      'Add regression test',
      'Deploy & verify in production',
    ],
  },
  {
    keywords: ['test', 'spec', 'coverage', 'unit', 'e2e', 'vitest', 'playwright'],
    steps: [
      'Identify cases to cover',
      'Write happy-path tests',
      'Write edge-case & error-path tests',
      'Run suite & fix failures',
      'Review coverage report',
    ],
  },
  {
    keywords: ['deploy', 'release', 'ci', 'pipeline', 'publish', 'ship'],
    steps: [
      'Update changelog & bump version',
      'Tag release in git',
      'Run CI build & tests',
      'Deploy to staging & smoke-test',
      'Promote to production',
    ],
  },
  {
    keywords: ['refactor', 'cleanup', 'simplify', 'extract', 'reorganize', 'restructure'],
    steps: [
      'Map current code structure',
      'Draft refactored design',
      'Implement changes incrementally',
      'Ensure no regression (run tests)',
      'Update documentation',
    ],
  },
  {
    keywords: ['dashboard', 'analytics', 'chart', 'graph', 'report', 'metrics'],
    steps: [
      'Identify required KPIs & data sources',
      'Implement data aggregation',
      'Build chart / widget components',
      'Add date range & filter controls',
      'Performance test with large datasets',
    ],
  },
  {
    keywords: ['notification', 'email', 'alert', 'webhook', 'socket', 'realtime'],
    steps: [
      'Define notification types & payloads',
      'Implement send / emit logic',
      'Build UI notification indicator',
      'Add read / dismiss tracking',
      'Test delivery across channels',
    ],
  },
];

function heuristicBreakdown(title: string, description: string | null): string[] {
  const haystack = `${title} ${description ?? ''}`.toLowerCase();
  for (const { keywords, steps } of KEYWORD_TEMPLATES) {
    if (keywords.some((k) => new RegExp(`\\b${k}\\b`).test(haystack))) return steps;
  }
  // Generic fallback
  const noun = title.split(' ').slice(0, 4).join(' ');
  return [
    `Research & plan: ${noun}`,
    `Implement core functionality`,
    `Handle edge cases & errors`,
    `Write tests`,
    `Review & document`,
  ];
}

// ── OpenAI call ───────────────────────────────────────────────────────────────

async function openAiBreakdown(
  apiKey: string,
  model: string,
  card: Card,
): Promise<string[]> {
  const prompt = `You are a project management assistant. Given a task card, break it down into 4-6 concrete, actionable subtasks.

Card title: ${card.title}
${card.description ? `Description: ${card.description.slice(0, 500)}` : ''}
Priority: ${card.priority}

Return ONLY a valid JSON array of strings, nothing else. Example: ["Step 1", "Step 2", "Step 3"]`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err?.error as Record<string, unknown>)?.message;
    throw new Error(typeof msg === 'string' ? msg : `OpenAI error ${resp.status}`);
  }

  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse AI response');
  return JSON.parse(match[0]) as string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AiBreakdownPanelProps {
  card: Card;
}

export function AiBreakdownPanel({ card }: AiBreakdownPanelProps) {
  const { provider, openaiKey, openaiModel } = useAiStore();
  const create = useCreateSubstep(card.id);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelected(new Set());
    setAdded(new Set());

    try {
      let steps: string[];
      if (provider === 'openai' && openaiKey) {
        steps = await openAiBreakdown(openaiKey, openaiModel, card);
      } else {
        // Slight delay so heuristic doesn't feel instant
        await new Promise((r) => setTimeout(r, 350));
        steps = heuristicBreakdown(card.title, card.description ?? null);
      }
      setSuggestions(steps);
      setSelected(new Set(steps.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate breakdown');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    if (added.has(i)) return;
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const addSingle = async (i: number) => {
    await create.mutateAsync({ name: suggestions[i] });
    setAdded((a) => new Set([...a, i]));
  };

  const addSelected = async () => {
    const toAdd = [...selected].filter((i) => !added.has(i));
    for (const i of toAdd) {
      await create.mutateAsync({ name: suggestions[i] });
    }
    setAdded((a) => new Set([...a, ...selected]));
  };

  const pendingCount = [...selected].filter((i) => !added.has(i)).length;

  return (
    <div className="border border-dashed border-[var(--color-border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg)]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            AI Breakdown
          </span>
          {provider !== 'openai' && (
            <span className="text-[10px] text-[var(--color-text-muted)] italic">
              (heuristic)
            </span>
          )}
        </div>
        {!loading && suggestions.length === 0 && (
          <button
            onClick={generate}
            className="text-xs text-[var(--color-accent)] hover:opacity-80 font-medium transition-opacity"
          >
            Generate
          </button>
        )}
        {!loading && suggestions.length > 0 && (
          <button
            onClick={generate}
            title="Regenerate suggestions"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-5">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
          <span className="text-xs text-[var(--color-text-muted)]">
            {provider === 'openai' ? 'Asking OpenAI…' : 'Analysing task…'}
          </span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-3 py-2 text-xs text-[var(--color-danger)]">{error}</div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && !loading && (
        <div className="px-3 py-2 space-y-1">
          {suggestions.map((s, i) => {
            const isAdded = added.has(i);
            const isSel = selected.has(i);
            return (
              <div
                key={i}
                className={cn(
                  'group flex items-center gap-2 rounded px-2 py-1.5 transition-colors',
                  isAdded ? 'opacity-50' : 'hover:bg-[var(--color-bg)]',
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(i)}
                  disabled={isAdded}
                  aria-label={isAdded ? 'Added' : isSel ? 'Deselect' : 'Select'}
                  className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                    isAdded
                      ? 'bg-green-500 border-green-500'
                      : isSel
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]',
                  )}
                >
                  {(isSel || isAdded) && <Check className="h-2.5 w-2.5 text-white" />}
                </button>

                {/* Label */}
                <span
                  className={cn(
                    'flex-1 text-xs text-[var(--color-text)]',
                    isAdded && 'line-through text-[var(--color-text-muted)]',
                  )}
                >
                  {s}
                </span>

                {/* Quick-add individual */}
                {!isAdded && (
                  <button
                    onClick={() => addSingle(i)}
                    title="Add this subtask now"
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Bulk add button */}
          {pendingCount > 0 && (
            <button
              onClick={addSelected}
              disabled={create.isPending}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs bg-[var(--color-accent)] text-white rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {create.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add {pendingCount} subtask{pendingCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
