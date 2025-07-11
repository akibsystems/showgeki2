import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  Step1Output,
  Step2Input,
  SummaryData,
  ActsData,
  CharactersData
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
 * Step1の出力からStep2の入力を生成（AIによるstoryboard生成）
 */
export async function generateStep2Input(
  workflowId: string,
  storyboardId: string,
  step1Output: Step1Output
): Promise<Step2Input> {
  try {
    // AIでstoryboardを生成
    const generatedStoryboard = await generateStoryboardWithAI(step1Output);

    // storyboardを更新
    await updateStoryboard(storyboardId, generatedStoryboard);

    // Step2Input を構築
    const step2Input: Step2Input = {
      suggestedTitle: generatedStoryboard.summary.title,
      acts: generatedStoryboard.acts.acts,
      charactersList: generatedStoryboard.characters.characters
    };

    return step2Input;

  } catch (error) {
    console.error('Step2入力生成エラー:', error);
    throw error;
  }
}

/**
 * AIを使用してstoryboardを生成
 */
async function generateStoryboardWithAI(step1Output: Step1Output): Promise<{
  summary: SummaryData;
  acts: ActsData;
  characters: CharactersData;
}> {
  const systemPrompt = createStoryboardSystemPrompt(step1Output);
  const userPrompt = createStoryboardUserPrompt(step1Output);

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
    temperature: 0.7,
    response_format: { type: 'json_object' },
    max_tokens: 32000,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // 生成されたデータを検証・補完
  const validatedResult = validateAndNormalizeStoryboard(result, step1Output);

  return validatedResult;
}

/**
 * storyboard生成用のプロンプトを作成
 */
function createStoryboardSystemPrompt(step1Output: Step1Output): string {
  const { userInput } = step1Output;

  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
ディラクターからの指示をもとににシェイクスピアだったらどのような演出をするかを想像しながら、シーンを分割してください。

## 創作指針
- 物語をもとに、シェイクスピア風の５幕構成の悲喜劇として脚本を考えてください。
- 台詞には現代的で少しカジュアルな日本語を使う。
- 元の物語のエッセンスと感情を捉え、多様なキャラクターの個性で視覚的・感情的な演出を行う。
- 各幕に適切な数のシーンを配置し、総シーン数を必ず守ること
- 各登場人物に役割と性格を設定

## 出力形式
JSONフォーマットで以下の構造で出力してください：

{
  "summary": {
    "title": "物語のタイトル",
    "description": "物語の概要",
    "genre": "ジャンル（例：ドラマ、コメディ、冒険など）",
    "tags": ["タグ1", "タグ2", "タグ3"],
    "estimatedDuration": 120
  },
  "acts": {
    "acts": [
      {
        "actNumber": 1,
        "actTitle": "第1幕のタイトル",
        "description": "第1幕の概要",
        "scenes": [
          {
            "sceneNumber": 1,
            "sceneTitle": "シーン1のタイトル",
            "summary": "シーン1の概要"
          }
        ]
      }
    ]
  },
  "characters": {
    "characters": [
      {
        "id": "character-1",
        "name": "キャラクター名",
        "role": "役割（例：主人公、親友、恋人など）",
        "personality": "性格の説明",
        "visualDescription": "外見の説明"
      }
    ]
  }
}

## 重要な指示
- 各シーンは物語の流れに沿って自然に分割してください
- シェイクスピア風の５幕構成（序幕、展開、クライマックス、転換、終幕）を意識してください
- タイトルは短く印象的に、劇的な雰囲気を含めて
- あらすじは簡潔にシーンの要点を説明
- 日本語で出力してください
- タグは物語の特徴を表す3-5個程度
`;
}

function createStoryboardUserPrompt(step1Output: Step1Output): string {
  const { userInput } = step1Output;

  return `## ディレクターからの指示
- ストーリー: ${userInput.storyText}
- 登場人物: ${userInput.characters}
- 劇的転換点: ${userInput.dramaticTurningPoint}
- 未来のビジョン: ${userInput.futureVision}
- 学びや気づき: ${userInput.learnings}
- 総シーン数: ${userInput.totalScenes}
- スタイル: ${userInput.settings.style}
- 言語: ${userInput.settings.language}

上記の情報を基に、物語の構成をJSONフォーマットで生成してください。
`;
}

/**
 * 生成されたstoryboardデータを検証・補完
 */
function validateAndNormalizeStoryboard(
  result: any,
  step1Output: Step1Output
): {
  summary: SummaryData;
  acts: ActsData;
  characters: CharactersData;
} {
  const { userInput } = step1Output;

  // 結果が無効な場合はエラーをthrow
  if (!result || typeof result !== 'object') {
    throw new StoryboardGenerationError(
      'AIからの応答が無効です。有効なJSONオブジェクトが返されませんでした。',
      'INVALID_AI_RESPONSE'
    );
  }

  // Summary データの検証
  if (!result.summary?.title || !result.summary?.description) {
    throw new StoryboardGenerationError(
      'AIが物語のタイトルまたは概要を生成できませんでした。入力内容を確認してください。',
      'MISSING_SUMMARY_DATA'
    );
  }

  const summary: SummaryData = {
    title: result.summary.title,
    description: result.summary.description,
    genre: result.summary?.genre || 'ドラマ',
    tags: Array.isArray(result.summary?.tags) ? result.summary.tags : [],
    estimatedDuration: result.summary?.estimatedDuration || 120
  };

  // Acts データの検証
  if (!result.acts?.acts || !Array.isArray(result.acts.acts) || result.acts.acts.length === 0) {
    throw new StoryboardGenerationError(
      'AIが幕場構成を生成できませんでした。物語の内容をより具体的に記述してください。',
      'MISSING_ACTS_DATA'
    );
  }

  const acts: ActsData = {
    acts: result.acts.acts.map((act: any, index: number) => {
      if (!act.actTitle || !Array.isArray(act.scenes) || act.scenes.length === 0) {
        throw new StoryboardGenerationError(
          `第${index + 1}幕のデータが不完全です。幕のタイトルまたはシーンが不足しています。`,
          'INCOMPLETE_ACT_DATA'
        );
      }

      return {
        actNumber: act.actNumber || index + 1,
        actTitle: act.actTitle,
        description: act.description || '',
        scenes: act.scenes.map((scene: any, sceneIndex: number) => {
          if (!scene.sceneTitle || !scene.summary) {
            throw new StoryboardGenerationError(
              `第${index + 1}幕のシーン${sceneIndex + 1}のデータが不完全です。`,
              'INCOMPLETE_SCENE_DATA'
            );
          }
          return {
            sceneNumber: scene.sceneNumber || sceneIndex + 1,
            sceneTitle: scene.sceneTitle,
            summary: scene.summary
          };
        })
      };
    })
  };

  // Characters データの検証
  if (!result.characters?.characters || !Array.isArray(result.characters.characters) || result.characters.characters.length === 0) {
    throw new StoryboardGenerationError(
      'AIがキャラクターを生成できませんでした。登場人物の情報をより詳しく記述してください。',
      'MISSING_CHARACTERS_DATA'
    );
  }

  const characters: CharactersData = {
    characters: result.characters.characters.map((char: any, index: number) => {
      if (!char.name || !char.role) {
        throw new StoryboardGenerationError(
          `キャラクター${index + 1}のデータが不完全です。名前または役割が不足しています。`,
          'INCOMPLETE_CHARACTER_DATA'
        );
      }

      return {
        id: char.id || `character-${index + 1}`,
        name: char.name,
        role: char.role,
        personality: char.personality || '',
        visualDescription: char.visualDescription || ''
      };
    })
  };

  return { summary, acts, characters };
}

/**
 * storyboardを更新
 */
async function updateStoryboard(
  storyboardId: string,
  data: {
    summary: SummaryData;
    acts: ActsData;
    characters: CharactersData;
  }
): Promise<void> {
  const { error } = await supabase
    .from('storyboards')
    .update({
      title: data.summary.title,
      summary_data: data.summary,
      acts_data: data.acts,
      characters_data: data.characters,
      updated_at: new Date().toISOString()
    })
    .eq('id', storyboardId);

  if (error) {
    throw new Error(`ストーリーボードの更新に失敗しました: ${error.message}`);
  }
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class StoryboardGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StoryboardGenerationError';
  }
}

/**
 * 生成処理の結果を検証
 */
export function validateGenerationResult(result: any): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }

  // 必須フィールドの存在確認
  if (!result.summary || !result.acts || !result.characters) {
    return false;
  }

  // より詳細な検証
  if (!result.summary.title || !result.acts.acts || !Array.isArray(result.acts.acts)) {
    return false;
  }

  if (!result.characters.characters || !Array.isArray(result.characters.characters)) {
    return false;
  }

  return true;
}