import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../supabase';

/**
 * Create a Supabase client for use in the browser
 * This client includes authentication state management
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton browser client instance
 * Use this for most client-side operations
 */
export const supabase = createClient();

/**
 * Session management utilities for cross-device authentication
 */
const SESSION_STORAGE_KEY = 'showgeki2-session';

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

/**
 * Save session tokens to localStorage for persistence
 */
export async function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Get stored session from localStorage
 */
export function getStoredSession(): StoredSession | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to get stored session:', error);
  }
  return null;
}

/**
 * Clear stored session from localStorage
 */
export function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * Restore session from localStorage using setSession()
 * This enables cross-device and mobile session persistence
 */
export async function restoreSession() {
  const stored = getStoredSession();
  if (!stored) {
    return { error: new Error('No stored session found') };
  }

  const { access_token, refresh_token } = stored;
  
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      // If session restoration fails, clear the invalid session
      clearStoredSession();
      return { error };
    }

    // Update stored session with new tokens if refreshed
    if (data.session) {
      await saveSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      });
    }

    return { data, error: null };
  } catch (error) {
    clearStoredSession();
    return { error: error as Error };
  }
}

/**
 * Sign out and clear all session data
 */
export async function signOut() {
  clearStoredSession();
  const { error } = await supabase.auth.signOut();
  return { error };
}