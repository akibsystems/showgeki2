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

// GET: ユーザーの利用統計を取得
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

    // 脚本数を取得
    const { count: scriptCount, error: scriptError } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('uid', uid);

    if (scriptError) {
      console.error('脚本カウントエラー:', scriptError);
    }

    // 動画数を取得
    const { count: videoCount, error: videoError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('uid', uid)
      .eq('status', 'completed');

    if (videoError) {
      console.error('動画カウントエラー:', videoError);
    }

    // 総再生時間を計算
    const { data: videos, error: durationError } = await supabase
      .from('videos')
      .select('duration_sec')
      .eq('uid', uid)
      .eq('status', 'completed');

    let totalDuration = 0;
    if (!durationError && videos) {
      totalDuration = videos.reduce((sum, video) => {
        return sum + (video.duration_sec || 0);
      }, 0);
    }

    // ワークフロー数を取得（新しいシステム）
    const { count: workflowCount, error: workflowError } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true })
      .eq('uid', uid);

    if (workflowError) {
      console.error('ワークフローカウントエラー:', workflowError);
    }

    return NextResponse.json({
      stats: {
        totalScripts: scriptCount || 0,
        totalVideos: videoCount || 0,
        totalDurationSec: totalDuration,
        totalWorkflows: workflowCount || 0
      }
    });

  } catch (error) {
    console.error('Stats API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}