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
        defaultBgm: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3', // Rise and Shine
        bgmVolume: 0.5
      }
    };

    // キャラクターデータのvoiceTypeも更新
    const charactersWithUpdatedVoice = storyboard.characters_data?.characters.map((char: any) => {
      const voiceSetting = step5Output.userInput.voiceSettings[char.id];
      return {
        ...char,
        voiceType: voiceSetting?.voiceType || char.voiceType || 'alloy'
      };
    }) || [];

    // storyboardを更新
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        audio_data: updatedAudioData,
        characters_data: {
          characters: charactersWithUpdatedVoice
        },
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
  const systemPrompt = createBGMSystemPrompt();
  const userPrompt = createBGMUserPrompt(storyboard);

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 32000,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // 結果を検証
  if (!result.suggestedType) {
    throw new BGMGenerationError(
      'AIがBGM提案を生成できませんでした。物語の内容を確認してください。',
      'MISSING_BGM_SUGGESTION'
    );
  }

  // BGMタイプとURLのマッピング（AudioSettings.tsxより）
  const bgmTypeToUrl: Record<string, string> = {
    'none': 'none',
    'peaceful': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story001.mp3', // Whispered Melody
    'inspiring': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3', // Rise and Shine
    'emotional': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story003.mp3', // Chasing the Sunset
    'mysterious': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story004.mp3', // Whispering Keys
    'dramatic': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story005.mp3', // Whisper of Ivory
    'heroic': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/theme001.mp3', // Rise of the Flame
    'vibrant': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/vibe001.mp3', // Let It Vibe!
    'modern': 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/voice001.mp3', // 声をつなげ、今ここで
  };

  // AudioSettings.tsxで定義されているBGM URLを使用（'none'を除く）
  const defaultBgmOptions = [
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story001.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story003.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story004.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story005.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/theme001.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/vibe001.mp3',
    'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/voice001.mp3'
  ];

  // AIの提案をURLにマッピング
  const suggestedType = result.suggestedType;
  const suggestedBgm = bgmTypeToUrl[suggestedType] || 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3'; // デフォルト: Rise and Shine

  if (!suggestedBgm || suggestedBgm === 'none') {
    // 'none'の場合もデフォルトを使用
    return {
      suggestedBgm: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
      bgmOptions: defaultBgmOptions
    };
  }

  return {
    suggestedBgm: suggestedBgm,
    bgmOptions: defaultBgmOptions // 常にデフォルトのBGMリストを使用
  };
}

/**
 * BGM提案用のシステムプロンプトを作成
 */
function createBGMSystemPrompt(): string {
  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
ディレクターの指示をもとに、BGMを選択してください。

## 音楽選択の美学

### シェイクスピア的音楽演出
- **感情の潮流**: 物語の感情的な起伏を音楽で表現
- **劇的対比**: 静と動、光と影を音楽で描く
- **主題の象徴**: 作品の核心的メッセージを音楽で体現
- **観客との共鳴**: 心の琴線に触れる音楽選択

### 利用可能な音楽パレット
- **none**: BGMなし - 無音、対話と効果音のみ
- **peaceful**: Whispered Melody - 穏やかで優しい旋律、静かな始まりや内省的なシーン
- **inspiring**: Rise and Shine - 前向きで躍動的、希望に満ちた物語の展開
- **emotional**: Chasing the Sunset - 感動的でノスタルジック、クライマックスや別れのシーン
- **mysterious**: Whispering Keys - 静謐で神秘的、緊張感が漂うシーン
- **dramatic**: Whisper of Ivory - 荘厳で感情的、深い感情を表現する重要なシーン
- **heroic**: Rise of the Flame - 壮大で感動的、英雄的な物語や勝利のシーン
- **vibrant**: Let It Vibe! - エネルギッシュで楽しい、現代的で活気あるシーン
- **modern**: 声をつなげ、今ここで - 現代的でエモーショナル、日本の青春シーン

### 出力形式
{
  "suggestedType": "選択したBGMタイプ",
  "musicalRationale": "この音楽を選んだ演出意図"
}

## 重要な指示
- 物語の感情的クライマックスを音楽で支えること
- 全体の流れを考慮した音楽選択
- シェイクスピア的な普遍性と現代的な親しみやすさの融合
- 観客の心を動かす音楽演出
`;
}

/**
 * BGM提案用のユーザープロンプトを作成
 */
function createBGMUserPrompt(storyboard: any): string {
  return `## ディレクターからの指示
タイトル: ${storyboard.title}
ジャンル: ${storyboard.summary_data?.genre || 'ドラマ'}
概要: ${storyboard.summary_data?.description || ''}

## 物語の幕場構成
${storyboard.acts_data?.acts ? storyboard.acts_data.acts.map((act: any) =>
    `第${act.actNumber}幕: ${act.actTitle} - ${act.description || '詳細不明'}`
  ).join('\n') : '構成情報なし'}

この物語に最も適したBGMをJSONフォーマットで選択してください。`;
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