import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { INSTANT_STEPS } from '@/types/instant';
import type { InstantGenerationStatus } from '@/types/instant';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const uid = req.headers.get('X-User-UID');
    
    console.log('[InstantStatus] Checking status for:', { id, uid });
    
    if (!uid) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // workflowsテーブルから情報を取得
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        *,
        storyboards!inner(
          id,
          title
        )
      `)
      .eq('id', id)
      .eq('uid', uid)
      .eq('mode', 'instant')
      .single();

    if (workflowError || !workflow) {
      console.error('[InstantStatus] Workflow fetch error:', workflowError);
      
      // デバッグ用：全てのワークフローを確認
      const { data: allWorkflows } = await supabase
        .from('workflows')
        .select('id, uid, mode, storyboard_id')
        .eq('id', id);
      
      console.log('[InstantStatus] Debug - All workflows with this ID:', allWorkflows);
      
      return NextResponse.json(
        { error: 'ワークフロー情報が見つかりません' },
        { status: 404 }
      );
    }

    // videosテーブルから関連する動画を取得
    // videosはstory_id（storyboard_id）で関連付けられている
    const { data: videos } = await supabase
      .from('videos')
      .select('id, url, status')
      .eq('story_id', workflow.storyboard_id)
      .eq('uid', uid)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const video = videos?.[0];
    
    // ステータスの判定
    let status: 'pending' | 'processing' | 'completed' | 'failed';
    let message = '';
    
    if (workflow.error_message) {
      status = 'failed';
      message = workflow.error_message;
    } else if (workflow.status === 'completed' && video?.status === 'completed') {
      status = 'completed';
      message = '動画生成が完了しました';
    } else if (workflow.instant_step) {
      status = 'processing';
      message = INSTANT_STEPS[workflow.instant_step as keyof typeof INSTANT_STEPS] || '処理中...';
    } else {
      status = 'pending';
      message = '準備中...';
    }

    const response: InstantGenerationStatus = {
      status,
      currentStep: workflow.instant_step,
      progress: workflow.progress || 0,
      message,
      error: workflow.error_message,
      videoId: video?.id
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '状態の確認に失敗しました' },
      { status: 500 }
    );
  }
}