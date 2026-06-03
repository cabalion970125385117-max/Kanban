import { hashPassword } from '@/lib/crypto';
import { getDB, uid, now } from './index';
import type { HeroArchetype } from '@questboard/shared';

const ARCHETYPES: HeroArchetype[] = [
  'knight', 'mage', 'archer', 'paladin', 'rogue', 'sorcerer', 'berserker', 'herald',
];

const ARCHETYPE_COLOURS: Record<HeroArchetype, string> = {
  knight: '#5B4FCF',
  mage: '#9B59B6',
  archer: '#2EA64A',
  paladin: '#F4D03F',
  rogue: '#1A1A2E',
  sorcerer: '#D94040',
  berserker: '#E07B2A',
  herald: '#17A589',
};

const ARCHETYPE_EMOJI: Record<HeroArchetype, string> = {
  knight: '⚔️',
  mage: '🧙',
  archer: '🏹',
  paladin: '🛡️',
  rogue: '🗡️',
  sorcerer: '🔮',
  berserker: '🪓',
  herald: '📯',
};

function svgDataUrl(emoji: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}" rx="10"/><text x="32" y="44" text-anchor="middle" font-size="30">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

let seeded = false;

export async function seedDB(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const db = await getDB();

  // ── avatars ──────────────────────────────────────────────────────────────
  const avatarCount = await db.count('avatars');
  if (avatarCount === 0) {
    const tx = db.transaction('avatars', 'readwrite');
    for (const arch of ARCHETYPES) {
      for (let v = 1; v <= 4; v++) {
        const url = svgDataUrl(ARCHETYPE_EMOJI[arch], ARCHETYPE_COLOURS[arch]);
        await tx.store.put({
          id: uid(),
          archetype: arch,
          variant: v as 1 | 2 | 3 | 4,
          sprite_url: url,
          thumb_url: url,
        });
      }
    }
    await tx.done;
  }

  // ── superadmin ───────────────────────────────────────────────────────────
  const existing = await db.getFromIndex('users', 'by-email', 'cabal@questboard.app');
  if (!existing) {
    const hash = await hashPassword('cabal');
    const knights = await db.getAllFromIndex('avatars', 'by-archetype', 'knight');
    await db.put('users', {
      id: uid(),
      name: 'cabal',
      email: 'cabal@questboard.app',
      password_hash: hash,
      avatar_id: knights[0]?.id ?? null,
      role: 'admin',
      status: 'active',
      created_at: now(),
      last_login_at: null,
    });
  }
}
