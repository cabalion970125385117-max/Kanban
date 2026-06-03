/**
 * MindmapWidget — canvas word cloud
 *
 * Extracts keywords from card titles, tags, and label names.
 * Word size is proportional to frequency.
 * Two shape modes: Normal (ellipse) and Brain.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Card } from '@questboard/shared';

type Shape = 'fill' | 'brain';

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

// ─── Brain path ──────────────────────────────────────────────────────────────

function drawBrainPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
) {
  const px = (t: number) => cx + t * rx;
  const py = (t: number) => cy + t * ry;

  ctx.beginPath();
  ctx.moveTo(px(-0.08), py(-0.68));

  // upper-left — frontal lobe
  ctx.bezierCurveTo(px(-0.30), py(-1.05), px(-0.72), py(-1.00), px(-0.95), py(-0.58));
  // left side — temporal / parietal
  ctx.bezierCurveTo(px(-1.12), py(-0.20), px(-1.10), py( 0.25), px(-0.92), py( 0.62));
  // lower-left — occipital
  ctx.bezierCurveTo(px(-0.72), py( 0.98), px(-0.30), py( 1.05), px(-0.08), py( 0.72));
  // bottom fissure notch
  ctx.bezierCurveTo(px(-0.04), py( 0.76), px( 0.04), py( 0.76), px( 0.08), py( 0.72));
  // lower-right — mirror
  ctx.bezierCurveTo(px( 0.30), py( 1.05), px( 0.72), py( 0.98), px( 0.92), py( 0.62));
  // right side — mirror
  ctx.bezierCurveTo(px( 1.10), py( 0.25), px( 1.12), py(-0.20), px( 0.95), py(-0.58));
  // upper-right — mirror
  ctx.bezierCurveTo(px( 0.72), py(-1.00), px( 0.30), py(-1.05), px( 0.08), py(-0.68));
  // top fissure notch
  ctx.bezierCurveTo(px( 0.04), py(-0.72), px(-0.04), py(-0.72), px(-0.08), py(-0.68));

  ctx.closePath();
}

// ─── Shape mask (pixel alpha lookup) ─────────────────────────────────────────

function buildMask(W: number, H: number, shape: Shape): Uint8ClampedArray {
  if (W <= 0 || H <= 0) return new Uint8ClampedArray(0);
  const off = document.createElement('canvas');
  off.width  = W;
  off.height = H;
  const ctx  = off.getContext('2d')!;
  const cx = W / 2, cy = H / 2;
  ctx.fillStyle = '#000';
  if (shape === 'fill') {
    ctx.beginPath();
    ctx.ellipse(cx, cy, W * 0.44, H * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawBrainPath(ctx, cx, cy, W * 0.44, H * 0.44);
    ctx.fill();
  }
  return ctx.getImageData(0, 0, W, H).data;
}

function inMask(data: Uint8ClampedArray, W: number, H: number, px: number, py: number): boolean {
  const ix = Math.round(px), iy = Math.round(py);
  if (ix < 0 || ix >= W || iy < 0 || iy >= H) return false;
  return data[(iy * W + ix) * 4 + 3] > 128;
}

// ─── Cloud renderer ──────────────────────────────────────────────────────────

function renderCloud(canvas: HTMLCanvasElement, wordFreqs: Map<string, number>, shape: Shape) {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  if (W <= 0 || H <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  if (wordFreqs.size === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No keywords yet — add cards to see the word cloud', W / 2, H / 2);
    return;
  }

  // Build shape mask at logical (non-DPR) pixel dimensions
  const mask = buildMask(W, H, shape);

  const cx = W / 2, cy = H / 2;
  const sorted = [...wordFreqs.entries()].sort(([, a], [, b]) => b - a).slice(0, 70);
  const maxFreq = sorted[0][1];
  const minFreq = sorted[sorted.length - 1][1];
  const range   = Math.max(1, maxFreq - minFreq);

  const MIN_PX = 10;
  const MAX_PX = Math.min(56, Math.floor(Math.min(W, H) * 0.15));

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];

  ctx.textBaseline = 'top';

  for (const [word, freq] of sorted) {
    const t  = (freq - minFreq) / range;  // 0 = rarest, 1 = most common
    const fs = Math.round(MIN_PX + t * (MAX_PX - MIN_PX));

    ctx.font = `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const tw = ctx.measureText(word).width + 8;
    const th = fs * 1.35;

    const maxR = Math.min(W, H) * 0.48;
    let ok = false;

    // Archimedean spiral outward from centre
    for (let theta = 0; theta < 15 * Math.PI; theta += 0.08) {
      const r  = (theta / (15 * Math.PI)) * maxR;
      const ex = cx + r * Math.cos(theta * 1.4);
      const ey = cy + r * 0.85 * Math.sin(theta * 1.4);

      const tx = Math.round(ex - tw / 2);
      const ty = Math.round(ey - th / 2);

      // All corners + centre must be inside the shape
      if (!inMask(mask, W, H, tx,           ty          )) continue;
      if (!inMask(mask, W, H, tx + tw,      ty          )) continue;
      if (!inMask(mask, W, H, tx,           ty + th     )) continue;
      if (!inMask(mask, W, H, tx + tw,      ty + th     )) continue;
      if (!inMask(mask, W, H, tx + tw / 2,  ty + th / 2 )) continue;

      // Bounding-box collision
      let hit = false;
      for (const p of placed) {
        if (tx < p.x + p.w + 3 && tx + tw > p.x - 3 &&
            ty < p.y + p.h + 2 && ty + th > p.y - 2) { hit = true; break; }
      }
      if (hit) continue;

      ctx.fillStyle = wordColor(word);
      ctx.fillText(word, tx + 4, ty + 1);
      placed.push({ x: tx, y: ty, w: tw, h: th });
      ok = true;
      break;
    }
    // Words that don't fit are silently skipped
    void ok;
  }

  // Brain mode: draw a subtle outline + fissure
  if (shape === 'brain') {
    ctx.strokeStyle = 'rgba(91,79,207,0.14)';
    ctx.lineWidth   = 1.5;
    drawBrainPath(ctx, cx, cy, W * 0.44, H * 0.44);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(91,79,207,0.10)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - H * 0.44 * 0.68);
    ctx.bezierCurveTo(cx - 5, cy - H * 0.15, cx + 5, cy + H * 0.15, cx, cy + H * 0.44 * 0.72);
    ctx.stroke();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MindmapWidgetProps {
  cards: Card[];
}

export function MindmapWidget({ cards }: MindmapWidgetProps) {
  const [shape, setShape] = useState<Shape>('fill');
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const wordFreqs = useMemo(() => extractWords(cards), [cards]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (c) renderCloud(c, wordFreqs, shape);
  }, [wordFreqs, shape]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => draw());
    obs.observe(el);
    return () => obs.disconnect();
  }, [draw]);

  const totalWords = wordFreqs.size;
  const topWord    = [...wordFreqs.entries()].sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Shape
        </span>
        <select
          value={shape}
          onChange={(e) => setShape(e.target.value as Shape)}
          className={cn(
            'text-xs border border-[var(--color-border)] rounded-lg px-2 py-1',
            'bg-[var(--color-surface)] text-[var(--color-text)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]',
            'cursor-pointer',
          )}
          aria-label="Word cloud shape"
        >
          <option value="fill">◎ Fill</option>
          <option value="brain">🧠 Brain</option>
        </select>
        {totalWords > 0 && (
          <div className="ml-auto flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
            {topWord && (
              <span>
                Top: <strong style={{ color: wordColor(topWord[0]) }}>#{topWord[0]}</strong> ×{topWord[1]}
              </span>
            )}
            <span>{totalWords} keywords</span>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 min-h-0 relative rounded-lg overflow-hidden bg-[var(--color-bg)]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
