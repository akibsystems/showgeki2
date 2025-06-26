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
 * Generate actual video using FFmpeg and upload to Supabase Storage
 * Supports both story-based and script-based video generation
 */
async function generateActualVideo(story: Story): Promise<{
  url: string;
  path: string;
  duration_sec: number;
  resolution: string;
  size_mb: number;
}> {
  // Import video generation library
  const { generateVideo, generateVideoFromScript } = await import('@/lib/video-generator');
  
  try {
    // Check if story has a generated script
    if (story.script_json && typeof story.script_json === 'object') {
      // Generate video from script (more sophisticated)
      console.log('Generating video from script for story:', story.id);
      return await generateVideoFromScript(story, story.script_json as any, {
        resolution: '1280x720', // Smaller resolution for faster processing
        fps: 24,
        backgroundColor: '#1a1a2e',
        textColor: 'white',
        fontSize: 36,
      });
    } else {
      // Generate simple video from story text
      console.log('Generating video from story text for story:', story.id);
      const estimatedDuration = Math.max(15, Math.min(60, Math.ceil(story.text_raw.length / 20))); // 15-60 seconds
      
      return await generateVideo(story, {
        resolution: '1280x720',
        fps: 24,
        duration: estimatedDuration,
        backgroundColor: '#1a1a2e',
        textColor: 'white',
        fontSize: 36,
      });
    }
  } catch (error) {
    console.error('Video generation failed:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

    // Check if story can be used for video generation
    // Allow video generation from either script or raw text
    if (story.status === 'error') {
      return NextResponse.json(
        {
          error: 'Cannot generate video from story with error status',
          type: ErrorType.VALIDATION,
          details: { 
            currentStatus: story.status
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

    // Generate actual video
    const videoResult = await generateActualVideo(story);

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