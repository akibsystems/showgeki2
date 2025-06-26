import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, SupabaseVideoInsert, SupabaseVideoUpdate } from '@/lib/supabase';
import { withAuth, type AuthContext } from '@/lib/auth';
import { 
  StorySchema,
  VideoSchema,
  GenerateVideoResponseSchema,
  validateSchema,
  type Story,
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
 * Validate story ID format
 */
function isValidStoryId(id: string): boolean {
  return typeof id === 'string' && id.length === 8 && /^[A-Z0-9]+$/.test(id);
}

/**
 * Get story with ownership verification
 */
async function getStoryWithAuth(storyId: string, uid: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .eq('uid', uid)
    .single();

  return { data, error };
}

/**
 * Generate mock video (placeholder for actual video generation)
 * TODO: Replace with actual mulmocast CLI integration
 */
async function generateMockVideo(story: Story): Promise<{
  url: string;
  duration_sec: number;
  resolution: string;
  size_mb: number;
}> {
  // Simulate video generation processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock video metadata based on story content
  const estimatedDuration = Math.max(30, Math.min(180, story.text_raw.length / 10)); // 30-180 seconds
  const mockVideoId = `video_${story.id}_${Date.now()}`;
  
  return {
    url: `https://storage.googleapis.com/showgeki2-videos/${mockVideoId}.mp4`,
    duration_sec: Math.round(estimatedDuration),
    resolution: '1920x1080',
    size_mb: Number((estimatedDuration * 2.5).toFixed(2)) // ~2.5MB per second estimate
  };
}

/**
 * Check if video already exists for story
 */
async function getExistingVideo(storyId: string, uid: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('story_id', storyId)
    .eq('uid', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

// ================================================================
// POST /api/stories/[id]/generate-video
// ストーリーの動画生成
// ================================================================

async function generateVideo(
  request: NextRequest,
  auth: AuthContext,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: storyId } = await context.params;

    // Validate story ID format
    if (!isValidStoryId(storyId)) {
      return NextResponse.json(
        {
          error: 'Invalid story ID format',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get story with ownership verification
    const { data: story, error: getError } = await getStoryWithAuth(storyId, auth.uid);

    if (getError || !story) {
      return NextResponse.json(
        {
          error: 'Story not found or access denied',
          type: ErrorType.NOT_FOUND,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Verify story has a generated script
    if (story.status !== 'script_generated' || !story.script_json) {
      return NextResponse.json(
        {
          error: 'Story must have a generated script before video generation',
          type: ErrorType.VALIDATION,
          details: { 
            currentStatus: story.status,
            hasScript: !!story.script_json 
          },
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if video already exists
    const { data: existingVideo, error: videoCheckError } = await getExistingVideo(storyId, auth.uid);
    
    if (videoCheckError) {
      console.error('Error checking existing video:', videoCheckError);
    }

    // If video already exists and is completed, return existing video
    if (existingVideo && existingVideo.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          video_id: existingVideo.id,
          status: existingVideo.status as 'completed'
        },
        message: 'Video already exists',
        timestamp: new Date().toISOString()
      });
    }

    // If video exists but is processing/queued, return current status
    if (existingVideo && (existingVideo.status === 'processing' || existingVideo.status === 'queued')) {
      return NextResponse.json({
        success: true,
        data: {
          video_id: existingVideo.id,
          status: existingVideo.status as 'processing' | 'queued'
        },
        message: 'Video generation already in progress',
        timestamp: new Date().toISOString()
      });
    }

    // Create new video record with 'queued' status
    const videoInsertData: SupabaseVideoInsert = {
      story_id: storyId,
      uid: auth.uid,
      status: 'queued'
    };

    const { data: newVideo, error: createError } = await supabase
      .from('videos')
      .insert(videoInsertData)
      .select()
      .single();

    if (createError) {
      console.error('Database error creating video:', createError);
      return NextResponse.json(
        {
          error: 'Failed to create video record',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Start video generation process (async)
    // In production, this would trigger a Cloud Run Job
    // For now, we'll do a simple async mock generation
    generateVideoAsync(newVideo.id, story, auth.uid).catch(error => {
      console.error('Video generation failed:', error);
    });

    // Return immediate response with video ID and queued status
    return NextResponse.json({
      success: true,
      data: {
        video_id: newVideo.id,
        status: newVideo.status as 'queued'
      },
      message: 'Video generation started',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generate video error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          type: ErrorType.VALIDATION,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error during video generation',
        type: ErrorType.INTERNAL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ================================================================
// Async Video Generation (Background Process)
// ================================================================

/**
 * Generate video asynchronously (simulates Cloud Run Job)
 */
async function generateVideoAsync(videoId: string, story: Story, uid: string): Promise<void> {
  const supabase = createAdminClient();
  
  try {
    // Update status to 'processing'
    await supabase
      .from('videos')
      .update({ 
        status: 'processing'
      } as SupabaseVideoUpdate)
      .eq('id', videoId)
      .eq('uid', uid);

    // Generate video (mock implementation)
    const videoResult = await generateMockVideo(story);

    // Update video with generated content
    const updateData: SupabaseVideoUpdate = {
      status: 'completed',
      url: videoResult.url,
      duration_sec: videoResult.duration_sec,
      resolution: videoResult.resolution,
      size_mb: videoResult.size_mb
    };

    const { error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .eq('uid', uid);

    if (updateError) {
      throw new Error(`Failed to update video: ${updateError.message}`);
    }

    // Update story status to 'completed'
    await supabase
      .from('stories')
      .update({ 
        status: 'completed'
      })
      .eq('id', story.id)
      .eq('uid', uid);

  } catch (error) {
    console.error('Async video generation failed:', error);
    
    // Update video status to 'failed'
    await supabase
      .from('videos')
      .update({ 
        status: 'failed',
        error_msg: error instanceof Error ? error.message : 'Unknown error occurred'
      } as SupabaseVideoUpdate)
      .eq('id', videoId)
      .eq('uid', uid);
  }
}

// ================================================================
// Export HTTP handlers with authentication middleware
// ================================================================

export const POST = withAuth(generateVideo);