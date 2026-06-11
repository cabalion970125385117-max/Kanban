import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect, useRef } from 'react';

export function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const toastedRef = useRef(false);

  const isAdmin = isAuthenticated && user?.role === 'admin';

  useEffect(() => {
    if (isAuthenticated && !isAdmin && !toastedRef.current) {
      toastedRef.current = true;
      toast.error('Admin access required');
    }
  }, [isAuthenticated, isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/boards" replace />;
  }

  return <Outlet />;
}
