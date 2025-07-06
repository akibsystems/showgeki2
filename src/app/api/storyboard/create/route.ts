import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Storyboard, Workflow } from '@/types/workflow';

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

export async function POST(request: NextRequest) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { project_id, title } = body;

    // バリデーション
    if (!project_id) {
      return NextResponse.json(
        { error: 'プロジェクトIDは必須です' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認とオーナーシップチェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('uid', uid)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません' },
        { status: 404 }
      );
    }

    // トランザクション的な処理のため、ストーリーボードとワークフローを順次作成
    
    // 1. ストーリーボードを作成
    const { data: storyboard, error: storyboardError } = await supabase
      .from('storyboards')
      .insert({
        project_id,
        uid,
        title: title?.trim() || null,
        status: 'draft'
      })
      .select()
      .single();

    if (storyboardError || !storyboard) {
      console.error('ストーリーボード作成エラー:', storyboardError);
      return NextResponse.json(
        { error: 'ストーリーボードの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 2. ワークフローを作成
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        storyboard_id: storyboard.id,
        uid,
        current_step: 1,
        status: 'active'
      })
      .select()
      .single();

    if (workflowError || !workflow) {
      console.error('ワークフロー作成エラー:', workflowError);
      // ストーリーボードを削除（ロールバック）
      await supabase
        .from('storyboards')
        .delete()
        .eq('id', storyboard.id);
      
      return NextResponse.json(
        { error: 'ワークフローの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        storyboard_id: storyboard.id,
        workflow_id: workflow.id,
        redirect_url: `/workflow/${workflow.id}`,
        message: 'ストーリーボードとワークフローが作成されました' 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('ストーリーボード作成API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}