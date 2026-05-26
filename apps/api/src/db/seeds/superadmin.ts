import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export async function seedSuperadmin(pool: Pool): Promise<void> {
  console.log('Seeding superadmin...');

  const existing = await pool.query("SELECT id FROM users WHERE name = 'cabal' OR email = 'cabal@questboard.app'");
  if (existing.rowCount && existing.rowCount > 0) {
    console.log('  ✓ Superadmin already exists, skipping');
    return;
  }

  // Password "cabal" — bypasses API validation; seeded directly for dev access
  const hash = await bcrypt.hash('cabal', 12);

  const knightAvatar = await pool.query(
    "SELECT id FROM avatars WHERE archetype = 'knight' AND variant = 1",
  );
  const avatarId = knightAvatar.rows[0]?.id ?? null;

  await pool.query(
    `INSERT INTO users (name, email, password_hash, avatar_id, role, status)
     VALUES ('cabal', 'cabal@questboard.app', $1, $2, 'admin', 'active')`,
    [hash, avatarId],
  );

  console.log('  ✓ Superadmin created — name: cabal | password: cabal | role: admin');
}
