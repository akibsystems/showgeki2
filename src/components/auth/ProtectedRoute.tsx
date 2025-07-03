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
    // 認証が無効化されている場合はスキップ
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true') {
      return;
    }

    if (!loading) {
      if (requireAuth && !user) {
        // Save current path for redirect after login
        const redirectUrl = new URL(redirectTo, window.location.origin);
        redirectUrl.searchParams.set('redirect', pathname);
        router.push(redirectUrl.toString());
      }
    }
  }, [user, loading, requireAuth, router, pathname, redirectTo]);

  // 認証が無効化されている場合は常に表示
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true') {
    return <>{children}</>;
  }

  if (loading) {
    return <AuthLoading />;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}