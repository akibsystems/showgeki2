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

/**
 * POST /api/workflow/create
 * 新規ワークフローを作成（仮のプロジェクトとストーリーボードも同時作成）
 */
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

    // トランザクション的な処理のため、順次作成
    
    // 1. デフォルトプロジェクトを取得または作成
    let projectId: string;
    
    // 既存のデフォルトプロジェクトを探す
    const { data: existingProjects, error: projectFetchError } = await supabase
      .from('projects')
      .select('id')
      .eq('uid', uid)
      .eq('name', 'デフォルトプロジェクト')
      .single();

    if (existingProjects) {
      projectId = existingProjects.id;
    } else {
      // デフォルトプロジェクトを作成
      const { data: newProject, error: projectCreateError } = await supabase
        .from('projects')
        .insert({
          uid,
          name: 'デフォルトプロジェクト',
          description: '自動作成されたデフォルトプロジェクト',
          status: 'active'
        })
        .select()
        .single();

      if (projectCreateError || !newProject) {
        console.error('プロジェクト作成エラー:', projectCreateError);
        return NextResponse.json(
          { error: 'プロジェクトの作成に失敗しました' },
          { status: 500 }
        );
      }
      
      projectId = newProject.id;
    }

    // 2. ストーリーボードを作成
    const { data: storyboard, error: storyboardError } = await supabase
      .from('storyboards')
      .insert({
        project_id: projectId,
        uid,
        title: null, // 初期状態ではタイトルは未設定
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

    // 3. ワークフローを作成
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

    // リダイレクトURL
    const redirectUrl = `/workflow/${workflow.id}?step=1`;

    return NextResponse.json(
      { 
        success: true,
        workflow_id: workflow.id,
        storyboard_id: storyboard.id,
        project_id: projectId,
        redirect_url: redirectUrl 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('ワークフロー作成API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}