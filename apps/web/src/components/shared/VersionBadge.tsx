import { APP_VERSION } from '@/constants/appVersion';

interface VersionBadgeProps {
  className?: string;
}

export function VersionBadge({ className = '' }: VersionBadgeProps) {
  return (
    <span className={`text-xs text-[var(--color-text-muted)] font-mono ${className}`}>
      v{APP_VERSION}
    </span>
  );
}
