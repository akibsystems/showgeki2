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

// PUT: ワークフローの現在のステップを更新
export async function PUT(
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
    const { step } = await request.json();

    // ステップ番号の検証
    if (!step || step < 1 || step > 7) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      );
    }

    // ワークフローの存在確認と所有者チェック
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('id, uid, current_step')
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      );
    }

    // current_stepを更新（最後に訪れたステップを記録）
    const { error: updateError } = await supabase
      .from('workflows')
      .update({ 
        current_step: step,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflow_id)
      .eq('uid', uid);

    if (updateError) {
      console.error('ワークフロー更新エラー:', updateError);
      return NextResponse.json(
        { error: 'ワークフローの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      current_step: step
    });

  } catch (error) {
    console.error('Current step update error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}