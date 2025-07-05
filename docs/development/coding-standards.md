# コーディング規約

## 概要

showgeki2プロジェクトのコーディング規約です。コードの一貫性、可読性、保守性を確保するための基準とベストプラクティスを定義します。

## 基本原則

1. **可読性優先**: 複雑さよりも理解しやすさを重視
2. **一貫性**: プロジェクト全体で統一されたスタイル
3. **保守性**: 将来の変更が容易なコード設計
4. **型安全性**: TypeScriptの型システムを最大限活用

## 1. TypeScript/JavaScript

### 1.1 命名規則

```typescript
// ファイル名: kebab-case
// components/story-editor.tsx
// lib/api-client.ts

// クラス名: PascalCase
class StoryEditor {
  // ...
}

// インターフェース/型: PascalCase、Iプレフィックスは使わない
interface Story {
  id: string;
  title: string;
}

// 定数: UPPER_SNAKE_CASE
const MAX_STORY_LENGTH = 5000;
const API_TIMEOUT = 30000;

// 変数・関数: camelCase
const storyTitle = 'My Story';
function generateScript(story: Story): Script {
  // ...
}

// React コンポーネント: PascalCase
const StoryCard: FC<StoryCardProps> = ({ story }) => {
  // ...
};

// カスタムフック: use + PascalCase
function useStoryData(storyId: string) {
  // ...
}

// 列挙型: PascalCase、値はUPPER_SNAKE_CASE
enum StoryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}
```

### 1.2 型定義

```typescript
// 明示的な型定義を推奨
// ❌ 悪い例
const processStory = (data) => {
  return data.title;
};

// ✅ 良い例
const processStory = (data: Story): string => {
  return data.title;
};

// ユニオン型の活用
type Status = 'idle' | 'loading' | 'success' | 'error';

// インターフェースの拡張
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Story extends BaseEntity {
  title: string;
  content: string;
  authorId: string;
}

// ジェネリクスの使用
interface ApiResponse<T> {
  data: T;
  error: Error | null;
  loading: boolean;
}

// 厳密な型チェック
type StrictStory = {
  readonly id: string;
  title: string;
  content: string;
  beats?: number; // オプショナル
  metadata: Record<string, unknown>; // 柔軟な型
};
```

### 1.3 非同期処理

```typescript
// async/awaitを優先
// ❌ 悪い例
function fetchStory(id: string) {
  return fetch(`/api/stories/${id}`)
    .then(res => res.json())
    .then(data => data)
    .catch(err => console.error(err));
}

// ✅ 良い例
async function fetchStory(id: string): Promise<Story> {
  try {
    const response = await fetch(`/api/stories/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch story:', error);
    throw error;
  }
}

// エラーハンドリング
async function safeStoryOperation<T>(
  operation: () => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
```

### 1.4 関数の設計

```typescript
// 単一責任の原則
// ❌ 悪い例
async function processAndSaveStory(storyData: any) {
  // 検証、変換、保存を全て行う
  if (!storyData.title) throw new Error('Title required');
  const processed = { ...storyData, processedAt: new Date() };
  const saved = await db.save(processed);
  await sendEmail(saved.authorEmail);
  return saved;
}

// ✅ 良い例
function validateStory(data: unknown): Story {
  const parsed = StorySchema.parse(data);
  return parsed;
}

async function saveStory(story: Story): Promise<SavedStory> {
  return await db.stories.create(story);
}

async function notifyAuthor(story: SavedStory): Promise<void> {
  await emailService.send({
    to: story.authorEmail,
    subject: 'Story saved successfully'
  });
}

// 使用例
async function processStory(data: unknown): Promise<SavedStory> {
  const validated = validateStory(data);
  const saved = await saveStory(validated);
  await notifyAuthor(saved);
  return saved;
}
```

## 2. React/Next.js

### 2.1 コンポーネント構造

```typescript
// components/StoryEditor/index.tsx
import { FC, useState, useCallback, useMemo } from 'react';
import { useStoryData } from '@/hooks/useStoryData';
import type { Story } from '@/types';

interface StoryEditorProps {
  storyId: string;
  onSave?: (story: Story) => void;
  className?: string;
}

export const StoryEditor: FC<StoryEditorProps> = ({
  storyId,
  onSave,
  className
}) => {
  // 1. Hooks（順序を守る）
  const { data: story, loading, error } = useStoryData(storyId);
  const [title, setTitle] = useState(story?.title || '');
  
  // 2. 計算値
  const wordCount = useMemo(() => {
    return title.split(' ').length;
  }, [title]);
  
  // 3. イベントハンドラ
  const handleSave = useCallback(async () => {
    if (!story) return;
    
    const updated = { ...story, title };
    await updateStory(updated);
    onSave?.(updated);
  }, [story, title, onSave]);
  
  // 4. 早期リターン
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!story) return <NotFound />;
  
  // 5. メインレンダリング
  return (
    <div className={cn('story-editor', className)}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Story title"
      />
      <span className="word-count">{wordCount} words</span>
      <button onClick={handleSave}>Save</button>
    </div>
  );
};
```

### 2.2 カスタムフック

```typescript
// hooks/useStoryData.ts
import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface UseStoryDataReturn {
  data: Story | null;
  loading: boolean;
  error: Error | null;
  mutate: () => void;
}

export function useStoryData(storyId: string): UseStoryDataReturn {
  // SWRを使用したデータフェッチング
  const { data, error, mutate } = useSWR<Story>(
    storyId ? `/api/stories/${storyId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  );
  
  // ローカル状態の管理
  const [localData, setLocalData] = useState<Story | null>(null);
  
  // データの同期
  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);
  
  return {
    data: localData,
    loading: !data && !error,
    error,
    mutate
  };
}
```

### 2.3 パフォーマンス最適化

```typescript
// メモ化の適切な使用
import { memo, useMemo, useCallback } from 'react';

// コンポーネントのメモ化（propsが変わらない限り再レンダリングしない）
export const StoryCard = memo<StoryCardProps>(({ story, onClick }) => {
  return (
    <div onClick={() => onClick(story.id)}>
      <h3>{story.title}</h3>
      <p>{story.summary}</p>
    </div>
  );
});

// 高価な計算のメモ化
const ExpensiveComponent: FC<{ data: Data[] }> = ({ data }) => {
  const processedData = useMemo(() => {
    // 重い処理
    return data.map(item => processComplexCalculation(item));
  }, [data]); // dataが変わったときのみ再計算
  
  return <DataVisualization data={processedData} />;
};

// コールバックのメモ化
const SearchableList: FC<{ items: Item[] }> = ({ items }) => {
  const [query, setQuery] = useState('');
  
  // 関数の再生成を防ぐ
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    // 検索処理
  }, []); // 依存配列が空 = 関数は一度だけ生成
  
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [items, query]);
  
  return (
    <>
      <SearchInput onSearch={handleSearch} />
      <ItemList items={filteredItems} />
    </>
  );
};
```

## 3. CSS/スタイリング

### 3.1 Tailwind CSS規約

```typescript
// クラス名の順序: レイアウト → スペーシング → サイズ → 見た目 → 状態
// ❌ 悪い例
<div className="text-white p-4 bg-blue-500 flex hover:bg-blue-600 gap-2">

// ✅ 良い例  
<div className="flex gap-2 p-4 bg-blue-500 text-white hover:bg-blue-600">

// cn()ユーティリティを使用した条件付きクラス
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const Button: FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'md',
  disabled,
  className,
  children
}) => {
  return (
    <button
      className={cn(
        // ベーススタイル
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        // バリアント
        {
          'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        },
        // サイズ
        {
          'px-3 py-1 text-sm': size === 'sm',
          'px-4 py-2': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        // 状態
        {
          'opacity-50 cursor-not-allowed': disabled,
        },
        // カスタムクラス
        className
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### 3.2 CSS Modules（使用する場合）

```scss
// components/StoryCard/StoryCard.module.scss
.card {
  @apply rounded-lg shadow-md p-4 transition-shadow;
  
  &:hover {
    @apply shadow-lg;
  }
  
  &.featured {
    @apply border-2 border-blue-500;
  }
}

.title {
  @apply text-xl font-bold mb-2;
}

.description {
  @apply text-gray-600 line-clamp-3;
}
```

## 4. API設計

### 4.1 RESTful APIルート

```typescript
// app/api/stories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// リクエストボディの検証スキーマ
const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10).max(5000),
  beats: z.number().int().min(1).max(20).optional(),
});

// GET /api/stories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const stories = await getStories({ page, limit });
    
    return NextResponse.json({
      data: stories,
      pagination: {
        page,
        limit,
        total: stories.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

// POST /api/stories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateStorySchema.parse(body);
    
    const story = await createStory(validated);
    
    return NextResponse.json(
      { data: story },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}
```

### 4.2 エラーハンドリング

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors
      },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// 使用例
export async function GET(request: NextRequest) {
  try {
    const data = await riskyOperation();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## 5. テスト

### 5.1 ユニットテスト

```typescript
// lib/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateStoryTitle } from './validation';

describe('validateStoryTitle', () => {
  it('should accept valid titles', () => {
    const validTitles = [
      'My Story',
      'A Tale of Two Cities',
      '物語のタイトル'
    ];
    
    validTitles.forEach(title => {
      expect(() => validateStoryTitle(title)).not.toThrow();
    });
  });
  
  it('should reject invalid titles', () => {
    const invalidTitles = [
      '',                    // 空文字
      'a'.repeat(201),      // 長すぎる
      '<script>alert()</script>' // HTMLタグ
    ];
    
    invalidTitles.forEach(title => {
      expect(() => validateStoryTitle(title)).toThrow();
    });
  });
});
```

### 5.2 コンポーネントテスト

```typescript
// components/StoryCard/StoryCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryCard } from './StoryCard';

const mockStory = {
  id: '1',
  title: 'Test Story',
  summary: 'This is a test story',
  author: 'Test Author'
};

describe('StoryCard', () => {
  it('should render story information', () => {
    render(<StoryCard story={mockStory} />);
    
    expect(screen.getByText('Test Story')).toBeInTheDocument();
    expect(screen.getByText('This is a test story')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<StoryCard story={mockStory} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('article'));
    
    expect(handleClick).toHaveBeenCalledWith(mockStory.id);
  });
});
```

## 6. Git規約

### 6.1 コミットメッセージ

```bash
# フォーマット: <type>: <description>

# タイプ
feat: 新機能
fix: バグ修正
docs: ドキュメントのみの変更
style: コードの意味に影響しない変更（空白、フォーマット等）
refactor: バグ修正や機能追加を含まないコード変更
perf: パフォーマンス改善
test: テストの追加や修正
chore: ビルドプロセスやツールの変更

# 例
feat: ストーリー編集機能を追加
fix: 動画生成のタイムアウトエラーを修正
docs: READMEにセットアップ手順を追加
refactor: API クライアントをクラスベースに変更
perf: 画像の遅延読み込みを実装
```

### 6.2 ブランチ戦略

```bash
# ブランチ命名規則
main              # 本番環境
develop           # 開発環境
feature/*         # 新機能
fix/*            # バグ修正
hotfix/*         # 緊急修正
release/*        # リリース準備

# 例
feature/story-editor
fix/video-generation-timeout
hotfix/critical-security-patch
release/v1.2.0
```

## 7. ファイル構成

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証が必要なルート
│   ├── api/               # API Routes
│   └── layout.tsx         # ルートレイアウト
├── components/            # Reactコンポーネント
│   ├── ui/               # 基本的なUIコンポーネント
│   ├── features/         # 機能別コンポーネント
│   └── layouts/          # レイアウトコンポーネント
├── hooks/                # カスタムフック
├── lib/                  # ユーティリティ関数
│   ├── api/             # APIクライアント
│   ├── auth/            # 認証関連
│   └── utils/           # 汎用ユーティリティ
├── types/               # TypeScript型定義
├── styles/              # グローバルスタイル
└── config/              # 設定ファイル
```

## 8. セキュリティ規約

### 8.1 秘密情報の取り扱い

```typescript
// ❌ 悪い例
const API_KEY = 'sk-1234567890abcdef';
const DATABASE_URL = 'postgresql://user:pass@host/db';

// ✅ 良い例
const API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// 環境変数の検証
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}
```

### 8.2 入力検証

```typescript
// 常に入力を検証
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(50)
});

function processUserInput(input: unknown) {
  // 検証
  const validated = UserInputSchema.parse(input);
  
  // SQLインジェクション対策（Supabaseが自動的に処理）
  const { data, error } = await supabase
    .from('users')
    .insert(validated);
    
  return { data, error };
}
```

## チェックリスト

### コードレビュー前
- [ ] TypeScriptの型エラーがない
- [ ] ESLintの警告がない
- [ ] テストが全て通る
- [ ] 不要なconsole.logを削除
- [ ] コメントが適切

### プルリクエスト作成時
- [ ] 変更内容が明確
- [ ] テストを追加/更新
- [ ] ドキュメントを更新
- [ ] パフォーマンスへの影響を考慮
- [ ] セキュリティへの影響を考慮

## まとめ

これらの規約は、チーム全体でコードの品質を保ち、効率的な開発を行うためのガイドラインです。規約は固定的なものではなく、プロジェクトの成長とともに改善していくものです。

関連ドキュメント：
- [開発環境セットアップ](./development-setup.md)
- [テスト戦略](./testing-strategy.md)
- [セキュリティガイド](./security-guide.md)