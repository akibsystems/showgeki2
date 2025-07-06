import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// SERVICE_ROLEキーを使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// POST: 音声アップロード
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    const { workflow_id } = await params;

    // ワークフローの存在確認
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, storyboard_id')
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      );
    }

    // フォームデータから音声ファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'custom-bgm' | 'custom-voice'
    const metadata = formData.get('metadata') as string; // JSON文字列

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大10MB）' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '対応していないファイル形式です（MP3, WAV, M4A, OGGのみ）' },
        { status: 400 }
      );
    }

    // メタデータをパース
    let parsedMetadata: any = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        console.error('メタデータのパースエラー:', e);
      }
    }

    // ファイル名を生成
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${workflow_id}/${type}/${timestamp}_${parsedMetadata.name || 'upload'}.${fileExt}`;

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('workflow-uploads')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('アップロードエラー:', uploadError);
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('workflow-uploads')
      .getPublicUrl(fileName);

    // アップロード情報を保存（必要に応じて）
    if (type === 'custom-bgm') {
      // カスタムBGM情報を更新
      const { data: storyboard } = await supabase
        .from('storyboards')
        .select('audio_data')
        .eq('id', workflow.storyboard_id)
        .single();

      if (storyboard) {
        const audioData = storyboard.audio_data || { bgmSettings: {} };
        audioData.bgmSettings.customBgm = {
          url: urlData.publicUrl,
          name: parsedMetadata.name || file.name,
          uploadedAt: new Date().toISOString()
        };
        
        await supabase
          .from('storyboards')
          .update({ audio_data: audioData })
          .eq('id', workflow.storyboard_id);
      }
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName,
      type,
      metadata: parsedMetadata
    });

  } catch (error) {
    console.error('音声アップロードAPI エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE: 音声削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    const { workflow_id } = await params;
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json(
        { error: 'ファイル名が指定されていません' },
        { status: 400 }
      );
    }

    // ワークフローの存在確認
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      );
    }

    // ファイル名がワークフローIDで始まることを確認（セキュリティ）
    if (!fileName.startsWith(`${workflow_id}/`)) {
      return NextResponse.json(
        { error: '不正なファイル名です' },
        { status: 400 }
      );
    }

    // Supabase Storageから削除
    const { error: deleteError } = await supabase.storage
      .from('workflow-uploads')
      .remove([fileName]);

    if (deleteError) {
      console.error('削除エラー:', deleteError);
      return NextResponse.json(
        { error: 'ファイルの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ファイルを削除しました'
    });

  } catch (error) {
    console.error('音声削除API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}