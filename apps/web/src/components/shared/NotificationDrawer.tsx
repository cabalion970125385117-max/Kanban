import { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppNotification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Exported so useSocket can push notifications in
export const notificationBus = {
  listeners: new Set<(n: AppNotification) => void>(),
  push(n: AppNotification) {
    this.listeners.forEach((fn) => fn(n));
  },
};

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (n: AppNotification) =>
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    notificationBus.listeners.add(handler);
    return () => { notificationBus.listeners.delete(handler); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const markAllRead = () =>
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="text-white hover:bg-white/10 relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
            <span className="font-semibold text-sm text-[var(--color-text)]">
              Notifications {unread > 0 && <span className="text-[var(--color-accent)]">({unread})</span>}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-[var(--color-text-muted)]">
                <Bell className="h-6 w-6 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 text-sm border-b border-[var(--color-border)] last:border-0 ${
                    n.is_read ? 'text-[var(--color-text-muted)]' : 'bg-[var(--color-accent)]/5 text-[var(--color-text)]'
                  }`}
                >
                  {n.message}
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
