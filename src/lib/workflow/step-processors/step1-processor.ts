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
  const prompt = createStoryboardPrompt(step1Output);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      {
        role: 'system',
        content: 'あなたは優秀なストーリー構成専門家です。与えられた情報から、シェイクスピア風5幕構成の物語を作成し、適切な登場人物を設定してください。'
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
  
  // 生成されたデータを検証・補完
  const validatedResult = validateAndNormalizeStoryboard(result, step1Output);
  
  return validatedResult;
}

/**
 * storyboard生成用のプロンプトを作成
 */
function createStoryboardPrompt(step1Output: Step1Output): string {
  const { userInput } = step1Output;
  
  return `
以下の情報から、シェイクスピア風5幕構成の物語を作成してください：

## 入力情報
- ストーリー: ${userInput.storyText}
- 登場人物: ${userInput.characters}
- 劇的転換点: ${userInput.dramaticTurningPoint}
- 未来のビジョン: ${userInput.futureVision}
- 学びや気づき: ${userInput.learnings}
- 総シーン数: ${userInput.totalScenes}
- スタイル: ${userInput.settings.style}
- 言語: ${userInput.settings.language}

## 生成要件
1. タイトル案を1つ提案
2. シェイクスピア風5幕構成で構成
3. 各幕に適切な数のシーンを配置（総シーン数: ${userInput.totalScenes}）
4. 主要登場人物を3-6名設定
5. 各登場人物に役割と性格を設定

## 出力形式
JSONフォーマットで以下の構造で出力してください：

{
  "summary": {
    "title": "物語のタイトル",
    "description": "物語の概要（200文字程度）",
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

## 注意点
- 各幕は起承転結を意識した構成にする
- シーン数は指定された総数（${userInput.totalScenes}）に合わせる
- 登場人物は物語に必要な最小限の数で構成する
- 日本語で自然な表現を使用する
- タグは物語の特徴を表す3-5個程度
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
  
  // Summary データの検証・補完
  const summary: SummaryData = {
    title: result.summary?.title || 'untitled',
    description: result.summary?.description || '',
    genre: result.summary?.genre || 'ドラマ',
    tags: Array.isArray(result.summary?.tags) ? result.summary.tags : [],
    estimatedDuration: result.summary?.estimatedDuration || 120
  };

  // Acts データの検証・補完
  const acts: ActsData = {
    acts: []
  };

  if (result.acts?.acts && Array.isArray(result.acts.acts)) {
    acts.acts = result.acts.acts.map((act: any, index: number) => ({
      actNumber: act.actNumber || index + 1,
      actTitle: act.actTitle || `第${index + 1}幕`,
      description: act.description || '',
      scenes: Array.isArray(act.scenes) ? act.scenes.map((scene: any, sceneIndex: number) => ({
        sceneNumber: scene.sceneNumber || sceneIndex + 1,
        sceneTitle: scene.sceneTitle || `シーン${sceneIndex + 1}`,
        summary: scene.summary || ''
      })) : []
    }));
  } else {
    // デフォルトの5幕構成を生成
    acts.acts = generateDefaultActs(userInput.totalScenes);
  }

  // Characters データの検証・補完
  const characters: CharactersData = {
    characters: []
  };

  if (result.characters?.characters && Array.isArray(result.characters.characters)) {
    characters.characters = result.characters.characters.map((char: any, index: number) => ({
      id: char.id || `character-${index + 1}`,
      name: char.name || `キャラクター${index + 1}`,
      role: char.role || '登場人物',
      personality: char.personality || '',
      visualDescription: char.visualDescription || ''
    }));
  } else {
    // デフォルトキャラクターを生成
    characters.characters = generateDefaultCharacters();
  }

  return { summary, acts, characters };
}

/**
 * デフォルトの5幕構成を生成
 */
function generateDefaultActs(totalScenes: number): ActsData['acts'] {
  const scenesPerAct = Math.floor(totalScenes / 5);
  const remainingScenes = totalScenes % 5;
  
  const acts = [
    { title: '序幕', description: '物語の始まりと設定' },
    { title: '発展', description: '問題の発生と展開' },
    { title: '転換', description: '劇的な転換点' },
    { title: '危機', description: '最大の危機と葛藤' },
    { title: '結末', description: '解決と結論' }
  ];

  let sceneCounter = 1;
  
  return acts.map((act, actIndex) => {
    const currentScenesCount = scenesPerAct + (actIndex < remainingScenes ? 1 : 0);
    const scenes = [];
    
    for (let i = 0; i < currentScenesCount; i++) {
      scenes.push({
        sceneNumber: sceneCounter,
        sceneTitle: `シーン${sceneCounter}`,
        summary: `第${actIndex + 1}幕のシーン${i + 1}`
      });
      sceneCounter++;
    }
    
    return {
      actNumber: actIndex + 1,
      actTitle: act.title,
      description: act.description,
      scenes
    };
  });
}

/**
 * デフォルトキャラクターを生成
 */
function generateDefaultCharacters(): CharactersData['characters'] {
  return [
    {
      id: 'character-1',
      name: '主人公',
      role: '主人公',
      personality: '勇敢で決断力のある',
      visualDescription: '若々しく凛とした外見'
    },
    {
      id: 'character-2',
      name: '相手役',
      role: '相手役',
      personality: '優しく理解のある',
      visualDescription: '温かみのある外見'
    },
    {
      id: 'character-3',
      name: '語り手',
      role: '語り手',
      personality: '物語を導く賢明な',
      visualDescription: '落ち着いた威厳のある外見'
    }
  ];
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