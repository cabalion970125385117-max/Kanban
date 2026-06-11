/**
 * useBridgeSync — startup IDB→bridge snapshot + polling for Claude's changes.
 *
 * On mount: dumps the full IDB into the bridge so the MCP server has
 * up-to-date data from the moment the app opens.
 *
 * Polling (every 5 s): fetches the bridge store and upserts any entities
 * that are newer than what's in IDB — so cards Claude creates/moves/edits
 * appear in the UI automatically.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { bridgeSnapshot, pullBridge } from '@/lib/bridge-sync';

const POLL_MS = 5_000;

async function pushSnapshot(): Promise<void> {
  const db = await getDB();
  const [boards, columns, cards, substeps, comments] = await Promise.all([
    db.getAll('boards'),
    db.getAll('columns'),
    db.getAll('cards'),
    db.getAll('substeps'),
    db.getAll('comments'),
  ]);
  bridgeSnapshot({ boards, columns, cards, substeps, comments });
}

async function mergeBridgeIntoIDB(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  const remote = await pullBridge();
  if (!remote) return;

  const db = await getDB();
  let dirty = false;

  // Cards — the most important entity for Claude interactions
  for (const rc of remote.cards) {
    const local = await db.get('cards', rc.id);
    const remoteNewer = !local || rc.updated_at > local.updated_at;
    if (!remoteNewer) continue;

    dirty = true;
    await db.put('cards', {
      id: rc.id,
      board_id: rc.board_id,
      column_id: rc.column_id,
      title: rc.title,
      description: rc.description ?? null,
      priority: rc.priority as 'low' | 'medium' | 'high' | 'critical',
      start_date: rc.start_date ?? null,
      end_date: rc.end_date ?? null,
      estimate_hours: rc.estimate_hours ?? null,
      order_index: rc.order_index,
      archived_at: rc.archived_at ?? null,
      created_by: rc.created_by ?? null,
      created_at: rc.created_at,
      updated_at: rc.updated_at,
      owner_ids: rc.owner_ids ?? local?.owner_ids ?? [],
      label_ids: rc.label_ids ?? local?.label_ids ?? [],
      cover_colour: local?.cover_colour ?? null,
      card_tags: rc.card_tags ?? local?.card_tags ?? [],
    });
  }

  // Boards
  for (const rb of remote.boards) {
    const local = await db.get('boards', rb.id);
    if (!local) {
      dirty = true;
      await db.put('boards', {
        id: rb.id,
        name: rb.name,
        owner_id: rb.owner_id,
        created_at: rb.created_at,
        archived_at: rb.archived_at ?? null,
        member_count: 1,
      });
    }
  }

  // Columns
  for (const rc of remote.columns) {
    const local = await db.get('columns', rc.id);
    if (!local) {
      dirty = true;
      await db.put('columns', {
        id: rc.id,
        board_id: rc.board_id,
        name: rc.name,
        colour: rc.colour,
        order_index: rc.order_index,
        wip_limit: rc.wip_limit ?? null,
        created_at: rc.created_at,
      });
    }
  }

  // Substeps
  for (const rs of remote.substeps) {
    const local = await db.get('substeps', rs.id);
    if (!local || rs.is_complete !== local.is_complete) {
      dirty = true;
      await db.put('substeps', {
        id: rs.id,
        card_id: rs.card_id,
        name: rs.name,
        is_complete: rs.is_complete,
        order_index: rs.order_index,
        created_at: rs.created_at,
        target_date: local?.target_date ?? null,
        owner_id: local?.owner_id ?? null,
      });
    }
  }

  // Comments
  for (const rc of remote.comments) {
    const local = await db.get('comments', rc.id);
    if (!local) {
      dirty = true;
      await db.put('comments', {
        id: rc.id,
        card_id: rc.card_id,
        user_id: rc.user_id ?? 'claude',
        body: rc.body,
        parent_id: null,
        created_at: rc.created_at,
        updated_at: rc.updated_at ?? rc.created_at,
      });
    }
  }

  if (dirty) {
    // Invalidate all board/card queries so the UI re-renders with Claude's data
    queryClient.invalidateQueries();
  }
}

export function useBridgeSync(): void {
  const queryClient = useQueryClient();
  const versionRef = useRef<number>(0);
  const offlineRef = useRef<boolean>(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    pushSnapshot();

    async function poll() {
      const remote = await pullBridge();
      if (!remote) {
        // Bridge offline — back off to 30 s to stop spamming proxy errors
        offlineRef.current = true;
        timerRef.current = setTimeout(poll, 30_000);
        return;
      }
      if (offlineRef.current) {
        offlineRef.current = false;
        // Bridge just came back online — push a fresh snapshot
        pushSnapshot();
      }
      if (remote.version > versionRef.current) {
        versionRef.current = remote.version;
        await mergeBridgeIntoIDB(queryClient);
      }
      timerRef.current = setTimeout(poll, POLL_MS);
    }

    timerRef.current = setTimeout(poll, POLL_MS);
    return () => clearTimeout(timerRef.current);
  }, [queryClient]);
}
