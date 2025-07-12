// Instant Mode の状態管理クラス

import { createAdminClient } from '@/lib/supabase/server';
import type { InstantStep } from '@/types/instant';

export class InstantStatus {
  private instantId: string;

  constructor(instantId: string) {
    this.instantId = instantId;
  }

  /**
   * ステップと進捗を更新
   */
  async update(step: InstantStep, message?: string, progress?: number): Promise<void> {
    console.log(`[InstantStatus] Updating ${this.instantId}: ${step} - ${message}`);
    
    const supabase = await createAdminClient();
    const metadata = await this.getMetadata();
    metadata.progress = progress || this.calculateProgress(step);
    
    const { error } = await supabase
      .from('instant_generations')
      .update({
        status: 'processing',
        current_step: step,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.instantId);

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
      .from('instant_generations')
      .update({
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.instantId);

    if (error) {
      console.error('[InstantStatus] Failed to set progress:', error);
      throw error;
    }
  }

  /**
   * 完了状態に更新
   */
  async complete(videoId: string): Promise<void> {
    console.log(`[InstantStatus] Completing ${this.instantId} with video ${videoId}`);
    
    const supabase = await createAdminClient();
    const metadata = await this.getMetadata();
    metadata.progress = 100;
    metadata.video_id = videoId;
    
    const { error } = await supabase
      .from('instant_generations')
      .update({
        status: 'completed',
        current_step: 'completed',
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.instantId);

    if (error) {
      console.error('[InstantStatus] Failed to complete:', error);
      throw error;
    }
  }

  /**
   * エラー状態に更新
   */
  async fail(errorMessage: string): Promise<void> {
    console.error(`[InstantStatus] Failing ${this.instantId}: ${errorMessage}`);
    
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from('instant_generations')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.instantId);

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
      .from('instant_generations')
      .select('*')
      .eq('id', this.instantId)
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
      .from('instant_generations')
      .select('metadata')
      .eq('id', this.instantId)
      .single();

    return data?.metadata || {};
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