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
  // Story IDs are now UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
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
 * Generate video asynchronously via Cloud Run webhook
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

    // Call Cloud Run webhook for video generation
    const webhookResult = await callCloudRunWebhook({
      video_id: videoId,
      story_id: story.id,
      uid: uid,
      title: story.title,
      text_raw: story.text_raw,
      script_json: story.script_json
    });

    if (!webhookResult.success) {
      throw new Error(`Cloud Run webhook failed: ${webhookResult.error || 'Unknown error'}`);
    }

    console.log('Cloud Run webhook called successfully for video:', videoId);

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

/**
 * Call Cloud Run webhook for video generation
 */
async function callCloudRunWebhook(payload: {
  video_id: string;
  story_id: string;
  uid: string;
  title: string;
  text_raw: string;
  script_json?: any;
}): Promise<{ success: boolean; error?: string }> {
  const CLOUD_RUN_WEBHOOK_URL = process.env.CLOUD_RUN_WEBHOOK_URL || 'https://showgeki2-auto-process-598866385095.asia-northeast1.run.app/webhook';
  
  try {
    console.log('Calling Cloud Run webhook for video generation...', CLOUD_RUN_WEBHOOK_URL);
    
    const response = await fetch(CLOUD_RUN_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'video_generation',
        payload
      }),
      // Add timeout for webhook calls
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true };

  } catch (error) {
    console.error('Cloud Run webhook call failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown webhook error'
    };
  }
}

// ================================================================
// Export HTTP handlers with authentication middleware
// ================================================================

export const POST = withAuth(generateVideo);