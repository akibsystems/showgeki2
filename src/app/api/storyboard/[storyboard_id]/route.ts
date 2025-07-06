import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Storyboard } from '@/types/workflow';

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

// GET: ストーリーボード情報取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyboard_id: string }> }
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

    const { storyboard_id } = await params;

    // ストーリーボードを取得
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .select('*')
      .eq('id', storyboard_id)
      .eq('uid', uid)
      .single();

    if (error || !storyboard) {
      return NextResponse.json(
        { error: 'ストーリーボードが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ storyboard });

  } catch (error) {
    console.error('ストーリーボード取得API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT: ストーリーボード情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storyboard_id: string }> }
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

    const { storyboard_id } = await params;
    const body = await request.json();
    const { 
      title, 
      status, 
      summary_data,
      acts_data,
      characters_data,
      scenes_data,
      audio_data,
      style_data,
      caption_data,
      mulmoscript
    } = body;

    // バリデーション
    if (status !== undefined && !['draft', 'completed', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'ステータスが無効です' },
        { status: 400 }
      );
    }

    // 更新オブジェクトを構築
    const updates: Partial<Storyboard> = {};
    if (title !== undefined) updates.title = title?.trim() || null;
    if (status !== undefined) updates.status = status;
    if (summary_data !== undefined) updates.summary_data = summary_data;
    if (acts_data !== undefined) updates.acts_data = acts_data;
    if (characters_data !== undefined) updates.characters_data = characters_data;
    if (scenes_data !== undefined) updates.scenes_data = scenes_data;
    if (audio_data !== undefined) updates.audio_data = audio_data;
    if (style_data !== undefined) updates.style_data = style_data;
    if (caption_data !== undefined) updates.caption_data = caption_data;
    if (mulmoscript !== undefined) updates.mulmoscript = mulmoscript;

    // ストーリーボードを更新
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .update(updates)
      .eq('id', storyboard_id)
      .eq('uid', uid)
      .select()
      .single();

    if (error || !storyboard) {
      return NextResponse.json(
        { error: 'ストーリーボードの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ storyboard });

  } catch (error) {
    console.error('ストーリーボード更新API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE: ストーリーボード削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyboard_id: string }> }
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

    const { storyboard_id } = await params;

    // ストーリーボードを削除（関連するworkflowもカスケード削除される）
    const { error } = await supabase
      .from('storyboards')
      .delete()
      .eq('id', storyboard_id)
      .eq('uid', uid);

    if (error) {
      return NextResponse.json(
        { error: 'ストーリーボードの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'ストーリーボードが削除されました' },
      { status: 200 }
    );

  } catch (error) {
    console.error('ストーリーボード削除API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}