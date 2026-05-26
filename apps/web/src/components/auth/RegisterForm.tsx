import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { registerSchema, type RegisterInput, type HeroArchetype } from '@questboard/shared';
import { register as registerUser } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarPicker } from './AvatarPicker';

export function RegisterForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [selectedArchetype, setSelectedArchetype] = useState<HeroArchetype | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const handleArchetypeChange = (archetype: HeroArchetype) => {
    setSelectedArchetype(archetype);
    setValue('avatar_archetype', archetype);
  };

  const onSubmit = async (data: RegisterInput) => {
    try {
      const { accessToken, user } = await registerUser(data);
      setAuth(accessToken, user);
      toast.success(`Welcome to QuestBoard, ${user.name}!`);
      navigate('/boards');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          placeholder="Your hero name"
          autoComplete="username"
          error={errors.name?.message}
          {...register('name')}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="hero@questboard.app"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <div className="space-y-2">
        <Label>Choose Your Hero</Label>
        <p className="text-xs text-[var(--color-text-muted)]">
          Pick an archetype — your colour variant is auto-assigned to keep your team unique.
        </p>
        <AvatarPicker value={selectedArchetype} onChange={handleArchetypeChange} />
        {errors.avatar_archetype && (
          <p className="text-xs text-[var(--color-danger)]">{errors.avatar_archetype.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Begin Your Quest
      </Button>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--color-accent)] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
