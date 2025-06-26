import { z } from 'zod';

// ================================================================
// Core Schemas
// ================================================================

// ユーザー識別用UUID
export const UidSchema = z.string().uuid('Invalid UID format');

// ================================================================
// Database Entity Schemas
// ================================================================

// ワークスペーススキーマ
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  uid: UidSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  created_at: z.string().datetime(),
});

// ストーリーステータス
export const StoryStatusSchema = z.enum([
  'draft',
  'script_generated', 
  'processing',
  'completed',
  'error'
], {
  errorMap: () => ({ message: 'Invalid story status' })
});

// ストーリースキーマ
export const StorySchema = z.object({
  id: z.string().length(8, 'Story ID must be 8 characters'),
  workspace_id: z.string().uuid(),
  uid: UidSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  text_raw: z.string().min(1, 'Story text is required'),
  script_json: z.record(z.any()).optional(),
  status: StoryStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// 動画ステータス
export const VideoStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed'
], {
  errorMap: () => ({ message: 'Invalid video status' })
});

// 動画スキーマ
export const VideoSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().length(8),
  uid: UidSchema,
  url: z.string().url().optional(),
  duration_sec: z.number().int().positive().optional(),
  resolution: z.string().optional(),
  size_mb: z.number().positive().optional(),
  status: VideoStatusSchema,
  error_msg: z.string().optional(),
  created_at: z.string().datetime(),
});

// レビュースキーマ（既存互換）
export const ReviewSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().length(8),
  review_text: z.string().min(1, 'Review text is required'),
  rating: z.number().int().min(1).max(5),
  created_at: z.string().datetime(),
});

// ================================================================
// Mulmocast Script Schema
// ================================================================

// シーンスキーマ
export const SceneSchema = z.object({
  id: z.string(),
  type: z.enum(['dialogue', 'narration', 'action']),
  content: z.string().min(1, 'Scene content is required'),
  duration: z.number().positive(),
  voice: z.object({
    character: z.string(),
    emotion: z.string(),
  }).optional(),
});

// mulmoscript全体スキーマ
export const MulmoscriptSchema = z.object({
  version: z.string(),
  title: z.string().min(1, 'Script title is required'),
  scenes: z.array(SceneSchema).min(1, 'At least one scene is required'),
  metadata: z.object({
    duration_total: z.number().positive(),
    resolution: z.string(),
    fps: z.number().int().positive(),
  }),
});

// ================================================================
// API Request/Response Schemas
// ================================================================

// ワークスペース作成リクエスト
export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1).max(255),
});

// ストーリー作成リクエスト
export const CreateStoryRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  text_raw: z.string().min(1),
});

// ストーリー更新リクエスト
export const UpdateStoryRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  text_raw: z.string().min(1).optional(),
  script_json: z.record(z.any()).optional(),
});

// スクリプト生成レスポンス
export const GenerateScriptResponseSchema = z.object({
  script_json: MulmoscriptSchema,
  status: StoryStatusSchema,
});

// 動画生成レスポンス
export const GenerateVideoResponseSchema = z.object({
  video_id: z.string().uuid(),
  status: VideoStatusSchema,
});

// 動画ステータスレスポンス
export const VideoStatusResponseSchema = z.object({
  status: VideoStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  url: z.string().url().optional(),
  error_msg: z.string().optional(),
});

// ストーリー一覧レスポンス
export const StoriesListResponseSchema = z.object({
  stories: z.array(StorySchema),
  total: z.number().int().min(0),
});

// ================================================================
// Error Handling
// ================================================================

// API エラーレスポンス
export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  details: z.record(z.any()).optional(),
  code: z.string().optional(),
});

// バリデーションエラー詳細
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

// ================================================================
// Utility Functions
// ================================================================

// スキーマ検証ヘルパー
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
  
  return { success: false, errors };
}

// UID検証関数
export function isValidUid(uid: string): boolean {
  return UidSchema.safeParse(uid).success;
}

// スキーマから型を生成
export type Uid = z.infer<typeof UidSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Video = z.infer<typeof VideoSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type StoryStatus = z.infer<typeof StoryStatusSchema>;
export type VideoStatus = z.infer<typeof VideoStatusSchema>;
export type Mulmoscript = z.infer<typeof MulmoscriptSchema>;
export type Scene = z.infer<typeof SceneSchema>;

// API リクエスト・レスポンス型
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;
export type CreateStoryRequest = z.infer<typeof CreateStoryRequestSchema>;
export type UpdateStoryRequest = z.infer<typeof UpdateStoryRequestSchema>;
export type GenerateScriptResponse = z.infer<typeof GenerateScriptResponseSchema>;
export type GenerateVideoResponse = z.infer<typeof GenerateVideoResponseSchema>;
export type VideoStatusResponse = z.infer<typeof VideoStatusResponseSchema>;
export type StoriesListResponse = z.infer<typeof StoriesListResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;