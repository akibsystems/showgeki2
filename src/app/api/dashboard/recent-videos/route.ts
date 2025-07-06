import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// SERVICE_ROLEキーを使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// GET: 最近の動画を取得
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

    // 最近の動画を取得（最新6件）
    const { data: videos, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('uid', uid)
      .order('created_at', { ascending: false })
      .limit(6);

    if (videoError) {
      console.error('動画取得エラー:', videoError);
      return NextResponse.json(
        { error: '動画の取得に失敗しました', details: videoError.message },
        { status: 500 }
      );
    }

    // 動画がない場合は空配列を返す
    if (!videos || videos.length === 0) {
      return NextResponse.json({
        videos: []
      });
    }

    // ストーリー情報を別途取得
    const storyIds = videos.map(v => v.story_id).filter(Boolean);
    let storiesMap: Record<string, any> = {};
    
    if (storyIds.length > 0) {
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('id, title, script_json')
        .in('id', storyIds);
      
      if (!storiesError && storiesData) {
        storiesData.forEach(story => {
          storiesMap[story.id] = story;
        });
      }
    }

    // サムネイルURLを含めてフォーマット
    const formattedVideos = videos.map(video => {
      const story = storiesMap[video.story_id];
      
      // タイトルを取得
      let title = '無題の動画';
      if (story?.title) {
        title = story.title;
      } else if (story?.script_json?.title) {
        title = story.script_json.title;
      }
      
      // サムネイルURLを生成（現時点では null）
      let thumbnailUrl = null;
      
      return {
        id: video.id,
        title,
        status: video.status || 'queued',
        url: video.url || null,
        thumbnailUrl,
        duration: video.duration_sec || null,
        createdAt: video.created_at,
        updatedAt: video.updated_at || video.created_at,
      };
    });

    return NextResponse.json({
      videos: formattedVideos
    });

  } catch (error) {
    console.error('Recent videos API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}