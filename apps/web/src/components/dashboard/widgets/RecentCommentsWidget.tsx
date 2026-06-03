import { MessageSquare } from 'lucide-react';
import type { CommentEntry } from '@/api/dashboard.api';

interface RecentCommentsWidgetProps {
  comments: CommentEntry[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Strips basic markdown and trims to maxLen chars */
function excerptBody(body: string, maxLen = 120): string {
  const stripped = body
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + '…' : stripped;
}

export function RecentCommentsWidget({ comments }: RecentCommentsWidgetProps) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
        <MessageSquare className="h-8 w-8 text-[var(--color-border)]" />
        <p className="text-sm text-[var(--color-text-muted)]">No comments yet</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Add comments to cards to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 overflow-y-auto max-h-full divide-y divide-[var(--color-border)]">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2.5 py-2.5">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
            {c.userThumb ? (
              <img src={c.userThumb} alt={c.userName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] text-white font-bold">
                {c.userName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                {c.userName}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                commented on
              </span>
              <span className="text-[10px] font-medium text-[var(--color-accent)] truncate max-w-[140px]">
                {c.cardTitle}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] ml-auto flex-shrink-0">
                {timeAgo(c.created_at)}
              </span>
            </div>

            {/* Body */}
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
              {excerptBody(c.body)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
