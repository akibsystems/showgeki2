# Showgeki2 テストフレームワーク ガイド

## 概要

showgeki2プロジェクトでは、Vitest + Playwrightを使用した包括的なテストフレームワークを採用しています。このドキュメントでは、セットアップから実行までの詳細な手順を説明します。

## テストアーキテクチャ

### 技術スタック

| テスト種別 | フレームワーク | 用途 |
|-----------|---------------|------|
| **Unit Tests** | Vitest + React Testing Library | コンポーネント・関数の単体テスト |
| **Integration Tests** | Vitest + MSW | API・データベース統合テスト |
| **E2E Tests** | Playwright | ブラウザでのエンドツーエンドテスト |

### ディレクトリ構成

```
showgeki2/
├── tests/
│   ├── unit/                     # 単体テスト
│   │   ├── api/                  # API Routes テスト
│   │   │   ├── stories.test.ts
│   │   │   ├── videos.test.ts
│   │   │   └── workspaces.test.ts
│   │   ├── components/           # React コンポーネントテスト
│   │   │   ├── editor/
│   │   │   │   ├── monaco-editor.test.tsx
│   │   │   │   └── script-editor.test.tsx
│   │   │   ├── video/
│   │   │   │   ├── video-player.test.tsx
│   │   │   │   └── video-modal.test.tsx
│   │   │   └── ui/
│   │   │       ├── button.test.tsx
│   │   │       └── modal.test.tsx
│   │   └── lib/                  # ユーティリティ関数テスト
│   │       ├── schemas.test.ts
│   │       ├── uid.test.ts
│   │       ├── api-client.test.ts
│   │       └── supabase.test.ts
│   ├── integration/              # 統合テスト
│   │   ├── api-flows.test.ts     # API フロー統合テスト
│   │   ├── webhook.test.ts       # Webhook 統合テスト
│   │   └── database.test.ts      # データベース統合テスト
│   ├── e2e/                      # エンドツーエンドテスト
│   │   ├── user-workflows.spec.ts   # ユーザーワークフロー
│   │   ├── video-generation.spec.ts # 動画生成フロー
│   │   ├── story-management.spec.ts # ストーリー管理
│   │   └── admin-panel.spec.ts      # 管理画面
│   ├── fixtures/                 # テストデータ
│   │   ├── sample-stories.json
│   │   ├── mock-scripts.json
│   │   ├── test-videos/
│   │   └── database-seeds.sql
│   ├── mocks/                    # モックファイル
│   │   ├── api-responses.ts
│   │   ├── supabase.ts
│   │   ├── openai.ts
│   │   └── handlers/             # MSW handlers
│   │       ├── stories.ts
│   │       ├── videos.ts
│   │       └── workspaces.ts
│   └── utils/                    # テストユーティリティ
│       ├── setup.ts              # 共通セットアップ
│       ├── helpers.ts            # ヘルパー関数
│       ├── db-helpers.ts         # データベースヘルパー
│       └── test-server.ts        # テスト用サーバー
├── vitest.config.ts              # Vitest設定
├── playwright.config.ts          # Playwright設定
└── package.json                  # テスト関連依存関係
```

## セットアップ

### 1. 依存関係のインストール

```bash
# Unit & Integration テスト
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev msw

# E2E テスト
npm install --save-dev @playwright/test

# 型定義
npm install --save-dev @types/node
```

### 2. Vitest設定

**`vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/utils/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'tests/integration/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 3. Playwright設定

**`playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4. テスト共通セットアップ

**`tests/utils/setup.ts`**
```typescript
import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '../mocks/server'

// MSW セットアップ
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// グローバルモック
global.fetch = vi.fn()
global.crypto = {
  randomUUID: vi.fn(() => 'test-uuid-123'),
} as any

// LocalStorage モック
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})
```

## テスト実装例

### Unit テスト例

#### React コンポーネントテスト
**`tests/unit/components/ui/button.test.tsx`**
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="primary">Primary Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-primary')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

#### API関数テスト
**`tests/unit/lib/api-client.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/api-client'

// モック設定
vi.mock('@/lib/uid', () => ({
  getOrCreateUid: vi.fn(() => 'test-uid-123'),
}))

describe('API Client', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  describe('getWorkspaces', () => {
    it('fetches workspaces with correct headers', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', name: 'Test Workspace' }],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.getWorkspaces()

      expect(fetch).toHaveBeenCalledWith('/api/workspaces', {
        headers: {
          'Content-Type': 'application/json',
          'x-uid': 'test-uid-123',
        },
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('throws error on failed request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(apiClient.getWorkspaces()).rejects.toThrow('API Error: 500')
    })
  })
})
```

#### ユーティリティ関数テスト
**`tests/unit/lib/schemas.test.ts`**
```typescript
import { describe, it, expect } from 'vitest'
import { StorySchema, VideoSchema, UidSchema } from '@/lib/schemas'

describe('Zod Schemas', () => {
  describe('UidSchema', () => {
    it('validates correct UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(UidSchema.parse(validUuid)).toBe(validUuid)
    })

    it('rejects invalid UUID', () => {
      expect(() => UidSchema.parse('invalid-uuid')).toThrow()
    })
  })

  describe('StorySchema', () => {
    it('validates complete story object', () => {
      const validStory = {
        id: 'ABCD1234',
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
        uid: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Story',
        text_raw: 'Story content',
        status: 'draft',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      expect(StorySchema.parse(validStory)).toEqual(validStory)
    })

    it('rejects story with invalid status', () => {
      const invalidStory = {
        id: 'ABCD1234',
        status: 'invalid_status',
        // ... other fields
      }

      expect(() => StorySchema.parse(invalidStory)).toThrow()
    })
  })
})
```

### Integration テスト例

**`tests/integration/api-flows.test.ts`**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer } from '../utils/test-server'
import { seedTestData, cleanupTestData } from '../utils/db-helpers'

describe('API Integration Tests', () => {
  let server: any

  beforeAll(async () => {
    server = await createTestServer()
    await seedTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    await server.close()
  })

  describe('Story to Video Generation Flow', () => {
    it('completes full workflow: create story → generate script → create video', async () => {
      const testUid = 'test-uid-integration'

      // 1. Create workspace
      const workspaceResponse = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-uid': testUid,
        },
        body: JSON.stringify({ name: 'Test Workspace' }),
      })
      const workspace = await workspaceResponse.json()
      expect(workspace.success).toBe(true)

      // 2. Create story
      const storyResponse = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-uid': testUid,
        },
        body: JSON.stringify({
          workspace_id: workspace.data.id,
          title: 'Test Story',
          text_raw: 'Test story content',
        }),
      })
      const story = await storyResponse.json()
      expect(story.success).toBe(true)

      // 3. Generate script
      const scriptResponse = await fetch(`/api/stories/${story.data.id}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-uid': testUid,
        },
      })
      const script = await scriptResponse.json()
      expect(script.success).toBe(true)

      // 4. Generate video
      const videoResponse = await fetch(`/api/stories/${story.data.id}/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-uid': testUid,
        },
      })
      const video = await videoResponse.json()
      expect(video.success).toBe(true)
      expect(video.data.status).toBe('queued')
    })
  })
})
```

### E2E テスト例

**`tests/e2e/user-workflows.spec.ts`**
```typescript
import { test, expect } from '@playwright/test'

test.describe('User Workflows', () => {
  test('complete story creation and video generation workflow', async ({ page }) => {
    // 1. Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveTitle(/Showgeki2/)

    // 2. Create new story
    await page.click('[data-testid="create-story-button"]')
    await page.fill('[data-testid="story-title"]', 'E2E Test Story')
    await page.fill('[data-testid="story-content"]', '昔々あるところに、勇敢な騎士がいました。')
    await page.click('[data-testid="save-story-button"]')

    // 3. Verify story creation
    await expect(page.locator('[data-testid="story-status"]')).toContainText('draft')

    // 4. Generate script
    await page.click('[data-testid="generate-script-button"]')
    await expect(page.locator('[data-testid="script-editor"]')).toBeVisible()
    await expect(page.locator('[data-testid="story-status"]')).toContainText('script_generated')

    // 5. Generate video
    await page.click('[data-testid="generate-video-button"]')
    await expect(page.locator('[data-testid="video-status"]')).toContainText('queued')

    // 6. Check video player appears
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible({ timeout: 60000 })
  })

  test('video management workflow', async ({ page }) => {
    await page.goto('/videos')

    // Check video list
    await expect(page.locator('[data-testid="video-grid"]')).toBeVisible()

    // Play video
    await page.click('[data-testid="video-thumbnail"]:first-child')
    await expect(page.locator('[data-testid="video-modal"]')).toBeVisible()

    // Check video controls
    await page.click('[data-testid="play-button"]')
    await expect(page.locator('video')).toHaveJSProperty('paused', false)

    // Download video
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-button"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.mp4$/)
  })
})
```

## テスト実行

### package.jsonスクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

### 開発時の実行コマンド

```bash
# Unit & Integration テスト（ウォッチモード）
npm run test

# Unit テストのみ
npm run test tests/unit

# Integration テストのみ  
npm run test tests/integration

# カバレッジレポート付き
npm run test:coverage

# E2E テスト
npm run test:e2e

# E2E テスト（UIモード）
npm run test:e2e:ui

# 全テスト実行
npm run test:all
```

## CI/CD統合

### GitHub Actions例

**`.github/workflows/test.yml`**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## モック戦略

### MSW (Mock Service Worker) セットアップ

**`tests/mocks/server.ts`**
```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

**`tests/mocks/handlers/stories.ts`**
```typescript
import { http, HttpResponse } from 'msw'

export const storiesHandlers = [
  http.get('/api/stories', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'STORY123',
          title: 'Mock Story',
          text_raw: 'Mock content',
          status: 'draft',
        },
      ],
    })
  }),

  http.post('/api/stories', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: {
        id: 'NEW_STORY',
        ...body,
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    })
  }),
]
```

## ベストプラクティス

### 1. テスト命名規則
```typescript
// ✅ Good
describe('Button Component', () => {
  it('renders with correct text', () => { ... })
  it('calls onClick handler when clicked', () => { ... })
  it('is disabled when disabled prop is true', () => { ... })
})

// ❌ Bad
describe('Button', () => {
  it('test1', () => { ... })
  it('works', () => { ... })
})
```

### 2. AAA パターン
```typescript
it('creates new story successfully', async () => {
  // Arrange
  const storyData = { title: 'Test', content: 'Content' }
  
  // Act
  const result = await apiClient.createStory(storyData)
  
  // Assert
  expect(result.success).toBe(true)
  expect(result.data.title).toBe('Test')
})
```

### 3. テストデータ管理
```typescript
// fixtures/sample-stories.json
{
  "validStory": {
    "title": "Valid Story",
    "text_raw": "Story content",
    "status": "draft"
  },
  "invalidStory": {
    "title": "",
    "text_raw": null
  }
}

// テストでの使用
import { validStory } from '../fixtures/sample-stories.json'
```

### 4. エラーケーステスト
```typescript
describe('Error handling', () => {
  it('handles network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    
    await expect(apiClient.getStories()).rejects.toThrow('Network error')
  })

  it('handles validation errors', () => {
    expect(() => StorySchema.parse({})).toThrow()
  })
})
```

## パフォーマンステスト

### Lighthouse CI統合
```bash
npm install --save-dev @lhci/cli

# lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run dev',
      url: ['http://localhost:3000', 'http://localhost:3000/dashboard'],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
}
```

このテストフレームワークにより、showgeki2の品質を継続的に保証し、安心してリファクタリングや新機能追加が行えます。