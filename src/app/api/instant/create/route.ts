import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processInstantMode } from '@/lib/instant/instant-generator';
import type { InstantModeInput } from '@/types/instant';

export async function POST(req: NextRequest) {
  console.log('[InstantCreate] ===== POST request received =====');
  console.log('[InstantCreate] Request time:', new Date().toISOString());
  
  try {
    const uid = req.headers.get('X-User-UID');
    console.log('[InstantCreate] User UID:', uid);
    
    if (!uid) {
      console.log('[InstantCreate] No UID provided, returning 401');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body: InstantModeInput = await req.json();
    console.log('[InstantCreate] Request body:', JSON.stringify(body, null, 2));
    console.log('[InstantCreate] Direct mode enabled:', process.env.INSTANT_MODE_DIRECT_GENERATION === 'true');
    
    // バリデーション
    if (!body.storyText || body.storyText.trim().length === 0) {
      console.log('[InstantCreate] Story text validation failed');
      return NextResponse.json(
        { error: 'ストーリーを入力してください' },
        { status: 400 }
      );
    }
    console.log('[InstantCreate] Story text length:', body.storyText.length);

    const supabase = await createAdminClient();
    console.log('[InstantCreate] Supabase client created');

    // 1. プロジェクトを作成
    console.log('[InstantCreate] Creating project...');
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
      console.error('[InstantCreate] Failed to create project:', projectError);
      console.error('[InstantCreate] Project error details:', JSON.stringify(projectError, null, 2));
      return NextResponse.json(
        { error: 'プロジェクトの作成に失敗しました' },
        { status: 500 }
      );
    }
    console.log('[InstantCreate] Project created:', { id: project.id, name: project.name });

    // 2. ストーリーボードを作成
    console.log('[InstantCreate] Creating storyboard...');
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
      console.error('[InstantCreate] Failed to create storyboard:', storyboardError);
      console.error('[InstantCreate] Storyboard error details:', JSON.stringify(storyboardError, null, 2));
      return NextResponse.json(
        { error: 'ストーリーボードの作成に失敗しました' },
        { status: 500 }
      );
    }
    console.log('[InstantCreate] Storyboard created:', { id: storyboard.id, title: storyboard.title });

    // 3. workflow レコードを作成（インスタントモード用）
    console.log('[InstantCreate] Creating workflow...');
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
    console.log('[InstantCreate] Starting processInstantMode in background...');
    processInstantMode({
      workflowId: workflow.id,
      storyboardId: storyboard.id,
      uid,
      input: body
    }).catch(error => {
      console.error('[InstantCreate] Instant Mode processing failed:', error);
      console.error('[InstantCreate] Error stack:', error.stack);
      // エラーはinstant-generatorで処理される
    });
    console.log('[InstantCreate] Background processing started');

    // 5. 即座にレスポンスを返す
    console.log('[InstantCreate] Returning response with instantId:', workflow.id);
    console.log('[InstantCreate] ===== Request completed successfully =====');
    return NextResponse.json({
      instantId: workflow.id,
      message: '動画生成を開始しました'
    });

  } catch (error) {
    console.error('[InstantCreate] ===== ERROR in create =====');
    console.error('[InstantCreate] Error:', error);
    console.error('[InstantCreate] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[InstantCreate] ==========================');
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}