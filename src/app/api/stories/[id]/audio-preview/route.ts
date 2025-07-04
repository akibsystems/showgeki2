import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const storyIdSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // paramsをawaitする
    const { id } = await params;
    
    // ストーリーIDのバリデーション
    const storyId = storyIdSchema.parse(id);
    
    console.log(`🎤 音声プレビュー生成リクエスト: Story ${storyId}`);
    
    // Supabaseクライアントの初期化
    const supabase = await createClient();
    
    // デバッグ: ヘッダーを確認
    const headerUid = request.headers.get('X-User-UID');
    console.log(`🔍 X-User-UID header: ${headerUid}`);
    
    // UIDを取得（getOrCreateUidヘルパーを使用）
    const { getOrCreateUid } = await import('@/lib/uid-server');
    const uid = await getOrCreateUid(request);
    
    if (!uid) {
      return NextResponse.json({ error: 'UID not found' }, { status: 401 });
    }

    console.log(`🎤 音声プレビュー生成リクエスト: Story ${storyId}, UID ${uid} (header: ${headerUid})`);

    // ストーリーの取得とアクセス権限チェック
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, uid, title, script_json, text_raw')
      .eq('id', storyId)
      .eq('uid', uid)
      .single();

    if (storyError) {
      console.error('Story query error:', {
        error: storyError,
        storyId,
        uid,
        code: storyError.code,
        message: storyError.message
      });
      
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    if (!story) {
      console.error('Story is null');
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    if (!story.script_json) {
      return NextResponse.json(
        { error: 'Script not generated yet' },
        { status: 400 }
      );
    }

    // Check if there's already a video record
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id, status, preview_status, audio_preview_data')
      .eq('story_id', storyId)
      .eq('uid', uid)
      .single();

    let videoId: string;

    if (existingVideo) {
      videoId = existingVideo.id;
      
      // Check if audio preview is already being processed
      if (existingVideo.preview_status === 'processing') {
        return NextResponse.json(
          { error: 'Audio preview is already being processed' },
          { status: 409 }
        );
      }
    } else {
      // Create a new video record for preview
      const { data: newVideo, error: videoError } = await supabase
        .from('videos')
        .insert({
          story_id: storyId,
          uid: uid,
          status: 'queued',  // 'preview'ではなく'queued'を使用
          preview_status: 'pending'
        })
        .select('id')
        .single();

      if (videoError || !newVideo) {
        console.error('Failed to create video record:', videoError);
        return NextResponse.json(
          { error: 'Failed to create video record' },
          { status: 500 }
        );
      }

      videoId = newVideo.id;
    }

    // Call webhook handler for audio preview generation
    const webhookPayload = {
      type: 'audio-preview',
      payload: {
        video_id: videoId,
        story_id: storyId,
        uid: uid,
        title: story.title,
        text_raw: story.text_raw,
        script_json: story.script_json
      }
    };

    // Check if webhook is disabled
    const disableWebhook = process.env.DISABLE_WEBHOOK === 'true';
    
    if (disableWebhook) {
      console.log('⚠️ Webhook is disabled. Audio preview will not be generated.');
      return NextResponse.json({
        success: true,
        videoId: videoId,
        message: 'Webhook is disabled. Audio preview generation skipped.'
      });
    }

    // In development, use localhost
    const webhookUrl = process.env.NODE_ENV === 'development' && process.env.DISABLE_WEBHOOK !== 'true'
      ? 'http://localhost:8080/webhook'
      : process.env.WEBHOOK_URL || 'https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook';

    console.log(`📡 Sending webhook to: ${webhookUrl}`);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', webhookResponse.status, errorText);
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    return NextResponse.json({
      success: true,
      videoId: videoId,
      message: 'Audio preview generation started'
    });

  } catch (error) {
    console.error('Audio preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to start audio preview generation' },
      { status: 500 }
    );
  }
}