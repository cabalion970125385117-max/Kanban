import { useCollabStore } from '@/stores/collaboration.store';

interface TypingIndicatorProps {
  cardId: string;
}

export function TypingIndicator({ cardId }: TypingIndicatorProps) {
  const typing = useCollabStore((s) => s.typing);
  const onlineUsers = useCollabStore((s) => s.onlineUsers);

  const names = Object.entries(typing)
    .filter(([, cid]) => cid === cardId)
    .map(([uid]) => onlineUsers[uid]?.name ?? 'Someone');

  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are typing…`;

  return (
    <p className="text-xs text-[var(--color-text-muted)] italic animate-pulse px-1">{label}</p>
  );
}
