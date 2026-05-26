import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { resetPasswordRequestSchema, type ResetPasswordRequestInput } from '@questboard/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
  });

  const onSubmit = async (data: ResetPasswordRequestInput) => {
    // Simulate network delay; real impl calls POST /auth/reset-password/request
    await new Promise((r) => setTimeout(r, 800));
    setSentEmail(data.email);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">QuestBoard</h1>
        </div>

        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg p-8">
          {sent ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-[var(--color-success)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Check your inbox</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                We sent a password reset link to{' '}
                <span className="font-medium text-[var(--color-text)]">{sentEmail}</span>.
                Check your spam folder if it doesn&apos;t arrive within a few minutes.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline font-medium"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Forgot password?</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="hero@questboard.app"
                      autoComplete="email"
                      className="pl-9"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Send reset link
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline font-medium"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
