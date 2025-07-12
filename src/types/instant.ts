// Instant Mode関連の型定義

export interface InstantModeInput {
  storyText: string;
  title?: string;
  style?: 'anime' | 'realistic' | 'watercolor';
  duration?: 'short' | 'medium' | 'long';
}

export interface InstantGeneration {
  id: string;
  uid: string;
  storyboard_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step?: string;
  error_message?: string;
  metadata?: {
    input?: InstantModeInput;
    progress?: number;
    video_id?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface InstantGenerationStatus {
  status: string;
  currentStep?: string;
  progress: number;
  message?: string;
  error?: string;
  videoId?: string;
}

export type InstantStep = 
  | 'analyzing'
  | 'structuring'
  | 'characters'
  | 'script'
  | 'voices'
  | 'finalizing'
  | 'generating';

export const INSTANT_STEPS: Record<InstantStep, string> = {
  analyzing: 'ストーリーを解析中...',
  structuring: '構成を作成中...',
  characters: 'キャラクターを生成中...',
  script: '台本を作成中...',
  voices: '音声を生成中...',
  finalizing: '最終調整中...',
  generating: '動画を生成中...'
};