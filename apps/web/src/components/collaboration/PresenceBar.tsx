import { useCollabStore } from '@/stores/collaboration.store';

export function PresenceBar() {
  const onlineUsers = useCollabStore((s) => s.onlineUsers);
  const users = Object.values(onlineUsers);

  if (users.length === 0) return null;

  const visible = users.slice(0, 5);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center" title={`${users.length} online`}>
      {visible.map((u, i) => (
        <div
          key={u.userId}
          title={u.name}
          style={{ zIndex: visible.length - i }}
          className="w-7 h-7 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-primary)] flex items-center justify-center text-xs font-bold text-white -ml-2 first:ml-0 cursor-default"
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <span className="ml-1 text-xs text-white/70">+{overflow}</span>
      )}
    </div>
  );
}
