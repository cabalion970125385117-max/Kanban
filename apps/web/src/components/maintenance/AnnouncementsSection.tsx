import { useEffect, useState } from 'react';
import { Bell, Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { broadcastAnnouncement, getAnnouncementHistory, getAllUsers } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AnnouncementRow } from '@/lib/db';
import { useAuthStore } from '@/stores/auth.store';

export function AnnouncementsSection() {
  const { user: me } = useAuthStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AnnouncementRow[]>([]);
  const [userCount, setUserCount] = useState(0);

  const load = async () => {
    const [h, users] = await Promise.all([getAnnouncementHistory(), getAllUsers()]);
    setHistory(h);
    setUserCount(users.length);
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const count = await broadcastAnnouncement(title.trim(), message.trim(), me?.id ?? '');
      toast.success(`Announcement sent to ${count} member${count !== 1 ? 's' : ''}`);
      setTitle('');
      setMessage('');
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-[var(--color-text)]">Announcements</h2>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Users className="h-4 w-4" />
          <span>Will be pushed as a notification to all <strong className="text-[var(--color-text)]">{userCount}</strong> members</span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ann-title">Title</Label>
          <Input
            id="ann-title"
            placeholder="Scheduled maintenance at 18:00 UTC"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ann-message">Message</Label>
          <textarea
            id="ann-message"
            rows={4}
            placeholder="Describe the announcement in detail…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
          />
        </div>

        {title && message && (
          <div className="rounded-lg bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/20 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">Preview</p>
            <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
          </div>
        )}

        <Button onClick={send} loading={sending} disabled={!title.trim() || !message.trim()}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Broadcast to All Members
        </Button>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Sent Announcements</h3>
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {history.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{a.title}</p>
                    <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                      {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{a.message}</p>
                  <p className="text-xs text-[var(--color-text-muted)]/60 mt-1">Sent to {a.sent_to_count} members</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
