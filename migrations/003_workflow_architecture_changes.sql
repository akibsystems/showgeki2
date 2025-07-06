-- ワークフローアーキテクチャ変更のためのマイグレーション
-- 注意: このマイグレーションは破壊的変更を含みます

-- 1. 既存のworkflowsテーブルをバックアップ（念のため）
ALTER TABLE IF EXISTS workflows RENAME TO workflows_backup_20250706;

-- 2. projectsテーブルの作成
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- projectsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_projects_uid ON projects(uid);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 3. storyboardsテーブルの作成
CREATE TABLE IF NOT EXISTS storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  
  -- カテゴリ別生成データ
  summary_data JSONB,        -- 作品概要・全体情報データ
  acts_data JSONB,           -- 幕場構成データ
  characters_data JSONB,     -- キャラクター設定データ
  scenes_data JSONB,         -- シーン一覧データ
  audio_data JSONB,          -- BGM・音声設定データ
  style_data JSONB,          -- 画風・スタイル設定データ
  caption_data JSONB,        -- 字幕設定データ
  
  -- 最終的なMulmoScript
  mulmoscript JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- storyboardsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_storyboards_project_id ON storyboards(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_uid ON storyboards(uid);
CREATE INDEX IF NOT EXISTS idx_storyboards_status ON storyboards(status);
CREATE INDEX IF NOT EXISTS idx_storyboards_created_at ON storyboards(created_at DESC);

-- 4. 新しいworkflowsテーブルの作成
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  
  -- 表示用データ（キャッシュ）
  step1_in JSONB,
  step2_in JSONB,
  step3_in JSONB,
  step4_in JSONB,
  step5_in JSONB,
  step6_in JSONB,
  step7_in JSONB,
  
  -- ユーザー入力データ
  step1_out JSONB,
  step2_out JSONB,
  step3_out JSONB,
  step4_out JSONB,
  step5_out JSONB,
  step6_out JSONB,
  step7_out JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- workflowsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_workflows_storyboard_id ON workflows(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_workflows_uid_v2 ON workflows(uid);  -- 名前を変更して衝突を回避
CREATE INDEX IF NOT EXISTS idx_workflows_status_v2 ON workflows(status);  -- 名前を変更して衝突を回避
CREATE INDEX IF NOT EXISTS idx_workflows_created_at_v2 ON workflows(created_at DESC);  -- 名前を変更して衝突を回避

-- 5. 更新日時を自動更新するトリガー（各テーブル用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- projectsテーブル用トリガー
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- storyboardsテーブル用トリガー
CREATE TRIGGER update_storyboards_updated_at BEFORE UPDATE ON storyboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- workflowsテーブル用トリガー
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. コメント追加
COMMENT ON TABLE projects IS 'プロジェクト管理テーブル';
COMMENT ON COLUMN projects.id IS 'プロジェクトID (UUID)';
COMMENT ON COLUMN projects.uid IS 'ユーザーID';
COMMENT ON COLUMN projects.name IS 'プロジェクト名';
COMMENT ON COLUMN projects.description IS 'プロジェクトの説明';
COMMENT ON COLUMN projects.status IS 'プロジェクトステータス (active/archived)';

COMMENT ON TABLE storyboards IS 'ストーリーボード管理テーブル';
COMMENT ON COLUMN storyboards.id IS 'ストーリーボードID (UUID)';
COMMENT ON COLUMN storyboards.project_id IS '所属プロジェクトID';
COMMENT ON COLUMN storyboards.uid IS 'ユーザーID';
COMMENT ON COLUMN storyboards.title IS '作品タイトル';
COMMENT ON COLUMN storyboards.status IS 'ストーリーボードステータス (draft/completed/archived)';
COMMENT ON COLUMN storyboards.summary_data IS '作品概要・全体情報データ';
COMMENT ON COLUMN storyboards.acts_data IS '幕場構成データ';
COMMENT ON COLUMN storyboards.characters_data IS 'キャラクター設定データ';
COMMENT ON COLUMN storyboards.scenes_data IS 'シーン一覧データ';
COMMENT ON COLUMN storyboards.audio_data IS 'BGM・音声設定データ';
COMMENT ON COLUMN storyboards.style_data IS '画風・スタイル設定データ';
COMMENT ON COLUMN storyboards.caption_data IS '字幕設定データ';
COMMENT ON COLUMN storyboards.mulmoscript IS '最終的なMulmoScript';

COMMENT ON TABLE workflows IS '動画作成ワークフローの管理テーブル（storyboard作成ツール）';
COMMENT ON COLUMN workflows.id IS 'ワークフローID (UUID)';
COMMENT ON COLUMN workflows.storyboard_id IS '対象ストーリーボードID';
COMMENT ON COLUMN workflows.uid IS 'ユーザーID';
COMMENT ON COLUMN workflows.current_step IS '現在のステップ (1-7)';
COMMENT ON COLUMN workflows.status IS 'ワークフローステータス';
COMMENT ON COLUMN workflows.step1_in IS 'ステップ1: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step1_out IS 'ステップ1: ユーザー入力データ';
COMMENT ON COLUMN workflows.step2_in IS 'ステップ2: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step2_out IS 'ステップ2: ユーザー入力データ';
COMMENT ON COLUMN workflows.step3_in IS 'ステップ3: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step3_out IS 'ステップ3: ユーザー入力データ';
COMMENT ON COLUMN workflows.step4_in IS 'ステップ4: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step4_out IS 'ステップ4: ユーザー入力データ';
COMMENT ON COLUMN workflows.step5_in IS 'ステップ5: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step5_out IS 'ステップ5: ユーザー入力データ';
COMMENT ON COLUMN workflows.step6_in IS 'ステップ6: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step6_out IS 'ステップ6: ユーザー入力データ';
COMMENT ON COLUMN workflows.step7_in IS 'ステップ7: 表示用データ（キャッシュ）';
COMMENT ON COLUMN workflows.step7_out IS 'ステップ7: ユーザー入力データ';

-- 注意: RLSは使用しません。SERVICE_ROLEキーを使用してアプリケーションレベルで認証を行います。

-- 検証クエリ
-- SELECT * FROM projects WHERE uid = 'test-user' ORDER BY created_at DESC;
-- SELECT * FROM storyboards WHERE project_id = '<project-id>' ORDER BY created_at DESC;
-- SELECT * FROM workflows WHERE storyboard_id = '<storyboard-id>' ORDER BY created_at DESC;