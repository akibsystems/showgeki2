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
  const prompt = `
以下のキャラクターに適切なOpenAI音声を割り当ててください：

## 利用可能な音声
- alloy: 中性的で落ち着いた声
- echo: 男性的で深みのある声
- fable: 若々しく明るい女性の声
- nova: エネルギッシュな女性の声
- onyx: 重厚で威厳のある男性の声
- shimmer: 優しく柔らかな女性の声

## キャラクター情報
${characters.map(char => `- ${char.name}: ${char.role} (${char.personality})`).join('\n')}

## 生成要件
各キャラクターに最適な音声を選択してください。
性格、年齢、役割を考慮して適切な音声を割り当てること。

JSONフォーマットで出力してください：
{
  "voiceAssignments": [
    {
      "characterId": "character-1",
      "characterName": "キャラクター名",
      "suggestedVoice": "alloy"
    }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      {
        role: 'system',
        content: 'あなたは音声キャスティングの専門家です。キャラクターの特徴に合った音声を選択してください。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  // 結果を処理
  const voiceAssignments = result.voiceAssignments || [];
  
  const processedCharacters = characters.map((char, index) => {
    const assignment = voiceAssignments.find((va: any) => va.characterId === char.id);
    return {
      id: char.id,
      name: char.name,
      suggestedVoice: assignment?.suggestedVoice || getDefaultVoice(char.role, index)
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
 * デフォルト音声を取得
 */
function getDefaultVoice(role: string, index: number): string {
  const defaultVoices = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];
  
  // 役割に基づいてデフォルト音声を選択
  if (role.includes('主人公')) return 'nova';
  if (role.includes('語り手')) return 'shimmer';
  if (role.includes('悪役')) return 'onyx';
  if (role.includes('相手役')) return 'fable';
  
  // フォールバック
  return defaultVoices[index % defaultVoices.length];
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