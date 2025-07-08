import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { 
  Step5Output, 
  Step6Input,
  AudioData 
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
 * Step5の出力からStep6の入力を生成（BGM & 字幕設定）
 */
export async function generateStep6Input(
  workflowId: string,
  storyboardId: string,
  step5Output: Step5Output
): Promise<Step6Input> {
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

    // 音声データを更新
    const updatedAudioData: AudioData = {
      voiceSettings: step5Output.userInput.voiceSettings,
      bgmSettings: {
        defaultBgm: 'default',
        bgmVolume: 0.3
      }
    };

    // storyboardを更新
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        audio_data: updatedAudioData,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // AIでBGM提案を生成
    const bgmSuggestion = await generateBGMSuggestion(storyboard);

    // Step6Input を構築
    const step6Input: Step6Input = {
      suggestedBgm: bgmSuggestion.suggestedBgm,
      bgmOptions: bgmSuggestion.bgmOptions,
      captionSettings: {
        enabled: true,
        language: 'ja',
        styles: [
          'font-size: 48px',
          'color: white',
          'text-shadow: 2px 2px 4px rgba(0,0,0,0.8)',
          'font-family: "Noto Sans JP", sans-serif',
          'font-weight: bold'
        ]
      }
    };

    return step6Input;

  } catch (error) {
    console.error('Step6入力生成エラー:', error);
    throw error;
  }
}

/**
 * AIを使用してBGM提案を生成
 */
async function generateBGMSuggestion(storyboard: any): Promise<{
  suggestedBgm: string;
  bgmOptions: string[];
}> {
  const prompt = `
以下の物語情報からBGMを提案してください：

## 作品情報
タイトル: ${storyboard.title}
ジャンル: ${storyboard.summary_data?.genre || 'ドラマ'}
概要: ${storyboard.summary_data?.description || ''}

## 利用可能なBGMオプション
- dramatic: ドラマチックで感動的な楽曲
- peaceful: 平和で穏やかな楽曲
- adventure: 冒険的でエキサイティングな楽曲
- romantic: ロマンチックで美しい楽曲
- mysterious: 神秘的で不思議な楽曲
- comedic: コメディカルで楽しい楽曲
- epic: 壮大で英雄的な楽曲
- melancholic: 哀愁的で切ない楽曲

## 生成要件
物語の雰囲気に最も適したBGMを1つ選択し、
関連するオプションも含めて提案してください。

JSONフォーマットで出力してください：
{
  "suggestedBgm": "BGM名",
  "bgmOptions": ["BGM1", "BGM2", "BGM3", "BGM4", "BGM5"]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      {
        role: 'system',
        content: 'あなたは音楽の専門家です。物語に適したBGMを提案してください。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  // 結果を検証・補完
  // AudioSettings.tsxで定義されているBGM URLを使用
  const defaultBgmOptions = [
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story001.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story003.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story004.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story005.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/theme001.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/vibe001.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/voice001.mp3',
  ];
  
  // デフォルトは story002.mp3 (Rise and Shine)
  const defaultSuggestedBgm = 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3';
  
  return {
    suggestedBgm: result.suggestedBgm || defaultSuggestedBgm,
    bgmOptions: defaultBgmOptions // 常にデフォルトのBGMリストを使用
  };
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class BGMGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BGMGenerationError';
  }
}