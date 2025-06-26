# mulmocast GUI PoC 詳細要件定義・実装仕様書

## 1. システム概要

### 1.1 アーキテクチャ概要
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes     │    │   Supabase      │
│   (Next.js)     │───▶│   (Vercel)       │───▶│   (DB+Storage)  │
│                 │    │                  │    │                 │
│ • Dashboard     │    │ • REST API       │    │ • PostgreSQL    │
│ • Story Editor  │    │ • Zod Validation │    │ • File Storage  │
│ • Video Player  │    │ • Auth Middleware│    │ • Real-time     │
│ • Monaco Editor │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Cloud Run     │
                       │   (Jobs)        │
                       │                 │
                       │ • mulmocast CLI │
                       │ • FFmpeg        │
                       │ • Job Queue     │
                       └─────────────────┘
```

### 1.2 技術スタック
- **フロントエンド**: Next.js 15.3.4 (App Router) + TypeScript + Tailwind CSS
- **バックエンド**: Vercel API Routes (Node.js)
- **データベース**: Supabase PostgreSQL
- **ストレージ**: Supabase Storage
- **エディタ**: Monaco Editor
- **バリデーション**: Zod
- **動画処理**: Cloud Run Jobs + mulmocast CLI
- **認証**: localStorage ベース匿名認証

---

## 2. データモデル詳細設計

### 2.1 テーブル設計（新規作成）

#### 2.1.1 workspaces テーブル
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Default Workspace',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workspaces_uid ON workspaces(uid);
```

#### 2.1.2 stories テーブル（新規作成）
```sql
CREATE TABLE stories (
  id VARCHAR(8) PRIMARY KEY DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uid VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  text_raw TEXT NOT NULL,
  script_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス・制約
CREATE INDEX idx_stories_uid ON stories(uid);
CREATE INDEX idx_stories_workspace_id ON stories(workspace_id);
CREATE INDEX idx_stories_status ON stories(status);
ALTER TABLE stories ADD CONSTRAINT chk_stories_status 
CHECK (status IN ('draft', 'script_generated', 'processing', 'completed', 'error'));
```

#### 2.1.3 videos テーブル
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id VARCHAR(8) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  uid VARCHAR(36) NOT NULL,
  url TEXT,
  duration_sec INTEGER CHECK (duration_sec > 0),
  resolution VARCHAR(20),
  size_mb DECIMAL(10,2) CHECK (size_mb > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  error_msg TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス・制約
CREATE INDEX idx_videos_story_id ON videos(story_id);
CREATE INDEX idx_videos_uid ON videos(uid);
CREATE INDEX idx_videos_status ON videos(status);
ALTER TABLE videos ADD CONSTRAINT chk_videos_status 
CHECK (status IN ('queued', 'processing', 'completed', 'failed'));
```

#### 2.1.4 reviews テーブル（既存互換）
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id VARCHAR(8) NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_story_id ON reviews(story_id);
```

#### 2.1.5 データ関係図
```
workspaces (1)───(n) stories (1)───(n) videos
    ▲ uid FK           │ story_id FK        │
    │                  └─────(n) reviews   │
    │                          story_id FK │
    └── uid による論理分離 ──────────────────┘
```

### 2.2 型定義 (TypeScript + Zod)

#### 2.2.1 コアスキーマ定義
```typescript
// src/lib/schemas.ts
import { z } from 'zod';

// ユーザー識別
export const UidSchema = z.string().uuid();

// ワークスペーススキーマ
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  uid: UidSchema,
  name: z.string().min(1).max(255),
  created_at: z.string().datetime(),
});

// ストーリースキーマ
export const StorySchema = z.object({
  id: z.string().length(8),
  workspace_id: z.string().uuid(),
  uid: UidSchema,
  title: z.string().min(1).max(255),
  text_raw: z.string().min(1),
  script_json: z.record(z.any()).optional(),
  status: z.enum(['draft', 'script_generated', 'processing', 'completed', 'error']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// 動画スキーマ
export const VideoSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().length(8),
  uid: UidSchema,
  url: z.string().url().optional(),
  duration_sec: z.number().int().positive().optional(),
  resolution: z.string().optional(),
  size_mb: z.number().positive().optional(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  error_msg: z.string().optional(),
  created_at: z.string().datetime(),
});

// mulmoscript スキーマ（例）
export const MulmoscriptSchema = z.object({
  version: z.string(),
  title: z.string(),
  scenes: z.array(z.object({
    id: z.string(),
    type: z.enum(['dialogue', 'narration', 'action']),
    content: z.string(),
    duration: z.number().positive(),
    voice: z.object({
      character: z.string(),
      emotion: z.string(),
    }).optional(),
  })),
  metadata: z.object({
    duration_total: z.number().positive(),
    resolution: z.string(),
    fps: z.number().int().positive(),
  }),
});
```

---

## 3. API仕様詳細

### 3.1 認証ミドルウェア
```typescript
// src/lib/auth.ts
import { NextRequest } from 'next/server';
import { UidSchema } from './schemas';

export function extractUid(request: NextRequest): string {
  const uid = request.headers.get('x-uid') || request.nextUrl.searchParams.get('uid');
  
  if (!uid) {
    throw new Error('UID is required');
  }
  
  const parsed = UidSchema.safeParse(uid);
  if (!parsed.success) {
    throw new Error('Invalid UID format');
  }
  
  return parsed.data;
}
```

### 3.2 API Routes 詳細仕様

#### 3.2.1 ワークスペース管理
```
GET /api/workspaces
- Headers: x-uid
- Response: Workspace[]
- 機能: UID に紐づくワークスペース一覧取得

POST /api/workspaces
- Headers: x-uid
- Body: { name: string }
- Response: Workspace
- 機能: 新規ワークスペース作成

GET /api/workspaces/[id]
- Headers: x-uid
- Response: Workspace & { stories: Story[] }
- 機能: ワークスペース詳細とストーリー一覧取得
```

#### 3.2.2 ストーリー管理
```
GET /api/stories
- Headers: x-uid
- Query: workspace_id?, status?, limit?, offset?
- Response: { stories: Story[], total: number }
- 機能: ストーリー一覧取得（フィルタ・ページネーション対応）

POST /api/stories
- Headers: x-uid
- Body: { workspace_id: string, title: string, text_raw: string }
- Response: Story
- 機能: 新規ストーリー作成

PUT /api/stories/[id]
- Headers: x-uid
- Body: { title?: string, text_raw?: string, script_json?: object }
- Response: Story
- 機能: ストーリー更新

DELETE /api/stories/[id]
- Headers: x-uid
- Response: { success: boolean }
- 機能: ストーリー削除
```

#### 3.2.3 スクリプト生成
```
POST /api/stories/[id]/generate-script
- Headers: x-uid
- Response: { script_json: object, status: string }
- 機能: LLM でスクリプト生成、JSON バリデーション後保存
```

#### 3.2.4 動画生成
```
POST /api/stories/[id]/generate-video
- Headers: x-uid
- Response: { video_id: string, status: string }
- 機能: Cloud Run Job トリガー、動画生成開始

GET /api/videos/[id]/status
- Headers: x-uid
- Response: { status: string, progress?: number, url?: string }
- 機能: 動画生成進捗確認
```

---

## 4. フロントエンド機能詳細

### 4.1 UID 管理
```typescript
// src/lib/uid.ts
const UID_KEY = 'showgeki_uid';

export function getOrCreateUid(): string {
  if (typeof window === 'undefined') return '';
  
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    // UUIDv4 生成
    uid = crypto.randomUUID();
    localStorage.setItem(UID_KEY, uid);
  }
  
  return uid;
}

export function clearUid(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(UID_KEY);
  }
}
```

### 4.2 API クライアント
```typescript
// src/lib/api-client.ts
import { getOrCreateUid } from './uid';

class ApiClient {
  private baseUrl = '';
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const uid = getOrCreateUid();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-uid': uid,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // ワークスペース
  async getWorkspaces() {
    return this.request<Workspace[]>('/api/workspaces');
  }
  
  async createWorkspace(name: string) {
    return this.request<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
  
  // ストーリー
  async getStories(workspaceId: string) {
    return this.request<{ stories: Story[] }>(`/api/stories?workspace_id=${workspaceId}`);
  }
  
  async createStory(workspaceId: string, title: string, textRaw: string) {
    return this.request<Story>('/api/stories', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, title, text_raw: textRaw }),
    });
  }
  
  async generateScript(storyId: string) {
    return this.request<{ script_json: object }>(`/api/stories/${storyId}/generate-script`, {
      method: 'POST',
    });
  }
  
  async generateVideo(storyId: string) {
    return this.request<{ video_id: string }>(`/api/stories/${storyId}/generate-video`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
```

### 4.3 ページコンポーネント設計

#### 4.3.1 Dashboard (/dashboard)
```typescript
// src/app/dashboard/page.tsx
- 機能:
  * ワークスペース選択
  * ストーリーカード一覧表示
  * 新規ストーリー作成ボタン
  * フィルタ・検索機能
- 状態管理:
  * 選択中ワークスペース
  * ストーリー一覧
  * ローディング状態
```

#### 4.3.2 Story Editor (/stories/[id])
```typescript
// src/app/stories/[id]/page.tsx
- レイアウト: 左右分割
- 左側: ストーリーテキスト入力・編集
- 右側: Monaco Editor (mulmoscript JSON)
- 下部: アクションバー
  * スクリプト生成ボタン
  * 保存ボタン
  * 実行ボタン
  * プレビューボタン
- 機能:
  * リアルタイム保存
  * JSON バリデーション
  * 構文ハイライト
  * エラー表示
```

#### 4.3.3 Video Manager (/videos)
```typescript
// src/app/videos/page.tsx
- 機能:
  * 動画一覧表示（グリッド/リスト切替）
  * フィルタ機能（状態別、日付別）
  * 動画プレーヤー（モーダル表示）
  * メタデータ表示
  * 削除機能
- 状態管理:
  * 動画一覧
  * 再生中動画
  * フィルタ条件
```

---

## 5. 状態管理設計

### 5.1 Context API 設計
```typescript
// src/contexts/app-context.tsx
interface AppContextType {
  uid: string;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>();

export function AppProvider({ children }: { children: ReactNode }) {
  // 実装...
}
```

### 5.2 データフェッチング戦略
- **SWR** を使用してサーバー状態管理
- **楽観的更新** でUX向上
- **エラーハンドリング** とリトライ機構
- **リアルタイム更新** (Supabase Real-time 活用)

---

## 6. エラーハンドリング設計

### 6.1 エラー分類
```typescript
// src/lib/errors.ts
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_API = 'EXTERNAL_API',
  INTERNAL = 'INTERNAL',
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 6.2 エラーバウンダリ
```typescript
// src/components/error-boundary.tsx
export function ErrorBoundary({ children }: { children: ReactNode }) {
  // React Error Boundary 実装
  // ユーザーフレンドリーなエラー表示
  // エラー報告機能
}
```

---

## 7. パフォーマンス最適化

### 7.1 フロントエンド最適化
- **コード分割**: 動的インポートでバンドルサイズ削減
- **画像最適化**: Next.js Image コンポーネント活用
- **キャッシュ戦略**: SWR + localStorage でオフライン対応
- **仮想化**: 大量データ表示での react-window 活用

### 7.2 API 最適化
- **データベースクエリ最適化**: 適切なインデックス設計
- **ページネーション**: 大量データの効率的な取得
- **キャッシュ**: Edge 関数レベルでのキャッシュ活用
- **バリデーション最適化**: Zod の効率的な利用

---

## 8. セキュリティ要件

### 8.1 入力検証
- **すべてのAPI入力をZodで検証**
- **SQLインジェクション対策**: Supabase ORM活用
- **XSS対策**: React の自動エスケープ + DOMPurify
- **CSRF対策**: SameSite Cookie設定

### 8.2 データ保護
- **UID基盤の論理分離**: 全クエリでUID条件必須
- **Supabase Service Role Key**: サーバーサイドのみで利用
- **センシティブデータのログ出力禁止**
- **HTTPS強制**: 本番環境での必須設定

---

## 9. テスト戦略

### 9.1 単体テスト
- **Vitest** でのコンポーネントテスト
- **Zod スキーマ** のバリデーションテスト
- **API関数** のモックテスト

### 9.2 統合テスト
- **Playwright** でのE2Eテスト
- **重要ユーザーフロー**のテスト自動化:
  * 新規ユーザー登録〜ストーリー作成
  * スクリプト生成〜動画生成
  * 動画視聴〜削除

### 9.3 性能テスト
- **Lighthouse** での性能監視
- **Core Web Vitals** の継続的測定
- **負荷テスト**: 動画生成ジョブの並列処理テスト

---

## 10. 運用・監視

### 10.1 ログ設計
```typescript
// src/lib/logger.ts
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  uid?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export function log(level: LogLevel, message: string, metadata?: Record<string, any>) {
  // 構造化ログ出力
  // 本番環境では外部ログサービスに送信
}
```

### 10.2 監視項目
- **API応答時間**: 各エンドポイントのレスポンス時間
- **エラー率**: 4xx/5xx エラーの発生頻度
- **動画生成成功率**: Cloud Run Jobs の完了率
- **ユーザー行動**: 主要機能の利用状況

---

この詳細要件定義に基づいて、次のステップでファイル単位の実装チェックリストを作成します。