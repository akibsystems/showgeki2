/**
 * ワークフロー関連の設定値
 */

// 制限値
export const WORKFLOW_LIMITS = {
  // 文字数制限
  STORY_TEXT_MAX: 2000,
  CHARACTERS_MAX: 500,
  TURNING_POINT_MAX: 500,
  FUTURE_VISION_MAX: 500,
  LEARNINGS_MAX: 500,
  TITLE_MAX: 100,
  SCENE_TITLE_MAX: 50,
  SCENE_SUMMARY_MAX: 200,
  DIALOGUE_MAX: 500,
  IMAGE_PROMPT_MAX: 500,

  // シーン数
  MIN_SCENES: 1,
  MAX_SCENES: 20,
  DEFAULT_SCENES: 5,

  // ファイルサイズ
  MAX_IMAGE_SIZE: parseInt(process.env.WORKFLOW_MAX_IMAGE_SIZE || '5242880'), // 5MB
  MAX_AUDIO_SIZE: parseInt(process.env.WORKFLOW_MAX_AUDIO_SIZE || '10485760'), // 10MB

  // その他
  MAX_CHARACTERS_PER_STORY: 10,
  MAX_DIALOGUES_PER_SCENE: 20,
} as const;

// デフォルト値
export const WORKFLOW_DEFAULTS = {
  STYLE: 'シェイクスピア風',
  LANGUAGE: 'ja',
  BGM_VOLUME: 0.2,
  CAPTION_ENABLED: true,
  CAPTION_LANG: 'ja',
  CAPTION_STYLES: [
    'font-size: 48px',
    'color: white',
    'text-shadow: 2px 2px 4px rgba(0,0,0,0.8)',
    'font-family: \'Noto Sans JP\', sans-serif',
    'font-weight: bold',
  ],
} as const;

// BGMプリセット
export const BGM_PRESETS = [
  {
    url: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story001.mp3',
    description: '穏やかな物語',
    mood: 'calm',
  },
  {
    url: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story002.mp3',
    description: '冒険的な物語',
    mood: 'adventurous',
  },
  {
    url: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story003.mp3',
    description: '感動的な物語',
    mood: 'emotional',
  },
  {
    url: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story004.mp3',
    description: 'ミステリアスな物語',
    mood: 'mysterious',
  },
  {
    url: 'https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/story005.mp3',
    description: '楽しい物語',
    mood: 'cheerful',
  },
] as const;

// エラーメッセージ
export const WORKFLOW_ERROR_MESSAGES = {
  STORY_TEXT_REQUIRED: 'ストーリーを入力してください',
  STORY_TEXT_TOO_LONG: `ストーリーは${WORKFLOW_LIMITS.STORY_TEXT_MAX}文字以内で入力してください`,
  CHARACTERS_REQUIRED: '登場人物を入力してください',
  CHARACTERS_TOO_LONG: `登場人物は${WORKFLOW_LIMITS.CHARACTERS_MAX}文字以内で入力してください`,
  TURNING_POINT_REQUIRED: 'ドラマチック転換点を入力してください',
  TURNING_POINT_TOO_LONG: `ドラマチック転換点は${WORKFLOW_LIMITS.TURNING_POINT_MAX}文字以内で入力してください`,
  TITLE_REQUIRED: 'タイトルを入力してください',
  TITLE_TOO_LONG: `タイトルは${WORKFLOW_LIMITS.TITLE_MAX}文字以内で入力してください`,
  INVALID_SCENE_COUNT: `シーン数は${WORKFLOW_LIMITS.MIN_SCENES}〜${WORKFLOW_LIMITS.MAX_SCENES}の間で設定してください`,
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます',
  INVALID_FILE_TYPE: '対応していないファイル形式です',
} as const;

// 許可するファイルタイプ
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a'],
} as const;