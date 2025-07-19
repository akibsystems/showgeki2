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
  hasImages: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
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
    
    const { page, limit, status, from, to, uid, search, mode, hasImages } = parseResult.data;
    const supabase = createAdminClient();
    
    console.log(`\n========================================`);
    console.log(`[getVideos] SEARCH REQUEST RECEIVED`);
    console.log(`[getVideos] Query params:`, { page, limit, status, from, to, uid, search, mode, hasImages });
    console.log(`========================================\n`);
    
    // Build query - videos table first
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
    
    // Apply mode filter if provided
    if (mode) {
      // Get workflow IDs with the specified mode
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id')
        .eq('mode', mode);
      
      if (workflows && workflows.length > 0) {
        const workflowIds = workflows.map(w => w.id);
        query = query.in('workflow_id', workflowIds);
      } else {
        // No workflows found with this mode - return empty result
        return NextResponse.json({
          videos: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        });
      }
    }
    
    // Apply hasImages filter if provided
    if (hasImages !== undefined) {
      // Get workflows with detected faces
      const { data: workflowsWithFaces } = await supabase
        .from('detected_faces')
        .select('workflow_id')
        .limit(1000); // Get distinct workflow_ids
      
      const workflowIdsWithImages = [...new Set((workflowsWithFaces || []).map(df => df.workflow_id))];
      
      if (hasImages) {
        // Filter for videos WITH images
        if (workflowIdsWithImages.length > 0) {
          query = query.in('workflow_id', workflowIdsWithImages);
        } else {
          // No workflows with images found
          return NextResponse.json({
            videos: [],
            pagination: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          });
        }
      } else {
        // Filter for videos WITHOUT images
        if (workflowIdsWithImages.length > 0) {
          query = query.or(`workflow_id.is.null,workflow_id.not.in.(${workflowIdsWithImages.join(',')})`);
        }
        // If no workflows with images, all videos are without images
      }
    }
    
    // Apply search filter if provided
    if (search) {
      // First, find storyboards that match the search in originalText
      const { data: matchingStoryboards } = await supabase
        .from('storyboards')
        .select('id')
        .ilike('story_data->>originalText', `%${search}%`);
      
      const matchingStoryIds = (matchingStoryboards || []).map(sb => sb.id);
      
      if (matchingStoryIds.length > 0) {
        // Search in video title, uid, or story content
        query = query.or(`title.ilike.%${search}%,uid.ilike.%${search}%,story_id.in.(${matchingStoryIds.join(',')})`);
      } else {
        // Only search in video title and uid
        query = query.or(`title.ilike.%${search}%,uid.ilike.%${search}%`);
      }
    }
    
    // Apply pagination
    query = query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false });
    
    // Execute query
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
    
    // Get profiles for the videos
    const uids = [...new Set(videos?.map(v => v.uid).filter(Boolean) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', uids);
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    
    // Get story and workflow information for videos
    const videoIds = videos?.map(v => v.id) || [];
    const storyIds = [...new Set(videos?.map(v => v.story_id).filter(Boolean) || [])];
    const workflowIds = [...new Set(videos?.map(v => v.workflow_id).filter(Boolean) || [])];
    
    // Fetch stories
    let storyMap = new Map();
    
    if (storyIds.length > 0) {
      const { data: storyboards } = await supabase
        .from('storyboards')
        .select('id, title, uid, created_at')
        .in('id', storyIds);
      
      if (storyboards) {
        storyMap = new Map(storyboards.map(s => [s.id, s]));
      }
    }
    
    // Check which workflows have detected faces (indicating uploaded images)
    const workflowsWithImages = new Set<string>();
    
    if (workflowIds.length > 0) {
      const { data: detectedFaces } = await supabase
        .from('detected_faces')
        .select('workflow_id')
        .in('workflow_id', workflowIds);
      
      if (detectedFaces) {
        detectedFaces.forEach(df => {
          workflowsWithImages.add(df.workflow_id);
        });
      }
    }
    
    // Fetch workflows
    let workflowMap = new Map();
    if (workflowIds.length > 0) {
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, mode')
        .in('id', workflowIds);
      
      if (workflows) {
        workflowMap = new Map(workflows.map(w => [w.id, w]));
      }
    }
    
    // Transform the response
    const videosWithRelations = (videos || []).map(video => ({
      ...video,
      // Map story data
      story: storyMap.get(video.story_id) || null,
      // Map workflow data
      workflow: workflowMap.get(video.workflow_id) || null,
      // Map profile data
      profile: profileMap.get(video.uid) || null,
      // Check if has uploaded images based on workflow_id
      hasUploadedImages: video.workflow_id ? workflowsWithImages.has(video.workflow_id) : false
    }));
    
    return NextResponse.json({
      videos: videosWithRelations,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
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