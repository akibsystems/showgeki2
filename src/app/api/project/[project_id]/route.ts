import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Project } from '@/types/workflow';

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

// GET: プロジェクト情報取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string }> }
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

    const { project_id } = await params;

    // プロジェクトを取得
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('uid', uid)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('プロジェクト取得API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT: プロジェクト情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string }> }
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

    const { project_id } = await params;
    const body = await request.json();
    const { name, description, status } = body;

    // バリデーション
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'プロジェクト名が無効です' },
        { status: 400 }
      );
    }

    if (status !== undefined && !['active', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'ステータスが無効です' },
        { status: 400 }
      );
    }

    // 更新オブジェクトを構築
    const updates: Partial<Project> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (status !== undefined) updates.status = status;

    // プロジェクトを更新
    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', project_id)
      .eq('uid', uid)
      .select()
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: 'プロジェクトの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('プロジェクト更新API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE: プロジェクト削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string }> }
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

    const { project_id } = await params;

    // プロジェクトを削除（関連するstoryboardsとworkflowsもカスケード削除される）
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project_id)
      .eq('uid', uid);

    if (error) {
      return NextResponse.json(
        { error: 'プロジェクトの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'プロジェクトが削除されました' },
      { status: 200 }
    );

  } catch (error) {
    console.error('プロジェクト削除API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}