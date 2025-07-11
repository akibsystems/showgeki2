import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  Step4Output,
  Step5Input,
  ScenesData,
  StyleData
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
 * Step4の出力からStep5の入力を生成（音声生成用データ準備）
 */
export async function generateStep5Input(
  workflowId: string,
  storyboardId: string,
  step4Output: Step4Output
): Promise<Step5Input> {
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

    // シーンデータを更新
    const updatedScenesData: ScenesData = {
      scenes: step4Output.userInput.scenes.map(scene => ({
        ...scene,
        imageUrl: scene.customImage, // アップロードされた画像があれば設定
        actNumber: getActNumberForScene(scene.id, storyboard.acts_data?.acts || []),
        sceneNumber: getSceneNumberForScene(scene.id, storyboard.acts_data?.acts || []),
        title: getSceneTitleForScene(scene.id, storyboard.acts_data?.acts || [])
      }))
    };

    // storyboardを更新
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        scenes_data: updatedScenesData,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // AIで音声設定を生成
    const voiceSettings = await generateVoiceSettings(
      storyboard.characters_data?.characters || [],
      updatedScenesData.scenes
    );

    // charactersデータにsuggestedVoiceを追加
    const charactersWithVoice = storyboard.characters_data?.characters.map((char: any) => {
      const voiceSetting = voiceSettings.characters.find(v => v.id === char.id);
      return {
        ...char,
        voiceType: voiceSetting?.suggestedVoice || 'alloy'
      };
    }) || [];

    // charactersデータも更新
    const { error: charUpdateError } = await supabase
      .from('storyboards')
      .update({
        characters_data: {
          characters: charactersWithVoice
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (charUpdateError) {
      console.error('キャラクターデータの更新に失敗しました:', charUpdateError);
    }

    // Step5Input を構築
    const step5Input: Step5Input = {
      characters: voiceSettings.characters,
      scenes: voiceSettings.scenes
    };

    return step5Input;

  } catch (error) {
    console.error('Step5入力生成エラー:', error);
    throw error;
  }
}

/**
 * AIを使用して音声設定を生成
 */
async function generateVoiceSettings(
  characters: any[],
  scenes: any[]
): Promise<{
  characters: Array<{
    id: string;
    name: string;
    suggestedVoice: string;
  }>;
  scenes: Array<{
    id: string;
    title: string;
    dialogue: Array<{
      speaker: string;
      text: string;
      audioUrl?: string;
    }>;
  }>;
}> {
  const systemPrompt = createVoiceSystemPrompt();
  const userPrompt = createVoiceUserPrompt(characters);

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
  if (!result.voiceAssignments || !Array.isArray(result.voiceAssignments) || result.voiceAssignments.length === 0) {
    throw new VoiceGenerationError(
      'AIが音声キャスティングを生成できませんでした。キャラクター情報を確認してください。',
      'MISSING_VOICE_ASSIGNMENTS'
    );
  }

  const voiceAssignments = result.voiceAssignments;

  const processedCharacters = characters.map((char, index) => {
    const assignment = voiceAssignments.find((va: any) => va.characterId === char.id);
    if (!assignment || !assignment.suggestedVoice) {
      throw new VoiceGenerationError(
        `キャラクター「${char.name}」の音声キャスティングが見つかりません。`,
        'INCOMPLETE_VOICE_ASSIGNMENT'
      );
    }
    return {
      id: char.id,
      name: char.name,
      suggestedVoice: assignment.suggestedVoice
    };
  });

  const processedScenes = scenes.map(scene => ({
    id: scene.id,
    title: scene.title,
    dialogue: scene.dialogue.map((dialog: any) => ({
      speaker: dialog.speaker,
      text: dialog.text,
      audioUrl: undefined // 音声生成前なのでundefined
    }))
  }));

  return {
    characters: processedCharacters,
    scenes: processedScenes
  };
}

/**
 * 音声キャスティング用のシステムプロンプトを作成
 */
function createVoiceSystemPrompt(): string {
  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
ディレクターの指示をもとに、キャラクターの声を選択してください。

## 音声キャスティングの哲学

### シェイクスピア的声の演出
- **声の個性**: 役柄の本質を声質で表現する技法
- **感情の振幅**: 静謐から激情まで、豊かな感情表現を可能にする音域
- **台詞の音楽性**: 韻律と抑揚で物語を語る声の選択
- **キャラクターの声紋**: 観客の記憶に残る特徴的な声質

### 利用可能な音声パレット
- **alloy**: 中性的で落ち着いた声 - 語り手、賢者、観察者
- **echo**: 男性的で深みのある声 - 威厳ある統治者、父性的存在
- **fable**: 若々しく明るい女性の声 - 無垢な恋人、希望の象徴
- **nova**: エネルギッシュな女性の声 - 情熱的な主人公、行動的な女性
- **onyx**: 重厚で威厳のある男性の声 - 悪役、権力者、運命の宣告者
- **shimmer**: 優しく柔らかな女性の声 - 慈母、癒し手、内なる声

### 出力形式
{
  "voiceAssignments": [
    {
      "characterId": "character-1",
      "characterName": "キャラクター名",
      "suggestedVoice": "選択した音声ID",
      "voiceRationale": "この声を選んだ演出意図"
    }
  ]
}

## 重要な指示
- 各キャラクターの内面と役割を声で表現すること
- 声の対比で劇的効果を生み出すこと
- 物語全体の音響的バランスを考慮すること
- 観客の感情に訴えかける声の配役
`;
}

/**
 * 音声キャスティング用のユーザープロンプトを作成
 */
function createVoiceUserPrompt(characters: any[]): string {
  return `## ディレクターからの指示
${characters.map(char => `### ${char.name}
- 役割: ${char.role}
- 性格: ${char.personality}
- 外見: ${char.visualDescription || '詳細不明'}`).join('\n\n')}

これらのキャラクターに最適な音声をJSONフォーマットで割り当ててください。`;
}

/**
 * シーンIDからアクト番号を取得
 */
function getActNumberForScene(sceneId: string, acts: any[]): number {
  for (const act of acts) {
    for (const scene of act.scenes) {
      if (scene.id === sceneId) {
        return act.actNumber;
      }
    }
  }
  return 1; // デフォルト
}

/**
 * シーンIDからシーン番号を取得
 */
function getSceneNumberForScene(sceneId: string, acts: any[]): number {
  for (const act of acts) {
    for (const scene of act.scenes) {
      if (scene.id === sceneId) {
        return scene.sceneNumber;
      }
    }
  }
  return 1; // デフォルト
}

/**
 * シーンIDからシーンタイトルを取得
 */
function getSceneTitleForScene(sceneId: string, acts: any[]): string {
  for (const act of acts) {
    for (const scene of act.scenes) {
      if (scene.id === sceneId) {
        return scene.sceneTitle;
      }
    }
  }
  return 'シーン'; // デフォルト
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class VoiceGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VoiceGenerationError';
  }
}