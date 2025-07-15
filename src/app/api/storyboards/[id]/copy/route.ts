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

    // 新しいストーリーボードを作成（時刻以外の全フィールドをコピー）
    const { id, created_at, updated_at, ...storyboardDataToCopy } = originalStoryboard;
    const newStoryboard = {
      ...storyboardDataToCopy,
      title: `${originalStoryboard.title || '無題'} (コピー)`,
      status: 'draft', // statusは常にdraftにセット
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

    // 元のワークフローを取得
    const { data: originalWorkflows, error: fetchWorkflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('storyboard_id', storyboardId)
      .eq('uid', uid)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchWorkflowError) {
      console.error('元のワークフロー取得エラー:', fetchWorkflowError);
    }

    const originalWorkflow = originalWorkflows?.[0];

    // 新しいワークフローを作成（時刻以外の全フィールドをコピー）
    let newWorkflowData;
    if (originalWorkflow) {
      const { id, storyboard_id, created_at, updated_at, ...workflowDataToCopy } = originalWorkflow;
      newWorkflowData = {
        ...workflowDataToCopy,
        storyboard_id: createdStoryboard.id, // 新しいstoryboardのIDを設定
        status: 'active', // statusは常にactiveにセット
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else {
      // 元のワークフローが存在しない場合は新規作成
      newWorkflowData = {
        uid: uid,
        storyboard_id: createdStoryboard.id,
        status: 'active',
        current_step: 1,
        mode: 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert(newWorkflowData)
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