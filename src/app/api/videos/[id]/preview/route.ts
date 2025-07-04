import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const videoIdSchema = z.string().uuid()

// GET /api/videos/[id]/preview
// プレビュー画像の一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // paramsをawaitする
    const { id } = await params
    
    // ビデオIDのバリデーション
    const videoId = videoIdSchema.parse(id)
    
    // Supabaseクライアントの初期化
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ビデオレコードの取得とアクセス権限チェック
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, uid, preview_status, preview_data, preview_storage_path, error_msg')
      .eq('id', videoId)
      .eq('uid', user.id)
      .single()
    
    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    
    // プレビューデータの返却
    return NextResponse.json({
      status: video.preview_status || 'not_started',
      previewData: video.preview_data,
      storagePath: video.preview_storage_path,
      error: video.error_msg
    }, { status: 200 })
    
  } catch (error) {
    console.error('Get preview error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/videos/[id]/preview
// プレビュー画像を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // paramsをawaitする
    const { id } = await params
    
    // ビデオIDのバリデーション
    const videoId = videoIdSchema.parse(id)
    
    // Supabaseクライアントの初期化
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ビデオレコードの取得とアクセス権限チェック
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, uid, preview_storage_path')
      .eq('id', videoId)
      .eq('uid', user.id)
      .single()
    
    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    
    // ストレージからプレビューファイルを削除
    if (video.preview_storage_path) {
      // Service Role Keyを使用したクライアントを作成（ファイル削除のため）
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      // プレビューフォルダ全体を削除
      const folderPath = video.preview_storage_path.replace('videos/', '')
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('videos')
        .list(folderPath, {
          limit: 1000,
          offset: 0
        })
      
      if (!listError && files && files.length > 0) {
        const filePaths = files.map(file => `${folderPath}/${file.name}`)
        const { error: deleteError } = await supabaseAdmin.storage
          .from('videos')
          .remove(filePaths)
        
        if (deleteError) {
          console.error('Failed to delete preview files:', deleteError)
        }
      }
    }
    
    // データベースのプレビュー情報をクリア
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        preview_status: null,
        preview_data: null,
        preview_storage_path: null
      })
      .eq('id', videoId)
      .eq('uid', user.id)
    
    if (updateError) {
      console.error('Failed to clear preview data:', updateError)
      return NextResponse.json({ error: 'Failed to clear preview data' }, { status: 500 })
    }
    
    return NextResponse.json({
      message: 'Preview deleted successfully'
    }, { status: 200 })
    
  } catch (error) {
    console.error('Delete preview error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid video ID format' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}