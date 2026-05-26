import { Pool } from 'pg';

const ARCHETYPES = ['knight', 'mage', 'archer', 'paladin', 'rogue', 'sorcerer', 'berserker', 'herald'] as const;
const VARIANTS = [1, 2, 3, 4] as const;

export async function seedAvatars(pool: Pool): Promise<void> {
  console.log('Seeding avatars...');
  for (const archetype of ARCHETYPES) {
    for (const variant of VARIANTS) {
      await pool.query(
        `INSERT INTO avatars (archetype, variant, sprite_url, thumb_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (archetype, variant) DO NOTHING`,
        [
          archetype,
          variant,
          `/avatars/${archetype}-${variant}.png`,
          `/avatars/thumb/${archetype}-${variant}.png`,
        ],
      );
    }
  }
  console.log(`  ✓ ${ARCHETYPES.length * VARIANTS.length} avatars seeded`);
}
