# フロントエンドアーキテクチャ ドキュメント

## 概要

showgeki2のフロントエンドは、Next.js 14のApp Routerを使用した、TypeScriptベースのReactアプリケーションです。モダンなコンポーネント設計とパフォーマンス最適化を実現しています。

## 技術スタック

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules + Tailwind CSS
- **State Management**: React Context API + SWR
- **Form Handling**: React Hook Form
- **Authentication**: Supabase Auth
- **Data Fetching**: SWR + Supabase Client

## ディレクトリ構造

```
src/
├── app/                    # App Router pages
│   ├── (auth)/            # 認証関連ページ
│   ├── api/               # API Routes
│   ├── dashboard/         # ダッシュボード
│   ├── stories/           # ストーリー関連
│   ├── videos/            # 動画関連
│   └── layout.tsx         # ルートレイアウト
├── components/            # 再利用可能コンポーネント
│   ├── auth/              # 認証関連
│   ├── editor/            # エディタ関連
│   ├── layout/            # レイアウト関連
│   ├── ui/                # 基本UIコンポーネント
│   └── video/             # 動画関連
├── contexts/              # React Context
├── hooks/                 # カスタムフック
├── lib/                   # ユーティリティ関数
└── types/                 # TypeScript型定義
```

## コンポーネント設計

### 1. Atomic Design風の階層構造

```
基本UI (atoms)
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    └── Spinner.tsx

複合コンポーネント (molecules)
└── components/
    ├── StoryCard.tsx
    ├── VideoPreview.tsx
    └── SpeakerModal.tsx

ページセクション (organisms)
└── components/
    ├── ScriptDirector/
    ├── ScriptEditor/
    └── DashboardStats/

レイアウト (templates)
└── layout/
    ├── Layout.tsx
    ├── Header.tsx
    └── Footer.tsx

ページ (pages)
└── app/
    ├── page.tsx
    ├── dashboard/page.tsx
    └── stories/[id]/page.tsx
```

### 2. コンポーネント実装パターン

**基本的なコンポーネント構造**:
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2';
  
  const variantClasses = {
    primary: 'bg-purple-500 text-white hover:bg-purple-600',
    secondary: 'bg-gray-700 text-gray-100 hover:bg-gray-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-800',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};
```

## 状態管理

### 1. グローバル状態（Context API）

**AppContext**:
```typescript
// contexts/AppContext.tsx
interface AppContextType {
  user: User | null;
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace) => void;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
}

export const AppProvider: React.FC = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // ... 実装
};
```

### 2. サーバー状態（SWR）

**データフェッチング戦略**:
```typescript
// hooks/useStory.ts
export const useStory = (storyId: string) => {
  const key = storyId ? swrKeys.story(storyId) : null;
  
  const { data, error, mutate } = useSWR(
    key,
    () => apiClient.getStory(storyId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
    }
  );
  
  const updateStory = async (updates: Partial<Story>) => {
    // 楽観的更新
    await mutate(
      async () => {
        const updated = await apiClient.updateStory(storyId, updates);
        return updated;
      },
      {
        optimisticData: data ? { ...data, ...updates } : undefined,
        rollbackOnError: true,
      }
    );
  };
  
  return {
    story: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
    updateStory,
  };
};
```

### 3. SWRキー管理

```typescript
// lib/swr-config.ts
export const swrKeys = {
  workspaces: () => '/api/workspaces',
  workspace: (id: string) => `/api/workspaces/${id}`,
  stories: (workspaceId?: string) => 
    workspaceId ? `/api/stories?workspace_id=${workspaceId}` : '/api/stories',
  story: (id: string) => `/api/stories/${id}`,
  videos: (storyId?: string) => 
    storyId ? `/api/videos?story_id=${storyId}` : '/api/videos',
  video: (id: string) => `/api/videos/${id}`,
};
```

## ルーティング

### 1. App Router構造

```
app/
├── (auth)/
│   ├── login/page.tsx         # /login
│   └── signup/page.tsx        # /signup
├── (protected)/
│   ├── dashboard/page.tsx     # /dashboard
│   ├── stories/
│   │   ├── page.tsx          # /stories
│   │   ├── [id]/
│   │   │   ├── page.tsx      # /stories/[id]
│   │   │   ├── scenes/page.tsx # /stories/[id]/scenes
│   │   │   └── overview/page.tsx # /stories/[id]/overview
│   │   └── new/page.tsx      # /stories/new
│   └── videos/page.tsx       # /videos
└── api/                      # API Routes
```

### 2. 動的ルーティング

```typescript
// app/stories/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StoryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  
  // Server Component でデータ取得
  const story = await getStory(id);
  
  return <StoryEditor story={story} initialTab={tab} />;
}
```

## パフォーマンス最適化

### 1. コード分割

```typescript
// 動的インポート
const ScriptEditor = dynamic(
  () => import('@/components/editor/ScriptEditor'),
  {
    loading: () => <Spinner />,
    ssr: false, // クライアントサイドのみ
  }
);
```

### 2. 画像最適化

```typescript
// Next.js Image コンポーネント使用
import Image from 'next/image';

<Image
  src={previewUrl}
  alt="Preview"
  width={1920}
  height={1080}
  quality={75}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  priority={isAboveFold}
/>
```

### 3. データプリフェッチ

```typescript
// SWRでのプリフェッチ
const prefetchStory = (storyId: string) => {
  mutate(
    swrKeys.story(storyId),
    apiClient.getStory(storyId),
    false // revalidateしない
  );
};

// リンクホバー時にプリフェッチ
<Link
  href={`/stories/${story.id}`}
  onMouseEnter={() => prefetchStory(story.id)}
>
  {story.title}
</Link>
```

## レスポンシブデザイン

### 1. ブレークポイント戦略

```css
/* Tailwind CSS設定 */
screens: {
  'sm': '640px',   // タブレット縦
  'md': '768px',   // タブレット横
  'lg': '1024px',  // デスクトップ
  'xl': '1280px',  // 大画面
  '2xl': '1536px', // 超大画面
}
```

### 2. モバイルファースト実装

```typescript
// レスポンシブコンポーネント例
<div className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2 sm:gap-6
  lg:grid-cols-3
  xl:grid-cols-4
">
  {stories.map(story => (
    <StoryCard key={story.id} story={story} />
  ))}
</div>
```

### 3. タッチデバイス対応

```typescript
// タッチイベント処理
const handleTouchStart = useCallback((e: TouchEvent) => {
  const touch = e.touches[0];
  setStartX(touch.clientX);
}, []);

const handleTouchEnd = useCallback((e: TouchEvent) => {
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - startX;
  
  if (Math.abs(deltaX) > 50) {
    // スワイプ処理
    if (deltaX > 0) {
      previousSlide();
    } else {
      nextSlide();
    }
  }
}, [startX]);
```

## エラーハンドリング

### 1. Error Boundary

```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログサービスに送信
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### 2. API エラーハンドリング

```typescript
// hooks/useApiError.ts
export const useApiError = () => {
  const { error: showError } = useToast();
  
  const handleApiError = useCallback((error: ApiError) => {
    switch (error.type) {
      case ErrorType.VALIDATION:
        showError('入力内容を確認してください');
        break;
      case ErrorType.AUTHENTICATION:
        showError('ログインが必要です');
        router.push('/login');
        break;
      case ErrorType.RATE_LIMIT:
        showError('しばらく時間をおいてから再度お試しください');
        break;
      default:
        showError('エラーが発生しました');
    }
  }, [showError]);
  
  return { handleApiError };
};
```

## アクセシビリティ

### 1. ARIA属性

```typescript
<nav aria-label="メインナビゲーション">
  <ul role="list">
    <li>
      <Link href="/dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined}>
        ダッシュボード
      </Link>
    </li>
  </ul>
</nav>
```

### 2. キーボードナビゲーション

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Escape':
      closeModal();
      break;
    case 'Tab':
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
      break;
  }
};
```

## 開発ツール

### 1. ESLint設定

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 2. Prettier設定

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## まとめ

showgeki2のフロントエンドアーキテクチャは、以下の原則に基づいて設計されています：

1. **型安全性**: TypeScriptによる完全な型定義
2. **パフォーマンス**: コード分割、画像最適化、データプリフェッチ
3. **保守性**: 明確なディレクトリ構造とコンポーネント設計
4. **アクセシビリティ**: ARIA属性とキーボード操作のサポート
5. **開発効率**: ESLint/Prettierによるコード品質の維持