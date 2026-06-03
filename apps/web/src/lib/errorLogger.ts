import { getDB, uid, now } from '@/lib/db';

export async function logError(
  message: string,
  stack: string | null,
  pageUrl: string,
): Promise<void> {
  try {
    const db = await getDB();
    await db.put('error_logs', {
      id: uid(),
      message: message ?? 'Unknown error',
      stack: stack ?? null,
      page_url: pageUrl,
      created_at: now(),
    });
  } catch {
    // Silently swallow — logging failures must not cause infinite loops
  }
}
