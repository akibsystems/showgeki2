'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, restoreSession, saveSession, clearStoredSession } from '@/lib/supabase/client';

interface SessionContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
});

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: React.ReactNode;
  initialSession?: Session | null;
}

export function SessionProvider({ children, initialSession = null }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // First check if we have a current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Save session for cross-device access
          await saveSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
            expires_at: currentSession.expires_at,
          });
        } else if (!initialSession) {
          // No current session, try to restore from localStorage
          const { data, error } = await restoreSession();
          if (data?.session && !error) {
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state change:', event);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession) {
          // Save session on any auth change
          await saveSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
            expires_at: newSession.expires_at,
          });
        } else {
          // Clear stored session on sign out
          clearStoredSession();
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && newSession) {
          console.log('Token refreshed, updating stored session');
          await saveSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
            expires_at: newSession.expires_at,
          });
        }

        // Force router refresh to update server components
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          window.location.reload();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialSession]);

  // Set up automatic token refresh
  useEffect(() => {
    if (!session) return;

    const checkAndRefreshToken = async () => {
      const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        setError(error);
        return;
      }

      if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        await saveSession({
          access_token: refreshedSession.access_token,
          refresh_token: refreshedSession.refresh_token,
          expires_at: refreshedSession.expires_at,
        });
      }
    };

    // Check token every 5 minutes
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  return (
    <SessionContext.Provider value={{ user, session, loading, error }}>
      {children}
    </SessionContext.Provider>
  );
}