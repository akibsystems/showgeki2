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
  console.log(`[step3-processor] generateStep4Input called for workflow ${workflowId}, storyboard ${storyboardId}`);
  console.log(`[step3-processor] Step3 output received:`, JSON.stringify(step3Output, null, 2));

  try {
    // storyboardから既存のデータを取得
    console.log(`[step3-processor] Fetching storyboard data from database...`);
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .single();

    if (error || !storyboard) {
      console.error(`[step3-processor] Failed to fetch storyboard:`, error);
      throw new Error('ストーリーボードの取得に失敗しました');
    }
    console.log(`[step3-processor] Storyboard fetched successfully`);

    // workflowから既存のStep4Outputを取得（保存されたプロンプトがあるか確認）
    console.log(`[step3-processor] Checking for existing Step4 output...`);
    const { data: workflow } = await supabase
      .from('workflows')
      .select('step4_out')
      .eq('id', workflowId)
      .single();

    const existingStep4Output = workflow?.step4_out as any;

    // キャラクター情報と画風設定を更新
    const updatedCharactersData = {
      characters: step3Output.userInput.characters.map(char => {
        // 既存のキャラクターデータを取得
        const existingChar = storyboard.characters_data?.characters?.find((c: any) => c.id === char.id) || {};

        // Step3のdescriptionは personality + visualDescription の結合されたもの
        // 元のフィールドを保持しつつ、編集された内容も反映する
        return {
          ...existingChar, // すべての既存フィールドを保持
          id: char.id,
          name: char.name,
          // descriptionフィールドは保存用（互換性のため）
          description: char.description,
          // personalityとvisualDescriptionは元の値を保持（Step3では編集されない）
          personality: existingChar.personality || '',
          visualDescription: existingChar.visualDescription || '',
          // faceReferenceは明示的に更新
          faceReference: char.faceReference
        };
      })
    };

    const updatedStyleData: StyleData = {
      imageStyle: step3Output.userInput.imageStyle.preset,
      customPrompt: step3Output.userInput.imageStyle.customPrompt
    };

    // AIでシーンごとの台本と画像プロンプトを生成
    console.log(`[step3-processor] Generating scenes with AI...`);
    const scenesData = await generateScenesWithAI(
      storyboard,
      updatedCharactersData.characters,
      updatedStyleData,
      storyboard.story_data // story_dataを渡す
    );
    console.log(`[step3-processor] Scenes generated:`, JSON.stringify(scenesData, null, 2));

    // フラットな形式からStep4Inputの形式に変換
    console.log(`[step3-processor] Formatting scenes to Step4Input format...`);
    const formattedScenes = scenesData.scenes.map((scene: any, index: number) => {
      // どの幕・場に属するかを計算
      let actNumber = 1;
      let sceneNumber = 1;
      let currentIndex = 0;
      let title = '';

      // acts_dataから幕・場番号を取得
      if (storyboard.acts_data?.acts) {
        for (const act of storyboard.acts_data.acts) {
          for (const actScene of act.scenes || []) {
            currentIndex++;
            if (currentIndex === index + 1) {
              actNumber = act.actNumber;
              sceneNumber = actScene.sceneNumber;
              title = actScene.sceneTitle;
              break;
            }
          }
          if (currentIndex === index + 1) break;
        }
      }

      return {
        id: scene.id,
        actNumber,
        sceneNumber,
        title: title || `シーン${index + 1}`,
        imagePrompt: scene.imagePrompt,
        dialogue: [{
          speaker: scene.speaker,
          text: scene.text
        }]
      };
    });

    // 既存のStep4Outputがある場合、保存されたプロンプトをマージ
    let mergedScenes = formattedScenes;
    if (existingStep4Output?.userInput?.scenes && Array.isArray(existingStep4Output.userInput.scenes)) {
      const savedScenes = existingStep4Output.userInput.scenes;

      mergedScenes = formattedScenes.map((scene: any) => {
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
      acts: storyboard.acts_data?.acts?.map((act: any) => ({
        actNumber: act.actNumber,
        actTitle: act.actTitle
      })) || [],
      scenes: mergedScenes,
      selectedKeywords: storyboard.summary_data?.selectedKeywords
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
  styleData: StyleData,
  storyData?: any
): Promise<ScenesData> {
  console.log(`[step3-processor] generateScenesWithAI called`);
  console.log(`[step3-processor] Characters count:`, characters.length);
  console.log(`[step3-processor] Style data:`, JSON.stringify(styleData, null, 2));

  const systemPrompt = createSceneSystemPrompt();
  const userPrompt = createSceneUserPrompt(storyboard, characters, styleData, storyData);
  console.log(`[step3-processor] Prompts created, calling OpenAI...`);

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

  // 各シーンを検証し、必要なフィールドを確保
  result.scenes = result.scenes.map((scene: any, index: number) => {
    // 必須フィールドの検証
    if (!scene.speaker || !scene.text) {
      throw new SceneGenerationError(
        `シーン${index + 1}の話者または台詞が生成されませんでした。`,
        'MISSING_DIALOGUE_DATA'
      );
    }

    if (!scene.imagePrompt) {
      throw new SceneGenerationError(
        `シーン${index + 1}の画像プロンプトが生成されませんでした。`,
        'MISSING_IMAGE_PROMPT'
      );
    }

    return {
      id: scene.id || String(index + 1),
      imagePrompt: scene.imagePrompt,
      speaker: scene.speaker,
      text: scene.text
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
重要なキーワードについてはtextまたはimagePromptに含める

### 出力形式
{
  "scenes": [
    {
      "id": "1から順番に番号をつける",
      "imagePrompt": "そのシーンの本質を捉えた日本語の画像プロンプト（画風、構図、感情、象徴を含む）。",
      "speaker": "話者名",
      "text": "心に響く台詞(少しカジュアルな日本語)"
    }
  ]
}

## 技術使用
- 1シーンにつき1人の話者が1つの台詞を話す（フラットな配列形式）
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
  styleData: StyleData,
  storyData?: any
): string {
  // 幕場構成を整理して、シーンごとの情報を作成
  const actsStructure = storyboard.acts_data?.acts?.map((act: any) =>
    `第${act.actNumber}幕「${act.actTitle}」
${act.scenes?.map((scene: any) =>
      `  - 第${scene.sceneNumber}場「${scene.sceneTitle}」: ${scene.summary}`
    ).join('\n')}`
  ).join('\n\n') || '';

  // 全シーンのリストを作成
  const allScenes: any[] = [];
  storyboard.acts_data?.acts?.forEach((act: any) => {
    act.scenes?.forEach((scene: any) => {
      allScenes.push({
        actNumber: act.actNumber,
        sceneNumber: scene.sceneNumber,
        title: scene.sceneTitle,
        summary: scene.summary
      });
    });
  });

  return `## 作品情報
- タイトル: ${storyboard.title}
- ジャンル: ${storyboard.summary_data?.genre || 'ドラマ'}
- ストーリー: ${storyData.originalText || ''}
- 劇的転換点: ${storyData.dramaticTurningPoint || ''}
- 未来のビジョン: ${storyData.futureVision || ''}
- 学びや気づき: ${storyData.learnings || ''}
- 総シーン数: ${storyData.totalScenes || ''}
- 選択されたキーワード: ${storyboard.summary_data?.selectedKeywords?.map((k: any) => `${k.term}（${k.importance}）`).join(', ') || ''}

## 幕場構成
${actsStructure}

## 全体のシーン数
${allScenes.length}シーン

## 登場人物
${characters.map(char => {
    const hasImage = char.faceReference;

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
- メガネの有無: ${char.glasses || ''}
- 服装など: ${char.visualDescription || ''}`;
    }
  }).join('\n\n')}

## 画風設定
スタイル: ${styleData.imageStyle}
${styleData.customPrompt ? `追加指示: ${styleData.customPrompt}` : ''}

上記の情報を基に、${allScenes.length}個のシーンそれぞれに対して、詳細な台本と画像プロンプトをJSONフォーマットで生成してください。`;
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