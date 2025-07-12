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

    // 3. instant_generation レコードを作成
    const { data: instantGeneration, error: instantError } = await supabase
      .from('instant_generations')
      .insert({
        uid,
        storyboard_id: storyboard.id,
        status: 'pending',
        metadata: { 
          input: body,
          progress: 0
        }
      })
      .select()
      .single();

    if (instantError) {
      console.error('Failed to create instant generation:', instantError);
      return NextResponse.json(
        { error: 'Instant Mode の開始に失敗しました' },
        { status: 500 }
      );
    }

    // 4. バックグラウンドで処理を開始（非同期）
    processInstantMode({
      instantId: instantGeneration.id,
      storyboardId: storyboard.id,
      uid,
      input: body
    }).catch(error => {
      console.error('Instant Mode processing failed:', error);
      // エラーはinstant-generatorで処理される
    });

    // 5. 即座にレスポンスを返す
    return NextResponse.json({
      instantId: instantGeneration.id,
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