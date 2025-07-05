// ================================================================
// Exported Zod Types (re-export for convenience)
// ================================================================

import type {
  Uid,
  Workspace,
  Story,
  Video,
  Review,
  StoryStatus,
  VideoStatus,
  Mulmoscript,
  CreateWorkspaceRequest,
  CreateStoryRequest,
  UpdateStoryRequest,
  GenerateScriptResponse,
  GenerateVideoResponse,
  VideoStatusResponse,
  StoriesListResponse,
  ApiErrorResponse,
  ValidationError,
  // ScriptDirector V2 types
  StoryElements,
  WorkflowState,
  WorkflowMetadata,
  CustomAssets,
} from '@/lib/schemas';

// Re-export for convenience
export type {
  Uid,
  Workspace,
  Story,
  Video,
  Review,
  StoryStatus,
  VideoStatus,
  Mulmoscript,
  CreateWorkspaceRequest,
  CreateStoryRequest,
  UpdateStoryRequest,
  GenerateScriptResponse,
  GenerateVideoResponse,
  VideoStatusResponse,
  StoriesListResponse,
  ApiErrorResponse,
  ValidationError,
  // ScriptDirector V2 types
  StoryElements,
  WorkflowState,
  WorkflowMetadata,
  CustomAssets,
};

// ================================================================
// Frontend-specific Types
// ================================================================

// アプリケーション状態管理
export interface AppState {
  uid: string | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
}

// ワークスペース状態
export interface WorkspaceState {
  current: Workspace | null;
  list: Workspace[];
  isLoading: boolean;
  error: string | null;
}

// ストーリー編集状態
export interface StoryEditState {
  story: Story | null;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  isGeneratingScript: boolean;
  isGeneratingVideo: boolean;
  validationErrors: ValidationError[];
}

// ビデオ管理状態
export interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  isLoading: boolean;
  uploadProgress: number;
  error: string | null;
}

// ================================================================
// Error Types
// ================================================================

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_API = 'EXTERNAL_API',
  INTERNAL = 'INTERNAL',
  NETWORK = 'NETWORK',
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp: string;
}

// ================================================================
// UI Component Types
// ================================================================

// 共通プロパティ
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// ボタンの種類
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// モーダルプロパティ
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// カードコンポーネント
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isLoading?: boolean;
}

// ツールチップ
export interface TooltipProps extends BaseComponentProps {
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

// ================================================================
// Form Types
// ================================================================

// フォーム状態
export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

// フォームフィールドプロパティ
export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

// ================================================================
// Monaco Editor Types
// ================================================================

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'light' | 'dark';
  options?: Record<string, any>;
  onValidate?: (errors: any[]) => void;
}

// ================================================================
// API Client Types
// ================================================================

// HTTPメソッド
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// APIリクエスト設定
export interface ApiRequestConfig {
  method: HttpMethod;
  url: string;
  data?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
}

// APIレスポンス
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// SWR設定
export interface SwrConfig {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  errorRetryCount?: number;
}

// ================================================================
// Utility Types
// ================================================================

// 部分的な更新用型
export type PartialUpdate<T> = Partial<Omit<T, 'id' | 'created_at'>>;

// IDのみの型
export type IdOnly = { id: string };

// タイムスタンプ付きの型
export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at?: string;
};

// ページネーション
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ページネーション付きレスポンス
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ソート設定
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// フィルター設定
export interface FilterConfig {
  field: string;
  value: any;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
}

// ================================================================
// Constants Types
// ================================================================

// アプリケーション設定
export interface AppConfig {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  maxFileSize: number;
  supportedVideoFormats: string[];
  defaultPagination: {
    limit: number;
  };
}

// ローカルストレージキー
export const LOCAL_STORAGE_KEYS = {
  UID: 'showgeki_uid',
  CURRENT_WORKSPACE: 'current_workspace',
  EDITOR_PREFERENCES: 'editor_preferences',
  THEME: 'theme',
} as const;

// イベント型
export type LocalStorageKey = typeof LOCAL_STORAGE_KEYS[keyof typeof LOCAL_STORAGE_KEYS];

// ================================================================
// Context Types
// ================================================================

// アプリケーションコンテキスト
export interface AppContextValue {
  state: AppState;
  uid: string | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  isLoading: boolean;
  error: AppError | null;
  clearError: () => void;
}

// ストーリーコンテキスト
export interface StoryContextValue {
  state: StoryEditState;
  story: Story | null;
  saveStory: (updates: PartialUpdate<Story>) => Promise<void>;
  generateScript: () => Promise<void>;
  generateVideo: () => Promise<Video>;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: AppError | null;
}

// ================================================================
// Event Handler Types
// ================================================================

// 汎用イベントハンドラー
export type EventHandler<T = any> = (event: T) => void;

// フォームイベントハンドラー
export type FormEventHandler = EventHandler<React.FormEvent<HTMLFormElement>>;
export type ChangeEventHandler = EventHandler<React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>>;
export type ClickEventHandler = EventHandler<React.MouseEvent<HTMLButtonElement>>;

// カスタムイベントハンドラー
export type StoryEventHandler = EventHandler<{ story: Story; action: string }>;
export type VideoEventHandler = EventHandler<{ video: Video; action: string }>;
export type ErrorEventHandler = EventHandler<AppError>;

// ================================================================
// Scene Management Types
// ================================================================

// シーン型定義（MulmoBeatと互換性を保つ）
export interface Scene {
  id: string;
  speaker: string;
  text: string;
  title?: string;
  description?: string;
  imagePrompt?: string;
  image?: {
    type: 'image' | 'textSlide';
    source?: {
      kind: 'url' | 'path' | 'base64' | 'text';
      url?: string;
      path?: string;
      data?: string;
      text?: string;
    };
    slide?: {
      title: string;
      subtitle?: string;
      bullets?: string[];
    };
  };
  duration?: number;
  captionParams?: {
    lang: string;
    styles?: string[];
  };
  // 拡張フィールド（UI用）
  actId?: string;
  order?: number;
  isTransition?: boolean;
}

// シーンリスト状態
export interface SceneListState {
  scenes: Scene[];
  acts: {
    id: string;
    title: string;
    description?: string;
    sceneIds: string[];
  }[];
  totalScenes: number;
  currentSceneId?: string;
  isValid: boolean;
  validationErrors?: string[];
}

// シーン操作のアクション型
export type SceneAction = 
  | { type: 'ADD_SCENE'; payload: Scene }
  | { type: 'UPDATE_SCENE'; payload: { id: string; updates: Partial<Scene> } }
  | { type: 'DELETE_SCENE'; payload: { id: string } }
  | { type: 'REORDER_SCENES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'MOVE_SCENE_TO_ACT'; payload: { sceneId: string; actId: string; position?: number } }
  | { type: 'SET_SCENES'; payload: Scene[] }
  | { type: 'VALIDATE_SCENES' };

// ================================================================
// All types are exported above
// ================================================================