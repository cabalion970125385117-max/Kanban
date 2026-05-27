import { useEffect } from 'react';
import { useCollabStore } from '@/stores/collaboration.store';

export function LiveCursorLayer() {
  const cursors = useCollabStore((s) => s.cursors);
  const clearStaleCursors = useCollabStore((s) => s.clearStaleCursors);

  useEffect(() => {
    const id = setInterval(clearStaleCursors, 2000);
    return () => clearInterval(id);
  }, [clearStaleCursors]);

  const entries = Object.values(cursors);
  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {entries.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute flex items-center gap-1"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            transition: 'transform 80ms linear',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M0 0L14 5L8 8L5 14L0 0Z" fill="var(--color-accent)" stroke="white" strokeWidth="1" />
          </svg>
          <span className="bg-[var(--color-accent)] text-white text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap shadow">
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
}
