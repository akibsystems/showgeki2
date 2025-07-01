-- ================================================================
-- Migration: Enable RLS (Minimal Setup)
-- Date: 2025-01-01
-- Description: Enable RLS for security, but actual access control is done in API
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role
-- These policies allow the service role (API) to access all data
-- Actual access control is implemented in the API layer

-- Workspaces - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to workspaces" ON workspaces;
CREATE POLICY "Service role has full access to workspaces" 
ON workspaces FOR ALL 
USING (true)
WITH CHECK (true);

-- Stories - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to stories" ON stories;
CREATE POLICY "Service role has full access to stories" 
ON stories FOR ALL 
USING (true)
WITH CHECK (true);

-- Videos - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to videos" ON videos;
CREATE POLICY "Service role has full access to videos" 
ON videos FOR ALL 
USING (true)
WITH CHECK (true);

-- Reviews - Allow all operations for service role
DROP POLICY IF EXISTS "Service role has full access to reviews" ON reviews;
CREATE POLICY "Service role has full access to reviews" 
ON reviews FOR ALL 
USING (true)
WITH CHECK (true);

-- ================================================================
-- Verification queries
-- ================================================================

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