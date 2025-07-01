'use client';

import { useEffect } from 'react';
import { useSession } from './SessionProvider';
import { useRouter, usePathname } from 'next/navigation';
import { AuthLoading } from './AuthLoading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // Save current path for redirect after login
        const redirectUrl = new URL(redirectTo, window.location.origin);
        redirectUrl.searchParams.set('redirect', pathname);
        router.push(redirectUrl.toString());
      }
    }
  }, [user, loading, requireAuth, router, pathname, redirectTo]);

  if (loading) {
    return <AuthLoading />;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}