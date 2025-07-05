import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ================================================================
// Environment Variables
// ================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// ================================================================
// Database Types (Generated from Supabase)
// ================================================================

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          uid: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          uid: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          uid?: string;
          name?: string;
          created_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          workspace_id: string;
          uid: string;
          title: string;
          text_raw: string;
          script_json?: any;
          status: 'draft' | 'script_generated' | 'processing' | 'completed' | 'error';
          beats: number;
          // ScriptDirector V2 fields
          story_elements?: any;
          workflow_state?: any;
          custom_assets?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          uid: string;
          title: string;
          text_raw: string;
          script_json?: any;
          status?: 'draft' | 'script_generated' | 'processing' | 'completed' | 'error';
          beats?: number;
          // ScriptDirector V2 fields
          story_elements?: any;
          workflow_state?: any;
          custom_assets?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          uid?: string;
          title?: string;
          text_raw?: string;
          script_json?: any;
          status?: 'draft' | 'script_generated' | 'processing' | 'completed' | 'error';
          beats?: number;
          // ScriptDirector V2 fields
          story_elements?: any;
          workflow_state?: any;
          custom_assets?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          story_id: string;
          uid: string;
          url?: string;
          duration_sec?: number;
          resolution?: string;
          size_mb?: number;
          status: 'queued' | 'processing' | 'completed' | 'failed';
          error_msg?: string;
          created_at: string;
          preview_status?: string;
          preview_data?: any;
          preview_storage_path?: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          uid: string;
          url?: string;
          duration_sec?: number;
          resolution?: string;
          size_mb?: number;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          error_msg?: string;
          created_at?: string;
          preview_status?: string;
          preview_data?: any;
          preview_storage_path?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          uid?: string;
          url?: string;
          duration_sec?: number;
          resolution?: string;
          size_mb?: number;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          error_msg?: string;
          created_at?: string;
          preview_status?: string;
          preview_data?: any;
          preview_storage_path?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          story_id: string;
          review_text: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          review_text: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          review_text?: string;
          rating?: number;
          created_at?: string;
        };
      };
    };
  };
}

// ================================================================
// Supabase Clients
// ================================================================

// Public client (for frontend use)
export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl!,
  supabaseAnonKey!
);

// Admin client (for API routes only - requires service role key)
export function createAdminClient(): SupabaseClient<Database> {
  if (!supabaseServiceRoleKey) {
    throw new Error('Service role key is required for admin operations');
  }
  
  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Check if we're in a server environment (API routes)
 */
export function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get appropriate Supabase client based on environment
 * - Server: Admin client (if service role key is available)
 * - Client: Public client
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (isServerEnvironment() && supabaseServiceRoleKey) {
    return createAdminClient();
  }
  return supabase;
}

/**
 * Create a client with specific auth context (for API routes)
 */
export function createAuthenticatedClient(uid?: string): SupabaseClient<Database> {
  const client = getSupabaseClient();
  
  // For server-side operations, we rely on RLS with UID filtering
  // The UID should be passed as a parameter to queries
  
  return client;
}

// ================================================================
// Type Exports (for convenience)
// ================================================================

export type SupabaseWorkspace = Database['public']['Tables']['workspaces']['Row'];
export type SupabaseStory = Database['public']['Tables']['stories']['Row'];
export type SupabaseVideo = Database['public']['Tables']['videos']['Row'];
export type SupabaseReview = Database['public']['Tables']['reviews']['Row'];

export type SupabaseWorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];
export type SupabaseStoryInsert = Database['public']['Tables']['stories']['Insert'];
export type SupabaseVideoInsert = Database['public']['Tables']['videos']['Insert'];
export type SupabaseReviewInsert = Database['public']['Tables']['reviews']['Insert'];

export type SupabaseWorkspaceUpdate = Database['public']['Tables']['workspaces']['Update'];
export type SupabaseStoryUpdate = Database['public']['Tables']['stories']['Update'];
export type SupabaseVideoUpdate = Database['public']['Tables']['videos']['Update'];
export type SupabaseReviewUpdate = Database['public']['Tables']['reviews']['Update'];

// ================================================================
// Error Handling
// ================================================================

export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Handle Supabase errors consistently
 */
export function handleSupabaseError(error: any): never {
  const message = error?.message || 'An unknown database error occurred';
  const code = error?.code;
  const details = error?.details;
  
  throw new SupabaseError(message, code, details);
}

// ================================================================
// Storage Helper Functions
// ================================================================

/**
 * Upload video file to Supabase Storage
 */
export async function uploadVideoToStorage(
  videoBuffer: Buffer,
  fileName: string,
  contentType: string = 'video/mp4'
): Promise<{ url: string; path: string }> {
  const adminClient = createAdminClient();
  
  const filePath = `videos/${fileName}`;
  
  const { data, error } = await adminClient.storage
    .from('videos')
    .upload(filePath, videoBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new SupabaseError(`Failed to upload video: ${error.message}`, error.name);
  }

  // Get public URL
  const { data: urlData } = adminClient.storage
    .from('videos')
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
}

/**
 * Delete video file from Supabase Storage
 */
export async function deleteVideoFromStorage(filePath: string): Promise<void> {
  const adminClient = createAdminClient();
  
  const { error } = await adminClient.storage
    .from('videos')
    .remove([filePath]);

  if (error) {
    throw new SupabaseError(`Failed to delete video: ${error.message}`, error.name);
  }
}

/**
 * Get video metadata from Supabase Storage
 */
export async function getVideoMetadata(filePath: string) {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient.storage
    .from('videos')
    .list(filePath.split('/').slice(0, -1).join('/'), {
      search: filePath.split('/').pop(),
    });

  if (error) {
    throw new SupabaseError(`Failed to get video metadata: ${error.message}`, error.name);
  }

  return data?.[0];
}

/**
 * Upload face reference image to Supabase Storage
 */
export async function uploadFaceReferenceToStorage(
  imageBuffer: Buffer,
  fileName: string,
  contentType: string,
  uid: string
): Promise<{ url: string; path: string }> {
  const adminClient = createAdminClient();
  
  // Create path with user ID for organization
  const filePath = `${uid}/${fileName}`;
  
  const { data, error } = await adminClient.storage
    .from('face-reference')
    .upload(filePath, imageBuffer, {
      contentType,
      upsert: true, // Allow overwriting for updates
    });

  if (error) {
    throw new SupabaseError(`Failed to upload face reference: ${error.message}`, error.name);
  }

  // Get public URL
  const { data: urlData } = adminClient.storage
    .from('face-reference')
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
}

/**
 * Delete face reference image from Supabase Storage
 */
export async function deleteFaceReferenceFromStorage(filePath: string): Promise<void> {
  const adminClient = createAdminClient();
  
  const { error } = await adminClient.storage
    .from('face-reference')
    .remove([filePath]);

  if (error) {
    throw new SupabaseError(`Failed to delete face reference: ${error.message}`, error.name);
  }
}

// ================================================================
// Configuration
// ================================================================

export const supabaseConfig = {
  url: supabaseUrl!,
  anonKey: supabaseAnonKey!,
  hasServiceRole: !!supabaseServiceRoleKey,
  storage: {
    videoBucket: 'videos',
    faceReferenceBucket: 'face-reference',
  },
} as const;