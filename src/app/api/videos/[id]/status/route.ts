import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  VideoSchema,
  VideoStatusResponseSchema,
  validateSchema,
  type Video
} from '@/lib/schemas';
import { ErrorType } from '@/types';

// ================================================================
// Route Parameters Type
// ================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * Validate video ID format (UUID)
 */
function isValidVideoId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Get video with ownership verification
 */
async function getVideoWithAuth(videoId: string, uid: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('uid', uid)
    .single();

  return { data, error };
}

/**
 * Calculate progress percentage based on status and timing
 */
function calculateProgress(video: Video): number {
  switch (video.status) {
    case 'queued':
      return 0;
    case 'processing':
      // Estimate progress based on time elapsed
      const createdAt = new Date(video.created_at);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      // Assume video generation takes ~5 minutes, so calculate percentage
      const estimatedProgress = Math.min(90, Math.round((elapsedMinutes / 5) * 90));
      return Math.max(10, estimatedProgress); // Minimum 10% when processing
    case 'completed':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}

/**
 * Format video status response
 */
function formatVideoStatusResponse(video: Video) {
  const progress = calculateProgress(video);
  
  const response = {
    status: video.status,
    progress,
    ...(video.url && { url: video.url }),
    ...(video.duration_sec && { duration_sec: video.duration_sec }),
    ...(video.resolution && { resolution: video.resolution }),
    ...(video.size_mb && { size_mb: video.size_mb }),
    ...(video.error_msg && { error_msg: video.error_msg }),
    created_at: video.created_at
  };

  return response;
}

// ================================================================
// GET /api/videos/[id]/status
// 動画生成ステータスの取得
// ================================================================

async function getVideoStatus(
  request: NextRequest,
  auth: AuthContext,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: videoId } = await context.params;

    // Validate video ID format
    if (!isValidVideoId(videoId)) {
      return NextResponse.json(
        {
          error: 'Invalid video ID format',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get video with ownership verification
    const { data: video, error: getError } = await getVideoWithAuth(videoId, auth.uid);

    if (getError) {
      console.error('Database error:', getError);
      
      if (getError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          {
            error: 'Video not found or access denied',
            type: ErrorType.NOT_FOUND,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch video status',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (!video) {
      return NextResponse.json(
        {
          error: 'Video not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Validate video data
    const validation = validateSchema(VideoSchema, video);
    if (!validation.success) {
      console.error('Video data validation failed:', validation.errors);
    }

    // Format response
    const statusResponse = formatVideoStatusResponse(validation.success ? validation.data : video);

    // Validate response format
    const responseValidation = validateSchema(VideoStatusResponseSchema, statusResponse);
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.errors);
    }

    return NextResponse.json({
      success: true,
      data: responseValidation.success ? responseValidation.data : statusResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get video status error:', error);
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

export const GET = withAuth(getVideoStatus);