import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { loginSchema, type LoginInput } from '@questboard/shared';
import { login } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginModeToggle, type LoginMode } from './LoginModeToggle';

export function LoginForm() {
  const navigate = useNavigate();
  const { setAuth, clearAuth } = useAuthStore();
  const [loginMode, setLoginMode] = useState<LoginMode>('regular');
  const [revealPassword, setRevealPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const { accessToken, user } = await login(data);
      setAuth(accessToken, user);

      if (loginMode === 'maintenance') {
        if (user.role !== 'admin' && user.role !== 'maintenance') {
          clearAuth();
          toast.error('This account does not have maintenance access');
          return;
        }
        toast.success(`Welcome, ${user.name}. Entering maintenance mode.`);
        // Delay by one tick so Zustand state commits before AdminRoute renders
        setTimeout(() => navigate('/maintenance'), 0);
      } else {
        toast.success(`Welcome back, ${user.name}!`);
        navigate('/boards');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="identifier">Username or Email</Label>
        <Input
          id="identifier"
          placeholder="cabal or cabal@questboard.app"
          autoComplete="username"
          error={errors.identifier?.message}
          {...register('identifier')}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={revealPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            className="pr-9"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setRevealPassword(true); }}
            onMouseUp={() => setRevealPassword(false)}
            onMouseLeave={() => setRevealPassword(false)}
            onTouchStart={(e) => { e.preventDefault(); setRevealPassword(true); }}
            onTouchEnd={() => setRevealPassword(false)}
            className="absolute right-2.5 top-2.5 text-[var(--color-text-muted)]/50 hover:text-[var(--color-text-muted)] select-none"
            aria-label="Hold to reveal password"
            tabIndex={-1}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="rememberMe"
          type="checkbox"
          className="rounded border-[var(--color-border)] accent-[var(--color-accent)]"
          {...register('rememberMe')}
        />
        <Label htmlFor="rememberMe" className="font-normal text-[var(--color-text-muted)]">
          Remember me for 30 days
        </Label>
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Sign In
      </Button>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        No account?{' '}
        <Link to="/register" className="text-[var(--color-accent)] hover:underline font-medium">
          Create one
        </Link>
      </p>

      <LoginModeToggle value={loginMode} onChange={setLoginMode} />
    </form>
  );
}
