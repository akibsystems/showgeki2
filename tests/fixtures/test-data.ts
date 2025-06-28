// テストデータ定義

export const VALID_UID = '12345678-1234-4234-b234-123456789abc'
export const WORKSPACE_ID = '87654321-4321-4321-b321-987654321dcb'
export const STORY_ID = '11111111-2222-4333-b444-555555555555'
export const VIDEO_ID = '66666666-7777-4888-b999-aaaaaaaaaaaa'

export const MOCK_WORKSPACE = {
  id: WORKSPACE_ID,
  uid: VALID_UID,
  name: 'Test Workspace',
  created_at: '2024-01-01T00:00:00.000Z',
}

export const MOCK_STORY = {
  id: STORY_ID,
  workspace_id: WORKSPACE_ID,
  uid: VALID_UID,
  title: 'Test Story',
  text_raw: 'This is a test story content.',
  script_json: null,
  status: 'draft',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

export const MOCK_STORY_WITH_SCRIPT = {
  ...MOCK_STORY,
  script_json: {
    $mulmocast: { version: '1.0' },
    title: 'Test Story',
    lang: 'ja',
    speechParams: {
      provider: 'openai',
      speakers: {
        Narrator: { voiceId: 'alloy' },
      },
    },
    beats: [
      {
        speaker: 'Narrator',
        text: 'This is a test story.',
        duration: 5.0,
      },
    ],
  },
  status: 'script_generated',
}

export const MOCK_VIDEO = {
  id: VIDEO_ID,
  story_id: STORY_ID,
  uid: VALID_UID,
  // url: undefined, // Omit url field for queued videos 
  status: 'queued',
  created_at: '2024-01-01T00:00:00.000Z',
}

export const MOCK_COMPLETED_VIDEO = {
  ...MOCK_VIDEO,
  id: '22222222-3333-4333-b444-555555555555',
  url: 'https://storage.example.com/videos/test-video.mp4',
  status: 'completed',
}

export const MOCK_PROCESSING_VIDEO = {
  ...MOCK_VIDEO,
  id: '33333333-4444-4333-b444-555555555555', 
  status: 'processing',
}

// データベースエラーシミュレーション用
export const MOCK_DB_ERRORS = {
  NOT_FOUND: { code: 'PGRST116', message: 'Row not found' },
  DUPLICATE_KEY: { code: '23505', message: 'duplicate key value violates unique constraint' },
  FOREIGN_KEY: { code: '23503', message: 'violates foreign key constraint' },
  PERMISSION_DENIED: { code: '42501', message: 'permission denied' },
}

// OpenAI生成スクリプトのモック
export const MOCK_GENERATED_SCRIPT = {
  $mulmocast: { version: '1.0' },
  title: 'Test Story',
  lang: 'ja',
  speechParams: {
    provider: 'openai',
    speakers: {
      Narrator: { voiceId: 'alloy' },
    },
  },
  beats: [
    {
      speaker: 'Narrator',
      text: 'This is a test story.',
      duration: 5.0,
    },
  ],
}

// UUID生成ヘルパー
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// ヘルパー関数：動的データ生成
export function createMockStory(overrides: Partial<typeof MOCK_STORY> = {}) {
  return {
    ...MOCK_STORY,
    ...overrides,
    id: overrides.id || generateUUID(),
  }
}

export function createMockVideo(overrides: Partial<typeof MOCK_VIDEO> = {}) {
  return {
    ...MOCK_VIDEO,
    ...overrides,
    id: overrides.id || generateUUID(),
  }
}

export function createMockWorkspace(overrides: Partial<typeof MOCK_WORKSPACE> = {}) {
  return {
    ...MOCK_WORKSPACE,
    ...overrides,
    id: overrides.id || generateUUID(),
  }
}