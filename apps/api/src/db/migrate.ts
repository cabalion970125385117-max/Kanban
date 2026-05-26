import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate(direction: 'up' | 'down' = 'up'): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (direction === 'up') {
      const applied = await client.query('SELECT filename FROM migrations');
      const appliedSet = new Set(applied.rows.map((r: { filename: string }) => r.filename));

      for (const file of files) {
        if (appliedSet.has(file)) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        console.log(`Applying migration: ${file}`);
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`  ✓ ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
      console.log('All migrations applied.');
    } else {
      const last = await client.query(
        'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1',
      );
      if (!last.rows[0]) {
        console.log('Nothing to rollback.');
        return;
      }
      const filename = last.rows[0].filename as string;
      console.log(`Rolling back: ${filename}`);
      await client.query('DELETE FROM migrations WHERE filename = $1', [filename]);
      console.log(`  ✓ Rolled back ${filename} (SQL not reversed — manual action may be needed)`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

const direction = (process.argv[2] as 'up' | 'down') ?? 'up';
migrate(direction).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
