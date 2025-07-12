import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type {
  Step2Output,
  Step3Input,
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
 * Step2の出力からStep3の入力を生成（キャラクター詳細化）
 */
export async function generateStep3Input(
  workflowId: string,
  storyboardId: string,
  step2Output: Step2Output
): Promise<Step3Input> {
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

    // AIでキャラクターの詳細化
    const detailedCharacters = await generateDetailedCharacters(
      step2Output,
      storyboard.characters_data?.characters || [],
      storyboard.story_data // story_dataを渡す
    );

    // storyboardを更新
    const updatedCharactersData: CharactersData = {
      characters: detailedCharacters
    };

    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        title: step2Output.userInput.title,
        acts_data: { acts: step2Output.userInput.acts },
        characters_data: updatedCharactersData,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // Step3Input を構築
    const step3Input: Step3Input = {
      title: step2Output.userInput.title,
      detailedCharacters
    };

    return step3Input;

  } catch (error) {
    console.error('Step3入力生成エラー:', error);
    throw error;
  }
}

/**
 * AIを使用してキャラクターの詳細化
 */
async function generateDetailedCharacters(
  step2Output: Step2Output,
  existingCharacters: any[],
  storyData?: any
): Promise<Array<{
  id: string;
  name: string;
  role: string;
  personality: string;
  visualDescription: string;
}>> {
  const systemPrompt = createCharacterSystemPrompt();
  const userPrompt = createCharacterUserPrompt(step2Output, existingCharacters, storyData);

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

  // 結果を検証
  if (!result.characters || !Array.isArray(result.characters) || result.characters.length === 0) {
    throw new CharacterGenerationError(
      'AIがキャラクターの詳細設定を生成できませんでした。入力内容を確認してください。',
      'MISSING_CHARACTER_DETAILS'
    );
  }

  return result.characters.map((char: any, index: number) => {
    if (!char.name || !char.role) {
      throw new CharacterGenerationError(
        `キャラクター${index + 1}の必須情報（名前または役割）が不足しています。`,
        'INCOMPLETE_CHARACTER_DETAILS'
      );
    }

    return {
      id: char.id || `character-${index + 1}`,
      name: char.name,
      role: char.role,
      sex: char.sex,
      age: char.age,
      skinColor: char.skinColor,
      bodyType: char.bodyType,
      height: char.height,
      weight: char.weight,
      hairStyle: char.hairStyle,
      eyeColor: char.eyeColor,
      hairColor: char.hairColor,
      personality: char.personality || '詳細な性格設定が必要',
      visualDescription: char.visualDescription || '外見の描写が必要'
    };
  });
}

/**
 * キャラクター生成用のシステムプロンプトを作成
 */
function createCharacterSystemPrompt(): string {
  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
ディレクターの指示をもとに、キャラクターの詳細な設定を作成してください。

### 出力形式
{
  "characters": [
    {
      "id": "character-1",
      "name": "キャラクター名",
      "role": "物語での役割（主人公、道化、賢者、恋人など）",
      "sex": "性別（男性、女性）",
      "age": "年齢",
      "skinColor": "肌の色",
      "bodyType": "体型（スリム、普通、ぽっちゃり、筋肉質）",
      "height": "身長",
      "weight": "体重",
      "hairStyle": "髪型",
      "hairColor": "髪の色",
      "eyeColor": "瞳の色",
      "visualDescription": "特徴的な装飾品、衣装の詳細、全体的な印象",
      "personality": "内面の葛藤、価値観、行動原理、成長の可能性を含む詳細な性格描写",
    }
  ]
}

## 重要な指示
- 各キャラクターに明確な存在理由と物語上の機能を持たせること
- 外見は性格と役割を視覚的に表現するものであること
- シェイクスピア的な深みと現代的な親しみやすさの融合
- 主要キャラクターには特に豊かな内面性を付与
`;
}

/**
 * キャラクター生成用のユーザープロンプトを作成
 */
function createCharacterUserPrompt(
  step2Output: Step2Output,
  existingCharacters: any[],
  storyData?: any
): string {
  let originalStoryInfo = '';
  
  // story_dataが存在する場合、元のストーリー情報を含める
  if (storyData) {
    originalStoryInfo = `
## 元のストーリー情報
- ストーリー: ${storyData.originalText || ''}
- 登場人物の情報: ${storyData.characters || ''}
- 劇的転換点: ${storyData.dramaticTurningPoint || ''}
- 未来のビジョン: ${storyData.futureVision || ''}
- 学びや気づき: ${storyData.learnings || ''}
`;
  }

  return `## 演出家の指示
タイトル: ${step2Output.userInput.title}
${originalStoryInfo}
## 幕場構成
${JSON.stringify(step2Output.userInput.acts, null, 2)}

## 既存キャラクター情報
${existingCharacters.map(char => `- ${char.name}: ${char.role} (${char.personality})`).join('\n')}

これらの情報を基に、各キャラクターの詳細な設定をJSONフォーマットで作成してください。`;
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class CharacterGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CharacterGenerationError';
  }
}