/**
 * QuestBanner — Final Fantasy–inspired pixel-art medieval landscape
 *
 * Left  : cave with stalactites, glowing eyes, dark arch entrance
 * Middle: rolling hills — monsters march based on card due-date urgency
 * Right : castle with battlements, torchlight, flag, member-avatar guards
 *
 * Monster types (FF-style outlined sprites with shading):
 *   slime  → low   |  goblin → medium
 *   orc    → high  |  dragon → critical
 *
 * Urgency 0–1 controls monster X: 0 = near cave, 1 = at castle gate
 */

import { useRef, useEffect, useMemo } from 'react';
import { useBoardStore } from '@/stores/board.store';
import { useBoardMembers } from '@/hooks/useBoard';
import { useQuestStore } from '@/stores/quest.store';
import type { Card, BoardMember } from '@questboard/shared';

// ─── Layout constants ─────────────────────────────────────────────────────────

const BANNER_H      = 120;
const S             = 2;    // CSS px per art-pixel
const GROUND_OFFSET = 32;   // soil strip below groundY
// groundY = BANNER_H - GROUND_OFFSET = 88

// ─── Archetype colours ────────────────────────────────────────────────────────

const ARCHETYPE_COL: Record<string, string> = {
  knight:    '#C0C8D0',
  mage:      '#A855F7',
  archer:    '#22C55E',
  paladin:   '#EAB308',
  rogue:     '#64748B',
  sorcerer:  '#3B82F6',
  berserker: '#EF4444',
  herald:    '#F97316',
};

// ─── Sprite system ────────────────────────────────────────────────────────────

type Sprite = (string | null)[][];

function sp(rows: string[], pal: Record<string, string>): Sprite {
  return rows.map((row) =>
    Array.from(row).map((ch) => (ch === '.' ? null : (pal[ch] ?? null))),
  );
}

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

// ─── Custom Sprites ───────────────────────────────────────────────────────────
// K = #0D0D0D hard outline on every sprite.
// Each sprite uses 3–4 shaded tones + highlight for a hand-crafted pixel look.
// Row widths are character-verified equal within each sprite.

// ── SLIME — 8 × 8 → 16 × 16 CSS px ─────────────────────────────────────────
// Poisonous green blob with glassy slit eyes and belly shadow.
const SLIME: Sprite = sp(
  [
    '.KKKKKK.',
    'KggggggK',
    'KgHgggmK',   // H=bright top-left highlight, m=right shadow
    'KggggmmK',
    'KgoKgoKK',   // o=pale eye-white, K=slit pupil
    'KggmmKK.',
    '.KddKK..',   // d=dark underbelly drip
    '........',
  ],
  { K: '#0D0D0D', g: '#22CC44', H: '#88FF88', m: '#117733', d: '#084422', o: '#DDFFDD' },
);

// ── GOBLIN — 8 × 14 → 16 × 28 CSS px ────────────────────────────────────────
// Hooded shadow-assassin. Dark cowl, glowing yellow eyes, leather armour.
const GOBLIN: Sprite = sp(
  [
    '..KKKK..',   // hood peak
    '.KddddK.',   // d=dark hood fabric
    '.KdGGdK.',   // G=green skin peeking out
    'KdGYKYdK',   // Y=yellow glowing eyes
    '.KdGGdK.',   // lower face / jaw
    '.KBBBBK.',   // B=worn leather armour
    'KBBaBBBK',   // a=armour highlight stripe
    'KBBBBBBK',
    '.KbKKbK.',   // b=belt strap
    '..KGKGK.',   // green thighs
    '..KGKgK.',   // g=darker shin shadow
    '..KsKsK.',   // s=dark leather boots
    '..KsKsK.',
    '........',
  ],
  { K: '#0D0D0D', d: '#1C2A18', G: '#55AA33', Y: '#FFEE33',
    B: '#7A4E18', a: '#A06830', b: '#503808', g: '#2E6018', s: '#1E1008' },
);

// ── ORC — 10 × 14 → 20 × 28 CSS px ──────────────────────────────────────────
// Scarred berserker bruiser. Dark-copper skin, blood-red irises, dark steel plate.
const ORC: Sprite = sp(
  [
    '..KPPPPK..',
    '.KPPPPPpK.',
    'KPPPPPPPpK',   // p=deep shadow on right
    'KPPrKPrKpK',   // r=blood-red iris, K=slit pupil
    'KPKPPKpPPK',   // K=nostril scar marks
    'KPwPPPwPpK',   // w=yellowed war-tusk
    '.KAAAAAK..',   // A=dark steel armour
    'KAAAAAAAAK',
    'KAaAaAaAAK',   // a=armour crease shadows
    '.KAaAaAaK.',
    '..KPPKPpK.',   // bare legs
    '..KPPKPpK.',
    '..KBBKBBK.',   // B=black iron greaves
    '..........',
  ],
  { K: '#0D0D0D', P: '#6A3A28', p: '#4A2818', r: '#FF2200',
    w: '#FFFFF0', A: '#445566', a: '#223344', B: '#1A0A00' },
);

// ── DRAGON — 12 × 12 → 24 × 24 CSS px ───────────────────────────────────────
// Red wyvern. Body flanked by dark-membrane wings; gold slit eyes; tail below.
const DRAGON: Sprite = sp(
  [
    '..wwKRRKww..',   // w=deep wing membrane at tips
    '.wKRRRRRRKw.',
    'wKrRRRRRRRKw',   // r=bright red body highlight
    'KwRRgRRgRRwK',   // g=gold iris pixels
    'KwRRRRRRRRwK',
    'KdwKRRRRKwdK',   // d=darkest membrane shadow
    '.KdwKRRKwdK.',
    '..KRRRdRKK..',   // lower body + leg nubs
    '...KRRRdK...',
    '....KdRKK...',   // tail base
    '....KRRK....',   // tail tip
    '............',
  ],
  { K: '#0D0D0D', R: '#CC2200', r: '#FF4411', d: '#550F00', g: '#FFDD00', w: '#440C00' },
);

const SPRITES: Record<string, Sprite> = {
  slime: SLIME, goblin: GOBLIN, orc: ORC, dragon: DRAGON,
};

// ── Colour helpers ────────────────────────────────────────────────────────────

/** Darken a hex colour by `amount` (0–1 fraction). */
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${[r, g, b].map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
}

/** Lighten a hex colour by adding `amount` to each channel (0–255). */
function lighten(hex: string, amount = 40): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ── AVATAR GUARD — 8 × 16 → 16 × 32 CSS px ──────────────────────────────────
// Armoured castle sentinel. Full plate helm with visor, gold trim, dark greaves.
function makeAvatar(col: string): Sprite {
  return sp(
    [
      '..KHHK..',   // helmet crown
      '.KHHhHK.',   // h=bright highlight on brow
      'KHHHhHHK',   // full helm
      'KHKKKhHK',   // KKK=narrow visor slit
      '.KHHHHK.',   // chin guard
      '..KffK..',   // f=skin face visible in visor gap
      '.KHHHHK.',   // gorget / neck armour
      'KHHcHHcK',   // c=gold decorative trim studs
      'KHHHHHhK',   // chest plate
      '.KDHDHK.',   // D=shadow crease on belly plate
      '..KHHK..',   // upper legs
      '.KHHHHK.',   // thighs
      '.KDDDDK.',   // knee/shin shadow
      '.KBBBBK.',   // greaves / boot top
      '.KBBBBK.',   // boot
      '........',
    ],
    { K: '#0D0D0D', H: col, h: lighten(col, 55), D: darken(col, 0.45),
      f: '#FFDEAD', c: '#CCAA44', B: '#151525' },
  );
}

// ─── Shared types ─────────────────────────────────────────────────────────────

type CardInfo   = Pick<Card, 'id' | 'priority' | 'end_date' | 'archived_at'>;
type MemberInfo = Pick<BoardMember, 'user_id'> & {
  user?: { name?: string; avatar?: { archetype?: string } };
};

// ─── Demo data (login page — no board) ───────────────────────────────────────

const _now = Date.now();
const _DAY = 86_400_000;
const DEMO_CARDS: CardInfo[] = [
  { id: 'd1', priority: 'low',      end_date: null,                                             archived_at: null },
  { id: 'd2', priority: 'medium',   end_date: new Date(_now + 9 * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd3', priority: 'medium',   end_date: new Date(_now + 5 * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd4', priority: 'high',     end_date: new Date(_now + 2 * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd5', priority: 'high',     end_date: new Date(_now + 1 * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd6', priority: 'critical', end_date: new Date(_now - 1 * _DAY).toISOString().slice(0, 10), archived_at: null },
  { id: 'd7', priority: 'low',      end_date: null,                                             archived_at: null },
];
const DEMO_MEMBERS: MemberInfo[] = [
  { user_id: 'dm1', user: { name: 'Knight', avatar: { archetype: 'knight' } } },
  { user_id: 'dm2', user: { name: 'Mage',   avatar: { archetype: 'mage'   } } },
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

function castleLayout(W: number) {
  const castleW = Math.min(210, Math.max(140, W * 0.22));
  const castleL = W - castleW - 6;
  const ltX = castleL, ltW = 24;
  const rtX = W - 6 - 24, rtW = 24;
  const wallL = ltX + ltW, wallR = rtX;
  return {
    castleL, castleW,
    ltX, ltW, rtX, rtW,
    wallL, wallR,
    wallTop: 48,   // groundY(88) - 40
    ltTop:   38,   // groundY(88) - 50
    rtTop:   30,   // groundY(88) - 58
  };
}

// ─── Draw: background ────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const groundY = H - GROUND_OFFSET;

  // Sky — deeper FF world-map blue
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0,   '#1A3A6A');
  sky.addColorStop(0.4, '#2B5FAA');
  sky.addColorStop(1,   '#7ABCE8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY);

  // Pixel-star band at very top (static, fast to draw)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let sx = 8; sx < W; sx += 60 + (hashStr(`s${Math.floor(sx / 60)}`) % 30)) {
    ctx.fillRect(sx, 3, 1, 1);
    ctx.fillRect(sx + 22, 9, 1, 1);
  }

  // Crescent moon — top-right of sky
  const mx = W * 0.80, my = 20;
  // Outer glow halo
  const moonGlow = ctx.createRadialGradient(mx, my, 4, mx, my, 20);
  moonGlow.addColorStop(0, 'rgba(255,252,200,0.18)');
  moonGlow.addColorStop(1, 'rgba(255,252,200,0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath(); ctx.arc(mx, my, 20, 0, Math.PI * 2); ctx.fill();
  // Moon disc
  ctx.fillStyle = '#FFFAE0';
  ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.fill();
  // Crater pits (pixel detail)
  ctx.fillStyle = 'rgba(200,190,150,0.5)';
  ctx.fillRect(mx + 2, my - 3, 2, 2);
  ctx.fillRect(mx - 3, my + 2, 2, 2);
  // Shadow bite (crescent effect — matches sky colour at this position)
  ctx.fillStyle = '#1A3A6A';
  ctx.beginPath(); ctx.arc(mx + 4, my - 2, 7.5, 0, Math.PI * 2); ctx.fill();

  // Drifting clouds
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  (
    [[0.08, 0.20, 18, 0.009], [0.30, 0.14, 22, 0.007], [0.58, 0.22, 16, 0.011], [0.80, 0.12, 20, 0.008]] as number[][]
  ).forEach(([rx, ry, r, spd]) => {
    const cx = ((rx + t * spd) % 1.12) * W;
    const cy = ry * H;
    ctx.beginPath();
    ctx.arc(cx,            cy,           r,        0, Math.PI * 2);
    ctx.arc(cx + r * 0.8,  cy - r * 0.3, r * 0.72, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.55, cy - r * 0.2, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  });

  // Hill back layer — darker
  ctx.fillStyle = '#3B6E28';
  ctx.beginPath();
  ctx.moveTo(-1, groundY);
  for (let x = 0; x <= W + 2; x += 2) {
    const y = groundY - 16 - 11 * Math.sin(x * 0.021 + 1.2) - 6 * Math.sin(x * 0.050 + 2.4);
    if (x === 0) ctx.moveTo(-1, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 1, groundY);
  ctx.closePath();
  ctx.fill();

  // Hill front layer — lighter ridge
  ctx.fillStyle = '#52963C';
  ctx.beginPath();
  ctx.moveTo(-1, groundY);
  for (let x = 0; x <= W + 2; x += 2) {
    const y = groundY - 7 - 5 * Math.sin(x * 0.034 + 0.8) - 3 * Math.sin(x * 0.067 + 1.8);
    if (x === 0) ctx.moveTo(-1, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 1, groundY);
  ctx.closePath();
  ctx.fill();

  // Pixel grass tufts along ridge
  ctx.fillStyle = '#6EBF48';
  for (let x = 6; x < W - 6; x += 10) {
    const ridge = groundY - 7 - 5 * Math.sin(x * 0.034 + 0.8);
    const ry = Math.round(ridge);
    ctx.fillRect(x,     ry - 2, 1, 2);
    ctx.fillRect(x + 2, ry - 3, 1, 2);
    ctx.fillRect(x + 4, ry - 2, 1, 2);
  }

  // Ground line
  ctx.fillStyle = '#347020';
  ctx.fillRect(0, groundY, W, 3);

  // Soil strip
  ctx.fillStyle = '#6B4226';
  ctx.fillRect(0, groundY + 3, W, H - groundY - 3);

  // Soil texture (pixel pebbles + root lines)
  ctx.fillStyle = '#4A2E18';
  for (let x = 12; x < W; x += 35) {
    ctx.fillRect(x,      groundY + 7,  6, 2);
    ctx.fillRect(x + 18, groundY + 14, 4, 2);
    ctx.fillRect(x + 8,  groundY + 20, 3, 1);
  }
}

// ─── Draw: cave ───────────────────────────────────────────────────────────────

function drawGlowEye(ctx: CanvasRenderingContext2D, ex: number, ey: number, pulse: number) {
  const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 8);
  g.addColorStop(0, `rgba(255,80,0,${0.95 * pulse})`);
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2); ctx.fill();
  // Pupil slit (FF-style vertical slit)
  ctx.fillStyle = `rgba(255,180,0,${pulse})`;
  ctx.fillRect(ex - 1, ey - 3, 2, 6);
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(ex,     ey - 2, 1, 4);
}

function drawCave(ctx: CanvasRenderingContext2D, _W: number, H: number, t: number) {
  const groundY = H - GROUND_OFFSET;

  // Rocky hill body — multi-shade for depth
  // Lightest back layer
  ctx.fillStyle = '#888888';
  ctx.beginPath();
  ctx.moveTo(-1, groundY + 1);
  ctx.lineTo(-1, groundY - 36);
  ctx.bezierCurveTo(6, groundY - 58, 26, groundY - 72, 50, groundY - 68);
  ctx.bezierCurveTo(74, groundY - 64, 92, groundY - 46, 92, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Mid-shade rock face
  ctx.fillStyle = '#5E5E5E';
  ctx.beginPath();
  ctx.moveTo(-1, groundY + 1);
  ctx.lineTo(-1, groundY - 30);
  ctx.bezierCurveTo(5, groundY - 50, 18, groundY - 62, 32, groundY - 60);
  ctx.bezierCurveTo(46, groundY - 57, 54, groundY - 42, 50, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Pixel rock ledge lines (FF stone texture)
  ctx.fillStyle = '#3A3A3A';
  for (let ry = groundY - 52; ry < groundY - 8; ry += 10) {
    ctx.fillRect(4, ry, 14, 1);
    ctx.fillRect(6, ry + 5, 8, 1);
  }

  // Hilltop highlight
  ctx.fillStyle = '#AAAAAA';
  ctx.beginPath();
  ctx.arc(50, groundY - 66, 10, Math.PI, 0, false);
  ctx.fill();

  // Cave entrance — arch
  const archCX = 35, archR = 19, archTY = groundY - 22;
  ctx.fillStyle = '#060610';
  ctx.beginPath();
  ctx.moveTo(archCX - archR, groundY + 1);
  ctx.lineTo(archCX - archR, archTY);
  ctx.arc(archCX, archTY, archR, Math.PI, 0, false);
  ctx.lineTo(archCX + archR, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Arch frame — pixel keystone blocks (FF dungeon style)
  ctx.fillStyle = '#707070';
  ctx.lineWidth = 2;
  // Left pillar block
  ctx.fillRect(archCX - archR, archTY - 2, 4, groundY - archTY + 2);
  // Right pillar block
  ctx.fillRect(archCX + archR - 4, archTY - 2, 4, groundY - archTY + 2);

  // Stalactites hanging from cave ceiling (FF dungeon feel)
  ctx.fillStyle = '#4A4A4A';
  const stalOffsets = [22, 30, 39, 46];
  const stalLengths = [10, 7, 12, 8];
  stalOffsets.forEach((sx, i) => {
    const sl = stalLengths[i];
    ctx.beginPath();
    ctx.moveTo(sx - 2, archTY - archR + 6);
    ctx.lineTo(sx + 2, archTY - archR + 6);
    ctx.lineTo(sx, archTY - archR + 6 + sl);
    ctx.closePath();
    ctx.fill();
    // Highlight edge
    ctx.fillStyle = '#6A6A6A';
    ctx.fillRect(sx - 1, archTY - archR + 6, 1, sl - 2);
    ctx.fillStyle = '#4A4A4A';
  });

  // Glowing eyes — FF-style slit pupils, pulsing
  const pulse = 0.72 + 0.28 * Math.sin(t * 3.2);
  drawGlowEye(ctx, 27, groundY - 12, pulse);
  drawGlowEye(ctx, 42, groundY - 12, pulse);
}

// ─── Draw: castle ─────────────────────────────────────────────────────────────

function drawTorches(
  ctx: CanvasRenderingContext2D,
  tx: number,
  baseY: number,
  t: number,
  seed: number,
) {
  const flick = 0.7 + 0.3 * Math.sin(t * 9 + seed);

  // Torch stick
  ctx.fillStyle = '#3D2210';
  ctx.fillRect(tx - 1, baseY - 10, 3, 10);
  // Torch top (bracket)
  ctx.fillStyle = '#5A3420';
  ctx.fillRect(tx - 2, baseY - 11, 5, 2);

  // Flame gradient
  const grad = ctx.createRadialGradient(tx, baseY - 14, 0, tx, baseY - 14, 7 * flick);
  grad.addColorStop(0,   `rgba(255,235,60,${flick})`);
  grad.addColorStop(0.4, `rgba(255,120,20,${0.9 * flick})`);
  grad.addColorStop(1,   'rgba(200,30,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(tx, baseY - 14, 4 * flick, 7 * flick, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ambient glow on wall
  const glow = ctx.createRadialGradient(tx, baseY - 12, 0, tx, baseY - 12, 14 * flick);
  glow.addColorStop(0, `rgba(255,180,40,${0.18 * flick})`);
  glow.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(tx - 14, baseY - 26, 28, 26);
}

function drawCastle(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const groundY = H - GROUND_OFFSET;
  const { ltX, ltW, rtX, rtW, wallL, wallR, wallTop, ltTop, rtTop } = castleLayout(W);

  const stone  = '#B8B0A0';
  const stoneM = '#9A9280';  // mid-shadow
  const stoneD = '#6E6660';  // dark shadow
  const dark   = '#0C0A08';

  // ── Helper: draw tower/wall block with FF-style pixel stone texture ──────────
  function drawBlock(x: number, top: number, w: number, h: number, merH = 7, merStep = 8) {
    // Main fill
    ctx.fillStyle = stone;
    ctx.fillRect(x, top, w, h);

    // Alternating brick rows (offset every other row — FF dungeon feel)
    ctx.fillStyle = stoneD;
    for (let sy = top + 7; sy < top + h; sy += 10) {
      ctx.fillRect(x, sy, w, 1);
    }
    ctx.fillStyle = stoneM;
    for (let sy = top + 10; sy < top + h; sy += 10) {
      // Offset brick joints
      const off = ((sy / 10) | 0) % 2 === 0 ? 0 : 4;
      for (let bx = x + off; bx < x + w; bx += 8) {
        ctx.fillRect(bx, sy - 4, 1, 4);
      }
    }

    // Right-edge shadow
    ctx.fillStyle = stoneD;
    ctx.fillRect(x + w - 2, top, 2, h);

    // Merlons (battlements)
    for (let bx = x; bx < x + w - 2; bx += merStep) {
      ctx.fillStyle = stone;
      ctx.fillRect(bx, top - merH, merH - 1, merH);
      // Merlon cap highlight
      ctx.fillStyle = '#D0C8B8';
      ctx.fillRect(bx, top - merH, merH - 1, 1);
      // Merlon shadow
      ctx.fillStyle = stoneD;
      ctx.fillRect(bx + merH - 2, top - merH, 1, merH);
    }
  }

  // ── Arrow slits (FF castle windows) ─────────────────────────────────────────
  function drawArrowSlit(x: number, y: number) {
    ctx.fillStyle = dark;
    ctx.fillRect(x, y,     2, 8);
    ctx.fillRect(x - 1, y + 3, 4, 2);
  }

  // ── Towers & wall ────────────────────────────────────────────────────────────
  drawBlock(ltX, ltTop, ltW, groundY - ltTop, 6, 7);
  drawBlock(rtX, rtTop, rtW, groundY - rtTop, 6, 7);
  drawBlock(wallL, wallTop, wallR - wallL, groundY - wallTop, 7, 10);

  // Arrow slits on towers
  drawArrowSlit(ltX + 8, ltTop + 8);
  drawArrowSlit(rtX + 8, rtTop + 8);
  drawArrowSlit(rtX + 8, rtTop + 22);

  // ── Warm window glow ───────────────────────────────────────────────────────
  // Radiates amber torchlight from within the castle towers
  function drawWindowGlow(wx: number, wy: number) {
    const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 11);
    g.addColorStop(0, 'rgba(255,155,35,0.55)');
    g.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(wx - 11, wy - 11, 22, 22);
    // Window pane fill
    ctx.fillStyle = '#FF9020';
    ctx.fillRect(wx - 2, wy - 3, 4, 5);
    // Top bright pane glint
    ctx.fillStyle = '#FFDD88';
    ctx.fillRect(wx - 1, wy - 2, 2, 1);
  }
  drawWindowGlow(ltX + ltW / 2, ltTop + 18);
  drawWindowGlow(rtX + rtW / 2, rtTop + 16);
  drawWindowGlow(rtX + rtW / 2, rtTop + 30);

  // ── Gate arch ────────────────────────────────────────────────────────────────
  const gateMX = wallL + (wallR - wallL) / 2;
  const gateHW = 11;
  const gateArcCY = groundY - 18;

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(gateMX - gateHW, groundY + 1);
  ctx.lineTo(gateMX - gateHW, gateArcCY);
  ctx.arc(gateMX, gateArcCY, gateHW, Math.PI, 0, false);
  ctx.lineTo(gateMX + gateHW, groundY + 1);
  ctx.closePath();
  ctx.fill();

  // Portcullis bars (horizontal lines = iron bars hint)
  ctx.fillStyle = 'rgba(80,60,40,0.55)';
  for (let py = gateArcCY - gateHW + 4; py < groundY; py += 4) {
    ctx.fillRect(gateMX - gateHW + 2, py, (gateHW - 2) * 2, 1);
  }

  // Gate surround (keystone blocks)
  ctx.strokeStyle = stoneM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gateMX - gateHW, groundY);
  ctx.lineTo(gateMX - gateHW, gateArcCY);
  ctx.arc(gateMX, gateArcCY, gateHW, Math.PI, 0, false);
  ctx.lineTo(gateMX + gateHW, groundY);
  ctx.stroke();

  // Torches flanking gate
  drawTorches(ctx, gateMX - gateHW - 8, wallTop, t, 0);
  drawTorches(ctx, gateMX + gateHW + 8, wallTop, t, 2.1);

  // ── Flag ─────────────────────────────────────────────────────────────────────
  const flagPX   = rtX + rtW / 2;
  const flagBase = rtTop - 7;

  ctx.strokeStyle = '#2A1408';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(flagPX, flagBase);
  ctx.lineTo(flagPX, flagBase - 22);
  ctx.stroke();

  // Banner cloth with wave
  const wave = 2 * Math.sin(t * 3);
  ctx.fillStyle = '#CC2222';
  ctx.beginPath();
  ctx.moveTo(flagPX,      flagBase - 22);
  ctx.lineTo(flagPX + 14 + wave, flagBase - 16);
  ctx.lineTo(flagPX + 12, flagBase - 10);
  ctx.lineTo(flagPX, flagBase - 8);
  ctx.closePath();
  ctx.fill();
  // Flag cross emblem (FF holy symbol)
  ctx.fillStyle = '#FFEEAA';
  ctx.fillRect(flagPX + 4, flagBase - 20, 2, 8);
  ctx.fillRect(flagPX + 2, flagBase - 16, 6, 2);
}

// ─── Draw: dead trees ────────────────────────────────────────────────────────

function drawTrees(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const groundY = H - GROUND_OFFSET;
  const { castleL } = castleLayout(W);

  // Sparse dead/spooky trees silhouetted against the sky
  const trees = [
    { xr: 0.19, h: 26, side: -1 },
    { xr: 0.29, h: 20, side:  1 },
    { xr: 0.40, h: 30, side: -1 },
    { xr: 0.51, h: 22, side:  1 },
    { xr: 0.62, h: 18, side: -1 },
  ].filter(({ xr }) => xr * W > 90 && xr * W < castleL - 24);

  ctx.strokeStyle = '#0B1608';
  ctx.fillStyle   = '#0B1608';

  for (const { xr, h: treeH, side } of trees) {
    const tx = Math.round(W * xr);

    // Trunk — 2 px wide
    ctx.fillRect(tx - 1, groundY - treeH, 2, treeH);

    // Three branches per tree, alternating sides
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, groundY - treeH * 0.55);
    ctx.lineTo(tx + side * 9, groundY - treeH * 0.38);
    ctx.moveTo(tx, groundY - treeH * 0.70);
    ctx.lineTo(tx - side * 7, groundY - treeH * 0.57);
    ctx.moveTo(tx, groundY - treeH * 0.82);
    ctx.lineTo(tx + side * 5, groundY - treeH * 0.74);
    ctx.stroke();
  }
}

// ─── Draw: monsters ───────────────────────────────────────────────────────────

function drawMonsters(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number, cards: CardInfo[],
) {
  const groundY = H - GROUND_OFFSET;
  const { castleL } = castleLayout(W);

  const caveExitX       = 62;
  const castleApproachX = castleL - 18;

  const active = cards
    .filter((c) => !c.archived_at)
    .map((c) => ({ ...c, urgency: cardUrgency(c.end_date), hash: hashStr(c.id) }))
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 24);

  active.forEach((card) => {
    const u    = card.urgency;
    const rawX = caveExitX + (castleApproachX - caveExitX) * u;
    const jitter = ((card.hash % 42) - 21) * 0.20;
    const mx   = Math.min(Math.max(rawX + jitter, caveExitX - 4), castleApproachX + 4);

    // Bob — heavier bounce for dragon, lighter for slime
    const phase = (card.hash % 628) / 100;
    const bobAmp = card.priority === 'critical' ? 2 : 3;
    const bob = -Math.abs(Math.sin(t * 2.6 + phase)) * bobAmp;

    const type = cardToMonsterType(card.priority);
    const spr  = SPRITES[type] ?? SLIME;
    const sprH = spr.length * S;
    const sprW = spr[0].length * S;

    blit(ctx, spr, Math.round(mx - sprW / 2), Math.round(groundY - sprH + bob), S);
  });
}

// ─── Draw: castle guards (member avatars) ─────────────────────────────────────

function drawGuards(
  ctx: CanvasRenderingContext2D, W: number, H: number, members: MemberInfo[],
) {
  const groundY = H - GROUND_OFFSET;
  const { wallL, wallR, wallTop } = castleLayout(W);

  const avatarH   = 16 * S;  // 32 CSS px
  const maxGuards = Math.max(1, Math.floor((wallR - wallL) / 18));
  const guards    = members.slice(0, maxGuards);
  if (!guards.length) return;

  const step = guards.length > 1 ? (wallR - wallL) / guards.length : wallR - wallL;
  const gy   = wallTop - avatarH;

  guards.forEach((m, i) => {
    const gx   = wallL + i * step + step / 2 - (8 * S) / 2;
    const arch = (m.user?.avatar as { archetype?: string } | undefined)?.archetype;
    const col  = ARCHETYPE_COL[arch ?? ''] ?? '#C0C8D0';
    blit(ctx, makeAvatar(col), Math.round(gx), Math.round(gy), S);
  });

  void groundY;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuestBannerProps {
  boardId?: string;
}

export function QuestBanner({ boardId }: QuestBannerProps) {
  const { enabled, setEnabled } = useQuestStore();

  const boardCards = useBoardStore((s) => s.cards);
  const { data: realMembers = [] } = useBoardMembers(boardId ?? '');

  const cards = useMemo<CardInfo[]>(() => {
    if (!boardId) return DEMO_CARDS;
    return Object.values(boardCards).flat().filter((c) => !c.archived_at).slice(0, 30) as CardInfo[];
  }, [boardId, boardCards]);

  const members = useMemo<MemberInfo[]>(() => {
    if (!boardId) return DEMO_MEMBERS;
    return realMembers as unknown as MemberInfo[];
  }, [boardId, realMembers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const widthRef     = useRef(0);
  const cardsRef     = useRef(cards);
  const membersRef   = useRef(members);

  useEffect(() => { cardsRef.current  = cards;   }, [cards]);
  useEffect(() => { membersRef.current = members; }, [members]);

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      if (W >= 300) {
        drawBackground(ctx, W, BANNER_H, t);
        drawCave(ctx, W, BANNER_H, t);
        drawTrees(ctx, W, BANNER_H);
        drawCastle(ctx, W, BANNER_H, t);
        drawMonsters(ctx, W, BANNER_H, t, cardsRef.current);
        drawGuards(ctx, W, BANNER_H, membersRef.current);
      } else {
        ctx.fillStyle = '#1A3A6A';
        ctx.fillRect(0, 0, W, BANNER_H);
      }
      ctx.restore();
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="h-10 flex-shrink-0 border-b border-[var(--color-border)]" aria-hidden="true" />
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
        style={{ width: '100%', height: BANNER_H, display: 'block', imageRendering: 'pixelated' }}
      />
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
