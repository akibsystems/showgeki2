# データベース設計ドキュメント

## 概要

showgeki2はSupabase（PostgreSQL）を使用しており、ユーザー認証、ストーリー管理、動画生成、レビュー機能をサポートするデータベース設計となっています。

## ER図

```
┌──────────────┐        ┌──────────────┐
│  workspaces  │        │    users     │
│──────────────│        │──────────────│
│ id (PK)      │        │ id (PK)      │
│ uid (FK) ────┼────────┤ email        │
│ name         │        │ created_at   │
│ created_at   │        └──────────────┘
└──────────────┘                │
       │                        │
       │                        │
       ▼                        ▼
┌──────────────┐        ┌──────────────┐
│   stories    │        │   videos     │
│──────────────│        │──────────────│
│ id (PK)      │        │ id (PK)      │
│ workspace_id │◀───────┤ story_id (FK)│
│ uid (FK)     │        │ uid (FK)     │
│ title        │        │ status       │
│ text_raw     │        │ video_url    │
│ script_json  │        │ duration     │
│ status       │        │ resolution   │
│ beats        │        │ proc_time    │
│ created_at   │        │ created_at   │
│ updated_at   │        │ updated_at   │
└──────────────┘        └──────────────┘
       │                        
       │                        
       ▼                        
┌──────────────┐                
│   reviews    │                
│──────────────│                
│ id (PK)      │                
│ story_id (FK)│                
│ review_text  │                
│ rating       │                
│ created_at   │                
└──────────────┘                
```

## テーブル定義

### 1. workspaces テーブル

**用途**: ユーザーのワークスペース管理

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_workspace_name UNIQUE (uid, name)
);

-- インデックス
CREATE INDEX idx_workspaces_uid ON workspaces(uid);
```

### 2. stories テーブル

**用途**: ストーリーと脚本の管理

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uid UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(200) NOT NULL,
  text_raw TEXT NOT NULL,
  script_json JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  beats INTEGER DEFAULT 5 CHECK (beats >= 1 AND beats <= 20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 8桁ID（後方互換性）
  legacy_id VARCHAR(8) UNIQUE,
  
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'script_generated', 'video_processing', 'completed', 'failed')
  )
);

-- インデックス
CREATE INDEX idx_stories_workspace_id ON stories(workspace_id);
CREATE INDEX idx_stories_uid ON stories(uid);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_legacy_id ON stories(legacy_id);
```

### 3. videos テーブル

**用途**: 生成された動画の管理

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  uid UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  video_url TEXT,
  duration INTEGER, -- 秒単位
  resolution VARCHAR(20), -- "1920x1080"形式
  proc_time INTEGER, -- 処理時間（秒）
  error_msg TEXT,
  preview_data JSONB, -- プレビュー画像URL等
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_video_status CHECK (
    status IN ('queued', 'processing', 'completed', 'failed')
  )
);

-- インデックス
CREATE INDEX idx_videos_story_id ON videos(story_id);
CREATE INDEX idx_videos_uid ON videos(uid);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
```

### 4. reviews テーブル

**用途**: 動画のレビュー管理

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_reviews_story_id ON reviews(story_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

## Row Level Security (RLS)

### 1. workspaces テーブルのRLS

```sql
-- RLSを有効化
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のワークスペースのみアクセス可能
CREATE POLICY workspaces_user_access ON workspaces
  FOR ALL
  USING (uid = auth.uid());
```

### 2. stories テーブルのRLS

```sql
-- RLSを有効化
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のストーリーのみアクセス可能
CREATE POLICY stories_user_access ON stories
  FOR ALL
  USING (uid = auth.uid());

-- ポリシー: ワークスペース経由のアクセス
CREATE POLICY stories_workspace_access ON stories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = stories.workspace_id
      AND workspaces.uid = auth.uid()
    )
  );
```

### 3. videos テーブルのRLS

```sql
-- RLSを有効化
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分の動画のみアクセス可能
CREATE POLICY videos_user_access ON videos
  FOR ALL
  USING (uid = auth.uid());

-- ポリシー: ストーリー経由のアクセス
CREATE POLICY videos_story_access ON videos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = videos.story_id
      AND stories.uid = auth.uid()
    )
  );
```

## トリガーとファンクション

### 1. updated_at自動更新

```sql
-- 更新時刻自動更新ファンクション
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- stories テーブルのトリガー
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- videos テーブルのトリガー
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 2. ストーリー状態自動更新

```sql
-- 動画生成完了時にストーリー状態を更新
CREATE OR REPLACE FUNCTION update_story_status_on_video_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE stories
    SET status = 'completed'
    WHERE id = NEW.story_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_complete_update_story
  AFTER UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_story_status_on_video_complete();
```

## Supabase Webhook設定

### 動画生成Webhook

```sql
-- Webhook用のテーブル監視
-- Supabase ダッシュボードで設定
-- Table: videos
-- Events: INSERT
-- URL: https://showgeki2-auto-process-mqku5oexhq-an.a.run.app/webhook
```

## データ型とバリデーション

### 1. script_json構造

```typescript
interface ScriptJson {
  $mulmocast: { version: string };
  title: string;
  lang: string;
  beats: Array<{
    speaker: string;
    text: string;
    image?: {
      type: 'image';
      source: {
        kind: 'prompt' | 'file';
        prompt?: string;
        path?: string;
      };
    };
  }>;
  speechParams: {
    provider: 'openai';
    speakers: Record<string, {
      voiceId: string;
      displayName: {
        en: string;
        ja: string;
      };
    }>;
  };
  imageParams?: {
    aspectRatio?: string;
    quality?: 'high' | 'medium' | 'low';
  };
}
```

### 2. status列挙型

```typescript
// ストーリーステータス
type StoryStatus = 
  | 'draft'              // 下書き
  | 'script_generated'   // 脚本生成済み
  | 'video_processing'   // 動画処理中
  | 'completed'          // 完了
  | 'failed';           // 失敗

// 動画ステータス
type VideoStatus = 
  | 'queued'      // キュー待ち
  | 'processing'  // 処理中
  | 'completed'   // 完了
  | 'failed';     // 失敗
```

## パフォーマンス最適化

### 1. インデックス戦略

- 主要な外部キー（uid, workspace_id, story_id）
- ステータスフィールド（頻繁にフィルタリング）
- 作成日時（ソートに使用）
- レガシーID（後方互換性のための高速検索）

### 2. パーティショニング（将来的な実装）

```sql
-- 月単位でのパーティショニング例
CREATE TABLE stories_2025_01 PARTITION OF stories
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## バックアップとリカバリ

### 1. 定期バックアップ

- Supabaseの自動バックアップ（日次）
- ポイントインタイムリカバリ（7日間）

### 2. データエクスポート

```sql
-- ストーリーデータのエクスポート
COPY (
  SELECT s.*, v.video_url, v.duration
  FROM stories s
  LEFT JOIN videos v ON s.id = v.story_id
  WHERE s.created_at >= '2025-01-01'
) TO '/tmp/stories_export.csv' WITH CSV HEADER;
```

## 監視とメトリクス

### 1. 重要なクエリ

```sql
-- アクティブユーザー数
SELECT COUNT(DISTINCT uid) as active_users
FROM stories
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 動画生成成功率
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM videos
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 平均処理時間
SELECT AVG(proc_time) as avg_processing_time
FROM videos
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '7 days';
```

## 今後の拡張計画

1. **バージョン管理**
   - stories_versionsテーブルの追加
   - 編集履歴の保存

2. **コラボレーション**
   - story_collaboratorsテーブル
   - 権限管理システム

3. **分析機能**
   - viewsテーブル（視聴履歴）
   - analyticsテーブル（集計データ）

4. **キャッシング**
   - Redis統合
   - マテリアライズドビュー