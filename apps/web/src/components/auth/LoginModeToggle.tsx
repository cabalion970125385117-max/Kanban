import { Wrench } from 'lucide-react';

export type LoginMode = 'regular' | 'maintenance';

interface LoginModeToggleProps {
  value: LoginMode;
  onChange: (mode: LoginMode) => void;
}

export function LoginModeToggle({ value, onChange }: LoginModeToggleProps) {
  const isMaintenance = value === 'maintenance';

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={() => onChange(isMaintenance ? 'regular' : 'maintenance')}
        className={`flex items-center gap-1 text-[10px] transition-colors ${
          isMaintenance
            ? 'text-[var(--color-warning)] hover:text-[var(--color-warning)]/80'
            : 'text-[var(--color-text-muted)]/40 hover:text-[var(--color-text-muted)]/70'
        }`}
      >
        <Wrench className="h-2.5 w-2.5" />
        {isMaintenance ? 'Maintenance mode — click to cancel' : 'Maintenance access'}
      </button>
    </div>
  );
}
