import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMulmoScriptFromStoryboard as generateMulmoScript } from '@/lib/workflow/mulmoscript-generator';
import type { MulmoScript, Storyboard } from '@/types/workflow';
// import { generateMulmoscriptWithOpenAI, type ScriptGenerationOptions } from '@/lib/openai-client';
// import type { Story } from '@/lib/schemas';

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

// POST: MulmoScript生成と動画作成開始
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflow_id: string }> }
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

    const { workflow_id } = await params;

    // ワークフローを取得（Step4の編集済みデータも含む）
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        storyboard_id,
        uid,
        status,
        step4_out,
        storyboards (
          id,
          uid,
          title,
          status,
          summary_data,
          acts_data,
          characters_data,
          scenes_data,
          audio_data,
          style_data,
          caption_data
        )
      `)
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      );
    }

    const storyboard = workflow.storyboards as unknown as Storyboard;

    if (!storyboard) {
      return NextResponse.json(
        { error: 'ストーリーボードが見つかりません' },
        { status: 404 }
      );
    }

    // デバッグ: storyboard.scenes_dataの内容を確認
    console.log('[Script Generation Debug] storyboard.scenes_data:', JSON.stringify(storyboard.scenes_data, null, 2));
    console.log('[Script Generation Debug] workflow.step4_out:', JSON.stringify(workflow.step4_out, null, 2));

    // storyboardのデータから直接MulmoScriptを生成
    const mulmoScript = generateMulmoScript(storyboard, workflow.step4_out);

    // ストーリーボードにMulmoScriptを保存
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        mulmoscript: mulmoScript,
        status: 'completed'
      })
      .eq('id', storyboard.id);

    if (updateError) {
      console.error('MulmoScript保存エラー:', updateError);
      return NextResponse.json(
        { error: 'MulmoScriptの保存に失敗しました' },
        { status: 500 }
      );
    }

    // 新しいビデオエントリを作成
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        story_id: storyboard.id,
        uid: uid,
        status: 'queued',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (videoError || !video) {
      console.error('ビデオ作成エラー:', videoError);
      return NextResponse.json(
        { error: 'ビデオの作成に失敗しました' },
        { status: 500 }
      );
    }

    // ワークフローのステータスを完了に更新
    await supabase
      .from('workflows')
      .update({ status: 'completed' })
      .eq('id', workflow_id);

    // Webhookを送信（非同期で実行し、レスポンスを待たない）
    if (process.env.CLOUD_RUN_WEBHOOK_URL) {
      const webhookPayload = {
        type: 'video_generation',
        payload: {
          video_id: video.id,
          story_id: storyboard.id,
          uid: uid,
          title: storyboard.title || '無題の作品',
          text_raw: storyboard.summary_data?.description || '',
          script_json: mulmoScript
        }
      };

      // Webhookを非同期で送信（レスポンスを待たない）
      fetch(process.env.CLOUD_RUN_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      }).then(() => {
        console.log('Webhook sent successfully for video:', video.id);
      }).catch((webhookError) => {
        console.error('Webhook送信エラー:', webhookError);
        // Webhookエラーは無視
      });
    }

    return NextResponse.json({
      success: true,
      storyboardId: storyboard.id,
      videoId: video.id,
    });

  } catch (error) {
    console.error('スクリプト生成API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}