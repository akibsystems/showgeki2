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

// ストーリー要素（ステップ1入力）
export const StoryElementsSchema = z.object({
  main_story: z.string().default(''),
  dramatic_turning_point: z.string().optional().default(''),
  future_image: z.string().optional().default(''),
  learnings: z.string().optional().default(''),
  total_scenes: z.number().min(1).max(20).default(5),
});

// ワークフローメタデータ（MulmoScript拡張情報）
export const WorkflowMetadataSchema = z.object({
  acts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    scenes: z.array(z.string()), // シーンIDのリスト
  })).optional(),
  bgm_settings: z.record(z.string(), z.object({
    url: z.string().url().optional(),
    volume: z.number().min(0).max(1).default(0.2),
    fadeIn: z.number().default(0),
    fadeOut: z.number().default(0),
  })).optional(),
  additional_images: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    position: z.number(), // ビート位置
    type: z.enum(['cm', 'transition', 'custom']),
  })).optional(),
  sceneList: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      speaker: z.string(),
      text: z.string(),
      description: z.string().optional(),
      imagePrompt: z.string().optional(),
      image: z.object({
        type: z.enum(['image', 'textSlide']),
        source: z.object({
          kind: z.enum(['url', 'path', 'base64', 'text']),
          url: z.string().optional(),
          path: z.string().optional(),
          data: z.string().optional(),
          text: z.string().optional(),
        }).optional(),
        slide: z.object({
          title: z.string(),
          subtitle: z.string().optional(),
          bullets: z.array(z.string()).optional(),
        }).optional(),
      }).optional(),
      duration: z.number().optional(),
      captionParams: z.object({
        lang: z.string(),
        styles: z.array(z.string()).optional(),
      }).optional(),
      actId: z.string().optional(),
      order: z.number().optional(),
      isTransition: z.boolean().optional(),
    })),
    acts: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      sceneIds: z.array(z.string()),
    })),
    totalScenes: z.number(),
    currentSceneId: z.string().optional(),
    isValid: z.boolean(),
    validationErrors: z.array(z.string()).optional(),
  }).optional(),
});

// ワークフロー状態
export const WorkflowStateSchema = z.object({
  current_step: z.number().min(1).max(5).default(1),
  completed_steps: z.array(z.number()).default([]),
  ai_generations: z.object({
    screenplay: z.any().optional(),
    scene_scripts: z.any().optional(),
    final_video_config: z.any().optional(),
  }).optional(),
  metadata: WorkflowMetadataSchema.optional(),
});

// カスタムアセット参照
export const CustomAssetsSchema = z.object({
  character_images: z.record(z.string(), z.object({
    asset_id: z.string().uuid(),
    url: z.string().url(),
    uploaded_at: z.string().datetime(),
  })).optional(),
  additional_images: z.array(z.object({
    asset_id: z.string().uuid(),
    url: z.string().url(),
    type: z.enum(['cm', 'transition', 'custom']),
    position: z.number().optional(),
  })).optional(),
  custom_audio: z.record(z.string(), z.object({
    asset_id: z.string().uuid(),
    url: z.string().url(),
    type: z.enum(['voice', 'sound_effect']),
  })).optional(),
  custom_bgm: z.record(z.string(), z.object({
    asset_id: z.string().uuid(),
    url: z.string().url(),
    metadata: z.object({
      title: z.string().optional(),
      artist: z.string().optional(),
      duration: z.number().optional(),
    }).optional(),
  })).optional(),
});

// ストーリースキーマ（拡張版）
export const StorySchema = z.object({
  id: z.string().uuid('Story ID must be UUID format'),
  workspace_id: z.string().uuid(),
  uid: UidSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  text_raw: z.string().min(1, 'Story text is required'),
  script_json: z.record(z.any()).optional(),
  status: StoryStatusSchema,
  beats: z.number().min(1).max(20).default(5),
  // ScriptDirector V2 fields
  story_elements: StoryElementsSchema.optional(),
  workflow_state: WorkflowStateSchema.optional(),
  custom_assets: CustomAssetsSchema.optional(),
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
// ScriptDirector V2 Additional Tables
// ================================================================

// ワークフローデータタイプ
export const WorkflowDataTypeSchema = z.enum([
  'ai_screenplay',
  'scene_scripts',
  'final_video_config',
  'bgm_instructions',
  'post_processing_config'
]);

// ワークフローデータ（大容量データ保存用）
export const StoryWorkflowDataSchema = z.object({
  story_id: z.string().uuid(),
  data_type: WorkflowDataTypeSchema,
  data: z.record(z.any()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// アセットタイプ
export const AssetTypeSchema = z.enum([
  'character_image',
  'additional_image',
  'custom_audio',
  'custom_bgm'
]);

// ストーリーアセット
export const StoryAssetSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(),
  asset_type: AssetTypeSchema,
  url: z.string().url(),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  uploaded_by: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ワークフローアクション
export const WorkflowActionSchema = z.enum([
  'complete_step',
  'update_data',
  'skip_step',
  'revert_step'
]);

// ワークフロー履歴
export const WorkflowHistorySchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(),
  step: z.number().min(1).max(5),
  action: WorkflowActionSchema,
  previous_data: z.record(z.any()).optional(),
  new_data: z.record(z.any()).optional(),
  user_id: z.string().uuid().optional(),
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
  text_raw: z.string().default(''),
  beats: z.number().min(1).max(20).default(5),
  auto_generate_script: z.boolean().default(false),
});

// ストーリー更新リクエスト
export const UpdateStoryRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  text_raw: z.string().min(1).optional(),
  script_json: z.record(z.any()).optional(),
  beats: z.number().min(1).max(20).optional(),
  // ScriptDirector V2 fields
  story_elements: StoryElementsSchema.optional(),
  workflow_state: WorkflowStateSchema.optional(),
  custom_assets: CustomAssetsSchema.optional(),
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
// ScriptDirector V2 types
export type StoryElements = z.infer<typeof StoryElementsSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type CustomAssets = z.infer<typeof CustomAssetsSchema>;
export type WorkflowDataType = z.infer<typeof WorkflowDataTypeSchema>;
export type StoryWorkflowData = z.infer<typeof StoryWorkflowDataSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type StoryAsset = z.infer<typeof StoryAssetSchema>;
export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;
export type WorkflowHistory = z.infer<typeof WorkflowHistorySchema>;

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