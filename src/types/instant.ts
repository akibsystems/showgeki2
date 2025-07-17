// Instant Mode関連の型定義

export interface InstantModeInput {
  storyText: string;
  title?: string;
  // UI Design Requirements
  genre?: 'tragedy' | 'comedy' | 'romance' | 'action' | 'mystery' | 'horror';
  style?: 'short' | 'lengthy' | 'detailed' | 'concise';
  mood?: 'fantasy' | 'realistic' | 'dramatic' | 'light' | 'dark' | 'mysterious';
  // Legacy fields for backward compatibility
  visualStyle?: 'anime' | 'realistic' | 'watercolor';
  duration?: 'short' | 'medium' | 'long';
  // Image references for story generation
  imageUrls?: string[];
  // Character information from face detection
  characters?: Array<{
    name: string;
    role: string;
    description?: string;
    faceImageUrl: string;
  }>;
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

// UI Option Definitions
export const GENRE_OPTIONS = [
  { value: 'tragedy', label: 'Tragedy', emoji: '😢' },
  { value: 'comedy', label: 'Comedy', emoji: '😄' },
  { value: 'romance', label: 'Romance', emoji: '💕' },
  { value: 'action', label: 'Action', emoji: '⚡' },
  { value: 'mystery', label: 'Mystery', emoji: '🔍' },
  { value: 'horror', label: 'Horror', emoji: '👻' },
] as const;

export const STYLE_OPTIONS = [
  { value: 'short', label: 'Short', emoji: '📝' },
  { value: 'lengthy', label: 'Lengthy', emoji: '📚' },
  { value: 'detailed', label: 'Detailed', emoji: '🔬' },
  { value: 'concise', label: 'Concise', emoji: '✨' },
] as const;

export const MOOD_OPTIONS = [
  { value: 'fantasy', label: 'Fantasy', emoji: '🧙‍♂️' },
  { value: 'realistic', label: 'Realistic', emoji: '🌍' },
  { value: 'dramatic', label: 'Dramatic', emoji: '🎭' },
  { value: 'light', label: 'Light', emoji: '☀️' },
  { value: 'dark', label: 'Dark', emoji: '🌙' },
  { value: 'mysterious', label: 'Mysterious', emoji: '🌫️' },
] as const;