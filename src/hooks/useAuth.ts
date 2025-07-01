import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, restoreSession, saveSession, clearStoredSession } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setUser(session.user);
          // Save session for cross-device access
          await saveSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          });
        } else {
          // Try to restore session from localStorage
          const { data, error } = await restoreSession();
          if (data?.session) {
            setUser(data.session.user);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session) {
          // Save session on auth state change
          await saveSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          });
        } else {
          clearStoredSession();
        }

        // Handle redirects after authentication
        if (event === 'SIGNED_IN') {
          const searchParams = new URLSearchParams(window.location.search);
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          router.push(redirectTo);
        }

        // Refresh the page to update server components
        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const signInWithEmail = async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);
      clearStoredSession();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const restoreSessionHandler = async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await restoreSession();
      if (error) throw error;
      if (data?.session) {
        setUser(data.session.user);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    restoreSession: restoreSessionHandler,
  };
}