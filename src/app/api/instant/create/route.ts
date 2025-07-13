import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processInstantMode } from '@/lib/instant/instant-generator';
import type { InstantModeInput } from '@/types/instant';

export async function POST(req: NextRequest) {
  try {
    const uid = req.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body: InstantModeInput = await req.json();
    
    // バリデーション
    if (!body.storyText || body.storyText.trim().length === 0) {
      return NextResponse.json(
        { error: 'ストーリーを入力してください' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // 1. プロジェクトを作成
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        uid,
        name: body.title || `Instant Mode - ${new Date().toLocaleString('ja-JP')}`,
        description: 'Instant Modeで作成された動画'
      })
      .select()
      .single();

    if (projectError) {
      console.error('Failed to create project:', projectError);
      return NextResponse.json(
        { error: 'プロジェクトの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 2. ストーリーボードを作成
    const { data: storyboard, error: storyboardError } = await supabase
      .from('storyboards')
      .insert({
        project_id: project.id,
        uid,
        title: body.title || '無題',
        status: 'draft'
      })
      .select()
      .single();

    if (storyboardError) {
      console.error('Failed to create storyboard:', storyboardError);
      return NextResponse.json(
        { error: 'ストーリーボードの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 3. workflow レコードを作成（インスタントモード用）
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        storyboard_id: storyboard.id,
        uid,
        mode: 'instant',
        status: 'active',
        current_step: 1,
        progress: 0,
        instant_metadata: { 
          input: body
        }
      })
      .select()
      .single();

    if (workflowError) {
      console.error('[InstantCreate] Failed to create workflow:', workflowError);
      return NextResponse.json(
        { error: 'Instant Mode の開始に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[InstantCreate] Created workflow:', {
      id: workflow.id,
      storyboard_id: workflow.storyboard_id,
      uid: workflow.uid,
      mode: workflow.mode
    });

    // 4. バックグラウンドで処理を開始（非同期）
    processInstantMode({
      workflowId: workflow.id,
      storyboardId: storyboard.id,
      uid,
      input: body
    }).catch(error => {
      console.error('Instant Mode processing failed:', error);
      // エラーはinstant-generatorで処理される
    });

    // 5. 即座にレスポンスを返す
    return NextResponse.json({
      instantId: workflow.id,
      message: '動画生成を開始しました'
    });

  } catch (error) {
    console.error('Instant Mode create error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}