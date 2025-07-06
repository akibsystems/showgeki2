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

// GET: 最近のワークフローを取得
export async function GET(request: NextRequest) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    // 最近のワークフローを取得（最新10件）
    const { data: workflows, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        status,
        current_step,
        created_at,
        updated_at,
        storyboards (
          id,
          title,
          status,
          summary_data
        )
      `)
      .eq('uid', uid)
      .order('created_at', { ascending: false })
      .limit(10);

    if (workflowError) {
      console.error('ワークフロー取得エラー:', workflowError);
      return NextResponse.json(
        { error: 'ワークフローの取得に失敗しました' },
        { status: 500 }
      );
    }

    // ステップ情報を含めてフォーマット
    const formattedWorkflows = workflows?.map(workflow => {
      const storyboard = workflow.storyboards as any;
      
      // 現在のステップとタイトルを取得
      let currentStep = 1;
      let title = '新規脚本';
      
      if (workflow.status === 'completed') {
        currentStep = 7;
      } else if (workflow.current_step) {
        currentStep = workflow.current_step;
      }
      
      if (storyboard?.title) {
        title = storyboard.title;
      } else if (storyboard?.summary_data?.title) {
        title = storyboard.summary_data.title;
      }
      
      return {
        id: workflow.id,
        title,
        status: workflow.status,
        currentStep,
        totalSteps: 7,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      };
    }) || [];

    return NextResponse.json({
      workflows: formattedWorkflows
    });

  } catch (error) {
    console.error('Recent workflows API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}