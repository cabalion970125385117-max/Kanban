/**
 * QuestBanner — animated pixel-art medieval landscape
 *
 * Left  : cave with glowing eyes (monster lair)
 * Middle: rolling hills — monsters walk here based on card due-date urgency
 * Right : castle with flag and member-avatar guards
 *
 * Monster types map to card priority:
 *   slime  → low   |  goblin → medium
 *   orc    → high  |  dragon → critical
 *
 * Urgency (0–1) maps urgency to monster X position:
 *   0 = near cave, 1 = at castle gate (overdue cards)
 */

import { useRef, useEffect, useMemo } from 'react';
import { useBoardStore } from '@/stores/board.store';
import { useBoardMembers } from '@/hooks/useBoard';
import { useQuestStore } from '@/stores/quest.store';
import type { Card, BoardMember } from '@questboard/shared';

// ─── Layout constants ─────────────────────────────────────────────────────────

const BANNER_H      = 120;  // CSS px — banner height
const S             = 2;    // art-pixel size in CSS px (each art-px → S×S rect)
const GROUND_OFFSET = 32;   // CSS px below canvas bottom (soil depth)
// groundY = BANNER_H - GROUND_OFFSET = 88

// ─── Archetype → accent colour ────────────────────────────────────────────────

const ARCHETYPE_COL: Record<string, string> = {
  knight:    '#A8B8C8',
  mage:      '#9B59B6',
  archer:    '#27AE60',
  paladin:   '#F1C40F',
  rogue:     '#566573',
  sorcerer:  '#2980B9',
  berserker: '#E74C3C',
  herald:    '#E67E22',
};

// ─── Sprite system ────────────────────────────────────────────────────────────

type Sprite = (string | null)[][];

/** Parse a rows+palette definition into a 2-D colour grid. */
function sp(rows: string[], pal: Record<string, string>): Sprite {
  return rows.map((row) =>
    Array.from(row).map((ch) => (ch === '.' ? null : (pal[ch] ?? null))),
  );
}

/** Draw a sprite at CSS position (x, y), using ps CSS px per art-pixel. */
function blit(
  ctx: CanvasRenderingContext2D,
  spr: Sprite,
  x: number,
  y: number,
  ps: number = S,
) {
  spr.forEach((row, r) => {
    row.forEach((col, c) => {
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(
        Math.round(x + c * ps),
        Math.round(y + r * ps),
        Math.ceil(ps),
        Math.ceil(ps),
      );
    });
  });
}

// ─── Sprite definitions ───────────────────────────────────────────────────────

// Slime — 7 wide × 6 tall art-px → 14 × 12 CSS px
const SLIME: Sprite = sp(
  ['..GGG..', '.GGGGG.', 'GGwGwGG', 'GGGGGGG', '.GdGdG.', '..GGG..'],
  { G: '#3DD68C', w: '#FFFFF0', d: '#1EB864' },
);

// Goblin — 5 wide × 7 tall → 10 × 14 CSS px
const GOBLIN: Sprite = sp(
  ['.kkk.', 'kYkYk', 'kkkkk', '.bbb.', 'bbbbb', '.b.b.', '.k.k.'],
  { k: '#5DAE42', Y: '#FFD700', b: '#8B5E20' },
);

// Orc — 6 wide × 8 tall → 12 × 16 CSS px
const ORC: Sprite = sp(
  ['.PPPP.', 'PrPPPP', 'PPwwPP', 'PPPPPP', '.AAAA.', 'AAAAAA', '.PP.PP', '......'],
  { P: '#7B4E8A', r: '#FF4444', w: '#FFFFF0', A: '#666677' },
);

// Dragon — 8 wide × 8 tall → 16 × 16 CSS px
const DRAGON: Sprite = sp(
  ['W.RRRR.W', 'WRRRRRRW', '.RRRRRR.', '..RYRY..', '..RRRR..', '..R..R..', '..W..W..', '........'],
  { W: '#880000', R: '#CC2222', Y: '#FFD700' },
);

const SPRITES: Record<string, Sprite> = {
  slime: SLIME, goblin: GOBLIN, orc: ORC, dragon: DRAGON,
};

/** Avatar sprite — 5 wide × 8 tall → 10 × 16 CSS px, tinted by archetype. */
function makeAvatar(col: string): Sprite {
  return sp(
    ['.HHH.', 'HHHHH', 'HHfHH', '.fff.', '.HHH.', 'HHHHH', '.H.H.', '.....'],
    { H: col, f: '#FFDEAD' },
  );
}

// ─── Shared types ─────────────────────────────────────────────────────────────

type CardInfo   = Pick<Card, 'id' | 'priority' | 'end_date' | 'archived_at'>;
type MemberInfo = Pick<BoardMember, 'user_id'> & {
  user?: { name?: string; avatar?: { archetype?: string } };
};

// ─── Demo data (login page — no real board) ───────────────────────────────────

const _now = Date.now();
const _DAY = 86_400_000;
const DEMO_CARDS: CardInfo[] = [
  { id: 'd1', priority: 'low',      end_date: null,                                             archived_at: null },
  { id: 'd2', priority: 'medium',   end_date: new Date(_now + 9  * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd3', priority: 'medium',   end_date: new Date(_now + 5  * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd4', priority: 'high',     end_date: new Date(_now + 2  * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd5', priority: 'high',     end_date: new Date(_now + 1  * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd6', priority: 'critical', end_date: new Date(_now - 1  * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd7', priority: 'low',      end_date: null,                                             archived_at: null },
];
const DEMO_MEMBERS: MemberInfo[] = [
  { user_id: 'dm1', user: { name: 'Knight', avatar: { archetype: 'knight' } } },
  { user_id: 'dm2', user: { name: 'Mage',   avatar: { archetype: 'mage' } } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cardToMonsterType(priority: string): string {
  if (priority === 'critical') return 'dragon';
  if (priority === 'high')     return 'orc';
  if (priority === 'medium')   return 'goblin';
  return 'slime';
}

function cardUrgency(endDate?: string | null): number {
  if (!endDate) return 0.08;
  const days = (new Date(endDate).getTime() - Date.now()) / _DAY;
  if (days <= 0)  return 1.00;
  if (days <= 1)  return 0.88;
  if (days <= 3)  return 0.68;
  if (days <= 7)  return 0.45;
  if (days <= 14) return 0.25;
  return 0.10;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Castle dimensions are derived from canvas width so cave/castle agree.
function castleLayout(W: number) {
  const castleW = Math.min(210, Math.max(140, W * 0.22));
  const castleL = W - castleW - 6;   // castle left edge
  const ltX     = castleL;           // left tower left
  const ltW     = 24;
  const rtX     = W - 6 - 24;        // right tower left
  const rtW     = 24;
  const wallL   = ltX + ltW;         // curtain wall left
  const wallR   = rtX;               // curtain wall right
  const wallTop = 88 - 40;           // 48
  const ltTop   = 88 - 50;           // 38
  const rtTop   = 88 - 58;           // 30
  return { castleL, castleW, ltX, ltW, rtX, rtW, wallL, wallR, wallTop, ltTop, rtTop };
}

// ─── Draw: background (sky, clouds, hills, soil) ─────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
) {
  const groundY = H - GROUND_OFFSET; // 88

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, groundY - 6);
  sky.addColorStop(0, '#2A6AB8');
  sky.addColorStop(1, '#9ACEF5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY - 6);

  // Drifting clouds
  ctx.fillStyle = 'rgba(255,255,255,0.84)';
  (
    [
      [0.08, 0.18, 18, 0.010],
      [0.30, 0.12, 22, 0.008],
      [0.56, 0.22, 16, 0.012],
      [0.79, 0.10, 20, 0.009],
    ] as [number, number, number, number][]
  ).forEach(([rx, ry, r, spd]) => {
    const cx = ((rx + t * spd) % 1.12) * W;
    const cy = ry * H;
    ctx.beginPath();
    ctx.arc(cx,             cy,           r,        0, Math.PI * 2);
    ctx.arc(cx + r * 0.80,  cy - r * 0.35, r * 0.72, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.55,  cy - r * 0.22, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  });

  // Rolling hills — back layer
  ctx.fillStyle = '#4D8730';
  ctx.beginPath();
  ctx.moveTo(-1, groundY);
  for (let x = 0; x <= W + 2; x += 2) {
    const y =
      groundY - 14
      - 10 * Math.sin(x * 0.022 + 1.2)
      -  6 * Math.sin(x * 0.051 + 2.4);
    if (x === 0) ctx.moveTo(-1, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 1, groundY);
  ctx.closePath();
  ctx.fill();

  // Rolling hills — highlight (front ridge)
  ctx.fillStyle = '#5DAA3C';
  ctx.beginPath();
  ctx.moveTo(-1, groundY);
  for (let x = 0; x <= W + 2; x += 2) {
    const y =
      groundY - 6
      - 4 * Math.sin(x * 0.035 + 0.8)
      - 3 * Math.sin(x * 0.068 + 1.8);
    if (x === 0) ctx.moveTo(-1, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 1, groundY);
  ctx.closePath();
  ctx.fill();

  // Ground line
  ctx.fillStyle = '#3B6E26';
  ctx.fillRect(0, groundY, W, 3);

  // Soil strip
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(0, groundY + 3, W, H - groundY - 3);

  // Soil pebble texture
  ctx.fillStyle = '#5C3C1E';
  for (let x = 15; x < W; x += 37) {
    ctx.fillRect(x,      groundY + 7, 6, 2);
    ctx.fillRect(x + 20, groundY + 15, 4, 2);
  }
}

// ─── Draw: cave ───────────────────────────────────────────────────────────────

function drawGlowEye(
  ctx: CanvasRenderingContext2D,
  ex: number,
  ey: number,
  pulse: number,
) {
  const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 7);
  g.addColorStop(0, `rgba(255,80,0,${0.95 * pulse})`);
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ex, ey, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,140,0,${pulse})`;
  ctx.fillRect(ex - 2, ey - 2, 4, 4);
}

function drawCave(
  ctx: CanvasRenderingContext2D,
  _W: number,
  H: number,
  t: number,
) {
  const groundY = H - GROUND_OFFSET; // 88

  // Rocky hill body
  ctx.fillStyle = '#747474';
  ctx.beginPath();
  ctx.moveTo(-1, groundY + 1);
  ctx.lineTo(-1, groundY - 36);
  ctx.bezierCurveTo( 6, groundY - 58, 26, groundY - 72, 50, groundY - 68);
  ctx.bezierCurveTo(74, groundY - 64, 92, groundY - 46, 92, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Left-face shadow
  ctx.fillStyle = '#565656';
  ctx.beginPath();
  ctx.moveTo(-1, groundY + 1);
  ctx.lineTo(-1, groundY - 30);
  ctx.bezierCurveTo( 5, groundY - 50, 18, groundY - 62, 32, groundY - 60);
  ctx.bezierCurveTo(46, groundY - 57, 54, groundY - 42, 50, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Hilltop highlight
  ctx.fillStyle = '#929292';
  ctx.beginPath();
  ctx.arc(50, groundY - 66, 9, Math.PI, 0, false);
  ctx.fill();

  // Cave entrance — arch
  // archCX=35, archR=19 → spans x=16..54, top at groundY-22-19=groundY-41=47
  const archCX = 35, archR = 19, archTY = groundY - 22;
  ctx.fillStyle = '#060610';
  ctx.beginPath();
  ctx.moveTo(archCX - archR, groundY + 1);
  ctx.lineTo(archCX - archR, archTY);
  ctx.arc(archCX, archTY, archR, Math.PI, 0, false);
  ctx.lineTo(archCX + archR, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Arch stone frame
  ctx.strokeStyle = '#5A5A5A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(archCX - archR, groundY);
  ctx.lineTo(archCX - archR, archTY);
  ctx.arc(archCX, archTY, archR, Math.PI, 0, false);
  ctx.lineTo(archCX + archR, groundY);
  ctx.stroke();

  // Glowing eyes (pulsing)
  const pulse = 0.72 + 0.28 * Math.sin(t * 3.2);
  drawGlowEye(ctx, 26, groundY - 12, pulse);
  drawGlowEye(ctx, 40, groundY - 12, pulse);
}

// ─── Draw: castle ─────────────────────────────────────────────────────────────

function drawCastle(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
) {
  const groundY = H - GROUND_OFFSET; // 88
  const { ltX, ltW, rtX, rtW, wallL, wallR, wallTop, ltTop, rtTop } =
    castleLayout(W);

  const stone   = '#B2AA9A';
  const stoneSh = '#7E7669';
  const dark    = '#0C0A08';

  // Helper: draw a tower or wall section with stone-row texture and battlements
  function drawBlock(x: number, y: number, w: number, h: number, merW = 6, merH = 7, merStep = 8) {
    ctx.fillStyle = stone;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = stoneSh;
    for (let sy = y + 8; sy < y + h; sy += 9) ctx.fillRect(x, sy, w, 1);
    // Battlements (merlons)
    for (let bx = x; bx < x + w - 2; bx += merStep) {
      ctx.fillStyle = stone;
      ctx.fillRect(bx, y - merH, merW, merH);
      ctx.fillStyle = stoneSh;
      ctx.fillRect(bx, y - merH + 1, merW, 1);
    }
  }

  // Left tower
  drawBlock(ltX, ltTop, ltW, groundY - ltTop, 6, 7, 8);
  // Right tower
  drawBlock(rtX, rtTop, rtW, groundY - rtTop, 6, 7, 8);
  // Curtain wall
  drawBlock(wallL, wallTop, wallR - wallL, groundY - wallTop, 7, 7, 10);

  // Gate arch
  const gateMX  = wallL + (wallR - wallL) / 2;
  const gateHW  = 11;
  const gateArcCY = groundY - 18;

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(gateMX - gateHW, groundY + 1);
  ctx.lineTo(gateMX - gateHW, gateArcCY);
  ctx.arc(gateMX, gateArcCY, gateHW, Math.PI, 0, false);
  ctx.lineTo(gateMX + gateHW, groundY + 1);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = stoneSh;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gateMX - gateHW, groundY);
  ctx.lineTo(gateMX - gateHW, gateArcCY);
  ctx.arc(gateMX, gateArcCY, gateHW, Math.PI, 0, false);
  ctx.lineTo(gateMX + gateHW, groundY);
  ctx.stroke();

  // Flag on right tower
  const flagPX   = rtX + rtW / 2;
  const flagBase = rtTop - 7;        // top of battlement

  ctx.strokeStyle = '#3D2210';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(flagPX, flagBase);
  ctx.lineTo(flagPX, flagBase - 20);
  ctx.stroke();

  ctx.fillStyle = '#CC2222';
  ctx.beginPath();
  ctx.moveTo(flagPX,      flagBase - 20);
  ctx.lineTo(flagPX + 14, flagBase - 14);
  ctx.lineTo(flagPX,      flagBase - 8);
  ctx.closePath();
  ctx.fill();
}

// ─── Draw: monsters ───────────────────────────────────────────────────────────

function drawMonsters(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  cards: CardInfo[],
) {
  const groundY = H - GROUND_OFFSET;
  const { castleL } = castleLayout(W);

  const caveExitX       = 60;
  const castleApproachX = castleL - 14;   // just left of castle

  const active = cards
    .filter((c) => !c.archived_at)
    .map((c) => ({
      id:      c.id,
      priority: c.priority,
      end_date: c.end_date,
      urgency: cardUrgency(c.end_date),
      hash:    hashStr(c.id),
    }))
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 24);

  active.forEach((card) => {
    const u    = card.urgency;
    const rawX = caveExitX + (castleApproachX - caveExitX) * u;
    // Per-card X jitter so they don't stack perfectly
    const jitter = ((card.hash % 42) - 21) * 0.20;
    const mx   = Math.min(
      Math.max(rawX + jitter, caveExitX - 4),
      castleApproachX + 4,
    );

    // Gentle bouncing bob (each card has a unique phase)
    const phase = (card.hash % 628) / 100;
    const bob   = -Math.abs(Math.sin(t * 2.6 + phase)) * 3;

    const type = cardToMonsterType(card.priority);
    const spr  = SPRITES[type] ?? SLIME;
    const sprH = spr.length * S;
    const sprW = spr[0].length * S;

    blit(ctx, spr, Math.round(mx - sprW / 2), Math.round(groundY - sprH + bob), S);
  });
}

// ─── Draw: castle guards (member avatars) ─────────────────────────────────────

function drawGuards(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  members: MemberInfo[],
) {
  const groundY = H - GROUND_OFFSET;
  const { wallL, wallR, wallTop } = castleLayout(W);

  const avatarH = 8 * S; // 16 CSS px
  const maxGuards = Math.max(1, Math.floor((wallR - wallL) / 16));
  const guards    = members.slice(0, maxGuards);
  if (guards.length === 0) return;

  const step = guards.length > 1 ? (wallR - wallL) / guards.length : wallR - wallL;
  const gy   = wallTop - avatarH; // feet at wallTop, head sticking above

  guards.forEach((m, i) => {
    const gx   = wallL + i * step + step / 2 - (5 * S) / 2;
    const arch = (m.user?.avatar as { archetype?: string } | undefined)?.archetype;
    const col  = ARCHETYPE_COL[arch ?? ''] ?? '#A8B8C8';
    blit(ctx, makeAvatar(col), Math.round(gx), Math.round(gy), S);
  });

  void groundY; // used implicitly via wallTop derivation
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuestBannerProps {
  /** Pass boardId on the board page to use real data; omit for demo mode. */
  boardId?: string;
}

export function QuestBanner({ boardId }: QuestBannerProps) {
  const { enabled, setEnabled } = useQuestStore();

  // Data
  const boardCards  = useBoardStore((s) => s.cards);
  const { data: realMembers = [] } = useBoardMembers(boardId ?? '');

  const cards = useMemo<CardInfo[]>(() => {
    if (!boardId) return DEMO_CARDS;
    return Object.values(boardCards)
      .flat()
      .filter((c) => !c.archived_at)
      .slice(0, 30) as CardInfo[];
  }, [boardId, boardCards]);

  const members = useMemo<MemberInfo[]>(() => {
    if (!boardId) return DEMO_MEMBERS;
    return realMembers as unknown as MemberInfo[];
  }, [boardId, realMembers]);

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const widthRef     = useRef(0);
  const cardsRef     = useRef(cards);
  const membersRef   = useRef(members);

  // Keep refs in sync with latest data without restarting the loop
  useEffect(() => { cardsRef.current  = cards;   }, [cards]);
  useEffect(() => { membersRef.current = members; }, [members]);

  // ResizeObserver — update canvas pixel dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function resize(w: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      widthRef.current = w;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(BANNER_H * dpr);
    }

    resize(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((es) => resize(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop — restarts only when enabled changes
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const t0 = performance.now();
    let id: number;

    const frame = (now: number) => {
      const t   = (now - t0) / 1000;
      const ctx = canvas.getContext('2d');
      const W   = widthRef.current;

      if (!ctx || W < 10) { id = requestAnimationFrame(frame); return; }

      const dpr = window.devicePixelRatio || 1;
      const H   = BANNER_H;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      if (W >= 300) {
        drawBackground(ctx, W, H, t);
        drawCave(ctx, W, H, t);
        drawCastle(ctx, W, H);
        drawMonsters(ctx, W, H, t, cardsRef.current);
        drawGuards(ctx, W, H, membersRef.current);
      } else {
        // Very narrow — just sky
        ctx.fillStyle = '#2A6AB8';
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();
      id = requestAnimationFrame(frame);
    };

    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  /* ── Disabled state: render the original placeholder bar ── */
  if (!enabled) {
    return (
      <div
        className="h-10 flex-shrink-0 border-b border-[var(--color-border)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0 border-b border-[var(--color-border)] relative overflow-hidden"
      style={{ height: BANNER_H }}
      aria-label="Quest Banner — decorative animation showing your project's tasks as monsters"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: BANNER_H,
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
      {/* Dismiss button — faint, top-right corner */}
      <button
        onClick={() => setEnabled(false)}
        className="absolute top-1 right-1.5 w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-white/70 hover:bg-black/20 transition-colors text-[9px] font-bold leading-none"
        title="Hide Quest Banner (re-enable in Settings → Appearance)"
        aria-label="Hide Quest Banner"
        tabIndex={-1}
      >
        ✕
      </button>
    </div>
  );
}
