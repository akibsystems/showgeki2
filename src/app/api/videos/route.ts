import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  VideoSchema,
  validateSchema,
  isValidUid
} from '@/lib/schemas';
import { ErrorType } from '@/types';

// ================================================================
// GET /api/videos
// UID に紐づく動画一覧を取得
// Query parameters: story_id?, status?, limit?, offset?
// ================================================================

async function getVideos(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const storyId = searchParams.get('story_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('videos')
      .select('*')
      .eq('uid', auth.uid);

    // Apply filters
    if (storyId) {
      // Validate story ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (typeof storyId !== 'string' || !uuidRegex.test(storyId)) {
        return NextResponse.json(
          {
            error: 'Invalid story_id format',
            type: ErrorType.VALIDATION,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }

      // Verify story ownership
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('id')
        .eq('id', storyId)
        .eq('uid', auth.uid)
        .single();

      if (storyError || !story) {
        return NextResponse.json(
          {
            error: 'Story not found or access denied',
            type: ErrorType.AUTHORIZATION,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }

      query = query.eq('story_id', storyId);
    }

    if (status) {
      // Validate status value
      const validStatuses = ['queued', 'processing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status value',
            type: ErrorType.VALIDATION,
            details: { validStatuses },
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
      query = query.eq('status', status);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Get total count for pagination
    let countQuery = supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('uid', auth.uid);

    if (storyId) {
      countQuery = countQuery.eq('story_id', storyId);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const [{ data, error }, { count }] = await Promise.all([
      query,
      countQuery
    ]);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch videos',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate each video with schema
    const validatedVideos = data.map(video => {
      const validation = validateSchema(VideoSchema, video);
      if (!validation.success) {
        return video; // Return raw data if validation fails
      }
      return validation.data;
    });

    const response = {
      videos: validatedVideos,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get videos error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ================================================================
// DELETE /api/videos/[id] functionality integrated here
// 動画の削除
// ================================================================

async function deleteVideo(
  request: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { video_id } = body;

    if (!video_id) {
      return NextResponse.json(
        {
          error: 'video_id is required',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate video ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(video_id)) {
      return NextResponse.json(
        {
          error: 'Invalid video ID format',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify video exists and user owns it
    const { data: existingVideo, error: getError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', video_id)
      .eq('uid', auth.uid)
      .single();

    if (getError || !existingVideo) {
      return NextResponse.json(
        {
          error: 'Video not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Delete video
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', video_id)
      .eq('uid', auth.uid);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete video',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete video error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ================================================================
// Export HTTP handlers with authentication middleware
// ================================================================

export const GET = withAuth(getVideos);
export const DELETE = withAuth(deleteVideo);