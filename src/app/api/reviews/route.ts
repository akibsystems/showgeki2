import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { story_id, review_text = '', rating } = await request.json();

    // バリデーション
    if (!story_id || !rating) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    if (story_id.length !== 8) {
      return NextResponse.json(
        { error: '無効な登録番号です' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: '評価は1〜5の範囲で入力してください' },
        { status: 400 }
      );
    }

    if (review_text && review_text.trim().length > 1000) {
      return NextResponse.json(
        { error: '感想は1000文字以内で入力してください' },
        { status: 400 }
      );
    }

    // ストーリーの存在確認
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id, is_completed')
      .eq('id', story_id.toUpperCase())
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: '指定された登録番号は見つかりませんでした' },
        { status: 404 }
      );
    }

    if (!story.is_completed) {
      return NextResponse.json(
        { error: 'まだ完成していない5幕劇には感想を投稿できません' },
        { status: 400 }
      );
    }

    // 感想を保存
    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          story_id: story_id.toUpperCase(),
          review_text: review_text ? review_text.trim() : '',
          rating: rating,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '感想の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      review: data
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}