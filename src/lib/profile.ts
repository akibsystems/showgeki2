import { createAdminClient } from '@/lib/supabase';
import { z } from 'zod';

// ================================================================
// Profile Schema
// ================================================================

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ================================================================
// Profile Management Functions
// ================================================================

/**
 * Get user profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('[getProfile] Error fetching profile:', error);
    return null;
  }
  
  return data;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>
): Promise<Profile | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) {
    console.error('[updateProfile] Error updating profile:', error);
    return null;
  }
  
  return data;
}

/**
 * Ensure user has a profile and default workspace
 * This is a fallback in case the database trigger fails
 */
export async function ensureUserSetup(userId: string, email?: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  try {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (!profile) {
      // Create profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          display_name: email ? email.split('@')[0] : 'ユーザー',
        });
        
      if (profileError) {
        console.error('[ensureUserSetup] Error creating profile:', profileError);
        return false;
      }
    }
    
    // Check if user has at least one workspace
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('uid', userId)
      .limit(1);
      
    if (!workspaces || workspaces.length === 0) {
      // Create default workspace if none exists
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          uid: userId,
          name: 'マイワークスペース',
        });
        
      if (workspaceError) {
        console.error('[ensureUserSetup] Error creating workspace:', workspaceError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[ensureUserSetup] Unexpected error:', error);
    return false;
  }
}