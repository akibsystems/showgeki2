# テスト戦略ドキュメント

## 概要

showgeki2のテスト戦略は、品質保証と開発効率のバランスを重視し、単体テスト、統合テスト、E2Eテスト、負荷テストを組み合わせた包括的なアプローチを採用しています。

## テストピラミッド

```
        ╱╲
       ╱E2E╲      少数・重要なユーザーフロー
      ╱  Tests ╲
     ╱──────────╲
    ╱ Integration ╲   API統合・データベース連携
   ╱     Tests      ╲
  ╱──────────────────╲
 ╱    Unit Tests      ╲  多数・高速・独立したロジック
╱──────────────────────╲
```

## テストツール

| ツール | 用途 | 設定ファイル |
|--------|------|-------------|
| Vitest | 単体テスト・統合テスト | `vitest.config.ts` |
| Testing Library | Reactコンポーネントテスト | - |
| MSW | APIモック | `src/mocks/` |
| Playwright | E2Eテスト | `playwright.config.ts` |
| Custom Scripts | 負荷テスト | `scripts/load-test-*.js` |

## 1. 単体テスト

### テスト対象

- ユーティリティ関数
- カスタムフック
- 純粋な関数
- ビジネスロジック

### 実装例

```typescript
// lib/utils/__tests__/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, formatDuration, sanitizeText } from '../format';

describe('formatDate', () => {
  it('should format date in Japanese format', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date)).toBe('2024年1月15日 19:30');
  });
  
  it('should handle invalid date', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
  });
});

describe('formatDuration', () => {
  it('should format seconds to mm:ss', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(3661)).toBe('61:01');
  });
});

describe('sanitizeText', () => {
  it('should remove control characters', () => {
    const input = 'Hello\x00World\x1F';
    expect(sanitizeText(input)).toBe('HelloWorld');
  });
  
  it('should limit text length', () => {
    const longText = 'a'.repeat(10000);
    expect(sanitizeText(longText, 5000)).toHaveLength(5000);
  });
});
```

### カスタムフックのテスト

```typescript
// hooks/__tests__/useStory.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useStory } from '../useStory';
import { server } from '@/mocks/server';
import { rest } from 'msw';

describe('useStory', () => {
  it('should fetch story data', async () => {
    const { result } = renderHook(() => useStory('test-id'));
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.story).toEqual({
        id: 'test-id',
        title: 'Test Story',
        status: 'draft'
      });
    });
  });
  
  it('should handle update', async () => {
    const { result } = renderHook(() => useStory('test-id'));
    
    await waitFor(() => expect(result.current.story).toBeDefined());
    
    await result.current.updateStory({ title: 'Updated Title' });
    
    expect(result.current.story?.title).toBe('Updated Title');
  });
  
  it('should handle errors', async () => {
    server.use(
      rest.get('/api/stories/:id', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const { result } = renderHook(() => useStory('error-id'));
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

## 2. コンポーネントテスト

### 実装例

```typescript
// components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
  
  it('should apply variant styles', () => {
    const { rerender } = render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-purple-500');
    
    rerender(<Button variant="danger">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-500');
  });
});
```

### 複雑なコンポーネントのテスト

```typescript
// components/editor/__tests__/ScriptDirector.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScriptDirector } from '../ScriptDirector';
import { mockScript } from '@/mocks/data';

describe('ScriptDirector', () => {
  const mockOnChange = vi.fn();
  
  beforeEach(() => {
    mockOnChange.mockClear();
  });
  
  it('should render all tabs', () => {
    render(
      <ScriptDirector 
        script={mockScript} 
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('タイトル')).toBeInTheDocument();
    expect(screen.getByText('画像設定')).toBeInTheDocument();
    expect(screen.getByText('スピーカー')).toBeInTheDocument();
    expect(screen.getByText('シーン')).toBeInTheDocument();
  });
  
  it('should update title', async () => {
    render(
      <ScriptDirector 
        script={mockScript} 
        onChange={mockOnChange}
      />
    );
    
    const titleInput = screen.getByLabelText('タイトル');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Title' })
      );
    });
  });
  
  it('should add new speaker', async () => {
    render(
      <ScriptDirector 
        script={mockScript} 
        onChange={mockOnChange}
      />
    );
    
    // スピーカータブに切り替え
    fireEvent.click(screen.getByText('スピーカー'));
    
    // 新規追加ボタンをクリック
    fireEvent.click(screen.getByText('スピーカーを追加'));
    
    // モーダルで入力
    const nameInput = screen.getByLabelText('スピーカー名');
    fireEvent.change(nameInput, { target: { value: '新キャラクター' } });
    
    // 保存
    fireEvent.click(screen.getByText('保存'));
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          speechParams: expect.objectContaining({
            speakers: expect.objectContaining({
              '新キャラクター': expect.any(Object)
            })
          })
        })
      );
    });
  });
});
```

## 3. 統合テスト

### API統合テスト

```typescript
// app/api/stories/__tests__/route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMockSupabaseClient } from '@/tests/utils';
import { POST } from '../route';

describe('POST /api/stories', () => {
  let supabase;
  
  beforeAll(() => {
    supabase = createMockSupabaseClient();
  });
  
  it('should create a new story', async () => {
    const request = new Request('http://localhost/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        workspace_id: 'test-workspace',
        title: 'Test Story',
        text_raw: 'This is a test story',
        beats: 5
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      title: 'Test Story',
      status: 'draft'
    });
  });
  
  it('should validate required fields', async () => {
    const request = new Request('http://localhost/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        workspace_id: 'test-workspace'
        // Missing required fields
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.type).toBe('VALIDATION');
    expect(data.details).toBeDefined();
  });
});
```

### データベーステスト

```typescript
// lib/db/__tests__/stories.test.ts
import { createTestDatabase, cleanupTestDatabase } from '@/tests/db-utils';
import { createStory, updateStory, getStory } from '../stories';

describe('Stories Database Operations', () => {
  let testDb;
  
  beforeEach(async () => {
    testDb = await createTestDatabase();
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  it('should create and retrieve story', async () => {
    const story = await createStory(testDb, {
      workspace_id: 'test-ws',
      uid: 'test-user',
      title: 'Test Story',
      text_raw: 'Content'
    });
    
    expect(story.id).toBeDefined();
    expect(story.status).toBe('draft');
    
    const retrieved = await getStory(testDb, story.id, 'test-user');
    expect(retrieved).toEqual(story);
  });
  
  it('should enforce user isolation', async () => {
    const story = await createStory(testDb, {
      workspace_id: 'test-ws',
      uid: 'user1',
      title: 'User 1 Story',
      text_raw: 'Content'
    });
    
    // Different user should not access
    const retrieved = await getStory(testDb, story.id, 'user2');
    expect(retrieved).toBeNull();
  });
});
```

## 4. E2Eテスト

### 主要なユーザーフロー

```typescript
// e2e/story-creation.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Story Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'password');
  });
  
  test('should create story and generate script', async ({ page }) => {
    // ダッシュボードに移動
    await page.goto('/dashboard');
    
    // 新規ストーリー作成
    await page.click('text=新しいストーリー');
    
    // フォーム入力
    await page.fill('input[name="title"]', 'E2Eテストストーリー');
    await page.fill('textarea[name="content"]', '昔々、ある場所に...');
    await page.selectOption('select[name="beats"]', '5');
    
    // 保存
    await page.click('button:has-text("保存")');
    
    // 成功メッセージを確認
    await expect(page.locator('text=保存しました')).toBeVisible();
    
    // 台本生成
    await page.click('button:has-text("台本を作成")');
    
    // 生成完了を待つ（最大30秒）
    await expect(page.locator('text=台本が生成されました')).toBeVisible({
      timeout: 30000
    });
    
    // ScriptDirectorが表示されることを確認
    await expect(page.locator('[data-testid="script-director"]')).toBeVisible();
  });
  
  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // APIエラーをシミュレート
    await page.route('**/api/stories', route => {
      route.abort('failed');
    });
    
    await page.click('text=新しいストーリー');
    await page.fill('input[name="title"]', 'Test');
    await page.click('button:has-text("保存")');
    
    // エラーメッセージ表示
    await expect(page.locator('text=エラーが発生しました')).toBeVisible();
  });
});
```

## 5. 負荷テスト

### 実装済みスクリプト

| スクリプト | 目的 | 使用方法 |
|------------|------|----------|
| `load-test-concurrent.js` | 並行ユーザーシミュレーション | `node scripts/load-test-concurrent.js --users 20` |
| `test-webhook-concurrent.js` | Webhook並行処理テスト | `node scripts/test-webhook-concurrent.js` |
| `test-cloud-run.js` | 本番環境負荷テスト | `node scripts/test-cloud-run.js` |

### 負荷テスト実装例

```javascript
// scripts/load-test-concurrent.js（抜粋）
async function runLoadTest(concurrentUsers) {
  const metrics = {
    startTime: Date.now(),
    successCount: 0,
    failureCount: 0,
    responseTimes: []
  };
  
  // 並行実行
  const promises = Array(concurrentUsers).fill(null).map((_, i) => 
    runSingleUserFlow(i + 1)
      .then(result => {
        metrics.successCount++;
        metrics.responseTimes.push(result.duration);
      })
      .catch(() => {
        metrics.failureCount++;
      })
  );
  
  await Promise.all(promises);
  
  // レポート生成
  const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  const successRate = (metrics.successCount / concurrentUsers) * 100;
  
  console.log(`
    負荷テスト結果:
    - 同時ユーザー数: ${concurrentUsers}
    - 成功率: ${successRate.toFixed(1)}%
    - 平均応答時間: ${Math.round(avgResponseTime)}ms
    - 最大応答時間: ${Math.max(...metrics.responseTimes)}ms
    - 最小応答時間: ${Math.min(...metrics.responseTimes)}ms
  `);
}
```

## 6. テストデータ管理

### テストフィクスチャ

```typescript
// tests/fixtures/stories.ts
export const mockStory = {
  id: 'test-story-id',
  workspace_id: 'test-workspace',
  uid: 'test-user',
  title: 'テストストーリー',
  text_raw: 'これはテスト用のストーリーです。',
  status: 'draft',
  beats: 5,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
};

export const mockScript = {
  $mulmocast: { version: '1.0' },
  title: 'テスト台本',
  lang: 'ja',
  beats: [
    {
      speaker: 'Narrator',
      text: 'むかしむかし、ある所に...',
      image: {
        type: 'image',
        source: {
          kind: 'prompt',
          prompt: '美しい森の風景'
        }
      }
    }
  ],
  speechParams: {
    provider: 'openai',
    speakers: {
      'Narrator': {
        voiceId: 'alloy',
        displayName: { en: 'Narrator', ja: 'ナレーター' }
      }
    }
  }
};
```

### テストビルダー

```typescript
// tests/builders/story-builder.ts
export class StoryBuilder {
  private story: Partial<Story> = {
    id: 'test-id',
    status: 'draft'
  };
  
  withTitle(title: string): this {
    this.story.title = title;
    return this;
  }
  
  withStatus(status: StoryStatus): this {
    this.story.status = status;
    return this;
  }
  
  withScript(script: any): this {
    this.story.script_json = script;
    this.story.status = 'script_generated';
    return this;
  }
  
  build(): Story {
    return {
      ...mockStory,
      ...this.story
    } as Story;
  }
}

// 使用例
const story = new StoryBuilder()
  .withTitle('カスタムタイトル')
  .withStatus('script_generated')
  .withScript(mockScript)
  .build();
```

## 7. CI/CD統合

### GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 8. テストカバレッジ目標

| カテゴリ | 目標 | 現状 |
|----------|------|------|
| ユーティリティ関数 | 90% | - |
| カスタムフック | 80% | - |
| APIルート | 80% | - |
| UIコンポーネント | 70% | - |
| E2E主要フロー | 100% | - |

## まとめ

showgeki2のテスト戦略は：

1. **包括的**: 単体からE2Eまで全レベルをカバー
2. **実践的**: 実際のユーザーシナリオに基づく
3. **自動化**: CI/CDパイプラインに統合
4. **保守性**: テストデータの再利用と管理
5. **パフォーマンス**: 負荷テストによる性能保証