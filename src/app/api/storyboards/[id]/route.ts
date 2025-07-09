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

// PATCH: storyboardの部分更新（MulmoScript更新用）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();

    // 所有者確認のため、まずstoryboardを取得
    const { data: storyboard, error: fetchError } = await supabase
      .from('storyboards')
      .select('id, uid')
      .eq('id', id)
      .single();

    if (fetchError || !storyboard) {
      return NextResponse.json(
        { error: 'ストーリーボードが見つかりません' },
        { status: 404 }
      );
    }

    // 所有者チェック
    if (storyboard.uid !== uid) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 更新可能なフィールドのみを抽出
    const allowedFields = ['mulmoscript', 'title', 'caption_data', 'audio_data'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // 更新時刻を追加
    updateData.updated_at = new Date().toISOString();

    // storyboardを更新
    const { error: updateError } = await supabase
      .from('storyboards')
      .update(updateData)
      .eq('id', id)
      .eq('uid', uid);

    if (updateError) {
      console.error('ストーリーボード更新エラー:', updateError);
      return NextResponse.json(
        { error: 'ストーリーボードの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'ストーリーボードを更新しました'
    });

  } catch (error) {
    console.error('Storyboard update error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}