import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AppLogo } from '@/components/shared/AppLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RegisterPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/boards" replace />;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <AppLogo variant="auth" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Choose your hero archetype — 8 classes, 4 colour variants, 32 unique heroes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
