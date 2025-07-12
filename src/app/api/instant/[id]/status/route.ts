import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { INSTANT_STEPS } from '@/types/instant';
import type { InstantGenerationStatus } from '@/types/instant';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const uid = req.headers.get('X-User-UID');
    
    if (!uid) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // instant_generation を取得
    const { data, error } = await supabase
      .from('instant_generations')
      .select('*')
      .eq('id', id)
      .eq('uid', uid)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '生成情報が見つかりません' },
        { status: 404 }
      );
    }

    // レスポンスを構築
    const response: InstantGenerationStatus = {
      status: data.status,
      currentStep: data.current_step,
      progress: data.metadata?.progress || 0,
      message: data.current_step ? INSTANT_STEPS[data.current_step as keyof typeof INSTANT_STEPS] : undefined,
      error: data.error_message,
      videoId: data.metadata?.video_id
    };

    // 完了している場合は、動画情報も含める
    if (data.status === 'completed' && data.storyboard_id) {
      const { data: videos } = await supabase
        .from('videos')
        .select('id, video_url, status')
        .eq('story_id', data.storyboard_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (videos && videos.length > 0) {
        response.videoId = videos[0].id;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '状態の確認に失敗しました' },
      { status: 500 }
    );
  }
}