import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const storyIdSchema = z.string().uuid()

// POST /api/stories/[id]/preview-images
// 画像プレビューの生成をトリガー
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // paramsをawaitする
    const { id } = await params
    
    // ストーリーIDのバリデーション
    const storyId = storyIdSchema.parse(id)
    
    console.log(`🖼️ 画像プレビュー生成リクエスト: Story ${storyId}`)
    
    // Supabaseクライアントの初期化
    const supabase = await createClient()
    
    // デバッグ: ヘッダーを確認
    const headerUid = request.headers.get('X-User-UID')
    console.log(`🔍 X-User-UID header: ${headerUid}`)
    
    // UIDを取得（getOrCreateUidヘルパーを使用）
    const { getOrCreateUid } = await import('@/lib/uid-server')
    const uid = await getOrCreateUid(request)
    
    if (!uid) {
      return NextResponse.json({ error: 'UID not found' }, { status: 401 })
    }
    
    // ストーリーの取得とアクセス権限チェック
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, uid, title, script_json')
      .eq('id', storyId)
      .eq('uid', uid)
      .single()
    
    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }
    
    if (!story.script_json) {
      return NextResponse.json({ error: 'Script not generated yet' }, { status: 400 })
    }
    
    // 既存のプレビュー生成中かチェック
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id, preview_status')
      .eq('story_id', storyId)
      .eq('uid', uid)
      .in('preview_status', ['pending', 'processing'])
      .single()
    
    if (existingVideo) {
      return NextResponse.json({
        videoId: existingVideo.id,
        status: existingVideo.preview_status,
        message: 'Preview generation already in progress'
      }, { status: 200 })
    }
    
    // 新しいvideo recordを作成（または既存のものを取得）
    let videoId: string
    
    // 既存のvideoレコードがあるかチェック
    const { data: existingVideoRecord } = await supabase
      .from('videos')
      .select('id')
      .eq('story_id', storyId)
      .eq('uid', uid)
      .single()
    
    if (existingVideoRecord) {
      videoId = existingVideoRecord.id
      
      // 既存レコードのステータスを更新
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          preview_status: 'pending',
          error_msg: null
        })
        .eq('id', videoId)
        .eq('uid', uid)
      
      if (updateError) {
        console.error('Failed to update video record:', updateError)
        return NextResponse.json({ error: 'Failed to update video record' }, { status: 500 })
      }
    } else {
      // 新規作成
      videoId = randomUUID()
      
      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          id: videoId,
          story_id: storyId,
          uid: uid,
          status: 'queued',
          preview_status: 'pending'
        })
      
      if (insertError) {
        console.error('Failed to create video record:', insertError)
        return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 })
      }
    }
    
    // Cloud Run webhookを呼び出し
    const cloudRunUrl = process.env.CLOUD_RUN_WEBHOOK_URL || 'https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook'
    
    try {
      const webhookPayload = {
        type: 'image_preview',
        payload: {
          video_id: videoId,
          story_id: storyId,
          uid: uid,
          title: story.title,
          script_json: story.script_json
        }
      }
      
      console.log('Calling Cloud Run webhook for image preview:', webhookPayload)
      
      const response = await fetch(cloudRunUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Cloud Run webhook error:', response.status, errorText)
        
        // 429 Rate Limit Error
        if (response.status === 429) {
          // ステータスは既にCloud Run側でfailedに更新されているはず
          return NextResponse.json({
            error: 'Rate limit exceeded. Please try again later.',
            videoId: videoId
          }, { status: 429 })
        }
        
        throw new Error(`Webhook failed: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      console.log('Cloud Run webhook response:', result)
      
      return NextResponse.json({
        videoId: videoId,
        status: 'processing',
        message: 'Preview generation started successfully'
      }, { status: 200 })
      
    } catch (webhookError) {
      console.error('Failed to call webhook:', webhookError)
      
      const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown webhook error'
      
      // webhookエラーの場合、ステータスをfailedに更新
      await supabase
        .from('videos')
        .update({
          preview_status: 'failed',
          error_msg: `Webhook error: ${errorMessage}`
        })
        .eq('id', videoId)
        .eq('uid', uid)
      
      return NextResponse.json({ 
        error: 'Failed to start preview generation',
        details: errorMessage
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Preview generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid story ID format' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/stories/[id]/preview-images
// プレビュー画像のステータスと URL を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // paramsをawaitする
    const { id } = await params
    
    // ストーリーIDのバリデーション
    const storyId = storyIdSchema.parse(id)
    
    // Supabaseクライアントの初期化
    const supabase = await createClient()
    
    // UIDを取得（getOrCreateUidヘルパーを使用）
    const { getOrCreateUid } = await import('@/lib/uid-server')
    const uid = await getOrCreateUid(request)
    
    if (!uid) {
      return NextResponse.json({ error: 'UID not found' }, { status: 401 })
    }
    
    // ビデオレコードの取得
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, preview_status, preview_data, error_msg')
      .eq('story_id', storyId)
      .eq('uid', uid)
      .single()
    
    if (videoError || !video) {
      return NextResponse.json({ 
        status: 'not_started',
        message: 'No preview generation found for this story'
      }, { status: 200 })
    }
    
    return NextResponse.json({
      videoId: video.id,
      status: video.preview_status || 'not_started',
      previewData: video.preview_data,
      error: video.error_msg
    }, { status: 200 })
    
  } catch (error) {
    console.error('Get preview status error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid story ID format' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}