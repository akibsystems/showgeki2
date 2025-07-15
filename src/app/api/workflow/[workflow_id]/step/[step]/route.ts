import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  Step1Input, Step1Output, Step2Input, Step2Output,
  Step3Input, Step3Output, Step4Input, Step4Output,
  Step5Input, Step5Output, Step6Input, Step6Output,
  Step7Input, Step7Output,
  Workflow, Storyboard, StepResponse,
  SummaryData, ActsData, CharactersData
} from '@/types/workflow';
import {
  generateStep2Input,
  generateStep3Input,
  generateStep4Input,
  generateStep5Input,
  generateStep6Input,
  generateStep7Input,
  processStep7Output,
  WorkflowStepManager
} from '@/lib/workflow/step-processors';

const DEFAULT_BGM = 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3';
// SERVICE_ROLEキーを使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type StepInput = Step1Input | Step2Input | Step3Input | Step4Input | Step5Input | Step6Input | Step7Input;
type StepOutput = Step1Output | Step2Output | Step3Output | Step4Output | Step5Output | Step6Output | Step7Output;

// ワークフロー生成エラークラス
class WorkflowGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public step: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WorkflowGenerationError';
  }
}

interface RouteParams {
  params: Promise<{
    workflow_id: string;
    step: string;
  }>;
}

/**
 * GET /api/workflow/[workflow_id]/step/[step]
 * workflow-design.mdで定義されたStepXInputを返す
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: '認証が必要です。UIDが見つかりません。' },
        { status: 401 }
      );
    }

    const { workflow_id, step } = await params;
    const stepNumber = parseInt(step, 10) as StepNumber;


    // バリデーション
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 7) {
      return NextResponse.json(
        { error: '無効なステップ番号です。1〜7の範囲で指定してください。' },
        { status: 400 }
      );
    }

    // ワークフローとストーリーボードを結合して取得
    const { data: workflowData, error: fetchError } = await supabase
      .from('workflows')
      .select(`
        *,
        storyboard:storyboards(*)
      `)
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (fetchError || !workflowData) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません。' },
        { status: 404 }
      );
    }

    const workflow = workflowData as Workflow & { storyboard: Storyboard };

    // step{N}_inputカラムから直接データを取得
    const stepInputColumnName = `step${stepNumber}_input` as keyof Workflow;
    let stepInput = workflow[stepInputColumnName] as any;

    // step{N}_inputが存在しない場合は生成して保存
    if (!stepInput) {
      stepInput = await generateStepInput(stepNumber, workflow.storyboard);
      
      // 生成したデータをstep{N}_inputに保存
      await supabase
        .from('workflows')
        .update({ [stepInputColumnName]: stepInput })
        .eq('id', workflow_id);
    }

    // stepInputを返す
    return NextResponse.json(stepInput);
  } catch (error) {
    console.error('Error fetching step data:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow/[workflow_id]/step/[step]
 * workflow-design.mdで定義されたStepXOutputを受け付けて保存
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // UIDをヘッダーから取得
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: '認証が必要です。UIDが見つかりません。' },
        { status: 401 }
      );
    }

    const { workflow_id, step } = await params;
    const stepNumber = parseInt(step, 10) as StepNumber;

    console.log(`[POST] /api/workflow/${workflow_id}/step/${step}`);
    console.log(`[POST] uid: ${uid}, stepNumber: ${stepNumber}`);

    // バリデーション
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 7) {
      return NextResponse.json(
        { error: '無効なステップ番号です。1〜7の範囲で指定してください。' },
        { status: 400 }
      );
    }

    // workflow-design.mdの仕様に従い、StepXOutputを直接受け取る
    const stepOutput = await request.json() as StepOutput;

    console.log(`[POST] Request body (StepOutput):`, JSON.stringify(stepOutput, null, 2));

    // StepXOutputの基本的な検証
    if (!stepOutput || !stepOutput.userInput) {
      return NextResponse.json(
        { error: '無効なデータ形式です。userInputが必要です。' },
        { status: 400 }
      );
    }

    // ワークフローとストーリーボードを取得
    const { data: workflowData, error: fetchError } = await supabase
      .from('workflows')
      .select(`
        *,
        storyboard:storyboards(*)
      `)
      .eq('id', workflow_id)
      .eq('uid', uid)
      .single();

    if (fetchError || !workflowData) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません。' },
        { status: 404 }
      );
    }

    const workflow = workflowData as Workflow & { storyboard: Storyboard };

    // ワークフローがアクティブでない場合は編集不可
    if (workflow.status !== 'active') {
      return NextResponse.json(
        { error: 'ワークフローがアクティブではありません。' },
        { status: 400 }
      );
    }

    // ワークフローのステップデータを更新
    const workflowUpdateData: any = {
      [`step${stepNumber}_out`]: stepOutput, // 履歴として保存
      [`step${stepNumber}_input`]: stepOutput.userInput, // 画面表示用データを保存
      current_step: Math.max(workflow.current_step, stepNumber),
    };

    // ステップ1-3の編集時は後続ステップをリセット
    if (stepNumber <= 3) {
      for (let i = stepNumber + 1; i <= 7; i++) {
        workflowUpdateData[`step${i}_in`] = null;
        workflowUpdateData[`step${i}_out`] = null;
        workflowUpdateData[`step${i}_input`] = null;
      }
    }

    // LLMで次ステップ用のデータを生成し、storyboardsを更新
    let nextStepInput: StepInput | null = null;
    let storyboardUpdates: Partial<Storyboard> = {};

    try {
      const result = await generateAndUpdateStoryboard(
        stepNumber,
        stepOutput,
        workflow.storyboard,
        workflow_id
      );
      nextStepInput = result.nextStepInput;
      storyboardUpdates = result.storyboardUpdates;
    } catch (error) {
      console.error('Storyboard generation error:', error);

      // WorkflowGenerationErrorの場合は、わかりやすいエラーメッセージを返す
      if (error instanceof WorkflowGenerationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            step: error.step,
            details: error.originalError?.message
          },
          { status: 500 }
        );
      }

      // その他のエラー
      return NextResponse.json(
        {
          error: 'データ生成中に予期しないエラーが発生しました。',
          code: 'UNKNOWN_GENERATION_ERROR',
          step: stepNumber
        },
        { status: 500 }
      );
    }

    // 次ステップの入力データをstep{N}_inputとして保存
    if (stepNumber < 7 && nextStepInput) {
      workflowUpdateData[`step${stepNumber + 1}_input`] = nextStepInput;
      // 互換性のため従来のstep_inも更新
      workflowUpdateData[`step${stepNumber + 1}_in`] = nextStepInput;
    }


    // トランザクション的に更新（エラー時は両方ロールバック）
    // 1. ワークフローを更新
    const { error: workflowUpdateError } = await supabase
      .from('workflows')
      .update(workflowUpdateData)
      .eq('id', workflow_id)
      .eq('uid', uid);

    if (workflowUpdateError) {
      console.error('Failed to update workflow:', workflowUpdateError);
      return NextResponse.json(
        { error: 'データの保存に失敗しました。' },
        { status: 500 }
      );
    }

    // 2. ストーリーボードを更新
    const { error: storyboardUpdateError } = await supabase
      .from('storyboards')
      .update(storyboardUpdates)
      .eq('id', workflow.storyboard_id)
      .eq('uid', uid);

    if (storyboardUpdateError) {
      console.error('Failed to update storyboard:', storyboardUpdateError);
      return NextResponse.json(
        { error: 'ストーリーボードの更新に失敗しました。' },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      nextStepInput: stepNumber < 7 ? nextStepInput : null,
    };


    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving step data:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}

/**
 * storyboardsから表示用データを生成
 */
async function generateStepInput(
  stepNumber: StepNumber,
  storyboard: Storyboard
): Promise<StepInput> {
  switch (stepNumber) {
    case 1:
      // Step1Input: 初期値または保存されたstory_dataから生成
      const storyData = storyboard.story_data as any;
      return {
        storyText: storyData?.originalText || '',
        characters: storyData?.characters || '',
        dramaticTurningPoint: storyData?.dramaticTurningPoint || '',
        futureVision: storyData?.futureVision || '',
        learnings: storyData?.learnings || '',
        totalScenes: storyData?.totalScenes || 5,
        settings: storyData?.settings || {
          style: 'shakespeare',
          language: 'ja',
        }
      };

    case 2:
      // Step2Input: summary_dataとacts_dataから生成
      return {
        suggestedTitle: storyboard.summary_data?.title || '',
        acts: storyboard.acts_data?.acts || [],
        charactersList: storyboard.characters_data?.characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role,
          personality: char.personality,
        })) || [],
      } as Step2Input;

    case 3:
      // Step3Input: summary_dataとcharacters_dataから生成
      return {
        title: storyboard.title || storyboard.summary_data?.title || '',
        detailedCharacters: storyboard.characters_data?.characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role,
          personality: char.personality,
          visualDescription: char.visualDescription,
        })) || [],
      } as Step3Input;

    case 4:
      // Step4Input: acts_dataとscenes_dataから生成
      return {
        title: storyboard.title || '',
        acts: storyboard.acts_data?.acts || [],
        scenes: storyboard.scenes_data?.scenes || []
      } as Step4Input;

    case 5:
      // Step5Input: characters_dataとscenes_dataから生成
      return {
        characters: storyboard.characters_data?.characters.map(char => ({
          id: char.id,
          name: char.name,
          suggestedVoice: char.voiceType || 'alloy'
        })) || [],
        scenes: storyboard.scenes_data?.scenes.map(scene => ({
          id: scene.id,
          title: scene.title,
          dialogue: scene.dialogue.map(line => ({
            speaker: line.speaker,
            text: line.text,
            audioUrl: undefined
          }))
        })) || []
      } as Step5Input;

    case 6:
      // Step6Input: audio_dataとcaption_dataから生成
      return {
        suggestedBgm: storyboard.audio_data?.bgmSettings?.defaultBgm || DEFAULT_BGM,
        bgmOptions: [DEFAULT_BGM],
        captionSettings: {
          enabled: storyboard.caption_data?.enabled ?? true,
          language: storyboard.caption_data?.language || 'ja'
        }
      } as Step6Input;

    case 7:
      // Step7Input: 最終確認用データ生成
      return {
        title: storyboard.title || '',
        description: storyboard.summary_data?.description || '',
        thumbnails: storyboard.scenes_data?.scenes.slice(0, 3).map(scene => ({
          sceneId: scene.id,
          imageUrl: scene.imageUrl || ''
        })) || [],
        estimatedDuration: storyboard.summary_data?.estimatedDuration || 60,
        preview: storyboard.mulmoscript || {
          $mulmocast: { version: '0.1.0' },
          title: storyboard.title || '',
          lang: storyboard.caption_data?.language || 'ja',
          beats: [],
          speechParams: { provider: 'openai', speakers: {} },
          imageParams: {},
          audioParams: storyboard.audio_data?.bgmSettings ? {
            bgm: { kind: 'url', url: storyboard.audio_data.bgmSettings.defaultBgm },
            bgmVolume: 0.5
          } : undefined,
          captionParams: storyboard.caption_data?.enabled ? {
            lang: storyboard.caption_data.language,
            styles: []
          } : undefined
        }
      } as Step7Input;

    default:
      return {} as StepInput;
  }
}

/**
 * LLM生成とstoryboard更新
 */
async function generateAndUpdateStoryboard(
  stepNumber: StepNumber,
  stepOutput: StepOutput,
  currentStoryboard: Storyboard,
  workflowId: string
): Promise<{ nextStepInput: StepInput | null; storyboardUpdates: Partial<Storyboard> }> {
  let storyboardUpdates: Partial<Storyboard> = {};
  let nextStepInput: StepInput | null = null;

  switch (stepNumber) {
    case 1:
      // Step1完了時: story_dataを更新し、AIでStep2Inputを生成
      const step1Output = stepOutput as Step1Output;

      // story_dataを更新（generateStepInputでStep1の初期値に使用される）
      storyboardUpdates.story_data = {
        originalText: step1Output.userInput.storyText,
        characters: step1Output.userInput.characters,
        dramaticTurningPoint: step1Output.userInput.dramaticTurningPoint,
        futureVision: step1Output.userInput.futureVision,
        learnings: step1Output.userInput.learnings,
        totalScenes: step1Output.userInput.totalScenes,
        settings: step1Output.userInput.settings,
      };

      try {
        // WorkflowStepManagerを使用してAI生成を実行
        const manager = new WorkflowStepManager(workflowId, currentStoryboard.id);
        const result = await manager.proceedToNextStep(1, step1Output);

        if (result.success && result.data) {
          nextStepInput = result.data;
        } else {
          const errorMessage = result.error?.message || 'AIによるストーリー生成に失敗しました';
          const errorCode = result.error?.code || 'STEP2_GENERATION_FAILED';
          throw new WorkflowGenerationError(
            `Step2入力の生成に失敗しました: ${errorMessage}`,
            errorCode,
            1
          );
        }
      } catch (error) {
        console.error('Step1→Step2 生成エラー:', error);

        // エラーを明確に返す
        if (error instanceof WorkflowGenerationError) {
          throw error;
        }

        throw new WorkflowGenerationError(
          'AIによるストーリー構成の生成中にエラーが発生しました。しばらく待ってから再度お試しください。',
          'AI_GENERATION_ERROR',
          1,
          error instanceof Error ? error : undefined
        );
      }
      break;

    case 2:
      // Step2完了時: AIでキャラクターを詳細化してStep3Inputを作成
      const step2Output = stepOutput as Step2Output;

      try {
        const manager = new WorkflowStepManager(workflowId, currentStoryboard.id);
        const result = await manager.proceedToNextStep(2, step2Output);

        if (result.success && result.data) {
          nextStepInput = result.data;
          // storyboardUpdatesはstep2-processor内で更新
        } else {
          const errorMessage = result.error?.message || 'AIによるキャラクター詳細化に失敗しました';
          const errorCode = result.error?.code || 'STEP3_GENERATION_FAILED';
          throw new WorkflowGenerationError(
            `Step3入力の生成に失敗しました: ${errorMessage}`,
            errorCode,
            2
          );
        }
      } catch (error) {
        console.error('Step2→Step3 生成エラー:', error);

        if (error instanceof WorkflowGenerationError) {
          throw error;
        }

        throw new WorkflowGenerationError(
          'AIによるキャラクター設定の生成中にエラーが発生しました。しばらく待ってから再度お試しください。',
          'AI_GENERATION_ERROR',
          2,
          error instanceof Error ? error : undefined
        );
      }
      break;

    case 3:
      // Step3完了時: step3-generatorを使用してStep4Inputを生成
      const step3Output = stepOutput as Step3Output;

      try {
        // step3-generatorを呼び出してStep4Inputを生成
        nextStepInput = await generateStep4Input(
          workflowId,
          currentStoryboard.id,
          step3Output
        );

        // storyboardUpdatesは generateStep4Input 内で更新されるため、ここでは空
        // 将来的にはgeneratorから更新内容を返すように変更することも検討
      } catch (error) {
        console.error('Step4入力生成エラー:', error);
        // エラー時は空のStep4Inputを返す
        nextStepInput = {
          title: currentStoryboard.title || '',
          acts: currentStoryboard.acts_data?.acts || [],
          scenes: []
        } as Step4Input;
      }
      break;

    case 4:
      // Step4完了時: 編集されたscenes_dataを更新
      const step4Output = stepOutput as Step4Output;

      // 既存のscenes_dataをマージして更新
      const currentScenes = currentStoryboard.scenes_data?.scenes || [];
      const updatedScenes = currentScenes.map(scene => {
        const userEdit = step4Output.userInput.scenes.find(s => s.id === scene.id);
        if (userEdit) {
          return {
            ...scene,
            imagePrompt: userEdit.imagePrompt,
            dialogue: userEdit.dialogue,
            customImage: userEdit.customImage
          };
        }
        return scene;
      });

      storyboardUpdates.scenes_data = {
        scenes: updatedScenes
      };

      console.log('[Step4 Save] Updated scenes_data with edited prompts:', JSON.stringify(storyboardUpdates.scenes_data, null, 2));

      // Step5Input を生成（音声生成用）
      nextStepInput = {
        characters: currentStoryboard.characters_data?.characters.map(char => ({
          id: char.id,
          name: char.name,
          suggestedVoice: char.voiceType || 'alloy' // デフォルト音声
        })) || [],
        scenes: updatedScenes.map(scene => ({
          id: scene.id,
          title: scene.title,
          dialogue: scene.dialogue.map(line => ({
            speaker: line.speaker,
            text: line.text,
            audioUrl: undefined // 音声はまだ生成されていない
          }))
        }))
      } as Step5Input;
      break;

    case 5:
      // Step5完了時: audio_dataを更新
      const step5Output = stepOutput as Step5Output;

      storyboardUpdates.audio_data = {
        voiceSettings: step5Output.userInput.voiceSettings,
        bgmSettings: {
          defaultBgm: DEFAULT_BGM, // デフォルトBGM
          sceneBgm: {}
        }
      };

      // Step6Input を生成（BGM & 字幕設定用）
      nextStepInput = {
        suggestedBgm: DEFAULT_BGM,
        bgmOptions: [DEFAULT_BGM],
        captionSettings: {
          enabled: true,
          language: 'ja'
        }
      } as Step6Input;
      break;

    case 6:
      // Step6完了時: WorkflowStepManagerを使用してStep7Inputを生成
      const step6Output = stepOutput as Step6Output;

      // WorkflowStepManagerを使用してgenerateStep7Inputを呼ぶ
      const stepManager = new WorkflowStepManager(workflowId, currentStoryboard.id);
      const step7InputResult = await stepManager.proceedToNextStep(6, step6Output);

      if (!step7InputResult.success || !step7InputResult.data) {
        const errorMessage = step7InputResult.error?.message || 'Step7入力の生成に失敗しました';
        throw new WorkflowGenerationError(errorMessage, 'STEP7_GENERATION_FAILED', 6);
      }

      nextStepInput = step7InputResult.data;

      // storyboardの更新は generateStep7Input 内で行われているため、
      // ここでは追加の更新は不要（空のオブジェクトを返す）
      break;

    case 7:
      // Step7完了時: 最終的なMulmoScriptを生成
      const step7Output = stepOutput as Step7Output;

      // summary_dataの最終更新
      storyboardUpdates.summary_data = {
        ...currentStoryboard.summary_data,
        title: step7Output.userInput.title,
        description: step7Output.userInput.description,
        tags: step7Output.userInput.tags
      } as SummaryData;

      storyboardUpdates.title = step7Output.userInput.title;

      // ワークフローのstatusを完了に更新
      storyboardUpdates.status = 'completed';

      // MulmoScriptは別途generate-script APIで生成するため、ここでは生成しない
      break;

    default:
      break;
  }

  return { nextStepInput, storyboardUpdates };
}

