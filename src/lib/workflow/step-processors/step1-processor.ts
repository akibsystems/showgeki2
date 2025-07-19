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

    // storyboardを更新（story_dataも含めて保存）
    await updateStoryboard(storyboardId, generatedStoryboard, step1Output);

    // Step2Input を構築
    const step2Input: Step2Input = {
      suggestedTitle: generatedStoryboard.summary.title,
      acts: generatedStoryboard.acts.acts,
      charactersList: generatedStoryboard.characters.characters,
      keywords: generatedStoryboard.summary.keywords
    };

    console.log(`[step1-processor] Step2Input built:`, JSON.stringify(step2Input, null, 2));
    return step2Input;

  } catch (error) {
    console.error('[step1-processor] Step2入力生成エラー:', error);
    console.error('[step1-processor] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[step1-processor] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
  console.log(`[step1-processor] generateStoryboardWithAI called`);
  const systemPrompt = createStoryboardSystemPrompt(step1Output);
  const userPrompt = createStoryboardUserPrompt(step1Output);
  console.log(`[step1-processor] Prompts created, calling OpenAI...`);

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

  console.log(`[step1-processor] OpenAI response received`);
  console.log(`[step1-processor] Response content:`, response.choices[0].message.content);
  console.log(`[step1-processor] Response content length:`, response.choices[0].message.content?.length);
  console.log(`[step1-processor] Response content type:`, typeof response.choices[0].message.content);
  console.log(`[step1-processor] Response content JSON:`, JSON.parse(response.choices[0].message.content || '{}'));
  console.log(`[step1-processor] Response content JSON length:`, JSON.parse(response.choices[0].message.content || '{}').length);
  console.log(`[step1-processor] Response content JSON type:`, typeof JSON.parse(response.choices[0].message.content || '{}'));

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // 生成されたデータを検証・補完
  const validatedResult = validateAndNormalizeStoryboard(result, step1Output);

  console.log(`[step1-processor] Validated result:`, JSON.stringify(validatedResult, null, 2));

  return validatedResult;
}

/**
 * storyboard生成用のプロンプトを作成
 */
function createStoryboardSystemPrompt(step1Output: Step1Output): string {
  const { userInput } = step1Output;

  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
ディラクターからの指示をもとにシェイクスピアだったらどのような演出をするかを想像しながら、シーンを分割してください。

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
    "estimatedDuration": 120,
    "keywords": [
      {
        "term": "キーワード（固有名詞・重要な概念）",
        "importance": 8.5,
        "reason": "このキーワードが重要な理由",
        "category": "person"
      }
    ]
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
        "name": "登場人物名",
        "role": "役割（例：主人公、親友、恋人など）",
        "personality": "性格の説明",
        "visualDescription": "外見の説明"
      }
    ]
  }
}

## 重要な指示
- シェイクスピア風の５幕構成（序幕、展開、クライマックス、転換、終幕）を意識してください
- タイトルは短く印象的に、劇的な雰囲気を含めて
- あらすじは簡潔にシーンの要点を説明
- ディレクターから登場人物の名前について指示がある場合は、そのままの名前で必ず登場人物に含めてください。
- 日本語で出力してください
- タグは物語の特徴を表す3-5個程度

## キーワード抽出の指針
物語から**できるだけ多くの**重要なキーワードを抽出してください：

### 抽出対象
- **固有名詞**: 人名、企業名、製品名、サービス名、団体名、地名、建物名など
- **重要なイベント**: IPO、起業、買収、合併、受賞、発表会、転機となった出来事など
- **重要な概念**: 物語の核となるテーマ、価値観、哲学、技術、手法など
- **感情的な要素**: 主人公の感情、決意、夢、目標など
- **時期・期間**: 重要な日付、期間、タイミングなど
- **数値・金額**: 売上、資金調達額、従業員数など重要な数字

### スコアリング（0.0-10.0）
- **9.0-10.0**: 物語の核心（主人公名、企業名、最重要イベントなど）
- **7.0-8.9**: 重要な要素（主要キャラ、重要な出来事、キーテーマなど）
- **5.0-6.9**: 中程度の重要性（サブキャラ、補助的イベント、背景情報など）
- **3.0-4.9**: 補助的要素（環境設定、小道具、一般的概念など）
- **0.0-2.9**: 参考情報（雰囲気作り、一般的な用語など）

### 各キーワードの形式
- importance: 0.0から10.0の間の数値（0.1刻み）
- reason: なぜこのキーワードが重要なのか具体的に説明
- category: "person"（人物）、"organization"（組織）、"event"（出来事）、"concept"（概念）、"location"（場所）、"other"（その他）
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
- 総シーン数: ${userInput.totalScenes}。ストーリーの構成ではなく、こちらのシーン数を厳守してください！
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
    estimatedDuration: result.summary?.estimatedDuration || 120,
    keywords: Array.isArray(result.summary?.keywords) ?
      result.summary.keywords.map((keyword: any) => ({
        term: keyword.term || '',
        importance: typeof keyword.importance === 'number' &&
          keyword.importance >= 0 &&
          keyword.importance <= 10 ?
          Math.round(keyword.importance * 10) / 10 : // 0.1刻みに丸める
          5.0,
        reason: keyword.reason || '',
        category: ['person', 'organization', 'event', 'concept', 'location', 'other'].includes(keyword.category)
          ? keyword.category
          : 'other'
      })).filter((k: any) => k.term).sort((a: any, b: any) => b.importance - a.importance) : [] // 重要度順でソート
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
  },
  step1Output: Step1Output
): Promise<void> {
  // story_dataに保存するユーザー入力データ
  const storyData = {
    originalText: step1Output.userInput.storyText,
    characters: step1Output.userInput.characters,
    dramaticTurningPoint: step1Output.userInput.dramaticTurningPoint,
    futureVision: step1Output.userInput.futureVision,
    learnings: step1Output.userInput.learnings,
    totalScenes: step1Output.userInput.totalScenes,
    settings: step1Output.userInput.settings
  };

  const { error } = await supabase
    .from('storyboards')
    .update({
      title: data.summary.title,
      summary_data: data.summary,
      acts_data: data.acts,
      characters_data: data.characters,
      story_data: storyData,
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