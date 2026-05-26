import { useState } from 'react';
import { MessageCircle, Pencil, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface CommentThreadProps {
  cardId: string;
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

export function CommentThread({ cardId }: CommentThreadProps) {
  const { data: comments = [] } = useComments(cardId);
  const create = useCreateComment(cardId);
  const edit = useUpdateComment(cardId);
  const remove = useDeleteComment(cardId);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const submitComment = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    create.mutate({ body: trimmed }, { onSuccess: () => setBody('') });
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
            {/* Avatar */}
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center overflow-hidden">
              {comment.user_avatar ? (
                <img src={comment.user_avatar} alt={comment.user_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-white font-bold">
                  {(comment.user_name ?? '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xs font-semibold text-[var(--color-text)]">{comment.user_name}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(comment.created_at)}</span>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-[10px] text-[var(--color-text-muted)] italic">(edited)</span>
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
                <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words">
                  {comment.body}
                </p>
              )}
            </div>

            {/* Actions — own comments only */}
            {comment.user_id === currentUserId && editingId !== comment.id && (
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
            {(useAuthStore.getState().user?.name ?? '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
            }}
            placeholder="Write a comment… (Enter to send)"
            rows={2}
            className={cn(
              'w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none transition-colors',
              'focus:border-[var(--color-accent)] bg-[var(--color-bg)]',
            )}
          />
          <button
            onClick={submitComment}
            disabled={!body.trim() || create.isPending}
            className="absolute bottom-2 right-2 text-[var(--color-accent)] disabled:opacity-30 hover:opacity-70 transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
