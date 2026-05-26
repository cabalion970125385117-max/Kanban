import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RegisterPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/boards" replace />;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏰</div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)]">Join QuestBoard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Create your hero and begin your quest
          </p>
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
