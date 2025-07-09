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

// GET: storyboards一覧取得
export async function GET(request: NextRequest) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    // storyboardsを取得
    const { data: storyboards, error: storyboardsError } = await supabase
      .from('storyboards')
      .select('*')
      .eq('uid', uid)
      .order('created_at', { ascending: false });

    if (storyboardsError) {
      console.error('Error fetching storyboards:', storyboardsError);
      return NextResponse.json(
        { error: 'Failed to fetch storyboards' },
        { status: 500 }
      );
    }

    // 各storyboardに対してworkflowとvideoの情報を取得
    const storyboardsWithRelations = await Promise.all(
      (storyboards || []).map(async (storyboard) => {
        // workflowを取得
        const { data: workflows } = await supabase
          .from('workflows')
          .select('id, status')
          .eq('storyboard_id', storyboard.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // videoを取得（story_idがstoryboard.idと一致するもの）
        const { data: videos } = await supabase
          .from('videos')
          .select('id, status')
          .eq('story_id', storyboard.id)
          .order('created_at', { ascending: false });
        
        return {
          ...storyboard,
          hasVideo: videos && videos.length > 0,
          workflow: workflows?.[0] || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        storyboards: storyboardsWithRelations
      }
    });

  } catch (error) {
    console.error('Storyboards API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}