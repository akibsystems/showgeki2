/**
 * ワークフロー・ステップ・プロセッサー
 * 
 * 各ステップの入力から次のステップの入力を生成するAI処理を管理
 */

// Step 1: ストーリー入力 → 初期storyboard生成
import { 
  generateStep2Input,
  StoryboardGenerationError,
  validateGenerationResult
} from './step1-processor';

export { generateStep2Input, StoryboardGenerationError, validateGenerationResult };

// Step 2: 初期幕場レビュー → キャラクター詳細化
import { 
  generateStep3Input,
  CharacterGenerationError
} from './step2-processor';

export { generateStep3Input, CharacterGenerationError };

// Step 3: キャラクタ&画風設定 → 台本&静止画生成
import { 
  generateStep4Input,
  SceneGenerationError
} from './step3-processor';

export { generateStep4Input, SceneGenerationError };

// Step 4: 台本&静止画プレビュー → 音声生成準備
import { 
  generateStep5Input,
  VoiceGenerationError
} from './step4-processor';

export { generateStep5Input, VoiceGenerationError };

// Step 5: 音声生成 → BGM & 字幕設定
import { 
  generateStep6Input,
  BGMGenerationError
} from './step5-processor';

export { generateStep6Input, BGMGenerationError };

// Step 6: BGM & 字幕設定 → 最終確認
import { 
  generateStep7Input,
  FinalGenerationError
} from './step6-processor';

export { generateStep7Input, FinalGenerationError };

// Step 7: 最終確認 → 完了処理
import { 
  processStep7Output,
  getWorkflowProgress,
  WorkflowCompletionError
} from './step7-processor';

export { processStep7Output, getWorkflowProgress, WorkflowCompletionError };

// 共通型定義
export type StepProcessorResult<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    originalError?: Error;
  };
};

// 共通エラーハンドリング
export class StepProcessorError extends Error {
  constructor(
    message: string,
    public step: number,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StepProcessorError';
  }
}

// プロセッサー実行用のヘルパー関数
export async function executeStepProcessor<T>(
  processorFn: () => Promise<T>,
  step: number,
  errorCode: string
): Promise<StepProcessorResult<T>> {
  try {
    const data = await processorFn();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error(`Step ${step} processor error:`, error);
    
    // 特定のエラータイプをチェックして、適切なエラー情報を返す
    if (error instanceof StoryboardGenerationError ||
        error instanceof CharacterGenerationError ||
        error instanceof SceneGenerationError ||
        error instanceof VoiceGenerationError ||
        error instanceof BGMGenerationError ||
        error instanceof FinalGenerationError ||
        error instanceof WorkflowCompletionError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          originalError: error
        }
      };
    }
    
    // その他のエラーの場合
    return {
      success: false,
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        originalError: error instanceof Error ? error : undefined
      }
    };
  }
}

// ステップ進行管理
export class WorkflowStepManager {
  private workflowId: string;
  private storyboardId: string;

  constructor(workflowId: string, storyboardId: string) {
    this.workflowId = workflowId;
    this.storyboardId = storyboardId;
  }

  /**
   * 次のステップへの進行を実行
   */
  async proceedToNextStep(
    currentStep: number,
    stepOutput: any
  ): Promise<StepProcessorResult<any>> {
    switch (currentStep) {
      case 1:
        return executeStepProcessor(
          () => generateStep2Input(this.workflowId, this.storyboardId, stepOutput),
          2,
          'STEP2_GENERATION_FAILED'
        );
      
      case 2:
        return executeStepProcessor(
          () => generateStep3Input(this.workflowId, this.storyboardId, stepOutput),
          3,
          'STEP3_GENERATION_FAILED'
        );
      
      case 3:
        return executeStepProcessor(
          () => generateStep4Input(this.workflowId, this.storyboardId, stepOutput),
          4,
          'STEP4_GENERATION_FAILED'
        );
      
      case 4:
        return executeStepProcessor(
          () => generateStep5Input(this.workflowId, this.storyboardId, stepOutput),
          5,
          'STEP5_GENERATION_FAILED'
        );
      
      case 5:
        return executeStepProcessor(
          () => generateStep6Input(this.workflowId, this.storyboardId, stepOutput),
          6,
          'STEP6_GENERATION_FAILED'
        );
      
      case 6:
        return executeStepProcessor(
          () => generateStep7Input(this.workflowId, this.storyboardId, stepOutput),
          7,
          'STEP7_GENERATION_FAILED'
        );
      
      case 7:
        return executeStepProcessor(
          () => processStep7Output(this.workflowId, this.storyboardId, stepOutput),
          7,
          'STEP7_COMPLETION_FAILED'
        );
      
      default:
        return {
          success: false,
          error: {
            code: 'INVALID_STEP',
            message: `無効なステップ番号: ${currentStep}`
          }
        };
    }
  }

  /**
   * ワークフロー進行状況の取得
   */
  async getProgress(): Promise<StepProcessorResult<any>> {
    return executeStepProcessor(
      () => getWorkflowProgress(this.workflowId),
      0,
      'PROGRESS_FETCH_FAILED'
    );
  }
}

// 便利な使用例
export const createWorkflowManager = (workflowId: string, storyboardId: string) => 
  new WorkflowStepManager(workflowId, storyboardId);