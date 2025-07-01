-- ================================================================
-- Migration: Add user authentication columns
-- Date: 2025-01-01
-- Description: Add user_id columns to existing tables for authentication
-- ================================================================

-- Add user_id to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id 
ON workspaces(user_id);

-- Add user_id to stories table
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_stories_user_id 
ON stories(user_id);

-- Add user_id to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_videos_user_id 
ON videos(user_id);

-- Add user_id to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
ON reviews(user_id);

-- ================================================================
-- Row Level Security (RLS) Policies
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
CREATE POLICY "Users can view their own workspaces" 
ON workspaces FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
CREATE POLICY "Users can create their own workspaces" 
ON workspaces FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
CREATE POLICY "Users can update their own workspaces" 
ON workspaces FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Stories policies
DROP POLICY IF EXISTS "Users can view their own stories" ON stories;
CREATE POLICY "Users can view their own stories" 
ON stories FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
CREATE POLICY "Users can create their own stories" 
ON stories FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
CREATE POLICY "Users can update their own stories" 
ON stories FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Videos policies
DROP POLICY IF EXISTS "Users can view their own videos" ON videos;
CREATE POLICY "Users can view their own videos" 
ON videos FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create their own videos" ON videos;
CREATE POLICY "Users can create their own videos" 
ON videos FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own videos" ON videos;
CREATE POLICY "Users can update their own videos" 
ON videos FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Reviews policies
DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
CREATE POLICY "Users can view all reviews" 
ON reviews FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
CREATE POLICY "Users can create their own reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" 
ON reviews FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- ================================================================
-- Migration rollback function
-- ================================================================

/*
To rollback this migration, run:

-- Remove RLS policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own stories" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
DROP POLICY IF EXISTS "Users can view their own videos" ON videos;
DROP POLICY IF EXISTS "Users can create their own videos" ON videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON videos;
DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;

-- Disable RLS
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- Remove indexes
DROP INDEX IF EXISTS idx_workspaces_user_id;
DROP INDEX IF EXISTS idx_stories_user_id;
DROP INDEX IF EXISTS idx_videos_user_id;
DROP INDEX IF EXISTS idx_reviews_user_id;

-- Remove columns
ALTER TABLE workspaces DROP COLUMN IF EXISTS user_id;
ALTER TABLE stories DROP COLUMN IF EXISTS user_id;
ALTER TABLE videos DROP COLUMN IF EXISTS user_id;
ALTER TABLE reviews DROP COLUMN IF EXISTS user_id;
*/

-- ================================================================
-- Verification queries
-- ================================================================

-- Check if columns were added
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
  AND table_name IN ('workspaces', 'stories', 'videos', 'reviews')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('workspaces', 'stories', 'videos', 'reviews')
ORDER BY tablename;

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('workspaces', 'stories', 'videos', 'reviews')
ORDER BY tablename, policyname;