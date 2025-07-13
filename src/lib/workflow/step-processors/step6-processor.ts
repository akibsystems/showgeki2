import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateMulmoScriptFromStoryboard } from '@/lib/workflow/mulmoscript-generator';
import type {
  Step6Output,
  Step7Input,
  CaptionData,
  AudioData,
  MulmoScript
} from '@/types/workflow';

// Supabase クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Step6の出力からStep7の入力を生成（最終確認用データ準備）
 */
export async function generateStep7Input(
  workflowId: string,
  storyboardId: string,
  step6Output: Step6Output
): Promise<Step7Input> {
  console.log(`[step6-processor] generateStep7Input called for workflow ${workflowId}, storyboard ${storyboardId}`);
  console.log(`[step6-processor] Step6 output received:`, JSON.stringify(step6Output, null, 2));
  
  try {
    // storyboardから既存のデータを取得
    console.log(`[step6-processor] Fetching storyboard data from database...`);
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .single();

    if (error || !storyboard) {
      console.error(`[step6-processor] Error fetching storyboard:`, error);
      throw new Error('ストーリーボードの取得に失敗しました');
    }
    console.log(`[step6-processor] Storyboard fetched successfully`);

    // workflowからStep4の編集済みプロンプトを取得
    console.log(`[step6-processor] Fetching Step4 output from workflow...`);
    const { data: workflow } = await supabase
      .from('workflows')
      .select('step4_out')
      .eq('id', workflowId)
      .single();

    const step4Output = workflow?.step4_out as any;
    console.log(`[step6-processor] Step4 output fetched:`, JSON.stringify(step4Output, null, 2));

    // 字幕データを更新
    console.log(`[step6-processor] Updating caption data...`);
    const updatedCaptionData: CaptionData = {
      enabled: step6Output.userInput.caption.enabled,
      language: step6Output.userInput.caption.language,
      styles: step6Output.userInput.caption.styles
    };
    console.log(`[step6-processor] Updated caption data:`, JSON.stringify(updatedCaptionData, null, 2));

    // 音声データを更新（generate-script/route.tsが期待する形式に合わせる）
    console.log(`[step6-processor] Updating audio data...`);
    const updatedAudioData: AudioData = {
      ...storyboard.audio_data,
      bgm: {
        selected: step6Output.userInput.bgm.selected,
        customBgm: step6Output.userInput.bgm.customBgm,
        volume: step6Output.userInput.bgm.volume
      },
      // 後方互換性のためbgmSettingsも保持
      bgmSettings: {
        defaultBgm: step6Output.userInput.bgm.selected,
        customBgm: step6Output.userInput.bgm.customBgm ? {
          url: step6Output.userInput.bgm.customBgm
        } : undefined,
        bgmVolume: step6Output.userInput.bgm.volume
      }
    };
    console.log(`[step6-processor] Updated audio data:`, JSON.stringify(updatedAudioData, null, 2));

    // storyboardを更新（MulmoScript生成前に必要）
    console.log(`[step6-processor] Creating updated storyboard for MulmoScript generation...`);
    const updatedStoryboard = {
      ...storyboard,
      caption_data: updatedCaptionData,
      audio_data: updatedAudioData
    };

    // Step7と同じ方法でMulmoScriptを生成
    console.log(`[step6-processor] Generating MulmoScript...`);
    const mulmoScript = generateMulmoScriptFromStoryboard(updatedStoryboard, step4Output);
    console.log(`[step6-processor] MulmoScript generated:`, JSON.stringify(mulmoScript, null, 2));

    // storyboardを更新
    console.log(`[step6-processor] Updating storyboard in database...`);
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        caption_data: updatedCaptionData,
        audio_data: updatedAudioData,
        mulmoscript: mulmoScript,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      console.error(`[step6-processor] Error updating storyboard:`, updateError);
      throw new Error('ストーリーボードの更新に失敗しました');
    }
    console.log(`[step6-processor] Storyboard updated successfully`);

    // サムネイル画像を生成
    console.log(`[step6-processor] Generating thumbnails...`);
    const thumbnails = await generateThumbnails(storyboard.scenes_data?.scenes || []);
    console.log(`[step6-processor] Thumbnails generated:`, JSON.stringify(thumbnails, null, 2));

    // Step7Input を構築
    console.log(`[step6-processor] Building Step7Input...`);
    const step7Input: Step7Input = {
      title: storyboard.title || 'untitled',
      description: storyboard.summary_data?.description || '',
      thumbnails,
      estimatedDuration: storyboard.summary_data?.estimatedDuration || 120,
      preview: mulmoScript
    };
    console.log(`[step6-processor] Step7Input built:`, JSON.stringify(step7Input, null, 2));

    return step7Input;

  } catch (error) {
    console.error(`[step6-processor] Error in generateStep7Input:`, error);
    console.error(`[step6-processor] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}


/**
 * サムネイル画像を生成
 */
async function generateThumbnails(scenes: any[]): Promise<Array<{
  sceneId: string;
  imageUrl: string;
}>> {
  console.log(`[step6-processor] generateThumbnails called with ${scenes.length} scenes`);
  const thumbnails = [];

  for (const scene of scenes.slice(0, 3)) { // 最初の3シーンのみ
    if (scene.imageUrl) {
      thumbnails.push({
        sceneId: scene.id,
        imageUrl: scene.imageUrl
      });
    } else {
      // 画像がない場合はプレースホルダー
      thumbnails.push({
        sceneId: scene.id,
        imageUrl: '/placeholder-thumbnail.jpg'
      });
    }
  }

  return thumbnails;
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class FinalGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FinalGenerationError';
  }
}