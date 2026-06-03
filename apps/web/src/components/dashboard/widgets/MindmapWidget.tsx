/**
 * MindmapWidget — canvas word cloud
 *
 * Extracts keywords from card titles, tags, and label names.
 * Word size is proportional to frequency.
 * Words fill the entire widget area.
 */
import { useRef, useEffect, useMemo, useCallback } from 'react';
import type { Card } from '@questboard/shared';

// ─── Stop words ──────────────────────────────────────────────────────────────

const STOP = new Set([
  'the','a','an','is','in','on','at','to','of','and','or','for','with',
  'by','from','as','this','that','it','be','was','are','were','been',
  'has','have','had','do','does','did','will','would','could','should',
  'may','might','can','its','not','but','so','if','up','out','about',
  'into','than','then','when','where','who','which','how','all','each',
  'more','also','just','over','after','before','any','no','yes','get',
  'use','via','per','add','new','fix','bug','feat','docs','test','todo',
  'wip','tbd','na','etc','vs','see','ref','notes','note','update',
]);

// ─── Deterministic per-word colour ───────────────────────────────────────────

const PALETTE = [
  '#5B4FCF','#D94040','#2EA64A','#E07B2A',
  '#9B59B6','#17A589','#2E86AB','#F39C12',
  '#e91e63','#00bcd4','#8bc34a','#ff5722',
];

function wordColor(word: string): string {
  let h = 0;
  for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ─── Word extraction ─────────────────────────────────────────────────────────

function extractWords(cards: Card[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const card of cards) {
    const sources = [
      card.title,
      ...(card.tags ?? []),
      ...(card.labels ?? []).map((l) => l.name),
    ];
    for (const src of sources) {
      const tokens = src
        .toLowerCase()
        .replace(/[^a-z0-9\s\-_]/g, ' ')
        .split(/[\s\-_]+/)
        .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
      for (const w of tokens) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return freq;
}

// ─── Cloud renderer ──────────────────────────────────────────────────────────

function renderCloud(canvas: HTMLCanvasElement, wordFreqs: Map<string, number>) {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  if (W <= 0 || H <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  if (wordFreqs.size === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No keywords yet — add cards to see the word cloud', W / 2, H / 2);
    return;
  }

  const PAD_X   = 12, PAD_Y = 10;
  const usableW = W - PAD_X * 2;
  const usableH = H - PAD_Y * 2;
  const cx = W / 2, cy = H / 2;

  const sorted    = [...wordFreqs.entries()].sort(([, a], [, b]) => b - a).slice(0, 70);
  const maxFreq   = sorted[0][1];
  const minFreq   = sorted[sorted.length - 1][1];
  const freqRange = Math.max(1, maxFreq - minFreq);

  const MIN_PX = 10;
  const MAX_PX = Math.min(56, Math.floor(Math.min(W, H) * 0.15));

  // Elliptical Archimedean spiral scaled to reach all four edges
  const maxR = Math.max(usableW, usableH) * 0.52;
  const hStr = (usableW / 2) / maxR;
  const vStr = (usableH / 2) / maxR;

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  ctx.textBaseline = 'top';

  for (const [word, freq] of sorted) {
    const t  = (freq - minFreq) / freqRange;
    const fs = Math.round(MIN_PX + t * (MAX_PX - MIN_PX));
    ctx.font = `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const tw = ctx.measureText(word).width + 8;
    const th = fs * 1.35;

    for (let theta = 0; theta < 18 * Math.PI; theta += 0.06) {
      const r  = (theta / (18 * Math.PI)) * maxR;
      const ex = cx + r * hStr * Math.cos(theta * 1.3);
      const ey = cy + r * vStr * Math.sin(theta * 1.3);

      const tx = Math.round(ex - tw / 2);
      const ty = Math.round(ey - th / 2);

      if (tx < PAD_X || tx + tw > W - PAD_X) continue;
      if (ty < PAD_Y || ty + th > H - PAD_Y) continue;

      let hit = false;
      for (const p of placed) {
        if (tx < p.x + p.w + 3 && tx + tw > p.x - 3 &&
            ty < p.y + p.h + 2 && ty + th > p.y - 2) { hit = true; break; }
      }
      if (hit) continue;

      ctx.fillStyle = wordColor(word);
      ctx.fillText(word, tx + 4, ty + 1);
      placed.push({ x: tx, y: ty, w: tw, h: th });
      break;
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MindmapWidgetProps {
  cards: Card[];
}

export function MindmapWidget({ cards }: MindmapWidgetProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const wordFreqs = useMemo(() => extractWords(cards), [cards]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (c) renderCloud(c, wordFreqs);
  }, [wordFreqs]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => draw());
    obs.observe(el);
    return () => obs.disconnect();
  }, [draw]);

  const topWord = [...wordFreqs.entries()].sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Info bar */}
      {wordFreqs.size > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-[var(--color-text-muted)]">
          {topWord && (
            <span>
              Top: <strong style={{ color: wordColor(topWord[0]) }}>#{topWord[0]}</strong> ×{topWord[1]}
            </span>
          )}
          <span className="ml-auto">{wordFreqs.size} keywords</span>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 min-h-0 relative rounded-lg overflow-hidden bg-[var(--color-bg)]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
