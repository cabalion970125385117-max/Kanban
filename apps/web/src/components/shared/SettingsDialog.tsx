import { useState, useEffect, useRef } from 'react';
import { X, User, Shield, Palette, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings.store';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore, type Theme } from '@/stores/theme.store';
import { AvatarPicker } from '@/components/auth/AvatarPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { HeroArchetype } from '@questboard/shared';

type Tab = 'avatar' | 'profile' | 'security' | 'appearance';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'avatar',      label: 'Avatar',      icon: <span className="text-base">🧙</span> },
  { id: 'profile',     label: 'Profile',     icon: <User className="h-4 w-4" /> },
  { id: 'security',    label: 'Security',    icon: <Shield className="h-4 w-4" /> },
  { id: 'appearance',  label: 'Appearance',  icon: <Palette className="h-4 w-4" /> },
];

const nameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});
type NameInput = z.infer<typeof nameSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type PasswordInput = z.infer<typeof passwordSchema>;

const THEME_OPTIONS: Array<{ value: Theme; label: string; desc: string; emoji: string }> = [
  { value: 'light',  label: 'Light',  desc: 'Classic parchment', emoji: '☀️' },
  { value: 'dark',   label: 'Dark',   desc: 'Night dungeon',     emoji: '🌙' },
  { value: 'system', label: 'System', desc: 'Match OS setting',  emoji: '⚙️' },
];

export function SettingsDialog() {
  const { open, closeSettings } = useSettingsStore();
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [tab, setTab] = useState<Tab>('avatar');
  const [selectedArchetype, setSelectedArchetype] = useState<HeroArchetype | undefined>(
    user?.avatar?.archetype as HeroArchetype | undefined,
  );
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset to avatar tab and sync values when dialog opens
  useEffect(() => {
    if (open) {
      setTab('avatar');
      setSelectedArchetype(user?.avatar?.archetype as HeroArchetype | undefined);
    }
  }, [open, user]);

  const nameForm = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    values: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) closeSettings();
  };

  const saveAvatar = () => {
    if (!selectedArchetype || !user) return;
    updateUser({
      ...user,
      avatar: {
        ...user.avatar,
        id: user.avatar?.id ?? '',
        archetype: selectedArchetype,
        variant: user.avatar?.variant ?? 1,
        sprite_url: user.avatar?.sprite_url ?? '',
        thumb_url: user.avatar?.thumb_url ?? '',
      },
    });
    toast.success('Avatar updated');
  };

  const saveName = (data: NameInput) => {
    if (!user) return;
    updateUser({ ...user, name: data.name });
    toast.success('Display name updated');
  };

  const savePassword = async (data: PasswordInput) => {
    // In real app: call PUT /users/:id with { currentPassword, newPassword }
    await new Promise((r) => setTimeout(r, 600));
    console.log('Password change requested', data.currentPassword, data.newPassword);
    toast.success('Password updated');
    passwordForm.reset();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-text)]">Settings</h2>
          <button
            onClick={closeSettings}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--color-border)] px-2 bg-[var(--color-bg)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Avatar ── */}
          {tab === 'avatar' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Choose your hero archetype. Your colour variant keeps your team unique.
              </p>
              <AvatarPicker value={selectedArchetype} onChange={setSelectedArchetype} />
              <Button
                onClick={saveAvatar}
                disabled={!selectedArchetype || selectedArchetype === user?.avatar?.archetype}
              >
                Save avatar
              </Button>
            </div>
          )}

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <form
              onSubmit={nameForm.handleSubmit(saveName)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  placeholder="Your hero name"
                  error={nameForm.formState.errors.name?.message}
                  {...nameForm.register('name')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-bg)] rounded px-3 py-2 border border-[var(--color-border)]">
                  {user?.email}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Email changes require contacting support.
                </p>
              </div>
              <Button type="submit" loading={nameForm.formState.isSubmitting}>
                Save name
              </Button>
            </form>
          )}

          {/* ── Security ── */}
          {tab === 'security' && (
            <form
              onSubmit={passwordForm.handleSubmit(savePassword)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={passwordForm.formState.errors.currentPassword?.message}
                  {...passwordForm.register('currentPassword')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  error={passwordForm.formState.errors.newPassword?.message}
                  {...passwordForm.register('newPassword')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={passwordForm.formState.errors.confirmPassword?.message}
                  {...passwordForm.register('confirmPassword')}
                />
              </div>
              <Button type="submit" loading={passwordForm.formState.isSubmitting}>
                Update password
              </Button>
            </form>
          )}

          {/* ── Appearance ── */}
          {tab === 'appearance' && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Choose how QuestBoard looks to you.
              </p>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                    theme === opt.value
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{opt.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{opt.desc}</p>
                    </div>
                  </div>
                  {theme === opt.value && (
                    <ChevronRight className="h-4 w-4 text-[var(--color-accent)]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
