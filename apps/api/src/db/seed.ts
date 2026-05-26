import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { seedAvatars } from './seeds/avatars';
import { seedSuperadmin } from './seeds/superadmin';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await seedAvatars(pool);
    await seedSuperadmin(pool);
    console.log('Seeding complete.');
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
