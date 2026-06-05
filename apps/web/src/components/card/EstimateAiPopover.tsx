/**
 * EstimateAiPopover — smart effort estimation for a card.
 *
 * Heuristic mode: derives from substep count, priority multiplier,
 *                 and historical board average (blended 60/40).
 * OpenAI mode:   sends card context to OpenAI for a natural-language estimate.
 */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { useAiStore } from '@/stores/ai.store';
import { getDB } from '@/lib/db';
import type { Card } from '@questboard/shared';

// ── Estimation helpers ────────────────────────────────────────────────────────

const PRIORITY_MULT: Record<string, number> = {
  low: 0.75,
  medium: 1.0,
  high: 1.5,
  critical: 2.0,
};

interface EstimateResult {
  suggested: number;
  reasoning: string;
  breakdown: Array<{ label: string; value: string }>;
}

async function heuristicEstimate(card: Card): Promise<EstimateResult> {
  const db = await getDB();

  const [substeps, allTimeLogs, boardCards] = await Promise.all([
    db.getAllFromIndex('substeps', 'by-card', card.id),
    db.getAll('time_logs'),
    db.getAllFromIndex('cards', 'by-board', card.board_id),
  ]);

  const breakdown: Array<{ label: string; value: string }> = [];
  let base = 0;

  // Base from subtask count
  if (substeps.length > 0) {
    base = substeps.length * 0.5;
    breakdown.push({
      label: 'Subtasks',
      value: `${substeps.length} × 0.5h = ${base}h`,
    });
  } else {
    base = 1;
    breakdown.push({ label: 'Base estimate', value: '1h (no subtasks defined)' });
  }

  // Priority multiplier
  const mult = PRIORITY_MULT[card.priority] ?? 1.0;
  if (mult !== 1.0) {
    const before = base;
    base = Math.round(base * mult * 2) / 2;
    breakdown.push({
      label: `Priority (${card.priority})`,
      value: `${before}h × ${mult} = ${base}h`,
    });
  }

  // Historical board average
  const cardIds = new Set(boardCards.map((c) => c.id));
  const boardLogs = allTimeLogs.filter((t) => cardIds.has(t.card_id));
  if (boardLogs.length > 0) {
    const uniqueCards = new Set(boardLogs.map((t) => t.card_id));
    const avgMinutes = boardLogs.reduce((s, t) => s + t.minutes, 0) / uniqueCards.size;
    const avgHours = Math.round(avgMinutes / 60 * 2) / 2;
    if (avgHours > 0) {
      breakdown.push({
        label: 'Board avg/card',
        value: `${avgHours}h (${uniqueCards.size} cards)`,
      });
      // Blend: 60% heuristic, 40% historical
      base = Math.round((base * 0.6 + avgHours * 0.4) * 2) / 2;
    }
  }

  return {
    suggested: Math.max(0.5, base),
    reasoning:
      'Based on subtask count, priority multiplier, and historical board averages.',
    breakdown,
  };
}

async function openAiEstimate(
  apiKey: string,
  model: string,
  card: Card,
): Promise<EstimateResult> {
  const db = await getDB();
  const [substeps, timeLogs] = await Promise.all([
    db.getAllFromIndex('substeps', 'by-card', card.id),
    db.getAllFromIndex('time_logs', 'by-card', card.id),
  ]);
  const totalMins = timeLogs.reduce((s, t) => s + t.minutes, 0);

  const prompt = `Estimate the total effort in hours for this task:

Title: ${card.title}
Priority: ${card.priority}
${card.description ? `Description: ${card.description.slice(0, 400)}` : ''}
Subtasks: ${substeps.length} (${substeps.filter((s) => s.is_complete).length} already done)
Time logged so far: ${Math.round(totalMins / 60 * 10) / 10}h

Return ONLY a JSON object: {"hours": <number with one decimal>, "reasoning": "<one concise sentence>"}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err?.error as Record<string, unknown>)?.message;
    throw new Error(typeof msg === 'string' ? msg : `OpenAI error ${resp.status}`);
  }

  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse AI response');
  const parsed = JSON.parse(match[0]) as { hours: number; reasoning: string };

  return {
    suggested: Math.max(0.5, Math.round((parsed.hours ?? 1) * 2) / 2),
    reasoning: parsed.reasoning ?? 'AI estimate',
    breakdown: [
      { label: 'Subtasks', value: String(substeps.length) },
      { label: 'Time logged', value: `${Math.round(totalMins / 60 * 10) / 10}h` },
    ],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EstimateAiPopoverProps {
  card: Card;
  onEstimate: (hours: number) => void;
}

export function EstimateAiPopover({ card, onEstimate }: EstimateAiPopoverProps) {
  const { provider, openaiKey, openaiModel } = useAiStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const est =
        provider === 'openai' && openaiKey
          ? await openAiEstimate(openaiKey, openaiModel, card)
          : await heuristicEstimate(card);
      setResult(est);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    void run();
  };

  const handleUse = () => {
    if (result) {
      onEstimate(result.suggested);
      setOpen(false);
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={handleOpen}
        title="AI effort estimate"
        className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:opacity-80 transition-opacity ml-2"
      >
        <Sparkles className="h-3 w-3" />
        Estimate
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[250]"
            onClick={() => setOpen(false)}
          >
            <div
              className="absolute bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl w-72 p-4"
              style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
                  <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                  Effort Estimate
                  {provider !== 'openai' && (
                    <span className="text-[10px] font-normal text-[var(--color-text-muted)] italic ml-1">
                      (heuristic)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center gap-2 py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {provider === 'openai' ? 'Asking OpenAI…' : 'Calculating…'}
                  </span>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="py-2">
                  <p className="text-xs text-[var(--color-danger)]">{error}</p>
                  <button
                    onClick={() => void run()}
                    className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Result */}
              {result && !loading && (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[var(--color-accent)]">
                      {result.suggested}h
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {result.reasoning}
                    </p>
                  </div>

                  {result.breakdown.length > 0 && (
                    <div className="space-y-1 border-t border-[var(--color-border)] pt-2">
                      {result.breakdown.map(({ label, value }, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--color-text-muted)]">{label}</span>
                          <span className="text-[var(--color-text)] font-medium">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleUse}
                      className="flex-1 text-xs bg-[var(--color-accent)] text-white rounded-lg px-3 py-2 hover:opacity-90 transition-opacity"
                    >
                      Use {result.suggested}h
                    </button>
                    <button
                      onClick={() => void run()}
                      className="text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg px-3 py-2 hover:border-[var(--color-accent)] transition-colors"
                    >
                      Recalculate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
