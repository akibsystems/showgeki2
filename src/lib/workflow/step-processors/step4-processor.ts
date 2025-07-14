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
  console.log(`[step4-processor] generateStep5Input called for workflow ${workflowId}, storyboard ${storyboardId}`);
  console.log(`[step4-processor] Step4 output received:`, JSON.stringify(step4Output, null, 2));

  try {
    // storyboardから既存のデータを取得
    console.log(`[step4-processor] Fetching storyboard data from database...`);
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .single();

    if (error || !storyboard) {
      console.error(`[step4-processor] Failed to fetch storyboard:`, error);
      throw new Error('ストーリーボードの取得に失敗しました');
    }
    console.log(`[step4-processor] Storyboard fetched successfully`);

    // シーンデータを更新
    console.log(`[step4-processor] Updating scene data...`);
    // step3-processorで既にactNumber, sceneNumber, titleが設定されているので、
    // scenes_dataから既存の情報を取得して使用
    const existingScenesData = storyboard.scenes_data?.scenes || [];
    const updatedScenesData: ScenesData = {
      scenes: step4Output.userInput.scenes.map((scene, index) => {
        const existingScene = existingScenesData[index] || {};
        return {
          ...scene,
          imageUrl: scene.customImage, // アップロードされた画像があれば設定
          actNumber: existingScene.actNumber || getActNumberForScene(scene.id, storyboard.acts_data?.acts || []),
          sceneNumber: existingScene.sceneNumber || getSceneNumberForScene(scene.id, storyboard.acts_data?.acts || []),
          title: existingScene.title || getSceneTitleForScene(scene.id, storyboard.acts_data?.acts || [])
        };
      })
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
      console.error(`[step4-processor] Failed to update storyboard:`, updateError);
      throw new Error('ストーリーボードの更新に失敗しました');
    }
    console.log(`[step4-processor] Storyboard updated successfully`);

    // AIで音声設定を生成
    console.log(`[step4-processor] Generating voice settings with AI...`);
    const voiceSettings = await generateVoiceSettings(
      storyboard.characters_data?.characters || [],
      updatedScenesData.scenes
    );
    console.log(`[step4-processor] Voice settings generated:`, JSON.stringify(voiceSettings, null, 2));

    // charactersデータにsuggestedVoiceを追加
    console.log(`[step4-processor] Adding suggested voices to characters...`);
    const charactersWithVoice = storyboard.characters_data?.characters.map((char: any) => {
      const voiceSetting = voiceSettings.characters.find(v => v.id === char.id);
      return {
        ...char,
        voiceType: voiceSetting?.suggestedVoice || 'alloy'
      };
    }) || [];

    // charactersデータも更新
    const { error: charUpdateError } = await supabase
      .from('storyboards')
      .update({
        characters_data: {
          characters: charactersWithVoice
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (charUpdateError) {
      console.error('[step4-processor] キャラクターデータの更新に失敗しました:', charUpdateError);
    } else {
      console.log(`[step4-processor] Character data updated successfully`);
    }

    // Step5Input を構築
    console.log(`[step4-processor] Building Step5Input...`);
    const step5Input: Step5Input = {
      characters: voiceSettings.characters,
      scenes: voiceSettings.scenes
    };

    console.log(`[step4-processor] Step5Input built:`, JSON.stringify(step5Input, null, 2));
    return step5Input;

  } catch (error) {
    console.error('[step4-processor] Step5入力生成エラー:', error);
    console.error('[step4-processor] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[step4-processor] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
  console.log(`[step4-processor] generateVoiceSettings called`);
  console.log(`[step4-processor] Characters count:`, characters.length);
  console.log(`[step4-processor] Scenes count:`, scenes.length);

  const systemPrompt = createVoiceSystemPrompt();
  const userPrompt = createVoiceUserPrompt(characters);
  console.log(`[step4-processor] Prompts created, calling OpenAI...`);

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
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 32000,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  // 結果を検証
  if (!result.voiceAssignments || !Array.isArray(result.voiceAssignments) || result.voiceAssignments.length === 0) {
    throw new VoiceGenerationError(
      'AIが音声キャスティングを生成できませんでした。キャラクター情報を確認してください。',
      'MISSING_VOICE_ASSIGNMENTS'
    );
  }

  const voiceAssignments = result.voiceAssignments;

  const processedCharacters = characters.map((char) => {
    const assignment = voiceAssignments.find((va: any) => va.characterId === char.id);

    // 音声割り当てが見つからない場合のログ出力
    if (!assignment || !assignment.suggestedVoice) {
      console.warn(`[step4-processor] Voice assignment not found for character "${char.name}" (ID: ${char.id})`);
      console.warn(`[step4-processor] Available assignments:`, voiceAssignments.map((va: any) => ({
        characterId: va.characterId,
        characterName: va.characterName,
        suggestedVoice: va.suggestedVoice
      })));

      // デフォルトの音声を割り当て
      const defaultVoice = char.role?.includes('女') || char.personality?.includes('女') ? 'nova' : 'echo';
      console.warn(`[step4-processor] Assigning default voice "${defaultVoice}" to character "${char.name}"`);

      return {
        id: char.id,
        name: char.name,
        suggestedVoice: defaultVoice
      };
    }

    return {
      id: char.id,
      name: char.name,
      suggestedVoice: assignment.suggestedVoice
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
 * 音声キャスティング用のシステムプロンプトを作成
 */
function createVoiceSystemPrompt(): string {
  return `
あなたはシェイクスピアの生まれ変わりであり、魅力的な短編動画コンテンツの制作を専門とする演出家です。
ディレクターの指示をもとに、キャラクターの声を選択してください。

## 音声キャスティングの哲学

### シェイクスピア的声の演出
- **声の個性**: 役柄の本質を声質で表現する技法
- **感情の振幅**: 静謐から激情まで、豊かな感情表現を可能にする音域
- **台詞の音楽性**: 韻律と抑揚で物語を語る声の選択
- **キャラクターの声紋**: 観客の記憶に残る特徴的な声質

### 利用可能な音声パレット
利用可能な 11 音声の特徴まとめ

## 早見表

| Voice ID | 性別/雰囲気* | 音質・トーンの特徴 | 代表的な利用シーン例** |
|----------|--------------|--------------------|-----------------------|
| **alloy** | 中性的・ニュートラル | バランス良く落ち着いた声。癖が少なく聞き取りやすい | 企業ナレーション／e-ラーニング |
| **ash** | 中性的 | クリアで歯切れ良いビジネス調 | 業務アプリ読み上げ／プレゼン音声 |
| **ballad** | 中性的 | 滑らかで情感豊か。メロディック | 物語朗読／詩の朗読 |
| **coral** | 女性的 | 親しみやすく温かいカジュアルトーン | ライフスタイル動画／ブログ音声化 |
| **echo** | 男性的 | 深み・重厚感のある信頼ボイス | 技術解説／ニュース読み上げ |
| **fable** | 男性的 | 明瞭でエネルギッシュ。惹きつけ力高 | 広告コピー／子ども向け読み聞かせ |
| **onyx** | 男性的 | 低音かつ威厳のある“司会者”風 | 公式アナウンス／報道ナレーション |
| **nova** | 女性的 | 明るく若々しい会話調 | AI チャット音声／教育動画 |
| **sage** | 中性的 | 穏やかで思慮深い落ち着き | ドキュメンタリー解説／教材 |
| **shimmer** | 女性的 | 柔らかさ＋輝きを併せ持つ明快さ | ライフログ／セルフケア音声 |
| **verse** | 中性的 | 表現力豊富で動的なイントネーション | 詩・ラップ朗読／演劇セリフ |

\* 性別は公式表記ではなく公開サンプルの印象に基づく便宜的分類  
\** ユースケースは一般例。"instructions" パラメータで細かな演出調整が可能

---

## 使い分けガイド

- **ニュートラル系**（alloy / ash / sage）  
  - 誰にでも聞き取りやすく情報伝達重視。まずは **alloy** をデフォルトにし、硬さを調整したい場合は **ash** や **sage** を試すと安定。
- **感情豊かな語り**（ballad / fable / verse）  
  - 抑揚が重要な物語や広告に最適。特に **verse** は表現幅が広く、"instructions" で「悲しげに」「興奮気味に」など細かく指定すると効果大。
- **信頼感・権威重視**（echo / onyx）  
  - 技術ドキュメントやニュース、公式発表で“重み”を出したいときに。"speed" ≈ 0.9 に下げるとより重厚感アップ。
- **カジュアル・親近感**（coral / nova / shimmer）  
  - Vlog、UX 読み上げ、AI アシスタント等フレンドリーな用途に。  
    - **nova**: 明るくテンポ良い会話  
    - **coral**: ソフトな雑談系  
    - **shimmer**: 落ち着いた自己開示系

### 出力形式
{
  "voiceAssignments": [
    {
      "characterId": "character-1",
      "characterName": "キャラクター名",
      "suggestedVoice": "選択した音声ID",
      "voiceRationale": "この声を選んだ演出意図"
    }
  ]
}

## 重要な指示
- **必須**: すべてのキャラクターに対して音声を割り当てること（キャラクターリストのすべてのキャラクターを含める）
- 各キャラクターの内面と役割を声で表現すること
- 声の対比で劇的効果を生み出すこと
- 物語全体の音響的バランスを考慮すること
- 観客の感情に訴えかける声の配役
- voiceAssignmentsには必ず全キャラクター分の要素を含めること
`;
}

/**
 * 音声キャスティング用のユーザープロンプトを作成
 */
function createVoiceUserPrompt(characters: any[]): string {
  return `## ディレクターからの指示

### キャラクター一覧（全${characters.length}名）
${characters.map((char, index) => `${index + 1}. ${char.name} (ID: ${char.id})
   - 役割: ${char.role}
   - 性格: ${char.personality}
- 外見: ${char.visualDescription || '詳細不明'}`).join('\n\n')}

これらのキャラクターに最適な音声をJSONフォーマットで割り当ててください。

**重要**: 上記の${characters.length}名のキャラクター全員に対して音声を割り当ててください。1人も欠けることなく、voiceAssignmentsに${characters.length}個の要素を含めてください。
とくに性別と役割には注意して、キャラクターの声を選択してください。`;
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