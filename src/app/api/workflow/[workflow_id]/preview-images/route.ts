import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { IMAGE_STYLE_PRESETS } from '@/types/workflow'

// SERVICE_ROLEキーを使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

const workflowIdSchema = z.string().uuid()

// POST /api/workflow/[workflow_id]/preview-images
// 画像プレビューの生成をトリガー
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  try {
    // paramsをawaitする
    const { workflow_id } = await params
    
    // ワークフローIDのバリデーション
    const workflowId = workflowIdSchema.parse(workflow_id)
    
    // 認証チェック
    const uid = request.headers.get('X-User-UID')
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      )
    }
    
    // ワークフローの取得とアクセス権限チェック
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        storyboard_id,
        uid,
        status,
        storyboards (
          id,
          uid,
          title,
          status,
          scenes_data,
          style_data
        )
      `)
      .eq('id', workflowId)
      .eq('uid', uid)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }
    
    const storyboard = workflow.storyboards as any
    if (!storyboard) {
      return NextResponse.json({ error: 'Storyboard not found' }, { status: 404 })
    }
    
    // シーンデータを確認
    const scenesData = storyboard.scenes_data?.scenes
    if (!scenesData || scenesData.length === 0) {
      return NextResponse.json({ error: 'Scenes not generated yet' }, { status: 400 })
    }
    
    // 既存のプレビュー生成中かチェック
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id, preview_status')
      .eq('story_id', storyboard.id)
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
      .eq('story_id', storyboard.id)
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
          story_id: storyboard.id,
          uid: uid,
          status: 'queued',
          preview_status: 'pending'
        })
      
      if (insertError) {
        console.error('Failed to create video record:', insertError)
        return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 })
      }
    }
    
    // ステップ3で選択したスタイルを取得
    const styleData = storyboard.style_data
    const stylePreset = styleData?.imageStyle || 'anime'
    const imageStyle = IMAGE_STYLE_PRESETS[stylePreset as keyof typeof IMAGE_STYLE_PRESETS] || IMAGE_STYLE_PRESETS.anime
    
    // シーンデータからmulmoscript形式に変換
    const beats = scenesData.map((scene: any) => ({
      speaker: scene.dialogue && scene.dialogue.length > 0 ? scene.dialogue[0].speaker : 'Narrator',
      text: scene.dialogue && scene.dialogue.length > 0 ? scene.dialogue[0].text : scene.title,
      imagePrompt: scene.imagePrompt
    }))
    
    const scriptJson = {
      $mulmocast: {
        version: '1.0'
      },
      title: storyboard.title || 'Untitled',
      lang: 'ja',
      imageParams: {
        style: imageStyle,
        quality: 'low',
        model: 'gpt-image-1'
      },
      beats
    }
    
    // Cloud Run webhookを呼び出し
    const cloudRunUrl = process.env.CLOUD_RUN_WEBHOOK_URL || 'https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook'
    
    try {
      const webhookPayload = {
        type: 'image_preview',
        payload: {
          video_id: videoId,
          story_id: storyboard.id,
          uid: uid,
          title: storyboard.title,
          script_json: scriptJson
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
      return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/workflow/[workflow_id]/preview-images
// プレビュー画像のステータスと URL を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  try {
    // paramsをawaitする
    const { workflow_id } = await params
    
    // ワークフローIDのバリデーション
    const workflowId = workflowIdSchema.parse(workflow_id)
    
    // 認証チェック
    const uid = request.headers.get('X-User-UID')
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      )
    }
    
    // ワークフローからstoryboard_idを取得
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('storyboard_id')
      .eq('id', workflowId)
      .eq('uid', uid)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json({ 
        status: 'not_started',
        message: 'No workflow found'
      }, { status: 200 })
    }
    
    // ビデオレコードの取得
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, preview_status, preview_data, error_msg')
      .eq('story_id', workflow.storyboard_id)
      .eq('uid', uid)
      .single()
    
    if (videoError || !video) {
      return NextResponse.json({ 
        status: 'not_started',
        message: 'No preview generation found for this workflow'
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
      return NextResponse.json({ error: 'Invalid workflow ID format' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}