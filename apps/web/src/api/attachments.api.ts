import { getDB, uid, now } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';
import type { AttachmentRow } from '@/lib/db';

export interface Attachment {
  id: string;
  card_id: string;
  user_id: string;
  name: string;
  mime_type: string;
  size: number;
  data: string; // base64 data URL
  created_at: string;
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    card_id: row.card_id,
    user_id: row.user_id,
    name: row.name,
    mime_type: row.mime_type,
    size: row.size,
    data: row.data,
    created_at: row.created_at,
  };
}

export async function getAttachments(cardId: string): Promise<Attachment[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('attachments', 'by-card', cardId);
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(toAttachment);
}

export async function createAttachment(
  cardId: string,
  file: File,
): Promise<Attachment> {
  const userId = useAuthStore.getState().user?.id ?? 'unknown';

  // Read file as base64 data URL
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const row: AttachmentRow = {
    id: uid(),
    card_id: cardId,
    user_id: userId,
    name: file.name,
    mime_type: file.type,
    size: file.size,
    data,
    created_at: now(),
  };
  const db = await getDB();
  await db.put('attachments', row);
  return toAttachment(row);
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const db = await getDB();
  await db.delete('attachments', attachmentId);
}
