import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
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
const beatIndexSchema = z.number().int().min(0)

// POST /api/workflow/[workflow_id]/preview-images/[beat_index]
// 特定のビートの画像プレビューを再生成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string; beat_index: string }> }
) {
  try {
    // paramsをawaitする
    const { workflow_id, beat_index } = await params
    
    // バリデーション
    const workflowId = workflowIdSchema.parse(workflow_id)
    const beatIndex = beatIndexSchema.parse(parseInt(beat_index))
    
    // 認証チェック
    const uid = request.headers.get('X-User-UID')
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      )
    }
    
    // リクエストボディから更新されたプロンプトを取得
    const body = await request.json()
    const { imagePrompt } = body
    
    if (!imagePrompt) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
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
    
    if (beatIndex >= scenesData.length) {
      return NextResponse.json({ error: 'Invalid beat index' }, { status: 400 })
    }
    
    // videoレコードを取得または作成
    let videoId: string
    
    const { data: existingVideoRecord } = await supabase
      .from('videos')
      .select('id, preview_data')
      .eq('story_id', storyboard.id)
      .eq('uid', uid)
      .single()
    
    if (existingVideoRecord) {
      videoId = existingVideoRecord.id
    } else {
      // 新規作成の場合は全体生成を促す
      return NextResponse.json(
        { error: 'Please generate all preview images first' },
        { status: 400 }
      )
    }
    
    // 既存の画像URLを取得してStorageから削除
    if (existingVideoRecord.preview_data?.images?.[beatIndex]) {
      const existingImageUrl = existingVideoRecord.preview_data.images[beatIndex].url
      
      // Supabase StorageのURLからパスを抽出
      if (existingImageUrl.includes('/storage/v1/object/public/')) {
        const pathMatch = existingImageUrl.match(/\/storage\/v1\/object\/public\/(.+)/)
        if (pathMatch && pathMatch[1]) {
          const storagePath = pathMatch[1]
          const [bucket, ...pathParts] = storagePath.split('/')
          const filePath = pathParts.join('/')
          
          // Storageから削除
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove([filePath])
          
          if (deleteError) {
            console.error('Failed to delete existing image:', deleteError)
          }
        }
      }
    }
    
    // ステップ3で選択したスタイルを取得
    const styleData = storyboard.style_data
    const stylePreset = styleData?.imageStyle || 'anime'
    const imageStyle = IMAGE_STYLE_PRESETS[stylePreset as keyof typeof IMAGE_STYLE_PRESETS] || IMAGE_STYLE_PRESETS.anime
    
    // 更新されたプロンプトでシーンデータを更新
    scenesData[beatIndex].imagePrompt = imagePrompt
    
    // 全シーンのmulmoscript形式に変換（キャッシュが効くので他の画像は再生成されない）
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
    
    // Cloud Run webhookを呼び出し（通常のimage_previewと同じ）
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
      
      console.log('Calling Cloud Run webhook for single image preview:', webhookPayload)
      
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
        beatIndex: beatIndex,
        status: 'processing',
        message: 'Single image regeneration started successfully'
      }, { status: 200 })
      
    } catch (webhookError) {
      console.error('Failed to call webhook:', webhookError)
      
      const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown webhook error'
      
      return NextResponse.json({ 
        error: 'Failed to start image regeneration',
        details: errorMessage
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Single image preview generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}