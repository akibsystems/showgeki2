import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// テスト用のUID
export const TEST_UID = 'test-uid-12345678-1234-1234-1234-123456789abc'
export const TEST_WORKSPACE_ID = 'test-workspace-12345678-1234-1234-1234-123456789abc'
export const TEST_STORY_ID = 'TESTSTRY'
export const TEST_VIDEO_ID = 'test-video-12345678-1234-1234-1234-123456789abc'

// カスタムレンダー関数（将来的にProviderをラップする場合）
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options })

// 汎用的なモックファクトリー
export const createMockWorkspace = (overrides = {}) => ({
  id: TEST_WORKSPACE_ID,
  uid: TEST_UID,
  name: 'Test Workspace',
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockStory = (overrides = {}) => ({
  id: TEST_STORY_ID,
  workspace_id: TEST_WORKSPACE_ID,
  uid: TEST_UID,
  title: 'Test Story',
  text_raw: 'Test story content',
  script_json: null,
  status: 'draft' as const,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockVideo = (overrides = {}) => ({
  id: TEST_VIDEO_ID,
  story_id: TEST_STORY_ID,
  uid: TEST_UID,
  url: 'https://example.com/test-video.mp4',
  duration_sec: 30,
  resolution: '1920x1080',
  size_mb: 10.5,
  status: 'completed' as const,
  error_msg: null,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockScript = (overrides = {}) => ({
  version: '1.0',
  title: 'Test Script',
  scenes: [
    {
      id: 'scene1',
      type: 'dialogue' as const,
      content: 'Test dialogue',
      duration: 5,
      voice: {
        character: 'Character1',
        emotion: 'neutral',
      },
    },
  ],
  metadata: {
    duration_total: 30,
    resolution: '1920x1080',
    fps: 30,
  },
  ...overrides,
})

// APIレスポンスモック
export const createMockApiResponse = (data: any, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
  timestamp: new Date().toISOString(),
})

export const createMockApiError = (message = 'Test error', type = 'INTERNAL') => ({
  error: message,
  type,
  timestamp: new Date().toISOString(),
})

// fetch モックヘルパー
export const mockFetch = (response: any, ok = true, status = 200) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
  })
}

export const mockFetchError = (error: Error) => {
  return vi.fn().mockRejectedValue(error)
}

// localStorage モックヘルパー
export const mockLocalStorageData = (data: Record<string, string>) => {
  const mockGetItem = vi.fn((key: string) => data[key] || null)
  const mockSetItem = vi.fn()
  const mockRemoveItem = vi.fn()
  
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
      clear: vi.fn(),
    },
    writable: true,
  })
  
  return { mockGetItem, mockSetItem, mockRemoveItem }
}

// 時間関連のヘルパー
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// DOM要素の検証ヘルパー
export const expectElementToHaveText = (element: HTMLElement, text: string) => {
  expect(element).toBeInTheDocument()
  expect(element).toHaveTextContent(text)
}

export const expectElementToHaveClass = (element: HTMLElement, className: string) => {
  expect(element).toBeInTheDocument()
  expect(element).toHaveClass(className)
}