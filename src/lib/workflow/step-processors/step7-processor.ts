import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { 
  Step7Output
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
 * Step7の出力を処理（最終確認完了）
 */
export async function processStep7Output(
  workflowId: string,
  storyboardId: string,
  step7Output: Step7Output
): Promise<void> {
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

    // 最終的なメタデータを更新
    const updatedSummaryData = {
      ...storyboard.summary_data,
      title: step7Output.userInput.title,
      description: step7Output.userInput.description,
      tags: step7Output.userInput.tags
    };

    // storyboardを最終状態に更新
    const { error: updateError } = await supabase
      .from('storyboards')
      .update({
        title: step7Output.userInput.title,
        summary_data: updatedSummaryData,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      throw new Error('ストーリーボードの更新に失敗しました');
    }

    // workflowを完了状態に更新
    const { error: workflowError } = await supabase
      .from('workflows')
      .update({
        status: 'completed',
        current_step: 7,
        step7_out: step7Output,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    if (workflowError) {
      throw new Error('ワークフローの更新に失敗しました');
    }

    // 完了時の処理（通知、ログ等）
    await onWorkflowComplete(workflowId, storyboardId, step7Output);

  } catch (error) {
    console.error('Step7出力処理エラー:', error);
    throw error;
  }
}

/**
 * ワークフロー完了時の処理
 */
async function onWorkflowComplete(
  workflowId: string,
  storyboardId: string,
  step7Output: Step7Output
): Promise<void> {
  try {
    // ログの記録
    console.log(`ワークフロー完了: ${workflowId}`);
    console.log(`ストーリーボード: ${storyboardId}`);
    console.log(`タイトル: ${step7Output.userInput.title}`);
    console.log(`タグ: ${step7Output.userInput.tags.join(', ')}`);

    // 統計情報の更新や通知の送信など、必要に応じて実装
    await updateWorkflowStatistics(workflowId, storyboardId);

    // 動画生成キューへの追加（必要に応じて）
    if (step7Output.userInput.confirmed) {
      await queueVideoGeneration(storyboardId);
    }

  } catch (error) {
    console.error('ワークフロー完了処理エラー:', error);
    // 完了処理のエラーはワークフロー全体を停止させない
  }
}

/**
 * ワークフロー統計情報の更新
 */
async function updateWorkflowStatistics(
  workflowId: string,
  storyboardId: string
): Promise<void> {
  // 統計情報の更新ロジック（必要に応じて実装）
  // 例: 完了したワークフローの数、平均所要時間など
}

/**
 * 動画生成キューへの追加
 */
async function queueVideoGeneration(storyboardId: string): Promise<void> {
  try {
    // 動画生成のためのレコードを作成
    const { error } = await supabase
      .from('videos')
      .insert({
        story_id: storyboardId,
        status: 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('動画生成キューへの追加エラー:', error);
    } else {
      console.log(`動画生成キューに追加: ${storyboardId}`);
    }
  } catch (error) {
    console.error('動画生成キュー処理エラー:', error);
  }
}

/**
 * エラーハンドリング用のユーティリティ関数
 */
export class WorkflowCompletionError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WorkflowCompletionError';
  }
}

/**
 * ワークフロー進行状況の取得
 */
export async function getWorkflowProgress(workflowId: string): Promise<{
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  progress: number;
}> {
  try {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('current_step, status, step1_out, step2_out, step3_out, step4_out, step5_out, step6_out, step7_out')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      throw new Error('ワークフローが見つかりません');
    }

    const totalSteps = 7;
    const completedSteps = [];

    // 完了したステップを確認
    if (workflow.step1_out) completedSteps.push(1);
    if (workflow.step2_out) completedSteps.push(2);
    if (workflow.step3_out) completedSteps.push(3);
    if (workflow.step4_out) completedSteps.push(4);
    if (workflow.step5_out) completedSteps.push(5);
    if (workflow.step6_out) completedSteps.push(6);
    if (workflow.step7_out) completedSteps.push(7);

    const progress = Math.round((completedSteps.length / totalSteps) * 100);

    return {
      currentStep: workflow.current_step,
      totalSteps,
      completedSteps,
      progress
    };
  } catch (error) {
    console.error('ワークフロー進行状況取得エラー:', error);
    throw error;
  }
}