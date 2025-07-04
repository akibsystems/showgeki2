-- Migration: Add preview fields to videos table
-- Date: 2025-01-04
-- Description: Add fields for image preview functionality

-- Add preview-related columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS preview_status TEXT,
ADD COLUMN IF NOT EXISTS preview_data JSONB,
ADD COLUMN IF NOT EXISTS preview_storage_path TEXT;

-- Add index for preview_status
CREATE INDEX IF NOT EXISTS idx_videos_preview_status 
ON videos(preview_status) 
WHERE preview_status IS NOT NULL;

-- Add index for efficient querying by uid and preview_status
CREATE INDEX IF NOT EXISTS idx_videos_uid_preview_status 
ON videos(uid, preview_status) 
WHERE preview_status IS NOT NULL;

-- Update existing rows to have NULL preview_status (optional)
UPDATE videos 
SET preview_status = NULL 
WHERE preview_status IS NULL;

-- Add comment on columns
COMMENT ON COLUMN videos.preview_status IS 'Status of preview generation: pending, processing, completed, failed';
COMMENT ON COLUMN videos.preview_data IS 'JSON data containing preview images URLs and metadata';
COMMENT ON COLUMN videos.preview_storage_path IS 'Supabase storage path for preview output files';

-- Verification query
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'videos' 
    AND column_name IN ('preview_status', 'preview_data', 'preview_storage_path')
ORDER BY 
    ordinal_position;