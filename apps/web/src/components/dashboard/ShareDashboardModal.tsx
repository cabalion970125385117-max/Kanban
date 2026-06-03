import { useState } from 'react';
import { X, Link, Copy, Trash2, RefreshCw, CheckCheck } from 'lucide-react';
import { useShareToken, useCreateShareToken, useRevokeShareToken } from '@/hooks/useDashboard';
import { Button } from '@/components/ui/button';

interface ShareDashboardModalProps {
  boardId: string;
  boardName: string;
  onClose: () => void;
}

export function ShareDashboardModal({ boardId, boardName, onClose }: ShareDashboardModalProps) {
  const [copied, setCopied] = useState(false);
  const { data: token, isLoading } = useShareToken(boardId);
  const createToken = useCreateShareToken(boardId);
  const revokeToken = useRevokeShareToken(boardId);

  const shareUrl = token
    ? `${window.location.origin}/share/${token}`
    : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => createToken.mutate();
  const handleRevoke = () => revokeToken.mutate();

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-[var(--color-accent)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Share Dashboard</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{boardName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="h-10 skeleton rounded-lg" />
          ) : shareUrl ? (
            <>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Share link</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] font-mono outline-none"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={handleCopy}
                    title="Copy link"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                <strong>Note:</strong> This app is local-first — the share link lets anyone view the
                dashboard on <strong>this device</strong> without logging in. It will not work on
                other devices.
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreate}
                  loading={createToken.isPending}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevoke}
                  loading={revokeToken.isPending}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-danger)] hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke link
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">
                Generate a share link to let others view this dashboard without signing in.
              </p>
              <Button
                onClick={handleCreate}
                loading={createToken.isPending}
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                Generate share link
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
