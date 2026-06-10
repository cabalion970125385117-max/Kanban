/**
 * bridge-sync — keeps the MCP bridge server (localhost:4002) in sync with IDB.
 *
 * All calls are fire-and-forget: if the bridge isn't running the fetch simply
 * fails silently so the app continues working normally (local-first).
 */

const BRIDGE = '/bridge';

/** Push a single entity mutation to the bridge. */
export function bridgeSync(
  type:
    | 'board:upsert'
    | 'column:upsert'
    | 'column:delete'
    | 'card:upsert'
    | 'substep:upsert'
    | 'substep:delete'
    | 'comment:upsert'
    | 'comment:delete',
  payload: unknown,
): void {
  fetch(`${BRIDGE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload }),
  }).catch(() => { /* bridge offline — no-op */ });
}

/** Push the full IDB state as a snapshot (called once on startup). */
export function bridgeSnapshot(data: {
  boards: unknown[];
  columns: unknown[];
  cards: unknown[];
  substeps: unknown[];
  comments: unknown[];
}): void {
  fetch(`${BRIDGE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'snapshot', payload: data }),
  }).catch(() => { /* bridge offline — no-op */ });
}

/** Check bridge version (lightweight poll). */
export async function getBridgeVersion(): Promise<{ version: number; last_modified: string } | null> {
  try {
    const res = await fetch(`${BRIDGE}/version`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return null;
    return res.json() as Promise<{ version: number; last_modified: string }>;
  } catch {
    return null;
  }
}

/** Pull the full bridge store (used by the polling hook to merge Claude's changes). */
export async function pullBridge(): Promise<BridgeStore | null> {
  try {
    const res = await fetch(`${BRIDGE}/pull`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return res.json() as Promise<BridgeStore>;
  } catch {
    return null;
  }
}

export interface BridgeStore {
  boards: Array<{ id: string; name: string; owner_id: string; created_at: string; archived_at: string | null }>;
  columns: Array<{ id: string; board_id: string; name: string; colour: string; order_index: number; wip_limit: number | null; created_at: string }>;
  cards: Array<{
    id: string; board_id: string; column_id: string; title: string;
    description: string | null; priority: string; start_date: string | null;
    end_date: string | null; estimate_hours: number | null; order_index: number;
    archived_at: string | null; created_by: string | null;
    created_at: string; updated_at: string;
    owner_ids?: string[]; label_ids?: string[]; card_tags?: string[];
  }>;
  substeps: Array<{ id: string; card_id: string; name: string; is_complete: boolean; order_index: number; created_at: string }>;
  comments: Array<{ id: string; card_id: string; body: string; user_id?: string; created_at: string; updated_at?: string }>;
  version: number;
  last_modified: string;
  changed: boolean;
}
