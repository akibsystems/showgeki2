import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAdminAuth, AdminContext } from '@/lib/admin-auth';
import { ErrorType } from '@/types';
import { z } from 'zod';

// ================================================================
// Schemas
// ================================================================

const GetVideosQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  status: z.enum(['queued', 'processing', 'completed', 'error']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  uid: z.string().optional(),
  search: z.string().optional(),
});

const DeleteVideosRequestSchema = z.object({
  videoIds: z.array(z.string().uuid()).min(1),
});

// ================================================================
// Types
// ================================================================

interface VideoWithRelations {
  id: string;
  story_id: string;
  uid: string;
  status: string;
  title?: string;
  url?: string;
  duration_sec?: number;
  resolution?: string;
  size_mb?: number;
  error_msg?: string;
  created_at: string;
  updated_at?: string;
  story?: {
    id: string;
    title: string;
    uid: string;
    created_at: string;
  };
  profile?: {
    email?: string;
    display_name?: string;
  };
}

// ================================================================
// GET /api/admin/videos
// Get paginated list of videos with filters
// ================================================================

async function getVideos(
  request: NextRequest,
  _context: AdminContext
): Promise<NextResponse> {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    
    // Validate query parameters
    const parseResult = GetVideosQuerySchema.safeParse(searchParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          type: ErrorType.VALIDATION,
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    const { page, limit, status, from, to, uid, search } = parseResult.data;
    const supabase = createAdminClient();
    
    // Build query - Since there's no foreign key, we'll do a manual join
    let query = supabase
      .from('videos')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (from) {
      query = query.gte('created_at', from);
    }
    
    if (to) {
      query = query.lte('created_at', to);
    }
    
    if (uid) {
      query = query.eq('uid', uid);
    }
    
    if (search) {
      // Search in video title or uid
      query = query.or(`title.ilike.%${search}%,uid.ilike.%${search}%`);
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    query = query
      .range(startIndex, startIndex + limit - 1)
      .order('created_at', { ascending: false });
    
    const { data: videos, error, count } = await query;
    
    if (error) {
      console.error('[getVideos] Database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch videos',
          type: ErrorType.INTERNAL,
        },
        { status: 500 }
      );
    }
    
    // Get storyboards for the videos
    const storyIds = [...new Set((videos || []).map(v => v.story_id).filter(Boolean))];
    
    let storyboards: any[] = [];
    if (storyIds.length > 0) {
      const { data: storyboardData } = await supabase
        .from('storyboards')
        .select('id, title, uid, created_at')
        .in('id', storyIds);
      
      storyboards = storyboardData || [];
    }
    
    // Create storyboard map
    const storyboardMap = new Map(storyboards.map(sb => [sb.id, sb]));
    
    // Get profiles for the videos
    const uids = [...new Set([
      ...(videos || []).map(v => v.uid),
      ...storyboards.map(sb => sb.uid)
    ].filter(Boolean))];
    
    let profiles: any[] = [];
    if (uids.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', uids);
      
      profiles = profileData || [];
    }
    
    // Map profiles to videos
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    
    const videosWithProfiles = (videos || []).map(video => {
      const storyboard = storyboardMap.get(video.story_id);
      return {
        ...video,
        story: storyboard, // Map storyboard to story for backward compatibility
        profile: storyboard?.uid ? profileMap.get(storyboard.uid) : profileMap.get(video.uid),
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        videos: videosWithProfiles,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[getVideos] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch videos',
        type: ErrorType.INTERNAL,
      },
      { status: 500 }
    );
  }
}

// ================================================================
// DELETE /api/admin/videos
// Bulk delete videos
// ================================================================

async function deleteVideos(
  request: NextRequest,
  _context: AdminContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate request
    const parseResult = DeleteVideosRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          type: ErrorType.VALIDATION,
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    const { videoIds } = parseResult.data;
    const supabase = createAdminClient();
    
    // Get video details before deletion
    const { data: videos, error: fetchError } = await supabase
      .from('videos')
      .select('id, url')
      .in('id', videoIds);
    
    if (fetchError) {
      console.error('[deleteVideos] Failed to fetch videos:', fetchError);
      return NextResponse.json(
        {
          error: 'Failed to fetch videos for deletion',
          type: ErrorType.INTERNAL,
        },
        { status: 500 }
      );
    }
    
    // Delete from storage
    const storageErrors: string[] = [];
    for (const video of videos || []) {
      if (video.url) {
        try {
          // Extract storage path from URL
          const url = new URL(video.url);
          const pathParts = url.pathname.split('/');
          const bucket = pathParts[pathParts.length - 2]; // Usually 'videos'
          const fileName = pathParts[pathParts.length - 1];
          
          if (bucket === 'videos' && fileName) {
            const { error: storageError } = await supabase.storage
              .from('videos')
              .remove([fileName]);
            
            if (storageError) {
              console.error(`[deleteVideos] Storage error for ${fileName}:`, storageError);
              storageErrors.push(`Failed to delete ${fileName}: ${storageError.message}`);
            }
          }
        } catch (error) {
          console.error(`[deleteVideos] Error processing video URL ${video.url}:`, error);
          storageErrors.push(`Failed to process ${video.id}`);
        }
      }
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .in('id', videoIds);
    
    if (deleteError) {
      console.error('[deleteVideos] Database deletion error:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete videos from database',
          type: ErrorType.INTERNAL,
          details: {
            storageErrors,
            databaseError: deleteError.message,
          },
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        deletedCount: videoIds.length,
        storageErrors: storageErrors.length > 0 ? storageErrors : undefined,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[deleteVideos] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete videos',
        type: ErrorType.INTERNAL,
      },
      { status: 500 }
    );
  }
}

// ================================================================
// Export handlers
// ================================================================

export const GET = withAdminAuth(getVideos);
export const DELETE = withAdminAuth(deleteVideos);