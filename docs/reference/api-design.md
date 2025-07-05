# API設計ドキュメント

## 概要

showgeki2のAPIは、Next.js 14のApp Router APIルートを使用して実装されています。RESTfulな設計原則に従い、一貫性のあるレスポンス形式とエラーハンドリングを提供します。

## API設計原則

1. **RESTful設計**: リソース指向のURL構造
2. **一貫性**: 統一されたレスポンス形式
3. **型安全性**: TypeScriptによる完全な型定義
4. **認証**: すべてのAPIは認証が必要
5. **エラーハンドリング**: 詳細なエラー情報

## エンドポイント一覧

### 認証関連

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/user/me` | 現在のユーザー情報取得 |
| GET | `/api/health` | ヘルスチェック |

### ワークスペース

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/workspaces` | ワークスペース一覧取得 |
| GET | `/api/workspaces/[id]` | ワークスペース詳細取得 |
| POST | `/api/workspaces` | ワークスペース作成 |
| PUT | `/api/workspaces/[id]` | ワークスペース更新 |
| DELETE | `/api/workspaces/[id]` | ワークスペース削除 |

### ストーリー

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/stories` | ストーリー一覧取得 |
| GET | `/api/stories/[id]` | ストーリー詳細取得 |
| POST | `/api/stories` | ストーリー作成 |
| PUT | `/api/stories/[id]` | ストーリー更新 |
| DELETE | `/api/stories/[id]` | ストーリー削除 |
| POST | `/api/stories/[id]/generate-script` | 台本生成 |
| POST | `/api/stories/[id]/generate-video` | 動画生成 |
| POST | `/api/stories/[id]/generate-preview` | プレビュー生成 |

### 動画

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/videos` | 動画一覧取得 |
| GET | `/api/videos/[id]` | 動画詳細取得 |
| GET | `/api/videos/[id]/status` | 動画ステータス取得 |
| DELETE | `/api/videos/[id]` | 動画削除 |

### その他

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/api/stories/generate-scene-overview` | シーン構成分析 |

## レスポンス形式

### 成功レスポンス

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// 例: ストーリー取得
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "未来の物語",
    "text_raw": "ある日、私は...",
    "status": "script_generated",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### エラーレスポンス

```typescript
interface ErrorResponse {
  error: string;
  type: ErrorType;
  details?: any;
  timestamp: string;
}

// 例: バリデーションエラー
{
  "error": "Validation failed",
  "type": "VALIDATION",
  "details": {
    "title": "タイトルは必須です",
    "beats": "シーン数は1〜20の間で指定してください"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### エラータイプ

```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION',           // 400: 入力検証エラー
  AUTHENTICATION = 'AUTHENTICATION',   // 401: 認証エラー
  AUTHORIZATION = 'AUTHORIZATION',     // 403: 権限エラー
  NOT_FOUND = 'NOT_FOUND',            // 404: リソース未発見
  RATE_LIMIT = 'RATE_LIMIT',          // 429: レート制限
  INTERNAL = 'INTERNAL',              // 500: サーバーエラー
  EXTERNAL_API = 'EXTERNAL_API',      // 502: 外部APIエラー
  NETWORK = 'NETWORK'                 // ネットワークエラー
}
```

## 認証

### 認証ヘッダー

```typescript
// Bearerトークン（推奨）
headers: {
  'Authorization': 'Bearer <access_token>'
}

// UID（後方互換性）
headers: {
  'x-uid': '<user_uid>'
}
```

### 認証ミドルウェア

```typescript
// lib/auth.ts
export function withAuth<T>(
  handler: (req: NextRequest, auth: AuthContext, context: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: T) => {
    // トークン検証
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', type: ErrorType.AUTHENTICATION },
        { status: 401 }
      );
    }
    
    return handler(req, { uid: user.id, email: user.email }, context);
  };
}
```

## API実装例

### 1. 基本的なCRUD API

```typescript
// app/api/stories/[id]/route.ts
import { withAuth } from '@/lib/auth';
import { validateSchema, StorySchema } from '@/lib/schemas';

// GET: ストーリー取得
export const GET = withAuth(async (
  request: NextRequest,
  auth: AuthContext,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  
  // データ取得
  const { data: story, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .eq('uid', auth.uid)
    .single();
    
  if (error || !story) {
    return NextResponse.json(
      { error: 'Story not found', type: ErrorType.NOT_FOUND },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: story,
    timestamp: new Date().toISOString()
  });
});

// PUT: ストーリー更新
export const PUT = withAuth(async (
  request: NextRequest,
  auth: AuthContext,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const body = await request.json();
  
  // バリデーション
  const validation = validateSchema(StoryUpdateSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        type: ErrorType.VALIDATION,
        details: validation.errors
      },
      { status: 400 }
    );
  }
  
  // 更新
  const { data, error } = await supabase
    .from('stories')
    .update(validation.data)
    .eq('id', id)
    .eq('uid', auth.uid)
    .select()
    .single();
    
  if (error) {
    return NextResponse.json(
      { error: 'Update failed', type: ErrorType.INTERNAL },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data,
    message: 'Story updated successfully',
    timestamp: new Date().toISOString()
  });
});
```

### 2. 非同期処理API

```typescript
// app/api/stories/[id]/generate-video/route.ts
export const POST = withAuth(async (
  request: NextRequest,
  auth: AuthContext,
  context: { params: Promise<{ id: string }> }
) => {
  const { id: storyId } = await context.params;
  
  // ストーリー確認
  const story = await getStoryWithAuth(storyId, auth.uid);
  if (!story) {
    return NextResponse.json(
      { error: 'Story not found', type: ErrorType.NOT_FOUND },
      { status: 404 }
    );
  }
  
  // 既存の動画確認
  const existingVideo = await getExistingVideo(storyId, auth.uid);
  if (existingVideo?.status === 'processing') {
    return NextResponse.json({
      success: true,
      data: { video_id: existingVideo.id, status: 'processing' },
      message: 'Video generation already in progress'
    });
  }
  
  // 新規動画レコード作成
  const video = await createVideoRecord(storyId, auth.uid);
  
  // 非同期処理開始（webhook経由）
  await triggerVideoGeneration(video.id, story);
  
  return NextResponse.json({
    success: true,
    data: { video_id: video.id, status: 'queued' },
    message: 'Video generation started',
    timestamp: new Date().toISOString()
  });
});
```

## パラメータ処理

### 1. クエリパラメータ

```typescript
// URLSearchParams を使用
const url = new URL(request.url);
const workspace_id = url.searchParams.get('workspace_id');
const status = url.searchParams.get('status');
const limit = parseInt(url.searchParams.get('limit') || '20');
const offset = parseInt(url.searchParams.get('offset') || '0');

// バリデーション
if (limit < 1 || limit > 100) {
  return NextResponse.json(
    { error: 'Invalid limit parameter', type: ErrorType.VALIDATION },
    { status: 400 }
  );
}
```

### 2. ボディパラメータ

```typescript
// JSONボディの取得
const body = await request.json();

// Zodスキーマでバリデーション
const schema = z.object({
  title: z.string().min(1).max(100),
  text_raw: z.string().min(1).max(5000),
  beats: z.number().int().min(1).max(20).optional()
});

const validation = schema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      type: ErrorType.VALIDATION,
      details: validation.error.flatten()
    },
    { status: 400 }
  );
}
```

## レート制限

### 1. API単位のレート制限

```typescript
// lib/rate-limit.ts
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60000 // 1分
): boolean {
  const now = Date.now();
  const record = rateLimiter.get(identifier);
  
  if (!record || record.resetAt < now) {
    rateLimiter.set(identifier, { count: 1, resetAt: now + window });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// 使用例
if (!checkRateLimit(`api:${auth.uid}:generate-script`, 10, 300000)) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', type: ErrorType.RATE_LIMIT },
    { status: 429 }
  );
}
```

## キャッシング

### 1. レスポンスキャッシュ

```typescript
// キャッシュヘッダーの設定
return NextResponse.json(
  { success: true, data },
  {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    }
  }
);
```

### 2. データキャッシュ

```typescript
// Redisキャッシュ（将来実装）
const cached = await redis.get(`story:${storyId}`);
if (cached) {
  return NextResponse.json({
    success: true,
    data: JSON.parse(cached),
    cached: true
  });
}
```

## セキュリティ

### 1. 入力サニタイゼーション

```typescript
// XSS対策
import DOMPurify from 'isomorphic-dompurify';

const sanitizedText = DOMPurify.sanitize(input, {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
});
```

### 2. SQLインジェクション対策

```typescript
// Supabaseクライアントは自動的にエスケープ
const { data } = await supabase
  .from('stories')
  .select('*')
  .eq('title', userInput) // 自動的にエスケープされる
```

### 3. CORS設定

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
```

## ログとモニタリング

### 1. APIログ

```typescript
// 構造化ログ
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  api: '/api/stories/[id]/generate-script',
  userId: auth.uid,
  storyId: id,
  action: 'script_generation_started',
  metadata: { beats: options.beats }
}));
```

### 2. エラーログ

```typescript
// エラーログ
console.error(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'error',
  api: request.url,
  userId: auth.uid,
  error: {
    message: error.message,
    stack: error.stack,
    type: error.type
  }
}));
```

## まとめ

showgeki2のAPI設計は、以下の原則に基づいています：

1. **一貫性**: 統一されたレスポンス形式とエラーハンドリング
2. **型安全性**: TypeScriptによる完全な型定義
3. **セキュリティ**: 認証、入力検証、レート制限
4. **パフォーマンス**: キャッシング、最適化されたクエリ
5. **開発効率**: 再利用可能なミドルウェアとユーティリティ