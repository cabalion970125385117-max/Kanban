/**
 * AppWordCloudBanner — aggregated keyword cloud across all boards.
 *
 * Word frequencies are extracted from every non-archived card (titles +
 * tags) once per calendar day and cached in localStorage.  Every
 * subsequent mount on the same day reads the cache without touching IDB.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { getDB } from '@/lib/db';
import { useQuestStore } from '@/stores/quest.store';

// ─── Layout constants ─────────────────────────────────────────────────────────

const BANNER_H  = 120;
const CACHE_KEY = 'qb-wordcloud-banner-v1';

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

// ─── Colour palette ──────────────────────────────────────────────────────────

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

// ─── Daily cache ─────────────────────────────────────────────────────────────

interface BannerCache {
  date: string;                   // 'YYYY-MM-DD'
  words: Array<[string, number]>; // [word, frequency]
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCache(): Map<string, number> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as BannerCache;
    if (c.date !== todayStr()) return null; // stale — recompute
    return new Map(c.words);
  } catch {
    return null;
  }
}

function writeCache(freq: Map<string, number>): void {
  try {
    const c: BannerCache = { date: todayStr(), words: [...freq.entries()] };
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota exceeded — skip caching */
  }
}

// ─── Word extraction from all boards ─────────────────────────────────────────

async function computeWordFreqs(): Promise<Map<string, number>> {
  const db   = await getDB();
  const rows = await db.getAll('cards');
  const freq = new Map<string, number>();

  for (const card of rows) {
    if (card.archived_at) continue;
    const sources: string[] = [card.title, ...(card.card_tags ?? [])];
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

async function getWordFreqs(): Promise<Map<string, number>> {
  const cached = readCache();
  if (cached) return cached;
  const freq = await computeWordFreqs();
  writeCache(freq);
  return freq;
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────

function renderBannerCloud(canvas: HTMLCanvasElement, wordFreqs: Map<string, number>): void {
  const W = canvas.offsetWidth;
  const H = BANNER_H;
  if (W <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  if (wordFreqs.size === 0) {
    ctx.fillStyle = 'rgba(128,128,128,0.35)';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add cards across your boards to see your word cloud here', W / 2, H / 2);
    return;
  }

  // ── Placement bounds ──────────────────────────────────────────────────────
  const PAD_X  = 18, PAD_Y  = 10;
  const usableW = W - PAD_X * 2;
  const usableH = H - PAD_Y * 2;
  const cx = W / 2, cy = H / 2;

  const sorted   = [...wordFreqs.entries()].sort(([, a], [, b]) => b - a).slice(0, 80);
  const maxFreq  = sorted[0][1];
  const minFreq  = sorted[sorted.length - 1][1];
  const freqRange = Math.max(1, maxFreq - minFreq);

  // Font range: 9–36 px, capped so big words still fit in 120px banner
  const MIN_PX = 9;
  const MAX_PX = Math.min(36, Math.floor(H * 0.30));

  // Archimedean spiral fills the wide rectangle:
  //   horizontal radius = half usable width
  //   vertical   radius = half usable height
  // → words naturally spread across the full banner width
  const maxR     = usableW / 2;
  const vertRatio = usableH / usableW; // stretch factor keeps words inside height

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  ctx.textBaseline = 'top';

  for (const [word, freq] of sorted) {
    const t  = (freq - minFreq) / freqRange;
    const fs = Math.round(MIN_PX + t * (MAX_PX - MIN_PX));

    ctx.font = `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const tw = ctx.measureText(word).width + 6;
    const th = fs * 1.30;

    let placed_ = false;

    for (let theta = 0; theta < 20 * Math.PI; theta += 0.07) {
      const r  = (theta / (20 * Math.PI)) * maxR;
      const ex = cx + r * Math.cos(theta);
      const ey = cy + r * vertRatio * Math.sin(theta);

      const tx = Math.round(ex - tw / 2);
      const ty = Math.round(ey - th / 2);

      // Must stay within padded bounds
      if (tx < PAD_X || tx + tw > W - PAD_X) continue;
      if (ty < PAD_Y || ty + th > H - PAD_Y) continue;

      // AABB collision check
      let hit = false;
      for (const p of placed) {
        if (tx < p.x + p.w + 4 && tx + tw > p.x - 4 &&
            ty < p.y + p.h + 2 && ty + th > p.y - 2) {
          hit = true;
          break;
        }
      }
      if (hit) continue;

      ctx.fillStyle = wordColor(word);
      ctx.fillText(word, tx + 3, ty);
      placed.push({ x: tx, y: ty, w: tw, h: th });
      placed_ = true;
      break;
    }
    void placed_;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppWordCloudBanner() {
  const { enabled, setEnabled } = useQuestStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const freqRef      = useRef<Map<string, number>>(new Map());
  const [ready, setReady] = useState(false);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (c) renderBannerCloud(c, freqRef.current);
  }, []);

  // Load word frequencies once (cached or from IDB)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getWordFreqs().then((freq) => {
      if (cancelled) return;
      freqRef.current = freq;
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [enabled]);

  // Draw when ready or when component updates
  useEffect(() => {
    if (ready) draw();
  }, [ready, draw]);

  // Redraw on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      if (ready) draw();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, draw]);

  // ── Hidden state ────────────────────────────────────────────────────────────
  if (!enabled) {
    return (
      <div className="h-10 flex-shrink-0 border-b border-[var(--color-border)] flex items-center px-3 bg-[var(--color-bg)]">
        <button
          onClick={() => setEnabled(true)}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors group"
          aria-label="Show word cloud banner"
        >
          <span className="text-base leading-none">☁️</span>
          <span className="font-semibold tracking-wide">Word Cloud</span>
          <span className="text-[10px] bg-[var(--color-border)] group-hover:bg-[var(--color-accent)]/15 rounded px-1.5 py-0.5 font-medium transition-colors">
            OFF
          </span>
        </button>
      </div>
    );
  }

  // ── Banner ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 border-b border-[var(--color-border)] relative overflow-hidden bg-[var(--color-bg)]"
      style={{ height: BANNER_H }}
      aria-label="Word cloud — aggregated keyword frequency across all your boards"
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: BANNER_H, display: 'block' }}
      />

      {/* Hide toggle — top-right overlay */}
      <div
        className="absolute top-1.5 right-2 flex items-center gap-1 bg-black/20 hover:bg-black/45 rounded-full px-2.5 py-0.5 transition-colors group cursor-pointer select-none"
        onClick={() => setEnabled(false)}
        role="button"
        tabIndex={0}
        aria-label="Hide word cloud banner"
        title="Hide banner"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEnabled(false); }}
      >
        <span className="text-[9px] font-bold text-white/50 group-hover:text-white/80 uppercase tracking-widest transition-colors">
          Word Cloud
        </span>
        <span className="text-white/40 group-hover:text-white/80 text-[9px] font-bold transition-colors">
          ✕
        </span>
      </div>
    </div>
  );
}
