import { hashPassword } from '@/lib/crypto';
import { getDB, uid, now } from './index';
import type { HeroArchetype } from '@questboard/shared';

const ARCHETYPES: HeroArchetype[] = [
  'quality', 'process', 'project', 'production', 'maintenance', 'finance', 'management', 'aiit',
];

const ARCHETYPE_COLOURS: Record<HeroArchetype, string> = {
  quality:    '#0891B2',
  process:    '#4F46E5',
  project:    '#059669',
  production: '#EA580C',
  maintenance:'#475569',
  finance:    '#16A34A',
  management: '#7C3AED',
  aiit:       '#2563EB',
};

const ARCHETYPE_EMOJI: Record<HeroArchetype, string> = {
  quality:    '🔬',
  process:    '⚙️',
  project:    '📋',
  production: '🏭',
  maintenance:'🛠️',
  finance:    '💰',
  management: '👔',
  aiit:       '🤖',
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
    const qualityAvatars = await db.getAllFromIndex('avatars', 'by-archetype', 'quality');
    await db.put('users', {
      id: uid(),
      name: 'cabal',
      email: 'cabal@questboard.app',
      password_hash: hash,
      avatar_id: qualityAvatars[0]?.id ?? null,
      role: 'admin',
      status: 'active',
      created_at: now(),
      last_login_at: null,
    });
  }
}
