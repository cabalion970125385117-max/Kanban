/**
 * AppLogo — corporate logo components.
 *
 * AppLogoIcon  — the icon mark alone (3 kanban columns). Uses currentColor.
 * AppLogo      — icon + "QuestBoard" wordmark, two layout variants:
 *   variant="auth"  large stacked version for sign-in / register pages
 *   variant="nav"   compact horizontal version for the top nav bar
 */
import { cn } from '@/lib/utils';

interface AppLogoIconProps {
  size?: number;
  className?: string;
}

/** Icon mark: three kanban columns of differing heights on a baseline. */
export function AppLogoIcon({ size = 32, className }: AppLogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Left column — medium */}
      <rect x="3"  y="13" width="7" height="15" rx="2" fill="currentColor" />
      {/* Centre column — tallest */}
      <rect x="13" y="6"  width="7" height="22" rx="2" fill="currentColor" />
      {/* Right column — shortest */}
      <rect x="23" y="18" width="7" height="10" rx="2" fill="currentColor" />
      {/* Baseline */}
      <rect x="2"  y="30" width="28" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

interface AppLogoProps {
  /**
   * auth — stacked icon + wordmark for login / register / forgot-password pages
   * nav  — horizontal icon + wordmark for the primary nav bar
   */
  variant?: 'auth' | 'nav';
  className?: string;
}

export function AppLogo({ variant = 'nav', className }: AppLogoProps) {
  if (variant === 'auth') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        {/* Icon tile */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg">
          <AppLogoIcon size={30} className="text-white" />
        </div>

        {/* Wordmark + tagline */}
        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--color-primary)] tracking-tight leading-none">
            QuestBoard
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Project management for modern teams
          </p>
        </div>
      </div>
    );
  }

  /* nav variant */
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <AppLogoIcon size={18} className="text-white" />
      </div>
      <span className="font-bold text-lg tracking-wide text-white leading-none select-none">
        QuestBoard
      </span>
    </div>
  );
}
