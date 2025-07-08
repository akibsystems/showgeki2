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
import { generateStep4Input } from '@/lib/workflow/generators/step3-generator';
import { 
  generateStep2Input,
  generateStep3Input,
  generateStep5Input,
  generateStep6Input,
  generateStep7Input,
  processStep7Output,
  WorkflowStepManager
} from '@/lib/workflow/step-processors';

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
        { error: 'Unauthorized: UID required' },
        { status: 401 }
      );
    }

    const { workflow_id, step } = await params;
    const stepNumber = parseInt(step, 10) as StepNumber;

    console.log(`[GET] /api/workflow/${workflow_id}/step/${step}`);
    console.log(`[GET] uid: ${uid}, stepNumber: ${stepNumber}`);

    // バリデーション
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 7) {
      return NextResponse.json(
        { error: 'Invalid step number' },
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
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflow = workflowData as Workflow & { storyboard: Storyboard };

    // ステップ入力データ（キャッシュ）を取得
    const stepInColumnName = `step${stepNumber}_in` as keyof Workflow;
    let stepInput = workflow[stepInColumnName] as StepInput | undefined;

    // キャッシュがない場合は、storyboardsから再生成
    if (!stepInput && stepNumber > 1) {
      // 最初はストーリーボードの内容から、各ステップの入力を合成する
      stepInput = await generateStepInput(stepNumber, workflow.storyboard);

      // キャッシュを保存
      await supabase
        .from('workflows')
        .update({ [stepInColumnName]: stepInput })
        .eq('id', workflow_id);
    }

    // workflow-design.mdの仕様に従い、StepXInputのみを返す
    const response = stepInput || {};

    console.log(`[GET] Response:`, JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching step data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
        { error: 'Unauthorized: UID required' },
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
        { error: 'Invalid step number' },
        { status: 400 }
      );
    }

    // workflow-design.mdの仕様に従い、StepXOutputを直接受け取る
    const stepOutput = await request.json() as StepOutput;

    console.log(`[POST] Request body (StepOutput):`, JSON.stringify(stepOutput, null, 2));

    // StepXOutputの基本的な検証
    if (!stepOutput || !stepOutput.userInput) {
      return NextResponse.json(
        { error: 'Invalid StepOutput format: userInput is required' },
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
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflow = workflowData as Workflow & { storyboard: Storyboard };

    // ワークフローがアクティブでない場合は編集不可
    if (workflow.status !== 'active') {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    // ワークフローのステップ出力データを更新
    const workflowUpdateData: any = {
      [`step${stepNumber}_out`]: stepOutput,
      current_step: Math.max(workflow.current_step, stepNumber),
    };

    // Step1の場合のみ、stepX_inにuserInputを保存（次回のGET用）
    if (stepNumber === 1) {
      workflowUpdateData[`step${stepNumber}_in`] = stepOutput.userInput;
    }

    // ステップ1-3の編集時は後続ステップをリセット
    if (stepNumber <= 3) {
      for (let i = stepNumber + 1; i <= 7; i++) {
        workflowUpdateData[`step${i}_in`] = null;
        workflowUpdateData[`step${i}_out`] = null;
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
          error: 'データ生成中に予期しないエラーが発生しました',
          code: 'UNKNOWN_GENERATION_ERROR',
          step: stepNumber
        },
        { status: 500 }
      );
    }

    // 次ステップの入力データをキャッシュとして保存
    if (stepNumber < 7) {
      workflowUpdateData[`step${stepNumber + 1}_in`] = nextStepInput;
    }

    //console.log(`[POST] Workflow update data:`, JSON.stringify(workflowUpdateData, null, 2));
    console.log(`[POST] Storyboard update data:`, JSON.stringify(storyboardUpdates, null, 2));

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
        { error: 'Failed to save data' },
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
        { error: 'Failed to update storyboard' },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      nextStepInput: stepNumber < 7 ? nextStepInput : null,
    };

    console.log(`[POST] Response:`, JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error saving step data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
        suggestedBgm: storyboard.audio_data?.bgmSettings?.defaultBgm || 'default-bgm-1',
        bgmOptions: ['default-bgm-1', 'default-bgm-2', 'default-bgm-3', 'epic', 'emotional', 'peaceful'],
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
  const storyboardUpdates: Partial<Storyboard> = {};
  let nextStepInput: StepInput | null = null;

  switch (stepNumber) {
    case 1:
      // Step1完了時: AIでstoryboardを生成してStep2Inputを作成
      const step1Output = stepOutput as Step1Output;
      
      try {
        // WorkflowStepManagerを使用してAI生成を実行
        const manager = new WorkflowStepManager(workflowId, currentStoryboard.id);
        const result = await manager.proceedToNextStep(1, step1Output);
        
        if (result.success && result.data) {
          nextStepInput = result.data;
          // storyboardUpdatesは step1-processor内で既に更新されているため、ここでは空
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
          defaultBgm: 'default-bgm-1', // デフォルトBGM
          sceneBgm: {}
        }
      };

      // Step6Input を生成（BGM & 字幕設定用）
      nextStepInput = {
        suggestedBgm: 'default-bgm-1',
        bgmOptions: ['default-bgm-1', 'default-bgm-2', 'default-bgm-3', 'epic', 'emotional', 'peaceful'],
        captionSettings: {
          enabled: true,
          language: 'ja'
        }
      } as Step6Input;
      break;

    case 6:
      // Step6完了時: audio_dataとcaption_dataを更新
      const step6Output = stepOutput as Step6Output;

      // audio_dataのBGM設定を更新
      storyboardUpdates.audio_data = {
        ...currentStoryboard.audio_data,
        bgmSettings: {
          defaultBgm: step6Output.userInput.bgm.selected,
          sceneBgm: {} // シーンごとのBGM設定は将来実装
        }
      };

      // caption_dataを更新
      storyboardUpdates.caption_data = {
        enabled: step6Output.userInput.caption.enabled,
        language: step6Output.userInput.caption.language,
        styles: step6Output.userInput.caption.styles
      };

      // Step7Input を生成（最終確認用）
      // MulmoScriptを生成する必要がある
      nextStepInput = {
        title: currentStoryboard.title || '',
        description: currentStoryboard.summary_data?.description || '',
        thumbnails: currentStoryboard.scenes_data?.scenes.slice(0, 3).map(scene => ({
          sceneId: scene.id,
          imageUrl: '' // 画像はまだ生成されていない
        })) || [],
        estimatedDuration: currentStoryboard.summary_data?.estimatedDuration || 60,
        preview: {
          $mulmocast: { version: '0.1.0' },
          title: currentStoryboard.title || '',
          lang: step6Output.userInput.caption.language,
          beats: [],
          speechParams: { provider: 'openai', speakers: {} },
          imageParams: {},
          audioParams: {
            bgm: { kind: 'url', url: step6Output.userInput.bgm.selected },
            bgmVolume: step6Output.userInput.bgm.volume
          },
          captionParams: step6Output.userInput.caption.enabled ? {
            lang: step6Output.userInput.caption.language,
            styles: []
          } : undefined
        }
      } as Step7Input;
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

/**
 * シーン数に基づいて幕場構成を生成
 */
function generateActsStructure(totalScenes: number) {
  const acts = [];
  const actTitles = ['運命の出会い', '試練と成長', '挫折と再起', '決戦への道', '新たな始まり'];
  const sceneTitles = [
    ['序章 - 平凡な日常', '転機の訪れ', '新たな世界へ'],
    ['最初の壁', '仲間との出会い', '力の目覚め'],
    ['大きな失敗', '内なる声', '再起への決意'],
    ['最後の準備', '運命の対決', '激闘の果てに'],
    ['勝利と別れ', '未来への扉', 'エピローグ']
  ];
  const sceneSummaries = [
    ['主人公の日常生活と内に秘めた夢への憧れ', '運命的な出会いが主人公の人生を大きく変える', '新しい世界への第一歩を踏み出す'],
    ['新しい世界での困難と戸惑い', '共に困難を乗り越える仲間との絆', '隠された力が目覚め始める'],
    ['自信を失い、夢を諦めかける主人公', '自分自身と向き合い、真の目的を見つける', '新たな決意と共に立ち上がる'],
    ['仲間と共に最終決戦への準備を整える', '全てを賭けた最後の挑戦', '激しい戦いの中で真の強さを発揮'],
    ['目標を達成し、それぞれの道へ', '成長した主人公が新たな冒険へ旅立つ', '物語の終わりと新たな始まり']
  ];

  // 5幕構成で、各幕のシーン数を計算
  let totalScenesAssigned = 0;
  const scenesPerAct = Math.ceil(totalScenes / 5);

  for (let actIndex = 0; actIndex < 5; actIndex++) {
    const actScenes = [];
    const actualScenesInAct = Math.min(scenesPerAct, totalScenes - totalScenesAssigned);

    for (let sceneIndex = 0; sceneIndex < actualScenesInAct; sceneIndex++) {
      actScenes.push({
        sceneNumber: sceneIndex + 1,
        sceneTitle: sceneTitles[actIndex][sceneIndex] || `第${sceneIndex + 1}場`,
        summary: sceneSummaries[actIndex][sceneIndex] || `第${actIndex + 1}幕第${sceneIndex + 1}場の内容`
      });
      totalScenesAssigned++;
    }

    if (actScenes.length > 0) {
      acts.push({
        actNumber: actIndex + 1,
        actTitle: actTitles[actIndex],
        description: '',
        scenes: actScenes
      });
    }
  }

  return acts;
}