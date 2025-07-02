# 管理サイト実装プラン

## 概要
ShowGeki2の管理者向けサイトを実装し、利用統計の確認と動画管理機能を提供します。

## 主要機能

### 1. アクセス制御
- 特定の管理者ユーザーのみアクセス可能
- Supabase Authの認証に加えて、管理者権限チェック

### 2. 利用統計ダッシュボード
- 総ユーザー数、アクティブユーザー数
- 生成されたストーリー数、動画数
- 日別/週別/月別の利用トレンド
- ストレージ使用量

### 3. 動画管理機能
- 全ユーザーの生成動画一覧表示
- フィルタリング（日付、ユーザー、ステータス）
- 動画プレビュー機能
- 一括選択・削除機能

## 技術実装詳細

### データベース設計

#### 1. 管理者テーブル（admins）
```sql
CREATE TABLE public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- RLS設定
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admins" ON public.admins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );
```

#### 2. 統計ビュー（stats_view）
```sql
CREATE OR REPLACE VIEW public.stats_view AS
SELECT 
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN s.created_at > NOW() - INTERVAL '7 days' THEN p.id END) as active_users_7d,
  COUNT(DISTINCT s.id) as total_stories,
  COUNT(DISTINCT v.id) as total_videos,
  COUNT(DISTINCT CASE WHEN v.status = 'completed' THEN v.id END) as completed_videos,
  SUM(CASE WHEN v.status = 'completed' THEN v.file_size_mb ELSE 0 END) as total_storage_mb
FROM public.profiles p
LEFT JOIN public.stories s ON s.uid = p.id::TEXT
LEFT JOIN public.videos v ON v.story_id = s.id;
```

### APIエンドポイント

#### 1. 管理者認証ミドルウェア
```typescript
// /src/lib/admin-auth.ts
export async function withAdminAuth(handler) {
  return async (request, context) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return createAuthErrorResponse('Unauthorized');
    }
    
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();
      
    if (!admin) {
      return createAuthErrorResponse('Admin access required', 403);
    }
    
    return handler(request, { ...context, adminId: user.id });
  };
}
```

#### 2. 統計API
```typescript
// /src/app/api/admin/stats/route.ts
export const GET = withAdminAuth(async (request, context) => {
  const { data: stats } = await supabase
    .from('stats_view')
    .select('*')
    .single();
    
  const { data: dailyStats } = await supabase
    .from('stories')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });
    
  return NextResponse.json({
    overview: stats,
    daily: processDailyStats(dailyStats)
  });
});
```

#### 3. 動画管理API
```typescript
// /src/app/api/admin/videos/route.ts
export const GET = withAdminAuth(async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  let query = supabase
    .from('videos')
    .select(`
      *,
      story:stories(id, title, uid, created_at),
      profile:stories!inner(uid).profiles!inner(email, display_name)
    `)
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });
    
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  
  const { data: videos, count } = await query;
  
  return NextResponse.json({
    videos,
    total: count,
    page,
    limit
  });
});

// DELETE - 一括削除
export const DELETE = withAdminAuth(async (request) => {
  const { videoIds } = await request.json();
  
  // ストレージから削除
  for (const videoId of videoIds) {
    const { data: video } = await supabase
      .from('videos')
      .select('video_url')
      .eq('id', videoId)
      .single();
      
    if (video?.video_url) {
      const path = new URL(video.video_url).pathname.split('/').pop();
      await supabase.storage.from('videos').remove([path]);
    }
  }
  
  // データベースから削除
  await supabase
    .from('videos')
    .delete()
    .in('id', videoIds);
    
  return NextResponse.json({ success: true });
});
```

### フロントエンド実装

#### 1. 管理者レイアウト
```typescript
// /src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single();
    
  if (!admin) {
    redirect('/unauthorized');
  }
  
  return (
    <AdminProvider>
      <AdminNavigation />
      {children}
    </AdminProvider>
  );
}
```

#### 2. 統計ダッシュボード
```typescript
// /src/app/admin/page.tsx
export default function AdminDashboard() {
  const { data: stats } = useAdminStats();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="総ユーザー数" value={stats?.overview.total_users} />
      <StatCard title="アクティブユーザー（7日間）" value={stats?.overview.active_users_7d} />
      <StatCard title="総動画数" value={stats?.overview.total_videos} />
      <StatCard title="ストレージ使用量" value={`${stats?.overview.total_storage_mb} MB`} />
      
      <div className="col-span-full">
        <UsageChart data={stats?.daily} />
      </div>
    </div>
  );
}
```

#### 3. 動画管理ページ
```typescript
// /src/app/admin/videos/page.tsx
export default function AdminVideos() {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const { videos, isLoading, deleteVideos } = useAdminVideos();
  
  const handleBulkDelete = async () => {
    if (confirm(`${selectedVideos.length}件の動画を削除しますか？`)) {
      await deleteVideos(selectedVideos);
      setSelectedVideos([]);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between mb-6">
        <VideoFilters />
        <Button 
          onClick={handleBulkDelete} 
          disabled={selectedVideos.length === 0}
          variant="danger"
        >
          選択した動画を削除 ({selectedVideos.length})
        </Button>
      </div>
      
      <VideoTable 
        videos={videos}
        selectedVideos={selectedVideos}
        onSelectionChange={setSelectedVideos}
      />
    </div>
  );
}
```

## セキュリティ考慮事項

1. **多層防御**
   - Supabase Auth認証
   - 管理者テーブルでの権限確認
   - RLSによるデータベースレベルの保護

2. **監査ログ**
   - 管理者の操作履歴を記録
   - 削除操作の追跡

3. **レート制限**
   - 管理者APIにもレート制限を適用
   - 一括削除の件数制限

## 実装ステップ

### Phase 1: 基盤構築（1-2日）
1. 管理者テーブルとRLS設定
2. 管理者認証ミドルウェア実装
3. 基本的な管理者レイアウト

### Phase 2: 統計機能（2-3日）
1. 統計ビューの作成
2. 統計APIエンドポイント
3. ダッシュボードUI（グラフ含む）

### Phase 3: 動画管理機能（3-4日）
1. 動画一覧API（フィルタリング対応）
2. 一括削除API
3. 動画管理UI（選択、プレビュー、削除）

### Phase 4: 仕上げ（1-2日）
1. エラーハンドリング
2. ローディング状態
3. レスポンシブ対応
4. テスト作成

## 必要なパッケージ

```json
{
  "dependencies": {
    "recharts": "^2.10.0",  // グラフ表示
    "date-fns": "^3.0.0",   // 日付処理
    "@tanstack/react-table": "^8.11.0"  // テーブル管理
  }
}
```

## 環境変数

追加の環境変数は不要（既存のSupabase設定を使用）

## 初期管理者の登録

```sql
-- 初期管理者を手動で登録
INSERT INTO public.admins (id) 
VALUES ('YOUR_USER_ID_HERE');
```