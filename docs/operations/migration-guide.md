# マイグレーションガイド

## 概要

showgeki2のデータベーススキーマ移行ガイドです。レガシーシステム（8桁ID形式）から新しいUUID形式への移行手順と、データベーススキーマの更新方法について説明します。

## 移行の背景

### レガシーシステムの課題

1. **8桁IDの制限**: 最大99,999,999件までしか対応できない
2. **衝突の可能性**: ランダム生成による重複リスク
3. **パフォーマンス**: 文字列型IDによるインデックス効率の低下
4. **拡張性**: グローバル展開時のID管理の複雑さ

### 新システムの利点

1. **UUID採用**: 実質的に無限のID空間
2. **標準準拠**: PostgreSQL/Supabaseのベストプラクティス
3. **パフォーマンス**: 効率的なインデックス処理
4. **互換性**: レガシーIDも保持（後方互換性）

## スキーマ移行

### 1. 移行前の準備

```sql
-- バックアップの作成
pg_dump -h your-db-host -U postgres -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql

-- 移行状態の確認
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('id', 'legacy_id', 'uid');
```

### 2. 段階的移行計画

#### Phase 1: 新規テーブル作成（UUID対応）

```sql
-- migrations/000_initial_schema_recreation.sql
-- 新しいスキーマで全テーブルを再作成

-- workspaces テーブル
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workspace_name UNIQUE (uid, name)
);

-- stories テーブル
CREATE TABLE IF NOT EXISTS stories (
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
  legacy_id VARCHAR(8) UNIQUE -- 8桁ID互換性
);

-- videos テーブル
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  uid UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  video_url TEXT,
  duration INTEGER,
  resolution VARCHAR(20),
  proc_time INTEGER,
  error_msg TEXT,
  preview_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Phase 2: データ移行

```sql
-- レガシーデータの移行スクリプト
-- old_stories から新しい stories テーブルへ

-- 一時的な移行関数
CREATE OR REPLACE FUNCTION migrate_legacy_stories()
RETURNS void AS $$
DECLARE
  legacy_row RECORD;
  new_workspace_id UUID;
BEGIN
  -- デフォルトワークスペースの作成
  FOR legacy_row IN 
    SELECT DISTINCT uid FROM old_stories
  LOOP
    INSERT INTO workspaces (uid, name)
    VALUES (legacy_row.uid::UUID, 'デフォルト')
    ON CONFLICT (uid, name) DO NOTHING
    RETURNING id INTO new_workspace_id;
  END LOOP;
  
  -- ストーリーデータの移行
  INSERT INTO stories (
    workspace_id,
    uid,
    title,
    text_raw,
    script_json,
    status,
    beats,
    created_at,
    updated_at,
    legacy_id
  )
  SELECT 
    w.id as workspace_id,
    o.uid::UUID,
    COALESCE(o.title, 'Untitled'),
    o.story_text,
    o.script_json,
    CASE 
      WHEN o.is_completed THEN 'completed'
      WHEN o.script_json IS NOT NULL THEN 'script_generated'
      ELSE 'draft'
    END as status,
    COALESCE((o.script_json->>'beats')::INTEGER, 5) as beats,
    o.created_at,
    o.updated_at,
    o.id as legacy_id
  FROM old_stories o
  JOIN workspaces w ON w.uid = o.uid::UUID AND w.name = 'デフォルト';
  
  -- 動画データの移行
  INSERT INTO videos (
    story_id,
    uid,
    status,
    video_url,
    created_at,
    updated_at
  )
  SELECT 
    s.id as story_id,
    s.uid,
    'completed',
    o.video_url,
    o.created_at,
    o.updated_at
  FROM old_stories o
  JOIN stories s ON s.legacy_id = o.id
  WHERE o.video_url IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 移行実行
SELECT migrate_legacy_stories();
```

#### Phase 3: インデックスとRLS設定

```sql
-- インデックスの作成
CREATE INDEX idx_stories_workspace_id ON stories(workspace_id);
CREATE INDEX idx_stories_uid ON stories(uid);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_legacy_id ON stories(legacy_id);

CREATE INDEX idx_videos_story_id ON videos(story_id);
CREATE INDEX idx_videos_uid ON videos(uid);
CREATE INDEX idx_videos_status ON videos(status);

-- Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY workspaces_user_access ON workspaces
  FOR ALL USING (uid = auth.uid());

CREATE POLICY stories_user_access ON stories
  FOR ALL USING (uid = auth.uid());

CREATE POLICY videos_user_access ON videos
  FOR ALL USING (uid = auth.uid());
```

### 3. アプリケーション側の更新

#### APIの後方互換性

```typescript
// lib/api/stories.ts
export async function getStoryById(id: string): Promise<Story | null> {
  // UUIDまたは8桁IDで検索
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  const query = supabase
    .from('stories')
    .select('*');
    
  if (isUuid) {
    query.eq('id', id);
  } else {
    query.eq('legacy_id', id);
  }
  
  const { data, error } = await query.single();
  
  if (error) return null;
  return data;
}
```

#### URLルーティングの対応

```typescript
// app/stories/[id]/page.tsx
export default async function StoryPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  // 8桁IDとUUIDの両方に対応
  const story = await getStoryById(params.id);
  
  if (!story) {
    notFound();
  }
  
  // レガシーIDの場合は新しいURLにリダイレクト
  if (params.id === story.legacy_id && story.id !== params.id) {
    redirect(`/stories/${story.id}`);
  }
  
  return <StoryEditor story={story} />;
}
```

### 4. 移行検証

```sql
-- データ整合性チェック
-- 1. 移行件数の確認
SELECT 
  'old_stories' as table_name,
  COUNT(*) as count
FROM old_stories
UNION ALL
SELECT 
  'stories' as table_name,
  COUNT(*) as count
FROM stories;

-- 2. レガシーID対応確認
SELECT 
  COUNT(*) as total_stories,
  COUNT(legacy_id) as with_legacy_id,
  COUNT(*) - COUNT(legacy_id) as new_stories
FROM stories;

-- 3. 動画URLの移行確認
SELECT 
  s.legacy_id,
  s.title,
  v.video_url,
  v.status
FROM stories s
JOIN videos v ON v.story_id = s.id
WHERE s.legacy_id IS NOT NULL
LIMIT 10;
```

## beatsカラムの追加（増分移行）

既存のテーブルにbeatsカラムを追加する場合：

```sql
-- migrations/001_add_beats_column.sql
-- storiesテーブルにbeatsカラムを追加

-- カラムの追加
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS beats INTEGER DEFAULT 5;

-- 制約の追加
ALTER TABLE stories 
ADD CONSTRAINT check_beats_range 
CHECK (beats >= 1 AND beats <= 20);

-- 既存データの更新（script_jsonから抽出）
UPDATE stories 
SET beats = COALESCE(
  (script_json->'beats')::INTEGER,
  CASE 
    WHEN jsonb_array_length(script_json->'beats') > 0 
    THEN jsonb_array_length(script_json->'beats')
    ELSE 5
  END
)
WHERE script_json IS NOT NULL;

-- インデックスの追加（必要に応じて）
CREATE INDEX idx_stories_beats ON stories(beats);
```

## 移行時の注意事項

### 1. ダウンタイムの最小化

```sql
-- オンライン移行のためのトリガー設定
CREATE OR REPLACE FUNCTION sync_legacy_to_new()
RETURNS TRIGGER AS $$
BEGIN
  -- レガシーテーブルの更新を新テーブルに反映
  INSERT INTO stories (
    legacy_id,
    workspace_id,
    uid,
    title,
    text_raw,
    status
  )
  VALUES (
    NEW.id,
    (SELECT id FROM workspaces WHERE uid = NEW.uid::UUID LIMIT 1),
    NEW.uid::UUID,
    NEW.title,
    NEW.story_text,
    'draft'
  )
  ON CONFLICT (legacy_id) 
  DO UPDATE SET
    title = EXCLUDED.title,
    text_raw = EXCLUDED.text_raw,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 移行期間中のトリガー
CREATE TRIGGER sync_stories_trigger
AFTER INSERT OR UPDATE ON old_stories
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_to_new();
```

### 2. ロールバック計画

```sql
-- ロールバック用スクリプト
-- 新形式から旧形式へのデータ復元

CREATE OR REPLACE FUNCTION rollback_to_legacy()
RETURNS void AS $$
BEGIN
  -- 新規作成されたデータの識別
  INSERT INTO migration_log (
    action,
    table_name,
    record_id,
    data_snapshot
  )
  SELECT 
    'rollback',
    'stories',
    id,
    row_to_json(s.*)
  FROM stories s
  WHERE legacy_id IS NULL;
  
  -- レガシーテーブルへの復元
  UPDATE old_stories o
  SET 
    title = s.title,
    story_text = s.text_raw,
    script_json = s.script_json,
    updated_at = s.updated_at
  FROM stories s
  WHERE s.legacy_id = o.id;
END;
$$ LANGUAGE plpgsql;
```

### 3. パフォーマンス考慮事項

```sql
-- 大規模データの場合のバッチ処理
DO $$
DECLARE
  batch_size INTEGER := 1000;
  offset_val INTEGER := 0;
  total_rows INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM old_stories;
  
  WHILE offset_val < total_rows LOOP
    -- バッチ単位で移行
    PERFORM migrate_stories_batch(offset_val, batch_size);
    
    offset_val := offset_val + batch_size;
    
    -- 進捗ログ
    RAISE NOTICE 'Migrated % of % rows', offset_val, total_rows;
    
    -- サーバー負荷軽減
    PERFORM pg_sleep(1);
  END LOOP;
END;
$$;
```

## 移行チェックリスト

- [ ] **事前準備**
  - [ ] 本番データベースの完全バックアップ
  - [ ] ステージング環境でのテスト完了
  - [ ] ロールバック手順の確認
  - [ ] 関係者への通知

- [ ] **移行作業**
  - [ ] 新テーブルの作成
  - [ ] インデックスの作成
  - [ ] データ移行スクリプトの実行
  - [ ] RLS設定
  - [ ] データ整合性の確認

- [ ] **アプリケーション更新**
  - [ ] API層の更新
  - [ ] 後方互換性の実装
  - [ ] デプロイメント
  - [ ] 動作確認

- [ ] **移行後作業**
  - [ ] パフォーマンス監視
  - [ ] エラーログの確認
  - [ ] ユーザーフィードバックの収集
  - [ ] レガシーテーブルの削除計画

## トラブルシューティング

### 一般的な問題と解決方法

1. **UUID生成エラー**
```sql
-- pgcrypto拡張が必要
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

2. **外部キー制約違反**
```sql
-- 一時的に制約を無効化
ALTER TABLE stories DISABLE TRIGGER ALL;
-- 移行処理
ALTER TABLE stories ENABLE TRIGGER ALL;
```

3. **重複レガシーID**
```sql
-- 重複チェックと修正
SELECT legacy_id, COUNT(*) 
FROM stories 
GROUP BY legacy_id 
HAVING COUNT(*) > 1;
```

## まとめ

この移行により、showgeki2は以下の改善を実現します：

1. **スケーラビリティ**: UUID採用による無限の拡張性
2. **互換性**: レガシーシステムとの完全な後方互換性
3. **パフォーマンス**: 最適化されたインデックス構造
4. **保守性**: 標準的なデータベース設計パターン
5. **安全性**: RLSによる強固なデータ保護