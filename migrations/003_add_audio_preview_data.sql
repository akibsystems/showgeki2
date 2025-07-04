-- Migration: Add audio preview data column to videos table
-- Date: 2025-01-04
-- Description: Add column for storing audio preview data

-- Add audio_preview_data column to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS audio_preview_data JSONB;

-- Add comment on column
COMMENT ON COLUMN videos.audio_preview_data IS 'JSON data containing audio preview URLs and metadata';

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
    AND column_name = 'audio_preview_data'
ORDER BY 
    ordinal_position;