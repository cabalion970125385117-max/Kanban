import { useState, useEffect, useRef } from 'react';
import { X, User, Shield, Palette, ChevronRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settings.store';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore, type Theme } from '@/stores/theme.store';
import { useQuestStore } from '@/stores/quest.store';
import { useAiStore, type AiProvider, type OpenAiModel } from '@/stores/ai.store';
import { AvatarPicker } from '@/components/auth/AvatarPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { HeroArchetype } from '@questboard/shared';

type Tab = 'avatar' | 'profile' | 'security' | 'appearance' | 'ai';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'avatar',      label: 'Avatar',      icon: <span className="text-base">🧙</span> },
  { id: 'profile',     label: 'Profile',     icon: <User className="h-4 w-4" /> },
  { id: 'security',    label: 'Security',    icon: <Shield className="h-4 w-4" /> },
  { id: 'appearance',  label: 'Appearance',  icon: <Palette className="h-4 w-4" /> },
  { id: 'ai',          label: 'AI',          icon: <Sparkles className="h-4 w-4" /> },
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

const AI_PROVIDERS: Array<{ value: AiProvider; label: string; desc: string }> = [
  { value: 'none',   label: 'None',   desc: 'Heuristic mode — no API key required' },
  { value: 'openai', label: 'OpenAI', desc: 'Uses your OpenAI API key for smarter results' },
];

const OPENAI_MODELS: Array<{ value: OpenAiModel; label: string; desc: string }> = [
  { value: 'gpt-4o-mini',    label: 'GPT-4o mini',    desc: 'Fast & cheap — best for most tasks' },
  { value: 'gpt-4o',         label: 'GPT-4o',         desc: 'Most capable — higher cost' },
  { value: 'gpt-3.5-turbo',  label: 'GPT-3.5 Turbo',  desc: 'Budget option' },
];

export function SettingsDialog() {
  const { open, closeSettings } = useSettingsStore();
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { enabled: questEnabled, setEnabled: setQuestEnabled } = useQuestStore();
  const { provider, openaiKey, openaiModel, setProvider, setOpenaiKey, setOpenaiModel } = useAiStore();
  const [tab, setTab] = useState<Tab>('avatar');
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<HeroArchetype | undefined>(
    user?.avatar?.archetype as HeroArchetype | undefined,
  );
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset to avatar tab and sync values when dialog opens
  useEffect(() => {
    if (open) {
      setTab('avatar');
      setSelectedArchetype(user?.avatar?.archetype as HeroArchetype | undefined);
      setLocalKey(openaiKey);
      setShowKey(false);
    }
  }, [open, user, openaiKey]);

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
                Choose your team role. Your colour variant keeps your identity unique.
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

              {/* ── Word Cloud Banner toggle ── */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                  Word Cloud Banner
                </p>
                <button
                  type="button"
                  onClick={() => setQuestEnabled(!questEnabled)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                    questEnabled
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">☁️</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">Word Cloud Banner</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {questEnabled
                          ? 'On — keyword cloud shown above every board'
                          : 'Off — banner is hidden'}
                      </p>
                    </div>
                  </div>
                  {/* Toggle pill */}
                  <div
                    className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      questEnabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${
                        questEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 px-1">
                  Aggregates keywords from card titles and tags across all your boards.
                  Refreshed once per day — larger words appear more frequently in your cards.
                </p>
              </div>
            </div>
          )}
          {/* ── AI ── */}
          {tab === 'ai' && (
            <div className="space-y-5">
              <p className="text-sm text-[var(--color-text-muted)]">
                Configure AI features for card breakdowns and effort estimates. Your API key is
                stored locally in this browser only — never sent to any server except OpenAI.
              </p>

              {/* Provider */}
              <div className="space-y-2">
                <Label>Provider</Label>
                {AI_PROVIDERS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProvider(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      provider === opt.value
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{opt.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{opt.desc}</p>
                    </div>
                    {provider === opt.value && (
                      <ChevronRight className="h-4 w-4 text-[var(--color-accent)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* OpenAI config — only shown when openai selected */}
              {provider === 'openai' && (
                <>
                  {/* API Key */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-api-key">OpenAI API Key</Label>
                    <div className="relative flex items-center">
                      <input
                        id="ai-api-key"
                        type={showKey ? 'text' : 'password'}
                        value={localKey}
                        onChange={(e) => setLocalKey(e.target.value)}
                        placeholder="sk-…"
                        className="w-full pr-10 text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                        aria-label={showKey ? 'Hide key' : 'Show key'}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Get your key at{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-accent)] hover:underline"
                      >
                        platform.openai.com/api-keys
                      </a>
                    </p>
                  </div>

                  {/* Model */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-model">Model</Label>
                    <select
                      id="ai-model"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value as OpenAiModel)}
                      className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                    >
                      {OPENAI_MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label} — {m.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={() => {
                      setOpenaiKey(localKey.trim());
                      toast.success('AI settings saved');
                    }}
                  >
                    Save API key
                  </Button>
                </>
              )}

              {provider === 'none' && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    <span className="font-semibold text-[var(--color-text)]">Heuristic mode active.</span>{' '}
                    Card breakdown uses keyword templates, effort estimates use your board's historical
                    time logs. No external API calls are made.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
