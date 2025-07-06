import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Workflow } from '@/types/workflow';

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

// GET: ワークフロー情報取得
export async function GET(
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

    // ワークフローを取得
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('id, storyboard_id, uid, current_step, status, created_at, updated_at')
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });

  } catch (error) {
    console.error('ワークフロー取得API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE: ワークフロー削除（将来実装）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
) {
  return NextResponse.json(
    { error: 'この機能は準備中です' },
    { status: 501 }
  );
}