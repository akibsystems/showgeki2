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
  mode: z.enum(['instant', 'professional']).optional(),
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
    
    const { page, limit, status, from, to, uid, search, mode } = parseResult.data;
    const supabase = createAdminClient();
    
    console.log(`\n========================================`);
    console.log(`[getVideos] SEARCH REQUEST RECEIVED`);
    console.log(`[getVideos] Query params:`, { page, limit, status, from, to, uid, search, mode });
    console.log(`========================================\n`);
    
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
    
    // If searching, we need to get all videos first to search in story_data
    let finalVideos = [];
    let totalCount = 0;
    let storyboards: any[] = [];
    let workflows: any[] = [];
    
    if (search) {
      // First, find all storyboards that match the search term
      console.log(`[getVideos] Searching for: "${search}"`);
      
      // Get storyboards that match the search
      const { data: matchingStoryboards, error: storyboardError } = await supabase
        .from('storyboards')
        .select('id')
        .ilike('story_data->>originalText', `%${search}%`);
      
      if (storyboardError) {
        console.error('[getVideos] Storyboard search error:', storyboardError);
      }
      
      const matchingStoryIds = (matchingStoryboards || []).map(sb => sb.id);
      console.log(`[getVideos] Found ${matchingStoryIds.length} storyboards matching "${search}"`);
      
      // Build video query with search conditions
      let searchQuery = supabase
        .from('videos')
        .select('*', { count: 'exact' });
      
      // Apply other filters
      if (status) {
        searchQuery = searchQuery.eq('status', status);
      }
      if (from) {
        searchQuery = searchQuery.gte('created_at', from);
      }
      if (to) {
        searchQuery = searchQuery.lte('created_at', to);
      }
      if (uid) {
        searchQuery = searchQuery.eq('uid', uid);
      }
      
      // Apply search filter
      if (matchingStoryIds.length > 0) {
        // Search in video title, uid, AND/OR matching story IDs
        // Option 1: Search in all fields (current behavior - 14 results)
        searchQuery = searchQuery.or(
          `title.ilike.%${search}%,uid.ilike.%${search}%,story_id.in.(${matchingStoryIds.join(',')})`
        );
        
        // Option 2: Search ONLY in story content (9 results)
        // Uncomment the following line and comment out the above to search only in story content
        // searchQuery = searchQuery.in('story_id', matchingStoryIds);
      } else {
        // Only search in video title and uid
        searchQuery = searchQuery.or(`title.ilike.%${search}%,uid.ilike.%${search}%`);
      }
      
      // Apply pagination and ordering
      searchQuery = searchQuery
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });
      
      const { data: videos, error, count } = await searchQuery;
      
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
      
      finalVideos = videos || [];
      totalCount = count || 0;
      
      console.log(`[getVideos] Found ${finalVideos.length} videos (total: ${totalCount})`);
      
      // Get storyboards for the videos
      const storyIds = [...new Set(finalVideos.map(v => v.story_id).filter(Boolean))];
      
      if (storyIds.length > 0) {
        // Batch fetch to avoid IN query limits
        const batchSize = 100;
        storyboards = [];
        
        for (let i = 0; i < storyIds.length; i += batchSize) {
          const batch = storyIds.slice(i, i + batchSize);
          const { data: storyboardData } = await supabase
            .from('storyboards')
            .select('id, title, uid, created_at')
            .in('id', batch);
          
          if (storyboardData) {
            storyboards = storyboards.concat(storyboardData);
          }
        }
      } else {
        storyboards = [];
      }
      
      // Get workflows for filtering by mode if needed
      if (mode && storyIds.length > 0) {
        const { data: workflowData } = await supabase
          .from('workflows')
          .select('id, storyboard_id, mode')
          .in('storyboard_id', storyIds)
          .eq('mode', mode);
        
        if (workflowData) {
          workflows = workflowData;
          // Filter videos by those with matching workflows
          const validStoryIds = workflows.map(w => w.storyboard_id);
          finalVideos = finalVideos.filter(v => validStoryIds.includes(v.story_id));
          totalCount = finalVideos.length;
        } else {
          // No workflows found with this mode
          finalVideos = [];
          totalCount = 0;
        }
      } else if (!mode && storyIds.length > 0) {
        // Get all workflows for display
        const { data: workflowData } = await supabase
          .from('workflows')
          .select('id, storyboard_id, mode')
          .in('storyboard_id', storyIds);
        
        if (workflowData) {
          workflows = workflowData;
        }
      }
      
    } else {
      // No search - use normal pagination
      // First get all videos with basic filters
      let tempQuery = supabase.from('videos').select('*', { count: 'exact' });
      
      if (status) tempQuery = tempQuery.eq('status', status);
      if (from) tempQuery = tempQuery.gte('created_at', from);
      if (to) tempQuery = tempQuery.lte('created_at', to);
      if (uid) tempQuery = tempQuery.eq('uid', uid);
      
      // If mode filter is applied, we need to filter by workflow mode
      if (mode) {
        // Get all videos first to filter by workflow mode
        const { data: allVideos, error: allError } = await tempQuery;
        
        if (!allError && allVideos) {
          const storyIds = [...new Set(allVideos.map(v => v.story_id).filter(Boolean))];
          
          if (storyIds.length > 0) {
            // Get workflows with the specified mode
            const { data: workflowData } = await supabase
              .from('workflows')
              .select('id, storyboard_id, mode')
              .in('storyboard_id', storyIds)
              .eq('mode', mode);
            
            if (workflowData) {
              workflows = workflowData;
              const validStoryIds = workflows.map(w => w.storyboard_id);
              finalVideos = allVideos.filter(v => validStoryIds.includes(v.story_id));
              totalCount = finalVideos.length;
              
              // Apply pagination after filtering
              const startIndex = (page - 1) * limit;
              const endIndex = startIndex + limit;
              finalVideos = finalVideos
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(startIndex, endIndex);
            } else {
              // No workflows found with this mode
              finalVideos = [];
              totalCount = 0;
            }
          }
        }
      } else {
        // No mode filter - use normal query
        query = query
          .range((page - 1) * limit, page * limit - 1)
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
        
        finalVideos = videos || [];
        totalCount = count || 0;
      }
      
      // Get storyboards for the videos
      const storyIds = [...new Set(finalVideos.map(v => v.story_id).filter(Boolean))];
      
      if (storyIds.length > 0) {
        // Batch fetch to avoid IN query limits
        const batchSize = 100;
        storyboards = [];
        
        for (let i = 0; i < storyIds.length; i += batchSize) {
          const batch = storyIds.slice(i, i + batchSize);
          const { data: storyboardData } = await supabase
            .from('storyboards')
            .select('id, title, uid, created_at')
            .in('id', batch);
          
          if (storyboardData) {
            storyboards = storyboards.concat(storyboardData);
          }
        }
      } else {
        storyboards = [];
      }
      
      // Get workflows for all videos
      if (storyIds.length > 0) {
        const { data: workflowData } = await supabase
          .from('workflows')
          .select('id, storyboard_id, mode')
          .in('storyboard_id', storyIds);
        
        if (workflowData) {
          workflows = workflowData;
        }
      }
    }
    
    // Create storyboard map
    const storyboardMap = new Map(storyboards.map(sb => [sb.id, sb]));
    
    // Create workflow map
    const workflowMap = new Map(workflows.map(w => [w.storyboard_id, w]));
    
    // Get profiles for the videos
    const uids = [...new Set([
      ...finalVideos.map(v => v.uid),
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
    
    const videosWithProfiles = finalVideos.map(video => {
      const storyboard = storyboardMap.get(video.story_id);
      const workflow = workflowMap.get(video.story_id);
      // Remove story_data from the response to reduce payload size
      const { story_data, ...storyboardWithoutData } = storyboard || {};
      return {
        ...video,
        story: storyboardWithoutData, // Map storyboard to story for backward compatibility
        profile: storyboard?.uid ? profileMap.get(storyboard.uid) : profileMap.get(video.uid),
        workflow: workflow ? { id: workflow.id, mode: workflow.mode } : null,
      };
    });
    
    // Fix the response format - remove success wrapper
    return NextResponse.json({
      videos: videosWithProfiles,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
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