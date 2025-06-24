import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { story_text } = await request.json();

    if (!story_text || !story_text.trim()) {
      return NextResponse.json(
        { error: 'ストーリーが入力されていません' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('stories')
      .insert([
        {
          story_text: story_text.trim(),
          is_completed: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'ストーリーの保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}