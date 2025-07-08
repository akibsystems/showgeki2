import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
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

    // 字幕データを更新
    const updatedCaptionData: CaptionData = {
      enabled: step6Output.userInput.caption.enabled,
      language: step6Output.userInput.caption.language,
      styles: step6Output.userInput.caption.styles
    };

    // 音声データを更新
    const updatedAudioData: AudioData = {
      ...storyboard.audio_data,
      bgmSettings: {
        defaultBgm: step6Output.userInput.bgm.selected,
        customBgm: step6Output.userInput.bgm.customBgm ? {
          url: step6Output.userInput.bgm.customBgm
        } : undefined,
        bgmVolume: step6Output.userInput.bgm.volume
      }
    };

    // 最終的なMulmoScriptを生成
    const mulmoScript = await generateFinalMulmoScript(storyboard, updatedCaptionData, updatedAudioData);

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
 * 最終的なMulmoScriptを生成
 */
async function generateFinalMulmoScript(
  storyboard: any,
  captionData: CaptionData,
  audioData: AudioData
): Promise<MulmoScript> {
  const scenes = storyboard.scenes_data?.scenes || [];
  const characters = storyboard.characters_data?.characters || [];
  const styleData = storyboard.style_data || {};

  // beatsを生成
  const beats = scenes.flatMap((scene: any) => 
    scene.dialogue.map((dialog: any) => ({
      text: dialog.text,
      speaker: dialog.speaker,
      imagePrompt: scene.imagePrompt,
      image: scene.imageUrl ? { source: { url: scene.imageUrl } } : undefined
    }))
  );

  // speakersを生成
  const speakers: Record<string, any> = {};
  characters.forEach((char: any) => {
    const voiceSettings = audioData.voiceSettings?.[char.id];
    speakers[char.name] = {
      voiceId: voiceSettings?.voiceType || 'alloy',
      displayName: {
        ja: char.name,
        en: char.name
      }
    };
  });

  // 最終的なMulmoScriptを構築
  const mulmoScript: MulmoScript = {
    $mulmocast: { version: '1.0' },
    title: storyboard.title || 'untitled',
    lang: 'ja',
    beats,
    speechParams: {
      provider: 'openai',
      speakers
    },
    imageParams: {
      style: styleData.imageStyle || 'アニメ風、ソフトパステルカラー、繊細な線画、シネマティック照明',
      images: generateImageReferences(storyboard.scenes_data?.scenes || [])
    },
    audioParams: audioData.bgmSettings?.defaultBgm ? {
      bgm: audioData.bgmSettings.customBgm ? 
        { kind: 'url', url: audioData.bgmSettings.customBgm.url } :
        { kind: 'url', url: `bgm/${audioData.bgmSettings.defaultBgm}.mp3` },
      bgmVolume: audioData.bgmSettings.bgmVolume || 0.3
    } : undefined,
    captionParams: captionData.enabled ? {
      lang: captionData.language,
      styles: captionData.styles || []
    } : undefined
  };

  return mulmoScript;
}

/**
 * 画像参照を生成
 */
function generateImageReferences(scenes: any[]): Record<string, any> {
  const imageReferences: Record<string, any> = {};
  
  scenes.forEach((scene: any, index: number) => {
    if (scene.imageUrl) {
      imageReferences[`scene-${index + 1}`] = {
        name: scene.title,
        source: { url: scene.imageUrl }
      };
    }
  });

  return imageReferences;
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