-- ================================================================
-- TOBE ストーリー動画生成 データベースマイグレーション
-- 既存storiesテーブル削除 → 新スキーマで再作成
-- ================================================================

-- 1. 既存データのバックアップ（必要に応じて実行）
-- CREATE TABLE stories_backup AS SELECT * FROM stories;

-- 2. 関連テーブル・制約の削除（外部キー制約があるテーブルから先に削除）
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- 3. 新規テーブル群の作成

-- ================================================================
-- workspaces テーブル
-- ================================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Default Workspace',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- workspaces テーブルのインデックス
CREATE INDEX idx_workspaces_uid ON workspaces(uid);
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at);

-- workspaces テーブルのRLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on workspaces" ON workspaces
FOR ALL USING (true);

-- ================================================================
-- stories テーブル（新スキーマ）
-- ================================================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uid VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  text_raw TEXT NOT NULL,
  script_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- stories テーブルのインデックス
CREATE INDEX idx_stories_uid ON stories(uid);
CREATE INDEX idx_stories_workspace_id ON stories(workspace_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created_at ON stories(created_at);
CREATE INDEX idx_stories_updated_at ON stories(updated_at);

-- stories テーブルの制約
ALTER TABLE stories ADD CONSTRAINT chk_stories_status 
CHECK (status IN ('draft', 'script_generated', 'processing', 'completed', 'error'));

-- stories テーブルのRLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on stories" ON stories
FOR ALL USING (true);

-- ================================================================
-- videos テーブル
-- ================================================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  uid VARCHAR(36) NOT NULL,
  url TEXT,
  duration_sec INTEGER CHECK (duration_sec > 0),
  resolution VARCHAR(20),
  size_mb DECIMAL(10,2) CHECK (size_mb > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  error_msg TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- videos テーブルのインデックス
CREATE INDEX idx_videos_story_id ON videos(story_id);
CREATE INDEX idx_videos_uid ON videos(uid);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created_at ON videos(created_at);

-- videos テーブルの制約
ALTER TABLE videos ADD CONSTRAINT chk_videos_status 
CHECK (status IN ('queued', 'processing', 'completed', 'failed'));

-- videos テーブルのRLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on videos" ON videos
FOR ALL USING (true);

-- ================================================================
-- reviews テーブル（既存スキーマ互換）
-- ================================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  review_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reviews テーブルのインデックス
CREATE INDEX idx_reviews_story_id ON reviews(story_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- reviews テーブルのRLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on reviews" ON reviews
FOR ALL USING (true);

-- ================================================================
-- トリガー関数（updated_at自動更新）
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- stories テーブルにupdated_at自動更新トリガーを設定
CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- Supabase Storage設定
-- ================================================================

-- videos バケット内のオブジェクトを先に削除
DELETE FROM storage.objects WHERE bucket_id = 'videos';

-- videos バケットの再作成（存在する場合は削除して再作成）
DELETE FROM storage.buckets WHERE id = 'videos';
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- videos バケットのStorage ポリシー
DROP POLICY IF EXISTS "Allow all operations on videos bucket" ON storage.objects;
CREATE POLICY "Allow all operations on videos bucket" ON storage.objects
FOR ALL USING (bucket_id = 'videos');

-- ================================================================
-- サンプルデータ（開発用）
-- ================================================================

-- サンプルUID
INSERT INTO workspaces (id, uid, name) VALUES 
  ('00000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 'サンプルワークスペース'),
  ('00000000-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440001', 'テストワークスペース');

-- サンプルストーリー
INSERT INTO stories (id, workspace_id, uid, title, text_raw, status) VALUES 
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 
   'カフェ経営の夢', '10年後に理想のカフェを経営していたい。地域の人々が集まる温かい場所を作りたい。', 'draft'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000', 
   '家族との幸せな時間', '家族と幸せに暮らしたい。子供たちの成長を見守り、一緒に過ごす時間を大切にしたい。', 'draft');

-- ================================================================
-- データベース設定の確認クエリ
-- ================================================================

-- テーブル一覧確認
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- インデックス確認
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- 制約確認
-- SELECT conname, contype FROM pg_constraint WHERE conname LIKE 'chk_%';

-- RLS確認
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';