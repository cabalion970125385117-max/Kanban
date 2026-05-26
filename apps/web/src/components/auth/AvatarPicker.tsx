import { cn } from '@/lib/utils';
import type { HeroArchetype } from '@questboard/shared';

const ARCHETYPES: Array<{ id: HeroArchetype; label: string; emoji: string }> = [
  { id: 'knight',    label: 'Knight',    emoji: '⚔️' },
  { id: 'mage',      label: 'Mage',      emoji: '🧙' },
  { id: 'archer',    label: 'Archer',    emoji: '🏹' },
  { id: 'paladin',   label: 'Paladin',   emoji: '🛡️' },
  { id: 'rogue',     label: 'Rogue',     emoji: '🗡️' },
  { id: 'sorcerer',  label: 'Sorcerer',  emoji: '🔮' },
  { id: 'berserker', label: 'Berserker', emoji: '🪓' },
  { id: 'herald',    label: 'Herald',    emoji: '📯' },
];

const AVATAR_BG: Record<HeroArchetype, string> = {
  knight:    'bg-[#5B4FCF]',
  mage:      'bg-[#9B59B6]',
  archer:    'bg-[#2EA64A]',
  paladin:   'bg-[#F4D03F]',
  rogue:     'bg-[#1A1A2E]',
  sorcerer:  'bg-[#D94040]',
  berserker: 'bg-[#E07B2A]',
  herald:    'bg-[#17A589]',
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
