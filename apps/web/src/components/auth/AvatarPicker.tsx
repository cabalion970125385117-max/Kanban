import { cn } from '@/lib/utils';
import type { HeroArchetype } from '@questboard/shared';

const ARCHETYPES: Array<{ id: HeroArchetype; label: string; emoji: string }> = [
  { id: 'quality',    label: 'Quality',    emoji: '🔬' },
  { id: 'process',    label: 'Process',    emoji: '⚙️' },
  { id: 'project',    label: 'Project',    emoji: '📋' },
  { id: 'production', label: 'Production', emoji: '🏭' },
  { id: 'maintenance',label: 'Maintenance',emoji: '🛠️' },
  { id: 'finance',    label: 'Finance',    emoji: '💰' },
  { id: 'management', label: 'Management', emoji: '👔' },
  { id: 'aiit',       label: 'AI & IT',    emoji: '🤖' },
];

const AVATAR_BG: Record<HeroArchetype, string> = {
  quality:    'bg-[#0891B2]',
  process:    'bg-[#4F46E5]',
  project:    'bg-[#059669]',
  production: 'bg-[#EA580C]',
  maintenance:'bg-[#475569]',
  finance:    'bg-[#16A34A]',
  management: 'bg-[#7C3AED]',
  aiit:       'bg-[#2563EB]',
};

interface AvatarPickerProps {
  value: HeroArchetype | undefined;
  onChange: (archetype: HeroArchetype) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {ARCHETYPES.map(({ id, label, emoji }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
            'hover:border-[var(--color-accent)] hover:shadow-md',
            value === id
              ? 'border-[var(--color-accent)] shadow-md ring-2 ring-[var(--color-accent)] ring-offset-1'
              : 'border-[var(--color-border)]',
          )}
          aria-label={`Select ${label} avatar`}
          aria-pressed={value === id}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center text-2xl',
              AVATAR_BG[id],
            )}
          >
            {emoji}
          </div>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
        </button>
      ))}
    </div>
  );
}
