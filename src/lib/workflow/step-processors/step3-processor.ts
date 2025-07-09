import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  Step3Output,
  Step4Input,
  Storyboard,
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
 * Step3の出力からStep4の入力を生成（台本生成）
 */
export async function generateStep4Input(
  workflowId: string,
  storyboardId: string,
  step3Output: Step3Output
): Promise<Step4Input> {
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

    // キャラクター情報と画風設定を更新
    const updatedCharactersData = {
      characters: step3Output.userInput.characters.map(char => ({
        ...storyboard.characters_data?.characters?.find((c: any) => c.id === char.id) || {},
        id: char.id,
        name: char.name,
        description: char.description,
        faceReference: char.faceReference
      }))
    };

    const updatedStyleData: StyleData = {
      imageStyle: step3Output.userInput.imageStyle.preset,
      customPrompt: step3Output.userInput.imageStyle.customPrompt
    };

    // AIでシーンごとの台本と画像プロンプトを生成
    const scenesData = await generateScenesWithAI(
      storyboard,
      updatedCharactersData.characters,
      updatedStyleData
    );

    // storyboardを更新
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        characters_data: updatedCharactersData,
        style_data: updatedStyleData,
        scenes_data: scenesData
      })
      .eq('id', storyboardId);

    if (updateError) {
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // Step4Input を構築
    const step4Input: Step4Input = {
      title: storyboard.title || '',
      acts: storyboard.acts_data?.acts || [],
      scenes: scenesData.scenes
    };

    return step4Input;

  } catch (error) {
    console.error('Step4入力生成エラー:', error);
    throw error;
  }
}

/**
 * AIを使用してシーンごとの台本と画像プロンプトを生成
 */
async function generateScenesWithAI(
  storyboard: Storyboard,
  characters: any[],
  styleData: StyleData
): Promise<ScenesData> {
  const systemPrompt = createSceneSystemPrompt();
  const userPrompt = createSceneUserPrompt(storyboard, characters, styleData);

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
    temperature: 0.8,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // 結果を検証
  if (!result.scenes || !Array.isArray(result.scenes) || result.scenes.length === 0) {
    throw new SceneGenerationError(
      'AIがシーンの台本を生成できませんでした。物語の構成を確認してください。',
      'MISSING_SCENES_DATA'
    );
  }

  // シーンIDを確実に設定
  result.scenes = result.scenes.map((scene: any, index: number) => {
    if (!scene.dialogue || !Array.isArray(scene.dialogue) || scene.dialogue.length === 0) {
      throw new SceneGenerationError(
        `シーン${index + 1}の対話が生成されませんでした。`,
        'MISSING_DIALOGUE_DATA'
      );
    }

    return {
      ...scene,
      id: scene.id || `scene-${scene.actNumber}-${scene.sceneNumber}`
    };
  });

  return result as ScenesData;
}

/**
 * シーン生成用のシステムプロンプトを作成
 */
function createSceneSystemPrompt(): string {
  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
  与えられた物語をシェイクスピアだったらどのような演出をするかを想像しながら、台本を制作してください。

## 創作指針
この物語をもとに、シェイクスピア風の５幕構成の悲喜劇として台本を考えてください
台詞には現代的で少しカジュアルな日本語を使う。
内容を膨らませ、各台詞の長さは１〜４文程度、時折長い台詞を含む
元の物語のエッセンスと感情を捉え、多様なキャラクターの個性で視覚的・感情的な演出を行う

### 出力形式
{
  "scenes": [
    {
      "id": "scene-幕番号-場番号",
      "actNumber": 幕番号,
      "sceneNumber": 場番号,
      "title": "シーンの詩的タイトル",
      "imagePrompt": "そのシーンの本質を捉えた日本語の画像プロンプト（画風、構図、感情、象徴を含む）",
      "dialogue": [
        {
          "speaker": "話者名",
          "text": "心に響く台詞（古風だが理解しやすい日本語）",
          "emotion": "内なる感情（喜び、悲しみ、怒り、恐れ、愛、希望など）"
        }
      ]
    }
  ]
}

## 技術使用
- １場を１シーンとする
- すべての要素がJSONフォーマットで出力されること
- 指定していないキャラクターは絶対に使用しない
`;
}

/**
 * シーン生成用のユーザープロンプトを作成
 */
function createSceneUserPrompt(
  storyboard: Storyboard,
  characters: any[],
  styleData: StyleData
): string {
  return `## 作品情報
タイトル: ${storyboard.title}
ジャンル: ${storyboard.summary_data?.genre || 'ドラマ'}
概要: ${storyboard.summary_data?.description || ''}

## 幕場構成
${JSON.stringify(storyboard.acts_data?.acts, null, 2)}

## 登場人物
${characters.map(char => `### ${char.name}
- 役割: ${char.role || char.description}
- 性格: ${char.personality || ''}
- 外見: ${char.visualDescription || char.description || ''}`).join('\n\n')}

## 画風設定
スタイル: ${styleData.imageStyle}
${styleData.customPrompt ? `追加指示: ${styleData.customPrompt}` : ''}

上記の情報を基に、各シーンの詳細な台本と画像プロンプトをJSONフォーマットで生成してください。`;
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class SceneGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SceneGenerationError';
  }
}