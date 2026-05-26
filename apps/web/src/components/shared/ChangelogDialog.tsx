import { useRef } from 'react';
import { X, Scroll } from 'lucide-react';
import { useUiStore } from '@/stores/ui.store';
import { CHANGELOG } from '@/constants/changelog';
import { APP_VERSION } from '@/constants/appVersion';

export function ChangelogDialog() {
  const { changelogOpen, closeChangelog } = useUiStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  if (!changelogOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) closeChangelog();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Scroll className="h-4 w-4 text-[var(--color-accent)]" />
            <h2 className="text-base font-bold text-[var(--color-text)]">
              Changelog
            </h2>
            <span className="text-xs text-[var(--color-text-muted)] font-mono ml-1">
              v{APP_VERSION}
            </span>
          </div>
          <button
            onClick={closeChangelog}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-bold font-mono">
                  v{entry.version}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{entry.date}</span>
              </div>
              <ul className="space-y-1.5">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <span className="text-[var(--color-accent)] mt-0.5 shrink-0">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
