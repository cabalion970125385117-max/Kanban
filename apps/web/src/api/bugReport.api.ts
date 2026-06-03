import { getDB, uid, now } from '@/lib/db';
import type { BugReportRow } from '@/lib/db';

export type BugReportInput = Omit<BugReportRow, 'id' | 'status' | 'created_at'>;

export async function submitBugReport(data: BugReportInput): Promise<BugReportRow> {
  const db = await getDB();
  const row: BugReportRow = {
    id: uid(),
    status: 'open',
    created_at: now(),
    ...data,
  };
  await db.put('bug_reports', row);
  return row;
}
