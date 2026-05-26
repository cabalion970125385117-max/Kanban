import { Pool } from 'pg';
import { env } from './env';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

export async function testConnection(): Promise<void> {
  const client = await db.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('PostgreSQL connected');
}
