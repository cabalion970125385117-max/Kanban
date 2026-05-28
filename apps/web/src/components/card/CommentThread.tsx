import { useState, useRef } from 'react';
import { MessageCircle, Pencil, Trash2, Send, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments';
import { useBoardMembers } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { getDB, uid, now } from '@/lib/db';

interface CommentThreadProps {
  cardId: string;
  boardId: string;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fullTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Render comment body with @mentions highlighted */
function CommentBody({ body }: { body: string }) {
  const parts = body.split(/(@\S+)/g);
  return (
    <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-[var(--color-accent)] font-semibold">{part}</span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

async function notifyMentions(body: string, _cardId: string, authorName: string, targetUserIds: string[]) {
  const db = await getDB();
  for (const userId of targetUserIds) {
    await db.put('notifications', {
      id: uid(),
      user_id: userId,
      type: 'system',
      title: 'You were mentioned',
      message: `${authorName} mentioned you in a comment: "${body.slice(0, 80)}"`,
      is_read: false,
      created_at: now(),
    });
  }
}

export function CommentThread({ cardId, boardId }: CommentThreadProps) {
  const { data: comments = [] } = useComments(cardId);
  const { data: members = [] } = useBoardMembers(boardId);
  const create = useCreateComment(cardId);
  const edit = useUpdateComment(cardId);
  const remove = useDeleteComment(cardId);
  const currentUser = useAuthStore((s) => s.user);

  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) =>
        (m.user?.name ?? '').toLowerCase().includes(mentionQuery.toLowerCase()) &&
        m.user_id !== currentUser?.id,
      )
    : [];

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\S*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (name: string) => {
    const before = body.slice(0, mentionStart);
    const after = body.slice(textareaRef.current?.selectionStart ?? body.length);
    const newBody = `${before}@${name} ${after}`;
    setBody(newBody);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const submitComment = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    // Find mentioned users
    const mentionedNames = [...trimmed.matchAll(/@(\S+)/g)].map((m) => m[1].toLowerCase());
    const mentionedIds = members
      .filter((m) => mentionedNames.includes((m.user?.name ?? '').toLowerCase()))
      .map((m) => m.user_id);

    create.mutate(
      { body: trimmed },
      {
        onSuccess: () => {
          setBody('');
          if (mentionedIds.length > 0 && currentUser) {
            notifyMentions(trimmed, cardId, currentUser.name, mentionedIds);
          }
        },
      },
    );
  };

  const submitEdit = (id: string) => {
    const trimmed = editBody.trim();
    if (trimmed) edit.mutate({ id, body: trimmed });
    setEditingId(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] mb-3">
        <MessageCircle className="h-3.5 w-3.5" />
        <span>Comments</span>
        {comments.length > 0 && (
          <span className="text-[var(--color-accent)] font-semibold">{comments.length}</span>
        )}
      </div>

      {/* Comment list */}
      <div className="space-y-3 mb-3">
        {comments.map((comment) => (
          <div key={comment.id} className="group flex gap-2.5">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center overflow-hidden">
              {comment.user_avatar ? (
                <img src={comment.user_avatar} alt={comment.user_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-white font-bold">
                  {(comment.user_name ?? '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xs font-semibold text-[var(--color-text)]">{comment.user_name}</span>
                <span
                  className="text-[10px] text-[var(--color-text-muted)] cursor-default"
                  title={fullTimestamp(comment.created_at)}
                >
                  {timeAgo(comment.created_at)}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <span
                    className="text-[10px] text-[var(--color-text-muted)] italic cursor-default"
                    title={`Edited ${fullTimestamp(comment.updated_at)}`}
                  >
                    (edited)
                  </span>
                )}
              </div>

              {editingId === comment.id ? (
                <div>
                  <textarea
                    autoFocus
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(comment.id); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    rows={2}
                    className="w-full text-sm border border-[var(--color-accent)] rounded px-2 py-1 resize-none outline-none"
                  />
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" className="h-6 text-xs" onClick={() => submitEdit(comment.id)}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <CommentBody body={comment.body} />
              )}
            </div>

            {comment.user_id === currentUser?.id && editingId !== comment.id && (
              <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                  className="p-1 text-gray-400 hover:text-[var(--color-accent)] rounded"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => remove.mutate(comment.id)}
                  className="p-1 text-gray-400 hover:text-[var(--color-danger)] rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New comment input */}
      <div className="flex gap-2 items-start">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
          <span className="text-[10px] text-white font-bold">
            {(currentUser?.name ?? '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleBodyChange}
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredMembers.length > 0 && e.key === 'Enter') {
                e.preventDefault();
                insertMention(filteredMembers[0].user?.name ?? '');
                return;
              }
              if (e.key === 'Escape' && mentionQuery !== null) {
                setMentionQuery(null);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
                e.preventDefault();
                submitComment();
              }
            }}
            placeholder="Write a comment… (@ to mention)"
            rows={2}
            className={cn(
              'w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none transition-colors',
              'focus:border-[var(--color-accent)] bg-[var(--color-bg)]',
            )}
          />

          {/* @mention dropdown */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 min-w-[180px] max-h-40 overflow-y-auto">
              {filteredMembers.map((m) => (
                <button
                  key={m.user_id}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(m.user?.name ?? ''); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {m.user?.avatar?.thumb_url
                      ? <img src={m.user.avatar.thumb_url} alt={m.user?.name} className="w-full h-full object-cover" />
                      : <span className="text-[9px] text-white font-bold">{(m.user?.name ?? '?').charAt(0)}</span>}
                  </div>
                  <span className="truncate">{m.user?.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              onClick={() => {
                const pos = textareaRef.current?.selectionStart ?? body.length;
                const newBody = body.slice(0, pos) + '@' + body.slice(pos);
                setBody(newBody);
                setMentionQuery('');
                setMentionStart(pos);
                textareaRef.current?.focus();
              }}
              title="Mention someone"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={submitComment}
              disabled={!body.trim() || create.isPending}
              className="text-[var(--color-accent)] disabled:opacity-30 hover:opacity-70 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
