-- ================================================================
-- Migration 004: Add Instant Mode Support to Workflows Table
-- ================================================================
-- Description: workflowsテーブルにインスタントモードサポートを追加
--              モード区別、進捗管理、エラー状況の追跡機能を実装
-- Author: Claude
-- Date: 2025-07-12
-- Dependencies: 003_workflow_architecture_changes.sql
-- ================================================================

-- 1. workflowsテーブルに新しいカラムを追加
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'professional' CHECK (mode IN ('instant', 'professional')),
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS instant_step TEXT CHECK (instant_step IN ('analyzing', 'structuring', 'characters', 'script', 'voices', 'finalizing', 'generating', 'completed')),
ADD COLUMN IF NOT EXISTS instant_metadata JSONB DEFAULT '{}';

-- インスタントモード用のインデックス
CREATE INDEX IF NOT EXISTS idx_workflows_mode ON workflows(mode);
CREATE INDEX IF NOT EXISTS idx_workflows_instant_step ON workflows(instant_step);

-- 2. コメント追加
COMMENT ON COLUMN workflows.mode IS 'ワークフローモード (instant/professional)';
COMMENT ON COLUMN workflows.progress IS '進捗率 (0-100%)';
COMMENT ON COLUMN workflows.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN workflows.instant_step IS 'インスタントモードの現在のステップ';
COMMENT ON COLUMN workflows.instant_metadata IS 'インスタントモード用メタデータ (入力データ、設定など)';

-- 3. instant_generationsテーブルが存在する場合のデータ移行（オプション）
-- instant_generationsからworkflowsへのデータ移行
DO $$
BEGIN
  -- instant_generationsテーブルが存在するかチェック
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instant_generations') THEN
    -- データ移行: instant_generationsからworkflowsへ
    INSERT INTO workflows (
      id,
      storyboard_id,
      uid,
      mode,
      progress,
      error_message,
      instant_step,
      instant_metadata,
      status,
      created_at,
      updated_at
    )
    SELECT 
      ig.id,
      ig.storyboard_id,
      ig.uid,
      'instant' as mode,
      COALESCE((ig.metadata->>'progress')::INTEGER, 0) as progress,
      ig.error_message,
      ig.current_step as instant_step,
      ig.metadata as instant_metadata,
      CASE 
        WHEN ig.status = 'pending' THEN 'active'
        WHEN ig.status = 'processing' THEN 'active'
        WHEN ig.status = 'completed' THEN 'completed'
        WHEN ig.status = 'failed' THEN 'archived'
        ELSE 'active'
      END as status,
      ig.created_at,
      ig.updated_at
    FROM instant_generations ig
    WHERE NOT EXISTS (
      SELECT 1 FROM workflows w WHERE w.id = ig.id
    );
    
    -- instant_generationsテーブルの削除（バックアップを取ることを推奨）
    -- DROP TABLE IF EXISTS instant_generations CASCADE;
  END IF;
END $$;

-- 4. 検証クエリ
-- ワークフローモードの分布を確認
-- SELECT mode, COUNT(*) FROM workflows GROUP BY mode;

-- インスタントモードの進捗状況を確認
-- SELECT instant_step, COUNT(*), AVG(progress) FROM workflows WHERE mode = 'instant' GROUP BY instant_step;

-- エラーが発生したワークフローを確認
-- SELECT id, mode, error_message FROM workflows WHERE error_message IS NOT NULL;

-- ================================================================
-- ロールバック手順（必要な場合）
-- ================================================================
-- ALTER TABLE workflows 
-- DROP COLUMN IF EXISTS mode,
-- DROP COLUMN IF EXISTS progress,
-- DROP COLUMN IF EXISTS error_message,
-- DROP COLUMN IF EXISTS instant_step,
-- DROP COLUMN IF EXISTS instant_metadata;
-- 
-- DROP INDEX IF EXISTS idx_workflows_mode;
-- DROP INDEX IF EXISTS idx_workflows_instant_step;