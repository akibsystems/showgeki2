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
 * Step3の出力からStep4の入力を生成
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

    // LLMでシーンごとの台本と画像プロンプトを生成
    const scenesData = await generateScenesWithLLM(
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
 * LLMを使用してシーンごとの台本と画像プロンプトを生成
 */
async function generateScenesWithLLM(
  storyboard: Storyboard,
  characters: any[],
  styleData: StyleData
): Promise<ScenesData> {
  const prompt = `
あなたはシェイクスピア風の脚本家です。以下の情報から、各シーンの詳細な台本と画像プロンプトを生成してください。

## 作品情報
タイトル: ${storyboard.title}

## 幕場構成
${JSON.stringify(storyboard.acts_data?.acts, null, 2)}

## 登場人物
${characters.map(char => `- ${char.name}: ${char.description}`).join('\n')}

## 画風設定
スタイル: ${styleData.imageStyle}
${styleData.customPrompt ? `カスタム指示: ${styleData.customPrompt}` : ''}

## 生成要件
1. 各シーンに対して：
   - シェイクスピア風の対話（日本語、古風だが理解しやすい表現）
   - そのシーンの雰囲気を表す画像プロンプト（英語）
2. 1シーンあたり3-5回の対話
3. 画像プロンプトは具体的で、指定された画風を反映
4. キャラクターの性格や関係性を反映した対話

JSONフォーマットで出力してください：
{
  "scenes": [
    {
      "id": "scene-1-1",
      "actNumber": 1,
      "sceneNumber": 1,
      "title": "シーンタイトル",
      "imagePrompt": "英語の画像プロンプト",
      "dialogue": [
        {
          "speaker": "話者名",
          "text": "セリフ",
          "emotion": "感情（オプション）"
        }
      ]
    }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'あなたはシェイクスピア風の脚本家です。日本語でドラマチックな対話を作成します。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  // シーンIDを確実に設定
  if (result.scenes) {
    result.scenes = result.scenes.map((scene: any, index: number) => ({
      ...scene,
      id: scene.id || `scene-${scene.actNumber}-${scene.sceneNumber}`
    }));
  }

  return result as ScenesData;
}