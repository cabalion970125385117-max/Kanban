/**
 * MentionPicker — reusable @mention dropdown.
 * Attaches below the anchor element (textarea / editor).
 * Used by both MarkdownEditor (descriptions) and CommentThread.
 */
import { useEffect, useRef } from 'react';
import { useBoardMembers } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/auth.store';

interface MentionPickerProps {
  boardId: string;
  query: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export function MentionPicker({ boardId, query, onSelect, onClose, anchorRef }: MentionPickerProps) {
  const { data: members = [] } = useBoardMembers(boardId);
  const currentUser = useAuthStore((s) => s.user);
  const pickerRef = useRef<HTMLDivElement>(null);

  const filtered = members.filter(
    (m) =>
      (m.user?.name ?? '').toLowerCase().includes(query.toLowerCase()) &&
      m.user_id !== currentUser?.id,
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[0].user?.name ?? '');
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [filtered, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-1 left-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-30 min-w-[180px] max-h-40 overflow-y-auto"
    >
      {filtered.map((m) => (
        <button
          key={m.user_id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(m.user?.name ?? '');
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
            {m.user?.avatar?.thumb_url ? (
              <img src={m.user.avatar.thumb_url} alt={m.user?.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-white font-bold">
                {(m.user?.name ?? '?').charAt(0)}
              </span>
            )}
          </div>
          <span className="truncate">{m.user?.name}</span>
        </button>
      ))}
    </div>
  );
}
