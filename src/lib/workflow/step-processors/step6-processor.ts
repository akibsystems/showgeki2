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
  try {
    // storyboardから既存のデータを取得
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .single();

    if (error || !storyboard) {
      throw new Error('ストーリーボードの取得に失敗しました');
    }

    // workflowからStep4の編集済みプロンプトを取得
    const { data: workflow } = await supabase
      .from('workflows')
      .select('step4_out')
      .eq('id', workflowId)
      .single();

    const step4Output = workflow?.step4_out as any;

    // 字幕データを更新
    const updatedCaptionData: CaptionData = {
      enabled: step6Output.userInput.caption.enabled,
      language: step6Output.userInput.caption.language,
      styles: step6Output.userInput.caption.styles
    };

    // 音声データを更新（generate-script/route.tsが期待する形式に合わせる）
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

    // storyboardを更新（MulmoScript生成前に必要）
    const updatedStoryboard = {
      ...storyboard,
      caption_data: updatedCaptionData,
      audio_data: updatedAudioData
    };

    // Step7と同じ方法でMulmoScriptを生成
    const mulmoScript = generateMulmoScriptFromStoryboard(updatedStoryboard, step4Output);
    //console.log("mulmoScript:", mulmoScript);

    // storyboardを更新
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
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // サムネイル画像を生成
    const thumbnails = await generateThumbnails(storyboard.scenes_data?.scenes || []);

    // Step7Input を構築
    const step7Input: Step7Input = {
      title: storyboard.title || 'untitled',
      description: storyboard.summary_data?.description || '',
      thumbnails,
      estimatedDuration: storyboard.summary_data?.estimatedDuration || 120,
      preview: mulmoScript
    };

    return step7Input;

  } catch (error) {
    console.error('Step7入力生成エラー:', error);
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