// Instant Mode のメイン処理エンジン

import { InstantStatus } from './instant-status';
import { INSTANT_DEFAULTS, getSceneCountForDuration, getImageStyleConfig } from './instant-defaults';
import { WorkflowStepManager } from '@/lib/workflow/step-processors';
import { createAdminClient } from '@/lib/supabase/server';
import { generateMulmoScriptFromStoryboard } from '@/lib/workflow/mulmoscript-generator';
import { generateMulmoscriptWithOpenAI } from '@/lib/openai-client';
import type { InstantModeInput } from '@/types/instant';
import type { Step1Output, Step3Output, Step6Output, Storyboard } from '@/types/workflow';
import type { Story } from '@/lib/schemas';

interface ProcessInstantModeParams {
  workflowId: string;
  storyboardId: string;
  uid: string;
  input: InstantModeInput;
}

/**
 * Instant Mode のメイン処理関数
 * 全てのステップを順次実行し、動画を生成する
 */
export async function processInstantMode({
  workflowId,
  storyboardId,
  uid,
  input
}: ProcessInstantModeParams) {
  const status = new InstantStatus(workflowId);
  const supabase = await createAdminClient();

  const stepManager = new WorkflowStepManager(workflowId, storyboardId);

  // 実行時間計測開始
  const startTime = Date.now();
  const stepTimings: Record<string, number> = {};
  let lastStepTime = startTime;

  // ダイレクトモードのチェック
  const isDirectMode = process.env.INSTANT_MODE_DIRECT_GENERATION === 'true';

  console.log(`[InstantGenerator] Starting instant mode for workflow ${workflowId} at ${new Date(startTime).toISOString()}`);

  try {

    if (isDirectMode) {
      console.log(`[InstantGenerator] ===== DIRECT MODE STARTED =====`);
      console.log(`[InstantGenerator] Using direct MulmoScript generation mode`);
      console.log(`[InstantGenerator] Workflow ID: ${workflowId}`);
      console.log(`[InstantGenerator] Storyboard ID: ${storyboardId}`);
      console.log(`[InstantGenerator] User ID: ${uid}`);
      console.log(`[InstantGenerator] Input data:`, JSON.stringify(input, null, 2));
      console.log(`[InstantGenerator] Scene count (beats): ${getSceneCountForDuration(input.duration || 'medium')}`);
      console.log(`[InstantGenerator] Script writer type: ${process.env.SCRIPT_WRITER_TYPE || 'shakespeare'}`);

      // ダイレクトモードの処理
      await status.update('generating', 'MulmoScriptを直接生成中...', 10);
      console.log(`[InstantGenerator] Status updated to 'generating'`);

      // ストーリーボードからStoryオブジェクトを作成
      console.log(`[InstantGenerator] Fetching storyboard from database...`);
      const { data: storyboard } = await supabase
        .from('storyboards')
        .select('*')
        .eq('id', storyboardId)
        .single();

      if (!storyboard) {
        console.error(`[InstantGenerator] Storyboard not found for ID: ${storyboardId}`);
        throw new Error('ストーリーボードが見つかりません');
      }
      console.log(`[InstantGenerator] Storyboard fetched successfully`);

      // Story型に合わせたオブジェクトを作成
      console.log(`[InstantGenerator] Creating Story object...`);
      const story: Story = {
        id: storyboard.id,
        workspace_id: workflowId, // 仮のworkspace_id
        uid: uid,
        title: input.title || '無題のストーリー',
        text_raw: input.storyText,
        script_json: {},
        status: 'draft' as const,
        beats: getSceneCountForDuration(input.duration || 'medium'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log("[InstantGenerator] Story object created:", JSON.stringify(story, null, 2));

      // 直接MulmoScriptを生成
      console.log(`[InstantGenerator] Calling generateMulmoscriptWithOpenAI...`);
      const generationOptions = {
        beats: story.beats,
        language: 'ja',
        stylePreference: input.genre === 'comedy' ? 'comedic' : 'dramatic',
        targetDuration: input.duration === 'short' ? 30 : input.duration === 'long' ? 90 : 60,
        enableCaptions: true,
        captionStyles: [`font-size: ${INSTANT_DEFAULTS.caption.fontSize}px`]
      };
      console.log(`[InstantGenerator] Generation options:`, JSON.stringify(generationOptions, null, 2));

      const generationResult = await generateMulmoscriptWithOpenAI(story, {
        beats: story.beats,
        language: 'ja',
        stylePreference: input.genre === 'comedy' ? 'comedic' : 'dramatic',
        targetDuration: input.duration === 'short' ? 30 : input.duration === 'long' ? 90 : 60,
        enableCaptions: true,
        captionStyles: [`font-size: ${INSTANT_DEFAULTS.caption.fontSize}px`]
      });

      if (!generationResult.success || !generationResult.script) {
        console.error(`[InstantGenerator] MulmoScript generation failed`);
        console.error(`[InstantGenerator] Generation result:`, JSON.stringify(generationResult, null, 2));
        throw new Error('MulmoScript生成に失敗しました');
      }
      console.log(`[InstantGenerator] MulmoScript generated successfully`);

      const generatedScript = generationResult.script;

      // 実行時間を記録
      stepTimings['direct-generation'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Direct MulmoScript generation completed in ${stepTimings['direct-generation']}ms`);

      console.log("[InstantGenerator] Script structure validation:");
      console.log("[InstantGenerator] - Has $mulmocast:", !!generatedScript.$mulmocast);
      console.log("[InstantGenerator] - Has beats:", !!generatedScript.beats);
      console.log("[InstantGenerator] - Beats count:", generatedScript.beats?.length);
      console.log("[InstantGenerator] - Has speechParams:", !!generatedScript.speechParams);
      console.log("[InstantGenerator] - Has imageParams:", !!generatedScript.imageParams);
      console.log("[InstantGenerator] - Has captionParams:", !!generatedScript.captionParams);

      // 各beatの詳細も確認
      if (generatedScript.beats) {
        console.log("[InstantGenerator] Beat details:");
        generatedScript.beats.forEach((beat: any, index: number) => {
          console.log(`[InstantGenerator]   Beat ${index + 1}:`);
          console.log(`[InstantGenerator]     - Speaker: ${beat.speaker}`);
          console.log(`[InstantGenerator]     - Text length: ${beat.text?.length || 0} chars`);
          console.log(`[InstantGenerator]     - Has imagePrompt: ${!!beat.imagePrompt}`);
        });
      }


      // MulmoScriptをストーリーボードに保存
      console.log(`[InstantGenerator] Saving MulmoScript to storyboard...`);
      console.log(`[InstantGenerator] Script size: ${JSON.stringify(generatedScript).length} bytes`);
      const { error: updateError } = await supabase
        .from('storyboards')
        .update({
          mulmoscript: generatedScript,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', storyboardId);

      if (updateError) {
        console.error(`[InstantGenerator] Failed to save MulmoScript:`, updateError);
        console.error(`[InstantGenerator] Update error details:`, JSON.stringify(updateError, null, 2));
        throw new Error('MulmoScriptの保存に失敗しました');
      }
      console.log(`[InstantGenerator] MulmoScript saved successfully`);
      console.log(`[InstantGenerator] ===== DIRECT MODE MULMOSCRIPT GENERATION COMPLETED =====`);

      await status.update('generating', '動画生成を開始中...', 90);

    } else {
      // 通常モード: Step 1→2 から開始
      console.log(`[InstantGenerator] Starting phase processing mode for workflow ${workflowId}`);
      await status.update('analyzing');
      console.log(`[InstantGenerator] Status updated to 'analyzing'`);

      // Step1Output を準備
      console.log(`[InstantGenerator] Preparing Step1Output...`);
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
      console.log(`[InstantGenerator] Step1Output prepared:`, JSON.stringify(step1Output, null, 2));

      // ワークフローのstep1_outに保存（既存のprocessorが期待するため）
      console.log(`[InstantGenerator] Saving Step1 output to database...`);
      await saveStepOutput(supabase, workflowId, 1, step1Output);
      console.log(`[InstantGenerator] Step1 output saved successfully`);

      // Step 1→2 の処理を実行
      console.log(`[InstantGenerator] Starting Step 1→2 processing...`);
      const step2Result = await stepManager.proceedToNextStep(1, step1Output);
      console.log(`[InstantGenerator] Step2 result:`, { success: step2Result.success, hasData: !!step2Result.data, error: step2Result.error });
      if (!step2Result.success) {
        console.error(`[InstantGenerator] Step2 failed:`, step2Result.error);
        throw new Error(step2Result.error?.message || 'Step2生成に失敗しました');
      }
      console.log(`[InstantGenerator] Step2 data received:`, JSON.stringify(step2Result.data, null, 2));
      await status.update('structuring', undefined, 20);
      console.log(`[InstantGenerator] Status updated to 'structuring'`);

      // Step 1→2 の実行時間を記録
      stepTimings['step1-2'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Step 1→2 completed in ${stepTimings['step1-2']}ms`);

      // Step 2→3: キャラクター詳細生成
      // 既存のprocessorはユーザー入力を期待するので、デフォルト値を設定
      console.log(`[InstantGenerator] Preparing Step2Output...`);
      const step2Output = {
        userInput: {
          title: input.title || step2Result.data.suggestedTitle,
          acts: step2Result.data.acts
        }
      };
      console.log(`[InstantGenerator] Step2Output prepared:`, JSON.stringify(step2Output, null, 2));
      console.log(`[InstantGenerator] Saving Step2 output to database...`);
      await saveStepOutput(supabase, workflowId, 2, step2Output);
      console.log(`[InstantGenerator] Step2 output saved successfully`);

      console.log(`[InstantGenerator] Starting Step 2→3 processing...`);
      const step3Result = await stepManager.proceedToNextStep(2, step2Output);
      console.log(`[InstantGenerator] Step3 result:`, { success: step3Result.success, hasData: !!step3Result.data, error: step3Result.error });
      if (!step3Result.success) {
        console.error(`[InstantGenerator] Step3 failed:`, step3Result.error);
        throw new Error(step3Result.error?.message || 'Step3生成に失敗しました');
      }
      console.log(`[InstantGenerator] Step3 data received:`, JSON.stringify(step3Result.data, null, 2));
      await status.update('characters', undefined, 35);
      console.log(`[InstantGenerator] Status updated to 'characters'`);

      // Step 2→3 の実行時間を記録
      stepTimings['step2-3'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Step 2→3 completed in ${stepTimings['step2-3']}ms`);

      // Step 3→4: 台本生成
      // 画風設定を追加（visualStyleフィールドを使用）
      console.log(`[InstantGenerator] Preparing Step3Output...`);
      const imageStyle = input.visualStyle || 'anime';
      const styleConfig = getImageStyleConfig(imageStyle as 'anime' | 'realistic' | 'watercolor');
      console.log(`[InstantGenerator] Image style config:`, { imageStyle, styleConfig });
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
      console.log(`[InstantGenerator] Step3Output prepared:`, JSON.stringify(step3Output, null, 2));
      console.log(`[InstantGenerator] Saving Step3 output to database...`);
      await saveStepOutput(supabase, workflowId, 3, step3Output);
      console.log(`[InstantGenerator] Step3 output saved successfully`);

      console.log(`[InstantGenerator] Starting Step 3→4 processing...`);
      const step4Result = await stepManager.proceedToNextStep(3, step3Output);
      console.log(`[InstantGenerator] Step4 result:`, { success: step4Result.success, hasData: !!step4Result.data, error: step4Result.error });
      if (!step4Result.success) {
        console.error(`[InstantGenerator] Step4 failed:`, step4Result.error);
        throw new Error(step4Result.error?.message || 'Step4生成に失敗しました');
      }
      console.log(`[InstantGenerator] Step4 data received:`, JSON.stringify(step4Result.data, null, 2));
      await status.update('script', undefined, 50);
      console.log(`[InstantGenerator] Status updated to 'script'`);

      // Step 3→4 の実行時間を記録
      stepTimings['step3-4'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Step 3→4 completed in ${stepTimings['step3-4']}ms`);

      // Step 4→5: 音声設定（デフォルト割り当て）
      // 編集なしでそのまま次へ
      const step4Output = {
        userInput: {
          scenes: step4Result.data.scenes
        }
      };
      await saveStepOutput(supabase, workflowId, 4, step4Output);

      const step5Result = await stepManager.proceedToNextStep(4, step4Output);
      console.log(`[InstantGenerator] Step5 result:`, { success: step5Result.success, hasData: !!step5Result.data, error: step5Result.error });
      if (!step5Result.success) {
        throw new Error(step5Result.error?.message || 'Step5生成に失敗しました');
      }
      console.log(`[InstantGenerator] Step5 data received:`, JSON.stringify(step5Result.data, null, 2));
      await status.update('voices', undefined, 65);

      // Step 4→5 の実行時間を記録
      stepTimings['step4-5'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Step 4→5 completed in ${stepTimings['step4-5']}ms`);

      // Step 5→6: BGM・字幕設定
      // デフォルトの音声割り当てをそのまま使用
      const extractedVoiceSettings = extractVoiceSettingsFromStep5(step5Result.data);
      console.log(`[InstantGenerator] Extracted voice settings:`, JSON.stringify(extractedVoiceSettings, null, 2));

      const step5Output = {
        userInput: {
          voiceSettings: extractedVoiceSettings
        }
      };
      console.log(`[InstantGenerator] Step5Output to save:`, JSON.stringify(step5Output, null, 2));
      await saveStepOutput(supabase, workflowId, 5, step5Output);

      const step6Result = await stepManager.proceedToNextStep(5, step5Output);
      if (!step6Result.success) {
        throw new Error(step6Result.error?.message || 'Step6生成に失敗しました');
      }
      await status.update('finalizing', undefined, 80);

      // Step 5→6 の実行時間を記録
      stepTimings['step5-6'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Step 5→6 completed in ${stepTimings['step5-6']}ms`);

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
      await saveStepOutput(supabase, workflowId, 6, step6Output);

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

      // Step 6→7 の実行時間を記録
      stepTimings['step6-7'] = Date.now() - lastStepTime;
      lastStepTime = Date.now();
      console.log(`[InstantGenerator] Step 6→7 completed in ${stepTimings['step6-7']}ms`);
    }

    // 両モード共通: 動画生成を開始
    await status.update('generating', undefined, 90);
    const videoId = await startVideoGeneration(workflowId, uid);

    if (!videoId) {
      throw new Error('動画の作成に失敗しました');
    }

    // 動画生成の完了を待つ
    const completedVideoId = await waitForVideoCompletion(videoId);

    // 動画生成時間を記録
    stepTimings['video-generation'] = Date.now() - lastStepTime;
    const totalTime = Date.now() - startTime;

    // 実行時間の詳細をログ出力
    console.log(`[InstantGenerator] ===== Execution Time Summary for workflow ${workflowId} =====`);
    if (isDirectMode) {
      console.log(`[InstantGenerator] Direct MulmoScript Generation: ${stepTimings['direct-generation']}ms`);
    } else {
      console.log(`[InstantGenerator] Step 1→2 (Story Analysis): ${stepTimings['step1-2']}ms`);
      console.log(`[InstantGenerator] Step 2→3 (Character Generation): ${stepTimings['step2-3']}ms`);
      console.log(`[InstantGenerator] Step 3→4 (Script Generation): ${stepTimings['step3-4']}ms`);
      console.log(`[InstantGenerator] Step 4→5 (Voice Assignment): ${stepTimings['step4-5']}ms`);
      console.log(`[InstantGenerator] Step 5→6 (BGM/Caption): ${stepTimings['step5-6']}ms`);
      console.log(`[InstantGenerator] Step 6→7 (Finalization): ${stepTimings['step6-7']}ms`);
    }
    console.log(`[InstantGenerator] Video Generation: ${stepTimings['video-generation']}ms`);
    console.log(`[InstantGenerator] Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
    console.log(`[InstantGenerator] ================================================`);

    await status.complete(completedVideoId, stepTimings);
    console.log(`[InstantGenerator] Completed instant mode for workflow ${workflowId}`);

  } catch (error) {
    console.error('[InstantGenerator] ===== ERROR OCCURRED =====');
    console.error('[InstantGenerator] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[InstantGenerator] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[InstantGenerator] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[InstantGenerator] Current workflow ID:', workflowId);
    console.error('[InstantGenerator] Current storyboard ID:', storyboardId);
    console.error('[InstantGenerator] ==========================');
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    await status.fail(errorMessage);
    throw error;
  }
}


// ヘルパー関数: ステップ出力を保存
async function saveStepOutput(supabase: any, workflowId: string, step: number, output: any) {
  console.log(`[saveStepOutput] Saving step ${step} output for workflow ${workflowId}`);
  console.log(`[saveStepOutput] Output size: ${JSON.stringify(output).length} bytes`);

  const updateData = {
    [`step${step}_out`]: output,
    current_step: step + 1
  };
  console.log(`[saveStepOutput] Updating workflow with current_step: ${step + 1}`);

  const { error } = await supabase
    .from('workflows')
    .update(updateData)
    .eq('id', workflowId);

  if (error) {
    console.error(`[saveStepOutput] Failed to save step ${step} output:`, error);
    console.error(`[saveStepOutput] Error details:`, JSON.stringify(error, null, 2));
    throw new Error(`ステップ${step}の出力保存に失敗しました: ${error.message}`);
  }

  console.log(`[saveStepOutput] Successfully saved step ${step} output`);
}

// ヘルパー関数: Step5の結果からvoiceSettingsを抽出
function extractVoiceSettingsFromStep5(step5Data: any) {
  console.log(`[extractVoiceSettingsFromStep5] Input step5Data:`, JSON.stringify(step5Data, null, 2));
  const voiceSettings: Record<string, any> = {};

  // Step5Input format: characters array with suggestedVoice
  if (step5Data.characters && Array.isArray(step5Data.characters)) {
    console.log(`[extractVoiceSettingsFromStep5] Found characters array:`, JSON.stringify(step5Data.characters, null, 2));
    step5Data.characters.forEach((character: any) => {
      if (character.id && character.suggestedVoice) {
        voiceSettings[character.id] = {
          voiceType: character.suggestedVoice,
          corrections: {} // 読み修正は空で初期化
        };
      }
    });
  } else {
    console.log(`[extractVoiceSettingsFromStep5] No characters array found in step5Data`);
  }

  console.log(`[extractVoiceSettingsFromStep5] Extracted voiceSettings:`, JSON.stringify(voiceSettings, null, 2));
  return voiceSettings;
}

/**
 * 動画生成を開始（直接データベースを操作）
 */
async function startVideoGeneration(workflowId: string, uid: string): Promise<string | null> {
  try {
    const supabase = await createAdminClient();

    // ワークフローとストーリーボードを取得
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        id,
        storyboard_id,
        uid,
        step4_out,
        storyboards (*)
      `)
      .eq('id', workflowId)
      .eq('uid', uid)
      .single();

    if (workflowError || !workflow) {
      console.error('[InstantGenerator] Failed to get workflow:', workflowError);
      return null;
    }

    const storyboard = workflow.storyboards as unknown as Storyboard;

    // MulmoScriptを生成または既存のものを使用
    let mulmoScript;

    // ダイレクトモードの場合、すでにmulmoscriptが存在するはず
    if (storyboard.mulmoscript) {
      console.log('[InstantGenerator] Using existing MulmoScript from storyboard');
      console.log('Existing MulmoScript structure:');
      console.log('- Has $mulmocast:', !!storyboard.mulmoscript.$mulmocast);
      console.log('- Has beats:', !!storyboard.mulmoscript.beats);
      console.log('- Beats count:', storyboard.mulmoscript.beats?.length);
      mulmoScript = storyboard.mulmoscript;
    } else {
      console.log('[InstantGenerator] Generating MulmoScript from storyboard data');
      mulmoScript = generateMulmoScriptFromStoryboard(storyboard, workflow.step4_out);

      // ストーリーボードにMulmoScriptを保存
      const { error: updateError } = await supabase
        .from('storyboards')
        .update({
          mulmoscript: mulmoScript,
          status: 'completed'
        })
        .eq('id', storyboard.id);

      if (updateError) {
        console.error('[InstantGenerator] Failed to save MulmoScript:', updateError);
        return null;
      }
    }

    // 新しいビデオエントリを作成
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        story_id: storyboard.id,
        uid: uid,
        status: 'queued',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (videoError || !video) {
      console.error('[InstantGenerator] Failed to create video:', videoError);
      return null;
    }

    // ワークフローのステータスを完了に更新
    await supabase
      .from('workflows')
      .update({ status: 'completed' })
      .eq('id', workflowId);

    // Webhookを送信（非同期で実行し、レスポンスを待たない）
    if (process.env.CLOUD_RUN_WEBHOOK_URL) {
      const webhookPayload = {
        type: 'video_generation',
        payload: {
          video_id: video.id,
          story_id: storyboard.id,
          uid: uid,
          title: storyboard.title || '無題の作品',
          text_raw: storyboard.summary_data?.description || '',
          script_json: mulmoScript
        }
      };

      // Webhookを非同期で送信（レスポンスを待たない）
      fetch(process.env.CLOUD_RUN_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      }).then(() => {
        console.log('[InstantGenerator] Webhook sent successfully');
      }).catch(error => {
        console.error('[InstantGenerator] Webhook send error:', error);
      });
    }

    return video.id;
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