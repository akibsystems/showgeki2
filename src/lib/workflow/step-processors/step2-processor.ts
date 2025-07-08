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
      storyboard.characters_data?.characters || []
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
  existingCharacters: any[]
): Promise<Array<{
  id: string;
  name: string;
  role: string;
  personality: string;
  visualDescription: string;
}>> {
  const prompt = `
以下の情報から、キャラクターの詳細な設定を作成してください：

## 作品情報
タイトル: ${step2Output.userInput.title}

## 幕場構成
${JSON.stringify(step2Output.userInput.acts, null, 2)}

## 既存キャラクター
${existingCharacters.map(char => `- ${char.name}: ${char.role} (${char.personality})`).join('\n')}

## 生成要件
1. 各キャラクターに詳細な性格設定
2. 視覚的な特徴の具体的な描写
3. 物語での役割を明確化
4. アニメ風の外見描写

JSONフォーマットで出力してください：
{
  "characters": [
    {
      "id": "character-1",
      "name": "キャラクター名",
      "role": "物語での役割",
      "personality": "詳細な性格設定",
      "visualDescription": "具体的な外見描写"
    }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      {
        role: 'system',
        content: 'あなたはキャラクターデザインの専門家です。物語に適したキャラクターの詳細設定を作成してください。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  // 結果を検証・補完
  if (!result.characters || !Array.isArray(result.characters)) {
    return existingCharacters.map((char, index) => ({
      id: char.id || `character-${index + 1}`,
      name: char.name || `キャラクター${index + 1}`,
      role: char.role || '登場人物',
      personality: char.personality || '詳細な性格設定が必要',
      visualDescription: char.visualDescription || '外見の描写が必要'
    }));
  }

  return result.characters.map((char: any, index: number) => ({
    id: char.id || `character-${index + 1}`,
    name: char.name || `キャラクター${index + 1}`,
    role: char.role || '登場人物',
    personality: char.personality || '詳細な性格設定が必要',
    visualDescription: char.visualDescription || '外見の描写が必要'
  }));
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