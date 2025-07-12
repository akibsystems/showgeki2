// Instant Mode のメイン処理エンジン

import { InstantStatus } from './instant-status';
import { INSTANT_DEFAULTS, getSceneCountForDuration, getImageStyleConfig } from './instant-defaults';
import { WorkflowStepManager } from '@/lib/workflow/step-processors';
import { createAdminClient } from '@/lib/supabase/server';
import type { InstantModeInput } from '@/types/instant';
import type { Step1Output, Step3Output, Step6Output } from '@/types/workflow';
import type { Mulmoscript } from '@/lib/schemas';

interface ProcessInstantModeParams {
  instantId: string;
  storyboardId: string;
  uid: string;
  input: InstantModeInput;
}

/**
 * Instant Mode のメイン処理関数
 * 全てのステップを順次実行し、動画を生成する
 */
export async function processInstantMode({
  instantId,
  storyboardId,
  uid,
  input
}: ProcessInstantModeParams) {
  const status = new InstantStatus(instantId);
  const supabase = await createAdminClient();
  
  // Create a real workflow for this instant mode
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .insert({
      storyboard_id: storyboardId,
      uid: uid,
      current_step: 1,
      status: 'active'
    })
    .select()
    .single();
    
  if (workflowError || !workflow) {
    throw new Error('ワークフローの作成に失敗しました');
  }
  
  const stepManager = new WorkflowStepManager(workflow.id, storyboardId);
  
  console.log(`[InstantGenerator] Starting instant mode for ${instantId}`);

  try {
    // Step 1→2: ストーリー解析と幕場構成生成
    await status.update('analyzing');
    
    // Step1Output を準備
    const step1Output: Step1Output = {
      userInput: {
        storyText: input.storyText,
        characters: '', // 自動推定
        dramaticTurningPoint: '', // 自動推定
        futureVision: '',
        learnings: '',
        totalScenes: getSceneCountForDuration(input.duration || 'medium'),
        settings: {
          style: 'shakespeare',
          language: 'ja'
        }
      }
    };
    
    // ワークフローのstep1_outに保存（既存のprocessorが期待するため）
    await saveStepOutput(supabase, workflow.id, 1, step1Output);
    
    // Step 1→2 の処理を実行
    const step2Result = await stepManager.proceedToNextStep(1, step1Output);
    if (!step2Result.success) {
      throw new Error(step2Result.error?.message || 'Step2生成に失敗しました');
    }
    await status.update('structuring', undefined, 20);

    // Step 2→3: キャラクター詳細生成
    // 既存のprocessorはユーザー入力を期待するので、デフォルト値を設定
    const step2Output = {
      userInput: {
        title: input.title || step2Result.data.suggestedTitle,
        acts: step2Result.data.acts
      }
    };
    await saveStepOutput(supabase, workflow.id, 2, step2Output);
    
    const step3Result = await stepManager.proceedToNextStep(2, step2Output);
    if (!step3Result.success) {
      throw new Error(step3Result.error?.message || 'Step3生成に失敗しました');
    }
    await status.update('characters', undefined, 35);

    // Step 3→4: 台本生成
    // 画風設定を追加
    const imageStyle = input.style || 'anime';
    const styleConfig = getImageStyleConfig(imageStyle);
    const step3Output: Step3Output = {
      userInput: {
        characters: step3Result.data.detailedCharacters.map((char: any) => ({
          id: char.id,
          name: char.name,
          description: `${char.personality} ${char.visualDescription}`,
          faceReference: undefined
        })),
        imageStyle: {
          preset: imageStyle,
          customPrompt: styleConfig.prompt_suffix
        }
      }
    };
    await saveStepOutput(supabase, workflow.id, 3, step3Output);
    
    const step4Result = await stepManager.proceedToNextStep(3, step3Output);
    if (!step4Result.success) {
      throw new Error(step4Result.error?.message || 'Step4生成に失敗しました');
    }
    await status.update('script', undefined, 50);

    // Step 4→5: 音声設定（デフォルト割り当て）
    // 編集なしでそのまま次へ
    const step4Output = {
      userInput: {
        scenes: step4Result.data.scenes
      }
    };
    await saveStepOutput(supabase, workflow.id, 4, step4Output);
    
    const step5Result = await stepManager.proceedToNextStep(4, step4Output);
    if (!step5Result.success) {
      throw new Error(step5Result.error?.message || 'Step5生成に失敗しました');
    }
    await status.update('voices', undefined, 65);

    // Step 5→6: BGM・字幕設定
    // デフォルトの音声割り当てをそのまま使用
    const step5Output = {
      userInput: {
        voiceSettings: extractVoiceSettingsFromStep5(step5Result.data)
      }
    };
    await saveStepOutput(supabase, workflow.id, 5, step5Output);
    
    const step6Result = await stepManager.proceedToNextStep(5, step5Output);
    if (!step6Result.success) {
      throw new Error(step6Result.error?.message || 'Step6生成に失敗しました');
    }
    await status.update('finalizing', undefined, 80);

    // Step 6→7: 動画生成開始
    // デフォルトのBGM/字幕設定を使用
    const step6Output: Step6Output = {
      userInput: {
        bgm: {
          selected: step6Result.data.suggestedBgm || step6Result.data.bgmOptions?.[0] || INSTANT_DEFAULTS.bgm.default.url,
          volume: INSTANT_DEFAULTS.bgm.default.volume
        },
        caption: {
          enabled: INSTANT_DEFAULTS.caption.enabled,
          language: INSTANT_DEFAULTS.caption.lang,
          styles: [`font-size: ${INSTANT_DEFAULTS.caption.fontSize}px`]
        }
      }
    };
    await saveStepOutput(supabase, workflow.id, 6, step6Output);
    
    await status.update('generating', undefined, 85);
    const step7Result = await stepManager.proceedToNextStep(6, step6Output);
    if (!step7Result.success) {
      throw new Error(step7Result.error?.message || 'Step7生成に失敗しました');
    }

    // Step7完了処理（動画生成開始）
    const step7Output = {
      userInput: {
        title: input.title || step7Result.data.title,
        description: step7Result.data.description || '',
        tags: step7Result.data.tags || [],
        confirmed: true
      }
    };
    
    const completionResult = await stepManager.proceedToNextStep(7, step7Output);
    if (!completionResult.success) {
      throw new Error(completionResult.error?.message || '動画生成開始に失敗しました');
    }
    
    // workflowと同じように、generate-scriptを呼び出して動画生成を開始
    await status.update('generating', undefined, 90);
    const videoId = await startVideoGeneration(workflow.id, uid);
    
    if (!videoId) {
      throw new Error('動画の作成に失敗しました');
    }
    
    // 動画生成の完了を待つ
    const completedVideoId = await waitForVideoCompletion(videoId);
    await status.complete(completedVideoId);
    console.log(`[InstantGenerator] Completed instant mode for ${instantId}`);

  } catch (error) {
    console.error('[InstantGenerator] Error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    await status.fail(errorMessage);
    throw error;
  }
}


// ヘルパー関数: ステップ出力を保存
async function saveStepOutput(supabase: any, workflowId: string, step: number, output: any) {
  const { error } = await supabase
    .from('workflows')
    .update({
      [`step${step}_out`]: output,
      current_step: step + 1
    })
    .eq('id', workflowId);
  
  if (error) {
    console.error(`Failed to save step ${step} output:`, error);
    throw new Error(`ステップ${step}の出力保存に失敗しました`);
  }
}

// ヘルパー関数: Step5の結果からvoiceSettingsを抽出
function extractVoiceSettingsFromStep5(step5Data: any) {
  const voiceSettings: Record<string, any> = {};
  
  if (step5Data.voiceAssignments) {
    Object.entries(step5Data.voiceAssignments).forEach(([characterId, assignment]: [string, any]) => {
      voiceSettings[characterId] = {
        voiceType: assignment.voiceId,
        corrections: {} // 読み修正は空で初期化
      };
    });
  }
  
  return voiceSettings;
}

/**
 * 動画生成を開始（workflowのgenerate-script APIを呼び出す）
 */
async function startVideoGeneration(workflowId: string, uid: string): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workflow/${workflowId}/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-UID': uid,
      },
    });

    if (!response.ok) {
      console.error('[InstantGenerator] Failed to start video generation:', response.status);
      return null;
    }

    const data = await response.json();
    return data.videoId || null;
  } catch (error) {
    console.error('[InstantGenerator] Error starting video generation:', error);
    return null;
  }
}

/**
 * 動画生成の完了を待つ
 */
async function waitForVideoCompletion(videoId: string): Promise<string> {
  const maxAttempts = 60; // 最大10分待つ（10秒 × 60回）
  let attempts = 0;
  const supabase = await createAdminClient();

  while (attempts < maxAttempts) {
    try {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待つ
      
      // videosテーブルをチェック
      const { data: video, error } = await supabase
        .from('videos')
        .select('status, url')
        .eq('id', videoId)
        .single();
        
      if (error) {
        console.error('[InstantGenerator] Error checking video status:', error);
        throw error;
      }
      
      if (video.status === 'completed' && video.url) {
        console.log(`[InstantGenerator] Video completed: ${videoId}`);
        return videoId;
      } else if (video.status === 'failed') {
        throw new Error('動画生成に失敗しました');
      }
      
      attempts++;
      console.log(`[InstantGenerator] Waiting for video completion... attempt ${attempts}/${maxAttempts}`);
    } catch (error) {
      console.error('[InstantGenerator] Error checking video status:', error);
      throw error;
    }
  }

  throw new Error('動画生成がタイムアウトしました');
}