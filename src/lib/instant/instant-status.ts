// Instant Mode の状態管理クラス

import { createAdminClient } from '@/lib/supabase/server';
import type { InstantStep } from '@/types/instant';

export class InstantStatus {
  private workflowId: string;

  constructor(workflowId: string) {
    this.workflowId = workflowId;
  }

  /**
   * ステップと進捗を更新
   */
  async update(step: InstantStep, message?: string, progress?: number): Promise<void> {
    console.log(`[InstantStatus] Updating ${this.workflowId}: ${step} - ${message}`);
    
    const supabase = await createAdminClient();
    const metadata = await this.getMetadata();
    metadata.progress = progress || this.calculateProgress(step);
    if (message) {
      metadata.message = message;
    }
    
    const { error } = await supabase
      .from('workflows')
      .update({
        instant_step: step,
        progress: metadata.progress,
        instant_metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.workflowId);

    if (error) {
      console.error('[InstantStatus] Failed to update status:', error);
      throw error;
    }
  }

  /**
   * 進捗率を設定
   */
  async setProgress(percent: number): Promise<void> {
    const supabase = await createAdminClient();
    const metadata = await this.getMetadata();
    metadata.progress = Math.min(100, Math.max(0, percent));
    
    const { error } = await supabase
      .from('workflows')
      .update({
        progress: metadata.progress,
        instant_metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.workflowId);

    if (error) {
      console.error('[InstantStatus] Failed to set progress:', error);
      throw error;
    }
  }

  /**
   * 完了状態に更新
   */
  async complete(videoId: string, timings?: Record<string, number>): Promise<void> {
    console.log(`[InstantStatus] Completing ${this.workflowId} with video ${videoId}`);
    
    const supabase = await createAdminClient();
    const metadata = await this.getMetadata();
    metadata.progress = 100;
    metadata.video_id = videoId;
    
    // 実行時間情報を保存
    if (timings) {
      metadata.execution_timings = timings;
      metadata.total_execution_time_ms = Object.values(timings).reduce((sum, time) => sum + time, 0);
    }
    
    const { error } = await supabase
      .from('workflows')
      .update({
        status: 'completed',
        instant_step: 'completed',
        progress: 100,
        instant_metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.workflowId);

    if (error) {
      console.error('[InstantStatus] Failed to complete:', error);
      throw error;
    }
  }

  /**
   * エラー状態に更新
   */
  async fail(errorMessage: string): Promise<void> {
    console.error(`[InstantStatus] Failing ${this.workflowId}: ${errorMessage}`);
    
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('workflows')
      .update({
        status: 'archived',  // failedではなくarchivedを使用
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.workflowId);

    if (error) {
      console.error('[InstantStatus] Failed to update error status:', error);
      throw error;
    }
  }

  /**
   * 現在の状態を取得
   */
  async getStatus() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', this.workflowId)
      .single();

    if (error) {
      console.error('[InstantStatus] Failed to get status:', error);
      throw error;
    }

    return data;
  }

  /**
   * メタデータを取得（存在しない場合は空オブジェクトを返す）
   */
  private async getMetadata(): Promise<any> {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('workflows')
      .select('instant_metadata')
      .eq('id', this.workflowId)
      .single();

    return data?.instant_metadata || {};
  }

  /**
   * ステップから進捗率を計算
   */
  private calculateProgress(step: InstantStep): number {
    const steps: InstantStep[] = [
      'analyzing',
      'structuring', 
      'characters',
      'script',
      'voices',
      'finalizing',
      'generating'
    ];

    const currentIndex = steps.indexOf(step);
    if (currentIndex === -1) return 0;

    // 各ステップを均等に配分（最後のステップは90%まで）
    return Math.floor((currentIndex + 1) / steps.length * 90);
  }
}