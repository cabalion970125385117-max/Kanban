import { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';

const BANNER_KEY = 'qb-banner';

interface BannerData {
  enabled: boolean;
  text: string;
}

function readBanner(): BannerData {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    if (!raw) return { enabled: false, text: '' };
    return JSON.parse(raw) as BannerData;
  } catch {
    return { enabled: false, text: '' };
  }
}

export function MaintenanceBanner() {
  const [banner, setBanner] = useState<BannerData>(readBanner);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BANNER_KEY) {
        setBanner(readBanner());
        setDismissed(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!banner.enabled || !banner.text || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-[var(--color-warning)] text-white px-4 py-2 flex items-center gap-3 shadow-md">
      <Megaphone className="h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm font-medium">{banner.text}</p>
      <button onClick={() => setDismissed(true)} className="hover:opacity-70 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function setBannerInStorage(enabled: boolean, text: string) {
  localStorage.setItem(BANNER_KEY, JSON.stringify({ enabled, text }));
  window.dispatchEvent(new StorageEvent('storage', { key: BANNER_KEY }));
}
