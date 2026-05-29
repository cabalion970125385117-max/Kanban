import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { setBannerInStorage } from '@/components/shared/MaintenanceBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BANNER_KEY = 'qb-banner';

function readBanner(): { enabled: boolean; text: string } {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    if (!raw) return { enabled: false, text: '' };
    return JSON.parse(raw) as { enabled: boolean; text: string };
  } catch {
    return { enabled: false, text: '' };
  }
}

export function MaintenanceBannerSection() {
  const current = readBanner();
  const [enabled, setEnabled] = useState(current.enabled);
  const [text, setText] = useState(current.text);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BANNER_KEY) {
        const b = readBanner();
        setEnabled(b.enabled);
        setText(b.text);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = () => {
    setBannerInStorage(enabled, text);
    toast.success(enabled ? 'Banner enabled' : 'Banner disabled');
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">System Banner</h2>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          Display a notice to all users across all open browser tabs. The banner persists until disabled.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
          <Label className="font-medium">
            {enabled ? 'Banner enabled' : 'Banner disabled'}
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="banner-text">Message</Label>
          <Input
            id="banner-text"
            placeholder="Scheduled maintenance at 18:00 UTC…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!enabled}
          />
        </div>

        {enabled && text && (
          <div className="rounded-lg bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 px-4 py-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[var(--color-warning)]" />
            <p className="text-sm text-[var(--color-text)]">{text}</p>
          </div>
        )}

        <Button onClick={save}>
          Save Banner
        </Button>
      </div>
    </div>
  );
}
