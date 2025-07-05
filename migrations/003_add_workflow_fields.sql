-- =====================================================
-- Migration: Add ScriptDirector V2 Workflow Fields
-- Version: 003
-- Description: ワークフロー機能のためのスキーマ拡張（RLSなし）
-- =====================================================

-- トランザクション開始
BEGIN;

-- =====================================================
-- 1. storiesテーブルへのカラム追加
-- =====================================================

-- ストーリー要素（ユーザー入力）
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS story_elements JSONB;

COMMENT ON COLUMN stories.story_elements IS 'ワークフローステップ1の入力データ {main_story, dramatic_turning_point, future_image, learnings, total_scenes}';

-- ワークフロー状態管理
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS workflow_state JSONB;

COMMENT ON COLUMN stories.workflow_state IS 'ワークフローの進行状態 {current_step, completed_steps, metadata}';

-- カスタムアセット参照
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS custom_assets JSONB;

COMMENT ON COLUMN stories.custom_assets IS 'カスタムアセットの参照情報 {character_images, additional_images, custom_audio, custom_bgm}';

-- =====================================================
-- 2. 大容量データ用の別テーブル作成
-- =====================================================

-- ワークフローの大容量データ保存用
CREATE TABLE IF NOT EXISTS story_workflow_data (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (story_id, data_type)
);

COMMENT ON TABLE story_workflow_data IS 'AI生成結果などの大容量データ保存用';
COMMENT ON COLUMN story_workflow_data.data_type IS 'データタイプ: ai_screenplay, scene_scripts, final_video_config など';

-- data_typeの列挙型
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_data_type') THEN
    CREATE TYPE workflow_data_type AS ENUM (
      'ai_screenplay',
      'scene_scripts', 
      'final_video_config',
      'bgm_instructions',
      'post_processing_config'
    );
  END IF;
END $$;

-- =====================================================
-- 3. アセット管理テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS story_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  asset_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  metadata JSONB,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE story_assets IS 'ストーリーに関連するアップロードアセット管理';
COMMENT ON COLUMN story_assets.asset_type IS 'character_image, additional_image, custom_audio, custom_bgm など';

-- =====================================================
-- 4. ワークフロー履歴テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step >= 1 AND step <= 5),
  action VARCHAR(50) NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE workflow_history IS 'ワークフロー操作の履歴管理';
COMMENT ON COLUMN workflow_history.action IS 'complete_step, update_data, skip_step, revert_step など';

-- =====================================================
-- 5. 既存データのマイグレーション
-- =====================================================

-- 既存のstoriesにデフォルトワークフロー状態を設定
UPDATE stories 
SET workflow_state = jsonb_build_object(
  'current_step', 
  CASE 
    WHEN status = 'completed' THEN 5
    WHEN status = 'video_processing' OR status = 'video_failed' THEN 5
    WHEN script_json IS NOT NULL AND beats IS NOT NULL THEN 3
    WHEN script_json IS NOT NULL THEN 2
    ELSE 1
  END,
  'completed_steps', 
  CASE 
    WHEN status = 'completed' THEN '[1,2,3,4,5]'::jsonb
    WHEN status = 'video_processing' OR status = 'video_failed' THEN '[1,2,3,4]'::jsonb
    WHEN script_json IS NOT NULL AND beats IS NOT NULL THEN '[1,2,3]'::jsonb
    WHEN script_json IS NOT NULL THEN '[1,2]'::jsonb
    ELSE '[]'::jsonb
  END,
  'metadata', '{}'::jsonb
)
WHERE workflow_state IS NULL;

-- 既存のtext_rawからstory_elementsを推測（オプション）
UPDATE stories
SET story_elements = jsonb_build_object(
  'main_story', text_raw,
  'dramatic_turning_point', '',
  'future_image', '',
  'learnings', '',
  'total_scenes', COALESCE(beats, 10)
)
WHERE story_elements IS NULL AND text_raw IS NOT NULL;

-- =====================================================
-- 6. インデックスの作成
-- =====================================================

-- ワークフロー状態での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_stories_workflow_current_step 
ON stories ((workflow_state->>'current_step'));

-- アクティブなワークフローの検索用
CREATE INDEX IF NOT EXISTS idx_stories_active_workflow 
ON stories (id, (workflow_state->>'current_step'))
WHERE status NOT IN ('completed', 'failed');

-- カスタムアセットの存在確認用
CREATE INDEX IF NOT EXISTS idx_stories_has_custom_assets 
ON stories (id)
WHERE custom_assets IS NOT NULL;

-- ワークフローデータの検索用
CREATE INDEX IF NOT EXISTS idx_workflow_data_story_type 
ON story_workflow_data (story_id, data_type);

-- アセットの検索用
CREATE INDEX IF NOT EXISTS idx_story_assets_story_type 
ON story_assets (story_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_story_assets_created 
ON story_assets (created_at DESC);

-- 履歴の検索用
CREATE INDEX IF NOT EXISTS idx_workflow_history_story_step 
ON workflow_history (story_id, step, created_at DESC);

-- =====================================================
-- 7. 制約とバリデーション
-- =====================================================

-- JSONBカラムのサイズ制限（1MB）
ALTER TABLE stories 
ADD CONSTRAINT check_story_elements_size 
CHECK (pg_column_size(story_elements) <= 1048576);

ALTER TABLE stories 
ADD CONSTRAINT check_workflow_state_size 
CHECK (pg_column_size(workflow_state) <= 1048576);

ALTER TABLE stories 
ADD CONSTRAINT check_custom_assets_size 
CHECK (pg_column_size(custom_assets) <= 1048576);

-- ワークフローデータのサイズ制限（10MB）
ALTER TABLE story_workflow_data
ADD CONSTRAINT check_workflow_data_size
CHECK (pg_column_size(data) <= 10485760);

-- =====================================================
-- 8. トリガー関数の作成
-- =====================================================

-- updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの設定
CREATE TRIGGER update_story_workflow_data_updated_at BEFORE UPDATE ON story_workflow_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_assets_updated_at BEFORE UPDATE ON story_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. ヘルパー関数
-- =====================================================

-- ワークフローステップを進める関数
CREATE OR REPLACE FUNCTION advance_workflow_step(p_story_id UUID, p_step INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_current_state JSONB;
  v_completed_steps JSONB;
BEGIN
  SELECT workflow_state INTO v_current_state
  FROM stories WHERE id = p_story_id;
  
  v_completed_steps := COALESCE(v_current_state->'completed_steps', '[]'::jsonb);
  
  -- ステップを完了済みに追加
  IF NOT v_completed_steps @> to_jsonb(p_step) THEN
    v_completed_steps := v_completed_steps || to_jsonb(p_step);
  END IF;
  
  -- 状態を更新
  UPDATE stories
  SET workflow_state = jsonb_set(
    jsonb_set(v_current_state, '{completed_steps}', v_completed_steps),
    '{current_step}',
    to_jsonb(p_step + 1)
  )
  WHERE id = p_story_id
  RETURNING workflow_state INTO v_current_state;
  
  RETURN v_current_state;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 検証用クエリ
-- =====================================================

-- 移行後の確認用
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 新しいカラムが追加されているか確認
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'stories' 
  AND column_name IN ('story_elements', 'workflow_state', 'custom_assets');
  
  IF v_count = 3 THEN
    RAISE NOTICE 'Migration successful: All columns added to stories table';
  ELSE
    RAISE EXCEPTION 'Migration failed: Not all columns were added';
  END IF;
  
  -- 新しいテーブルが作成されているか確認
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_name IN ('story_workflow_data', 'story_assets', 'workflow_history');
  
  IF v_count = 3 THEN
    RAISE NOTICE 'Migration successful: All tables created';
  ELSE
    RAISE EXCEPTION 'Migration failed: Not all tables were created';
  END IF;
END $$;

-- トランザクション終了
COMMIT;

-- =====================================================
-- ロールバック用スクリプト（必要に応じて実行）
-- =====================================================
/*
BEGIN;

-- トリガーの削除
DROP TRIGGER IF EXISTS update_story_workflow_data_updated_at ON story_workflow_data;
DROP TRIGGER IF EXISTS update_story_assets_updated_at ON story_assets;

-- 関数の削除
DROP FUNCTION IF EXISTS advance_workflow_step(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- インデックスの削除
DROP INDEX IF EXISTS idx_stories_workflow_current_step;
DROP INDEX IF EXISTS idx_stories_active_workflow;
DROP INDEX IF EXISTS idx_stories_has_custom_assets;
DROP INDEX IF EXISTS idx_workflow_data_story_type;
DROP INDEX IF EXISTS idx_story_assets_story_type;
DROP INDEX IF EXISTS idx_story_assets_created;
DROP INDEX IF EXISTS idx_workflow_history_story_step;

-- テーブルの削除
DROP TABLE IF EXISTS workflow_history;
DROP TABLE IF EXISTS story_assets;
DROP TABLE IF EXISTS story_workflow_data;

-- カラムの削除
ALTER TABLE stories 
DROP COLUMN IF EXISTS story_elements,
DROP COLUMN IF EXISTS workflow_state,
DROP COLUMN IF EXISTS custom_assets;

-- 型の削除
DROP TYPE IF EXISTS workflow_data_type;

COMMIT;
*/