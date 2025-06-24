import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('story_id');

    if (storyId) {
      // 特定のストーリーのレビューを取得
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('story_id', storyId.toUpperCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'レビューの取得に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json(reviews || []);
    } else {
      // 全レビューを取得（ストーリー情報も含む）
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
          *,
          stories (
            id,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'レビューの取得に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json(reviews || []);
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}