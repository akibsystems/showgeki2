// 画像プレビュー関連の型定義

export type PreviewStatus = 'not_started' | 'pending' | 'processing' | 'completed' | 'failed'

export interface PreviewImage {
  beatIndex: number
  fileName: string
  url: string
  prompt: string
}

export interface PreviewData {
  images: PreviewImage[]
  generatedAt: string
  outputPath: string
}

// API レスポンスの型定義

export interface PreviewGenerationResponse {
  videoId: string
  status: string
  message: string
}

export interface PreviewStatusResponse {
  videoId?: string
  status: PreviewStatus
  previewData?: PreviewData
  error?: string
}

export interface PreviewDetailsResponse {
  status: PreviewStatus
  previewData?: PreviewData
  storagePath?: string
  error?: string
}

// API エラーレスポンス
export interface ApiErrorResponse {
  error: string
  details?: string
}

// フック用の型
export interface UseImagePreviewState {
  status: PreviewStatus
  isLoading: boolean
  error: string | null
  previewData: PreviewData | null
  videoId: string | null
}

export interface UseImagePreviewActions {
  generatePreview: () => Promise<void>
  refreshStatus: () => Promise<void>
  deletePreview: () => Promise<void>
}