-- videosテーブルにworkflow_idカラムを追加
-- 実行日: 2025-01-19
-- 説明: videosテーブルに直接workflow_idを持たせることで、
--       効率的なフィルタリングとジョインを可能にする

-- ================================================================
-- 1. workflow_idカラムの追加
-- ================================================================

-- workflow_idカラムを追加（既存データがあるためNULL許可で追加）
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_videos_workflow_id ON videos(workflow_id);

-- ================================================================
-- 2. 既存データのバックフィル
-- ================================================================

-- 既存の動画に対して、story_id経由でworkflow_idを設定
-- videos.story_id -> storyboards.id -> workflows.storyboard_id の関係を利用
UPDATE videos v
SET workflow_id = w.id
FROM storyboards sb
JOIN workflows w ON w.storyboard_id = sb.id
WHERE v.story_id = sb.id
  AND v.workflow_id IS NULL;

-- ================================================================
-- 3. 検証クエリ
-- ================================================================

-- 更新された動画の数を確認
-- SELECT COUNT(*) as updated_videos
-- FROM videos
-- WHERE workflow_id IS NOT NULL;

-- workflow_idが設定されていない動画を確認
-- SELECT v.id, v.story_id, v.title, v.created_at
-- FROM videos v
-- WHERE v.workflow_id IS NULL
-- ORDER BY v.created_at DESC;

-- workflowとの結合が正しく動作することを確認
-- SELECT v.id, v.title, w.mode, w.status
-- FROM videos v
-- JOIN workflows w ON v.workflow_id = w.id
-- LIMIT 10;

-- ================================================================
-- 4. ロールバック用SQL（必要な場合）
-- ================================================================

-- ロールバックが必要な場合は以下を実行
-- DROP INDEX IF EXISTS idx_videos_workflow_id;
-- ALTER TABLE videos DROP COLUMN IF EXISTS workflow_id;

-- ================================================================
-- 5. 今後の対応
-- ================================================================

-- 新規作成される動画については、作成時にworkflow_idを設定するように
-- アプリケーションコードを更新する必要があります。
-- webhook-handler.js や video作成APIで、workflow_idを明示的に設定してください。