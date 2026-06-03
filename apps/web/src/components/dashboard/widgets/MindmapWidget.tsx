/**
 * MindmapWidget — canvas word cloud
 *
 * Extracts keywords from card titles, tags, and label names.
 * Word size is proportional to frequency.
 *
 * Shape modes
 *   Fill  — words cover the entire widget area (rectangular bounds)
 *   Brain — words packed inside a side-profile brain silhouette that
 *           matches the 🧠 emoji: two bumps on top (frontal + parietal),
 *           rounded occipital back, flat temporal base, front face.
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

// ─── Side-profile brain path (matches 🧠 emoji silhouette) ───────────────────
//
// Coordinate system: centre = (cx, cy), x-axis = rx, y-axis = ry
//   front of brain = LEFT  (negative x)
//   back  of brain = RIGHT (positive x)
//   top              = UP  (negative y)
//
// Path drawn clockwise from the front-bottom.
//
// Normalised extents of the path:
//   x  ∈ [−0.91, +0.90]  →  span 1.81 × rx
//   y  ∈ [−0.80, +0.70]  →  span 1.50 × ry
//
// Two visible bumps on the top edge:
//   • Frontal lobe  (front bump, x ≈ −0.35)
//   • Parietal lobe (back  bump, x ≈ +0.40)
// separated by a shallow central-sulcus dip at x ≈ 0.

function drawSideBrainPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
) {
  const x = (t: number) => cx + t * rx;
  const y = (t: number) => cy + t * ry;

  ctx.beginPath();

  // ── Start: front-bottom ──────────────────────────────────────────────────
  ctx.moveTo(x(-0.72), y(0.42));

  // ── Front face: frontal lobe curves up and slightly forward ──────────────
  ctx.bezierCurveTo(x(-0.90), y(0.18), x(-0.91), y(-0.22), x(-0.68), y(-0.62));

  // ── Frontal lobe top bump (front/left bump) ──────────────────────────────
  ctx.bezierCurveTo(x(-0.52), y(-0.80), x(-0.18), y(-0.80), x(-0.05), y(-0.66));

  // ── Central sulcus — shallow dip between the two bumps ───────────────────
  ctx.bezierCurveTo(x( 0.02), y(-0.57), x( 0.10), y(-0.57), x( 0.18), y(-0.66));

  // ── Parietal lobe top bump (back/right bump) ─────────────────────────────
  ctx.bezierCurveTo(x( 0.36), y(-0.80), x( 0.62), y(-0.78), x( 0.78), y(-0.55));

  // ── Occipital lobe — rounded back of brain ───────────────────────────────
  ctx.bezierCurveTo(x( 0.90), y(-0.30), x( 0.90), y( 0.14), x( 0.78), y(0.48));

  // ── Bottom-back (occipital/temporal base) ────────────────────────────────
  ctx.bezierCurveTo(x( 0.64), y( 0.66), x( 0.34), y( 0.70), x( 0.05), y(0.68));

  // ── Bottom-front (temporal base — flat underside) ────────────────────────
  ctx.bezierCurveTo(x(-0.22), y( 0.66), x(-0.50), y( 0.58), x(-0.66), y(0.48));

  // ── Close back to front-bottom ────────────────────────────────────────────
  ctx.bezierCurveTo(x(-0.70), y( 0.44), x(-0.72), y( 0.42), x(-0.72), y(0.42));

  ctx.closePath();
}

// ─── Shape mask (pixel alpha lookup) ─────────────────────────────────────────

function buildBrainMask(W: number, H: number): Uint8ClampedArray {
  if (W <= 0 || H <= 0) return new Uint8ClampedArray(0);
  const off = document.createElement('canvas');
  off.width  = W;
  off.height = H;
  const ctx  = off.getContext('2d')!;
  ctx.fillStyle = '#000';
  // rx/ry chosen so the brain fills ~85% width × ~75% height
  drawSideBrainPath(ctx, W / 2, H / 2, W * 0.47, H * 0.50);
  ctx.fill();
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

  const cx = W / 2, cy = H / 2;
  const sorted    = [...wordFreqs.entries()].sort(([, a], [, b]) => b - a).slice(0, 70);
  const maxFreq   = sorted[0][1];
  const minFreq   = sorted[sorted.length - 1][1];
  const freqRange = Math.max(1, maxFreq - minFreq);

  const MIN_PX = 10;
  const MAX_PX = Math.min(56, Math.floor(Math.min(W, H) * 0.15));

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  ctx.textBaseline = 'top';

  // ── Fill mode: words pack the full canvas rectangle ──────────────────────
  if (shape === 'fill') {
    const PAD_X  = 12, PAD_Y  = 10;
    const usableW = W - PAD_X * 2;
    const usableH = H - PAD_Y * 2;

    // Elliptical spiral scaled so the furthest point reaches the canvas edges
    const maxR = Math.max(usableW, usableH) * 0.52;
    const hStr = (usableW / 2) / maxR;
    const vStr = (usableH / 2) / maxR;

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
    return;
  }

  // ── Brain mode: words packed inside the side-profile silhouette ──────────
  const bRx   = W * 0.47;
  const bRy   = H * 0.50;
  const mask  = buildBrainMask(W, H);

  // Spiral stretched to fit the brain's landscape aspect ratio
  const maxR  = Math.min(bRx, bRy) * 0.92;
  const hStr  = bRx / Math.min(bRx, bRy);
  const vStr  = bRy / Math.min(bRx, bRy);

  // Brain centroid is roughly at canvas centre — fine as spiral origin
  for (const [word, freq] of sorted) {
    const t  = (freq - minFreq) / freqRange;
    const fs = Math.round(MIN_PX + t * (MAX_PX - MIN_PX));
    ctx.font = `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const tw = ctx.measureText(word).width + 8;
    const th = fs * 1.35;

    for (let theta = 0; theta < 15 * Math.PI; theta += 0.08) {
      const r  = (theta / (15 * Math.PI)) * maxR;
      const ex = cx + r * hStr * Math.cos(theta * 1.25);
      const ey = cy + r * vStr * Math.sin(theta * 1.25);

      const tx = Math.round(ex - tw / 2);
      const ty = Math.round(ey - th / 2);

      // All four corners + centre must lie within the brain silhouette
      if (!inMask(mask, W, H, tx,          ty          )) continue;
      if (!inMask(mask, W, H, tx + tw,     ty          )) continue;
      if (!inMask(mask, W, H, tx,          ty + th     )) continue;
      if (!inMask(mask, W, H, tx + tw,     ty + th     )) continue;
      if (!inMask(mask, W, H, tx + tw / 2, ty + th / 2 )) continue;

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

  // ── Brain outline + sulcus detail ─────────────────────────────────────────
  // Outer silhouette
  ctx.strokeStyle = 'rgba(91,79,207,0.14)';
  ctx.lineWidth   = 1.5;
  drawSideBrainPath(ctx, cx, cy, bRx, bRy);
  ctx.stroke();

  // Central sulcus hint — short curved stroke between the two bumps
  ctx.strokeStyle = 'rgba(91,79,207,0.09)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(cx + bRx * 0.06, cy - bRy * 0.58);
  ctx.bezierCurveTo(
    cx + bRx * 0.09, cy - bRy * 0.68,
    cx + bRx * 0.11, cy - bRy * 0.44,
    cx + bRx * 0.14, cy - bRy * 0.40,
  );
  ctx.stroke();
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
