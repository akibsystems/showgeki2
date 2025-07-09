import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// POST: ストーリーボードをコピー
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: storyboardId } = await params;

    // 元のストーリーボードを取得
    const { data: originalStoryboard, error: fetchError } = await supabase
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .eq('uid', uid)
      .single();

    if (fetchError || !originalStoryboard) {
      return NextResponse.json(
        { error: 'ストーリーボードが見つかりません' },
        { status: 404 }
      );
    }

    // 新しいストーリーボードを作成（コピー）
    const newStoryboard = {
      uid: uid,
      project_id: originalStoryboard.project_id, // project_idをコピー
      title: `${originalStoryboard.title || '無題'} (コピー)`,
      status: 'draft',
      summary_data: originalStoryboard.summary_data,
      acts_data: originalStoryboard.acts_data,
      characters_data: originalStoryboard.characters_data,
      scenes_data: originalStoryboard.scenes_data,
      audio_data: originalStoryboard.audio_data,
      style_data: originalStoryboard.style_data,
      caption_data: originalStoryboard.caption_data,
      mulmoscript: null, // MulmoScriptはリセット
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdStoryboard, error: createError } = await supabase
      .from('storyboards')
      .insert(newStoryboard)
      .select()
      .single();

    if (createError || !createdStoryboard) {
      console.error('ストーリーボード作成エラー:', createError);
      return NextResponse.json(
        { error: 'ストーリーボードのコピーに失敗しました' },
        { status: 500 }
      );
    }

    // 新しいワークフローを作成
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        uid: uid,
        storyboard_id: createdStoryboard.id,
        status: 'active',
        current_step: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (workflowError || !workflow) {
      // ワークフロー作成に失敗した場合、ストーリーボードも削除
      await supabase
        .from('storyboards')
        .delete()
        .eq('id', createdStoryboard.id);

      console.error('ワークフロー作成エラー:', workflowError);
      return NextResponse.json(
        { error: 'ワークフローの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        storyboard: createdStoryboard,
        workflow: workflow
      }
    });

  } catch (error) {
    console.error('ストーリーボードコピーAPIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}