import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// グローバルクリーンアップ
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// LocalStorage モック - 実際の動作をシミュレート
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    // テスト用ヘルパーメソッド
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = { ...newStore }
    },
  }
}

const mockLocalStorage = createLocalStorageMock()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// document.cookie モック - 実際の動作をシミュレート
const createCookieMock = () => {
  let cookies: Record<string, string> = {}
  
  return {
    get cookie() {
      return Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
    },
    set cookie(cookieString: string) {
      if (!cookieString) return
      
      // Parse cookie string: "key=value; attribute=value; ..."
      const parts = cookieString.split(';').map(part => part.trim())
      const [keyValue] = parts
      
      if (!keyValue) return
      
      const [key, value] = keyValue.split('=')
      if (!key) return
      
      // Check for max-age=0 (deletion)
      const maxAge = parts.find(part => part.startsWith('max-age='))
      if (maxAge && maxAge.split('=')[1] === '0') {
        delete cookies[key]
      } else {
        cookies[key] = value || ''
      }
    },
    // テスト用ヘルパーメソッド
    _getCookies: () => cookies,
    _setCookies: (newCookies: Record<string, string>) => {
      cookies = { ...newCookies }
    },
    _clearCookies: () => {
      cookies = {}
    },
  }
}

const mockDocument = createCookieMock()

Object.defineProperty(document, 'cookie', {
  get: () => mockDocument.cookie,
  set: (value: string) => { mockDocument.cookie = value },
  configurable: true,
})

// crypto.randomUUID モック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '12345678-1234-4234-b234-123456789abc'),
  },
  writable: true,
})

// fetch モック（基本設定）
global.fetch = vi.fn()

// ResizeObserver モック（Monaco Editor等で必要）
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// IntersectionObserver モック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// window.matchMedia モック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// HTMLCanvasElement.getContext モック（video thumbnail用）
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,test'),
})

// HTMLVideoElement モック
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLVideoElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
})

// コンソールエラーを抑制（開発時の見やすさのため）
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// SSRテスト用 - windowオブジェクト管理
const originalWindow = global.window

export const mockSSREnvironment = () => {
  // windowオブジェクトを一時的に削除
  Object.defineProperty(global, 'window', {
    value: undefined,
    writable: true,
    configurable: true,
  })
}

export const restoreBrowserEnvironment = () => {
  // windowオブジェクトを復元
  Object.defineProperty(global, 'window', {
    value: originalWindow,
    writable: true,
    configurable: true,
  })
}

afterAll(() => {
  restoreBrowserEnvironment()
  vi.restoreAllMocks()
})