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
  id: z.string().uuid('Story ID must be UUID format'),
  workspace_id: z.string().uuid(),
  uid: UidSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  text_raw: z.string().min(1, 'Story text is required'),
  script_json: z.record(z.any()).optional(),
  status: StoryStatusSchema,
  beats: z.number().min(1).max(20).default(5),
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
  story_id: z.string().uuid(),
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
  story_id: z.string().uuid(),
  review_text: z.string().min(1, 'Review text is required'),
  rating: z.number().int().min(1).max(5),
  created_at: z.string().datetime(),
});

// ================================================================
// Mulmocast Script Schema (公式フォーマット準拠)
// ================================================================

// mulmocast 公式スキーマ準拠
export const MulmoSpeakerDataSchema = z.object({
  voiceId: z.string(),
  displayName: z.record(z.string(), z.string()).optional(),
});

export const MulmoSpeakersSchema = z.record(z.string(), MulmoSpeakerDataSchema);

export const MulmoSpeechParamsSchema = z.object({
  provider: z.enum(['openai', 'nijivoice', 'google', 'elevenlabs']).default('openai'),
  speakers: MulmoSpeakersSchema,
});

export const MulmoImageParamsSchema = z.object({
  provider: z.enum(['openai', 'google']).default('openai').optional(),
  model: z.string().optional(),
  style: z.string().optional(),
  quality: z.string().optional(),
});

export const MulmoCanvasSizeSchema = z.object({
  width: z.number().default(1280),
  height: z.number().default(720),
});

export const MulmoAudioParamsSchema = z.object({
  padding: z.number().default(0.3),
  introPadding: z.number().default(1.0),
  closingPadding: z.number().default(0.8),
  outroPadding: z.number().default(1.0),
  bgmVolume: z.number().default(0.2),
  audioVolume: z.number().default(1.0),
  bgm: z.object({
    kind: z.literal('url'),
    url: z.string().url(),
  }).optional(),
});

export const MulmoTextSlideSchema = z.object({
  type: z.literal('textSlide'),
  slide: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  }),
});

export const MulmoImageSchema = z.object({
  type: z.literal('image'),
  source: z.object({
    kind: z.enum(['url', 'path', 'base64', 'text']),
    url: z.string().optional(),
    path: z.string().optional(),
    data: z.string().optional(),
    text: z.string().optional(),
  }),
});

export const MulmoImageAssetSchema = z.union([
  MulmoTextSlideSchema,
  MulmoImageSchema,
]);

export const MulmoCaptionParamsSchema = z.object({
  lang: z.string().default('ja'),
  styles: z.array(z.string()).default([]),
});

export const MulmoBeatSchema = z.object({
  speaker: z.string().default('Presenter'),
  text: z.string().default(''),
  id: z.string().optional(),
  description: z.string().optional(),
  image: MulmoImageAssetSchema.optional(),
  imagePrompt: z.string().optional(),
  duration: z.number().optional(),
  captionParams: MulmoCaptionParamsSchema.optional(),
});

export const MulmoscriptSchema = z.object({
  $mulmocast: z.object({
    version: z.literal('1.0'),
    credit: z.literal('closing').optional(),
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  lang: z.string().default('en'),
  canvasSize: MulmoCanvasSizeSchema.optional(),
  speechParams: MulmoSpeechParamsSchema,
  imageParams: MulmoImageParamsSchema.optional(),
  audioParams: MulmoAudioParamsSchema.optional(),
  captionParams: MulmoCaptionParamsSchema.optional(),
  beats: z.array(MulmoBeatSchema).min(1),
});

// 後方互換性のため古いScene型を残す
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
  title: z.string().min(1).max(255).optional(),
  text_raw: z.string().min(1),
  beats: z.number().min(1).max(20).default(5),
  auto_generate_script: z.boolean().default(false),
});

// ストーリー更新リクエスト
export const UpdateStoryRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  text_raw: z.string().min(1).optional(),
  script_json: z.record(z.any()).optional(),
  beats: z.number().min(1).max(20).optional(),
});

// スクリプト生成レスポンス
export const GenerateScriptResponseSchema = z.object({
  script_json: MulmoscriptSchema,
  status: StoryStatusSchema,
  story: StorySchema,
  generated_with_ai: z.boolean().optional(),
  generation_options: z.object({
    templateId: z.string().optional(),
    targetDuration: z.number().optional(),
    stylePreference: z.enum(['dramatic', 'comedic', 'adventure', 'romantic', 'mystery']).optional(),
    language: z.enum(['ja', 'en']).optional(),
    beats: z.number().optional(),
    retryCount: z.number().optional(),
  }).optional(),
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
export type MulmoBeat = z.infer<typeof MulmoBeatSchema>;
export type MulmoSpeechParams = z.infer<typeof MulmoSpeechParamsSchema>;
export type MulmoImageParams = z.infer<typeof MulmoImageParamsSchema>;
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