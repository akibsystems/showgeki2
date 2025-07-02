-- ================================================================
-- Migration: Create admin tables and views
-- Version: 005
-- Description: 
--   - Create admins table for admin users
--   - Create stats view for usage statistics
--   - Add RLS policies for admin access
-- ================================================================

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow service role to access admin table
CREATE POLICY "Service role can access admins" ON public.admins
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- RLS policy: Admins can view admin table
CREATE POLICY "Admins can view admins" ON public.admins
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true)
  );

-- Create index for performance
CREATE INDEX idx_admins_is_active ON public.admins(is_active);

-- ================================================================
-- Create statistics view
-- ================================================================

CREATE OR REPLACE VIEW public.stats_view AS
WITH user_stats AS (
  SELECT 
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN s.created_at > NOW() - INTERVAL '7 days' THEN p.id END) as active_users_7d,
    COUNT(DISTINCT CASE WHEN s.created_at > NOW() - INTERVAL '30 days' THEN p.id END) as active_users_30d
  FROM public.profiles p
  LEFT JOIN public.stories s ON s.uid = p.id::TEXT
),
content_stats AS (
  SELECT
    COUNT(DISTINCT s.id) as total_stories,
    COUNT(DISTINCT CASE WHEN s.created_at > NOW() - INTERVAL '24 hours' THEN s.id END) as stories_24h,
    COUNT(DISTINCT CASE WHEN s.created_at > NOW() - INTERVAL '7 days' THEN s.id END) as stories_7d,
    COUNT(DISTINCT v.id) as total_videos,
    COUNT(DISTINCT CASE WHEN v.status = 'completed' THEN v.id END) as completed_videos,
    COUNT(DISTINCT CASE WHEN v.status = 'processing' THEN v.id END) as processing_videos,
    COUNT(DISTINCT CASE WHEN v.status = 'error' THEN v.id END) as failed_videos
  FROM public.stories s
  LEFT JOIN public.videos v ON v.story_id = s.id
),
storage_stats AS (
  SELECT
    COALESCE(SUM(v.size_mb), 0) as total_storage_mb
  FROM public.videos v
  WHERE v.status = 'completed'
)
SELECT 
  u.total_users,
  u.active_users_7d,
  u.active_users_30d,
  c.total_stories,
  c.stories_24h,
  c.stories_7d,
  c.total_videos,
  c.completed_videos,
  c.processing_videos,
  c.failed_videos,
  s.total_storage_mb,
  NOW() as last_updated
FROM user_stats u
CROSS JOIN content_stats c
CROSS JOIN storage_stats s;

-- Grant access to authenticated users (will be filtered by RLS)
GRANT SELECT ON public.stats_view TO authenticated;

-- ================================================================
-- Create daily stats view for charts
-- ================================================================

CREATE OR REPLACE VIEW public.daily_stats_view AS
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    '1 day'::INTERVAL
  )::DATE as date
),
daily_data AS (
  SELECT 
    DATE(s.created_at) as date,
    COUNT(DISTINCT s.id) as stories_created,
    COUNT(DISTINCT v.id) as videos_created,
    COUNT(DISTINCT s.uid) as unique_users
  FROM public.stories s
  LEFT JOIN public.videos v ON v.story_id = s.id AND DATE(v.created_at) = DATE(s.created_at)
  WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(s.created_at)
)
SELECT 
  d.date,
  COALESCE(dd.stories_created, 0) as stories_created,
  COALESCE(dd.videos_created, 0) as videos_created,
  COALESCE(dd.unique_users, 0) as unique_users
FROM date_series d
LEFT JOIN daily_data dd ON d.date = dd.date
ORDER BY d.date ASC;

-- Grant access to authenticated users (will be filtered by admin check in API)
GRANT SELECT ON public.daily_stats_view TO authenticated;

-- ================================================================
-- Create admin activity log table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for performance
CREATE INDEX idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX idx_admin_activity_logs_action ON public.admin_activity_logs(action);

-- Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true)
  );

-- Only system can insert logs (through service role)
CREATE POLICY "System can insert activity logs" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (false);

-- ================================================================
-- Verification Queries
-- ================================================================

-- Check if admins table was created
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admins'
) AS admins_table_exists;

-- Check if views were created
SELECT EXISTS (
  SELECT FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'stats_view'
) AS stats_view_exists;

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename IN ('admins', 'admin_activity_logs')
ORDER BY tablename, policyname;