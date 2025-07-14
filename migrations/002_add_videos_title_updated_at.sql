-- Migration: Add title and updated_at columns to videos table
-- Date: 2025-01-14
-- Description: Add title column for faster access and updated_at for tracking modifications

-- Add columns
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS update_videos_updated_at_trigger ON videos;
CREATE TRIGGER update_videos_updated_at_trigger
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_videos_updated_at();

-- Create index for faster title searches
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_videos_updated_at ON videos(updated_at DESC);

-- Verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'videos'
AND column_name IN ('title', 'updated_at')
ORDER BY ordinal_position;