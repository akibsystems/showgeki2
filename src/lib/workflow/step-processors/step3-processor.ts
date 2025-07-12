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

    // workflowから既存のStep4Outputを取得（保存されたプロンプトがあるか確認）
    const { data: workflow } = await supabase
      .from('workflows')
      .select('step4_out')
      .eq('id', workflowId)
      .single();

    const existingStep4Output = workflow?.step4_out as any;

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

    // 既存のStep4Outputがある場合、保存されたプロンプトをマージ
    let mergedScenes = scenesData.scenes;
    if (existingStep4Output?.userInput?.scenes && Array.isArray(existingStep4Output.userInput.scenes)) {
      const savedScenes = existingStep4Output.userInput.scenes;

      mergedScenes = scenesData.scenes.map((scene: any) => {
        const savedScene = savedScenes.find((s: any) => s.id === scene.id);
        if (savedScene && savedScene.imagePrompt) {
          // 保存されたプロンプトを優先
          return {
            ...scene,
            imagePrompt: savedScene.imagePrompt,
            dialogue: savedScene.dialogue || scene.dialogue,
            customImage: savedScene.customImage
          };
        }
        return scene;
      });
    }

    // storyboardを更新（マージされたシーンデータで）
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        characters_data: updatedCharactersData,
        style_data: updatedStyleData,
        scenes_data: {
          scenes: mergedScenes
        }
      })
      .eq('id', storyboardId);

    if (updateError) {
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // Step4Input を構築（マージされたシーンデータで）
    const step4Input: Step4Input = {
      title: storyboard.title || '',
      acts: storyboard.acts_data?.acts || [],
      scenes: mergedScenes
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
  console.log("userPrompt", userPrompt);

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
    response_format: { type: 'json_object' },
    max_tokens: 32000,
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
      "imagePrompt": "そのシーンの本質を捉えた日本語の画像プロンプト（画風、構図、感情、象徴を含む）。画像が指定されていないキャラクターの場合のみ、性別、年齢、肌の色、身長、体重、髪型、瞳の色、髪の色、体型、外見を含めてください。画像が指定されているキャラクターは役割、性格のみ反映してください",
      "dialogue": [
        {
          "speaker": "話者名",
          "text": "心に響く台詞(少しカジュアルな日本語)",
          "emotion": "内なる感情（喜び、悲しみ、怒り、恐れ、愛、希望など）"
        }
      ]
    }
  ]
}

## 技術使用
- dialogue配列は１要素のみ、つまり1シーンでの会話は1名1台詞のみ。1名の人物が喋るのみなので要注意！他のキャラはしゃべらない。
- すべての要素がJSONフォーマットで出力されること
- 指定していないキャラクターは絶対に使用しない
- 「(画像指定済み)」と記載されているキャラクターは、画像プロンプトに外見の詳細は含めず、役割・性格・性別・年齢のみ反映する
- 画像が指定されていないキャラクターは、すべての外見情報を画像プロンプトに含める
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

## 全体のシーン数（守ってください）
1つの幕場で喋るのは1名1台詞のみです。注意してください
${storyboard.acts_data?.acts?.reduce((total, act) => total + (act.scenes?.length || 0), 0) || 0}

## 登場人物
${characters.map(char => {
    console.log("char", char);
    const hasImage = char.faceReference;
    console.log("hasImage", hasImage);

    if (hasImage) {
      // 画像が指定されている場合：役割、性格のみ
      return `### ${char.name} (画像指定済み)
- 役割: ${char.role || ''}
- 性格: ${char.personality || ''}
- 外見: 画像指定済み`;
    } else {
      // 画像が指定されていない場合：従来通りすべての外見情報を含める
      return `### ${char.name}
- 役割: ${char.role || ''}
- 性格: ${char.personality || ''}
- 性別: ${char.sex || ''}
- 年齢: ${char.age || ''}
- 肌の色: ${char.skinColor || ''}
- 身長: ${char.height || ''}
- 体重: ${char.weight || ''}
- 髪型: ${char.hairStyle || ''}
- 瞳の色: ${char.eyeColor || ''}
- 髪の色: ${char.hairColor || ''}
- 体型: ${char.bodyType || ''}
- 外見: ${char.visualDescription || ''}`;
    }
  }).join('\n\n')}

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