import type { Mulmoscript } from '@/lib/schemas';

// OpenAI音声ID
export type VoiceId = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';

// コンポーネントProps
export interface ScriptDirectorProps {
  script: Mulmoscript;
  onChange: (script: Mulmoscript) => void;
  onSave?: () => void;
  isReadOnly?: boolean;
  className?: string;
}

// 内部状態管理
export interface ScriptDirectorState {
  // UI状態
  activeTab: 'image' | 'speech' | 'beats';
  editingBeat: number | null;
  draggedBeat: number | null;
  
  // モーダル状態
  showImageModal: boolean;
  showSpeakerModal: boolean;
  editingImage: string | null;
  editingSpeaker: string | null;
  
  // フォーム状態
  imageForm: ImageFormData;
  speakerForm: SpeakerFormData;
  
  // バリデーション
  errors: ValidationErrors;
}

// フォームデータ型
export interface ImageFormData {
  name: string;
  sourceType: 'file' | 'url';
  file: File | null;
  url: string;
  preview: string | null;
}

export interface SpeakerFormData {
  id: string;
  voiceId: VoiceId;
  displayName: {
    ja: string;
    en: string;
  };
}

// バリデーション型
export interface ValidationErrors {
  title?: string;
  speakers?: Record<string, string>;
  beats?: Record<number, BeatErrors>;
  images?: Record<string, string>;
}

export interface BeatErrors {
  text?: string;
  speaker?: string;
  imagePrompt?: string;
}

// タブタイプ（モバイル用）
export type TabType = 'image' | 'speech' | 'beats';