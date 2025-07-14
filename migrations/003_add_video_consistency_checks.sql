-- Migration: Add video consistency checks table
-- Date: 2025-01-14
-- Description: Store video consistency check results for caching

-- Create consistency checks table
CREATE TABLE IF NOT EXISTS video_consistency_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL DEFAULT 'gemini',
    result JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_by UUID REFERENCES auth.users(id),
    UNIQUE(video_id, check_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consistency_checks_video_id ON video_consistency_checks(video_id);
CREATE INDEX IF NOT EXISTS idx_consistency_checks_created_at ON video_consistency_checks(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_consistency_checks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_consistency_checks_updated_at_trigger ON video_consistency_checks;
CREATE TRIGGER update_consistency_checks_updated_at_trigger
    BEFORE UPDATE ON video_consistency_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_consistency_checks_updated_at();

-- Disable RLS (using service role)
ALTER TABLE video_consistency_checks DISABLE ROW LEVEL SECURITY;

-- Verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'video_consistency_checks'
ORDER BY ordinal_position;