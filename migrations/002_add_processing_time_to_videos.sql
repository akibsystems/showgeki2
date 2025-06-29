-- ================================================================
-- 002_add_processing_time_to_videos.sql
-- 
-- Purpose: Add proc_time column to videos table
-- Date: 2025-06-29
-- ================================================================

-- 処理時間を記録するカラムを追加
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS proc_time INTEGER CHECK (proc_time >= 0);

-- カラムにコメントを追加
COMMENT ON COLUMN videos.proc_time IS 'Total processing time in seconds from request to completion';

