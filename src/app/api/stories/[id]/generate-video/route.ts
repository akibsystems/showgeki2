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
    .select('*, preview_status')
    .eq('story_id', storyId)
    .eq('uid', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching existing video:', error);
  }

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

    // If video already exists and is completed with actual video, return existing video
    if (existingVideo && existingVideo.status === 'completed' && existingVideo.url) {
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

    // If video exists but is processing/queued (skip if it's only for preview)
    // プレビュー生成のためだけに作成されたレコードは無視する
    if (existingVideo && (existingVideo.status === 'processing' || existingVideo.status === 'queued')) {
      // プレビュー専用のレコードかチェック（preview_statusがあり、かつurlがない場合）
      const isPreviewOnly = existingVideo.preview_status && !existingVideo.url;

      console.log('Existing video check:', {
        videoId: existingVideo.id,
        status: existingVideo.status,
        hasUrl: !!existingVideo.url,
        previewStatus: existingVideo.preview_status,
        isPreviewOnly
      });

      if (!isPreviewOnly) {
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
      // プレビュー専用レコードの場合は、新しい動画生成を続行
    }

    // プレビュー専用レコードがある場合は、それを動画生成用に再利用
    let videoId: string;

    if (existingVideo && existingVideo.preview_status && !existingVideo.url) {
      console.log('Reusing preview video record:', existingVideo.id);

      // 既存のプレビュー専用レコードを動画生成用に更新
      const { data: updatedVideo, error: updateError } = await supabase
        .from('videos')
        .update({
          status: 'queued'
        })
        .eq('id', existingVideo.id)
        .eq('uid', auth.uid)  // 追加: uidも条件に含める
        .select()
        .single();

      if (updateError) {
        console.error('Database error updating video:', updateError);
        console.error('Update query details:', {
          videoId: existingVideo.id,
          uid: auth.uid,
          currentStatus: existingVideo.status,
          currentPreviewStatus: existingVideo.preview_status
        });
        return NextResponse.json(
          {
            error: 'Failed to update video record',
            type: ErrorType.INTERNAL,
            details: updateError.message,
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }

      videoId = updatedVideo.id;
    } else {
      // 新しいvideoレコードを作成
      // workflow_idを取得するため、まずstoryboardとworkflowを確認
      let workflowId: string | null = null;
      
      const { data: workflowData } = await supabase
        .from('workflows')
        .select('id')
        .eq('storyboard_id', storyId)
        .maybeSingle();
      
      if (workflowData) {
        workflowId = workflowData.id;
      }
      
      const videoInsertData: SupabaseVideoInsert = {
        story_id: storyId,
        uid: auth.uid,
        status: 'queued',
        workflow_id: workflowId || undefined
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

      videoId = newVideo.id;
    }

    // webhook処理（DISABLE_WEBHOOK=trueの場合はスキップ）
    const DISABLE_WEBHOOK = process.env.DISABLE_WEBHOOK === 'true';

    if (!DISABLE_WEBHOOK) {
      // webhook有効時は同期処理で動画生成を実行
      console.log('Calling webhook synchronously for video generation...');
      const result = await generateVideoAsync(videoId, story, auth.uid);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error || 'Video generation failed',
            type: ErrorType.INTERNAL,
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }

      // webhook呼び出し成功（実際の処理とステータス更新はwebhook handler側で行う）
      // タイムアウトした場合も含めて、成功として扱う
      return NextResponse.json({
        success: true,
        data: {
          video_id: videoId,
          status: 'queued'  // webhook handlerがprocessing→completedに更新する
        },
        message: 'Video generation started successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('Webhook disabled - video queued for local processing:', videoId);

      // webhookが無効の場合は従来通り即座にレスポンス
      return NextResponse.json({
        success: true,
        data: {
          video_id: videoId,
          status: 'queued'
        },
        message: 'Video queued for local processing',
        timestamp: new Date().toISOString()
      });
    }

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
 * Generate video asynchronously via Cloud Run webhook (if enabled)
 */
async function generateVideoAsync(videoId: string, story: Story, uid: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    // webhook有効時：Cloud Run呼び出し処理
    console.log('Webhook enabled - calling Cloud Run for video generation:', videoId);


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
    return { success: true };

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

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
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
      // Add timeout for webhook calls (10 seconds for UX, processing continues in background)
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true };

  } catch (error) {
    // タイムアウトエラーをチェック
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      console.log('Webhook call timed out, but processing continues in background');
      // タイムアウトは成功として扱う（処理は継続される）
      return { success: true };
    }
    
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